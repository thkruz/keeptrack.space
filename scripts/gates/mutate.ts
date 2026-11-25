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
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { changedLines } from './lib/changed';
import { isMain, parseGateArgs } from './lib/cli';
import { loadCoverage, parseLcov, type CoverageMap } from './lib/coverage';
import { CovMap, encodeLines, failingTestFile, orderTests, packCovmap, timeoutFor, type PartialRecord } from './lib/covmap';
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
const COVMAP = process.env.KT_MUTATE_COVMAP ?? path.join(REPO_ROOT, '.metrics', 'mutate', 'covmap.json');
const TEST_FILE = /\.(test|spec)\.[mc]?[jt]sx?$|(^|\/)(__tests__|test)\//;
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

interface RunOutcome { code: number | null; timedOut: boolean; out: string; ms: number }

interface RunOpts { forks: number; isolate: boolean }

/** Run an explicit test list (written to testsFile) against the overlay copy of one module. */
function runVitest(tests: string[], testsFile: string, target: string, overlay: string, timeoutMs: number, o: RunOpts): Promise<RunOutcome> {
  return new Promise((resolve) => {
    writeFileSync(testsFile, JSON.stringify(tests));
    const args = ['node_modules/vitest/vitest.mjs', 'run', '--config', CONFIG, '--bail=1', '--reporter=dot', '--coverage.enabled=false'];
    const s = Date.now();
    const child = spawn(process.execPath, args, {
      cwd: REPO_ROOT, windowsHide: true,
      env: {
        ...process.env, KT_MUTATE_TARGET: target, KT_MUTATE_OVERLAY: overlay, KT_MUTATE_TESTS: testsFile,
        KT_MUTATE_FORKS: String(o.forks), KT_MUTATE_ISOLATE: o.isolate ? '1' : '0', NO_COLOR: '1',
      },
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
      resolve({ code, timedOut, out, ms: Date.now() - s });
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ code: -1, timedOut: false, out: String(e), ms: Date.now() - s });
    });
  });
}

/** One run of a stage's test list. Isolated stages run as is; non-isolated stages confirm every failure isolated. */
interface Stage { tests: string[]; isolate: boolean; forks: number }
interface StageOutcome { r: RunOutcome; killedBy?: string; leak?: boolean }

const failedBy = (r: RunOutcome): string | undefined => (r.code !== 0 && !r.timedOut ? failingTestFile(r.out) ?? undefined : undefined);

async function runStage(st: Stage, tf: string, abs: string, ov: string, limitMs: number, isolatedForks: number): Promise<StageOutcome> {
  const r = await runVitest(st.tests, tf, abs, ov, limitMs, st);

  if (st.isolate || r.code === 0 || r.timedOut || r.code === -1) {
    return { r, killedBy: failedBy(r) };
  }
  const iso: RunOpts = { forks: isolatedForks, isolate: true };
  const bad = failingTestFile(r.out);

  if (!bad || !st.tests.includes(bad)) {
    const full = await runVitest(st.tests, tf, abs, ov, limitMs, iso);

    return { r: full, killedBy: failedBy(full), leak: full.code === 0 };
  }
  const one = await runVitest([bad], tf, abs, ov, limitMs, iso);

  if (one.code !== 0) {
    return { r: one, killedBy: one.timedOut ? undefined : bad };
  }
  const rest = st.tests.filter((t) => t !== bad);

  if (!rest.length) {
    return { r: one, leak: true };
  }
  const more = await runVitest(rest, tf, abs, ov, limitMs, iso);

  return { r: more, killedBy: failedBy(more), leak: true };
}

