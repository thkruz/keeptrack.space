import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { BestPassDeps, findPassesForSat, PassRae, scorePass } from '@app/plugins/best-pass/best-pass-calculator';
import { SatelliteRecord } from '@ootk/src/main';
import { defaultSensor } from '@test/environment/apiMocks';

const BASE_MS = Date.UTC(2026, 10, 4, 0, 0, 0);
const DAY_MS = 86_400_000;

/** Mean motion in rad/min for the persona fixtures: TRAIN-GEO (a = 42164.1696 km) and TRAIN-LEO (a = 6928.137 km). */
const GEO_NO = 0.004375269;
const LEO_NO = 0.065696;
const satrec = (no: number): SatelliteRecord => ({ no }) as unknown as SatelliteRecord;

/** In view (el 30) wherever the predicate is true, out of view otherwise. */
const depsWhere = (inView: (offsetMs: number) => boolean): BestPassDeps => ({
  baseTimeMs: BASE_MS,
  getRae: (date): PassRae => (inView(date.getTime() - BASE_MS) ? { az: 200, el: 30, rng: 36000 } : { az: 200, el: -10, rng: 40000 }),
  checkIsInView: (_sensor, rae) => (rae.el ?? -90) >= 0,
  sunEciKm: () => ({ x: 1.4e8, y: 0, z: 0 }) as ReturnType<BestPassDeps['sunEciKm']>,
});

const run = (no: number, inView: (offsetMs: number) => boolean, sensorName = 'RIDGE') =>
  findPassesForSat('TRAIN', satrec(no), defaultSensor as DetailedSensor, { lengthDays: 1, intervalSec: 60 }, depsWhere(inView), sensorName);

describe('best-pass window boundary passes', () => {
  it('(a) GEO in view for the whole window returns one row spanning the window', () => {
    const { passes } = run(GEO_NO, () => true);

    expect(passes).toHaveLength(1);
    expect((passes[0].START_DATE as Date).getTime()).toBe(BASE_MS);
    expect((passes[0].STOP_DATE as Date).getTime()).toBe(BASE_MS + DAY_MS);
    expect(passes[0].TIME_IN_COVERAGE_SECONDS).toBe(86_400);
    expect(passes[0].START_CLIPPED).toBe(true);
    expect(passes[0].END_CLIPPED).toBe(true);
  });

  it('(a) synthetic: GEO common window across two sensor names is the whole 24 h', () => {
    const ridge = run(GEO_NO, () => true, 'RIDGE').passes;
    const coast = run(GEO_NO, () => true, 'COAST').passes;

    expect(ridge).toHaveLength(1);
    expect(coast).toHaveLength(1);

    const start = Math.max((ridge[0].START_DATE as Date).getTime(), (coast[0].START_DATE as Date).getTime());
    const stop = Math.min((ridge[0].STOP_DATE as Date).getTime(), (coast[0].STOP_DATE as Date).getTime());

    expect(start).toBe(BASE_MS);
    expect((stop - start) / 1000).toBe(86_400);
  });

  it('(b) LEO in view at window start returns a row starting at the window start', () => {
    const { passes } = run(LEO_NO, (t) => t <= 300_000);

    expect(passes.length).toBeGreaterThanOrEqual(1);
    expect((passes[0].START_DATE as Date).getTime()).toBe(BASE_MS);
    expect((passes[0].STOP_DATE as Date).getTime()).toBe(BASE_MS + 300_000);
    expect(passes[0].START_CLIPPED).toBe(true);
    expect(passes[0].END_CLIPPED).toBe(false);
  });

  it('(c) LEO in view at window end returns a row ending at the window end', () => {
    const { passes } = run(LEO_NO, (t) => t >= DAY_MS - 300_000);

    expect(passes).toHaveLength(1);
    expect((passes[0].START_DATE as Date).getTime()).toBe(BASE_MS + DAY_MS - 300_000);
    expect((passes[0].STOP_DATE as Date).getTime()).toBe(BASE_MS + DAY_MS);
    expect(passes[0].START_CLIPPED).toBe(false);
    expect(passes[0].END_CLIPPED).toBe(true);
  });

  it('an interior pass is not flagged as clipped', () => {
    const { passes } = run(LEO_NO, (t) => t >= 100_000 && t <= 400_000);

    expect(passes).toHaveLength(1);
    expect(passes[0].START_CLIPPED).toBe(false);
    expect(passes[0].END_CLIPPED).toBe(false);
  });

  it('a one-step window with the object in view still returns a clipped row', () => {
    const { passes } = findPassesForSat(
      'TRAIN',
      satrec(GEO_NO),
      defaultSensor as DetailedSensor,
      { lengthDays: 60 / 86_400, intervalSec: 60 },
      depsWhere(() => true)
    );

    expect(passes).toHaveLength(1);
    expect(passes[0].START_CLIPPED).toBe(true);
    expect(passes[0].END_CLIPPED).toBe(true);
  });

  it('does not award the horizon-to-horizon bonus to a low pass clipped at both window edges', () => {
    const low: BestPassDeps = { ...depsWhere(() => true), getRae: (): PassRae => ({ az: 200, el: 2, rng: 1500 }) };
    const { passes } = findPassesForSat('TRAIN', satrec(GEO_NO), defaultSensor as DetailedSensor, { lengthDays: 1, intervalSec: 60 }, low);

    expect(passes[0].PASS_SCORE).toBe(scorePass(DAY_MS, 2, 1500, false).toFixed(1));
  });
  it('N1: an end-clipped rising pass never reports Max El below Stop El or Min Rng above Stop Rng', () => {
    const rising: BestPassDeps = {
      ...depsWhere(() => true),
      getRae: (date): PassRae => {
        const t = date.getTime() - BASE_MS;

        if (t < DAY_MS - 300_000) {
          return { az: 200, el: -10, rng: 40000 };
        }

        return { az: 200, el: 10 + ((t - (DAY_MS - 300_000)) / 300_000) * 40, rng: 2000 - ((t - (DAY_MS - 300_000)) / 300_000) * 500 };
      },
    };
    const { passes } = findPassesForSat('TRAIN', satrec(LEO_NO), defaultSensor as DetailedSensor, { lengthDays: 1, intervalSec: 60 }, rising);

    expect(passes).toHaveLength(1);
    expect(passes[0].END_CLIPPED).toBe(true);
    expect(Number(passes[0].MAXIMUM_ELEVATION)).toBeGreaterThanOrEqual(Number(passes[0].STOP_ELEVATION));
    expect(Number(passes[0].MINIMUM_RANGE)).toBeLessThanOrEqual(Number(passes[0].STOP_RANGE));
    expect(passes[0].MAXIMUM_ELEVATION_DTG).toBe(BASE_MS + DAY_MS);
  });

  it('N2: a contact seen only at the last sample yields no zero-length row', () => {
    const { passes } = run(LEO_NO, (t) => t >= DAY_MS - 60_000 && t < DAY_MS);

    expect(passes).toHaveLength(0);
  });
});
