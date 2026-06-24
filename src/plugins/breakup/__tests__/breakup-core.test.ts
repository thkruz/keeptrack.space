import {
  BreakupRawForm,
  buildPieceTle,
  formatEccentricity,
  isAnalystRangeValid,
  makeRng,
  MINUTES_PER_DAY,
  parseBreakupParams,
  planRaanBuckets,
  RAAN_BUCKET_COUNT,
} from '@app/plugins/breakup/breakup-core';

// A real, 69-char ISS element set used as the reference orbit for piece builds.
const REF_TLE1 = '1 25544U 98067A   17206.18396726  .00001961  00000-0  36771-4 0  9993';
const REF_TLE2 = '2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.54225995 67660';

describe('breakup-core', () => {
  describe('makeRng', () => {
    it('is deterministic for a given seed', () => {
      const a = makeRng(42);
      const b = makeRng(42);

      for (let i = 0; i < 10; i++) {
        expect(a()).toBe(b());
      }
    });

    it('returns values in [0, 1)', () => {
      const rng = makeRng(7);

      for (let i = 0; i < 1000; i++) {
        const v = rng();

        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('produces different streams for different seeds', () => {
      expect(makeRng(1)()).not.toBe(makeRng(2)());
    });
  });

  describe('parseBreakupParams', () => {
    const raw: BreakupRawForm = {
      periodVariation: '0.1',
      incVariation: '0.05',
      rascVariation: '0.05',
      eccVariation: '0.0001',
      count: '25',
      startNum: '90000',
    };

    it('parses all numeric fields', () => {
      const { params, startNumWasInvalid } = parseBreakupParams(raw, 90000);

      expect(params.breakupCount).toBe(25);
      expect(params.incVariation).toBeCloseTo(0.05);
      expect(params.rascVariation).toBeCloseTo(0.05);
      expect(params.eccVariation).toBeCloseTo(0.0001);
      expect(params.startNum).toBe(90000);
      expect(startNumWasInvalid).toBe(false);
    });

    it('converts period (minutes) to mean-motion (rev/day)', () => {
      const { params } = parseBreakupParams({ ...raw, periodVariation: '1.0' }, 90000);

      expect(params.meanmoVariation).toBeCloseTo(1 / MINUTES_PER_DAY);
    });

    it('falls back to the default start number and flags invalid input', () => {
      const { params, startNumWasInvalid } = parseBreakupParams({ ...raw, startNum: 'abc' }, 90000);

      expect(params.startNum).toBe(90000);
      expect(startNumWasInvalid).toBe(true);
    });

    it('coerces NaN variations to 0', () => {
      const { params } = parseBreakupParams(
        { periodVariation: '', incVariation: '', rascVariation: '', eccVariation: '', count: '', startNum: '90000' },
        90000,
      );

      expect(params.incVariation).toBe(0);
      expect(params.rascVariation).toBe(0);
      expect(params.eccVariation).toBe(0);
      expect(params.meanmoVariation).toBe(0);
      expect(params.breakupCount).toBe(0);
    });
  });

  describe('planRaanBuckets', () => {
    it('returns an empty plan for zero pieces', () => {
      expect(planRaanBuckets(0, 1)).toEqual([]);
    });

    it('distributes all pieces with no loss', () => {
      const total = 25;
      const buckets = planRaanBuckets(total, 0.5);

      expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(total);
    });

    it('produces the configured number of buckets when count allows', () => {
      expect(planRaanBuckets(100, 1)).toHaveLength(RAAN_BUCKET_COUNT);
    });

    it('never makes more buckets than pieces', () => {
      const buckets = planRaanBuckets(3, 1);

      expect(buckets).toHaveLength(3);
      expect(buckets.every((b) => b.count >= 1)).toBe(true);
    });

    it('spans the full symmetric RAAN range including both extremes', () => {
      const variation = 0.8;
      const buckets = planRaanBuckets(100, variation);
      const offsets = buckets.map((b) => b.offset);

      expect(offsets[0]).toBeCloseTo(-variation / 2);
      expect(offsets[offsets.length - 1]).toBeCloseTo(variation / 2);
    });

    it('is mirror-symmetric about zero', () => {
      const buckets = planRaanBuckets(100, 1);
      const offsets = buckets.map((b) => b.offset);

      for (let i = 0; i < offsets.length; i++) {
        expect(offsets[i]).toBeCloseTo(-offsets[offsets.length - 1 - i]);
      }
    });

    it('centers a single bucket on zero offset', () => {
      const buckets = planRaanBuckets(1, 1);

      expect(buckets).toHaveLength(1);
      expect(buckets[0].offset).toBeCloseTo(0);
      expect(buckets[0].count).toBe(1);
    });
  });

  describe('formatEccentricity', () => {
    it('formats as a 7-digit implied-decimal field', () => {
      expect(formatEccentricity(0.0006703)).toBe('0006703');
      expect(formatEccentricity(0)).toBe('0000000');
    });

    it('always returns exactly 7 characters', () => {
      for (const e of [0, 0.001, 0.5, 0.9999999, 1.5, -0.2]) {
        expect(formatEccentricity(e)).toHaveLength(7);
      }
    });

    it('clamps out-of-range values into [0, 1)', () => {
      expect(formatEccentricity(-0.5)).toBe('0000000');
      expect(formatEccentricity(2)).toBe('9999999');
    });
  });

  describe('buildPieceTle', () => {
    const baseInput = {
      a5Num: '90000',
      baseInc: 51.64,
      incVariation: 0,
      meanmoVariation: 0,
      baseEcc: 0.0006317,
      eccVariation: 0,
      rng: () => 0.5,
    };

    it('produces two 69-character lines', () => {
      const { tle1, tle2 } = buildPieceTle(REF_TLE1, REF_TLE2, baseInput);

      expect(tle1).toHaveLength(69);
      expect(tle2).toHaveLength(69);
    });

    it('stamps the analyst SCC number into both lines', () => {
      const { tle1, tle2 } = buildPieceTle(REF_TLE1, REF_TLE2, { ...baseInput, a5Num: '90123' });

      expect(tle1.substring(2, 7)).toBe('90123');
      expect(tle2.substring(2, 7)).toBe('90123');
    });

    it('splices the eccentricity into columns 27-33', () => {
      const { tle2 } = buildPieceTle(REF_TLE1, REF_TLE2, baseInput);

      // rng()=0.5 with zero variation leaves the eccentricity equal to baseEcc.
      expect(tle2.substring(26, 33)).toBe(formatEccentricity(baseInput.baseEcc));
    });

    it('keeps inclination within +/- the variation', () => {
      for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
        const { tle2 } = buildPieceTle(REF_TLE1, REF_TLE2, {
          ...baseInput,
          incVariation: 0.5,
          rng: () => r,
        });
        const inc = parseFloat(tle2.substring(8, 16));

        expect(inc).toBeGreaterThanOrEqual(51.64 - 0.5 - 1e-6);
        expect(inc).toBeLessThanOrEqual(51.64 + 0.5 + 1e-6);
      }
    });

    it('keeps eccentricity non-negative even with large downward jitter', () => {
      const { tle2 } = buildPieceTle(REF_TLE1, REF_TLE2, {
        ...baseInput,
        baseEcc: 0.0001,
        eccVariation: 0.01,
        rng: () => 0, // maximal downward jitter -> would go negative without clamping
      });
      const eccField = parseInt(tle2.substring(26, 33), 10);

      expect(eccField).toBeGreaterThanOrEqual(0);
    });

    it('varies mean motion around the reference value', () => {
      const refMeanmo = parseFloat(REF_TLE2.substring(52, 63));
      const { tle2 } = buildPieceTle(REF_TLE1, REF_TLE2, {
        ...baseInput,
        meanmoVariation: 0.001,
        rng: () => 1, // maximal upward jitter
      });
      const meanmo = parseFloat(tle2.substring(52, 63));

      expect(meanmo).toBeCloseTo(refMeanmo + 0.001, 6);
    });
  });

  describe('isAnalystRangeValid', () => {
    const START = 90000;
    const SIZE = 10000;

    it('accepts a range fully inside the analyst block', () => {
      expect(isAnalystRangeValid(90000, 25, START, SIZE)).toBe(true);
      expect(isAnalystRangeValid(99990, 10, START, SIZE)).toBe(true);
    });

    it('rejects a start before the analyst block', () => {
      expect(isAnalystRangeValid(89999, 5, START, SIZE)).toBe(false);
    });

    it('rejects a range that overruns the analyst block', () => {
      expect(isAnalystRangeValid(99991, 10, START, SIZE)).toBe(false);
    });

    it('rejects a non-positive count', () => {
      expect(isAnalystRangeValid(90000, 0, START, SIZE)).toBe(false);
    });
  });
});
