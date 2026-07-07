import { existsSync, rmSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { writeGeneratedManifest } from '../lib/codegen';
import { confirm } from '../lib/confirm';
import { checkout, clone, headCommit } from '../lib/git';
import {
  assertNameAvailable, deriveName, enforceEngineCompat, isGitUrl, isInsideExternalDir, validatePluginStrict,
} from '../lib/install-helpers';
import { readLockfile, writeLockfile } from '../lib/lockfile';
import { CliError, log } from '../lib/log';
import { EXTERNAL_DIR, pluginDir } from '../lib/paths';
import { readManifest } from '../lib/plugin-meta';
import { runGenerateT7e } from '../lib/t7e';
import type { LockEntry } from '../lib/types';

export async function addCommand(positionals: string[], flags: Record<string, string | boolean>): Promise<number> {
  const source = positionals[0];

  if (!source) {
    throw new CliError('Usage: npm run plugin -- add <git-url|local-path> [--ref <ref>] [--name <name>] [--force] [--yes]');
  }

  const force = Boolean(flags.force);
  const assumeYes = Boolean(flags.yes);

  if (isGitUrl(source)) {
    return addFromGit(source, flags, force, assumeYes);
  }

  return addFromLocal(source, flags, force);
}

async function addFromGit(
  url: string, flags: Record<string, string | boolean>, force: boolean, assumeYes: boolean,
): Promise<number> {
  const name = (typeof flags.name === 'string' && flags.name) || deriveName(url);
  const ref = typeof flags.ref === 'string' ? flags.ref : '';

  assertNameAvailable(name);

  log.warn(`Installing "${name}" runs third-party code in your build and bundle. Only install plugins you trust.`);
  if (!(await confirm(`Install ${name} from ${url}?`, assumeYes))) {
    log.info('Aborted.');

    return 1;
  }

  const dir = pluginDir(name);

  try {
    log.step(`Cloning ${url}`);
    clone(url, dir);
    if (ref) {
      checkout(dir, ref);
    }
    const commit = headCommit(dir);

    validatePluginStrict(dir, name);
    enforceEngineCompat(readManifest(dir).engine, force);

    recordAndFinalize(name, { url, ref: ref || '(default)', commit, installedAt: new Date().toISOString() });
  } catch (e) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    }
    throw e instanceof CliError ? e : new CliError((e as Error).message);
  }

  return 0;
}

// eslint-disable-next-line require-await
async function addFromLocal(source: string, flags: Record<string, string | boolean>, force: boolean): Promise<number> {
  const abs = resolve(source);

  if (!existsSync(abs)) {
    throw new CliError(`Local path not found: ${source}`);
  }
  if (!isInsideExternalDir(abs)) {
    throw new CliError(
      `Local installs must already live under src/plugins-external/. Move the folder there first, or use "create".\n  Got: ${abs}\n  Expected under: ${EXTERNAL_DIR}`,
    );
  }

  const name = (typeof flags.name === 'string' && flags.name) || basename(abs);
  const existing = readLockfile().plugins[name];

  // Local re-add is idempotent (used by CI + after `create`): refresh, don't reject.
  if (!existing) {
    assertNameAvailable(name);
  }

  validatePluginStrict(abs, name);
  enforceEngineCompat(readManifest(abs).engine, force);

  let commit = 'local';

  try {
    commit = headCommit(abs);
  } catch {
    // Not a git repo yet (freshly scaffolded) — that's fine for a local entry.
  }

  recordAndFinalize(name, { url: abs, ref: 'local', commit, installedAt: new Date().toISOString(), local: true });

  return 0;
}

/** Write the lockfile entry, regenerate the manifest + locales, and print a summary. */
function recordAndFinalize(name: string, entry: LockEntry): void {
  const lock = readLockfile();

  lock.plugins[name] = entry;
  writeLockfile(lock);

  const manifest = readManifest(pluginDir(name));
  const report = writeGeneratedManifest();

  log.step('Regenerating locales…');
  runGenerateT7e();

  const keys = manifest.plugins.map((p) => p.configKey).join(', ');

  log.success(`Installed ${name}@${manifest.version} (${keys}).`);
  if (report.incompatible.some((i) => manifest.plugins.some((p) => p.configKey === i.configKey))) {
    log.warn('This plugin may be incompatible with the current host version — see "npm run plugin -- list".');
  }
  log.info('Run "npm run build" (or restart "npm start") to include it.');
}
