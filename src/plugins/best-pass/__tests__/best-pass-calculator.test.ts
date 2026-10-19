import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { lookanglesRow } from '@app/engine/core/interfaces';
import { BestPassDeps, emptyPassRow, findPassesForSat, normalizePassRows, PassRae, scorePass } from '@app/plugins/best-pass/best-pass-calculator';
import { Degrees, ElevationMask, Kilometers, SatelliteRecord, SpaceObjectType } from '@ootk/src/main';
import { defaultSensor } from '@test/environment/apiMocks';

const BASE_MS = Date.UTC(2025, 0, 1, 0, 0, 0);

/** Fake satrec: only `no` (mean motion, rad/min) is read, to size the post-pass skip. */
const fakeSatrec = (no: number): SatelliteRecord => ({ no }) as unknown as SatelliteRecord;

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

      return inView(offsetMs) ? { az: 180, el: 45, rng: 1000 } : { az: 180, el: -10, rng: 2000 };
    },
    checkIsInView: (_sensor, rae) => (rae.el ?? -90) >= 0,
    sunEciKm: () => ({ x: 1.4e8, y: 0, z: 0 }) as ReturnType<BestPassDeps['sunEciKm']>,
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
        'TestSensor'
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
      const { passes, truncated } = findPassesForSat('25544', fakeSatrec(0.0011), defaultSensor, { lengthDays: 0.01, intervalSec: 5 }, buildDeps([]));

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
        buildDeps([
          [100_000, 200_000],
          [300_000, 400_000],
        ])
      );

      expect(passes).toHaveLength(1);
      expect(truncated).toBe(true);
    });
  });

  describe('findPassesForSat with a horizon mask', () => {
    /*
     * Analytic overhead pass over t in [0, 600] s (outside it the satellite is below the horizon):
     *   el(t) = 50 sin(pi t / 600)   (0 -> 50 -> 0 deg)
     *   az(t) = 0.3 t                (0 -> 180 deg)
     * Interpolated mask vertices (0,10) (45,10) (90,60) (135,10) (270,10); sensor minEl 10.
     * So mask = 10 everywhere except a tent peaking at 60 deg over az 90.
     *
     * Outer edges are minEl edges: el = 10 -> t = (600/pi) asin(0.2) = 38.4565 s and 561.5435 s,
     * so with a 1 s step the first in-view sample is t = 39 and the last is t = 561.
     * Inner edges: on az 45..90 (t 150..300) mask = 10 + (t - 150)/3. Solving
     * 50 sin(pi t/600) = 10 + (t - 150)/3 by bisection gives t1 = 267.884 s (az 80.37);
     * by symmetry about t = 300 (az 90) the re-emergence is t2 = 600 - t1 = 332.116 s.
     * With a 1 s step: pass 1 LOS at t = 267, pass 2 AOS at t = 333.
     */
    const MASK: ElevationMask[] = [0, 45, 90, 135, 270].map((az) => ({
      startAz: az as Degrees,
      stopAz: az as Degrees,
      minEl: (az === 90 ? 60 : 10) as Degrees,
    }));

    const maskedSensor = new DetailedSensor({
      objName: 'MASKED',
      lat: 0 as Degrees,
      lon: 0 as Degrees,
      alt: 0 as Kilometers,
      type: SpaceObjectType.OPTICAL,
      minAz: 0 as Degrees,
      maxAz: 360 as Degrees,
      minEl: 10 as Degrees,
      maxEl: 90 as Degrees,
      minRng: 0 as Kilometers,
      maxRng: 50000 as Kilometers,
      elevationMasks: MASK,
      interpolateMask: true,
    });

    const analyticDeps: BestPassDeps = {
      baseTimeMs: BASE_MS,
      getRae: (date): PassRae => {
        const t = (date.getTime() - BASE_MS) / 1000;

        if (t < 0 || t > 600) {
          return { az: 0, el: -10, rng: 3000 };
        }

        return { az: 0.3 * t, el: 50 * Math.sin((Math.PI * t) / 600), rng: 1000 };
      },
      checkIsInView: (sensor, rae) => sensor.isRaeInFov(rae.az as Degrees, rae.el as Degrees, rae.rng as Kilometers),
      sunEciKm: () => ({ x: 1.4e8, y: 0, z: 0 }) as ReturnType<BestPassDeps['sunEciKm']>,
    };

    const startSec = (row: lookanglesRow) => ((row.START_DATE as Date).getTime() - BASE_MS) / 1000;
    const stopSec = (row: lookanglesRow) => ((row.STOP_DATE as Date).getTime() - BASE_MS) / 1000;

    it('splits one overflight into two mask-limited passes around the masked azimuth', () => {
      // Real LEO-like mean motion (~5700 min period): without the fix the 3/4-orbit skip hides pass 2.
      const { passes } = findPassesForSat('25544', fakeSatrec(0.0011), maskedSensor, { lengthDays: 0.01, intervalSec: 1 }, analyticDeps);

      expect(passes).toHaveLength(2);
      expect(passes.every((p) => p.MASK_LIMITED === true)).toBe(true);

      // Hand-derived edges (see block comment), each within one 1 s step.
      expect(Math.abs(startSec(passes[0]) - 38.4565)).toBeLessThanOrEqual(1);
      expect(Math.abs(stopSec(passes[0]) - 267.884)).toBeLessThanOrEqual(1);
      expect(Math.abs(startSec(passes[1]) - 332.116)).toBeLessThanOrEqual(1);
      expect(Math.abs(stopSec(passes[1]) - 561.5435)).toBeLessThanOrEqual(1);

      // The gap is centred on t = 300 s, i.e. az 90 where the mask peaks.
      const gapCentre = (stopSec(passes[0]) + startSec(passes[1])) / 2;

      expect(Math.abs(gapCentre - 300)).toBeLessThanOrEqual(1);
    });

    it('reports one unflagged pass when the same overflight is unmasked', () => {
      const unmasked = new DetailedSensor({ ...maskedSensor, elevationMasks: undefined, interpolateMask: undefined });
      const { passes } = findPassesForSat('25544', fakeSatrec(0.0011), unmasked, { lengthDays: 0.01, intervalSec: 1 }, analyticDeps);

      expect(passes).toHaveLength(1);
      expect(passes[0].MASK_LIMITED).toBe(false);
      // Both edges are the minEl crossings 38.4565 s and 561.5435 s.
      expect(Math.abs(startSec(passes[0]) - 38.4565)).toBeLessThanOrEqual(1);
      expect(Math.abs(stopSec(passes[0]) - 561.5435)).toBeLessThanOrEqual(1);
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
