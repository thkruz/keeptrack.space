import { OrbitMath } from '@app/engine/math/orbit-math';
import { Kilometers, TemeVec3 } from '@ootk/src/main';

/*
 * Pure orbital-element math that the existing orbit-math suite skipped or
 * left partially covered: the arctan2 quadrant helper, mean-anomaly, the
 * equatorial argument-of-perigee branch, and the full stateVector2Tle compose.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Math_ = OrbitMath as any;

describe('OrbitMath.arctan2 (private quadrant helper)', () => {
  const HALF_PI = Math.PI / 2;
  const TAU = 2 * Math.PI;

  it.each([
    ['Q1 (x>0,y>0)', 1, 1, Math.PI / 4],
    ['Q2 (x<0)', 1, -1, (3 * Math.PI) / 4],
    ['Q4 (x>0,y<0)', -1, 1, (7 * Math.PI) / 4],
    ['+y axis (x=0,y>0)', 1, 0, HALF_PI],
    ['-y axis (x=0,y<0)', -1, 0, -HALF_PI],
    ['origin (x=0,y=0)', 0, 0, 0],
  ])('%s', (_label, y, x, expected) => {
    expect(Math_.arctan2(y, x)).toBeCloseTo(expected, 6);
  });

  it('keeps Q4 results in [0, TAU)', () => {
    expect(Math_.arctan2(-1, 1)).toBeGreaterThan(0);
    expect(Math_.arctan2(-1, 1)).toBeLessThan(TAU);
  });
});

describe('OrbitMath.calculateMeanAnomaly', () => {
  // ISS-like state vector from the existing orbit-math fixture.
  const position = [-1220.0537109375, -7397.359375, -4922.09423828125];
  const velocity = [6.511194705963135, 0.44591981172561646, -0.15588419139385223];

  it('returns a finite mean anomaly in degrees', () => {
    const m = OrbitMath.calculateMeanAnomaly(position, velocity);

    expect(Number.isFinite(m)).toBe(true);
    expect(Math.abs(m)).toBeLessThanOrEqual(360);
  });
});

describe('OrbitMath.calculateArgumentOfPerigee', () => {
  it('handles an equatorial orbit (inclination ~ 0)', () => {
    // z-components zero -> orbit lies in the equatorial plane.
    const argPe = OrbitMath.calculateArgumentOfPerigee([7000, 0, 0], [0, 7.5, 0]);

    expect(Number.isFinite(argPe)).toBe(true);
    expect(argPe).toBeGreaterThanOrEqual(0);
    expect(argPe).toBeLessThan(360);
  });
});

describe('OrbitMath.stateVector2Tle', () => {
  it('composes a valid-shaped TLE pair from a state vector', () => {
    const sv = {
      position: { x: -1220.05 as Kilometers, y: -7397.36 as Kilometers, z: -4922.09 as Kilometers } as TemeVec3,
      velocity: { x: 6.511 as Kilometers, y: 0.446 as Kilometers, z: -0.156 as Kilometers } as TemeVec3,
      date: new Date('2022-01-01T00:00:00Z'),
    };

    const { tle1, tle2 } = OrbitMath.stateVector2Tle(sv);

    expect(typeof tle1).toBe('string');
    expect(typeof tle2).toBe('string');
    expect(tle1.startsWith('1 ')).toBe(true);
    expect(tle2.startsWith('2 ')).toBe(true);
    // Both TLE lines are the canonical 69 characters.
    expect(tle1).toHaveLength(69);
    expect(tle2).toHaveLength(69);
  });
});
