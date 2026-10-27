import { SatMath } from '@app/app/analysis/sat-math';
import { sensors } from '@app/app/data/catalogs/sensors';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SensorMath } from '@app/app/sensors/sensor-math';
import { SensorManager } from '@app/app/sensors/sensorManager';
import { calcGmst, Kilometers, lla2eci, Sun, SunStatus, TemeVec3 } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';

/*
 * Ground sites placed by lla2eci sit on a 6371 km sphere, inside the 6378 km equatorial radius the shadow cone uses.
 * Before the fix asin(R / r) was NaN there and every ground site read as SUN, so optical stations were never dark.
 */

/** 12:00 UTC: 05:00 MST at Socorro and 02:00 HST at Maui, both before sunrise. */
const NIGHT = new Date('2026-10-27T12:00:00Z');
/** 19:00 UTC: about local noon at Socorro (107 W). */
const SOCORRO_NOON = new Date('2026-10-27T19:00:00Z');
/** 22:00 UTC: about local noon at Maui (156 W). */
const MAUI_NOON = new Date('2026-10-27T22:00:00Z');

const cloneSensor = (sensor: DetailedSensor): DetailedSensor => Object.assign(Object.create(Object.getPrototypeOf(sensor)), sensor) as DetailedSensor;

const sitePosition = (sensor: DetailedSensor, now: Date): TemeVec3 => lla2eci(sensor.llaRad(), calcGmst(now).gmst);

/** A satellite 7000 km from Earth's centre, on the sunward side (sign 1) or straight behind Earth (sign -1). */
const satAlongSunLine = (now: Date, sign: 1 | -1) => {
  const sun = Sun.eci(now);
  const k = (sign * 7000) / Math.hypot(sun.x, sun.y, sun.z);
  const sat = defaultSat.clone();

  sat.position = { x: (sun.x * k) as Kilometers, y: (sun.y * k) as Kilometers, z: (sun.z * k) as Kilometers };

  return sat;
};

const SITES: [string, DetailedSensor, Date][] = [
  ['Socorro', sensors.GEODDSSOC, SOCORRO_NOON],
  ['Maui', sensors.GEODDSMAU, MAUI_NOON],
];

describe('optical ground-site night', () => {
  it.each(SITES)('%s sits inside the equatorial radius (the condition that produced NaN)', (_name, sensor) => {
    const pos = sitePosition(cloneSensor(sensor), NIGHT);

    expect(Math.hypot(pos.x, pos.y, pos.z)).toBeLessThan(6378.137);
  });

  it.each(SITES)('%s is in night at 2026-10-27T12:00Z and sunlit at local noon', (_name, sensor, noon) => {
    const site = cloneSensor(sensor);

    expect(SatMath.isGroundSiteInNight(sitePosition(site, NIGHT), Sun.eci(NIGHT))).toBe(true);
    expect(SatMath.isGroundSiteInNight(sitePosition(site, noon), Sun.eci(noon))).toBe(false);
  });

  it.each(SITES)('calculateIsInSun reads %s as dark at night and lit at noon, never SUN from a NaN', (_name, sensor, noon) => {
    const site = cloneSensor(sensor);

    site.position = sitePosition(site, NIGHT);
    expect(SatMath.calculateIsInSun(site, Sun.eci(NIGHT))).toBe(SunStatus.UMBRAL);

    site.position = sitePosition(site, noon);
    expect(SatMath.calculateIsInSun(site, Sun.eci(noon))).toBe(SunStatus.SUN);
  });

  it.each(SITES)('SensorMath.checkIfVisibleForOptical: %s sees a lit LEO satellite at night, not at noon', (_name, sensor, noon) => {
    expect(SensorMath.checkIfVisibleForOptical(satAlongSunLine(NIGHT, 1), cloneSensor(sensor), NIGHT)).toBe(true);
    expect(SensorMath.checkIfVisibleForOptical(satAlongSunLine(noon, 1), cloneSensor(sensor), noon)).toBe(false);
  });

  it('SensorMath.checkIfVisibleForOptical: a site in night does not see a satellite in Earth shadow', () => {
    expect(SensorMath.checkIfVisibleForOptical(satAlongSunLine(NIGHT, -1), cloneSensor(sensors.GEODDSSOC), NIGHT)).toBe(false);
  });

  describe('SensorManager', () => {
    let mgr: SensorManager;

    beforeEach(() => {
      setupStandardEnvironment();
      mgr = new SensorManager();
    });

    it.each(SITES)('canStationsObserve is true for %s at night and false at local noon', (_name, sensor, noon) => {
      expect(mgr.canStationsObserve(NIGHT, [cloneSensor(sensor)])).toBe(true);
      expect(mgr.canStationsObserve(noon, [cloneSensor(sensor)])).toBe(false);
    });

    it('sensorSunStatus_ reports UMBRAL for Socorro at night and SUN at local noon', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = mgr as any;

      expect(p.sensorSunStatus_(NIGHT, cloneSensor(sensors.GEODDSSOC)).sunStatus).toBe(SunStatus.UMBRAL);
      expect(p.sensorSunStatus_(SOCORRO_NOON, cloneSensor(sensors.GEODDSSOC)).sunStatus).toBe(SunStatus.SUN);
    });
  });

  describe('satellites keep the shadow-cone result', () => {
    it('a lit LEO satellite stays SUN', () => {
      expect(SatMath.calculateIsInSun(satAlongSunLine(NIGHT, 1), Sun.eci(NIGHT))).toBe(SunStatus.SUN);
    });

    it('a satellite in Earth shadow stays UMBRAL', () => {
      expect(SatMath.calculateIsInSun(satAlongSunLine(NIGHT, -1), Sun.eci(NIGHT))).toBe(SunStatus.UMBRAL);
    });

    it('a position at Earth centre is UNKNOWN, not SUN', () => {
      const sat = defaultSat.clone();

      sat.position = { x: 0 as Kilometers, y: 0 as Kilometers, z: 0 as Kilometers };
      expect(SatMath.calculateIsInSun(sat, Sun.eci(NIGHT))).toBe(SunStatus.UNKNOWN);
    });
  });
});
