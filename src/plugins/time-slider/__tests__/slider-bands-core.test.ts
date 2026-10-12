import { type Band, bandsToGradient, type EclipseSample, eclipseBands, MAX_ECLIPSE_BANDS, TRUST_ALPHA, trustBands, trustLevel } from '@app/plugins/time-slider/slider-bands-core';
import { SunStatus } from '@ootk/src/main';

const MIN = 60e3;
const DAY = 86400e3;

/** One sample per minute over [0, totalMin]; umbra on the listed inclusive minute ranges. */
const minuteSamples = (totalMin: number, umbra: [number, number][]): EclipseSample[] => {
  const out: EclipseSample[] = [];

  for (let m = 0; m <= totalMin; m++) {
    const inUmbra = umbra.some(([a, b]) => m >= a && m <= b);

    out.push({ ms: m * MIN, status: inUmbra ? SunStatus.UMBRAL : SunStatus.SUN });
  }

  return out;
};

describe('eclipseBands', () => {
  it('produces one band per eclipse with midpoint edges', () => {
    // Umbra samples at minutes 100..135 and 700..735 of a 1440 min window. The edges sit
    // half a step outside the first/last shadowed sample: 99.5, 135.5, 699.5, 735.5 min.
    // Fractions by hand: 99.5/1440 = 0.0690972222, 135.5/1440 = 0.0940972222,
    // 699.5/1440 = 0.4857638889, 735.5/1440 = 0.5107638889.
    const samples = minuteSamples(1440, [
      [100, 135],
      [700, 735],
    ]);
    const bands = eclipseBands(samples, 0, 1440 * MIN);

    expect(bands).toHaveLength(2);
    expect(bands[0].startFrac).toBeCloseTo(0.0690972222, 6);
    expect(bands[0].endFrac).toBeCloseTo(0.0940972222, 6);
    expect(bands[1].startFrac).toBeCloseTo(0.4857638889, 6);
    expect(bands[1].endFrac).toBeCloseTo(0.5107638889, 6);
    expect(bands[0].kind).toBe('umbra');
    expect(bands[0].alpha).toBe(0.7);
  });

  it('places an edge at the clearance zero crossing when both samples carry it', () => {
    // Clearance goes +10 km -> -30 km over 0..60 s: t = 60 * 10 / (10 + 30) = 15 s.
    // Window is 0..600 s, so startFrac = 15 / 600 = 0.025. The run ends at the last
    // sample (60 s) because there is no later sample: endFrac = 60 / 600 = 0.1.
    const samples: EclipseSample[] = [
      { ms: 0, status: SunStatus.SUN, clearance: 10 },
      { ms: 60e3, status: SunStatus.UMBRAL, clearance: -30 },
    ];
    const bands = eclipseBands(samples, 0, 600e3);

    expect(bands).toHaveLength(1);
    expect(bands[0].startFrac).toBeCloseTo(0.025, 9);
    expect(bands[0].endFrac).toBeCloseTo(0.1, 9);
  });

  it('marks penumbra runs separately at the lighter alpha', () => {
    // SUN, PEN, UMB, UMB, PEN, SUN at 0..5 min over a 10 min window: penumbra [0.5,1.5] min,
    // umbra [1.5,3.5] min, penumbra [3.5,4.5] min -> fractions 0.05..0.15, 0.15..0.35, 0.35..0.45.
    const statuses = [SunStatus.SUN, SunStatus.PENUMBRAL, SunStatus.UMBRAL, SunStatus.UMBRAL, SunStatus.PENUMBRAL, SunStatus.SUN];
    const samples = statuses.map((status, m) => ({ ms: m * MIN, status }));
    const bands = eclipseBands(samples, 0, 10 * MIN);

    expect(bands.map((b) => b.kind)).toEqual(['penumbra', 'umbra', 'penumbra']);
    expect(bands.map((b) => b.alpha)).toEqual([0.35, 0.7, 0.35]);
    expect(bands[0].startFrac).toBeCloseTo(0.05, 9);
    expect(bands[1].startFrac).toBeCloseTo(0.15, 9);
    expect(bands[2].endFrac).toBeCloseTo(0.45, 9);
  });

  it('clips bands to the window', () => {
    // Samples shifted 5 min early, umbra on sample minutes 0..9 -> -5..4 min. The run starts
    // at the first sample (-5 min, clipped to 0) and ends at the midpoint 4.5 min -> 4.5 / 60.
    const samples = minuteSamples(30, [[0, 9]]).map((s) => ({ ...s, ms: s.ms - 5 * MIN }));
    const bands = eclipseBands(samples, 0, 60 * MIN);

    expect(bands).toHaveLength(1);
    expect(bands[0].startFrac).toBe(0);
    expect(bands[0].endFrac).toBeCloseTo(4.5 / 60, 9);
  });

  it('bins 300 eclipses into exactly 120 buckets weighted by shadowed fraction', () => {
    // 10 day window = 14400 min, one 10-sample eclipse every 48 min: 14400 / 48 = 300 runs,
    // each 10 min wide (edges at 48k+9.5 and 48k+19.5). Bucket width = 14400 / 120 = 120 min.
    // Bucket 0 [0,120) holds the runs at 9.5, 57.5, 105.5 -> 30 min -> 0.7 * 30/120 = 0.175.
    // Bucket 1 [120,240) holds 153.5 and 201.5 -> 20 min -> 0.7 * 20/120 = 0.11666667.
    const runs: [number, number][] = [];

    for (let k = 0; k < 300; k++) {
      runs.push([48 * k + 10, 48 * k + 19]);
    }
    const bands = eclipseBands(minuteSamples(14400, runs), 0, 14400 * MIN);

    expect(MAX_ECLIPSE_BANDS).toBe(120);
    expect(bands).toHaveLength(120);
    expect(bands[0].alpha).toBeCloseTo(0.175, 6);
    expect(bands[1].alpha).toBeCloseTo(0.11666667, 6);
    expect(bands[0].startFrac).toBe(0);
    expect(bands[119].endFrac).toBeCloseTo(1, 12);
  });

  it('returns nothing for an empty or zero-length window', () => {
    expect(eclipseBands([], 0, 1)).toEqual([]);
    expect(eclipseBands(minuteSamples(10, [[1, 2]]), 5, 5)).toEqual([]);
  });
});

