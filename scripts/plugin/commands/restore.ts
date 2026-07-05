import { existsSync, rmSync } from 'node:fs';
import { checkout, clone } from '../lib/git';
import { readLockfile } from '../lib/lockfile';
import { log } from '../lib/log';
import { pluginDir } from '../lib/paths';

export interface RestoreResult {
  restored: string[];
  localSkipped: string[];
  failed: string[];
}

/**
 * Clone any lockfile entry missing from disk and check out its pinned commit.
 * Network/clone failures warn and continue (optional-submodule philosophy) — a
 * missing plugin is later dropped from the generated manifest by sync, so the
 * build still succeeds without it. Local entries are skipped with a warning.
 */
export function restoreMissing(): RestoreResult {
  const lock = readLockfile();
  const result: RestoreResult = { restored: [], localSkipped: [], failed: [] };

  for (const [name, entry] of Object.entries(lock.plugins)) {
    const dir = pluginDir(name);

    if (existsSync(dir)) {
      continue;
    }
    if (entry.local) {
      log.warn(`${name} is a local plugin and its folder is missing — nothing to restore.`);
      result.localSkipped.push(name);
      continue;
    }

    try {
      log.step(`Restoring ${name} @ ${entry.commit.slice(0, 7)}`);
      clone(entry.url, dir);
      checkout(dir, entry.commit);
      result.restored.push(name);
    } catch (e) {
      log.warn(`Failed to restore ${name}: ${(e as Error).message}`);
      result.failed.push(name);
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
      }
    }
  }

  return result;
}

export function restoreCommand(): number {
  const { restored, localSkipped, failed } = restoreMissing();

  if (restored.length === 0 && failed.length === 0 && localSkipped.length === 0) {
    log.success('All external plugins already present.');
  } else {
    if (restored.length > 0) {
      log.success(`Restored ${restored.length} plugin(s): ${restored.join(', ')}`);
    }
    if (failed.length > 0) {
      log.warn(`Failed to restore: ${failed.join(', ')}`);
    }
  }

  // `restore` alone does not regenerate the manifest; run `sync` for that.
  log.step('Run "npm run plugin -- sync" to regenerate the manifest (or just build).');

  return 0;
}
