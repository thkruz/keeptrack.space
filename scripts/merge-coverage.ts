/**
 * Merge the unit (vitest) and E2E (monocart) lcov reports into one combined total.
 *
 * Unit coverage:  coverage/lcov.info          (vitest v8 -> lcov)
 * E2E coverage:   coverage-e2e/lcov.info      (monocart lcovonly)
 * Output:         coverage-combined/lcov.info + a printed summary
 *
 * A line/function/branch is counted covered in the combined report when EITHER suite
 * exercised it, so this reflects everything our tests touch. File paths are normalized to
 * repo-relative `src/...` so the two tools' records line up.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface FileCov {
  fnName: Map<string, number>;   // function name -> definition line
  fnHits: Map<string, number>;   // function name -> hit count (summed)
  lines: Map<number, number>;    // line number -> hit count (summed)
  branches: Map<string, number>; // "block,branch,path" -> taken count (summed)
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const normalizePath = (raw: string): string => {
  const p = raw.replace(/\\/gu, '/');
  const m = (/(?:^|.*?\/)(src\/.*)$/u).exec(p);

  return m ? m[1] : p.replace(`${ROOT.replace(/\\/gu, '/')}/`, '');
};

// Combined report is a first-party source-code metric: keep only src/ TypeScript,
// dropping asset imports (mp3/png/json/css), generated locales, specs and ootk vendor.
const keepFile = (file: string): boolean =>
  file.startsWith('src/') &&
  /\.tsx?$/u.test(file) &&
  !/\.(?:spec|test)\.tsx?$/u.test(file) &&
  !file.includes('/__tests__/') &&
  !file.startsWith('src/engine/ootk/') &&
  !file.startsWith('src/locales/');

const emptyFile = (): FileCov => ({
  fnName: new Map(), fnHits: new Map(), lines: new Map(), branches: new Map(),
});

const handleFN = (cur: FileCov, rest: string): void => {
  const [lineNo, ...nameParts] = rest.split(',');
  const name = nameParts.join(',');

  cur.fnName.set(name, Number(lineNo));
  if (!cur.fnHits.has(name)) {
    cur.fnHits.set(name, 0);
  }
};

const handleFNDA = (cur: FileCov, rest: string): void => {
  const [hits, ...nameParts] = rest.split(',');
  const name = nameParts.join(',');

  cur.fnHits.set(name, (cur.fnHits.get(name) ?? 0) + Number(hits));
};

const handleDA = (cur: FileCov, rest: string): void => {
  const [lineNo, hits] = rest.split(',');

  cur.lines.set(Number(lineNo), (cur.lines.get(Number(lineNo)) ?? 0) + Number(hits));
};

const handleBRDA = (cur: FileCov, rest: string): void => {
  const [lineNo, block, branch, taken] = rest.split(',');
  const key = `${lineNo},${block},${branch}`;
  const add = taken === '-' ? 0 : Number(taken);

  cur.branches.set(key, (cur.branches.get(key) ?? 0) + add);
};

// Apply a non-SF data line to the current file record. Returns nothing; mutates `cur`.
const handleDataLine = (cur: FileCov, line: string): void => {
  if (line.startsWith('FN:')) {
    handleFN(cur, line.slice(3));
  } else if (line.startsWith('FNDA:')) {
    handleFNDA(cur, line.slice(5));
  } else if (line.startsWith('DA:')) {
    handleDA(cur, line.slice(3));
  } else if (line.startsWith('BRDA:')) {
    handleBRDA(cur, line.slice(5));
  }
};

const parseLcov = (text: string, into: Map<string, FileCov>): void => {
  let cur: FileCov | null = null;

  for (const line of text.split(/\r?\n/u)) {
    if (line.startsWith('SF:')) {
      const key = normalizePath(line.slice(3));

      if (!keepFile(key)) {
        cur = null;
        continue;
      }
      cur = into.get(key) ?? emptyFile();
      into.set(key, cur);
    } else if (cur !== null) {
      handleDataLine(cur, line);
    }
  }
};

const merged = new Map<string, FileCov>();
const sources: { label: string; path: string }[] = [
  { label: 'unit', path: resolve(ROOT, 'coverage/lcov.info') },
  { label: 'e2e', path: resolve(ROOT, 'coverage-e2e/lcov.info') },
];

const present: string[] = [];

for (const s of sources) {
  if (existsSync(s.path)) {
    parseLcov(readFileSync(s.path, 'utf8'), merged);
    present.push(s.label);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`! ${s.label} lcov not found at ${s.path} — skipping`);
  }
}

if (present.length === 0) {
  // eslint-disable-next-line no-console
  console.error('No lcov inputs found. Run unit + E2E coverage first.');
  process.exit(1);
}

// Emit combined lcov and tally totals.
const out: string[] = [];
const tot = { lf: 0, lh: 0, fnf: 0, fnh: 0, brf: 0, brh: 0 };

for (const [file, cov] of [...merged.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  out.push('TN:');
  out.push(`SF:${file}`);
  for (const [name, ln] of cov.fnName) {
    out.push(`FN:${ln},${name}`);
  }
  let fnh = 0;

  for (const [name, hits] of cov.fnHits) {
    out.push(`FNDA:${hits},${name}`);
    if (hits > 0) {
      fnh++;
    }
  }
  out.push(`FNF:${cov.fnHits.size}`);
  out.push(`FNH:${fnh}`);

  let brh = 0;

  for (const [key, taken] of cov.branches) {
    out.push(`BRDA:${key},${taken > 0 ? taken : '-'}`);
    if (taken > 0) {
      brh++;
    }
  }
  out.push(`BRF:${cov.branches.size}`);
  out.push(`BRH:${brh}`);

  let lh = 0;

  for (const [ln, hits] of [...cov.lines.entries()].sort((a, b) => a[0] - b[0])) {
    out.push(`DA:${ln},${hits}`);
    if (hits > 0) {
      lh++;
    }
  }
  out.push(`LF:${cov.lines.size}`);
  out.push(`LH:${lh}`);
  out.push('end_of_record');

  tot.lf += cov.lines.size;
  tot.lh += lh;
  tot.fnf += cov.fnHits.size;
  tot.fnh += fnh;
  tot.brf += cov.branches.size;
  tot.brh += brh;
}

const outDir = resolve(ROOT, 'coverage-combined');

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'lcov.info'), `${out.join('\n')}\n`);

const pct = (h: number, f: number): string => (f === 0 ? 'n/a' : `${((h / f) * 100).toFixed(2)}%`);

// eslint-disable-next-line no-console
console.log(`\nCombined coverage (${present.join(' + ')}) over ${merged.size} files:`);
// eslint-disable-next-line no-console
console.log(`  lines     ${pct(tot.lh, tot.lf)}  (${tot.lh}/${tot.lf})`);
// eslint-disable-next-line no-console
console.log(`  functions ${pct(tot.fnh, tot.fnf)}  (${tot.fnh}/${tot.fnf})`);
// eslint-disable-next-line no-console
console.log(`  branches  ${pct(tot.brh, tot.brf)}  (${tot.brh}/${tot.brf})`);
// eslint-disable-next-line no-console
console.log(`  -> coverage-combined/lcov.info`);
