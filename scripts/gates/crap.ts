/**
 * Gate 1: CRAP per function. CRAP = CC^2 * (1 - cov)^3 + CC. Fails (changed) / warns (unchanged) at >= 10.
 * Approach from unclebob/crapper, reimplemented in TS.
 */
import { changedLines, isChangedRange } from './lib/changed';
import { finish, isMain, parseGateArgs, type GateOptions } from './lib/cli';
import { crapScore, functionCoverage, loadCoverage } from './lib/coverage';
import { enumerateFunctions, listSourceFiles } from './lib/functions';
import { buildResult, failStatus, type GateItem, type GateResult } from './lib/report';

export const CRAP_THRESHOLD = 10;

export function runCrap(opts: GateOptions): GateResult {
  const threshold = opts.flags.threshold ? Number(opts.flags.threshold) : CRAP_THRESHOLD;
  const changed = changedLines(opts.base);
  const files = listSourceFiles();
  const fns = enumerateFunctions(files);
  const cov = loadCoverage();
  const notes: string[] = [];

  if (cov) {
    notes.push(`coverage sources: ${cov.used.join(', ')}`);
    if (!cov.used.some((u) => u.includes('e2e'))) {
      notes.push('coverage-e2e/lcov.info absent: WebGL/render code is scored on unit coverage only and may read as 0%');
    }
  } else {
    notes.push('no LCOV found (coverage/lcov.info): every function scored at 0% coverage; run vitest --coverage first');
  }
  notes.push('failure means: add tests first; split only when complexity is the cause');

  const items: GateItem[] = [];

  for (const f of fns) {
    const isChanged = isChangedRange(changed, f.file, f.startLine, f.endLine);

    if (!opts.all && !isChanged) {
      continue;
    }
    const c = cov ? functionCoverage(cov.map, f.file, f.startLine, f.endLine) : 0;
    const score = crapScore(f.cc, c);
    const failing = score >= threshold;

    items.push({
      id: `${f.file}:${f.name}`,
      file: f.file,
      line: f.startLine,
      endLine: f.endLine,
      name: f.name,
      value: Math.round(score * 100) / 100,
      changed: isChanged,
      status: failing ? failStatus(isChanged) : 'pass',
      message: failing ? `CRAP ${score.toFixed(1)} (CC ${f.cc}, cov ${(c * 100).toFixed(0)}%): add tests first; split only when complexity is the cause` : `CC ${f.cc}, cov ${(c * 100).toFixed(0)}%`,
      detail: { cc: f.cc, coverage: c, bodyHash: f.bodyHash },
    });
  }

  return buildResult({ gate: 'crap', head: opts.head, base: opts.base, mode: opts.all ? 'all' : 'changed', threshold, notes, items });
}

if (isMain(import.meta.url)) {
  process.exit(finish(runCrap(parseGateArgs(process.argv.slice(2)))));
}
