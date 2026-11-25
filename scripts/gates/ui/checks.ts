import type { AllowlistEntry, CollectorResult, ElementRecord, Rect, UiFinding } from './types';

const EDGE = 1;
const OVERLAP = 2;
const TAP_MIN = 44;
const MAX_SIBLINGS = 80;

const finding = (rule: UiFinding['rule'], els: ElementRecord[], detail: string): UiFinding => ({
  rule,
  selector: els.map((e) => e.selector).join(' | '),
  detail,
  rects: els.map((e) => e.rect),
  inMenu: els.some((e) => e.inMenu),
  inMutation: els.some((e) => e.inMutation),
});

/** A. Off-screen elements and horizontal overflow. */
export function checkOffscreen(data: CollectorResult): UiFinding[] {
  const out: UiFinding[] = [];
  const { w: vw, h: vh } = data.viewport;

  if (data.docOverflowX > EDGE) {
    out.push({ rule: 'A-h-overflow', selector: 'html', detail: `page scrolls horizontally by ${data.docOverflowX}px`, rects: [], inMenu: false, inMutation: false });
  }
  for (const el of data.elements) {
    if (el.rect.w <= 0 || el.rect.h <= 0 || el.tag === 'canvas') {
      continue;
    }
    const r = el.rect;

    // Past the box of an ancestor that clips or scrolls: hidden from the user or forcing a sideways scroll.
    if (el.clipX && (r.x < el.clipX[0] - EDGE || r.x + r.w > el.clipX[1] + EDGE)) {
      out.push(finding('A-offscreen', [el], `outside its clipping container by ${Math.round(Math.max(el.clipX[0] - r.x, r.x + r.w - el.clipX[1]))}px horizontally`));
      continue;
    }
    if (el.inScroller) {
      continue;
    }
    const over: string[] = [];

    if (r.x < -EDGE) {
      over.push(`left ${Math.round(-r.x)}`);
    }
    if (r.x + r.w > vw + EDGE) {
      over.push(`right ${Math.round(r.x + r.w - vw)}`);
    }
    if (r.y < -EDGE) {
      over.push(`top ${Math.round(-r.y)}`);
    }
    if (r.y + r.h > vh + EDGE) {
      over.push(`bottom ${Math.round(r.y + r.h - vh)}`);
    }
    if (over.length) {
      out.push(finding('A-offscreen', [el], `outside viewport by ${over.join(', ')}px`));
    }
  }

  return out;
}

/** B. Text clipped under overflow: hidden without an ellipsis. */
export function checkClippedText(data: CollectorResult): UiFinding[] {
  const out: UiFinding[] = [];

  for (const el of data.elements) {
    if (!el.hasText || el.selfOverflowExempt || el.clientW <= 4) {
      continue;
    }
    const clipX = (el.overflowX === 'hidden' || el.overflowX === 'clip') && el.scrollW - el.clientW > 2 && el.textOverflow !== 'ellipsis';
    const clipY = (el.overflowY === 'hidden' || el.overflowY === 'clip') && el.scrollH - el.clientH > 2 && !el.lineClamp && el.textOverflow !== 'ellipsis';

    if (clipX || clipY) {
      out.push(finding('B-clipped-text', [el], `text clipped by ${clipX ? `${el.scrollW - el.clientW}px wide` : `${el.scrollH - el.clientH}px tall`} without ellipsis`));
    }
  }

  return out;
}

const intersect = (a: Rect, b: Rect): Rect | null => {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);

  return x2 - x > OVERLAP && y2 - y > OVERLAP ? { x, y, w: x2 - x, h: y2 - y } : null;
};

/** C. Sibling overlap inside one container. Out-of-flow (absolute/fixed) siblings overlap on purpose and are skipped. */
export function checkSiblingOverlap(data: CollectorResult): UiFinding[] {
  const out: UiFinding[] = [];
  const byParent = new Map<number, ElementRecord[]>();

  for (const el of data.elements) {
    if (el.rect.w <= 0 || el.rect.h <= 0 || el.position === 'absolute' || el.position === 'fixed' || el.tag === 'canvas') {
      continue;
    }
    const list = byParent.get(el.parent) ?? [];

    list.push(el);
    byParent.set(el.parent, list);
  }
  for (const sibs of byParent.values()) {
    const list = sibs.slice(0, MAX_SIBLINGS);

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const hit = intersect(list[i].rect, list[j].rect);

        if (hit) {
          out.push({ ...finding('C-sibling-overlap', [list[i], list[j]], `overlap ${Math.round(hit.w)}x${Math.round(hit.h)}px`), rects: [list[i].rect, list[j].rect, hit] });
        }
      }
    }
  }

  return out;
}

/** D. Occluded controls: elementsFromPoint at the centre must return the control (or something inside or around it). */
export function checkOccluded(data: CollectorResult): UiFinding[] {
  const out: UiFinding[] = [];

  for (const el of data.elements) {
    if (!el.isControl || !el.hit || el.hit.relation === 'self' || el.hit.relation === 'descendant' || el.hit.relation === 'ancestor' || el.hit.relation === 'label') {
      continue;
    }
    out.push(finding('D-occluded-control', [el], `centre covered by ${el.hit.by ?? 'nothing'}`));
  }

  return out;
}

/** E. Tap targets under 44px (phone only) and visible elements with zero size. */
export function checkTapAndZero(data: CollectorResult, opts: { phone: boolean }): UiFinding[] {
  const out: UiFinding[] = [];

  for (const el of data.elements) {
    const zero = el.rect.w <= 0 || el.rect.h <= 0;

    if (zero && (el.isControl || el.hasText)) {
      out.push(finding('E-zero-size', [el], `visible element has size ${Math.round(el.rect.w)}x${Math.round(el.rect.h)}`));
    } else if (opts.phone && el.isControl && !zero && (el.rect.w < TAP_MIN || el.rect.h < TAP_MIN)) {
      out.push(finding('E-tap-target', [el], `tap target ${Math.round(el.rect.w)}x${Math.round(el.rect.h)}px, under ${TAP_MIN}`));
    }
  }

  return out;
}

/** A to D, the set that F (pseudo-locale) and I (detector mutation) rerun. */
export function checksAtoD(data: CollectorResult): UiFinding[] {
  return [...checkOffscreen(data), ...checkClippedText(data), ...checkSiblingOverlap(data), ...checkOccluded(data)];
}

/** A to E. */
export function checksAtoE(data: CollectorResult, opts: { phone: boolean }): UiFinding[] {
  return [...checksAtoD(data), ...checkTapAndZero(data, opts)];
}

/** Drop findings accepted in the allowlist (exact rule and selector; optional viewport, locale, menu). */
export function applyAllowlist(findings: UiFinding[], allow: AllowlistEntry[], ctx: { viewport: string; locale: string; menu: string }): UiFinding[] {
  return findings.filter(
    (f) =>
      !allow.some(
        (a) =>
          a.rule === f.rule &&
          a.selector === f.selector &&
          (!a.viewport || a.viewport === ctx.viewport) &&
          (!a.locale || a.locale === ctx.locale) &&
          (!a.menu || a.menu === ctx.menu),
      ),
  );
}
