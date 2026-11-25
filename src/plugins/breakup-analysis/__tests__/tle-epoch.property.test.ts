import { gpEpochMs } from '@app/engine/utils/gp-age';
import fc from 'fast-check';
import { tleEpochIso, tleEpochMs } from '../breakup-analysis-core';

/** Property tests (fast-check) for the two copies of the TLE epoch conversion (breakup-analysis and gp-age). */

describe('TLE epoch conversion (properties)', () => {
  it('tleEpochMs and gpEpochMs agree for valid two-digit years and days', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), fc.double({ min: 1, max: 366.99999999, noNaN: true }), (yy, day) => {
        expect(Math.abs((tleEpochMs(yy, day) as number) - (gpEpochMs(yy, day) as number))).toBeLessThanOrEqual(1);
      })
    );
  });

  it('epoch ms is strictly increasing in the day of year within a year', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), fc.double({ min: 1, max: 365, noNaN: true }), fc.double({ min: 0.001, max: 1, noNaN: true }), (yy, day, step) => {
        expect(tleEpochMs(yy, day + step) as number).toBeGreaterThan(tleEpochMs(yy, day) as number);
      })
    );
  });

  it('tleEpochIso round-trips through Date to the same millisecond', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), fc.double({ min: 1, max: 366, noNaN: true }), (yy, day) => {
        const iso = tleEpochIso(yy, day);

        expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
        expect(new Date(iso).getTime()).toBe(Math.round(tleEpochMs(yy, day) as number));
      })
    );
  });

  it('non-positive epoch days are reported as unavailable', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), fc.double({ min: -1000, max: 0, noNaN: true }), (yy, day) => {
        expect(tleEpochMs(yy, day)).toBeNull();
        expect(tleEpochIso(yy, day)).toBe('');
      })
    );
  });
});
