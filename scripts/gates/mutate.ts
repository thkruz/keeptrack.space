/**
 * Gates 2 (operator mutation) and 3 (return-nothing mutation), resumable.
 *
 *   tsx scripts/gates/run.ts mutate --scan
 *   tsx scripts/gates/run.ts mutate --kind=empty --max-minutes=90 [--workers=6] [--limit=N] [--files=substr] [--mutate-all]
 *   tsx scripts/gates/run.ts mutate --report [--kind=empty|operator]
 *
 * Sources are never edited. Each worker writes the mutated text to .metrics/mutate/overlay/w<N>/<file>
 * and runs `vitest related <file> --run` with scripts/gates/mutate.vitest.config.ts, whose plugin serves
 * that overlay text for the one target module (env KT_MUTATE_TARGET / KT_MUTATE_OVERLAY).
 * Exit code 0 on survivors always (baseline); a killed run, a timeout and a failed transform all count as killed.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { changedLines } from './lib/changed';
import { isMain, parseGateArgs } from './lib/cli';
import { loadCoverage, type CoverageMap } from './lib/coverage';
import { listSourceFiles, REPO_ROOT } from './lib/functions';
import { buildTestMap, listTestFiles, type TestRef } from './lib/testmap';
import {
  appendJournal, applyMutant, generateMutants, isDone, readJournal,
  type JournalEntry, type Mutant, type MutantKind, type MutantResult,
} from './lib/mutants';
import { buildResult, writeResult, type GateItem } from './lib/report';

const DIR = process.env.KT_MUTATE_DIR ?? path.join(REPO_ROOT, '.metrics', 'mutate');
const JOURNAL = path.join(DIR, 'journal.jsonl');
const STOP = path.join(DIR, 'STOP');
const CONFIG = 'scripts/gates/mutate.vitest.config.ts';

type Flags = Record<string, string | true>;

function parseFlags(argv: string[]): Flags {
  const f: Flags = {};

  for (const a of argv) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');

      f[k] = v ?? true;
    }
  }

  return f;
}

function kindsOf(flags: Flags): MutantKind[] {
  const k = flags.kind;

  if (k === 'empty' || k === 'operator') {
    return [k];
  }

  return ['empty', 'operator'];
}

/** Files ordered: changed files first, then most recent commit first. */
function orderFiles(files: string[], base: string): string[] {
  const changed = new Set(changedLines(base).keys());
  const last = new Map<string, number>();

  try {
    const out = execFileSync('git', ['log', '--name-only', '--format=@%ct', '-n', '4000'], { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 1 << 28 });
    let ts = 0;

    for (const line of out.split('\n')) {
      if (line.startsWith('@')) {
        ts = Number(line.slice(1));
      } else if (line && !last.has(line)) {
        last.set(line, ts);
      }
    }
  } catch { /* no git history */ }

  return [...files].sort((a, b) => {
    const ca = changed.has(a) ? 1 : 0;
    const cb = changed.has(b) ? 1 : 0;

    return cb - ca || (last.get(b) ?? 0) - (last.get(a) ?? 0) || a.localeCompare(b);
  });
}

function collect(files: string[], kinds: MutantKind[], cov: CoverageMap | undefined): Mutant[] {
  const all: Mutant[] = [];

  for (const f of files) {
    const fc = cov?.get(f);

    if (cov && !fc) {
      continue; // file not in the coverage report: nothing executed
    }
    const text = readFileSync(path.join(REPO_ROOT, f), 'utf-8');

    all.push(...generateMutants(f, text, { kinds, covered: fc ? (l) => (fc.lines.get(l) ?? 0) > 0 : undefined }));
  }

  return all;
}

interface RunOutcome { code: number | null; timedOut: boolean; out: string }

/** Run an explicit test list (written to testsFile) against the overlay copy of one module. */
function runVitest(tests: string[], testsFile: string, target: string, overlay: string, timeoutMs: number, forks: number): Promise<RunOutcome> {
  return new Promise((resolve) => {
    writeFileSync(testsFile, JSON.stringify(tests));
    const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', CONFIG, '--bail=1', '--reporter=dot', '--coverage.enabled=false'];
    const child = spawn(process.execPath, args, {
      cwd: REPO_ROOT, windowsHide: true,
      env: { ...process.env, KT_MUTATE_TARGET: target, KT_MUTATE_OVERLAY: overlay, KT_MUTATE_TESTS: testsFile, KT_MUTATE_FORKS: String(forks), NO_COLOR: '1' },
    });
    let out = '';
    let timedOut = false;
    const add = (d: Buffer) => {
      out = (out + d.toString()).slice(-6000);
    };

    child.stdout.on('data', add);
    child.stderr.on('data', add);
    const timer = setTimeout(() => {
      timedOut = true;
      if (child.pid) {
        try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { child.kill('SIGKILL'); }
      }
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, timedOut, out });
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ code: -1, timedOut: false, out: String(e) });
    });
  });
}

