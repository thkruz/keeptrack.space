import { SatMath, SunStatus } from '@app/app/analysis/sat-math';
import { SensorMath } from '@app/app/sensors/sensor-math';
import { Kilometers, KilometersPerSecond, Satellite, SpaceObjectType, TemeVec3 } from '@ootk/src/main';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { vi } from 'vitest';

/*
 * Pure-ish SensorMath helpers: the optical-visibility predicate (mocked sun
 * status for determinism) and the distance/velocity string builders, including
 * their early-return guard branches.
 */
describe('SensorMath.checkIfVisibleForOptical', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is visible when the ground station is in shadow and the satellite is sunlit', () => {
    // First call = station status, second = satellite status.
    vi.spyOn(SatMath, 'calculateIsInSun').mockReturnValueOnce(SunStatus.UMBRAL).mockReturnValueOnce(SunStatus.SUN);

    expect(SensorMath.checkIfVisibleForOptical(defaultSat, defaultSensor, new Date('2022-01-01T00:00:00Z'))).toBe(true);
  });

  it('is NOT visible when the station is also sunlit', () => {
    vi.spyOn(SatMath, 'calculateIsInSun').mockReturnValueOnce(SunStatus.SUN).mockReturnValueOnce(SunStatus.SUN);

    expect(SensorMath.checkIfVisibleForOptical(defaultSat, defaultSensor, new Date('2022-01-01T00:00:00Z'))).toBe(false);
  });

  it('is NOT visible when the satellite is itself in shadow', () => {
    vi.spyOn(SatMath, 'calculateIsInSun').mockReturnValueOnce(SunStatus.PENUMBRAL).mockReturnValueOnce(SunStatus.UMBRAL);

    expect(SensorMath.checkIfVisibleForOptical(defaultSat, defaultSensor, new Date('2022-01-01T00:00:00Z'))).toBe(false);
  });
});

describe('SensorMath.distanceString', () => {
  const withPos = (pos: TemeVec3): Satellite => {
    const sat = defaultSat.clone() as Satellite;

    sat.position = pos;

    return sat;
  };

  it('returns "" when the secondary object is missing', () => {
    expect(SensorMath.distanceString(defaultSat)).toBe('');
  });

  it('returns "" when either object is a star', () => {
    const star = withPos({ x: 0 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers });

    star.type = SpaceObjectType.STAR;

    expect(SensorMath.distanceString(star, withPos({ x: 10 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers }))).toBe('');
  });

  it('reports the linear range between two positioned objects', () => {
    const a = withPos({ x: 0 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers });
    const b = withPos({ x: 100 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers });

    expect(SensorMath.distanceString(a, b)).toContain('Range: 100.00 km');
  });
});

describe('SensorMath.velocityString', () => {
  const withVel = (vel: TemeVec3<KilometersPerSecond>): Satellite => {
    const sat = defaultSat.clone() as Satellite;

    sat.velocity = vel;

    return sat;
  };

  it('returns "" when the secondary object is missing', () => {
    expect(SensorMath.velocityString(defaultSat)).toBe('');
  });

  it('returns "" when either object is a star', () => {
    const star = withVel({ x: 0 as KilometersPerSecond, y: 0 as KilometersPerSecond, z: 0 as KilometersPerSecond });

    star.type = SpaceObjectType.STAR;

    expect(SensorMath.velocityString(star, defaultSat)).toBe('');
  });

  it('reports the relative velocity between two objects', () => {
    const a = withVel({ x: 0 as KilometersPerSecond, y: 0 as KilometersPerSecond, z: 0 as KilometersPerSecond });
    const b = withVel({ x: 3 as KilometersPerSecond, y: 4 as KilometersPerSecond, z: 0 as KilometersPerSecond });

    expect(SensorMath.velocityString(a, b)).toMatch(/Relative velocity: [\d.]+ km\/s/u);
  });
});
