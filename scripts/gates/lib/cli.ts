/** Shared CLI plumbing for gate entry points. */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './functions';
import { resolveBase } from './changed';
import { exitCode, formatTable, writeResult, type GateResult } from './report';

export interface GateOptions {
  /** Judge everything, exit 0, report counts. */
  all: boolean;
  /** Resolved merge-base sha (or the raw ref when it cannot be resolved). */
  base: string;
  head: string;
  /** Extra flags, e.g. --threshold=10. */
  flags: Record<string, string | true>;
}

export function parseGateArgs(argv: string[]): GateOptions {
  const flags: Record<string, string | true> = {};
  let explicitBase: string | undefined;
  let all = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === '--all') {
      all = true;
    } else if (a === '--base') {
      explicitBase = argv[++i];
    } else if (a.startsWith('--base=')) {
      explicitBase = a.slice(7);
    } else if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');

      flags[k] = v ?? true;
    }
  }

  let head = 'unknown';

  try {
    head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
  } catch { /* not a git checkout */ }

  return { all, base: resolveBase(REPO_ROOT, explicitBase), head, flags };
}

/** True when the module is the process entry point. */
export function isMain(metaUrl: string): boolean {
  return !!process.argv[1] && metaUrl === pathToFileURL(process.argv[1]).href;
}

/** Print, write .metrics/<gate>.json, return the exit code. */
export function finish(result: GateResult): number {
  const file = writeResult(result);

  console.log(formatTable(result));
  console.log(`wrote ${file}`);

  return exitCode(result);
}