async function runMutants(flags: Flags, head: string, base: string): Promise<void> {
  const kinds = kindsOf(flags);
  const workers = Number(flags.workers ?? 6);
  const forks = Number(flags.forks ?? 2);
  const timeoutMs = Number(flags['timeout-s'] ?? 90) * 1000;
  const maxMs = flags['max-minutes'] ? Number(flags['max-minutes']) * 60_000 : Infinity;
  const limit = flags.limit ? Number(flags.limit) : Infinity;
  const covRes = loadCoverage(['coverage/lcov.info']);

  if (!covRes) {
    console.error('coverage/lcov.info missing: run vitest --coverage first');
    process.exit(2);
  }
  mkdirSync(DIR, { recursive: true });
  if (existsSync(STOP)) {
    rmSync(STOP);
    console.log('removed stale STOP file');
  }

  let files = orderFiles(listSourceFiles(), base);

  if (typeof flags.files === 'string') {
    files = files.filter((f) => f.includes(flags.files as string));
  }
  // Kinds run in the given order: empty (gate 3) before operator (gate 2).
  const journal = readJournal(JOURNAL);
  const everything = kinds.flatMap((k) => collect(files, [k], covRes.map));
  const queue = flags['mutate-all'] ? everything : everything.filter((m) => !isDone(journal, m));
  const todo = queue.slice(0, limit);

  console.log(`mutants total ${everything.length}, already journaled ${everything.length - queue.length}, to run ${todo.length}, workers ${workers}`);

  let next = 0;
  let done = 0;
  let survivors = 0;
  let stopping = false;
  const t0 = Date.now();
  const baselineOk = new Map<string, Promise<boolean>>();
  const maxTests = Number(flags['max-tests'] ?? 40);
  const tm0 = Date.now();
  const testMap = buildTestMap(listTestFiles());

  console.log(`test map: ${testMap.size} source files have tests (${((Date.now() - tm0) / 1000).toFixed(0)}s)`);
  /** Stage 1 = tests importing the file directly (fast kills); stage 2 = the nearest transitive rest, capped. */
  const stagesFor = (file: string): string[][] => {
    const refs: TestRef[] = testMap.get(file) ?? [];
    const direct = refs.filter((r) => r.depth <= 1).map((r) => r.test);
    const s1 = direct.length ? direct.slice(0, maxTests) : refs.slice(0, 5).map((r) => r.test);
    const s2 = refs.map((r) => r.test).filter((t) => !s1.includes(t)).slice(0, Math.max(0, maxTests - s1.length));

    return [s1, s2].filter((x) => x.length);
  };
  const execute = async (file: string, abs: string, ov: string, tf: string): Promise<{ r: RunOutcome; stage: string[] | null }> => {
    const stages = stagesFor(file);
    let last: RunOutcome = { code: 0, timedOut: false, out: 'No test files found' };

    for (const st of stages) {
      last = await runVitest(st, tf, abs, ov, timeoutMs, forks);
      if (last.code !== 0 || last.timedOut) {
        return { r: last, stage: st };
      }
    }

    return { r: last, stage: stages[stages.length - 1] ?? null };
  };
  const stopNow = (why: string) => {
    if (!stopping) {
      stopping = true;
      console.log(`stopping (${why}): letting in-flight mutants finish`);
    }
  };

  process.on('SIGINT', () => {
    if (stopping) {
      console.log('second Ctrl+C: exiting, in-flight mutants are not recorded');
      process.exit(130);
    }
    stopNow('Ctrl+C');
  });

  const progress = setInterval(() => {
    const min = (Date.now() - t0) / 60_000;
    const rate = done / Math.max(min, 1e-6);
    const left = rate > 0 ? (todo.length - done) / rate : NaN;

    console.log(`[${new Date().toISOString().slice(11, 19)}] ${done}/${todo.length} done, ${survivors} survivors, ${rate.toFixed(1)}/min, ~${Number.isFinite(left) ? left.toFixed(0) : '?'} min left`);
  }, 60_000);

  const checkBaseline = (stage: string[], file: string, w: number): Promise<boolean> => {
    const key = stage.join(',');
    let p = baselineOk.get(key);

    if (!p) {
      const dir = path.join(DIR, 'overlay', `w${w}`);
      const ov = path.join(dir, 'baseline.txt');

      mkdirSync(dir, { recursive: true });
      writeFileSync(ov, readFileSync(path.join(REPO_ROOT, file), 'utf-8'));
      p = runVitest(stage, path.join(dir, 'tests.json'), path.join(REPO_ROOT, file), ov, timeoutMs, forks).then((r) => r.code === 0 && !r.timedOut);
      baselineOk.set(key, p);
    }

    return p;
  };

  // Serial warm-up: a cold module cache plus concurrent workers produced baseline errors (suspected concurrent cache writes),
  // so fill the cache with unmutated runs of the first few distinct files' test lists before the workers start.
  {
    const wf = [...new Set(todo.map((m) => m.file))].slice(0, 4);
    const tw = Date.now();
    const wdir = path.join(DIR, 'overlay', 'warm');

    mkdirSync(wdir, { recursive: true });
    for (const f of wf) {
      const ov = path.join(wdir, 'clean.txt');

      writeFileSync(ov, readFileSync(path.join(REPO_ROOT, f), 'utf-8'));
      for (const st of stagesFor(f)) {
        await runVitest(st, path.join(wdir, 'tests.json'), path.join(REPO_ROOT, f), ov, timeoutMs * 2, forks);
      }
    }
    console.log(`cache warm-up: ${wf.length} files serially in ${((Date.now() - tw) / 1000).toFixed(0)}s`);
  }

  const worker = async (w: number) => {
    const dir = path.join(DIR, 'overlay', `w${w}`);

    while (!stopping) {
      if (existsSync(STOP)) {
        stopNow('STOP file');
        break;
      }
      if (Date.now() - t0 >= maxMs) {
        stopNow('--max-minutes');
        break;
      }
      const i = next++;

      if (i >= todo.length) {
        break;
      }
      const m = todo[i];
      const abs = path.join(REPO_ROOT, m.file);
      const ov = path.join(dir, m.file);

      mkdirSync(path.dirname(ov), { recursive: true });
      writeFileSync(ov, applyMutant(readFileSync(abs, 'utf-8'), m));
      const s = Date.now();
      const { r, stage } = await execute(m.file, abs, ov, path.join(dir, 'tests.json'));
      let result: MutantResult = r.timedOut ? 'timeout' : r.code === 0 ? 'survived' : r.code === -1 ? 'error' : 'killed';

      if (result === 'survived' && /No test files found|no tests/i.test(r.out)) {
        result = 'uncovered';
      }
      if (result === 'killed' && stage && !(await checkBaseline(stage, m.file, w))) {
        result = 'error'; // tests for this file fail without any mutation: not a real kill
      }
      const e: JournalEntry = {
        id: m.id, kind: m.kind, file: m.file, fn: m.fn, line: m.line, col: m.col, original: m.original, replacement: m.replacement,
        result, durationMs: Date.now() - s, bodyHash: m.bodyHash, head, ts: new Date().toISOString(),
      };

      appendJournal(JOURNAL, e);
      done++;
      if (result === 'survived') {
        survivors++;
      }
    }
  };

  await Promise.all(Array.from({ length: workers }, (_, w) => worker(w)));
  clearInterval(progress);
  const mins = (Date.now() - t0) / 60_000;

  console.log(`finished: ${done} mutants in ${mins.toFixed(1)} min (${survivors} survivors)${stopping ? '; stopped early, rerun the same command to resume' : ''}`);
}

