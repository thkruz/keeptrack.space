import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { findPassesForSat } from '@app/plugins/best-pass/best-pass-calculator';
import { workerCheckIsInView, workerGetRae } from '@app/webworker/shared/pass-worker-helpers';
import { Degrees, Kilometers, Sgp4, SpaceObjectType } from '@ootk/src/main';

/*
 * R02-S01 (persona QA, evaluator-checks.md): TRAIN-GEO is above 10 degrees at RIDGE and COAST for the whole
 * day (one 86400 s pass at each site, el about 13.5 / 15.4 deg); the LEO satellites never serve both sites.
 * The TLEs are copied from user-gap-analysis/fixtures/exercise-catalog.tle (epoch 2026-11-04T00:00:00Z);
 * the sites from fixtures/sites.csv. Propagation and in-view checks are the ones the best-pass worker runs.
 */
const GEO = ['1 99008U 26999A   26308.00000000  .00000000  00000-0  00000-0 0  9990', '2 99008   0.1000   0.0000 0001000   0.0000   0.0000  1.00273791    11'];
const LEO_A = ['1 99001U 26999A   26308.00000000  .00000000  00000-0  00000-0 0  9993', '2 99001  53.0000   0.0000 0010000   0.0000   0.0000 15.05490646    11'];

const BASE_MS = Date.UTC(2026, 10, 4, 0, 0, 0);
const DAY_MS = 86_400_000;

const site = (name: string, lat: number, lon: number, altM: number): DetailedSensor =>
  new DetailedSensor({
    objName: name,
    lat: lat as Degrees,
    lon: lon as Degrees,
    alt: (altM / 1000) as Kilometers,
    type: SpaceObjectType.OPTICAL,
    minAz: 0 as Degrees,
    maxAz: 360 as Degrees,
    minEl: 10 as Degrees,
    maxEl: 90 as Degrees,
    minRng: 0 as Kilometers,
    maxRng: 100000 as Kilometers,
  });

const RIDGE = site('RIDGE', 35, -106, 1500);
const COAST = site('COAST', -33, 18, 100);

const passesFor = (tle: string[], sensor: DetailedSensor) =>
  findPassesForSat(
    tle[0].slice(2, 7),
    Sgp4.createSatrec(tle[0], tle[1]),
    sensor,
    { lengthDays: 1, intervalSec: 60, includeClippedPasses: true },
    { baseTimeMs: BASE_MS, getRae: workerGetRae, checkIsInView: workerCheckIsInView, sunEciKm: () => ({ x: 1.4e8, y: 0, z: 0 }) as never },
    sensor.name
  ).passes;

describe('R02-S01 propagated with the real worker helpers', () => {
  it('TRAIN-GEO is one 86400 s clipped pass at RIDGE and at COAST, and the common window is the whole day', () => {
    const ridge = passesFor(GEO, RIDGE);
    const coast = passesFor(GEO, COAST);

    expect(ridge).toHaveLength(1);
    expect(coast).toHaveLength(1);

    for (const p of [ridge[0], coast[0]]) {
      expect((p.START_DATE as Date).getTime()).toBe(BASE_MS);
      expect((p.STOP_DATE as Date).getTime()).toBe(BASE_MS + DAY_MS);
      expect(p.TIME_IN_COVERAGE_SECONDS).toBe(86_400);
      expect(p.START_CLIPPED).toBe(true);
      expect(p.END_CLIPPED).toBe(true);
    }

    expect(Math.abs(Number(ridge[0].MAXIMUM_ELEVATION) - 13.5)).toBeLessThan(0.5);
    expect(Math.abs(Number(coast[0].MAXIMUM_ELEVATION) - 15.4)).toBeLessThan(0.5);

    const start = Math.max((ridge[0].START_DATE as Date).getTime(), (coast[0].START_DATE as Date).getTime());
    const stop = Math.min((ridge[0].STOP_DATE as Date).getTime(), (coast[0].STOP_DATE as Date).getTime());

    expect((stop - start) / 1000).toBe(86_400);
  });

  it('TRAIN-LEO-A has the keyed pass counts, no clipped flags and no overlap between the sites', () => {
    const ridge = passesFor(LEO_A, RIDGE);
    const coast = passesFor(LEO_A, COAST);

    expect(Math.abs(ridge.length - 5)).toBeLessThanOrEqual(1);
    expect(Math.abs(coast.length - 4)).toBeLessThanOrEqual(1);

    for (const p of [...ridge, ...coast]) {
      expect(p.START_CLIPPED).toBe(false);
      expect(p.END_CLIPPED).toBe(false);
    }

    const overlaps = ridge.filter((r) =>
      coast.some((c) => (r.START_DATE as Date).getTime() < (c.STOP_DATE as Date).getTime() && (c.START_DATE as Date).getTime() < (r.STOP_DATE as Date).getTime())
    );

    expect(overlaps).toHaveLength(0);
  });
});
