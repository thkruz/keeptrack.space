import { existsSync } from 'node:fs';
import { basename, relative } from 'node:path';
import { classifyCompat, classifyPluginApi, hostVersion, PLUGIN_API_VERSION } from './host-version';
import { checkPluginImports, formatViolation } from './import-policy';
import { readLockfile } from './lockfile';
import { CliError, log } from './log';
import { EXTERNAL_DIR, pluginDir } from './paths';
import { readManifest, validateManifest } from './plugin-meta';
import { trimChar } from './render-template';
import { existingConfigKeys } from './existing-keys';

const GIT_URL = /^(?:https?:\/\/|git@|ssh:\/\/|git:\/\/)/u;

/** Heuristic: is this a remote git URL (vs a local filesystem path)? */
export function isGitUrl(source: string): boolean {
  return GIT_URL.test(source) || source.endsWith('.git');
}

/** Derive a sanitized, kebab-case install name from a git URL's basename. */
export function deriveName(url: string): string {
  const raw = basename(trimChar(url, '/', { start: false })).replace(/\.git$/u, '');
  const name = trimChar(raw.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-'), '-');

  if (!name) {
    throw new CliError(`Could not derive a plugin name from "${url}" — pass --name <name>.`);
  }

  return name;
}

/** Reject a name that is already installed (on disk or in the lockfile). */
export function assertNameAvailable(name: string): void {
  if (existsSync(pluginDir(name))) {
    throw new CliError(`src/plugins-external/${name} already exists. Remove it first, or use --name.`);
  }
  if (readLockfile().plugins[name]) {
    throw new CliError(`"${name}" is already in external-plugins.json. Use "update" or "remove" first.`);
  }
}

/**
 * Strict validation used by `add`/`update`: throws CliError on the first schema,
 * disk-consistency, or configKey-collision error. Prints non-fatal warnings.
 */
export function validatePluginStrict(dir: string, name: string): void {
  const manifest = readManifest(dir);
  const { errors, warnings } = validateManifest(manifest, {
    dir,
    expectedName: name,
    existingKeys: existingConfigKeys(name),
  });

  for (const w of warnings) {
    log.warn(w);
  }
  if (errors.length > 0) {
    throw new CliError(`Plugin validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}

/**
 * Enforce the engine-compat policy: minor mismatch warns, different-major errors
 * unless `force`, invalid range errors.
 */
export function enforceEngineCompat(engineRange: string, force: boolean): void {
  const level = classifyCompat(engineRange);

  if (level === 'ok') {
    return;
  }
  if (level === 'invalid-range') {
    throw new CliError(`engine "${engineRange}" is not a valid semver range.`);
  }
  if (level === 'minor-mismatch') {
    log.warn(`Plugin targets engine ${engineRange} but host is ${hostVersion()} (same major). Proceeding.`);

    return;
  }
  // incompatible (different major)
  const msg = `Plugin targets engine ${engineRange}, incompatible with host ${hostVersion()}.`;

  if (!force) {
    throw new CliError(`${msg} Re-run with --force to install anyway.`);
  }
  log.warn(`${msg} Installing anyway (--force).`);
}

/** True when `absPath` is inside src/plugins-external. */
export function isInsideExternalDir(absPath: string): boolean {
  const rel = relative(EXTERNAL_DIR, absPath);

  return rel !== '' && !rel.startsWith('..') && !rel.includes(':');
}

/**
 * Enforce the plugin-API policy (strict gate for `add`/`update`): a declared
 * `pluginApi` range the host facade does not satisfy errors unless `force`; an
 * invalid range always errors; a missing range warns (the field is optional).
 */
export function enforcePluginApiCompat(range: string | undefined, force: boolean): void {
  const level = classifyPluginApi(range);

  if (level === 'ok') {
    return;
  }
  if (level === 'missing') {
    log.warn(`Plugin declares no "pluginApi" range; it cannot be checked against @keeptrack/plugin-api ${PLUGIN_API_VERSION}.`);

    return;
  }
  if (level === 'invalid-range') {
    throw new CliError(`pluginApi ${JSON.stringify(range)} is not a valid semver range.`);
  }

  const msg = `Plugin needs @keeptrack/plugin-api ${range}, but this host provides ${PLUGIN_API_VERSION}.`;

  if (!force) {
    throw new CliError(`${msg} Update KeepTrack or the plugin, or re-run with --force to install anyway.`);
  }
  log.warn(`${msg} Installing anyway (--force).`);
}

/**
 * Enforce the import policy (strict gate for `add`/`update`): any import other
 * than @keeptrack/plugin-api(/testing), ootk, vitest, or the plugin's own files
 * errors unless `force`.
 */
export function enforceImportPolicy(dir: string, force: boolean): void {
  const { violations, biomeError } = checkPluginImports(dir);

  if (biomeError) {
    log.warn(`Biome import check unavailable (${biomeError}); used the built-in scanner instead.`);
  }
  if (violations.length === 0) {
    return;
  }

  const list = violations.map((v) => `  - ${formatViolation(v)}`).join('\n');
  const msg = `Plugin imports outside @keeptrack/plugin-api (${violations.length}):\n${list}`;

  if (!force) {
    throw new CliError(`${msg}\nPort these imports (see docs/plugin-api.md), or re-run with --force to install anyway.`);
  }
  log.warn(`${msg}\nInstalling anyway (--force).`);
}
