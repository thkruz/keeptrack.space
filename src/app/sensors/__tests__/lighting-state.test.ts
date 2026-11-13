import { SatMath } from '@app/app/analysis/sat-math';
import { sensors } from '@app/app/data/catalogs/sensors';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { SensorMath } from '@app/app/sensors/sensor-math';
import { calcGmst, Kilometers, SpaceObjectType, Sun, SunStatus, TemeVec3 } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/** 12:00 UTC: about 05:00 local at Socorro, Sun well below -12 deg. */
const NIGHT = new Date('2026-10-27T12:00:00Z');
/** 19:00 UTC: about local noon at Socorro. */
const NOON = new Date('2026-10-27T19:00:00Z');

const cloneSensor = (sensor: DetailedSensor): DetailedSensor => Object.assign(Object.create(Object.getPrototypeOf(sensor)), sensor) as DetailedSensor;

/** Satellite 7000 km from Earth's centre on the sunward (1) or anti-sunward (-1) side. */
const satPos = (now: Date, sign: 1 | -1): TemeVec3 => {
  const sun = Sun.eci(now);
  const k = (sign * 7000) / Math.hypot(sun.x, sun.y, sun.z);

  return { x: (sun.x * k) as Kilometers, y: (sun.y * k) as Kilometers, z: (sun.z * k) as Kilometers };
};

describe('SensorMath.getLightingState and getOpticalVerdict', () => {
  beforeEach(() => {
    setupStandardEnvironment([]);
  });

  it('states the site-dark limit as -12 degrees', () => {
    expect(SensorMath.SITE_DARK_SUN_EL_DEG).toBe(-12);
  });

  it('eclipsed pass: not sunlit, no optical verdict even when in view and dark', () => {
    const site = cloneSensor(sensors.GEODDSSOC);
    const state = SensorMath.getLightingState(satPos(NIGHT, -1), site, NIGHT);

    expect(state.sunlit).toBe(false);
    expect(state.siteDark).toBe(true);
    expect(SensorMath.getOpticalVerdict(true, state)).toBe(false);
  });

  it('sunlit pass at night: sunlit, dark, optical yes', () => {
    const site = cloneSensor(sensors.GEODDSSOC);
    const state = SensorMath.getLightingState(satPos(NIGHT, 1), site, NIGHT);

    expect(state.sunlit).toBe(true);
    expect(state.siteDark).toBe(true);
    expect(SensorMath.getOpticalVerdict(true, state)).toBe(true);
  });

  it('sunlit pass in daylight: geometric yes, optical no', () => {
    const site = cloneSensor(sensors.GEODDSSOC);
    const state = SensorMath.getLightingState(satPos(NOON, 1), site, NOON);

    expect(state.sunlit).toBe(true);
    expect(state.siteDark).toBe(false);
    expect(SensorMath.getOpticalVerdict(true, state)).toBe(false);
  });

  it('below the horizon is never optically visible', () => {
    const site = cloneSensor(sensors.GEODDSSOC);
    const state = SensorMath.getLightingState(satPos(NIGHT, 1), site, NIGHT);

    expect(SensorMath.getOpticalVerdict(false, state)).toBe(false);
  });

  it('twilight between -12 and 0 degrees is not dark', () => {
    const site = cloneSensor(sensors.GEODDSSOC);
    // Walk the evening/morning until the Sun sits between -12 and -1 degrees
    let found = false;

    for (let m = 0; m < 24 * 60 && !found; m += 5) {
      const t = new Date(NIGHT.getTime() + m * 60000);
      const state = SensorMath.getLightingState(satPos(t, 1), site, t);

      if (state.sunElDeg !== null && state.sunElDeg < -1 && state.sunElDeg > -11) {
        found = true;
        expect(state.siteDark).toBe(false);
      }
    }
    expect(found).toBe(true);
  });

  it('only optical sensors get an optical verdict', () => {
    const radar = cloneSensor(sensors.CODSFS);
    const optical = cloneSensor(sensors.GEODDSSOC);

    expect(SensorMath.isOpticalSensor(optical)).toBe(true);
    expect(radar.type).not.toBe(SpaceObjectType.OPTICAL);
    expect(SensorMath.isOpticalSensor(radar)).toBe(false);
  });
});