function scan(flags: Flags, base: string): void {
  const covRes = loadCoverage(['coverage/lcov.info']);
  const files = orderFiles(listSourceFiles(), base);

  for (const kind of ['empty', 'operator'] as MutantKind[]) {
    const withCov = collect(files, [kind], covRes?.map);
    const noCov = collect(files, [kind], undefined);
    const fileSet = new Set(withCov.map((m) => m.file));

    console.log(`${kind}: ${withCov.length} runnable (covered) mutants in ${fileSet.size} files; ${noCov.length} before the coverage filter`);
  }
  void flags;
}

function report(flags: Flags, head: string, base: string): void {
  const covRes = loadCoverage(['coverage/lcov.info']);
  const files = listSourceFiles();
  const journal = readJournal(JOURNAL);
  const lines: string[] = [];
  const items: GateItem[] = [];
  const changed = changedLines(base);

  for (const kind of kindsOf(flags)) {
    const all = collect(files, [kind], covRes?.map);
    const fileTotals = new Map<string, { total: number; done: number }>();
    const counts: Record<string, number> = { killed: 0, survived: 0, timeout: 0, uncovered: 0, error: 0 };
    const survivors: Mutant[] = [];
    let done = 0;
    let ms = 0;

    for (const m of all) {
      const t = fileTotals.get(m.file) ?? { total: 0, done: 0 };

      t.total++;
      const e = journal.get(m.id);

      if (e && e.bodyHash === m.bodyHash) {
        done++;
        t.done++;
        counts[e.result]++;
        ms += e.durationMs;
        if (e.result === 'survived') {
          survivors.push(m);
          const ch = (changed.get(m.file) ?? []).some((r) => r.start <= m.line && r.end >= m.line);

          items.push({
            id: m.id, file: m.file, line: m.line, name: m.fn, changed: ch, status: ch ? 'fail' : 'warn',
            message: `${kind} mutant survived: ${m.kind === 'empty' ? 'body emptied' : `${m.original} -> ${m.replacement || '(removed)'}`}`,
          });
        }
      }
      fileTotals.set(m.file, t);
    }
    const filesDone = [...fileTotals.values()].filter((t) => t.done === t.total).length;
    const judged = counts.killed + counts.survived + counts.timeout;
    const score = judged ? ((counts.killed + counts.timeout) / judged) * 100 : 0;
    const perFn = new Map<string, { n: number; m: Mutant }>();

    for (const m of survivors) {
      const k = `${m.file}|${m.fn}|${m.fnStart}`;
      const c = perFn.get(k) ?? { n: 0, m };

      c.n++;
      perFn.set(k, c);
    }

    lines.push(`## ${kind}`, '',
      `- covered by journal: ${done}/${all.length} mutants (${all.length ? ((done / all.length) * 100).toFixed(1) : 0}%), ${filesDone}/${fileTotals.size} files fully done`,
      `- killed ${counts.killed}, survived ${counts.survived}, timeout ${counts.timeout}, uncovered ${counts.uncovered}, error ${counts.error}; mutation score ${score.toFixed(1)}%`,
      `- mean ${done ? Math.round(ms / done) : 0} ms per mutant (single worker wall time)`, '',
      kind === 'empty' ? 'Worst 20 untested functions (survivor = body emptied, tests still pass; largest first):' : 'Worst 20 functions by surviving mutants:', '');
    for (const { n, m } of [...perFn.values()].sort((a, b) => (kind === 'empty' ? (b.m.fnEnd - b.m.fnStart) - (a.m.fnEnd - a.m.fnStart) : b.n - a.n)).slice(0, 20)) {
      lines.push(`- ${m.file}:${m.fnStart} ${m.fn}: ${kind === 'empty' ? `${m.fnEnd - m.fnStart + 1} lines, untested` : `${n} survivors`}${kind === 'empty' ? '' : ` (first at line ${survivors.find((s) => s.file === m.file && s.fnStart === m.fnStart)?.line})`}`);
    }
    lines.push('');
  }
  lines.push(`Resume: pnpm exec tsx scripts/gates/run.ts mutate --kind=${typeof flags.kind === 'string' ? flags.kind : 'empty'} --max-minutes=N`, '');
  const text = lines.join('\n');

  mkdirSync(DIR, { recursive: true });
  writeFileSync(path.join(DIR, 'report.md'), text);
  writeResult(buildResult({ gate: 'mutate', head, base, mode: 'all', notes: ['partial journal: see .metrics/mutate/report.md for coverage'], items }));
  console.log(text);
}

export async function main(argv: string[]): Promise<number> {
  const flags = parseFlags(argv);
  const opts = parseGateArgs(argv.filter((a) => a !== 'mutate'));

  if (flags.scan) {
    scan(flags, opts.base);
  } else if (flags.report) {
    report(flags, opts.head, opts.base);
  } else {
    await runMutants(flags, opts.head, opts.base);
  }

  return 0;
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).then((c) => process.exit(c));
}
