import { isGeneratedManifestInSync, writeGeneratedManifest } from '../lib/codegen';
import { log } from '../lib/log';
import { runGenerateT7e } from '../lib/t7e';
import { restoreMissing } from './restore';

export interface SyncOptions {
  /** Compare only; exit 1 on drift, write nothing. */
  check?: boolean;
  /** Skip cloning missing plugins (used when the caller already restored). */
  skipRestore?: boolean;
  /** Skip regenerating locales (faster; used by prebuild which runs generate-t7e itself). */
  skipT7e?: boolean;
}

/**
 * The single reconciliation entry point: restore missing clones, regenerate the
 * committed manifest from disk, and regenerate locales. Idempotent and
 * deterministic — a clean tree regenerates a byte-identical file. Called by
 * prebuild and after every add/remove/update.
 */
export function runSync(opts: SyncOptions = {}): number {
  if (opts.check) {
    if (isGeneratedManifestInSync()) {
      log.success('plugin-manifest.external.generated.ts is in sync.');

      return 0;
    }
    log.error('plugin-manifest.external.generated.ts is out of sync — run "npm run plugin -- sync".');

    return 1;
  }

  if (!opts.skipRestore) {
    restoreMissing();
  }

  const report = writeGeneratedManifest();

  for (const { name, reason } of report.invalid) {
    log.warn(`Skipped invalid plugin "${name}": ${reason}`);
  }
  for (const name of report.missing) {
    log.warn(`Plugin "${name}" is in the lockfile but not on disk — excluded from the build. Run "npm run plugin -- restore".`);
  }
  for (const { configKey, engine } of report.incompatible) {
    log.warn(`Plugin "${configKey}" declares engine ${engine}, which does not satisfy the host version — it may fail to build.`);
  }

  if (report.included.length > 0) {
    log.success(`Wired ${report.included.length} external plugin(s): ${report.included.join(', ')}`);
  } else {
    log.step('No external plugins installed.');
  }

  if (!opts.skipT7e && !runGenerateT7e()) {
    log.warn('generate-t7e reported an error; locale keys may be stale.');
  }

  return 0;
}

export function syncCommand(flags: Record<string, string | boolean>): number {
  return runSync({ check: Boolean(flags.check), skipT7e: Boolean(flags['skip-locales']) });
}
