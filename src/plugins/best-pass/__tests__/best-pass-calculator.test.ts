import { lookanglesRow } from '@app/engine/core/interfaces';
import {
  BestPassDeps,
  emptyPassRow,
  findPassesForSat,
  normalizePassRows,
  PassRae,
  scorePass,
} from '@app/plugins/best-pass/best-pass-calculator';
import { defaultSensor } from '@test/environment/apiMocks';
import { SatelliteRecord } from '@ootk/src/main';

const BASE_MS = Date.UTC(2025, 0, 1, 0, 0, 0);

/** Fake satrec: only `no` (mean motion, rad/min) is read, to size the post-pass skip. */
const fakeSatrec = (no: number): SatelliteRecord => ({ no } as unknown as SatelliteRecord);

/**
 * Builds deps whose getRae reports a satellite in view (el 45 deg) inside the
 * given [startMs, endMs] offset windows and out of view otherwise.
 */
const buildDeps = (windows: Array<[number, number]>): BestPassDeps => {
  const inView = (offsetMs: number): boolean => windows.some(([a, b]) => offsetMs >= a && offsetMs <= b);

  return {
    baseTimeMs: BASE_MS,
    getRae: (date): PassRae => {
      const offsetMs = date.getTime() - BASE_MS;

      return inView(offsetMs)
        ? { az: 180, el: 45, rng: 1000 }
        : { az: 180, el: -10, rng: 2000 };
    },
    checkIsInView: (_sensor, rae) => (rae.el ?? -90) >= 0,
    sunEciKm: () => ({ x: 1.4e8, y: 0, z: 0 } as ReturnType<BestPassDeps['sunEciKm']>),
  };
};

describe('best-pass-calculator', () => {
  describe('scorePass', () => {
    it('rewards duration, elevation, and short range', () => {
      const score = scorePass(8 * 60 * 1000, 50, 750, false);

      // 8 min -> full duration (10), 50 deg -> full elevation (10), 750 km -> full range (10)
      expect(score).toBeCloseTo(30, 5);
    });

    it('doubles elevation points for horizon-to-horizon passes', () => {
      const normal = scorePass(60_000, 25, 1500, false);
      const horizon = scorePass(60_000, 25, 1500, true);

      expect(horizon).toBeGreaterThan(normal);
    });

    it('clamps each component to its maximum', () => {
      // Very long, very high, very close pass cannot exceed 30.
      expect(scorePass(60 * 60 * 1000, 90, 10, false)).toBeCloseTo(30, 5);
    });
  });

  describe('emptyPassRow', () => {
    it('returns an all-null row', () => {
      const row = emptyPassRow();

      expect(Object.values(row).every((v) => v === null)).toBe(true);
    });
  });

  describe('findPassesForSat', () => {
    it('detects a single pass and fills its geometry', () => {
      const { passes, truncated } = findPassesForSat(
        '25544',
        fakeSatrec(0.0011),
        defaultSensor,
        { lengthDays: 0.01, intervalSec: 5 },
        buildDeps([[100_000, 200_000]]),
        'TestSensor',
      );

      expect(truncated).toBe(false);
      expect(passes).toHaveLength(1);

      const pass = passes[0];

      expect(pass.SATELLITE_ID).toBe('25544');
      expect(pass.SENSOR).toBe('TestSensor');
      expect(pass.MAXIMUM_ELEVATION).toBe('45.0');
      expect(pass.TIME_IN_COVERAGE_SECONDS).toBe(100);
      // Raw rows keep START_DTG numeric until normalized.
      expect(typeof pass.START_DTG).toBe('number');
      expect(pass.START_DATE).toBeInstanceOf(Date);
    });

    it('returns no passes when the satellite is never in view', () => {
      const { passes, truncated } = findPassesForSat(
        '25544',
        fakeSatrec(0.0011),
        defaultSensor,
        { lengthDays: 0.01, intervalSec: 5 },
        buildDeps([]),
      );

      expect(passes).toHaveLength(0);
      expect(truncated).toBe(false);
    });

    it('stops and flags truncation at the result cap', () => {
      // Large mean motion -> short orbital period -> small post-pass skip, so the
      // second window is reachable; maxResults: 1 cuts the run off after the first.
      const { passes, truncated } = findPassesForSat(
        '25544',
        fakeSatrec(4.19),
        defaultSensor,
        { lengthDays: 0.01, intervalSec: 5, maxResults: 1 },
        buildDeps([[100_000, 200_000], [300_000, 400_000]]),
      );

      expect(passes).toHaveLength(1);
      expect(truncated).toBe(true);
    });
  });

  describe('normalizePassRows', () => {
    it('stringifies the dtg, date, and time fields', () => {
      const start = new Date(BASE_MS);
      const stop = new Date(BASE_MS + 120_000);
      const row: lookanglesRow = {
        ...emptyPassRow(),
        START_DTG: start.getTime(),
        START_DATE: start,
        START_TIME: start,
        STOP_DATE: stop,
        STOP_TIME: stop,
      };
      const rows: lookanglesRow[] = [row];

      normalizePassRows(rows);

      expect(rows[0].START_DTG).toBe(start.toISOString());
      expect(rows[0].START_DATE).toBe('2025-01-01');
      expect(rows[0].START_TIME).toBe('00:00:00');
      expect(rows[0].STOP_TIME).toBe('00:02:00');
    });
  });
});
