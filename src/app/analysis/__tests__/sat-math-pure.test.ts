import { SatMath } from '@app/app/analysis/sat-math';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { Degrees, GreenwichMeanSiderealTime, Kilometers, TemeVec3 } from '@ootk/src/main';

/*
 * Pure numeric helpers in SatMath that had no direct coverage. These take
 * plain numbers/vectors and return numbers/booleans, so no ServiceLocator or
 * propagation mocking is required.
 */
describe('SatMath.sunSatEarthAngle', () => {
  const sun = { x: 1.5e8 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers };

  it('is ~180 deg when the satellite sits between Earth and the Sun', () => {
    const sat = { x: 7000 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers };

    expect(SatMath.sunSatEarthAngle(sat, sun)).toBeCloseTo(180, 1);
  });

  it('is ~0 deg when the satellite is on the far side of Earth from the Sun', () => {
    const sat = { x: -7000 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers };

    expect(SatMath.sunSatEarthAngle(sat, sun)).toBeCloseTo(0, 1);
  });

  it('returns NaN at the origin (degenerate Earth vector)', () => {
    const sat = { x: 0 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers };

    expect(SatMath.sunSatEarthAngle(sat, sun)).toBeNaN();
  });
});

describe('SatMath.checkIsInView', () => {
  // Simple sensor: az 0-180, el 10-80, rng 200-5000, no secondary FOV.
  const sensor = {
    minAz: 0,
    maxAz: 180,
    minEl: 10,
    maxEl: 80,
    minRng: 200,
    maxRng: 5000,
  } as DetailedSensor;

  it('returns false when any RAE component is null', () => {
    expect(SatMath.checkIsInView(sensor, { az: null, el: 20 as Degrees, rng: 1000 as Kilometers })).toBe(false);
  });

  it('returns true for a target inside all bounds', () => {
    expect(SatMath.checkIsInView(sensor, { az: 90 as Degrees, el: 45 as Degrees, rng: 1000 as Kilometers })).toBe(true);
  });

  it.each([
    ['azimuth', { az: 270 as Degrees, el: 45 as Degrees, rng: 1000 as Kilometers }],
    ['elevation', { az: 90 as Degrees, el: 5 as Degrees, rng: 1000 as Kilometers }],
    ['range', { az: 90 as Degrees, el: 45 as Degrees, rng: 9000 as Kilometers }],
  ])('returns false when %s is out of bounds', (_label, rae) => {
    expect(SatMath.checkIsInView(sensor, rae)).toBe(false);
  });

  it('handles a sensor whose azimuth wraps past north (minAz > maxAz)', () => {
    const wrap = {
      minAz: 350,
      maxAz: 10,
      minEl: 10,
      maxEl: 80,
      minRng: 200,
      maxRng: 5000,
    } as DetailedSensor;

    // 355 is inside the wrapped arc [350..360]∪[0..10]; 180 is outside.
    expect(SatMath.checkIsInView(wrap, { az: 355 as Degrees, el: 45 as Degrees, rng: 1000 as Kilometers })).toBe(true);
    expect(SatMath.checkIsInView(wrap, { az: 180 as Degrees, el: 45 as Degrees, rng: 1000 as Kilometers })).toBe(false);
  });
});

describe('SatMath.getAlt', () => {
  const gmst = 0 as GreenwichMeanSiderealTime;

  it('subtracts a supplied radius from the position magnitude', () => {
    const pos = { x: 7000 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers } as TemeVec3;

    expect(SatMath.getAlt(pos, gmst, 6371 as Kilometers)).toBeCloseTo(629, 5);
  });

  it('returns 0 for a NaN position rather than propagating NaN', () => {
    const pos = { x: NaN as unknown as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers } as TemeVec3;

    expect(SatMath.getAlt(pos, gmst, 0 as Kilometers)).toBe(0);
  });

  it('falls back to the ellipsoid model (eci2lla) when no radius is given', () => {
    const pos = { x: 7000 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers } as TemeVec3;
    const alt = SatMath.getAlt(pos, gmst);

    expect(alt).toBeGreaterThan(600);
    expect(alt).toBeLessThan(700);
  });
});

describe('SatMath.mag2db', () => {
  it('returns NaN for a non-positive magnitude', () => {
    expect(SatMath.mag2db(0)).toBeNaN();
    expect(SatMath.mag2db(-5)).toBeNaN();
  });

  it('returns a finite value for a positive magnitude', () => {
    expect(Number.isFinite(SatMath.mag2db(10))).toBe(true);
  });
});
