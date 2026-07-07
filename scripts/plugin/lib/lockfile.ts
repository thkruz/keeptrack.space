import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { LOCKFILE_PATH } from './paths';
import type { Lockfile } from './types';

const FORMAT_VERSION = 1;

/** Read external-plugins.json, returning an empty lockfile if absent. */
export function readLockfile(): Lockfile {
  if (!existsSync(LOCKFILE_PATH)) {
    return { formatVersion: FORMAT_VERSION, plugins: {} };
  }

  const parsed = JSON.parse(readFileSync(LOCKFILE_PATH, 'utf8')) as Lockfile;

  parsed.plugins ??= {};

  return parsed;
}

/**
 * Write external-plugins.json with stable key ordering and LF line endings so
 * the committed file is deterministic (no spurious diffs across machines).
 */
export function writeLockfile(lock: Lockfile): void {
  const sortedNames = Object.keys(lock.plugins).sort((a, b) => a.localeCompare(b));
  const ordered: Lockfile = { formatVersion: FORMAT_VERSION, plugins: {} };

  for (const name of sortedNames) {
    ordered.plugins[name] = lock.plugins[name];
  }

  writeFileSync(LOCKFILE_PATH, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8');
}
