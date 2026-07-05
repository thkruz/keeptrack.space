import { existsSync } from 'node:fs';
import { writeGeneratedManifest } from '../lib/codegen';
import { checkout, fastForward, fetch, headCommit, remoteDefaultBranch } from '../lib/git';
import { enforceEngineCompat, validatePluginStrict } from '../lib/install-helpers';
import { readLockfile, writeLockfile } from '../lib/lockfile';
import { CliError, log } from '../lib/log';
import { pluginDir } from '../lib/paths';
import { readManifest } from '../lib/plugin-meta';
import { runGenerateT7e } from '../lib/t7e';
import type { LockEntry } from '../lib/types';

export function updateCommand(positionals: string[], flags: Record<string, string | boolean>): number {
  const lock = readLockfile();
  const target = positionals[0];
  const names = target ? [target] : Object.keys(lock.plugins);

  if (names.length === 0) {
    log.info('No external plugins installed.');

    return 0;
  }

  let changed = false;

  for (const name of names) {
    const entry = lock.plugins[name];

    if (!entry) {
      throw new CliError(`"${name}" is not installed.`);
    }
    if (entry.local) {
      log.step(`Skipping local plugin ${name}.`);
      continue;
    }
    changed = updateOne(name, entry, flags) || changed;
  }

  if (changed) {
    writeLockfile(lock);
    writeGeneratedManifest();
    log.step('Regenerating locales…');
    runGenerateT7e();
    log.success('Update complete. Rebuild to apply.');
  } else {
    log.info('Everything already up to date.');
  }

  return 0;
}

function updateOne(name: string, entry: LockEntry, flags: Record<string, string | boolean>): boolean {
  const dir = pluginDir(name);

  if (!existsSync(dir)) {
    throw new CliError(`"${name}" is in the lockfile but not on disk — run "npm run plugin -- restore" first.`);
  }

  const newRef = typeof flags.ref === 'string' ? flags.ref : '';
  const oldCommit = headCommit(dir);

  fetch(dir);

  // A pinned tag/SHA does not move unless the user explicitly passes a new --ref.
  if (!newRef && entry.ref !== '(default)' && !isBranchRef(entry.ref)) {
    log.step(`${name} is pinned to ${entry.ref}; pass --ref to change it.`);

    return false;
  }

  try {
    moveTo(dir, newRef || entry.ref);
    const newCommit = headCommit(dir);

    if (newCommit === oldCommit && !newRef) {
      return false;
    }

    validatePluginStrict(dir, name);
    enforceEngineCompat(readManifest(dir).engine, Boolean(flags.force));

    entry.ref = newRef || entry.ref;
    entry.commit = newCommit;
    log.success(`Updated ${name} → ${newCommit.slice(0, 7)}`);

    return true;
  } catch (e) {
    log.error(`Update of ${name} failed: ${(e as Error).message}. Rolling back.`);
    checkout(dir, oldCommit);

    return false;
  }
}

function isBranchRef(ref: string): boolean {
  // Heuristic: 40-hex or vX.Y.Z tags are pinned; anything else is treated as a branch.
  return !/^[0-9a-f]{7,40}$/u.test(ref) && !/^v?\d+\.\d+\.\d+/u.test(ref);
}

function moveTo(dir: string, ref: string): void {
  if (ref === '(default)' || isBranchRef(ref)) {
    const branch = ref === '(default)' ? remoteDefaultBranch(dir) : ref;

    checkout(dir, branch);
    fastForward(dir, branch);
  } else {
    checkout(dir, ref);
  }
}
