import { readFileSync } from 'node:fs';
import { BUILTIN_MANIFEST_PATH } from './paths';

let cached: Set<string> | null = null;

/**
 * Extract every built-in plugin `configKey` by regex-scanning plugin-manifest.ts.
 *
 * Deliberately does NOT import the manifest module: it pulls in browser-only
 * engine code and the `__IS_PRO__` DefinePlugin constant, neither of which
 * resolves under a plain tsx/Node CLI. Same "minimal parser" philosophy as
 * build/get-submodules.ts scanning .gitmodules.
 */
export function builtinConfigKeys(): Set<string> {
  if (cached) {
    return cached;
  }

  const src = readFileSync(BUILTIN_MANIFEST_PATH, 'utf8');
  const keys = new Set<string>();
  const re = /configKey:\s*'([^']+)'/gu;
  let m: RegExpExecArray | null = re.exec(src);

  while (m !== null) {
    keys.add(m[1]);
    m = re.exec(src);
  }

  cached = keys;

  return keys;
}
