import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CliError } from './log';
import type { KeepTrackPluginManifest, PluginEntry } from './types';

export const MANIFEST_FILENAME = 'keeptrack-plugin.json';
export const SUPPORTED_FORMAT_VERSION = 1;

/** Read and JSON-parse a plugin's keeptrack-plugin.json. Throws CliError on failure. */
export function readManifest(dir: string): KeepTrackPluginManifest {
  const file = join(dir, MANIFEST_FILENAME);

  if (!existsSync(file)) {
    throw new CliError(`No ${MANIFEST_FILENAME} found in ${dir}`);
  }

  let parsed: KeepTrackPluginManifest;

  try {
    parsed = JSON.parse(readFileSync(file, 'utf8')) as KeepTrackPluginManifest;
  } catch (e) {
    throw new CliError(`${MANIFEST_FILENAME} is not valid JSON: ${(e as Error).message}`);
  }

  return parsed;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const CONFIG_KEY = /^[A-Za-z][A-Za-z0-9]*$/u;

/**
 * Validate a manifest's shape and, when `dir` is given, its consistency with the
 * files on disk (entry exists, class exported, id === configKey). `existingKeys`
 * are configKeys already taken by built-ins + other installed plugins.
 */
export function validateManifest(
  manifest: KeepTrackPluginManifest,
  opts: { dir?: string; expectedName?: string; existingKeys?: Set<string> } = {},
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (manifest.formatVersion !== SUPPORTED_FORMAT_VERSION) {
    errors.push(`formatVersion must be ${SUPPORTED_FORMAT_VERSION} (got ${JSON.stringify(manifest.formatVersion)})`);
  }
  if (typeof manifest.name !== 'string' || !KEBAB.test(manifest.name)) {
    errors.push(`name must be kebab-case (got ${JSON.stringify(manifest.name)})`);
  }
  if (opts.expectedName && manifest.name !== opts.expectedName) {
    errors.push(`name "${manifest.name}" must equal the install directory name "${opts.expectedName}"`);
  }
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    errors.push('version is required (semver string)');
  }
  if (typeof manifest.engine !== 'string' || manifest.engine.length === 0) {
    errors.push('engine is required (semver range, e.g. ">=13.0.0 <14.0.0")');
  }
  if (Array.isArray(manifest.workers) && manifest.workers.length > 0) {
    errors.push('workers are not supported in this format version (must be empty or omitted)');
  }
  if (!Array.isArray(manifest.plugins) || manifest.plugins.length === 0) {
    errors.push('plugins must be a non-empty array');

    return { errors, warnings };
  }

  const seenKeys = new Set<string>();

  for (const p of manifest.plugins) {
    validateEntry(p, manifest, opts, seenKeys, errors, warnings);
  }

  return { errors, warnings };
}

// eslint-disable-next-line max-params
function validateEntry(
  p: PluginEntry,
  manifest: KeepTrackPluginManifest,
  opts: { dir?: string; existingKeys?: Set<string> },
  seenKeys: Set<string>,
  errors: string[],
  warnings: string[],
): void {
  const label = p.configKey ?? '(missing configKey)';

  if (typeof p.configKey !== 'string' || !CONFIG_KEY.test(p.configKey)) {
    errors.push(`[${label}] configKey must be a PascalCase identifier`);

    return;
  }
  if (typeof p.className !== 'string' || p.className.length === 0) {
    errors.push(`[${label}] className is required`);
  }
  if (typeof p.entry !== 'string' || p.entry.length === 0) {
    errors.push(`[${label}] entry is required`);
  }
  if (!p.defaultConfig || typeof p.defaultConfig.enabled !== 'boolean') {
    errors.push(`[${label}] defaultConfig.enabled (boolean) is required`);
  }
  if (seenKeys.has(p.configKey)) {
    errors.push(`[${label}] duplicate configKey within this manifest`);
  }
  seenKeys.add(p.configKey);

  if (opts.existingKeys?.has(p.configKey)) {
    errors.push(`configKey "${p.configKey}" collides with a built-in or already-installed plugin — choose a unique configKey`);
  }

  if (opts.dir && typeof p.entry === 'string') {
    validateEntryFile(p, opts.dir, errors, warnings);
  }
}

function validateEntryFile(p: PluginEntry, dir: string, errors: string[], warnings: string[]): void {
  const entryPath = resolve(dir, p.entry);

  if (!existsSync(entryPath)) {
    errors.push(`[${p.configKey}] entry file not found: ${p.entry}`);

    return;
  }

  const src = readFileSync(entryPath, 'utf8');

  // Named export of the class (what PluginManager.initPlugin_ resolves via mod[className]).
  const exportRe = new RegExp(`export\\s+(?:abstract\\s+)?class\\s+${p.className}\\b`, 'u');

  if (!exportRe.test(src)) {
    errors.push(`[${p.configKey}] entry must contain "export class ${p.className}"`);
  }

  // id === configKey invariant (base-plugin keys settingsManager.plugins by this.id).
  const idRe = new RegExp(`id\\s*=\\s*['"]${p.configKey}['"]`, 'u');

  if (!idRe.test(src)) {
    warnings.push(`[${p.configKey}] could not confirm "readonly id = '${p.configKey}'" in ${p.entry} — the class id MUST equal its configKey`);
  }
}
