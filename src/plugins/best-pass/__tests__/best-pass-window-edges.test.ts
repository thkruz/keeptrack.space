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
  findPassesForSat('TRAIN', satrec(no), defaultSensor as DetailedSensor, { lengthDays: 1, intervalSec: 60, includeClippedPasses: true }, depsWhere(inView), sensorName);

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
      { lengthDays: 60 / 86_400, intervalSec: 60, includeClippedPasses: true },
      depsWhere(() => true)
    );

    expect(passes).toHaveLength(1);
    expect(passes[0].START_CLIPPED).toBe(true);
    expect(passes[0].END_CLIPPED).toBe(true);
  });

  it('does not award the horizon-to-horizon bonus to a low pass clipped at both window edges', () => {
    const low: BestPassDeps = { ...depsWhere(() => true), getRae: (): PassRae => ({ az: 200, el: 2, rng: 1500 }) };
    const { passes } = findPassesForSat('TRAIN', satrec(GEO_NO), defaultSensor as DetailedSensor, { lengthDays: 1, intervalSec: 60, includeClippedPasses: true }, low);

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
    const { passes } = findPassesForSat('TRAIN', satrec(LEO_NO), defaultSensor as DetailedSensor, { lengthDays: 1, intervalSec: 60, includeClippedPasses: true }, rising);

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

describe('best-pass window boundary passes: default (no opt-in) path', () => {
  const runDefault = (no: number, inView: (offsetMs: number) => boolean) =>
    findPassesForSat('TRAIN', satrec(no), defaultSensor as DetailedSensor, { lengthDays: 1, intervalSec: 60 }, depsWhere(inView), 'RIDGE').passes;

  it('whole window in view returns no clipped row', () => {
    const passes = runDefault(GEO_NO, () => true);

    expect(passes).toHaveLength(0);
  });

  it('in view at window start: the first (clipped) contact is not reported as a pass starting at the window start', () => {
    const passes = runDefault(LEO_NO, (t) => t <= 300_000 || (t >= 3_600_000 && t <= 3_900_000));

    expect(passes.some((p) => p.START_CLIPPED === true || p.END_CLIPPED === true)).toBe(false);
    expect(passes.every((p) => (p.START_DATE as Date).getTime() > BASE_MS)).toBe(true);
    expect(passes).toHaveLength(1);
  });

  it('in view at window end: no row ends at the window end', () => {
    const passes = runDefault(LEO_NO, (t) => t >= DAY_MS - 300_000);

    expect(passes.some((p) => p.START_CLIPPED === true || p.END_CLIPPED === true)).toBe(false);
    expect(passes).toHaveLength(0);
  });

  /** Scripted look angles: a callback gives (el, rng) per offset, or null when out of view. */
  const scripted = (look: (offsetMs: number) => { el: number; rng: number } | null): BestPassDeps => ({
    baseTimeMs: BASE_MS,
    getRae: (date): PassRae => {
      const l = look(date.getTime() - BASE_MS);

      return l ? { az: 200, el: l.el, rng: l.rng } : { az: 200, el: -10, rng: 40000 };
    },
    checkIsInView: (_sensor, rae) => (rae.el ?? -90) >= 0,
    sunEciKm: () => ({ x: 1.4e8, y: 0, z: 0 }) as ReturnType<BestPassDeps['sunEciKm']>,
  });
  const runScripted = (look: (offsetMs: number) => { el: number; rng: number } | null, optIn: boolean, intervalSec = 60) =>
    findPassesForSat('TRAIN', satrec(LEO_NO), defaultSensor as DetailedSensor, { lengthDays: 1, intervalSec, includeClippedPasses: optIn }, scripted(look), 'RIDGE').passes;

  it('default path: a contact already in view before the window start does not leak into the later pass', () => {
    const look = (t: number) => {
      if (t >= -120_000 && t <= 60_000) {
        return { el: 60, rng: 1000 };
      }
      if (t >= 3_600_000 && t <= 3_720_000) {
        return { el: 30, rng: 3000 };
      }

      return null;
    };
    const def = runScripted(look, false);

    expect(def).toHaveLength(1);
    expect(def[0].MAXIMUM_ELEVATION).toBe('30.0');
    expect(def[0].MINIMUM_RANGE).toBe('3000');
  });

  it('default path: a window-start contact at el 60 does not leak into the later pass at el 30', () => {
    const look = (t: number) => {
      if (t === 0) {
        return { el: 60, rng: 1000 };
      }
      if (t >= 3_600_000 && t <= 3_720_000) {
        return { el: 30, rng: 3000 };
      }

      return null;
    };
    const def = runScripted(look, false);

    expect(def).toHaveLength(1);
    expect(def[0].MAXIMUM_ELEVATION).toBe('30.0');
    expect(def[0].MINIMUM_RANGE).toBe('3000');
  });

  it('default path: a dropped low contact does not give the next pass the horizon-to-horizon bonus', () => {
    // Lone contact at 10 min (el 2, dropped), then a pass at 1 h that rises at el 10 and sets at el 2.
    const pass = (t: number) => {
      if (t === 3_600_000) {
        return { el: 10, rng: 3000 };
      }
      if (t === 3_660_000) {
        return { el: 30, rng: 2000 };
      }
      if (t === 3_720_000) {
        return { el: 2, rng: 3500 };
      }

      return null;
    };
    const withDropped = runScripted((t) => (t === 600_000 ? { el: 2, rng: 3500 } : pass(t)), false);
    const alone = runScripted(pass, false);

    expect(alone).toHaveLength(1);
    expect(withDropped).toHaveLength(1);
    expect(withDropped[0].PASS_SCORE).toBe(alone[0].PASS_SCORE);
  });

  it('default path: a dropped low contact, then a pass that rises low and sets low, still gets the horizon-to-horizon bonus', () => {
    // Regression guard (passes on the current code): lone contact at 10 min (el 2, dropped), then a pass at 1 h that
    // rises at el 3 (<= 3.5) and sets at el 2. start3 is legitimately true, so the bonus applies as without the drop.
    const pass = (t: number) => {
      if (t === 3_600_000) {
        return { el: 3, rng: 3500 };
      }
      if (t === 3_660_000) {
        return { el: 30, rng: 2000 };
      }
      if (t === 3_720_000) {
        return { el: 2, rng: 3500 };
      }

      return null;
    };
    const withDropped = runScripted((t) => (t === 600_000 ? { el: 2, rng: 3500 } : pass(t)), false);
    const alone = runScripted(pass, false);
    const highStart = runScripted((t) => (t === 3_600_000 ? { el: 10, rng: 3000 } : pass(t)), false);

    expect(alone).toHaveLength(1);
    expect(withDropped).toHaveLength(1);
    expect(withDropped[0].PASS_SCORE).toBe(alone[0].PASS_SCORE);
    expect(highStart).toHaveLength(1);
    expect(Number(withDropped[0].PASS_SCORE)).toBeGreaterThan(Number(highStart[0].PASS_SCORE));
  });

  it('rising edge: a lone earlier contact does not leak its peak into the next pass on either path', () => {
    // Lone contact at 10 min (el 60), then a 3-sample pass at 1 h (el 30).
    const look = (t: number) => {
      if (t === 600_000) {
        return { el: 60, rng: 1000 };
      }
      if (t >= 3_600_000 && t <= 3_720_000) {
        return { el: 30, rng: 3000 };
      }

      return null;
    };
    const def = runScripted(look, false);
    const opt = runScripted(look, true);

    expect(def).toHaveLength(1);
    expect(def[0].MAXIMUM_ELEVATION).toBe('30.0');
    expect(def[0].MINIMUM_RANGE).toBe('3000');
    expect(opt).toHaveLength(1);
    expect(opt[0].MAXIMUM_ELEVATION).toBe('30.0');
    expect(opt[0].MINIMUM_RANGE).toBe('3000');
  });

  it('falling edge: default ignores the last in-view sample for max elevation and min range; opt-in folds it in', () => {
    // Samples at 1 h, +60 s, +120 s (last in view, el 50, rng 900).
    const samples = new Map<number, { el: number; rng: number }>([
      [3_600_000, { el: 20, rng: 5000 }],
      [3_660_000, { el: 30, rng: 4000 }],
      [3_720_000, { el: 50, rng: 900 }],
    ]);
    const look = (t: number) => samples.get(t) ?? null;
    const def = runScripted(look, false);
    const opt = runScripted(look, true);

    expect(def).toHaveLength(1);
    expect(def[0].MAXIMUM_ELEVATION).toBe('30.0');
    expect(def[0].MINIMUM_RANGE).toBe('4000');
    expect(opt).toHaveLength(1);
    expect(opt[0].MAXIMUM_ELEVATION).toBe('50.0');
    expect(opt[0].MINIMUM_RANGE).toBe('900');
  });

  it('look-ahead is not clamped to the window end by default', () => {
    // 70 s interval does not divide the day; last sample is 86 380 s and its unclamped look-ahead (86 450 s) is out of view.
    const look = (t: number) => (t >= DAY_MS - 300_000 && t <= DAY_MS ? { el: 30, rng: 36000 } : null);
    const def = runScripted(look, false, 70);

    expect(def).toHaveLength(1);
    // LOS is bisected from the last in-view sample (86 380 s) toward the true edge (86 400 s), within 1 s.
    expect(Math.abs((def[0].STOP_DATE as Date).getTime() - (BASE_MS + 86_400_000))).toBeLessThanOrEqual(1000);
    expect(def[0].END_CLIPPED).toBeUndefined();
  });

  it('opting in returns the clipped rows for the same inputs', () => {
    const passes = findPassesForSat(
      'TRAIN',
      satrec(GEO_NO),
      defaultSensor as DetailedSensor,
      { lengthDays: 1, intervalSec: 60, includeClippedPasses: true },
      depsWhere(() => true)
    ).passes;

    expect(passes).toHaveLength(1);
    expect(passes[0].START_CLIPPED).toBe(true);
  });
});
