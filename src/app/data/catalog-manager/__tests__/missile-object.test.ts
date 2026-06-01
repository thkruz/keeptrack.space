import { vi } from 'vitest';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Degrees, Kilometers, Vector3D } from '@ootk/src/main';

/*
 * MissileObject models a ballistic trajectory as discrete lat/lon/alt samples
 * indexed by elapsed seconds. Its coordinate methods are pure given the
 * simulation time, so we drive them with a fixed time manager stub.
 */
describe('MissileObject', () => {
  const simTime = new Date('2022-06-01T00:00:00.000Z');

  const makeMissile = (overrides: Partial<ConstructorParameters<typeof MissileObject>[0]> = {}): MissileObject =>
    new MissileObject({
      id: 7,
      active: true,
      name: 'Test Missile',
      desc: 'Test (TST)',
      latList: [10, 20] as Degrees[],
      lonList: [30, 40] as Degrees[],
      altList: [100, 200] as Kilometers[],
      timeList: [0, 1000],
      startTime: simTime.getTime(),
      maxAlt: 200,
      country: 'USA',
      launchVehicle: 'TST-1',
      ...overrides,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

  beforeEach(() => {
    vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: simTime } as never);
  });

  it('constructs with the supplied trajectory data', () => {
    const m = makeMissile();

    expect(m.id).toBe(7);
    expect(m.active).toBe(true);
    expect(m.desc).toBe('Test (TST)');
    expect(m.country).toBe('USA');
    expect(m.launchVehicle).toBe('TST-1');
    expect(m.maxAlt).toBe(200);
    expect(m.altList).toStrictEqual([100, 200]);
  });

  it('reports the correct object-kind predicates', () => {
    const m = makeMissile();

    expect(m.isMissile()).toBe(true);
    expect(m.isStatic()).toBe(false);
    // MissileObject overrides SpaceObject's isSatellite() so consumers that
    // branch on object kind (e.g. getSatDataString_, getSats) don't treat a
    // ballistic track as a satellite.
    expect(m.isSatellite()).toBe(false);
  });

  it('exposes a mutable totalVelocity (overriding SpaceObject getter)', () => {
    const m = makeMissile();

    expect(m.totalVelocity).toBe(0);
    m.totalVelocity = 7.8;
    expect(m.totalVelocity).toBe(7.8);
  });

  describe('getTimeInTrajectory', () => {
    it('returns index 0 when the sim time is at launch', () => {
      const m = makeMissile({ startTime: simTime.getTime() });

      expect(m.getTimeInTrajectory()).toBe(0);
    });

    it('advances to the next index as elapsed time grows', () => {
      // Launch 500ms before sim time -> t=0 is past, t=1 is the first sample
      // whose absolute time is at/after now.
      const m = makeMissile({ startTime: simTime.getTime() - 500 });

      expect(m.getTimeInTrajectory()).toBe(1);
    });
  });

  describe('eci', () => {
    it('returns a position derived from the active trajectory sample', () => {
      const m = makeMissile();
      const result = m.eci();

      expect(result).not.toBeNull();
      expect(typeof result!.position.x).toBe('number');
      // eci() also caches the position on the object.
      expect(m.position.x).toBe(result!.position.x);
    });

    it('returns null when the trajectory has no sample for the current time', () => {
      const m = makeMissile({ latList: [], lonList: [], altList: [], timeList: [] });

      expect(m.eci()).toBeNull();
    });
  });

  describe('getAltitude', () => {
    it('round-trips the sampled altitude through ECI/LLA', () => {
      const m = makeMissile();

      // Recovered altitude tracks the 100 km sample within the ellipsoid-vs-
      // spherical earth-model slop of the lla2eci/eci2lla round trip.
      expect(m.getAltitude()).toBeGreaterThan(90);
      expect(m.getAltitude()).toBeLessThan(110);
    });

    it('returns 0 when there is no position', () => {
      const m = makeMissile({ latList: [], lonList: [], altList: [], timeList: [] });

      expect(m.getAltitude()).toBe(0);
    });
  });

  describe('lla', () => {
    it('recovers the sampled latitude/longitude', () => {
      const m = makeMissile();
      const result = m.lla();

      expect(result).not.toBeNull();
      expect(Math.abs(result!.lat - 10)).toBeLessThan(0.5);
      expect(Math.abs(result!.lon - 30)).toBeLessThan(0.5);
    });

    it('returns null without a position', () => {
      const m = makeMissile({ latList: [], lonList: [], altList: [], timeList: [] });

      expect(m.lla()).toBeNull();
    });
  });

  describe('ecef', () => {
    it('returns an ECEF vector when a position exists', () => {
      const m = makeMissile();
      const result = m.ecef();

      expect(result).not.toBeNull();
      expect(typeof result!.x).toBe('number');
    });

    it('returns null without a position', () => {
      const m = makeMissile({ latList: [], lonList: [], altList: [], timeList: [] });

      expect(m.ecef()).toBeNull();
    });
  });

  describe('getEciVector3D', () => {
    it('returns a Vector3D for a valid position', () => {
      const m = makeMissile();
      const v = m.getEciVector3D();

      expect(v).toBeInstanceOf(Vector3D);
      expect(v.x).not.toBe(0);
    });

    it('returns a zero vector without a position', () => {
      const m = makeMissile({ latList: [], lonList: [], altList: [], timeList: [] });
      const v = m.getEciVector3D();

      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      expect(v.z).toBe(0);
    });
  });

  describe('isGoingUp', () => {
    it('is false at launch (no prior sample)', () => {
      const m = makeMissile({ startTime: simTime.getTime() });

      expect(m.isGoingUp()).toBe(false);
    });

    it('is true while ascending between samples', () => {
      const m = makeMissile({ startTime: simTime.getTime() - 500 });

      // t=1: altList[1]=200 > altList[0]=100.
      expect(m.isGoingUp()).toBe(true);
    });
  });

  describe('unsupported orbital conversions throw', () => {
    it.each(['toJ2000', 'toITRF', 'toClassicalElements'] as const)('%s throws', (method) => {
      const m = makeMissile();

      expect(() => m[method]()).toThrow();
    });
  });

  describe('clone', () => {
    it('deep-copies the trajectory lists', () => {
      const m = makeMissile();
      const copy = m.clone();

      expect(copy).not.toBe(m);
      expect(copy.altList).toStrictEqual(m.altList);
      expect(copy.altList).not.toBe(m.altList);

      // Mutating the original must not affect the clone.
      m.altList.push(300 as Kilometers);
      expect(copy.altList).toHaveLength(2);
    });
  });

  describe('serializeSpecific', () => {
    it('emits the missile-specific fields', () => {
      const m = makeMissile();
      // serializeSpecific is protected; reach it for serialization coverage.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (m as any).serializeSpecific() as Record<string, unknown>;

      expect(data).toMatchObject({
        desc: 'Test (TST)',
        country: 'USA',
        launchVehicle: 'TST-1',
        maxAlt: 200,
      });
      expect(data.altList).toStrictEqual([100, 200]);
    });
  });
});
