import { existsSync } from 'node:fs';
import { builtinConfigKeys } from './builtin-keys';
import { readLockfile } from './lockfile';
import { pluginDir } from './paths';
import { readManifest } from './plugin-meta';

/**
 * Every configKey already claimed by a built-in plugin or an installed external
 * plugin, excluding `excludeName` (so re-validating a plugin doesn't collide with
 * itself). Used by `add`/`doctor` to reject duplicate configKeys before install.
 */
export function existingConfigKeys(excludeName?: string): Set<string> {
  const keys = new Set(builtinConfigKeys());
  const lock = readLockfile();

  for (const name of Object.keys(lock.plugins)) {
    if (name === excludeName || !existsSync(pluginDir(name))) {
      continue;
    }

    try {
      for (const p of readManifest(pluginDir(name)).plugins) {
        keys.add(p.configKey);
      }
    } catch {
      // A malformed installed manifest is surfaced elsewhere; don't block here.
    }
  }

  return keys;
}
