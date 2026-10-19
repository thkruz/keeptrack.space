import { isCustomSensor } from '@app/app/sensors/custom-sensor-identity';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { getEl } from '@app/engine/utils/get-el';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { parseCustomSensorStore } from '@app/plugins/sensor/custom-sensor-persistence';
import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { ZoomValue } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const FORM = {
  'cs-uiName': 'CU Boulder UHF',
  'cs-lat': '40.0075',
  'cs-lon': '-105.2659',
  'cs-hei': '1.655',
  'cs-type': 'Mechanical',
  'cs-minaz': '0',
  'cs-maxaz': '360',
  'cs-minel': '10',
  'cs-maxel': '90',
  'cs-minrange': '100',
  'cs-maxrange': '50000',
};

/**
 * Covers the UX-validation fixes for the Custom Sensor plugin: the sensor survives a reload
 * (saved to StorageKey.CUSTOM_SENSORS and rebuilt on boot) and Add no longer zooms the camera
 * out to GEO framing.
 */
describe('CustomSensorPlugin persistence and camera', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = CustomSensorPlugin as any;
  let store: Map<string, string>;

  const setForm = () => {
    for (const [id, value] of Object.entries(FORM)) {
      const el = getEl(id, true) as HTMLInputElement | null;

      if (el) {
        el.value = value;
      }
    }
  };

  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorInfoPlugin, SensorListPlugin]);
    websiteInit(new CustomSensorPlugin());

    // In-memory persistence so the test sees exactly what the plugin writes
    store = new Map();
    const persistence = PersistenceManager.getInstance();

    vi.spyOn(persistence, 'saveItem').mockImplementation((key: string, value: string) => {
      store.set(key, value);
    });
    vi.spyOn(persistence, 'getItem').mockImplementation((key: string) => store.get(key) ?? null);
    vi.spyOn(persistence, 'removeItem').mockImplementation((key: string) => {
      store.delete(key);
    });

    const sensorManager = ServiceLocator.getSensorManager();

    sensorManager.currentSensors = [];
    sensorManager.secondarySensors = [];
    settingsManager.isLoadLastSensor = true;
    settingsManager.disableUI = false;
    // Boot restore has run (empty store), so saves are live
    CustomSensorPlugin.restoreCustomSensors();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the camera zoom when a custom sensor is added', () => {
    const camera = ServiceLocator.getMainCamera();
    const previousZoom = camera.state.zoomTarget;
    // The shared camera mock stubs changeZoom; give it the production behavior (set the target)
    const changeZoom = vi.spyOn(camera, 'changeZoom').mockImplementation((zoom: number) => {
      camera.state.zoomTarget = zoom;
    });

    camera.state.zoomTarget = 0.3;
    setForm();
    C.processCustomSensorSubmit_();

    expect(ServiceLocator.getSensorManager().currentSensors[0]?.name).toBe('CU Boulder UHF');
    // SensorManager still frames a 50,000 km sensor at GEO zoom...
    expect(changeZoom).toHaveBeenCalledWith(ZoomValue.GEO);
    // ...but the plugin puts the user's zoom back afterwards
    expect(camera.state.zoomTarget).toBeCloseTo(0.3, 6);

    camera.state.zoomTarget = previousZoom;
  });

  it('saves the added sensor and restores it as the primary sensor after a reload', () => {
    setForm();
    C.processCustomSensorSubmit_();

    const saved = parseCustomSensorStore(store.get(StorageKey.CUSTOM_SENSORS));
    const sensorManager = ServiceLocator.getSensorManager();
    const addedObjName = sensorManager.currentSensors[0].objName;

    expect(saved?.primaryObjName).toBe(addedObjName);
    expect(saved?.sensors[0]).toMatchObject({ name: 'CU Boulder UHF', lat: 40.0075, lon: -105.2659, alt: 1.655, minEl: 10, maxRng: 50000 });

    // Simulate a reload: the sensor manager starts empty, then boot restore runs
    sensorManager.currentSensors = [];
    sensorManager.secondarySensors = [];
    CustomSensorPlugin.restoreCustomSensors();

    const restored = sensorManager.currentSensors[0];

    expect(restored).toBeDefined();
    expect(isCustomSensor(restored)).toBe(true);
    expect(restored.objName).toBe(addedObjName);
    expect(restored.name).toBe('CU Boulder UHF');
    expect(restored.lat).toBeCloseTo(40.0075, 6);
  });

  it('does not overwrite the saved sensors with boot-time sensor events before the restore', () => {
    setForm();
    C.processCustomSensorSubmit_();
    const savedJson = store.get(StorageKey.CUSTOM_SENSORS);

    // Next boot: addJs resets the flag, then loadSensorJson fires setSensor(null) first
    C.isStoreRestored_ = false;
    ServiceLocator.getSensorManager().currentSensors = [];
    CustomSensorPlugin.saveCustomSensors();

    expect(store.get(StorageKey.CUSTOM_SENSORS)).toBe(savedJson);
  });

  it('removes the saved sensors when the list is cleared', () => {
    setForm();
    C.processCustomSensorSubmit_();
    expect(store.has(StorageKey.CUSTOM_SENSORS)).toBe(true);

    (getEl('cs-clear') as HTMLButtonElement).click();

    expect(store.has(StorageKey.CUSTOM_SENSORS)).toBe(false);
  });

  it('skips restoring when the last-sensor restore is disabled', () => {
    setForm();
    C.processCustomSensorSubmit_();
    const sensorManager = ServiceLocator.getSensorManager();

    sensorManager.currentSensors = [];
    settingsManager.isLoadLastSensor = false;
    CustomSensorPlugin.restoreCustomSensors();

    expect(sensorManager.currentSensors).toHaveLength(0);
  });
});
