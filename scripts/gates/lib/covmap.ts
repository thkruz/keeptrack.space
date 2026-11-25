/**
 * Coverage-based test selection for the mutation runner.
 *
 * Build (`mutate --build-covmap`): every test file is run alone once with v8 coverage (lcov per run). For each
 * source file the lines a test executes are kept as line ranges. Per-test runs are used because vitest only reports
 * coverage merged over the whole run; a single-process hook would need v8 offset-to-source remapping we do not have.
 * The per-test results are appended to covmap.partial.jsonl (resumable: a full build is longer than one 10 minute
 * foreground call) and packed into covmap.json by `packCovmap`.
 *
 * Packed form: per source file, segments [startLine, endLine, [testIndex...]] where every line in the segment is executed
 * by exactly that set of tests, plus the sha1 of the source text the map was built from (a changed file is stale).
 * `select(file, lo, hi)` returns the tests that execute any line in lo..hi.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './functions';

export interface PartialRecord {
  test: string;
  ok: boolean;
  /** Time vitest reports for the file's tests (startup excluded). */
  ms: number;
  wallMs: number;
  /** source file -> "10-15,20,30-31" */
  cov: Record<string, string>;
}

export interface PackedCovMap {
  version: 1;
  head: string;
  builtAt: string;
  buildSeconds: number;
  tests: string[];
  testInfo: Record<string, { ms: number; ok: boolean }>;
  files: Record<string, { hash: string; seg: [number, number, number[]][] }>;
}

export function hashText(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

export function encodeLines(lines: number[]): string {
  const sorted = [...new Set(lines)].sort((a, b) => a - b);
  const parts: string[] = [];

  for (let i = 0; i < sorted.length;) {
    let j = i;

    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) {
      j++;
    }
    parts.push(j === i ? String(sorted[i]) : `${sorted[i]}-${sorted[j]}`);
    i = j + 1;
  }

  return parts.join(',');
}

export function decodeRanges(s: string): [number, number][] {
  return s.split(',').filter(Boolean).map((p) => {
    const [a, b] = p.split('-').map(Number);

    return [a, b ?? a];
  });
}

/** Sweep per-test ranges of one source file into segments with identical test sets. */
export function segmentsOf(perTest: Map<number, [number, number][]>): [number, number, number[]][] {
  const events: [number, number, number][] = []; // [line, +1 start / -1 end(after), test]

  for (const [t, ranges] of perTest) {
    for (const [s, e] of ranges) {
      events.push([s, 1, t], [e + 1, -1, t]);
    }
  }
  events.sort((a, b) => a[0] - b[0]);
  const active = new Map<number, number>();
  const out: [number, number, number[]][] = [];
  let i = 0;

  while (i < events.length) {
    const line = events[i][0];

    while (i < events.length && events[i][0] === line) {
      const [, d, t] = events[i++];
      const n = (active.get(t) ?? 0) + d;

      if (n <= 0) {
        active.delete(t);
      } else {
        active.set(t, n);
      }
    }
    if (active.size && i < events.length) {
      const set = [...active.keys()].sort((a, b) => a - b);
      const end = events[i][0] - 1;
      const prev = out[out.length - 1];

      if (prev && prev[1] === line - 1 && prev[2].length === set.length && prev[2].every((v, k) => v === set[k])) {
        prev[1] = end;
      } else {
        out.push([line, end, set]);
      }
    }
  }

  return out;
}

