import { ServiceLocator } from '@app/engine/core/service-locator';
import { SensorManager } from '@app/app/sensors/sensorManager';
import { settingsManager } from '@app/settings/settings';
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

  it('canStationsObserve is true for a non-optical sensor', () => {
    expect(mgr.canStationsObserve(new Date('2022-01-01T00:00:00Z'), [defaultSensor])).toBe(true);
  });

  it('sensorSunStatus_ computes a sun status and throws without a sensor', () => {
    const result = p().sensorSunStatus_(new Date('2022-01-01T00:00:00Z'), defaultSensor);

    expect(result.sunStatus).toBeDefined();
    expect(() => p().sensorSunStatus_(new Date('2022-01-01T00:00:00Z'), undefined)).toThrow();
  });

  it('loadSensorJson is a no-op outside offline mode', () => {
    settingsManager.offlineMode = false;
    const setSpy = vi.spyOn(mgr, 'setSensor');

    mgr.loadSensorJson('[null, 1]');

    expect(setSpy).not.toHaveBeenCalled();
  });

  it('loadSensorJson applies a persisted sensorId in offline mode', () => {
    // sensorManager reads the GLOBAL settingsManager, not the module import.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalSettings = (globalThis as any).settingsManager;

    globalSettings.offlineMode = true;
    const setSpy = vi.spyOn(mgr, 'setSensor').mockImplementation(() => undefined);

    mgr.loadSensorJson('[null, 5]');

    expect(setSpy).toHaveBeenCalledWith(null, 5);
    globalSettings.offlineMode = false;
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
