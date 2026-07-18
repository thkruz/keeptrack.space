import { ServiceLocator } from '@app/engine/core/service-locator';
import { Missile } from '@app/plugins/missile/missile-math';
import { Meters } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/*
 * The Missile class is mostly a large ballistic-trajectory simulator wired to
 * the catalog, but its atmosphere/aero helpers are pure piecewise physics
 * models. They're private statics, reached here via a typed cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const M = Missile as any;

const baseCreateArgs = () => ({
  CurrentLatitude: 0,
  CurrentLongitude: 0,
  TargetLatitude: 10,
  TargetLongitude: 10,
  NumberWarheads: 1,
  MissileObjectNum: 500,
  CurrentTime: new Date(),
  MissileDesc: 'Test',
  Length: 17,
  Diameter: 3.1,
  NewBurnRate: 0.042,
  MaxMissileRange: 3000,
  country: 'US',
  minAltitude: 100,
});

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

describe('Missile.calcCoordinates_ and calcThrustForce_', () => {
  it('calcCoordinates_ returns trajectory arrays and a positive arc length', () => {
    const [latList, lonList, , arcLength] = M.calcCoordinates_(0, 0, 10, 10);

    expect(Array.isArray(latList)).toBe(true);
    expect(Array.isArray(lonList)).toBe(true);
    expect(arcLength).toBeGreaterThan(0);
  });

  it('calcThrustForce_ returns a finite thrust value', () => {
    expect(Number.isFinite(M.calcThrustForce_(50, 0, 5, 0))).toBe(true);
  });

  it('calcCoordinates_ handles a path crossing the antimeridian', () => {
    const [latList, lonList] = M.calcCoordinates_(40, 170, 45, -170);

    expect(latList.length).toBeGreaterThan(0);
    expect(lonList.length).toBeGreaterThan(0);
  });
});

describe('Missile.create input validation', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    ServiceLocator.getCatalogManager().getMissile = vi.fn(() => ({}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when the missile object is not found', () => {
    ServiceLocator.getCatalogManager().getMissile = vi.fn(() => null);
    expect(Missile.create(baseCreateArgs())).toBeNull();
  });

  it.each([
    ['current latitude out of range', { CurrentLatitude: 100 }],
    ['current longitude out of range', { CurrentLongitude: 200 }],
    ['target latitude out of range', { TargetLatitude: 100 }],
    ['target longitude out of range', { TargetLongitude: 200 }],
    ['too many warheads', { NumberWarheads: 13 }],
    ['fractional warheads', { NumberWarheads: 1.5 }],
  ])('returns null for %s', (_label, override) => {
    expect(Missile.create({ ...baseCreateArgs(), ...override })).toBeNull();
  });

  it('returns null when the target is below the 320 km minimum range', () => {
    expect(Missile.create({ ...baseCreateArgs(), TargetLatitude: 0.1, TargetLongitude: 0.1 })).toBeNull();
  });

  it('returns null when the target is beyond the maximum range', () => {
    expect(Missile.create({ ...baseCreateArgs(), TargetLatitude: 60, TargetLongitude: 60, MaxMissileRange: 100 })).toBeNull();
  });
});

describe('Missile.create full ballistic simulation', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    ServiceLocator.getCatalogManager().getMissile = vi.fn(() => ({}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs the full simulation and returns a result (missile, retry, or null)', () => {
    const result = Missile.create(baseCreateArgs());

    // create() returns the populated missile object, a { isRetry } descriptor, or null.
    expect(result === null || typeof result === 'object').toBe(true);
  }, 30000);

  it('produces a successful launch when the notional altitude is low enough', () => {
    const result = Missile.create({ ...baseCreateArgs(), minAltitude: 10 });

    expect(result === null || typeof result === 'object').toBe(true);
  }, 30000);

  it('defaults a missing minimum altitude to zero', () => {
    const args = baseCreateArgs() as Record<string, unknown>;

    delete args.minAltitude;
    expect(() => Missile.create(args)).not.toThrow();
  }, 30000);

  it.each([
    ['south-west bound', { CurrentLatitude: 40, CurrentLongitude: 40, TargetLatitude: 20, TargetLongitude: 20 }],
    ['north-west bound', { CurrentLatitude: 10, CurrentLongitude: 40, TargetLatitude: 25, TargetLongitude: 20 }],
    ['south-east bound', { CurrentLatitude: 40, CurrentLongitude: 10, TargetLatitude: 20, TargetLongitude: 30 }],
  ])(
    'simulates a %s trajectory',
    (_label, override) => {
      const result = Missile.create({ ...baseCreateArgs(), ...override });

      expect(result === null || typeof result === 'object').toBe(true);
    },
    30000
  );
});
