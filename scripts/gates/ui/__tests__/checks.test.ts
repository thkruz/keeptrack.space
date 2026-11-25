import { describe, expect, it } from 'vitest';
import { applyAllowlist, checkClippedText, checkOccluded, checkOffscreen, checkSiblingOverlap, checkTapAndZero, checksAtoD } from '../checks';
import { detectedFindings, MUTATIONS } from '../mutations';
import type { CollectorResult, ElementRecord } from '../types';
import fixtures from './fixtures.json';

type Partial_ = Partial<ElementRecord> & { selector: string; rect: ElementRecord['rect'] };

const build = (name: keyof typeof fixtures): CollectorResult => {
  const f = fixtures[name] as unknown as { docOverflowX: number; elements: Partial_[] };

  return {
    viewport: fixtures.viewport,
    docOverflowX: f.docOverflowX,
    elements: f.elements.map((e, idx) => ({
      idx, parent: -1, tag: 'div', scrollW: 0, scrollH: 0, clientW: e.rect.w, clientH: e.rect.h, overflowX: 'visible', overflowY: 'visible', textOverflow: 'clip', whiteSpace: 'normal',
      lineClamp: false, hasText: false, position: 'static', zIndex: 'auto', isControl: false, selfOverflowExempt: false, inScroller: false, inMenu: true, inMutation: false, ...e,
    })),
  };
};

describe('A offscreen', () => {
  it('flags page overflow and an element past the right edge, not one inside a scroller', () => {
    const out = checkOffscreen(build('offscreen'));

    expect(out.map((f) => f.rule).sort()).toEqual(['A-h-overflow', 'A-offscreen', 'A-offscreen']);
    expect(out.map((f) => f.selector)).toContain('#past-clip');
    expect(out.find((f) => f.rule === 'A-offscreen')?.selector).toBe('#wide');
  });
  it('is silent on a clean layout', () => {
    expect(checkOffscreen(build('clean'))).toEqual([]);
  });
});

describe('B clipped text', () => {
  it('flags clipping without ellipsis only', () => {
    expect(checkClippedText(build('clipped')).map((f) => f.selector)).toEqual(['#clip']);
  });
});

describe('C sibling overlap', () => {
  it('flags overlapping in-flow siblings and skips absolute ones', () => {
    const out = checkSiblingOverlap(build('overlap'));

    expect(out).toHaveLength(1);
    expect(out[0].selector).toBe('#row > .l | #row > .r');
  });
});

describe('D occluded controls', () => {
  it('flags a control whose centre is covered by an unrelated element', () => {
    const out = checkOccluded(build('occluded'));

    expect(out.map((f) => f.selector)).toEqual(['#covered']);
    expect(out[0].detail).toContain('#overlay');
  });
});

describe('E tap targets and zero size', () => {
  it('flags small tap targets on phone only, and zero-size content anywhere', () => {
    expect(checkTapAndZero(build('tap'), { phone: true }).map((f) => `${f.rule}:${f.selector}`).sort()).toEqual(['E-tap-target:#small', 'E-zero-size:#zero']);
    expect(checkTapAndZero(build('tap'), { phone: false }).map((f) => f.rule)).toEqual(['E-zero-size']);
  });
});

describe('A to D together and allowlist', () => {
  it('clean fixture produces nothing', () => {
    expect(checksAtoD(build('clean'))).toEqual([]);
  });
  it('allowlist removes an exact rule and selector match, narrowed by viewport', () => {
    const f = checkOccluded(build('occluded'));
    const ctx = { viewport: 'desktop', locale: 'en', menu: 'm' };

    expect(applyAllowlist(f, [{ rule: 'D-occluded-control', selector: '#covered', reason: 'test' }], ctx)).toEqual([]);
    expect(applyAllowlist(f, [{ rule: 'D-occluded-control', selector: '#covered', reason: 'test', viewport: 'phone' }], ctx)).toHaveLength(1);
  });
});

describe('I detection predicate', () => {
  it('requires an expected rule on a mutated element', () => {
    const data = build('occluded');

    data.elements[1].inMutation = true;
    const dZ = MUTATIONS.find((m) => m.kind === 'drop-z-index')!;
    const widen = MUTATIONS.find((m) => m.kind === 'widen-button')!;

    expect(detectedFindings(checksAtoD(data), dZ)).toHaveLength(1);
    expect(detectedFindings(checksAtoD(data), widen)).toHaveLength(0);
  });
});
