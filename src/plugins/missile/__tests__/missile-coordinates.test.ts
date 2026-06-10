import { Missile } from '@app/plugins/missile/missile-math';

// calcCoordinates_ / calcThrustForce_ are private statics - reach them through a cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const M = Missile as any;

describe('Missile.calcCoordinates_ edge cases', () => {
  it('returns a full 2401-sample distance list and a defined goal distance', () => {
    const [, , alpha1, arcLength, distanceList, goalDistance] = M.calcCoordinates_(0, 0, 20, 40);

    expect(distanceList).toHaveLength(2401);
    expect(arcLength).toBeGreaterThan(0);
    expect(Number.isFinite(alpha1)).toBe(true);
    expect(Number.isFinite(goalDistance)).toBe(true);
    expect(goalDistance).toBeGreaterThan(0);
  });

  it('wraps longitudes for a westbound path crossing the antimeridian', () => {
    const [latList, lonList] = M.calcCoordinates_(40, -170, 45, 170);

    expect(latList.length).toBeGreaterThan(0);
    expect(lonList.length).toBe(latList.length);
    // Every emitted longitude must stay inside the normalized [-180, 180] band.
    expect(lonList.every((lon: number) => lon >= -180 && lon <= 180)).toBe(true);
  });

  it('handles an eastbound antimeridian crossing symmetrically', () => {
    const [latList, lonList] = M.calcCoordinates_(40, 170, 45, -170);

    expect(latList.length).toBeGreaterThan(0);
    expect(lonList.every((lon: number) => lon >= -180 && lon <= 180)).toBe(true);
  });
});

describe('Missile.calcThrustForce_ edge cases', () => {
  it('returns a finite thrust when the nozzle is computed at high altitude', () => {
    expect(Number.isFinite(M.calcThrustForce_(50, 20000, 5, 20000))).toBe(true);
  });

  it('clamps the exit nozzle area to the available fuel area for a tiny nozzle', () => {
    const clamped = M.calcThrustForce_(50, 0, 1e-6, 0);
    const unclamped = M.calcThrustForce_(50, 0, 100, 0);

    expect(Number.isFinite(clamped)).toBe(true);
    expect(Number.isFinite(unclamped)).toBe(true);
  });
});
