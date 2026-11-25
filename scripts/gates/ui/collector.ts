import type { CollectorResult } from './types';

/**
 * The in-page collector, kept as a string so tsx never injects its `__name` helper into the page (same trap the
 * locale-matrix heuristics dodge). One walk returns every visible element's rect, computed overflow, text-overflow,
 * position and z-index, a control flag and, for controls, the elementsFromPoint hit at the centre.
 *
 * Scope: all `.side-menu-parent` roots other than `scopeRoot` are skipped, so each run sees the core chrome plus the one
 * open menu. Subtrees with display:none, visibility:hidden or opacity 0 are skipped.
 */
export const collectorScript = (scopeRoot: string | null): string => `(() => {
  const scopeRoot = ${JSON.stringify(scopeRoot)};
  const CONTROL = 'button, input:not([type="hidden"]), select, textarea, a[href], [role="button"]';
  const records = [];
  const els = [];
  const idxOf = new Map();
  const sel = (el) => {
    if (el.id) { return '#' + el.id; }
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 4) {
      if (cur.id) { parts.unshift('#' + cur.id); break; }
      let s = cur.tagName.toLowerCase();
      const cls = typeof cur.className === 'string' ? cur.className.trim().split(/\\s+/u).filter((c) => c && !/^(?:active|open|opened|selected|valid|invalid|focus|focused|hover|disabled|checked|show|shown|hidden|visible|is-.+|start-hidden)$/u.test(c)).slice(0, 2) : [];
      if (cls.length) { s += '.' + cls.join('.'); }
      parts.unshift(s);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  };
  const hasOwnText = (el) => {
    for (const n of el.childNodes) { if (n.nodeType === 3 && n.nodeValue.trim()) { return true; } }
    const t = el.tagName;
    return (t === 'INPUT' && ['button', 'submit', 'reset'].includes(el.type) && !!el.value) || false;
  };
  const scopeEl = scopeRoot ? document.getElementById(scopeRoot) : null;
  const root = document.body;
  const rootSel = (e) => e.classList && e.classList.contains('side-menu-parent');
  const walk = (el, parentIdx, inScroller, inMenu, inMut, clipX) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') { return; }
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT' || el.tagName === 'OPTION') { return; }
    if (rootSel(el) && el !== scopeEl) { return; }
    const nowInMenu = inMenu || (scopeEl !== null && el === scopeEl);
    const nowInMut = inMut || el.hasAttribute('data-gate-mut');
    const r = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || '').toLowerCase();
    const isSelectTrigger = tag === 'input' && el.classList.contains('select-dropdown');
    const exempt = tag === 'select' || tag === 'textarea' || isSelectTrigger || tag === 'input' || tag === 'svg';
    const isControl = el.matches(CONTROL) && !(tag === 'input' && (type === 'checkbox' || type === 'radio'));
    const idx = records.length;
    const rec = {
      idx: idx, parent: parentIdx, selector: sel(el), tag: tag,
      rect: { x: r.left, y: r.top, w: r.width, h: r.height },
      scrollW: el.scrollWidth, scrollH: el.scrollHeight, clientW: el.clientWidth, clientH: el.clientHeight,
      overflowX: cs.overflowX, overflowY: cs.overflowY, textOverflow: cs.textOverflow, whiteSpace: cs.whiteSpace,
      lineClamp: (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') || false,
      hasText: hasOwnText(el), position: cs.position, zIndex: cs.zIndex,
      isControl: isControl, selfOverflowExempt: exempt, inScroller: inScroller, inMenu: nowInMenu, inMutation: nowInMut, clipX: cs.position === "fixed" ? null : clipX,
    };
    records.push(rec);
    els.push(el);
    idxOf.set(el, idx);
    const scrolls = cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowY === 'auto' || cs.overflowY === 'scroll';
    let nextClip = cs.position === "fixed" ? null : clipX;
    if (cs.overflowX !== "visible" && el !== document.body && r.width > 0) { const l = r.left + el.clientLeft; const rr = l + el.clientWidth; nextClip = nextClip ? [Math.max(nextClip[0], l), Math.min(nextClip[1], rr)] : [l, rr]; }
    for (const c of el.children) { walk(c, idx, inScroller || scrolls, nowInMenu, nowInMut, nextClip); }
  };
  walk(root, -1, false, false, false, null);
  // Controls: what is on top at the centre.
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    if (!rec.isControl || rec.rect.w <= 0 || rec.rect.h <= 0) { continue; }
    const cx = rec.rect.x + rec.rect.w / 2;
    const cy = rec.rect.y + rec.rect.h / 2;
    if (cx < 0 || cy < 0 || cx >= window.innerWidth || cy >= window.innerHeight) { continue; }
    const el = els[i];
    const stack = document.elementsFromPoint(cx, cy);
    const top = stack[0];
    if (!top) { rec.hit = { by: null, relation: 'none' }; continue; }
    let relation = 'other';
    if (top === el) { relation = 'self'; }
    else if (el.contains(top)) { relation = 'descendant'; }
    else if (top.contains(el)) { relation = 'ancestor'; }
    else if (top.tagName === 'LABEL' && (top.control === el || top.contains(el))) { relation = 'label'; }
    else if (el.id && top.tagName === 'LABEL' && top.htmlFor === el.id) { relation = 'label'; }
    rec.hit = { by: relation === 'other' ? sel(top) : null, relation: relation };
  }
  return {
    viewport: { w: document.documentElement.clientWidth, h: window.innerHeight },
    docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    elements: records,
  };
})()`;

/** Minimal structural type of Playwright's Page.evaluate used here, so the collector stays testable without a browser. */
export interface Evaluator {
  evaluate(script: string): Promise<unknown>;
}

export const collect = async (page: Evaluator, scopeRoot: string | null): Promise<CollectorResult> => (await page.evaluate(collectorScript(scopeRoot))) as CollectorResult;

/**
 * F. Pseudo-locale: pad every text node by 40 percent (repeats the string's own prefix, so the glyph mix stays realistic),
 * plus button values and placeholders. Run after the menu is open and before collecting.
 */
export const PSEUDO_LOCALE_SCRIPT = `(() => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; let count = 0;
  const pad = (s) => { const t = s.trim(); if (t.length < 2) { return s; } return s.replace(t, t + ' ' + t.slice(0, Math.ceil(t.length * 0.4))); };
  const nodes = [];
  while ((n = w.nextNode())) {
    const p = n.parentElement;
    if (!p || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION', 'CANVAS'].includes(p.tagName) || n.__gatePadded) { continue; }
    nodes.push(n);
  }
  for (const node of nodes) { node.nodeValue = pad(node.nodeValue); node.__gatePadded = true; count++; }
  for (const el of document.querySelectorAll('input[type=button],input[type=submit]')) { el.value = pad(el.value); }
  for (const el of document.querySelectorAll('[placeholder]')) { el.setAttribute('placeholder', pad(el.getAttribute('placeholder'))); }
  return count;
})()`;