async function runMutants(flags: Flags, head: string, base: string): Promise<void> {
  const kinds = kindsOf(flags);
  const workers = Number(flags.workers ?? 6);
  const forks = Number(flags.forks ?? 2);
  const floorMs = Number(flags['timeout-floor-s'] ?? 30) * 1000;
  const baselineLimitMs = Number(flags['baseline-timeout-s'] ?? 300) * 1000;
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
  let everything = kinds.flatMap((k) => collect(files, [k], covRes.map));

  if (typeof flags.ids === 'string') {
    const want = new Set(JSON.parse(readFileSync(flags.ids, 'utf-8')) as string[]); // explicit mutant ids (proof samples)

    everything = everything.filter((m) => want.has(m.id));
  }
  const queue = flags['mutate-all'] ? everything : everything.filter((m) => !isDone(journal, m));
  const todo = queue.slice(0, limit);

  console.log(`mutants total ${everything.length}, already journaled ${everything.length - queue.length}, to run ${todo.length}, workers ${workers}`);

  let next = 0;
  let done = 0;
  let survivors = 0;
  let stopping = false;
  const t0 = Date.now();
  const baselines = new Map<string, Promise<{ ok: boolean; ms: number }>>();
  const maxTests = Number(flags['max-tests'] ?? 40);
  const maxCovTests = Number(flags['max-cov-tests'] ?? 100);
  const tm0 = Date.now();
  const testMap = buildTestMap(listTestFiles());
  const covmap = flags['no-covmap'] ? null : CovMap.load(COVMAP);

  console.log(`test map: ${testMap.size} source files have tests (${((Date.now() - tm0) / 1000).toFixed(0)}s); coverage map: ${covmap ? `${Object.keys(covmap.data.files).length} source files, built at ${covmap.data.head.slice(0, 9)}` : 'none (import-graph selection only)'}`);
  // Past kills per source file (journal field killedBy), used to order each mutant's tests.
  const kills = new Map<string, Map<string, number>>();
  const countKill = (file: string, test: string) => {
    const m = kills.get(file) ?? new Map<string, number>();

    m.set(test, (m.get(test) ?? 0) + 1);
    kills.set(file, m);
  };

  for (const e of journal.values()) {
    if (e.killedBy && e.result === 'killed') {
      countKill(e.file, e.killedBy);
    }
  }
  /** Import-graph stages: 1 = tests importing the file directly (isolated, fast kills); 2 = the nearest transitive rest, capped, not isolated. */
  const graphStages = (file: string): Stage[] => {
    const refs: TestRef[] = testMap.get(file) ?? [];
    const direct = refs.filter((r) => r.depth <= 1).map((r) => r.test);
    const s1 = direct.length ? direct.slice(0, maxTests) : refs.slice(0, 5).map((r) => r.test);
    const s2 = refs.map((r) => r.test).filter((t) => !s1.includes(t)).slice(0, Math.max(0, maxTests - s1.length));

    return [{ tests: s1, isolate: true, forks }, { tests: s2, isolate: false, forks: 1 }].filter((x) => x.tests.length);
  };
  /** Coverage selection: the tests that execute the mutated range, one non-isolated single-fork stage, kill-first order. No file cap. */
  const select = (m: Mutant): { selector: 'coverage' | 'import-graph'; reason?: string; capped?: boolean; stages: Stage[] } => {
    let reason = 'no-map';

    if (covmap) {
      const lo = m.kind === 'empty' && m.line < m.fnEnd ? m.line + 1 : m.line;
      const hi = m.kind === 'empty' ? m.fnEnd : m.line;
      const s = covmap.select(m.file, lo, hi);

      if (s.selector === 'coverage') {
        let tests = s.tests;
        const capped = maxCovTests > 0 && tests.length > maxCovTests;

        if (capped) {
          // Hot code is executed by hundreds of tests (a survivor then runs them all, minutes per mutant). Keep the likeliest killers:
          // past kills, then the test named after the source file, then nearest importers, then fastest. Journal marks the entry `capped`.
          const depth = new Map((testMap.get(m.file) ?? []).map((r) => [r.test, r.depth]));

          const stem = path.basename(m.file).replace(/\.[jt]sx?$/, '');
          const named = (t: string) => (path.basename(t).startsWith(`${stem}.`) ? 0 : 1);

          tests = [...tests].sort((a, b) => (kills.get(m.file)?.get(b) ?? 0) - (kills.get(m.file)?.get(a) ?? 0) || named(a) - named(b)
            || (depth.get(a) ?? 99) - (depth.get(b) ?? 99) || covmap.ms(a) - covmap.ms(b) || a.localeCompare(b)).slice(0, maxCovTests);
        }

        return { selector: 'coverage', capped, stages: [{ tests: orderTests(tests, kills.get(m.file), (t) => covmap.ms(t)), isolate: false, forks: 1 }] };
      }
      reason = s.reason;
    }

    return { selector: 'import-graph', reason, stages: graphStages(m.file) };
  };
  /** Clean run of a stage's test list: pass/fail and duration (sets the mutant timeout). Same-list calls share one run. */
  const baselineFor = (st: Stage, file: string, w: number): Promise<{ ok: boolean; ms: number }> => {
    const key = `${st.isolate ? 'i' : 'n'}:${[...st.tests].sort().join(',')}`;
    let p = baselines.get(key);

    if (!p) {
      const dir = path.join(DIR, 'overlay', `w${w}`, 'baseline');
      const ov = path.join(dir, 'baseline.txt');

      mkdirSync(dir, { recursive: true });
      writeFileSync(ov, readFileSync(path.join(REPO_ROOT, file), 'utf-8'));
      p = (async () => {
        const o = await runStage(st, path.join(dir, 'tests.json'), path.join(REPO_ROOT, file), ov, baselineLimitMs, forks);

        return { ok: o.r.code === 0 && !o.r.timedOut, ms: o.r.ms };
      })();
      baselines.set(key, p);
    }

    return p;
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

  // Serial warm-up: a cold module cache plus concurrent workers produced baseline errors (suspected concurrent cache writes),
  // so fill the cache with clean runs of the first few distinct files' first mutants' test lists before the workers start.
  {
    const seen = new Set<string>();
    const tw = Date.now();

    for (const m of todo) {
      if (seen.size >= 4 && !seen.has(m.file)) {
        break;
      }
      if (seen.has(m.file)) {
        continue;
      }
      seen.add(m.file);
      for (const st of select(m).stages) {
        await baselineFor(st, m.file, 0);
      }
    }
    console.log(`cache warm-up: ${seen.size} files serially in ${((Date.now() - tw) / 1000).toFixed(0)}s`);
  }

  interface Finished { r: RunOutcome; killedBy?: string; leak: boolean; baselineOk: boolean; limitMs: number; baselineMs: number; mode: string; nTests: number; selector: string; reason?: string; capped?: boolean }
  const execute = async (m: Mutant, abs: string, ov: string, tf: string, w: number): Promise<Finished> => {
    const sel = select(m);
    let last: StageOutcome = { r: { code: 0, timedOut: false, out: 'No test files found', ms: 0 } };
    let leak = false;
    let used: Stage | null = null;
    let base = { ok: true, ms: 0 };
    let limitMs = floorMs;

    for (const st of sel.stages) {
      used = st;
      base = await baselineFor(st, m.file, w);
      if (!base.ok) {
        last = { r: { code: -1, timedOut: false, out: 'baseline failed or timed out', ms: 0 } };
        break;
      }
      limitMs = Math.max(floorMs, timeoutFor(base.ms));
      last = await runStage(st, tf, abs, ov, limitMs, forks);
      leak ||= !!last.leak;
      if (last.r.code !== 0 || last.r.timedOut) {
        break;
      }
    }

    return {
      r: last.r, killedBy: last.killedBy, leak, baselineOk: base.ok, limitMs, baselineMs: base.ms,
      mode: used ? (used.isolate ? 'isolated' : 'no-isolate') : 'none', nTests: sel.stages.reduce((n, s) => n + s.tests.length, 0), selector: sel.selector, reason: sel.reason, capped: sel.capped,
    };
  };
  const journalIt = (m: Mutant, f: Finished, started: number, retried: boolean) => {
    const { r } = f;
    let result: MutantResult = r.timedOut ? 'timeout' : r.code === 0 ? 'survived' : r.code === -1 ? 'error' : 'killed';

    if (result === 'survived' && /No test files found|no tests/i.test(r.out)) {
      result = 'uncovered';
    }
    const e: JournalEntry = {
      id: m.id, kind: m.kind, file: m.file, fn: m.fn, line: m.line, col: m.col, original: m.original, replacement: m.replacement,
      result, durationMs: Date.now() - started, bodyHash: m.bodyHash, head, ts: new Date().toISOString(),
      selector: f.selector as 'coverage' | 'import-graph', ...(f.reason ? { selectorReason: f.reason } : {}), tests: f.nTests, mode: f.mode,
      baselineMs: f.baselineMs, limitMs: f.limitMs, ...(f.killedBy && result === 'killed' ? { killedBy: f.killedBy } : {}),
      ...(f.leak ? { leak: true } : {}), ...(f.capped ? { capped: true } : {}), ...(retried ? { retried: true } : {}),
    };

    appendJournal(JOURNAL, e);
    done++;
    if (result === 'survived') {
      survivors++;
    }
    if (result === 'killed' && f.killedBy) {
      countKill(m.file, f.killedBy);
    }
  };
  /** Timed-out mutants wait here and are rerun once, two at a time, after the main queue (full CPU contention is what times them out). */
  const retries: { m: Mutant; started: number }[] = [];

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
      const f = await execute(m, abs, ov, path.join(dir, 'tests.json'), w);

      if (f.r.timedOut) {
        retries.push({ m, started: s });
      } else {
        journalIt(m, f, s, false);
      }
    }
  };

  await Promise.all(Array.from({ length: workers }, (_, w) => worker(w)));
  if (retries.length) {
    console.log(`rerunning ${retries.length} timed-out mutants, 2 at a time`);
    let ri = 0;
    const retryWorker = async (w: number) => {
      const dir = path.join(DIR, 'overlay', `r${w}`);

      while (ri < retries.length) {
        const { m, started } = retries[ri++];
        const abs = path.join(REPO_ROOT, m.file);
        const ov = path.join(dir, m.file);

        mkdirSync(path.dirname(ov), { recursive: true });
        writeFileSync(ov, applyMutant(readFileSync(abs, 'utf-8'), m));
        journalIt(m, await execute(m, abs, ov, path.join(dir, 'tests.json'), 100 + w), started, true);
      }
    };

    await Promise.all([retryWorker(0), retryWorker(1)]);
  }
  clearInterval(progress);
  const mins = (Date.now() - t0) / 60_000;

  console.log(`finished: ${done} mutants in ${mins.toFixed(1)} min (${survivors} survivors)${stopping ? '; stopped early, rerun the same command to resume' : ''}`);
}

