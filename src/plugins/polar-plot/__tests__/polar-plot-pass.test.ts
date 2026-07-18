import { lookanglesRow } from '@app/engine/core/interfaces';
import * as bestPass from '@app/plugins/best-pass/best-pass-calculator';
import { buildPolarPass, findPolarPasses, PolarSample, samplePassTrack } from '@app/plugins/polar-plot/polar-plot-pass';
import { vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sensor = { maxRng: 100_000 } as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const satrec = {} as any;

const inViewDeps = (raeImpl: () => { az: number | null; el: number | null; rng: number | null }) => ({
  getRae: vi.fn(raeImpl),
  checkIsInView: vi.fn(() => true),
});

describe('samplePassTrack', () => {
  it('samples az/el across the window at the requested step', () => {
    const deps = inViewDeps(() => ({ az: 100, el: 30, rng: 800 }));

    const samples = samplePassTrack(satrec, sensor, deps, 0, 60_000, 30);

    // t = 0, 30000, 60000 -> three samples, LOS already represented (no dup).
    expect(samples).toHaveLength(3);
    expect(samples[0].az).toBe(100);
    expect(samples[samples.length - 1].t.getTime()).toBe(60_000);
  });

  it('appends the LOS endpoint when the window is not a step multiple', () => {
    const deps = inViewDeps(() => ({ az: 10, el: 5, rng: 900 }));

    const samples = samplePassTrack(satrec, sensor, deps, 0, 50_000, 30);

    // t = 0, 30000, then an explicit final sample at 50000.
    expect(samples.map((s) => s.t.getTime())).toStrictEqual([0, 30_000, 50_000]);
  });

  it('drops samples with a null look angle', () => {
    let n = 0;
    const deps = inViewDeps(() => (n++ === 0 ? { az: null, el: null, rng: null } : { az: 90, el: 20, rng: 500 }));

    const samples = samplePassTrack(satrec, sensor, deps, 0, 60_000, 30);

    expect(samples.every((s: PolarSample) => s.az !== null)).toBe(true);
    expect(samples.length).toBeLessThan(3);
  });

  it('drops samples outside the field of regard', () => {
    const deps = {
      getRae: vi.fn(() => ({ az: 90, el: 1, rng: 500 })),
      checkIsInView: vi.fn(() => false),
    };

    const samples = samplePassTrack(satrec, sensor, deps, 0, 60_000, 30);

    expect(samples).toHaveLength(0);
  });
});

describe('buildPolarPass', () => {
  const row = (over: Partial<lookanglesRow> = {}): lookanglesRow => ({
    ...({} as lookanglesRow),
    START_DATE: new Date('2026-05-31T00:00:00Z'),
    STOP_DATE: new Date('2026-05-31T00:10:00Z'),
    MAXIMUM_ELEVATION: '47.5',
    MAXIMUM_ELEVATION_DTG: Date.parse('2026-05-31T00:05:00Z'),
    ...over,
  });

  const sample: PolarSample = {
    t: new Date('2026-05-31T00:00:00Z'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    az: 100 as any,
    el: 30 as any,
    rng: 800 as any,
  };

  it('shapes a row plus samples into a PolarPass', () => {
    const pass = buildPolarPass(row(), [sample]);

    expect(pass).not.toBeNull();
    expect(pass!.maxEl).toBeCloseTo(47.5);
    expect(pass!.durationMs).toBe(10 * 60 * 1000);
    expect(pass!.culmination.toISOString()).toBe('2026-05-31T00:05:00.000Z');
  });

  it('returns null when there are no samples', () => {
    expect(buildPolarPass(row(), [])).toBeNull();
  });

  it('returns null when the row lacks Date fields', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(buildPolarPass(row({ START_DATE: null as any }), [sample])).toBeNull();
  });
});

describe('findPolarPasses', () => {
  const NOW = Date.parse('2026-05-31T12:00:00Z');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deps = { baseTimeMs: NOW, getRae: vi.fn(() => ({ az: 90, el: 30, rng: 800 })), checkIsInView: vi.fn(() => true), sunEciKm: vi.fn() } as any;

  const makeRow = (startMin: number, stopMin: number): lookanglesRow => ({
    ...({} as lookanglesRow),
    START_DATE: new Date(NOW + startMin * 60_000),
    STOP_DATE: new Date(NOW + stopMin * 60_000),
    MAXIMUM_ELEVATION: '40',
    MAXIMUM_ELEVATION_DTG: NOW + ((startMin + stopMin) / 2) * 60_000,
  });

  afterEach(() => vi.restoreAllMocks());

  it('drops passes that have already ended and samples the rest', () => {
    vi.spyOn(bestPass, 'findPassesForSat').mockReturnValue({
      // First pass ended 30 min ago; second is upcoming.
      passes: [makeRow(-60, -30), makeRow(20, 30)],
      truncated: false,
    });

    const passes = findPolarPasses('25544', satrec, sensor, deps, { windowDays: 1, maxPasses: 5 });

    expect(passes).toHaveLength(1);
    expect(passes[0].aos.getTime()).toBe(NOW + 20 * 60_000);
    expect(passes[0].samples.length).toBeGreaterThan(0);
  });

  it('caps the number of returned passes', () => {
    vi.spyOn(bestPass, 'findPassesForSat').mockReturnValue({
      passes: [makeRow(10, 20), makeRow(110, 120), makeRow(210, 220)],
      truncated: false,
    });

    const passes = findPolarPasses('25544', satrec, sensor, deps, { windowDays: 1, maxPasses: 2 });

    expect(passes).toHaveLength(2);
  });
});
