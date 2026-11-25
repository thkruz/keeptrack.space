import { Radians } from '@ootk/src/main';
import fc from 'fast-check';
import { dateFromJday, jday, normalizeAngle, wrapLon } from '../transforms';

/** Property tests (fast-check) for the time and angle helpers in engine/utils/transforms. */

const TAU = 2 * Math.PI;
const angle = fc.double({ min: -1000, max: 1000, noNaN: true });
// The Vallado jday algorithm is valid 1901-2099.
const dateArb = fc.date({ min: new Date('1901-03-01T00:00:00Z'), max: new Date('2099-12-31T00:00:00Z'), noInvalidDate: true });

describe('transforms helpers (properties)', () => {
  it('normalizeAngle lands in [-PI, PI] and keeps the angle modulo TAU', () => {
    fc.assert(
      fc.property(angle, (a) => {
        const n = normalizeAngle(a as Radians);

        expect(n).toBeGreaterThanOrEqual(-Math.PI);
        expect(n).toBeLessThanOrEqual(Math.PI);
        expect(Math.cos(n)).toBeCloseTo(Math.cos(a), 9);
        expect(Math.sin(n)).toBeCloseTo(Math.sin(a), 9);
      })
    );
  });

  it('normalizeAngle is idempotent', () => {
    fc.assert(
      fc.property(angle, (a) => {
        const once = normalizeAngle(a as Radians);

        expect(normalizeAngle(once)).toBe(once);
      })
    );
  });

  it('wrapLon lands in [-PI, PI) and keeps the longitude modulo TAU', () => {
    fc.assert(
      fc.property(angle, (a) => {
        const w = wrapLon(a);

        expect(w).toBeGreaterThanOrEqual(-Math.PI);
        expect(w).toBeLessThan(Math.PI + 1e-12);
        expect(Math.cos(w)).toBeCloseTo(Math.cos(a), 9);
        expect(Math.sin(w)).toBeCloseTo(Math.sin(a), 9);
      })
    );
  });

  it('wrapLon leaves values already in range unchanged (to rounding)', () => {
    fc.assert(
      fc.property(fc.double({ min: -Math.PI, max: Math.PI - 1e-9, noNaN: true }), (a) => {
        expect(Math.abs(wrapLon(a) - a)).toBeLessThan(1e-12);
      })
    );
  });

  it('wrapLon is periodic in TAU (up to the +-PI seam)', () => {
    fc.assert(
      fc.property(angle, (a) => {
        const d = Math.abs(wrapLon(a + TAU) - wrapLon(a));

        expect(Math.min(d, Math.abs(d - TAU))).toBeLessThan(1e-9);
      })
    );
  });

  it('jday agrees with the Unix epoch (JD 2440587.5) for calendar dates 1901-2099', () => {
    fc.assert(
      fc.property(dateArb, (d) => {
        const jd = jday(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
        const expected = (Math.floor(d.getTime() / 1000) * 1000) / 86_400_000 + 2440587.5;

        expect(Math.abs(jd - expected)).toBeLessThan(1e-6);
      })
    );
  });

  it('jday increases with time', () => {
    fc.assert(
      fc.property(dateArb, fc.integer({ min: 1, max: 86_400 * 400 }), (d, secs) => {
        const e = new Date(d.getTime() + secs * 1000);
        const j = (x: Date) => jday(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), x.getUTCHours(), x.getUTCMinutes(), x.getUTCSeconds());

        expect(j(e)).toBeGreaterThan(j(d));
      })
    );
  });

  it('dateFromJday returns midnight UTC of the requested day of year', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1957, max: 2056 }), fc.integer({ min: 1, max: 365 }), (year, day) => {
        const d = dateFromJday(year, day);

        expect(d.getUTCFullYear()).toBe(year);
        expect(Math.round((d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000) + 1).toBe(day);
        expect(d.getUTCHours() + d.getUTCMinutes() + d.getUTCSeconds()).toBe(0);
      })
    );
  });
});
