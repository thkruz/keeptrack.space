/** Reads .metrics/ui/*.json and writes .metrics/ui/summary.md: findings per rule per viewport/locale, worst offenders, I results. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UiFinding } from './types';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '.metrics', 'ui');

interface RunFile {
  viewport: string;
  locale: string;
  chrome: UiFinding[];
  menus: Record<string, { error?: string; findings: UiFinding[] }>;
}

const runs = fs
  .readdirSync(OUT)
  .filter((f) => /^[a-z-]+-(en|pseudo)\.json$/u.test(f))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')) as RunFile);

const all = (r: RunFile): { menu: string; f: UiFinding }[] => [...r.chrome.map((f) => ({ menu: 'chrome', f })), ...Object.entries(r.menus).flatMap(([menu, m]) => m.findings.map((f) => ({ menu, f })))];
const rules = [...new Set(runs.flatMap((r) => all(r).map((x) => x.f.rule)))].sort();
const lines: string[] = ['# UI gate baseline summary', '', `Runs: ${runs.length}. Generated ${new Date().toISOString().slice(0, 16)}Z.`, '', '## Findings per rule per run', ''];

lines.push(`| run | menus | menu errors | ${rules.join(' | ')} | total |`, `|---|---|---|${rules.map(() => '---').join('|')}|---|`);
for (const r of runs) {
  const items = all(r);
  const errs = Object.values(r.menus).filter((m) => m.error).length;

  lines.push(`| ${r.viewport}-${r.locale} | ${Object.keys(r.menus).length} | ${errs} | ${rules.map((ru) => items.filter((x) => x.f.rule === ru).length).join(' | ')} | ${items.length} |`);
}

lines.push('', '## Worst offenders (menus with most findings, any run)', '');
const perMenu = new Map<string, number>();

for (const r of runs) {
  for (const x of all(r)) {
    const k = `${x.menu} (${r.viewport}-${r.locale})`;

    perMenu.set(k, (perMenu.get(k) ?? 0) + 1);
  }
}
for (const [k, n] of [...perMenu].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  lines.push(`- ${k}: ${n}`);
}

lines.push('', '## Most repeated selectors by rule (all runs)', '');
const sel = new Map<string, number>();

for (const r of runs) {
  for (const x of all(r)) {
    const k = `${x.f.rule} ${x.f.selector.slice(0, 110)}`;

    sel.set(k, (sel.get(k) ?? 0) + 1);
  }
}
for (const [k, n] of [...sel].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  lines.push(`- ${n}x ${k}`);
}

const pseudoOnly = new Map<string, number>();
const key = (r: RunFile, x: { menu: string; f: UiFinding }): string => `${x.menu}|${x.f.rule}|${x.f.selector}`;

for (const v of [...new Set(runs.map((r) => r.viewport))]) {
  const en = runs.find((r) => r.viewport === v && r.locale === 'en');
  const ps = runs.find((r) => r.viewport === v && r.locale === 'pseudo');

  if (en && ps) {
    const base = new Set(all(en).map((x) => key(en, x)));

    pseudoOnly.set(v, all(ps).filter((x) => !base.has(key(ps, x))).length);
  }
}
lines.push('', '## F: findings that appear only with the padded pseudo-locale', '');
for (const [v, n] of pseudoOnly) {
  lines.push(`- ${v}: ${n} new findings vs English`);
}

lines.push('', '## I: detector mutation', '');
const mp = path.join(OUT, 'mutations.json');

if (fs.existsSync(mp)) {
  const m = JSON.parse(fs.readFileSync(mp, 'utf8')) as Record<string, { kind: string; applied: boolean; target: string | null; detected: boolean; rules: string[]; note?: string }[]>;

  for (const [run, res] of Object.entries(m)) {
    for (const r of res) {
      lines.push(`- ${run} ${r.kind}: ${r.detected ? 'DETECTED' : r.applied ? 'MISSED' : 'NOT APPLIED'} target=${r.target ?? '-'} rules=${r.rules.join(',') || '-'} (${r.note ?? ''})`);
    }
  }
} else {
  lines.push('not run');
}

fs.writeFileSync(path.join(OUT, 'summary.md'), `${lines.join('\n')}\n`);
