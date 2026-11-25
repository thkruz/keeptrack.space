import { collect, type Evaluator } from './collector';
import { checksAtoD } from './checks';
import type { UiFinding, UiRule } from './types';

/**
 * I. Detector mutation. Inject a CSS break into the live page, rerun A to D and require a finding on the mutated element.
 * A check that misses its injected break fails the gate.
 */
export type MutationKind = 'widen-button' | 'drop-z-index' | 'shrink-container';

export interface MutationSpec {
  kind: MutationKind;
  /** Any of these rules reporting a finding inside the mutation counts as detected. */
  expect: UiRule[];
}

export const MUTATIONS: MutationSpec[] = [
  { kind: 'widen-button', expect: ['A-offscreen', 'A-h-overflow', 'C-sibling-overlap'] },
  { kind: 'drop-z-index', expect: ['D-occluded-control'] },
  { kind: 'shrink-container', expect: ['B-clipped-text'] },
];

export interface MutationResult {
  kind: MutationKind;
  applied: boolean;
  target: string | null;
  detected: boolean;
  rules: string[];
  note?: string;
}

const STYLE_ID = 'gate-mutation-style';

/** In-page: pick a target in scope, mark it with data-gate-mut, inject the CSS. Returns the target description or null. */
const applyScript = (kind: MutationKind, scopeRoot: string | null): string => `(() => {
  const scope = ${JSON.stringify(scopeRoot)} ? document.getElementById(${JSON.stringify(scopeRoot)}) : document.body;
  if (!scope) { return null; }
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 20 && r.height > 8 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; };
  const inScroller = (el) => { let p = el.parentElement; while (p && p !== document.body) { const o = getComputedStyle(p); if (/(auto|scroll)/u.test(o.overflowX + o.overflowY)) { return true; } p = p.parentElement; } return false; };
  const style = document.createElement('style');
  style.id = ${JSON.stringify(STYLE_ID)};
  let target = null; let css = '';
  const kind = ${JSON.stringify(kind)};
  if (kind === 'widen-button') {
    const btns = Array.from(scope.querySelectorAll('button, a.btn, input[type=button], input[type=submit]')).filter(vis);
    target = btns.find((b) => !inScroller(b)) || btns[0] || null;
    css = '[data-gate-mut="widen-button"]{width:3000px!important;min-width:3000px!important;}';
  } else if (kind === 'drop-z-index') {
    const ctrls = Array.from(scope.querySelectorAll('button, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, a[href]')).filter(vis);
    for (const c of ctrls) {
      let p = c; let found = null;
      while (p && p !== document.body) { const cs = getComputedStyle(p); if (cs.position !== 'static' && cs.zIndex !== 'auto' && Number(cs.zIndex) > 0) { found = p; break; } p = p.parentElement; }
      if (found) { let o = found; let q = found.parentElement; while (q && q !== scope.parentElement && q !== document.body) { const qs = getComputedStyle(q); if (qs.position !== 'static' && qs.zIndex !== 'auto' && Number(qs.zIndex) > 0) { o = q; } q = q.parentElement; } target = o; break; }
    }
    css = '[data-gate-mut="drop-z-index"]{z-index:-9999!important;}';
  } else {
    const txt = Array.from(scope.querySelectorAll('button, label, span, a, p, h1, h2, h3, h4, h5, div')).filter((e) => vis(e) && Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 6) && e.getBoundingClientRect().width > 80);
    target = txt[0] || null;
    css = '[data-gate-mut="shrink-container"]{width:24px!important;max-width:24px!important;min-width:0!important;overflow:hidden!important;white-space:nowrap!important;text-overflow:clip!important;display:block!important;}';
  }
  if (!target) { return null; }
  target.setAttribute('data-gate-mut', kind);
  style.textContent = css;
  document.head.appendChild(style);
  return target.tagName.toLowerCase() + (target.id ? '#' + target.id : '');
})()`;

const revertScript = `(() => {
  document.getElementById(${JSON.stringify(STYLE_ID)})?.remove();
  for (const e of document.querySelectorAll('[data-gate-mut]')) { e.removeAttribute('data-gate-mut'); }
})()`;

export const runMutation = async (page: Evaluator, spec: MutationSpec, scopeRoot: string | null): Promise<MutationResult> => {
  const target = (await page.evaluate(applyScript(spec.kind, scopeRoot))) as string | null;

  if (!target) {
    return { kind: spec.kind, applied: false, target: null, detected: false, rules: [], note: 'no suitable target in scope' };
  }
  try {
    const hits = detectedFindings(checksAtoD(await collect(page, scopeRoot)), spec);

    return { kind: spec.kind, applied: true, target, detected: hits.length > 0, rules: [...new Set(hits.map((h) => h.rule))] };
  } finally {
    await page.evaluate(revertScript);
  }
};

/** Findings that sit inside the mutation and carry one of the expected rules. Pure, unit-tested. */
export const detectedFindings = (findings: UiFinding[], spec: MutationSpec): UiFinding[] => findings.filter((f) => f.inMutation && spec.expect.includes(f.rule));
