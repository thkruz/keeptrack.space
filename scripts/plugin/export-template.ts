/**
 * Render the plugin template to a standalone directory, using example placeholder
 * values, to (re)generate the public `keeptrack-plugin-example` repo used for
 * GitHub's "Use this template" flow. Keeps that repo from drifting out of sync
 * with scripts/plugin/templates.
 *
 *   npx tsx scripts/plugin/export-template.ts <out-dir> [--overlay]
 */
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveStrictlyWithin } from '../lib/safe-path';
import { hostVersion } from './lib/host-version';
import { log } from './lib/log';
import { REPO_ROOT } from './lib/paths';
import { buildVars, renderPlugin } from './lib/render-template';

const WORKSPACE_ROOT = resolve(REPO_ROOT, '..');

function main(): number {
  const outArg = process.argv[2];

  if (!outArg || outArg.startsWith('--')) {
    log.error('Usage: npx tsx scripts/plugin/export-template.ts <out-dir> [--overlay]');

    return 1;
  }

  const kind = process.argv.includes('--overlay') ? 'overlay' : 'menu';
  // outArg is CLI-controlled and feeds a recursive rmSync below. Resolve it
  // (relative to cwd, as before) then confine it to the workspace so it can
  // never delete a path outside the repo's containing folder; also refuse the
  // workspace root and the repo root themselves.
  const outDir = resolveStrictlyWithin(WORKSPACE_ROOT, resolve(outArg));

  if (outDir === REPO_ROOT) {
    log.error('Refusing to export onto the repo root itself.');

    return 1;
  }

  const vars = buildVars('example', hostVersion(), {
    description: 'An example KeepTrack plugin — use this repo as a template.',
    author: 'Your Name',
  });

  // Clean the target so a removed template file doesn't linger in the export.
  rmSync(outDir, { recursive: true, force: true, maxRetries: 5 });
  renderPlugin(outDir, kind, vars);

  log.success(`Rendered ${kind} template to ${outDir}`);
  log.step('Commit this directory as the public keeptrack-plugin-example repo.');

  return 0;
}

process.exitCode = main();
