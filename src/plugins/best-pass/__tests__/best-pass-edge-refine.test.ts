import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { BestPassDeps, findPassesForSat, PassRae } from '@app/plugins/best-pass/best-pass-calculator';
import { SatelliteRecord } from '@ootk/src/main';
import { defaultSensor } from '@test/environment/apiMocks';

const BASE_MS = Date.UTC(2026, 10, 4, 0, 0, 0);
const LEO_NO = 0.065696;
const TRUE_RISE = 1_000_400;
const TRUE_SET = 1_300_700;

const deps: BestPassDeps = {
  baseTimeMs: BASE_MS,
  getRae: (date): PassRae => {
    const t = date.getTime() - BASE_MS;

    return t >= TRUE_RISE && t <= TRUE_SET ? { az: 200, el: 30, rng: 36000 } : { az: 200, el: -10, rng: 40000 };
  },
  checkIsInView: (_sensor, rae) => (rae.el ?? -90) >= 0,
  sunEciKm: () => ({ x: 1.4e8, y: 0, z: 0 }) as ReturnType<BestPassDeps['sunEciKm']>,
};

const run = (edgeRefineMs?: number) =>
  findPassesForSat(
    'TRAIN',
    { no: LEO_NO } as unknown as SatelliteRecord,
    defaultSensor as DetailedSensor,
    { lengthDays: 1, intervalSec: 60, includeClippedPasses: true, edgeRefineMs },
    deps,
    'RIDGE'
  ).passes;

describe('best-pass edge refinement', () => {
  it('bisects AOS and LOS to within 1 s of the true edges', () => {
    const [p] = run();

    expect(Math.abs((p.START_DATE as Date).getTime() - (BASE_MS + TRUE_RISE))).toBeLessThanOrEqual(1000);
    expect(Math.abs((p.STOP_DATE as Date).getTime() - (BASE_MS + TRUE_SET))).toBeLessThanOrEqual(1000);
  });

  it('edgeRefineMs 0 keeps the coarse sample edges', () => {
    const [p] = run(0);

    expect((p.START_DATE as Date).getTime()).toBe(BASE_MS + 1_020_000);
    expect((p.STOP_DATE as Date).getTime()).toBe(BASE_MS + 1_260_000);
  });

  it.each([0.5, Number.NaN, Number.POSITIVE_INFINITY, -5])('edgeRefineMs %s disables refinement and terminates', (ms) => {
    const [p] = run(ms);

    expect((p.START_DATE as Date).getTime()).toBe(BASE_MS + 1_020_000);
    expect((p.STOP_DATE as Date).getTime()).toBe(BASE_MS + 1_260_000);
  });

  it('keeps refined edges inside the search window when not clipping', () => {
    const edgeDeps: BestPassDeps = { ...deps, getRae: (): PassRae => ({ az: 200, el: 30, rng: 36000 }) };
    const passes = findPassesForSat(
      'TRAIN',
      { no: LEO_NO } as unknown as SatelliteRecord,
      defaultSensor as DetailedSensor,
      { lengthDays: 1, intervalSec: 60, includeClippedPasses: false },
      edgeDeps,
      'RIDGE'
    ).passes;

    for (const p of passes) {
      expect((p.START_DATE as Date).getTime()).toBeGreaterThanOrEqual(BASE_MS);
      expect((p.STOP_DATE as Date).getTime()).toBeLessThanOrEqual(BASE_MS + 86_400_000);
    }
  });
});
