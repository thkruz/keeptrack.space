/**
 * One result shape for every gate (code gates, mutation, UI checks).
 * Rule: a failing item that is changed -> 'fail'; unchanged -> 'warn'.
 * Exit code is non-zero only when a changed item fails.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './functions';

export type Status = 'fail' | 'warn' | 'pass';

export interface GateItem {
  /** Stable id, e.g. file:name or file:line. */
  id: string;
  file: string;
  line: number;
  endLine?: number;
  name?: string;
  /** Primary metric (CRAP score, similarity, ...). */
  value?: number;
  /** Does the item overlap the diff against the base? */
  changed: boolean;
  status: Status;
  message: string;
  /** True when the rule behind the finding is not yet confirmed (always warns). */
  unconfirmed?: boolean;
  /** Gate specific extra fields. */
  detail?: Record<string, unknown>;
}

export interface GateSummary {
  total: number;
  fail: number;
  warn: number;
  pass: number;
  changedFail: number;
  changedItems: number;
}

export interface GateResult {
  gate: string;
  generatedAt: string;
  head: string;
  base: string;
  mode: 'all' | 'changed';
  threshold?: number | string;
  summary: GateSummary;
  /** Notes on coverage sources, limitations, unconfirmed rules. */
  notes: string[];
  items: GateItem[];
}

/** Status for a failing check: changed code fails, untouched code warns. */
export function failStatus(changed: boolean, unconfirmed = false): Status {
  return changed && !unconfirmed ? 'fail' : 'warn';
}

export function summarize(items: GateItem[]): GateSummary {
  return {
    total: items.length,
    fail: items.filter((i) => i.status === 'fail').length,
    warn: items.filter((i) => i.status === 'warn').length,
    pass: items.filter((i) => i.status === 'pass').length,
    changedFail: items.filter((i) => i.changed && i.status === 'fail').length,
    changedItems: items.filter((i) => i.changed).length,
  };
}

export function buildResult(p: {
  gate: string; head: string; base: string; mode: 'all' | 'changed'; threshold?: number | string; notes?: string[]; items: GateItem[];
}): GateResult {
  return {
    gate: p.gate,
    generatedAt: new Date().toISOString(),
    head: p.head,
    base: p.base,
    mode: p.mode,
    threshold: p.threshold,
    summary: summarize(p.items),
    notes: p.notes ?? [],
    items: p.items,
  };
}

/** Exit code: 0 for --all baselines; otherwise 1 when any changed item fails. */
export function exitCode(r: GateResult): number {
  return r.mode === 'all' ? 0 : r.summary.changedFail > 0 ? 1 : 0;
}

export function writeResult(r: GateResult, dir = path.join(REPO_ROOT, '.metrics')): string {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${r.gate}.json`);

  writeFileSync(file, `${JSON.stringify(r, null, 2)}\n`);

  return file;
}

/** Worst-first ordering: value descending. */
export function worst(items: GateItem[], n = 20, filter: (i: GateItem) => boolean = (i) => i.status !== 'pass'): GateItem[] {
  return items.filter(filter).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, n);
}

export function formatTable(r: GateResult, n = 20): string {
  const s = r.summary;
  const lines = [
    `${r.gate}: ${s.total} items, ${s.fail} fail, ${s.warn} warn, ${s.pass} pass (${s.changedItems} changed, ${s.changedFail} changed failing) [${r.mode}, base ${r.base.slice(0, 9)}]`,
    ...r.notes.map((x) => `  note: ${x}`),
  ];

  for (const i of worst(r.items, n)) {
    const v = i.value === undefined ? '' : ` ${Number.isInteger(i.value) ? i.value : i.value.toFixed(2)}`;

    lines.push(`  ${i.status.toUpperCase().padEnd(4)}${i.changed ? ' *' : '  '}${v.padStart(8)}  ${i.file}:${i.line}  ${i.name ?? ''}  ${i.message}`.trimEnd());
  }
  if (s.fail + s.warn > n) {
    lines.push(`  ... ${s.fail + s.warn - n} more in .metrics/${r.gate}.json`);
  }

  return lines.join('\n');
}
