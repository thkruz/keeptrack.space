import { spawnSync } from 'node:child_process';
import { relative } from 'node:path';
import { CliError, log } from '../lib/log';
import { REPO_ROOT } from '../lib/paths';
import { resolvePlugin } from '../lib/resolve-plugin';

/**
 * Run an external plugin's unit tests through the host vitest harness. The main
 * vitest config excludes src/plugins-external/** from the normal suite (third-party
 * tests belong in their own repos), so this uses vitest.external.config.ts — same
 * env/aliases but scoped to external plugins — and filters to the target folder.
 */
export function testCommand(positionals: string[], flags: Record<string, string | boolean>): number {
  const name = positionals[0];

  if (!name) {
    throw new CliError('Usage: npm run plugin -- test <name> [--watch]');
  }

  const resolved = resolvePlugin(name);

  if (resolved.kind !== 'external') {
    throw new CliError(`"${name}" is a built-in plugin. Run its tests with the host "npm test".`);
  }

  const dirFilter = relative(REPO_ROOT, resolved.dir).replaceAll('\\', '/');
  const args = ['vitest', flags.watch ? 'watch' : 'run', '--config', 'vitest.external.config.ts', dirFilter];

  log.step(`vitest ${args.slice(1).join(' ')}`);

  const res = spawnSync('npx', args, { cwd: REPO_ROOT, shell: process.platform === 'win32', stdio: 'inherit' });

  return res.status ?? 1;
}
