/** LCOV reader. Unit coverage, or merged unit + e2e from scripts/merge-coverage.ts. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, toPosix } from './functions';

export interface FileCoverage {
  /** line -> hits */
  lines: Map<number, number>;
  /** BRDA records */
  branches: { line: number; taken: number }[];
}
export type CoverageMap = Map<string, FileCoverage>;

export function normalizeCoveragePath(sf: string, root = REPO_ROOT): string {
  const abs = path.isAbsolute(sf) ? sf : path.join(root, sf);

  return toPosix(path.relative(root, abs));
}

export function parseLcov(text: string, root = REPO_ROOT): CoverageMap {
  const map: CoverageMap = new Map();
  let cur: FileCoverage | null = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();

    if (line.startsWith('SF:')) {
      const key = normalizeCoveragePath(line.slice(3), root);

      cur = map.get(key) ?? { lines: new Map(), branches: [] };
      map.set(key, cur);
    } else if (!cur) {
      continue;
    } else if (line.startsWith('DA:')) {
      const [l, h] = line.slice(3).split(',');
      const n = Number(l);

      cur.lines.set(n, (cur.lines.get(n) ?? 0) + Number(h));
    } else if (line.startsWith('BRDA:')) {
      const [l, , , t] = line.slice(5).split(',');

      cur.branches.push({ line: Number(l), taken: t === '-' ? 0 : Number(t) });
    } else if (line === 'end_of_record') {
      cur = null;
    }
  }

  return map;
}

/** Merge several maps (summing hits), e.g. unit + e2e. */
export function mergeCoverage(...maps: CoverageMap[]): CoverageMap {
  const out: CoverageMap = new Map();

  for (const m of maps) {
    for (const [file, c] of m) {
      const t = out.get(file) ?? { lines: new Map(), branches: [] };

      for (const [l, h] of c.lines) {
        t.lines.set(l, (t.lines.get(l) ?? 0) + h);
      }
      t.branches.push(...c.branches);
      out.set(file, t);
    }
  }

  return out;
}

/** Load LCOV files that exist; returns null when none are found. */
export function loadCoverage(paths: string[] = ['coverage/lcov.info', 'coverage-e2e/lcov.info'], root = REPO_ROOT): { map: CoverageMap; used: string[] } | null {
  const used: string[] = [];
  const maps: CoverageMap[] = [];

  for (const p of paths) {
    const abs = path.join(root, p);

    if (existsSync(abs)) {
      maps.push(parseLcov(readFileSync(abs, 'utf-8'), root));
      used.push(p);
    }
  }

  return used.length ? { map: mergeCoverage(...maps), used } : null;
}

/**
 * Coverage fraction (0..1) of a function range. Uses branch records when the
 * range has any, else line hits. A file or range the report does not mention scores 0.
 */
export function functionCoverage(cov: CoverageMap, file: string, start: number, end: number): number {
  const fc = cov.get(file);

  if (!fc) {
    return 0;
  }
  const br = fc.branches.filter((b) => b.line >= start && b.line <= end);

  if (br.length > 0) {
    return br.filter((b) => b.taken > 0).length / br.length;
  }
  let total = 0;
  let hit = 0;

  for (const [l, h] of fc.lines) {
    if (l >= start && l <= end) {
      total++;
      if (h > 0) {
        hit++;
      }
    }
  }

  return total === 0 ? 0 : hit / total;
}

/** CRAP = CC^2 * (1 - cov)^3 + CC. */
export function crapScore(cc: number, cov: number): number {
  return cc * cc * Math.pow(1 - cov, 3) + cc;
}
