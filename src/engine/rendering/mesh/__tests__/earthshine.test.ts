import { describe, expect, it } from 'vitest';
import { computeEarthshine, EARTH_RADIUS_KM } from '../earthshine';

const SUN = [1, 0, 0];

describe('computeEarthshine', () => {
  it('is strongest over the subsolar point and points at the Earth centre', () => {
    const e = computeEarthshine([EARTH_RADIUS_KM + 500, 0, 0], SUN, 1);

    expect(e.strength).toBeGreaterThan(0.3);
    expect(e.direction[0]).toBeCloseTo(-1, 6);
  });

  it('falls with altitude', () => {
    const low = computeEarthshine([EARTH_RADIUS_KM + 500, 0, 0], SUN, 1).strength;
    const high = computeEarthshine([EARTH_RADIUS_KM + 20000, 0, 0], SUN, 1).strength;

    expect(high).toBeLessThan(low * 0.2);
    expect(high).toBeGreaterThan(0);
  });

  it('falls with the Sun angle at the nadir point and is zero on the night side', () => {
    const r = EARTH_RADIUS_KM + 500;
    const at = (deg: number) => computeEarthshine([r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180), 0], SUN, 1);

    expect(at(0).strength).toBeGreaterThanOrEqual(at(60).strength);
    expect(at(60).strength).toBeGreaterThan(at(80).strength);
    expect(at(80).strength).toBeGreaterThan(at(90).strength);
    expect(at(90).strength).toBeGreaterThan(0);
    expect(at(120).strength).toBe(0);
    expect(at(180).strength).toBe(0);
  });

  it('is warmer over the terminator than over the subsolar point', () => {
    const r = EARTH_RADIUS_KM + 500;
    const noon = computeEarthshine([r, 0, 0], SUN, 1).color;
    const dusk = computeEarthshine([0, r, 0], SUN, 1).color;

    expect(dusk[0] / dusk[2]).toBeGreaterThan(noon[0] / noon[2]);
  });

  it('is zero for gain 0, non-Earth objects and a position at the origin', () => {
    expect(computeEarthshine([EARTH_RADIUS_KM + 500, 0, 0], SUN, 0).strength).toBe(0);
    expect(computeEarthshine([0, 0, 0], [0, 0, 0], 0).strength).toBe(0);
    expect(computeEarthshine([0, 0, 0], SUN, 1).strength).toBe(0);
  });

  it('scales linearly with the gain', () => {
    const one = computeEarthshine([EARTH_RADIUS_KM + 500, 0, 0], SUN, 1).strength;
    const two = computeEarthshine([EARTH_RADIUS_KM + 500, 0, 0], SUN, 2).strength;

    expect(two).toBeCloseTo(one * 2, 8);
  });
});
