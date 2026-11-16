import { describe, expect, it } from 'vitest';
import { brightnessLevel, compassPoint, findVisiblePasses, findVisibleWindow, toVisiblePass, VISIBLE_TONIGHT_DEFAULTS, VisibleTonightTarget } from '../visible-tonight-calc';

const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 16, 23, 0, 0);

/**
 * A synthetic 10-minute pass: elevation rises linearly to `peakEl` at the middle and falls back,
 * azimuth sweeps 225 (SW) to 45 (NE), range 500 km at the peak. Visible (sunlit, dark sky) until `shadowAtMs`,
 * and only from `darkFromMs` when given (the sky darkening during the pass).
 */
const makeTarget = (opts: { riseMs?: number; peakEl?: number; stdMag?: number; shadowAtMs?: number; darkFromMs?: number; norad?: string } = {}): VisibleTonightTarget => {
  const riseMs = opts.riseMs ?? T0;
  const setMs = riseMs + 10 * MIN;
  const peakEl = opts.peakEl ?? 60;
  const mid = (riseMs + setMs) / 2;

  return {
    norad: opts.norad ?? '25544',
    name: 'ISS (ZARYA)',
    stdMag: opts.stdMag ?? -1.3,
    passes: (fromMs, toMs) => (riseMs >= fromMs && riseMs < toMs ? [{ riseMs, setMs }] : []),
    lookAngle: (t) => {
      if (t < riseMs - MIN || t > setMs + MIN) {
        return null;
      }
      const frac = 1 - Math.abs(t - mid) / (5 * MIN);

      return { az: 225 + ((t - riseMs) / (10 * MIN)) * 180, el: Math.max(0, frac * peakEl), rng: 500 + (1 - frac) * 1500 };
    },
    isVisible: (t) => (typeof opts.shadowAtMs !== 'number' || t < opts.shadowAtMs) && (typeof opts.darkFromMs !== 'number' || t >= opts.darkFromMs),
    // Phase 60 deg: a typical evening geometry.
    phaseAngle: () => Math.PI / 3,
  };
};

describe('brightnessLevel', () => {
  it('buckets magnitudes into plain words', () => {
    expect(brightnessLevel(-2)).toBe('veryBright');
    expect(brightnessLevel(-1)).toBe('veryBright');
    expect(brightnessLevel(0.5)).toBe('bright');
    expect(brightnessLevel(1.5)).toBe('bright');
    expect(brightnessLevel(3)).toBe('visible');
  });
});

describe('compassPoint', () => {
  it.each([
    [0, 'N'],
    [22, 'N'],
    [23, 'NE'],
    [90, 'E'],
    [200, 'S'],
    [225, 'SW'],
    [337.6, 'N'],
    [359.9, 'N'],
    [-45, 'NW'],
    [405, 'NE'],
  ])('%s deg is %s', (az, expected) => {
    expect(compassPoint(az)).toBe(expected);
  });
});

describe('findVisibleWindow', () => {
  it('returns the whole pass when it is visible throughout', () => {
    expect(findVisibleWindow(T0, T0 + 10 * MIN, () => true)).toEqual({ startMs: T0, endMs: T0 + 10 * MIN });
  });

  it('returns null when it is never visible', () => {
    expect(findVisibleWindow(T0, T0 + 10 * MIN, () => false)).toBeNull();
  });

  it('refines a mid-pass shadow entry to the second', () => {
    const shadow = T0 + 4 * MIN + 17_000;
    const window = findVisibleWindow(T0, T0 + 10 * MIN, (t) => t < shadow);

    expect(window?.startMs).toBe(T0);
    expect(window?.endMs).toBe(shadow - 1000);
  });

  it('refines a late start (sky darkening during the pass)', () => {
    const dark = T0 + 2 * MIN + 33_000;
    const window = findVisibleWindow(T0, T0 + 10 * MIN, (t) => t >= dark);

    expect(window?.startMs).toBe(dark);
    expect(window?.endMs).toBe(T0 + 10 * MIN);
  });

  it('keeps the longest run when visibility flickers', () => {
    const window = findVisibleWindow(T0, T0 + 10 * MIN, (t) => (t >= T0 && t < T0 + MIN) || (t >= T0 + 3 * MIN && t < T0 + 9 * MIN));

    expect(window?.startMs).toBe(T0 + 3 * MIN);
    expect(window?.endMs).toBe(T0 + 9 * MIN - 1000);
  });
});

describe('toVisiblePass', () => {
  it('describes a bright, high pass', () => {
    const pass = toVisiblePass(makeTarget(), { riseMs: T0, setMs: T0 + 10 * MIN });

    expect(pass).not.toBeNull();
    expect(pass?.peakMs).toBe(T0 + 5 * MIN);
    expect(pass?.peakEl).toBeCloseTo(60, 0);
    expect(pass?.startAz).toBe(225);
    expect(pass?.endAz).toBe(405);
    expect(pass?.level).toBe('veryBright');
  });

  it('drops a pass that is never visible (sky still too bright the whole time)', () => {
    expect(toVisiblePass({ ...makeTarget(), isVisible: () => false }, { riseMs: T0, setMs: T0 + 10 * MIN })).toBeNull();
  });

  it('starts the listed pass when the sky becomes dark enough', () => {
    const darkFrom = T0 + 2 * MIN + 30_000;
    const pass = toVisiblePass(makeTarget({ darkFromMs: darkFrom }), { riseMs: T0, setMs: T0 + 10 * MIN });

    expect(pass?.startMs).toBe(darkFrom);
  });

  it('ends the listed pass where the object enters Earth shadow', () => {
    const shadowAt = T0 + 3 * MIN;
    const pass = toVisiblePass(makeTarget({ shadowAtMs: shadowAt }), { riseMs: T0, setMs: T0 + 10 * MIN });

    expect(pass?.endMs).toBe(shadowAt - 1000);
    // The highest point is where it disappears, not the geometric peak it never reaches in sunlight.
    expect(pass?.peakMs).toBeLessThanOrEqual(shadowAt);
  });

  it('drops a low pass', () => {
    expect(toVisiblePass(makeTarget({ peakEl: 8 }), { riseMs: T0, setMs: T0 + 10 * MIN })).toBeNull();
  });

  it('drops a faint object', () => {
    expect(toVisiblePass(makeTarget({ stdMag: 6 }), { riseMs: T0, setMs: T0 + 10 * MIN })).toBeNull();
  });

  it('drops an object with no usable look angle', () => {
    const target = { ...makeTarget(), lookAngle: () => null };

    expect(toVisiblePass(target, { riseMs: T0, setMs: T0 + 10 * MIN })).toBeNull();
  });
});

describe('findVisiblePasses', () => {
  it('sorts by start time across objects and caps the list', () => {
    const targets = Array.from({ length: 14 }, (_, i) => makeTarget({ riseMs: T0 + (13 - i) * 60 * MIN, norad: String(1000 + i) }));
    const rows = findVisiblePasses(targets, T0 - MIN);

    expect(rows).toHaveLength(VISIBLE_TONIGHT_DEFAULTS.maxRows);
    expect(rows.map((r) => r.startMs)).toEqual([...rows.map((r) => r.startMs)].sort((a, b) => a - b));
    expect(rows[0].norad).toBe('1013');
  });

  it('only searches the configured window', () => {
    const late = makeTarget({ riseMs: T0 + (VISIBLE_TONIGHT_DEFAULTS.windowDays + 1) * 86_400_000 });

    expect(findVisiblePasses([late], T0)).toEqual([]);
  });
});