export function packCovmap(partialFile: string, outFile: string, head: string, buildSeconds: number, read = (f: string) => readFileSync(path.join(REPO_ROOT, f), 'utf-8')): PackedCovMap {
  const byTest = new Map<string, PartialRecord>();

  for (const line of readFileSync(partialFile, 'utf-8').split('\n')) {
    if (!line.trim()) {
      continue;
    }
    try {
      const r = JSON.parse(line) as PartialRecord;

      byTest.set(r.test, r);
    } catch { /* torn line */ }
  }
  const tests = [...byTest.keys()].sort();
  const testInfo: PackedCovMap['testInfo'] = {};
  const perFile = new Map<string, Map<number, [number, number][]>>();

  tests.forEach((t, idx) => {
    const r = byTest.get(t)!;

    testInfo[t] = { ms: r.ms, ok: r.ok };
    if (!r.ok) {
      return;
    }
    for (const [f, enc] of Object.entries(r.cov)) {
      const m = perFile.get(f) ?? new Map();

      m.set(idx, decodeRanges(enc));
      perFile.set(f, m);
    }
  });
  const files: PackedCovMap['files'] = {};

  for (const [f, m] of perFile) {
    let text: string;

    try {
      text = read(f);
    } catch {
      continue;
    }
    files[f] = { hash: hashText(text), seg: segmentsOf(m) };
  }
  const packed: PackedCovMap = { version: 1, head, builtAt: new Date().toISOString(), buildSeconds, tests, testInfo, files };

  writeFileSync(outFile, JSON.stringify(packed));

  return packed;
}

export type Selection =
  | { selector: 'coverage'; tests: string[] }
  | { selector: 'import-graph'; reason: 'no-map' | 'file-not-in-map' | 'stale' | 'no-covering-test' };

export class CovMap {
  private hashes = new Map<string, string | null>();

  constructor(readonly data: PackedCovMap, private readText: (f: string) => string = (f) => readFileSync(path.join(REPO_ROOT, f), 'utf-8')) {}

  static load(file: string): CovMap | null {
    if (!existsSync(file)) {
      return null;
    }
    try {
      const d = JSON.parse(readFileSync(file, 'utf-8')) as PackedCovMap;

      return d.version === 1 ? new CovMap(d) : null;
    } catch {
      return null;
    }
  }

  private currentHash(f: string): string | null {
    if (!this.hashes.has(f)) {
      try {
        this.hashes.set(f, hashText(this.readText(f)));
      } catch {
        this.hashes.set(f, null);
      }
    }

    return this.hashes.get(f) ?? null;
  }

  /** Tests that execute any line in lo..hi of `file`, unordered. */
  select(file: string, lo: number, hi: number): Selection {
    const fe = this.data.files[file];

    if (!fe) {
      return { selector: 'import-graph', reason: 'file-not-in-map' };
    }
    if (fe.hash !== this.currentHash(file)) {
      return { selector: 'import-graph', reason: 'stale' };
    }
    const set = new Set<number>();

    for (const [s, e, ts] of fe.seg) {
      if (s > hi) {
        break;
      }
      if (e >= lo) {
        ts.forEach((t) => set.add(t));
      }
    }
    const tests = [...set].map((i) => this.data.tests[i]).filter((t) => existsSync(path.join(REPO_ROOT, t)));

    return tests.length ? { selector: 'coverage', tests } : { selector: 'import-graph', reason: 'no-covering-test' };
  }

  ms(test: string): number {
    return this.data.testInfo[test]?.ms ?? Number.MAX_SAFE_INTEGER;
  }
}

/** Order: most past kills for this source file first, then shortest baseline duration, then name. */
export function orderTests(tests: string[], kills: Map<string, number> | undefined, ms: (t: string) => number): string[] {
  return [...tests].sort((a, b) => (kills?.get(b) ?? 0) - (kills?.get(a) ?? 0) || ms(a) - ms(b) || a.localeCompare(b));
}

/** Timeout for a test list: max(30 s, 3x clean baseline + 10 s). */
export function timeoutFor(baselineMs: number): number {
  return Math.max(30_000, 3 * baselineMs + 10_000);
}

/** Test file that failed, from vitest's dot-reporter output ("FAIL  path/to.test.ts > name"). */
export function failingTestFile(out: string): string | null {
  const m = /FAIL\s+(?:\|[^|]*\|\s+)?(\S+?\.test\.[mc]?[jt]sx?)/.exec(out);

  return m ? m[1].replace(/\\/g, '/') : null;
}
