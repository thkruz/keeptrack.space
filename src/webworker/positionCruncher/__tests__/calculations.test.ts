import { createLatLonAlt, createLatLonAltRad, isInValidElevation, propTime, setupTimeVariables } from '@app/webworker/positionCruncher/calculations';
import { Degrees, GroundStation, Kilometers, Radians, RaeVec3, SpaceObjectType } from '@ootk/src/main';

const RAD2DEG = 180 / Math.PI;

describe('positionCruncher calculations', () => {
  describe('propTime', () => {
    it('returns the dynamic epoch when staticOffset and propRate are 0', () => {
      const epoch = Date.UTC(2022, 0, 1, 0, 0, 0);

      expect(propTime(epoch, 0, 0).getTime()).toBe(epoch);
    });

    it('adds the static offset at propRate 1', () => {
      const epoch = Date.now() - 10_000;
      const staticOffset = 5_000;
      // at propRate 1: epoch + staticOffset + (now - epoch) = now + staticOffset
      const result = propTime(epoch, staticOffset, 1).getTime();

      expect(result).toBe(Date.now() + staticOffset);
    });
  });

  describe('createLatLonAltRad', () => {
    it('passes radians through unchanged', () => {
      const r = createLatLonAltRad(0.5 as Radians, 1 as Radians, 100 as Kilometers);

      expect(r).toEqual({ lat: 0.5, lon: 1, alt: 100 });
    });
  });

  describe('createLatLonAlt', () => {
    it('converts lat/lon radians to degrees, keeps alt', () => {
      const r = createLatLonAlt(0.5 as Radians, 1 as Radians, 100 as Kilometers);

      expect(r.lat).toBeCloseTo(0.5 * RAD2DEG, 6);
      expect(r.lon).toBeCloseTo(1 * RAD2DEG, 6);
      expect(r.alt).toBe(100);
    });
  });

  describe('isInValidElevation', () => {
    const rae = (el: number): RaeVec3<Kilometers, Degrees> => ({ az: 0 as Degrees, el: el as Degrees, rng: 0 as Kilometers });

    it('is true when elevation exceeds 90 - fov', () => {
      expect(isInValidElevation(rae(85), 10)).toBe(true);
    });

    it('is false when elevation is below 90 - fov', () => {
      expect(isInValidElevation(rae(75), 10)).toBe(false);
    });
  });

  describe('setupTimeVariables', () => {
    it('produces julian date and gmst with no sun exclusion when not in sunlight view', () => {
      const epoch = Date.UTC(2022, 0, 1, 0, 0, 0);
      const result = setupTimeVariables(epoch, 0, 0, false, null);

      expect(result.now).toBeInstanceOf(Date);
      expect(typeof result.j).toBe('number');
      expect(result.j).toBeGreaterThan(2_400_000); // plausible Julian date
      expect(typeof result.gmst).toBe('number');
      expect(typeof result.gmstNext).toBe('number');
      expect(result.isSunExclusion).toBe(false);
      expect(result.sunEci).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('computes sun exclusion when a single sensor is supplied in sunlight view', () => {
      const epoch = Date.UTC(2022, 5, 1, 12, 0, 0);
      const sensor = {
        lat: 40 as Degrees,
        lon: -75 as Degrees,
        alt: 0 as Kilometers,
        type: SpaceObjectType.PHASED_ARRAY_RADAR,
      } as unknown as GroundStation;

      const result = setupTimeVariables(epoch, 0, 0, true, [sensor]);

      // Non-optical sensor => never excluded, but sunEci is still computed
      expect(result.isSunExclusion).toBe(false);
      expect(typeof result.sunEci.x).toBe('number');
      expect(result.sunEci.x).not.toBe(0);
    });
  });
});
