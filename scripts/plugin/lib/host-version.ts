import { readFileSync } from 'node:fs';
import semver from 'semver';
import { PLUGIN_API_VERSION } from '../../../src/plugin-api/version';
import { HOST_PACKAGE_JSON_PATH } from './paths';

export { PLUGIN_API_VERSION };

let cachedVersion: string | null = null;

/** The host KeepTrack version (the value injected as __VERSION__ at build time). */
export function hostVersion(): string {
  if (cachedVersion === null) {
    const pkg = JSON.parse(readFileSync(HOST_PACKAGE_JSON_PATH, 'utf8')) as { version: string };

    cachedVersion = pkg.version;
  }

  return cachedVersion;
}

export type CompatLevel = 'ok' | 'minor-mismatch' | 'incompatible' | 'invalid-range';

/**
 * Classify a plugin's declared `engine` range against the host version.
 * - ok: host satisfies the range.
 * - minor-mismatch: same major, but host is outside the range (warn, proceed).
 * - incompatible: different major (error unless --force).
 * - invalid-range: the range string is not valid semver.
 */
export function classifyCompat(engineRange: string): CompatLevel {
  const host = hostVersion();

  if (!semver.validRange(engineRange)) {
    return 'invalid-range';
  }
  if (semver.satisfies(host, engineRange, { includePrerelease: true })) {
    return 'ok';
  }

  const min = semver.minVersion(engineRange);

  if (min && semver.major(min) === semver.major(host)) {
    return 'minor-mismatch';
  }

  return 'incompatible';
}

/** Boolean the generated meta embeds so the browser needs no semver library. */
export function isCompatible(engineRange: string): boolean {
  return classifyCompat(engineRange) === 'ok';
}

export type PluginApiCompat = 'ok' | 'missing' | 'unsatisfied' | 'invalid-range';

/**
 * Classify a plugin's declared `pluginApi` range against the host facade
 * version (PLUGIN_API_VERSION in src/plugin-api/version.ts).
 * - ok: the host facade satisfies the range.
 * - missing: the manifest has no `pluginApi` (older plugin; the field is optional).
 * - unsatisfied: the host facade is outside the range. Unlike `engine`, there is
 *   no "same major, warn" tier: a plugin needing a newer minor uses exports this
 *   host does not have, and a different major means a removed/changed export.
 * - invalid-range: not a valid semver range.
 */
export function classifyPluginApi(range: string | undefined): PluginApiCompat {
  if (typeof range === 'undefined' || range === null) {
    return 'missing';
  }
  if (typeof range !== 'string' || !semver.validRange(range)) {
    return 'invalid-range';
  }

  return semver.satisfies(PLUGIN_API_VERSION, range, { includePrerelease: true }) ? 'ok' : 'unsatisfied';
}
