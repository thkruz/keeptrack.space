import { describe, expect, it } from 'vitest';
import { refinePassEdgeMs } from '../pass-edge';

// In view from 10.340 s to 20.850 s
const RISE_MS = 10_340;
const SET_MS = 20_850;
const isInView = (t: number) => t >= RISE_MS && t <= SET_MS;

describe('refinePassEdgeMs', () => {
  it('gives the first whole second in view for a rise, whatever the sample phase', () => {
    for (const inMs of [10_400, 10_999, 11_000, 11_300, 12_500]) {
      for (const stepMs of [1000, 5000, 30_000]) {
        if (!isInView(inMs - stepMs)) {
          expect(refinePassEdgeMs(isInView, inMs - stepMs, inMs)).toBe(11_000);
        }
      }
    }
  });

  it('gives the last whole second in view for a set, whatever the sample phase', () => {
    for (const inMs of [19_100, 20_000, 20_700, 20_849]) {
      for (const stepMs of [1000, 5000, 30_000]) {
        if (!isInView(inMs + stepMs)) {
          expect(refinePassEdgeMs(isInView, inMs + stepMs, inMs)).toBe(20_000);
        }
      }
    }
  });

  it('returns an in-view instant', () => {
    expect(isInView(refinePassEdgeMs(isInView, 0, 15_000))).toBe(true);
  });
});
