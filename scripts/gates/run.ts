/**
 * Run selected gates: `tsx scripts/gates/run.ts [crap|dry|deps|test-lint ...] [--all] [--base <ref>]`.
 * No gate names = all four fast code gates. Writes .metrics/<gate>.json; exit code from changed items only.
 * mutate and ui gates are added by their own modules.
 */
import { runCrap } from './crap';
import { runDeps } from './deps';
import { runDry } from './dry';
import { parseGateArgs, type GateOptions } from './lib/cli';
import { exitCode, formatTable, writeResult, type GateResult } from './lib/report';
import { runTestLint } from './test-lint';

export const GATES: Record<string, (o: GateOptions) => GateResult> = {
  crap: runCrap,
  dry: runDry,
  deps: runDeps,
  'test-lint': runTestLint,
};

const argv = process.argv.slice(2);

if (argv[0] === 'mutate') {
  // Long-running, resumable: own entry point (scripts/gates/mutate.ts).
  void import('./mutate').then((m) => m.main(argv.slice(1))).then((c) => process.exit(c));
} else {
  runSync();
}

function runSync() {
const flagsWithValue = new Set(['--base']);
const names: string[] = [];

for (let i = 0; i < argv.length; i++) {
  if (flagsWithValue.has(argv[i])) {
    i++;
  } else if (!argv[i].startsWith('--')) {
    names.push(argv[i]);
  }
}

const selected = names.length ? names : Object.keys(GATES);
const unknown = selected.filter((n) => !GATES[n]);

if (unknown.length) {
  console.error(`unknown gate(s): ${unknown.join(', ')}; available: ${Object.keys(GATES).join(', ')}`);
  process.exit(2);
}

const opts = parseGateArgs(argv.filter((a) => !selected.includes(a)));
let code = 0;

for (const name of selected) {
  const t0 = Date.now();
  const result = GATES[name](opts);

  writeResult(result);
  console.log(`${formatTable(result)}\n  (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
  code = Math.max(code, exitCode(result));
}

process.exit(code);
}
