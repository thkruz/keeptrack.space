import { cpSync, existsSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { writeGeneratedManifest } from '../lib/codegen';
import { confirm } from '../lib/confirm';
import { checkout, clone, headCommit } from '../lib/git';
import {
  assertNameAvailable, deriveName, enforceEngineCompat, enforceImportPolicy, enforcePluginApiCompat, isGitUrl, isInsideExternalDir,
  validatePluginStrict,
} from '../lib/install-helpers';
import { readLockfile, writeLockfile } from '../lib/lockfile';
import { CliError, log } from '../lib/log';
import { pluginDir } from '../lib/paths';
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
    enforceCompatGates(dir, force);

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

  const plan = planLocalInstall(abs, typeof flags.name === 'string' ? flags.name : '', isInsideExternalDir(abs), readLockfile().plugins);

  if (plan.kind === 'in-place') {
    validatePluginStrict(abs, plan.name);
    enforceCompatGates(abs, force);
    recordAndFinalize(plan.name, { url: abs, ref: 'local', commit: tryHeadCommit(abs), installedAt: new Date().toISOString(), local: true });

    return 0;
  }

  // A folder elsewhere on disk (e.g. the author's own plugin repo): bring it in like a remote install.
  assertNameAvailable(plan.name);
  const dir = pluginDir(plan.name);

  try {
    if (plan.kind === 'clone') {
      log.step(`Cloning ${abs}`);
      clone(abs, dir);
    } else {
      log.step(`Copying ${abs}`);
      copyPluginFolder(abs, dir);
    }

    validatePluginStrict(dir, plan.name);
    enforceCompatGates(dir, force);

    const entry: LockEntry =
      plan.kind === 'clone'
        ? // A git checkout keeps its path as the remote, so "update" pulls the author's latest commits from it.
          { url: abs, ref: '(default)', commit: headCommit(dir), installedAt: new Date().toISOString() }
        : { url: abs, ref: 'local', commit: 'local', installedAt: new Date().toISOString(), local: true };

    recordAndFinalize(plan.name, entry);
  } catch (e) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    }
    throw e instanceof CliError ? e : new CliError((e as Error).message);
  }

  return 0;
}

export type LocalInstallPlan = { kind: 'in-place' | 'clone' | 'copy'; name: string };

/**
 * Decide how a local path is installed.
 * - Under src/plugins-external/ (e.g. right after `create`): register it where it is. The folder IS the plugin, so
 *   its own existence is not a name clash; only another lockfile entry is.
 * - Anywhere else: clone it if it is a git checkout (so `update` can pull from it), otherwise copy it.
 */
export function planLocalInstall(abs: string, nameFlag: string, isInsideExternal: boolean, locked: Record<string, LockEntry>): LocalInstallPlan {
  if (isInsideExternal) {
    const name = basename(abs);

    if (nameFlag && nameFlag !== name) {
      throw new CliError(`A plugin already under src/plugins-external/ is installed under its folder name "${name}"; drop --name or rename the folder.`);
    }
    const entry = locked[name];

    if (entry && !entry.local) {
      throw new CliError(`"${name}" is already installed from ${entry.url}. Use "update" or "remove" first.`);
    }

    return { kind: 'in-place', name };
  }

  return { kind: existsSync(join(abs, '.git')) ? 'clone' : 'copy', name: nameFlag || deriveName(abs) };
}

/** Copy a plugin folder, leaving out VCS data and installed dependencies. */
function copyPluginFolder(from: string, to: string): void {
  const skip = new Set(['.git', 'node_modules', 'dist', 'coverage']);

  cpSync(from, to, { recursive: true, filter: (src) => !skip.has(basename(src)) });
}

function tryHeadCommit(dir: string): string {
  try {
    return headCommit(dir);
  } catch {
    // Not a git repo yet (freshly scaffolded); that is fine for a local entry.
    return 'local';
  }
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

/** The strict install gates: host engine range, plugin-API range, import policy. */
function enforceCompatGates(dir: string, force: boolean): void {
  const manifest = readManifest(dir);

  enforceEngineCompat(manifest.engine, force);
  enforcePluginApiCompat(manifest.pluginApi, force);
  enforceImportPolicy(dir, force);
}