describe('trustLevel', () => {
  it('grades at the 3 / 7 / 14 day thresholds, symmetric in sign', () => {
    expect(trustLevel(3)).toBe('ok');
    expect(trustLevel(3.0001)).toBe('caution');
    expect(trustLevel(7)).toBe('caution');
    expect(trustLevel(7.0001)).toBe('low');
    expect(trustLevel(14)).toBe('low');
    expect(trustLevel(14.0001)).toBe('poor');
    expect(trustLevel(-10)).toBe('low');
  });
});

describe('trustBands', () => {
  const levelOf = (b: Band): string => Object.entries(TRUST_ALPHA).find(([, a]) => a === b.alpha)?.[0] ?? 'unknown';

  it('splits a 10 day window around an epoch 5 days in', () => {
    // Hand derivation (window 0..10 d, epoch at 5 d): the cuts at 5 -/+ 3 = 2 d and 8 d fall
    // inside; 5 -/+ 7 = -2 d and 12 d (and +/-14) fall outside and are clipped away.
    // Pieces graded at their midpoints: [0,2] mid 1 d -> 4 d from epoch -> caution;
    // [2,8] mid 5 d -> 0 -> ok; [8,10] mid 9 d -> 4 d -> caution.
    // The plan listed "low, caution, ok, caution, low"; the two low pieces lie entirely
    // outside the window (before -2 d and after 12 d), so only three survive the clip.
    const bands = trustBands(5 * DAY, 0, 10 * DAY);

    expect(bands.map(levelOf)).toEqual(['caution', 'ok', 'caution']);
    expect(bands.map((b) => [b.startFrac, b.endFrac])).toEqual([
      [0, 0.2],
      [0.2, 0.8],
      [0.8, 1],
    ]);
  });

  it('covers every level on a 40 day window centred on the epoch', () => {
    // Epoch at 20 d. Cuts: 20 -/+ 14 = 6, 34; -/+ 7 = 13, 27; -/+ 3 = 17, 23.
    // Midpoint distances: [0,6] 17 d poor; [6,13] 10.5 d low; [13,17] 5 d caution; [17,23] ok;
    // [23,27] caution; [27,34] low; [34,40] poor.
    const bands = trustBands(20 * DAY, 0, 40 * DAY);

    expect(bands.map(levelOf)).toEqual(['poor', 'low', 'caution', 'ok', 'caution', 'low', 'poor']);
    expect(bands[1].startFrac).toBeCloseTo(6 / 40, 12);
    expect(bands[1].endFrac).toBeCloseTo(13 / 40, 12);
    expect(TRUST_ALPHA.caution).toBeCloseTo(46 / 255, 12);
    expect(TRUST_ALPHA.low).toBeCloseTo(85 / 255, 12);
    expect(TRUST_ALPHA.poor).toBeCloseTo(128 / 255, 12);
  });
});

describe('bandsToGradient', () => {
  it('returns none when nothing is visible', () => {
    expect(bandsToGradient([], '1, 2, 3')).toBe('none');
    expect(bandsToGradient([{ startFrac: 0, endFrac: 1, alpha: 0, kind: 'trust' }], '1, 2, 3')).toBe('none');
  });

  it('emits hard stops for each band in time order', () => {
    const bands: Band[] = [
      { startFrac: 0.6, endFrac: 0.7, alpha: 0.7, kind: 'umbra' },
      { startFrac: 0.25, endFrac: 0.5, alpha: 0.5, kind: 'umbra' },
    ];

    expect(bandsToGradient(bands, '1, 2, 3')).toBe(
      'linear-gradient(to right, transparent 25.000%, rgba(1, 2, 3, 0.500) 25.000%, rgba(1, 2, 3, 0.500) 50.000%, transparent 50.000%, ' +
        'transparent 60.000%, rgba(1, 2, 3, 0.700) 60.000%, rgba(1, 2, 3, 0.700) 70.000%, transparent 70.000%)'
    );
  });
});