/**
 * Build the coverage map: one vitest run per test file with v8 coverage, in parallel, appended to covmap.partial.jsonl.
 * Resumable (skips tests already in the partial file); --max-minutes bounds one call; the map is packed when all tests are done.
 */
async function buildCovmap(flags: Flags, head: string): Promise<void> {
  const workers = Number(flags.workers ?? 14);
  const maxMs = flags['max-minutes'] ? Number(flags['max-minutes']) * 60_000 : Infinity;
  const partial = path.join(DIR, 'covmap.partial.jsonl');
  const tmpRoot = path.join(REPO_ROOT, '.metrics', 'mutate', 'covtmp'); // must sit inside the repo root: v8 coverage rejects a report dir outside it
  const have = new Set<string>();
  const startedFile = path.join(DIR, 'covmap.started');

  mkdirSync(DIR, { recursive: true });
  if (flags.restart) {
    rmSync(partial, { force: true });
    rmSync(startedFile, { force: true });
  }
  if (!existsSync(startedFile)) {
    writeFileSync(startedFile, JSON.stringify({ head, ts: Date.now(), spentMs: 0 }));
  }
  const meta = JSON.parse(readFileSync(startedFile, 'utf-8')) as { head: string; ts: number; spentMs: number };

  if (existsSync(partial)) {
    for (const l of readFileSync(partial, 'utf-8').split('\n')) {
      try { have.add((JSON.parse(l) as PartialRecord).test); } catch { /* blank or torn */ }
    }
  }
  const tests = listTestFiles().filter((t) => !have.has(t)).slice(0, flags.limit ? Number(flags.limit) : Infinity);
  const t0 = Date.now();
  let next = 0;
  let n = 0;

  console.log(`coverage map: ${have.size} tests already built, ${tests.length} to run, ${workers} workers`);
  const one = async (t: string, slot: number): Promise<PartialRecord> => {
    const dir = path.join(tmpRoot, String(slot));
    const tf = path.join(tmpRoot, `tests-${slot}.json`); // outside dir: coverage clean empties the report dir

    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    writeFileSync(tf, JSON.stringify([t]));
    const args = [
      'node_modules/vitest/vitest.mjs', 'run', '--config', CONFIG, '--reporter=json', `--outputFile=${path.join(dir, 'res.json')}`,
      '--coverage.enabled=true', '--coverage.reporter=lcovonly', `--coverage.reportsDirectory=${dir}`,
      '--coverage.thresholds.lines=0', '--coverage.thresholds.statements=0', '--coverage.thresholds.branches=0', '--coverage.thresholds.functions=0',
    ];
    const s = Date.now();

    await new Promise<void>((resolve) => {
      const child = spawn(process.execPath, args, { cwd: REPO_ROOT, windowsHide: true, stdio: 'ignore', env: { ...process.env, KT_MUTATE_TESTS: tf, KT_MUTATE_FORKS: '1', KT_MUTATE_ISOLATE: '1', NO_COLOR: '1' } });
      const timer = setTimeout(() => {
        if (child.pid) {
          try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { child.kill('SIGKILL'); }
        }
      }, 10 * 60_000);

      child.on('close', () => {
        clearTimeout(timer);
        resolve();
      });
      child.on('error', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    const rec: PartialRecord = { test: t, ok: false, ms: 0, wallMs: Date.now() - s, cov: {} };

    try {
      const res = JSON.parse(readFileSync(path.join(dir, 'res.json'), 'utf-8')) as { numFailedTests: number; success: boolean; testResults: { startTime: number; endTime: number; status: string }[] };

      if (flags.debug) { console.log(t, res.success, res.numFailedTests, res.testResults.map((r) => r.status)); }
      rec.ok = res.numFailedTests === 0 && res.testResults.length > 0 && res.testResults.every((r) => r.status !== 'failed');
      rec.ms = Math.round(res.testResults.reduce((a, r) => a + (r.endTime - r.startTime), 0));
      const lcov = path.join(dir, 'lcov.info');

      if (existsSync(lcov)) {
        for (const [f, fc] of parseLcov(readFileSync(lcov, 'utf-8'))) {
          if (f.startsWith('src/') && !f.includes('node_modules') && !TEST_FILE.test(f)) {
            const hit = [...fc.lines].filter(([, h]) => h > 0).map(([l]) => l);

            if (hit.length) {
              rec.cov[f] = encodeLines(hit);
            }
          }
        }
      }
    } catch (e) { if (flags.debug) { console.log(t, String(e)); } }
    rmSync(dir, { recursive: true, force: true });

    return rec;
  };

  await Promise.all(Array.from({ length: workers }, async (_, slot) => {
    while (Date.now() - t0 < maxMs) {
      const i = next++;

      if (i >= tests.length) {
        return;
      }
      const rec = await one(tests[i], slot);

      appendFileSync(partial, `${JSON.stringify(rec)}\n`);
      n++;
      if (n % 50 === 0) {
        console.log(`[${new Date().toISOString().slice(11, 19)}] ${n}/${tests.length} tests mapped`);
      }
    }
  }));
  meta.spentMs += Date.now() - t0;
  writeFileSync(startedFile, JSON.stringify(meta));
  const remaining = tests.length - n;

  if (remaining > 0) {
    console.log(`covmap incomplete: ${n} tests this call, ${remaining} left; rerun the same command to continue`);

    return;
  }
  const packed = packCovmap(partial, COVMAP, meta.head, Math.round(meta.spentMs / 1000));
  const bad = packed.tests.filter((t) => !packed.testInfo[t].ok).length;

  console.log(`covmap packed: ${packed.tests.length} tests (${bad} not passing alone, excluded), ${Object.keys(packed.files).length} source files, ${(meta.spentMs / 60_000).toFixed(1)} min of build time -> ${COVMAP}`);
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

  if (flags['build-covmap']) {
    await buildCovmap(flags, opts.head);
  } else if (flags.scan) {
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
