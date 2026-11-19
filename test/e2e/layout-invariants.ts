import { type Page } from '@playwright/test';

/**
 * Geometry and computed-style invariants for an open side menu and for the core chrome (#612).
 *
 * Everything is measured in the page. Tolerances: 1 px for overflow and viewport/menu edges (sub-pixel rounding),
 * 2 px in both axes for two controls to count as overlapping.
 */

export type LayoutRule =
  | 'h-overflow'
  | 'clipped-text'
  | 'outside-viewport'
  | 'outside-menu'
  | 'overlap'
  | 'line-through'
  | 'bare-select'
  | 'raw-key'
  | 'chrome-topbar-overlap'
  | 'chrome-topbar-outside'
  | 'chrome-toast-over-menu'
  | 'chrome-infobox-over-controls'
  | 'chrome-pill-over-results';

export interface LayoutViolation {
  rule: LayoutRule;
  /** Stable short selector: `#id`, else a `tag.class` path under the nearest ancestor with an id. */
  selector: string;
  detail: string;
}

/** Ids of the core chrome checked by {@link collectChromeViolations}. */
export const CHROME_IDS = {
  topBar: 'nav-wrapper',
  toastContainer: 'toast-container',
  offlineBanner: 'kt-offline-banner',
  infoBox: 'sat-infobox',
  bottomControls: ['nav-footer', 'bottom-icons-container', 'drawer-status-footer'],
  utilityPill: 'drawer-utility-footer',
  resultsPane: 'search-results',
} as const;

interface ProbeArgs {
  mode: 'menu' | 'chrome';
  root: string | null;
  chromeIds: { topBar: string; toastContainer: string; offlineBanner: string; infoBox: string; bottomControls: string[]; utilityPill: string; resultsPane: string };
}

/**
 * Runs in the page. Self-contained on purpose: Playwright serializes this function, so it may not use
 * anything from module scope.
 */
