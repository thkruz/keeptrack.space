import { ECLIPSE_CYLINDER_RADIUS_KM, ECLIPSE_POLAR_RADIUS_KM, eclipseFactor } from '@app/webworker/orbit-eclipse';

/*
 * Expected values come from the cylinder geometry by hand: with the Sun along +X,
 * a point is shadowed when x < 0 and sqrt(y^2 + (z * a/b)^2) < a, a = 6378.137 km,
 * b = 6356.752 km (WGS84 ellipsoid, row EC1).
 */
describe('eclipseFactor (cylindrical umbra)', () => {
  const sun = { x: 1, y: 0, z: 0 };
  const alpha = 0.35;

  it('uses the WGS84 semi-axes for the cylinder', () => {
    expect(ECLIPSE_CYLINDER_RADIUS_KM).toBe(6378.137);
    expect(ECLIPSE_POLAR_RADIUS_KM).toBeCloseTo(6356.752314, 6);
  });

  it('narrows the shadow over the poles to the polar semi-axis b', () => {
    // Sun along +X: the shadow edge in the x = const plane is the ellipse (y/a)^2 + (z/b)^2 = 1.
    // z = 6350 < b -> shadow; z = 6360 > b (inside the old 6378 km sphere cylinder) -> lit.
    expect(eclipseFactor({ x: -7000, y: 0, z: 6350 }, sun, alpha)).toBe(alpha);
    expect(eclipseFactor({ x: -7000, y: 0, z: 6360 }, sun, alpha)).toBe(1);
  });

  it('keeps the equatorial radius a for a Sun over the pole', () => {
    // Sun along +Z: the shadow cross-section is the equatorial circle of radius a.
    const sunZ = { x: 0, y: 0, z: 1 };

    expect(eclipseFactor({ x: 6370, y: 0, z: -7000 }, sunZ, alpha)).toBe(alpha);
    expect(eclipseFactor({ x: 6380, y: 0, z: -7000 }, sunZ, alpha)).toBe(1);
    expect(eclipseFactor({ x: 6370, y: 0, z: 7000 }, sunZ, alpha)).toBe(1);
  });

  it('dims a point directly behind Earth', () => {
    // along = -7000 < 0, offAxis = 0 < R
    expect(eclipseFactor({ x: -7000, y: 0, z: 0 }, sun, alpha)).toBe(alpha);
  });

  it('leaves a point on the sunlit side bright', () => {
    // along = +7000 >= 0
    expect(eclipseFactor({ x: 7000, y: 0, z: 0 }, sun, alpha)).toBe(1);
  });

  it('leaves a point just outside the cylinder bright', () => {
    // along = -7000, offAxis = 6400 > 6378.137
    expect(eclipseFactor({ x: -7000, y: 6400, z: 0 }, sun, alpha)).toBe(1);
  });

  it('dims a point just inside the cylinder', () => {
    // along = -7000, offAxis = 6300 < 6378.137
    expect(eclipseFactor({ x: -7000, y: 6300, z: 0 }, sun, alpha)).toBe(alpha);
  });

  it('measures the off-axis distance in 3D, not just one plane', () => {
    // scaled offAxis = sqrt(4500^2 + (4500 * a/b)^2) = 6374.67 < a -> shadow
    expect(eclipseFactor({ x: -7000, y: 4500, z: 4500 }, sun, alpha)).toBe(alpha);
    // scaled offAxis = sqrt(4600^2 + (4600 * a/b)^2) = 6516.33 > a -> lit
    expect(eclipseFactor({ x: -7000, y: 4600, z: 4600 }, sun, alpha)).toBe(1);
  });

  it('works for an arbitrary Sun direction', () => {
    // Sun along +Y; point at (0, -7000, 0) is directly behind Earth.
    expect(eclipseFactor({ x: 0, y: -7000, z: 0 }, { x: 0, y: 1, z: 0 }, 0.5)).toBe(0.5);
  });
});
