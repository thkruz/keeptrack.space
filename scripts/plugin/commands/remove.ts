import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeGeneratedManifest } from '../lib/codegen';
import { readLockfile, writeLockfile } from '../lib/lockfile';
import { CliError, log } from '../lib/log';
import { pluginDir } from '../lib/paths';
import { runGenerateT7e } from '../lib/t7e';
import type { LockEntry } from '../lib/types';

export function removeCommand(positionals: string[], flags: Record<string, string | boolean>): number {
  const name = positionals[0];

  if (!name) {
    throw new CliError('Usage: npm run plugin -- remove <name> [--keep-files] [--delete-files]');
  }

  const lock = readLockfile();
  const dir = pluginDir(name);

  if (!lock.plugins[name] && !existsSync(dir)) {
    throw new CliError(`"${name}" is not installed.`);
  }

  if (shouldDeleteFiles(lock.plugins[name], dir, flags) && existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    log.step(`Removed src/plugins-external/${name}`);
  } else if (existsSync(dir)) {
    log.step(`Kept src/plugins-external/${name} (registered in place, so it is your source). Pass --delete-files to delete it.`);
  }

  delete lock.plugins[name];
  writeLockfile(lock);

  writeGeneratedManifest();
  log.step('Regenerating locales…');
  runGenerateT7e();

  log.success(`Removed ${name}. Rebuild to apply.`);

  return 0;
}

/**
 * Clones and copies are disposable: their source lives in the remote or the original folder. A plugin registered in
 * place (`create`, or `add` of a folder already under src/plugins-external/) IS the author's source, so it is kept
 * unless --delete-files is passed.
 */
export function shouldDeleteFiles(entry: LockEntry | undefined, dir: string, flags: Record<string, string | boolean>): boolean {
  if (flags['keep-files']) {
    return false;
  }
  if (flags['delete-files']) {
    return true;
  }

  return !(entry?.local && resolve(entry.url) === resolve(dir));
}
