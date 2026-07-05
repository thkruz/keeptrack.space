import { existsSync } from 'node:fs';
import { basename, relative } from 'node:path';
import { classifyCompat, hostVersion } from './host-version';
import { readLockfile } from './lockfile';
import { CliError, log } from './log';
import { EXTERNAL_DIR, pluginDir } from './paths';
import { readManifest, validateManifest } from './plugin-meta';
import { existingConfigKeys } from './existing-keys';

const GIT_URL = /^(?:https?:\/\/|git@|ssh:\/\/|git:\/\/)/u;

/** Heuristic: is this a remote git URL (vs a local filesystem path)? */
export function isGitUrl(source: string): boolean {
  return GIT_URL.test(source) || source.endsWith('.git');
}

/** Derive a sanitized, kebab-case install name from a git URL's basename. */
export function deriveName(url: string): string {
  const raw = basename(url.replace(/\/+$/u, '')).replace(/\.git$/u, '');
  const name = raw.toLowerCase().replaceAll(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '');

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
