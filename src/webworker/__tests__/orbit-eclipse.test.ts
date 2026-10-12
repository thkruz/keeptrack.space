import { ECLIPSE_CYLINDER_RADIUS_KM, eclipseFactor } from '@app/webworker/orbit-eclipse';

/*
 * Expected values come from the cylinder geometry by hand: with the Sun along +X,
 * a point is shadowed when x < 0 and sqrt(y^2 + z^2) < 6378.1366 km.
 */
describe('eclipseFactor (cylindrical umbra)', () => {
  const sun = { x: 1, y: 0, z: 0 };
  const alpha = 0.35;

  it('uses the WGS84 equatorial radius for the cylinder', () => {
    expect(ECLIPSE_CYLINDER_RADIUS_KM).toBe(6378.1366);
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
    // along = -7000, offAxis = 6400 > 6378.1366
    expect(eclipseFactor({ x: -7000, y: 6400, z: 0 }, sun, alpha)).toBe(1);
  });

  it('dims a point just inside the cylinder', () => {
    // along = -7000, offAxis = 6300 < 6378.1366
    expect(eclipseFactor({ x: -7000, y: 6300, z: 0 }, sun, alpha)).toBe(alpha);
  });

  it('measures the off-axis distance in 3D, not just one plane', () => {
    // offAxis = sqrt(4500^2 + 4500^2) = 6363.96 < R -> shadow
    expect(eclipseFactor({ x: -7000, y: 4500, z: 4500 }, sun, alpha)).toBe(alpha);
    // offAxis = sqrt(4600^2 + 4600^2) = 6505.38 > R -> lit
    expect(eclipseFactor({ x: -7000, y: 4600, z: 4600 }, sun, alpha)).toBe(1);
  });

  it('works for an arbitrary Sun direction', () => {
    // Sun along +Y; point at (0, -7000, 0) is directly behind Earth.
    expect(eclipseFactor({ x: 0, y: -7000, z: 0 }, { x: 0, y: 1, z: 0 }, 0.5)).toBe(0.5);
  });
});
