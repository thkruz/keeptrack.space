/* eslint-disable prefer-named-capture-group */
/* eslint-disable require-jsdoc */
// build/ensure-submodules.ts
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConsoleStyles, logWithStyle } from './lib/build-error';

function sh(cmd: string, args: string[], opts: { allowFail?: boolean } = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });

  if (res.status !== 0 && !opts.allowFail) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }

  return res.status === 0;
}

function listSubmodules(): { name: string; path: string }[] {
  const gm = resolve(process.cwd(), '.gitmodules');

  if (!existsSync(gm)) {
    return [];
  }
  const txt = readFileSync(gm, 'utf8');
  // Minimal parser: lines like [submodule "name"] then path = foo/bar
  const out: { name: string; path: string }[] = [];
  let current: string | null = null;

  for (const line of txt.split(/\r?\n/u)) {
    const h = line.match(/^\s*\[submodule\s+"(.+?)"\s*\]\s*$/u);

    if (h) {
      // eslint-disable-next-line max-statements-per-line
      current = h[1]; continue;
    }
    const p = line.match(/^\s*path\s*=\s*(.+)\s*$/u);

    if (p && current) {
      out.push({ name: current, path: p[1].trim() });
    }
  }

  return out;
}

function ensureSubmodules() {
  if (!existsSync('.git') || !existsSync('.gitmodules')) {
    logWithStyle('[submodules] No git or no .gitmodules; skipping.', ConsoleStyles.WARNING);

    return;
  }

  // Get all submodules and split into optional vs required
  const subs = listSubmodules();
  const optionalNames = new Set(['src/plugins-pro']); // mark expected-to-fail here

  const required = subs.filter((s) => !optionalNames.has(s.name));
  const optional = subs.filter((s) => optionalNames.has(s.name));

  if (required.length === 0 && optional.length === 0) {
    logWithStyle('[submodules] No submodules found.', ConsoleStyles.WARNING);

    return;
  }

  // Init only the required ones (by path), recurse for their nested children
  for (const s of required) {
    logWithStyle(`[submodules] Updating required: ${s.name} (${s.path})`, ConsoleStyles.INFO);
    sh('git', ['submodule', 'update', '--init', '--recursive', '--depth', '1', '--jobs', '4', '--', s.path]);
    logWithStyle(`[submodules] Updated required submodule: ${s.name}`, ConsoleStyles.SUCCESS);
  }

  // Try the optional ones, but do not fail the build if they error out
  for (const s of optional) {
    logWithStyle(`[submodules] Attempting optional: ${s.name} (${s.path})`, ConsoleStyles.INFO);
    const ok = sh('git', ['submodule', 'update', '--init', '--recursive', '--depth', '1', '--jobs', '4', '--', s.path], { allowFail: true });

    if (!ok) {
      logWithStyle(`[submodules] Skipped optional submodule ${s.name}; continuing without it.`, ConsoleStyles.WARNING);
    } else {
      logWithStyle(`[submodules] Updated optional submodule: ${s.name}`, ConsoleStyles.SUCCESS);
    }
  }

  // Optional: print a summary
  sh('git', ['submodule', 'status', '--recursive'], { allowFail: true });
}

ensureSubmodules();
