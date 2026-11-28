import { SensorManager } from '@app/app/sensors/sensorManager';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { settingsManager } from '@app/settings/settings';
import { geodeticSurfaceNormal, llaRad2eci } from '@ootk/src/main';
import { defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const sensor = (over: Partial<typeof defaultSensor> = {}) => {
  const s = defaultSensor.clone();

  Object.assign(s, over);

  return s;
};

describe('SensorManager position + observation', () => {
  let mgr: SensorManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => mgr as any;

  beforeEach(() => {
    setupStandardEnvironment();
    mgr = new SensorManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getAllActiveSensors concatenates current, secondary and stf sensors', () => {
    mgr.currentSensors = [sensor({ sensorId: 1 })];
    mgr.secondarySensors = [sensor({ sensorId: 2 })];
    mgr.stfSensors = [sensor({ sensorId: 3 })];

    expect(mgr.getAllActiveSensors()).toHaveLength(3);
  });

  it('getAllSensors returns the catalog of known sensors', () => {
    expect(Array.isArray(mgr.getAllSensors())).toBe(true);
    expect(mgr.getAllSensors().length).toBeGreaterThan(0);
  });

  it('calculateSensorPos returns an ECF position and gmst for a sensor', () => {
    const pos = mgr.calculateSensorPos(new Date('2022-01-01T00:00:00Z'), [defaultSensor]);

    expect(typeof pos.x).toBe('number');
    expect(typeof pos.gmst).toBe('number');
    expect(pos.lat).toBe(defaultSensor.lat);
  });

  it('calculateSensorPos puts the planetarium camera on the WGS84 site + (alt + 3 km) along the geodetic normal', () => {
    const now = new Date('2022-01-01T00:00:00Z');
    const s = sensor({ lat: 45, lon: 10, alt: 0.4 } as never);
    const pos = mgr.calculateSensorPos(now, [s]);
    const site = llaRad2eci({ lat: (45 * Math.PI) / 180, lon: (10 * Math.PI) / 180, alt: 0 } as never, pos.gmst);
    const n = geodeticSurfaceNormal(site);
    const lift = 0.4 + 3;

    expect(pos.x).toBeCloseTo(site.x + n.x * lift, 6);
    expect(pos.y).toBeCloseTo(site.y + n.y * lift, 6);
    expect(pos.z).toBeCloseTo(site.z + n.z * lift, 6);
  });

  it('planetarium camera is above the ellipsoid at the equator and pole (never inside the mesh)', () => {
    const equator = mgr.calculateSensorPos(new Date('2022-01-01T00:00:00Z'), [sensor({ lat: 0, lon: 0, alt: 0 } as never)]);
    const pole = mgr.calculateSensorPos(new Date('2022-01-01T00:00:00Z'), [sensor({ lat: 90, lon: 0, alt: 0 } as never)]);

    expect(Math.hypot(equator.x, equator.y, equator.z)).toBeCloseTo(6378.137 + 3, 4);
    expect(Math.hypot(pole.x, pole.y, pole.z)).toBeCloseTo(6356.752314 + 3, 4);
  });

  it('sensorSunStatus_ stores the WGS84 ECI site position on the sensor', () => {
    const now = new Date('2022-01-01T00:00:00Z');
    const s = sensor({ lat: 45, lon: 10, alt: 0.4 } as never);

    p().sensorSunStatus_(now, s);

    const r = Math.hypot(s.position.x, s.position.y, s.position.z);

    // WGS84 geocentric radius at 45 deg is about 6367.49 km (+0.4 km), not the 6371 sphere
    expect(r).toBeLessThan(6369);
    expect(r).toBeGreaterThan(6366);
  });

  it('canStationsObserve is true for a non-optical sensor', () => {
    expect(mgr.canStationsObserve(new Date('2022-01-01T00:00:00Z'), [defaultSensor])).toBe(true);
  });

  it('sensorSunStatus_ computes a sun status and throws without a sensor', () => {
    const result = p().sensorSunStatus_(new Date('2022-01-01T00:00:00Z'), defaultSensor);

    expect(result.sunStatus).toBeDefined();
    expect(() => p().sensorSunStatus_(new Date('2022-01-01T00:00:00Z'), undefined)).toThrow();
  });

  it('loadSensorJson is a no-op when nothing is persisted', () => {
    const setSpy = vi.spyOn(mgr, 'setSensor');

    mgr.loadSensorJson(null);

    expect(setSpy).not.toHaveBeenCalled();
  });

  it('loadSensorJson applies a persisted sensorId regardless of offline mode', () => {
    // sensorManager reads the GLOBAL settingsManager, not the module import.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalSettings = (globalThis as any).settingsManager;

    globalSettings.offlineMode = false;
    const setSpy = vi.spyOn(mgr, 'setSensor').mockImplementation(() => undefined);

    mgr.loadSensorJson('[null, 5]');

    expect(setSpy).toHaveBeenCalledWith(null, 5);
  });

  it('cameraToCurrentSensor_ zooms GEO for a long-range sensor and snaps the camera', () => {
    const camera = ServiceLocator.getMainCamera();
    const zoomSpy = vi.spyOn(camera, 'changeZoom').mockImplementation(() => undefined);
    const snapSpy = vi.spyOn(camera, 'camSnap').mockImplementation(() => undefined);

    p().cameraToCurrentSensor_(sensor({ maxRng: 40000 }));

    expect(zoomSpy).toHaveBeenCalled();
    expect(snapSpy).toHaveBeenCalled();
  });
});
