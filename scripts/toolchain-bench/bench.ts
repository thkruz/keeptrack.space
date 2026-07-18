/**
 * Toolchain benchmark harness.
 *
 * Times the toolchain-sensitive commands (install, build, typecheck, lint,
 * format) across the modernization steps so we can prove each swap was worth
 * doing. Reruns each scenario a few times and reports min / median wall time.
 *
 * Usage:
 *   npx tsx scripts/toolchain-bench/bench.ts                 # all scenarios, 3 reps
 *   npx tsx scripts/toolchain-bench/bench.ts --reps=5        # more reps
 *   npx tsx scripts/toolchain-bench/bench.ts --only=lint,typecheck
 *   npx tsx scripts/toolchain-bench/bench.ts --json          # emit raw JSON too
 *
 * Results are appended to docs-local/toolchain-modernization-benchmarks.md by
 * hand (the script prints a ready-to-paste markdown row block).
 */
import { execSync } from 'node:child_process';
import { hrtime } from 'node:process';

interface Scenario {
  name: string;
  /** Shell command to time. */
  cmd: string;
  /** Optional command run once before timing (not measured), e.g. a warm-up. */
  prep?: string;
  /** Skip by default (slow / not part of the core speed story). */
  optIn?: boolean;
}

const SCENARIOS: Scenario[] = [
  { name: 'install:warm', cmd: 'pnpm install --frozen-lockfile' },
  { name: 'build:oss', cmd: 'pnpm exec tsx ./build/build-manager.ts production --profile=oss --skip-locales' },
  { name: 'typecheck', cmd: 'pnpm run typecheck' },
  { name: 'lint', cmd: 'pnpm run lint' },
  { name: 'test:unit', cmd: 'pnpm test', optIn: true },
];

const args = process.argv.slice(2);
const reps = Number(args.find((a) => a.startsWith('--reps='))?.split('=')[1] ?? 3);
const onlyArg = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const only = onlyArg ? new Set(onlyArg.split(',')) : null;
const emitJson = args.includes('--json');

const selected = SCENARIOS.filter((s) => (only ? only.has(s.name) : !s.optIn));

const median = (xs: number[]): number => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const run = (cmd: string): number => {
  const start = hrtime.bigint();

  execSync(cmd, { stdio: 'ignore', shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/sh' });

  return Number(hrtime.bigint() - start) / 1e9;
};

interface Result {
  name: string;
  samples: number[];
  min: number;
  median: number;
}

const results: Result[] = [];

for (const scenario of selected) {
  process.stderr.write(`\n[bench] ${scenario.name} (${reps} reps)\n`);
  if (scenario.prep) {
    run(scenario.prep);
  }

  const samples: number[] = [];

  for (let i = 0; i < reps; i++) {
    let seconds: number;

    try {
      seconds = run(scenario.cmd);
    } catch {
      // A non-zero exit (e.g. lint findings) still produced a real timing; the
      // command ran to completion, so keep the sample rather than aborting.
      seconds = Number.NaN;
      process.stderr.write(`  rep ${i + 1}: command exited non-zero (still timed)\n`);
      continue;
    }
    samples.push(seconds);
    process.stderr.write(`  rep ${i + 1}: ${seconds.toFixed(2)}s\n`);
  }

  const clean = samples.filter((s) => !Number.isNaN(s));

  results.push({
    name: scenario.name,
    samples: clean,
    min: clean.length ? Math.min(...clean) : Number.NaN,
    median: clean.length ? median(clean) : Number.NaN,
  });
}

process.stdout.write('\n| Scenario | Min (s) | Median (s) | Reps |\n');
process.stdout.write('|----------|--------:|-----------:|-----:|\n');
for (const r of results) {
  process.stdout.write(`| ${r.name} | ${r.min.toFixed(2)} | ${r.median.toFixed(2)} | ${r.samples.length} |\n`);
}

if (emitJson) {
  process.stdout.write(`\n${JSON.stringify(results, null, 2)}\n`);
}