describe('SensorMath.getVisMagReading', () => {
  const sun = { eci: Sun.eci(NIGHT) } as never;

  beforeEach(() => {
    setupStandardEnvironment([]);
  });

  it('flags any non-catalog intrinsic magnitude (default, preset or estimate override) as assumed', () => {
    const site = cloneSensor(sensors.GEODDSSOC);
    const sat = defaultSat.clone();

    sat.position = satPos(NIGHT, 1);

    sat.vmag = null as never;
    expect(SensorMath.getVisMagReading(sat, site, NIGHT, sun)).toMatchObject({ kind: 'mag', assumed: true });
    expect(SensorMath.getVisMagReading(sat, site, NIGHT, sun, 3.1)).toMatchObject({ kind: 'mag', assumed: true });
    sat.vmag = 4.2 as never;
    expect(SensorMath.getVisMagReading(sat, site, NIGHT, sun)).toMatchObject({ kind: 'mag', assumed: false });
  });

  it('returns notSunlit for an eclipsed satellite', () => {
    const site = cloneSensor(sensors.GEODDSSOC);
    const sat = defaultSat.clone();

    sat.position = satPos(NIGHT, -1);
    expect(SensorMath.getVisMagReading(sat, site, NIGHT, sun)).toStrictEqual({ kind: 'notSunlit' });
  });
});

describe('SensorMath lighting review fixes (F2, F4, F5, F6)', () => {
  beforeEach(() => {
    setupStandardEnvironment([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('F2: observer sensors (the custom-sensor default) are lighting-relevant like optical ones', () => {
    const observer = cloneSensor(sensors.GEODDSSOC);

    observer.type = SpaceObjectType.OBSERVER;
    expect(SensorMath.isOpticalSensor(observer)).toBe(true);
  });

  it('F4: Sun exactly at the -12 degree limit counts as dark (inclusive)', () => {
    vi.spyOn(SatMath, 'calculateGroundSiteSunElevation').mockReturnValue(-12 as never);
    const state = SensorMath.getLightingState(satPos(NIGHT, 1), cloneSensor(sensors.GEODDSSOC), NIGHT);

    expect(state.siteDark).toBe(true);
  });

  it('F5: penumbra is not eclipsed; only umbra is', () => {
    const spy = vi.spyOn(SatMath, 'calculateIsInSun');

    spy.mockReturnValue(SunStatus.PENUMBRAL);
    expect(SensorMath.getLightingState(satPos(NIGHT, 1), cloneSensor(sensors.GEODDSSOC), NIGHT).sunlit).toBe(true);
    spy.mockReturnValue(SunStatus.UMBRAL);
    expect(SensorMath.getLightingState(satPos(NIGHT, 1), cloneSensor(sensors.GEODDSSOC), NIGHT).sunlit).toBe(false);
  });

  it('F6: Sun elevation is measured against the site geodetic normal passed in', () => {
    const sun = { x: 0, y: 0, z: 1.5e8 } as TemeVec3;
    const site = { x: 6371, y: 0, z: 0 } as TemeVec3;

    // Normal tilted 10 degrees toward the Sun: elevation is 10 degrees, not the 0 a radial up would give
    const tilt = (10 * Math.PI) / 180;
    const up = { x: Math.cos(tilt), y: 0, z: Math.sin(tilt) } as TemeVec3;

    expect(SatMath.calculateGroundSiteSunElevation(site, sun, up)).toBeCloseTo(10, 2);
    expect(SatMath.calculateGroundSiteSunElevation(site, sun)).toBeCloseTo(0, 2);
  });

  it('F6: getLightingState uses the geodetic normal of the sensor lat/lon', () => {
    const site = cloneSensor(sensors.GEODDSSOC);
    const spy = vi.spyOn(SatMath, 'calculateGroundSiteSunElevation');

    SensorMath.getLightingState(satPos(NIGHT, 1), site, NIGHT);
    const up = spy.mock.calls[0][2] as TemeVec3;
    const lla = site.llaRad();

    expect(Math.hypot(up.x, up.y, up.z)).toBeCloseTo(1, 6);
    expect(up.z).toBeCloseTo(Math.sin(lla.lat), 6);

    // Longitude of the normal is site longitude plus GMST (not longitude alone)
    const { gmst } = calcGmst(NIGHT);
    const twoPi = 2 * Math.PI;
    const diff = ((((Math.atan2(up.y, up.x) - (lla.lon + gmst)) % twoPi) + 3 * Math.PI) % twoPi) - Math.PI;

    expect(diff).toBeCloseTo(0, 6);
  });
});