function layoutProbe(args: ProbeArgs): LayoutViolation[] {
  const EDGE = 1;
  const OVERLAP = 2;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const out: LayoutViolation[] = [];
  const CONTROL = 'button, input:not([type="hidden"]), select, textarea, a[href], [role="button"]';
  const STATE_CLASS = /^(?:active|open|opened|selected|valid|invalid|focus|focused|hover|disabled|checked|show|shown|hidden|visible|is-.+|start-hidden)$/u;

  const segment = (el: Element): string => {
    const classes = [...el.classList].filter((c) => !STATE_CLASS.test(c) && !/\d{2,}/u.test(c)).sort();

    return `${el.tagName.toLowerCase()}${classes.length ? `.${classes.slice(0, 3).join('.')}` : ''}`;
  };
  const stableId = (el: Element): string | null => (el.id && /^[A-Za-z][\w-]*$/u.test(el.id) && !/\d{3,}/u.test(el.id) ? el.id : null);
  const selectorOf = (el: Element): string => {
    const own = stableId(el);

    if (own) {
      return `#${own}`;
    }
    const parts: string[] = [];
    let cur: Element | null = el;

    while (cur && cur !== document.body) {
      const id = stableId(cur);

      if (id) {
        parts.unshift(`#${id}`);
        break;
      }
      parts.unshift(segment(cur));
      cur = cur.parentElement;
    }

    return parts.slice(-5).join(' > ');
  };

  const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const overlapBy = (a: DOMRect, b: DOMRect) => [Math.min(a.right, b.right) - Math.max(a.left, b.left), Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)];
  const fmt = (r: DOMRect) => `[${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}]`;

  /** Rendered, not transparent, not visibility:hidden and not fully clipped away by an overflow ancestor. */
  const isShown = (el: Element): boolean => {
    const r = el.getBoundingClientRect();

    if (r.width < 1 || r.height < 1) {
      return false;
    }
    const cs = getComputedStyle(el);

    if (cs.visibility !== 'visible' || Number(cs.opacity) === 0) {
      return false;
    }
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const acs = getComputedStyle(a);

      if (acs.display === 'none' || Number(acs.opacity) === 0) {
        return false;
      }
      // body's overflow applies to the viewport, not to body's own (often zero-height) box.
      if (a !== document.body && (acs.overflowX !== 'visible' || acs.overflowY !== 'visible')) {
        const ar = a.getBoundingClientRect();

        if (!intersects(r, ar)) {
          return false;
        }
      }
    }

    return true;
  };

  const isScroller = (cs: CSSStyleDeclaration, axis: 'x' | 'y') => /^(?:auto|scroll)$/u.test(axis === 'x' ? cs.overflowX : cs.overflowY);
  /** A sideways scroller meant to scroll: not the menu itself, and holding a table, pre, canvas or a scroll/table wrapper class. */
  const isIntendedSidewaysScroller = (el: Element, root: Element | null) =>
    el !== root && isScroller(getComputedStyle(el), 'x') && (el.querySelector('table, pre, canvas') !== null || /scroll|table/iu.test(el.getAttribute('class') ?? ''));

  const ancestorWithin = (el: Element, root: Element | null, pred: (a: Element) => boolean): Element | null => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (pred(a)) {
        return a;
      }
      if (a === root) {
        break;
      }
    }

    return null;
  };

  if (args.mode === 'chrome') {
    const ids = args.chromeIds;
    const byId = (id: string) => document.getElementById(id);
    const top = byId(ids.topBar);

    if (top && isShown(top)) {
      const topRect = top.getBoundingClientRect();
      const items = [...top.querySelectorAll(CONTROL)].filter((e) => isShown(e) && e.getBoundingClientRect().top < topRect.bottom);

      for (const el of items) {
        const r = el.getBoundingClientRect();

        if (r.left < -EDGE || r.right > vw + EDGE || r.top < -EDGE) {
          out.push({ rule: 'chrome-topbar-outside', selector: selectorOf(el), detail: `${fmt(r)} viewport ${vw}x${vh}` });
        }
      }
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];

          if (a.contains(b) || b.contains(a)) {
            continue;
          }
          const [ox, oy] = overlapBy(a.getBoundingClientRect(), b.getBoundingClientRect());

          if (ox > OVERLAP && oy > OVERLAP) {
            out.push({ rule: 'chrome-topbar-overlap', selector: `${selectorOf(a)} | ${selectorOf(b)}`, detail: `${Math.round(ox)}x${Math.round(oy)} px` });
          }
        }
      }
    }

    const menu = args.root ? document.querySelector(args.root) : null;

    if (menu && isShown(menu)) {
      const mr = menu.getBoundingClientRect();
      const covers = [...(byId(ids.toastContainer)?.querySelectorAll('.toast') ?? []), byId(ids.offlineBanner)].filter((e): e is Element => !!e && isShown(e));

      for (const c of covers) {
        const [ox, oy] = overlapBy(c.getBoundingClientRect(), mr);

        if (ox > OVERLAP && oy > OVERLAP) {
          out.push({ rule: 'chrome-toast-over-menu', selector: selectorOf(c), detail: `covers ${args.root} by ${Math.round(ox)}x${Math.round(oy)} px` });
        }
      }
    }

    const info = byId(ids.infoBox);

    if (info && isShown(info)) {
      for (const id of ids.bottomControls) {
        const c = byId(id);

        if (c && isShown(c)) {
          const [ox, oy] = overlapBy(info.getBoundingClientRect(), c.getBoundingClientRect());

          if (ox > OVERLAP && oy > OVERLAP) {
            out.push({ rule: 'chrome-infobox-over-controls', selector: `#${id}`, detail: `#${ids.infoBox} overlaps by ${Math.round(ox)}x${Math.round(oy)} px` });
          }
        }
      }
    }

    const pill = byId(ids.utilityPill);
    const results = byId(ids.resultsPane);

    if (pill && results && isShown(pill) && isShown(results)) {
      const [ox, oy] = overlapBy(pill.getBoundingClientRect(), results.getBoundingClientRect());

      if (ox > OVERLAP && oy > OVERLAP) {
        out.push({ rule: 'chrome-pill-over-results', selector: `#${ids.utilityPill}`, detail: `over #${ids.resultsPane} by ${Math.round(ox)}x${Math.round(oy)} px` });
      }
    }

    return out;
  }

  const root = args.root ? document.querySelector(args.root) : null;

  if (!root) {
    return [{ rule: 'h-overflow', selector: args.root ?? '(none)', detail: 'menu root not found' }];
  }
  const rootRect = root.getBoundingClientRect();
  const all = [root, ...root.querySelectorAll('*')].filter(isShown);

  for (const el of all) {
    const cs = getComputedStyle(el);
    const he = el as HTMLElement;

    // h-overflow: a scroll container (or the menu itself) that scrolls sideways and is not meant to.
    if ((el === root || isScroller(cs, 'x')) && he.scrollWidth > he.clientWidth + EDGE && !isIntendedSidewaysScroller(el, root)) {
      out.push({ rule: 'h-overflow', selector: selectorOf(el), detail: `scrollWidth ${he.scrollWidth} > clientWidth ${he.clientWidth}` });
    }

    // clipped-text: own text cut off by its own hidden overflow.
    const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0);

    if (ownText && cs.display !== 'inline') {
      const hidesX = /^(?:hidden|clip)$/u.test(cs.overflowX);
      const hidesY = /^(?:hidden|clip)$/u.test(cs.overflowY);
      const cutX = hidesX && he.scrollWidth > he.clientWidth + EDGE;
      const cutY = hidesY && he.scrollHeight > he.clientHeight + EDGE;
      const ellipsisWithTitle = cs.textOverflow === 'ellipsis' && he.hasAttribute('title');

      if ((cutX || cutY) && !ellipsisWithTitle) {
        out.push({
          rule: 'clipped-text',
          selector: selectorOf(el),
          detail: `${cutX ? `w ${he.scrollWidth}>${he.clientWidth}` : ''}${cutY ? ` h ${he.scrollHeight}>${he.clientHeight}` : ''} "${(he.textContent ?? '').trim().slice(0, 30)}"`,
        });
      }
    }

    if (el.tagName === 'LABEL' && cs.textDecorationLine.includes('line-through')) {
      out.push({ rule: 'line-through', selector: selectorOf(el), detail: `"${(he.textContent ?? '').trim().slice(0, 30)}"` });
    }

    if (el.tagName === 'SELECT' && !el.closest('.select-wrapper') && !el.classList.contains('kt-picker-source')) {
      out.push({ rule: 'bare-select', selector: selectorOf(el), detail: 'native select without .select-wrapper or grouped picker' });
    }
  }

  const controls = all.filter((el) => el !== root && el.matches(CONTROL));

  for (const el of controls) {
    const r = el.getBoundingClientRect();
    const vScroller = ancestorWithin(el, root, (a) => isScroller(getComputedStyle(a), 'y') && a.scrollHeight > a.clientHeight + EDGE);
    const xClipper = ancestorWithin(el, root, (a) => a !== root && getComputedStyle(a).overflowX !== 'visible');
    const outX = r.left < -EDGE || r.right > vw + EDGE;
    const outY = !vScroller && (r.top < -EDGE || r.bottom > vh + EDGE);

    if (!xClipper && (outX || outY)) {
      out.push({ rule: 'outside-viewport', selector: selectorOf(el), detail: `${fmt(r)} viewport ${vw}x${vh}` });
    }
    if (!xClipper && (r.left < rootRect.left - EDGE || r.right > rootRect.right + EDGE)) {
      out.push({ rule: 'outside-menu', selector: selectorOf(el), detail: `${fmt(r)} menu ${fmt(rootRect)}` });
    }
  }

  for (let i = 0; i < controls.length; i++) {
    for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i];
      const b = controls[j];

      if (a.contains(b) || b.contains(a)) {
        continue;
      }
      const [ox, oy] = overlapBy(a.getBoundingClientRect(), b.getBoundingClientRect());

      if (ox > OVERLAP && oy > OVERLAP) {
        out.push({ rule: 'overlap', selector: `${selectorOf(a)} | ${selectorOf(b)}`, detail: `${Math.round(ox)}x${Math.round(oy)} px` });
      }
    }
  }

  // raw-key: an unreplaced locale key path or {{placeholder}} in visible text or a placeholder attribute.
  const KEY_ANYWHERE = /\bplugins\.[A-Za-z0-9_]+\.[A-Za-z0-9_.]+/u;
  const KEY_WHOLE = /^[a-z][A-Za-z0-9]+(?:\.[A-Za-z0-9_]+){2,}$/u;
  const PLACEHOLDER = /\{\{\s*[\w.]+\s*\}\}/u;
  const isRaw = (s: string) => KEY_ANYWHERE.test(s) || KEY_WHOLE.test(s) || PLACEHOLDER.test(s);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = (n.textContent ?? '').trim();
    const parent = n.parentElement;

    if (text && parent && !parent.closest('script, style, template') && isRaw(text) && isShown(parent)) {
      out.push({ rule: 'raw-key', selector: selectorOf(parent), detail: `"${text.slice(0, 60)}"` });
    }
  }
  for (const el of all) {
    const ph = el.getAttribute('placeholder');

    if (ph && isRaw(ph.trim())) {
      out.push({ rule: 'raw-key', selector: selectorOf(el), detail: `placeholder "${ph.slice(0, 60)}"` });
    }
  }

  // One entry per rule and selector; repeated rows (a list of 40 identical buttons) count once.
  const seen = new Map<string, LayoutViolation & { n: number }>();

  for (const v of out) {
    const k = `${v.rule}\u0000${v.selector}`;
    const prev = seen.get(k);

    if (prev) {
      prev.n++;
    } else {
      seen.set(k, { ...v, n: 1 });
    }
  }

  return [...seen.values()].map(({ n, ...v }) => (n > 1 ? { ...v, detail: `${v.detail} (x${n})` } : v));
}

/** Layout violations for one open menu, `rootSelector` being the menu element (for example `#graphics-menu`). */
export function collectViolations(page: Page, rootSelector: string): Promise<LayoutViolation[]> {
  return page.evaluate<LayoutViolation[], ProbeArgs>(layoutProbe, { mode: 'menu', root: rootSelector, chromeIds: { ...CHROME_IDS, bottomControls: [...CHROME_IDS.bottomControls] } });
}

/** Core chrome violations; pass the open menu's selector to also check toasts and the offline banner against it. */
export function collectChromeViolations(page: Page, openMenuSelector: string | null = null): Promise<LayoutViolation[]> {
  return page.evaluate<LayoutViolation[], ProbeArgs>(layoutProbe, { mode: 'chrome', root: openMenuSelector, chromeIds: { ...CHROME_IDS, bottomControls: [...CHROME_IDS.bottomControls] } });
}
