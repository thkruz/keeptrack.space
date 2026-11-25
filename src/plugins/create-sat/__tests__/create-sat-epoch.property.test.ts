import { FormatTle } from '@ootk/src/main';
import fc from 'fast-check';
import { getTleChecksumMismatches } from '../create-sat-checksum';
import { dateToEpochFields, epochFieldsToIso, epochYearToFull, isoToEpochFields } from '../create-sat-orbits';

/** Property tests (fast-check) for TLE epoch field conversion and the TLE checksum check. */

// Two-digit TLE years cover 1957-2056.
const dateArb = fc.date({ min: new Date('1957-01-01T00:00:00Z'), max: new Date('2056-12-30T00:00:00Z'), noInvalidDate: true });

describe('create-sat epoch helpers (properties)', () => {
  it('Date -> epoch fields -> ISO returns the same instant (to the 1e-8 day field resolution)', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        const f = dateToEpochFields(date);
        const iso = epochFieldsToIso(f.year, f.day);

        expect(iso).not.toBeNull();
        expect(Math.abs(new Date(iso as string).getTime() - date.getTime())).toBeLessThanOrEqual(1);
      })
    );
  });

  it('isoToEpochFields(date.toISOString()) equals dateToEpochFields(date)', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        expect(isoToEpochFields(date.toISOString())).toStrictEqual(dateToEpochFields(date));
      })
    );
  });

  it('epoch fields are a 2-digit year and a 12-character day of year in [1, 367)', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        const f = dateToEpochFields(date);

        expect(f.year).toMatch(/^\d{2}$/u);
        expect(f.day).toMatch(/^\d{3}\.\d{8}$/u);
        expect(Number(f.day)).toBeGreaterThanOrEqual(1);
        expect(Number(f.day)).toBeLessThan(367);
      })
    );
  });

  it('epochYearToFull maps every two-digit year into 1957-2056 and accepts the matching four-digit year', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), (yy) => {
        const full = epochYearToFull(String(yy).padStart(2, '0')) as number;

        expect(full).toBeGreaterThanOrEqual(1957);
        expect(full).toBeLessThanOrEqual(2056);
        expect(full % 100).toBe(yy);
        expect(epochYearToFull(String(full))).toBe(full);
      })
    );
  });

  it('a TLE built by FormatTle has no checksum mismatches, and altering a digit creates one', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_800_000 }),
        fc.integer({ min: 10_000_000, max: 1_700_000_000 }),
        fc.integer({ min: 1, max: 67 }),
        fc.integer({ min: 1, max: 9 }),
        (inc, mm, pos, delta) => {
          const { tle1, tle2 } = FormatTle.createTle({
            inc: inc / 10_000,
            meanmo: (mm / 1e8).toFixed(8),
            rasc: 10,
            argPe: 20,
            meana: 30,
            ecen: '0001000',
            epochyr: 24,
            epochday: 100.5,
            intl: '24001A',
            scc: '00005',
          });

          expect(getTleChecksumMismatches(tle1, tle2)).toStrictEqual([]);
          const ch = tle2.charAt(pos);

          if (/\d/u.test(ch)) {
            const bad = tle2.substring(0, pos) + String((Number(ch) + delta) % 10) + tle2.substring(pos + 1);

            expect(getTleChecksumMismatches(tle1, bad).map((m) => m.lineNumber)).toStrictEqual([2]);
          }
        }
      )
    );
  });
});
