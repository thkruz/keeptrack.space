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
import { hostVersion } from './lib/host-version';
import { log } from './lib/log';
import { buildVars, renderPlugin } from './lib/render-template';

function main(): number {
  const outArg = process.argv[2];

  if (!outArg || outArg.startsWith('--')) {
    log.error('Usage: npx tsx scripts/plugin/export-template.ts <out-dir> [--overlay]');

    return 1;
  }

  const kind = process.argv.includes('--overlay') ? 'overlay' : 'menu';
  const outDir = resolve(outArg);
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
