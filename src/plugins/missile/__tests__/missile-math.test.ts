import { Missile } from '@app/plugins/missile/missile-math';
import { Meters } from '@ootk/src/main';

/*
 * The Missile class is mostly a large ballistic-trajectory simulator wired to
 * the catalog, but its atmosphere/aero helpers are pure piecewise physics
 * models. They're private statics, reached here via a typed cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const M = Missile as any;

describe('Missile.calcPressure_', () => {
  it('returns sea-level pressure (~101325 Pa) at altitude 0', () => {
    expect(M.calcPressure_(0)).toBeCloseTo(101325, 0);
  });

  it('decreases monotonically with altitude and stays positive', () => {
    const p0 = M.calcPressure_(0);
    const p10k = M.calcPressure_(10000);
    const p50k = M.calcPressure_(50000);

    expect(p10k).toBeLessThan(p0);
    expect(p50k).toBeLessThan(p10k);
    expect(p50k).toBeGreaterThan(0);
  });
});

describe('Missile.calcTemperature_ (US Standard Atmosphere piecewise)', () => {
  // inAlt is in meters; the model switches on altitude in km.
  it.each([
    ['troposphere (0 km)', 0, 276.642857143],
    ['tropopause (15 km)', 15_000, 213.0],
    ['stratosphere 1 (30 km)', 30_000, 171.224358974 + 2.05384615385 * 30],
    ['stratopause (50 km)', 50_000, 270.0],
    ['mesosphere 1 (60 km)', 60_000, 435.344405594 - 3.13916083916 * 60],
    ['mesopause (85 km)', 85_000, 183.0],
    ['thermosphere 1 (100 km)', 100_000, -221.111111111 + 4.47 * 100],
    ['thermosphere 2 (115 km)', 115_000, -894.0 + 10.6 * 115],
  ])('matches the curve fit for %s', (_label, meters, expected) => {
    expect(M.calcTemperature_(meters as Meters)).toBeCloseTo(expected, 4);
  });

  it('holds constant above 120 km', () => {
    const at120 = M.calcTemperature_(120_000 as Meters);
    const at200 = M.calcTemperature_(200_000 as Meters);

    expect(at200).toBe(at120);
    expect(at120).toBeCloseTo(-894.0 + 10.6 * 120, 4);
  });
});

describe('Missile.calcDragCoefficient_ (Mach-dependent)', () => {
  it('is the constant subsonic value below Mach 0.5', () => {
    expect(M.calcDragCoefficient_(0.2)).toBe(0.125);
  });

  it('is the constant high-supersonic value above Mach 3.625', () => {
    expect(M.calcDragCoefficient_(5)).toBe(0.25);
  });

  it.each([
    ['transonic (M=1.0)', 1.0],
    ['supersonic peak (M=1.4)', 1.4],
    ['supersonic (M=2.5)', 2.5],
  ])('returns a plausible drag coefficient for %s', (_label, mach) => {
    const cd = M.calcDragCoefficient_(mach);

    expect(Number.isFinite(cd)).toBe(true);
    expect(cd).toBeGreaterThan(0);
    expect(cd).toBeLessThan(1);
  });
});
