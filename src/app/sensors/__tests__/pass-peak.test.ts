import { findPassPeakMs, refinePeakMs } from '../pass-peak';

/** A smooth pass: elevation is highest at `peakMs`. */
const curve = (peakMs: number) => (ms: number) => 60 - 0.0004 * ((ms - peakMs) / 1000) ** 2;

describe('pass peak (#313)', () => {
  const peakMs = Date.UTC(2026, 10, 13, 22, 8, 24, 400);

  it('returns a whole second', () => {
    const peak = findPassPeakMs(curve(peakMs), peakMs - 300000, peakMs + 300000);

    expect(peak).not.toBeNull();
    expect((peak as { ms: number }).ms % 1000).toBe(0);
    expect(Math.abs((peak as { ms: number }).ms - peakMs)).toBeLessThan(1000);
  });

  it('does not depend on the start of the search window', () => {
    const results = [0, 137, 400, 999, 5123, 11111].map((shift) => findPassPeakMs(curve(peakMs), peakMs - 300000 + shift, peakMs + 300000 - shift)?.ms);

    expect(new Set(results).size).toBe(1);
  });

  it('refinePeakMs from any nearby sample phase agrees with the full search', () => {
    const full = findPassPeakMs(curve(peakMs), peakMs - 300000, peakMs + 300000)?.ms;

    for (const phase of [0, 250, 500, 750, 999]) {
      expect(refinePeakMs(curve(peakMs), Math.round(peakMs / 1000) * 1000 + phase, 1000)?.ms).toBe(full);
    }
  });

  it('stays inside the bounds it is given', () => {
    const peak = refinePeakMs(curve(peakMs), peakMs, 5000, peakMs + 2000, peakMs + 4000);

    // Whole seconds only, so the result may sit at most one second before a fractional bound.
    expect(peak?.ms).toBeGreaterThanOrEqual(peakMs + 2000 - 999);
    expect(peak?.ms).toBeLessThanOrEqual(peakMs + 2000 + 1000);
  });

  it('returns null when nothing resolves', () => {
    expect(findPassPeakMs(() => null, 0, 60000)).toBeNull();
  });
});
