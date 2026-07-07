import { existsSync, readdirSync, statSync } from 'node:fs';
import { builtinConfigKeys } from './builtin-keys';
import { readLockfile } from './lockfile';
import { CliError } from './log';
import { EXTERNAL_DIR, pluginDir } from './paths';
import { readManifest } from './plugin-meta';
import type { KeepTrackPluginManifest } from './types';

export interface ResolvedExternal {
  kind: 'external';
  name: string;
  dir: string;
  manifest: KeepTrackPluginManifest;
  /** The configKey the user asked for (or the first one in the manifest). */
  configKey: string;
  /** Built-in dependencies of the matched plugin entry. */
  dependencies: string[];
}

export interface ResolvedBuiltin {
  kind: 'builtin';
  configKey: string;
}

export type ResolvedPlugin = ResolvedExternal | ResolvedBuiltin;

/** All installed external-plugin directory names (present on disk). */
function installedNames(): string[] {
  const fromLock = Object.keys(readLockfile().plugins);
  const fromDisk = existsSync(EXTERNAL_DIR)
    ? readdirSync(EXTERNAL_DIR).filter((n) => !n.startsWith('.') && statSync(`${EXTERNAL_DIR}/${n}`).isDirectory())
    : [];

  return [...new Set([...fromLock, ...fromDisk])];
}

/**
 * Resolve a user-supplied name (an external package dir name, any configKey, or a
 * built-in configKey) to a concrete target for the dev harness / doctor.
 */
export function resolvePlugin(name: string): ResolvedPlugin {
  for (const pkg of installedNames()) {
    const dir = pluginDir(pkg);

    if (!existsSync(dir)) {
      continue;
    }

    let manifest: KeepTrackPluginManifest;

    try {
      manifest = readManifest(dir);
    } catch {
      continue;
    }

    const entry = manifest.plugins.find((p) => p.configKey === name);

    if (pkg === name || entry) {
      const matched = entry ?? manifest.plugins[0];

      return { kind: 'external', name: pkg, dir, manifest, configKey: matched.configKey, dependencies: matched.dependencies ?? [] };
    }
  }

  if (builtinConfigKeys().has(name)) {
    return { kind: 'builtin', configKey: name };
  }

  throw new CliError(`Unknown plugin "${name}".\n${suggest(name)}`);
}

function suggest(name: string): string {
  const candidates = [...builtinConfigKeys(), ...installedNames()];
  const lower = name.toLowerCase();
  const near = candidates.filter((c) => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase())).slice(0, 5);

  return near.length > 0 ? `Did you mean: ${near.join(', ')}?` : 'Run "npm run plugin -- list" to see installed plugins.';
}
