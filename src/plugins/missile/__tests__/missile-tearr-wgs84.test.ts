import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getMissileTEARR, isMissileTearrInFov } from '@app/plugins/missile/missile-manager';
import { Degrees, Kilometers, SpaceObjectType } from '@ootk/src/main';
import { vi } from 'vitest';

/*
 * Row MM1 of AUDIT-wgs84.md: getMissileTEARR converts the trajectory sample with the WGS84
 * llaRad2eci. With the old spherical (6371 km + alt) point the recovered geodetic altitude of a
 * 500 km sample at 45 N came back about 3.5 km low and the latitude 0.19 deg off.
 */
describe('getMissileTEARR (WGS84, row MM1)', () => {
  const simTime = new Date('2026-11-25T00:00:00.000Z');

  const sensorAt = (lat: number, lon: number) =>
    new DetailedSensor({
      objName: 'TEST',
      name: 'Test Sensor',
      type: SpaceObjectType.OBSERVER,
      lat: lat as Degrees,
      lon: lon as Degrees,
      alt: 0 as Kilometers,
      minAz: 0 as Degrees,
      maxAz: 360 as Degrees,
      minEl: 0 as Degrees,
      maxEl: 90 as Degrees,
      minRng: 0 as Kilometers,
      maxRng: 50000 as Kilometers,
    });

  const missileAt = (lat: number, lon: number, alt: number) =>
    new MissileObject({
      id: 1,
      active: true,
      name: 'M',
      desc: 'M',
      latList: [lat, lat, lat] as Degrees[],
      lonList: [lon, lon, lon] as Degrees[],
      altList: [alt, alt, alt] as Kilometers[],
      timeList: [0, 1000, 2000],
      startTime: simTime.getTime() - 500,
      maxAlt: alt,
      country: 'TST',
      launchVehicle: 'TST',
    } as never);

  beforeEach(() => {
    vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: simTime } as never);
    vi.spyOn(ServiceLocator, 'getSensorManager').mockReturnValue({} as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('recovers the sample geodetic lat/lon/alt exactly at 45 N', () => {
    const tearr = getMissileTEARR(missileAt(45, 20, 500), [sensorAt(45, 20)]);

    expect(tearr.alt).toBeCloseTo(500, 6);
    expect(tearr.lat).toBeCloseTo(45, 6);
    expect(tearr.lon).toBeCloseTo(20, 6);
  });

  it('puts a missile 500 km straight above the sensor at 500 km range', () => {
    // The sensor and the sample share geodetic lat/lon, so the sample lies on the sensor's
    // geodetic normal and the range is exactly 500 km. The spherical point sat about 21 km off
    // that normal at 45 N. Elevation is not asserted: getMissileTEARR multiplies the degrees
    // that ecefRad2rae already returns by RAD2DEG again (pre-existing, reported separately).
    const tearr = getMissileTEARR(missileAt(45, 20, 500), [sensorAt(45, 20)]);

    expect(tearr.rng).toBeCloseTo(500, 3);
  });
});

describe('isMissileTearrInFov (split out of getMissileTEARR, behaviour unchanged)', () => {
  const tearr = (az: number, el: number, rng: number) =>
    ({ objName: '', time: '', alt: 0, lon: 0, lat: 0, az, el, rng, inView: false }) as unknown as Parameters<typeof isMissileTearrInFov>[1];
  const base = { minAz: 10, maxAz: 50, minEl: 5, maxEl: 80, minRng: 100, maxRng: 3000 } as Parameters<typeof isMissileTearrInFov>[0];
  const secondary = { ...base, minAz2: 200, maxAz2: 220, minEl2: 1, maxEl2: 10, minRng2: 0, maxRng2: 500 };

  it('tests a plain primary window on az, el and range', () => {
    expect(isMissileTearrInFov(base, tearr(30, 20, 1000))).toBe(true);
    expect(isMissileTearrInFov(base, tearr(60, 20, 1000))).toBe(false);
    expect(isMissileTearrInFov(base, tearr(30, 2, 1000))).toBe(false);
    expect(isMissileTearrInFov(base, tearr(30, 20, 5000))).toBe(false);
  });

  it('wraps the primary window through north when minAz > maxAz', () => {
    const wrap = { ...base, minAz: 340, maxAz: 20 };

    expect(isMissileTearrInFov(wrap, tearr(350, 20, 1000))).toBe(true);
    expect(isMissileTearrInFov(wrap, tearr(10, 20, 1000))).toBe(true);
    expect(isMissileTearrInFov(wrap, tearr(180, 20, 1000))).toBe(false);
  });

  it('uses the secondary window only when all six limits are set', () => {
    expect(isMissileTearrInFov(secondary, tearr(210, 5, 300))).toBe(true);
    expect(isMissileTearrInFov({ ...secondary, maxRng2: undefined }, tearr(210, 5, 300))).toBe(false);
    expect(isMissileTearrInFov(secondary, tearr(210, 5, 900))).toBe(false);
  });

  it('decides wrapping of the secondary window from the primary window', () => {
    const wrap = { ...secondary, minAz: 340, maxAz: 20, minAz2: 300, maxAz2: 310 };

    // Wrapping test: az >= 300 or az <= 310 accepts any azimuth in the secondary el/rng band.
    expect(isMissileTearrInFov(wrap, tearr(100, 5, 300))).toBe(true);
  });
});
