import { InputManager } from '@app/engine/input/input-manager';
import { WGS84_A_KM, WGS84_B_KM } from '@app/engine/utils/constants';
import { Degrees, eci2lla, Kilometers, lla2ecef } from '@ootk/src/main';
import { vec3 } from 'gl-matrix';
import { vi } from 'vitest';

const camAt = (pos: [number, number, number]) => ({ getForwardVector: () => vec3.fromValues(...pos) }) as never;

/** Pick with the cursor ray from `cam` through `thru` (unProject stubbed). */
const pick = (cam: [number, number, number], thru: [number, number, number]) => {
  vi.spyOn(InputManager, 'unProject').mockReturnValue(thru);

  return InputManager.getEarthScreenPoint(100, 100, camAt(cam));
};

describe('InputManager.getEarthScreenPoint on the WGS84 ellipsoid', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('nadir pick at the equator returns r = a = 6378.137 km', () => {
    const p = pick([42164, 0, 0], [42000, 0, 0]);

    expect(Math.abs(p[0] - 6378.137)).toBeLessThan(1e-9);
    expect(p[1]).toBe(0);
    expect(p[2]).toBe(0);
  });

  it('nadir pick at the pole returns r = b = 6356.752 km', () => {
    const p = pick([0, 0, 20000], [0, 0, 19000]);

    expect(Math.abs(p[2] - WGS84_B_KM)).toBeLessThan(1e-9);
    expect(p[2]).toBeCloseTo(6356.752, 3);
    expect(Math.hypot(p[0], p[1])).toBe(0);
  });

  it('south pole pick from below', () => {
    const p = pick([0, 0, -9000], [0, 0, -8000]);

    expect(Math.abs(p[2] + WGS84_B_KM)).toBeLessThan(1e-9);
  });

  it.each([
    [0, 0],
    [45, 10],
    [-30, -120],
    [60, 170],
    [80, 45],
  ])('lat/lon %d, %d round-trips through an oblique pick within 1e-6 deg', (lat, lon) => {
    const ground = lla2ecef({ lat: lat as Degrees, lon: lon as Degrees, alt: 0 as Kilometers });
    // Camera 5000 km out along the geodetic normal and 4000 km east, so the ray is oblique and the point faces it
    const latR = (lat * Math.PI) / 180;
    const lonR = (lon * Math.PI) / 180;
    const n = [Math.cos(latR) * Math.cos(lonR), Math.cos(latR) * Math.sin(lonR), Math.sin(latR)];
    const east = [-Math.sin(lonR), Math.cos(lonR), 0];
    const cam: [number, number, number] = [ground.x + 5000 * n[0] + 4000 * east[0], ground.y + 5000 * n[1] + 4000 * east[1], ground.z + 5000 * n[2] + 4000 * east[2]];
    const p = pick(cam, [ground.x, ground.y, ground.z]);
    const lla = eci2lla({ x: p[0], y: p[1], z: p[2] } as never, 0);

    expect(Math.abs(lla.lat - lat)).toBeLessThan(1e-6);
    expect(Math.abs(lla.lon - lon)).toBeLessThan(1e-6);
    expect(Math.abs(lla.alt)).toBeLessThan(1e-6);
  });

  it('is not the old 6371 km sphere hit (equator is 7.137 km higher)', () => {
    const p = pick([0, 30000, 0], [0, 25000, 0]);

    expect(p[1] - 6371).toBeCloseTo(WGS84_A_KM - 6371, 9);
  });

  it('returns NaN when the ray misses the Earth', () => {
    const p = pick([42164, 0, 0], [42000, 7000, 0]);

    expect(p.every((c) => Number.isNaN(c))).toBe(true);
  });

  it('returns NaN when the Earth is behind the origin (both roots negative)', () => {
    expect(InputManager.intersectEarthEllipsoid([7000, 0, 0], [8000, 0, 0]).every((c) => Number.isNaN(c))).toBe(true);
  });

  it('returns NaN when the origin is inside the ellipsoid (near root negative)', () => {
    expect(InputManager.intersectEarthEllipsoid([1000, 0, 0], [2000, 0, 0]).every((c) => Number.isNaN(c))).toBe(true);
  });

  it('still returns the near hit for a ray from outside toward the Earth', () => {
    const p = InputManager.intersectEarthEllipsoid([7000, 0, 0], [6000, 0, 0]);

    expect(Math.abs(p[0] - 6378.137)).toBeLessThan(1e-9);
  });

  it('returns NaN for a zero-length ray', () => {
    expect(InputManager.intersectEarthEllipsoid([7000, 0, 0], [7000, 0, 0]).every((c) => Number.isNaN(c))).toBe(true);
  });

  it('still rejects undefined and NaN screen coordinates', () => {
    expect(() => InputManager.getEarthScreenPoint(undefined as never, 1, camAt([1, 0, 0]))).toThrow('x and y must be defined');
    expect(() => InputManager.getEarthScreenPoint(Number.NaN, 1, camAt([1, 0, 0]))).toThrow('x and y must be numbers');
  });
});
