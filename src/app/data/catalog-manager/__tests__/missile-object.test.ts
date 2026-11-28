import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Degrees, Kilometers, Vector3D } from '@ootk/src/main';
import { vi } from 'vitest';

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

    it('moves the index back when the sim clock is scrubbed backwards', () => {
      const start = simTime.getTime();
      const m = makeMissile({
        startTime: start,
        latList: [0, 0, 0, 0, 0] as Degrees[],
        lonList: [0, 0, 0, 0, 0] as Degrees[],
        altList: [0, 100, 200, 100, 0] as Kilometers[],
        timeList: [0, 1000, 2000, 3000, 4000],
      });

      // Scrub forward to 3s into flight, then back to 1s: the index must follow
      // the clock both ways (the old forward-only walk got stuck at the peak).
      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 3000) } as never);
      expect(m.getTimeInTrajectory()).toBe(3);

      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 1000) } as never);
      expect(m.getTimeInTrajectory()).toBe(1);
    });

    it('clamps to the final sample after impact', () => {
      const start = simTime.getTime();
      const m = makeMissile({ startTime: start });

      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 60_000) } as never);
      // altList has 2 samples -> last index is 1.
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

  describe('eci with an explicit date (reports / intercept solving)', () => {
    const start = simTime.getTime();
    const flight = () =>
      makeMissile({
        startTime: start,
        latList: [0, 1, 2, 3, 4] as Degrees[],
        lonList: [10, 11, 12, 13, 14] as Degrees[],
        altList: [0, 100, 200, 100, 0] as Kilometers[],
        timeList: [0, 1000, 2000, 3000, 4000],
      });

    it('samples the trajectory at the requested time, not the sim clock', () => {
      const m = flight();
      const early = m.eci(new Date(start))!;
      const late = m.eci(new Date(start + 4000))!;

      const separation = Math.hypot(late.position.x - early.position.x, late.position.y - early.position.y, late.position.z - early.position.z);

      // Launch (lat 0) and impact (lat 4) are hundreds of km apart; the old
      // implementation ignored the date and returned the same point for both.
      expect(separation).toBeGreaterThan(100);
    });

    it('returns null outside the flight window (the solver and reports skip those samples)', () => {
      const m = flight();

      expect(m.eci(new Date(start - 1))).toBeNull();
      expect(m.eci(new Date(start + 4001))).toBeNull();
    });

    it('the no-arg render path still clamps to the last sample after impact', () => {
      const m = flight();

      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 60_000) } as never);
      expect(m.eci()).not.toBeNull();
    });

    it('does not clobber the cached render position', () => {
      const m = flight();

      const renderX = m.eci()!.position.x;

      m.eci(new Date(start + 3000));
      expect(m.position.x).toBe(renderX);
    });

    it('derives a finite non-zero velocity from the trajectory', () => {
      const m = flight();
      const v = m.eci(new Date(start + 2000))!.velocity;
      const speed = Math.hypot(v.x, v.y, v.z);

      expect(Number.isFinite(speed)).toBe(true);
      // The cached velocity is zero; the dated query must differentiate the arc.
      expect(speed).toBeGreaterThan(0);
    });
  });

  describe('WGS84 placement (row MO1)', () => {
    // Hand values at geodetic 45 N, alt 0: N = a / sqrt(1 - e^2 / 2) = 6388.8383 km,
    // distance from the polar axis N cos 45 = 4517.5909 km, z = N (1 - e^2) sin 45 = 4487.3484 km.
    const at45 = () => makeMissile({ latList: [45, 45] as Degrees[], lonList: [0, 0] as Degrees[], altList: [0, 0] as Kilometers[] });

    it('eci() puts a 45 N ground sample on the ellipsoid, not on the 6371 km sphere', () => {
      const p = at45().eci()!.position;

      expect(Math.hypot(p.x, p.y)).toBeCloseTo(4517.5909, 3);
      expect(p.z).toBeCloseTo(4487.3484, 3);
    });

    it('getOrbitPath anchors at the Earth-fixed WGS84 point (gmst 0)', () => {
      const m = at45();

      m.getOrbitPath();
      expect(m.orbitPathAnchor_[0]).toBeCloseTo(4517.5909, 3);
      expect(m.orbitPathAnchor_[1]).toBeCloseTo(0, 9);
      expect(m.orbitPathAnchor_[2]).toBeCloseTo(4487.3484, 3);
    });

    it('getVelocityDirection points north along a meridian climb at the equator', () => {
      const m = makeMissile({ latList: [0, 0.01] as Degrees[], lonList: [0, 0] as Degrees[], altList: [0, 0] as Kilometers[] });
      const dir = m.getVelocityDirection()!;

      expect(dir.z).toBeGreaterThan(0.999);
    });
  });

  describe('getAltitude', () => {
    it('round-trips the sampled altitude through ECI/LLA', () => {
      const m = makeMissile();

      // eci() and eci2lla are both WGS84 geodetic (row MO1), so the 100 km sample
      // round-trips exactly instead of within the old spherical slop (90-110 km).
      expect(m.getAltitude()).toBeCloseTo(100, 6);
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
      // WGS84 both ways (row MO1): exact, not the old 0.5 deg spherical slop.
      expect(result!.lat).toBeCloseTo(10, 6);
      expect(result!.lon).toBeCloseTo(30, 6);
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

  describe('getApogeeIndex', () => {
    it('returns the index of the highest-altitude sample (the RV separation point)', () => {
      const m = makeMissile({
        latList: [0, 0, 0, 0, 0] as Degrees[],
        lonList: [0, 0, 0, 0, 0] as Degrees[],
        altList: [0, 100, 200, 100, 0] as Kilometers[],
        timeList: [0, 1000, 2000, 3000, 4000],
      });

      expect(m.getApogeeIndex()).toBe(2);
    });

    it('caches the result across calls (altList is written once)', () => {
      const m = makeMissile({ altList: [10, 90, 40] as Kilometers[] });

      expect(m.getApogeeIndex()).toBe(1);
      // Second call hits the cache and returns the same value.
      expect(m.getApogeeIndex()).toBe(1);
    });
  });

  describe('isVisibleNow (MIRV separation gating)', () => {
    const start = simTime.getTime();
    // Apogee (separation) at index 2 of this 5-sample arc.
    const mirvChild = () => {
      const m = makeMissile({
        startTime: start,
        latList: [0, 0, 0, 0, 0] as Degrees[],
        lonList: [0, 0, 0, 0, 0] as Degrees[],
        altList: [0, 100, 200, 100, 0] as Kilometers[],
        timeList: [0, 1000, 2000, 3000, 4000],
      });

      m.hideUntilSeparation = true;

      return m;
    };

    it('is always visible for the primary (hideUntilSeparation false)', () => {
      const m = mirvChild();

      m.hideUntilSeparation = false;
      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start) } as never);
      expect(m.isVisibleNow()).toBe(true);
    });

    it('hides a child before separation (apogee)', () => {
      const m = mirvChild();

      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 1000) } as never);
      expect(m.isVisibleNow()).toBe(false);
    });

    it('shows a child from separation onward', () => {
      const m = mirvChild();

      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 2000) } as never);
      expect(m.isVisibleNow()).toBe(true);
    });

    it('re-hides a child when rewound before separation', () => {
      const m = mirvChild();

      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 3000) } as never);
      expect(m.isVisibleNow()).toBe(true);

      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 1000) } as never);
      expect(m.isVisibleNow()).toBe(false);
    });
  });

  describe('getOrbitPath', () => {
    const start = simTime.getTime();
    const ascendingMissile = () =>
      makeMissile({
        startTime: start,
        latList: [0, 0, 0, 0, 0] as Degrees[],
        lonList: [0, 0, 0, 0, 0] as Degrees[],
        altList: [0, 100, 200, 100, 0] as Kilometers[],
        timeList: [0, 1000, 2000, 3000, 4000],
      });

    it('omits already-flown history: the vertex count shrinks as time advances', () => {
      const m = ascendingMissile();

      // At launch: head vertex + all 5 samples = 6 vertices (24 floats).
      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start) } as never);
      expect(m.getOrbitPath()).toHaveLength(6 * 4);

      // 2s into flight: head vertex + remaining samples [2,3,4] = 4 vertices.
      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 2000) } as never);
      expect(m.getOrbitPath()).toHaveLength(4 * 4);
    });

    it('starts the line at the current interpolated position (vertex 0 = anchor)', () => {
      const m = ascendingMissile();

      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 2000) } as never);
      const path = m.getOrbitPath();
      const eci = m.eci();

      // The path is anchor-relative: vertex 0 IS the anchor, so it is stored as
      // the zero vector and the interpolated current position lives in
      // orbitPathAnchor_ (ECEF, gmst=0). At sim epoch the ECI and ECEF frames
      // differ by GMST, so compare magnitudes (frame-invariant).
      expect(path[0]).toBe(0);
      expect(path[1]).toBe(0);
      expect(path[2]).toBe(0);

      const anchorMag = Math.hypot(m.orbitPathAnchor_[0], m.orbitPathAnchor_[1], m.orbitPathAnchor_[2]);
      const eciMag = Math.hypot(eci!.position.x, eci!.position.y, eci!.position.z);

      expect(anchorMag).toBeCloseTo(eciMag, 3);
      expect(path[3]).toBe(1.0); // head vertex is fully opaque
    });

    it('rebuilds when the clock is scrubbed backwards (cache keyed on sample index)', () => {
      const m = ascendingMissile();

      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 3000) } as never);
      expect(m.getOrbitPath()).toHaveLength(3 * 4); // head + samples [3,4]

      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: new Date(start + 1000) } as never);
      expect(m.getOrbitPath()).toHaveLength(5 * 4); // head + samples [1,2,3,4]
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
