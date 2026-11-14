import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Env var holding the owner API key used only by dev/watch/test builds. */
export const DEV_API_KEY_VAR = 'KEEPTRACK_DEV_API_KEY';
/** Set to '1' for a build that is never deployed (e.g. the e2e bundle) to opt in to the dev key. */
export const ALLOW_DEV_KEY_VAR = 'KEEPTRACK_ALLOW_DEV_API_KEY';

/** Reads one variable from a dotenv-style file; returns '' when absent. */
export function readEnvFileVar(filePath: string, name: string): string {
  if (!existsSync(filePath)) {
    return '';
  }

  for (const line of readFileSync(filePath, 'utf-8').split(/\r?\n/u)) {
    const match = (/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/u).exec(line);

    if (match?.[1] === name) {
      return match[2].replace(/^(['"])(.*)\1$/u, '$2');
    }
  }

  return '';
}

/** True when this build may embed the dev API key (never a plain production build). */
export function isDevKeyAllowed(mode: string, isWatch: boolean, env: NodeJS.ProcessEnv = process.env): boolean {
  return mode === 'development' || isWatch || env[ALLOW_DEV_KEY_VAR] === '1';
}

/**
 * Value for the `__DEV_API_KEY__` build constant: the dev key for dev/watch/
 * test builds, otherwise an empty string so production bundles never get it.
 */
export function resolveDevApiKey(mode: string, isWatch: boolean, envFilePath: string, env: NodeJS.ProcessEnv = process.env): string {
  if (!isDevKeyAllowed(mode, isWatch, env)) {
    return '';
  }

  return env[DEV_API_KEY_VAR] || readEnvFileVar(envFilePath, DEV_API_KEY_VAR);
}

function* walkFiles_(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);

    if (statSync(full).isDirectory()) {
      yield* walkFiles_(full);
    } else {
      yield full;
    }
  }
}

/**
 * Returns the dist files that contain any of the given secret values. Only
 * paths are returned, never the secrets. Empty values are ignored.
 */
export function findLeakedSecrets(distDir: string, secrets: string[]): string[] {
  const wanted = secrets.filter((s) => s.length > 0);

  if (wanted.length === 0 || !existsSync(distDir)) {
    return [];
  }

  const leaks: string[] = [];

  for (const file of walkFiles_(distDir)) {
    const buf = readFileSync(file);

    if (wanted.some((secret) => buf.includes(secret))) {
      leaks.push(file);
    }
  }

  return leaks;
}

/**
 * Post-build guard for non-dev builds: throws (names files only) if the value
 * of KEEPTRACK_DEV_API_KEY or KEEPTRACK_API_KEY appears anywhere in dist.
 * Skipped for builds that are allowed to carry the dev key.
 */
export function assertNoApiKeyInDist(distDir: string, mode: string, isWatch: boolean, envFilePath: string, env: NodeJS.ProcessEnv = process.env): void {
  if (isDevKeyAllowed(mode, isWatch, env)) {
    return;
  }

  const secrets = ['KEEPTRACK_DEV_API_KEY', 'KEEPTRACK_API_KEY'].flatMap((name) => [env[name] ?? '', readEnvFileVar(envFilePath, name)]);
  const leaks = findLeakedSecrets(distDir, [...new Set(secrets)]);

  if (leaks.length > 0) {
    throw new Error(`API key value found in build output (${leaks.length} file(s)): ${leaks.join(', ')}. Remove the key from the build environment.`);
  }
}
