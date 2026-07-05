import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Repo root (scripts/plugin/lib → ../../..). */
export const REPO_ROOT = resolve(here, '..', '..', '..');

/** Directory holding installed external-plugin clones. */
export const EXTERNAL_DIR = resolve(REPO_ROOT, 'src', 'plugins-external');

/** Committed lockfile of installed plugins. */
export const LOCKFILE_PATH = resolve(REPO_ROOT, 'external-plugins.json');

/** Committed generated manifest wiring. */
export const GENERATED_MANIFEST_PATH = resolve(REPO_ROOT, 'src', 'plugins', 'plugin-manifest.external.generated.ts');

/** Built-in plugin manifest (scanned for configKey collisions). */
export const BUILTIN_MANIFEST_PATH = resolve(REPO_ROOT, 'src', 'plugins', 'plugin-manifest.ts');

/** Host package.json (source of __VERSION__ / engine-compat truth). */
export const HOST_PACKAGE_JSON_PATH = resolve(REPO_ROOT, 'package.json');

/** Absolute path to an installed plugin's clone dir. */
export function pluginDir(name: string): string {
  return resolve(EXTERNAL_DIR, name);
}
