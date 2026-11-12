import { ServiceLocator } from '@app/engine/core/service-locator';
import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { getEl } from '@app/engine/utils/get-el';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { parseCustomSensorStore } from '@app/plugins/sensor/custom-sensor-persistence';
import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
import { getSavedSites } from '@app/plugins/sensor/custom-site-registry';
import { makeSavedSiteCurrent } from '@app/plugins/sensor/saved-site-activation';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
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
 * Saved sites outlive Clear and Reset: the registry is fed by every save of the active custom sensors.
 */
describe('custom site registry wiring', () => {
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

  const addSite = (name: string, lat: string): string => {
    setForm();
    (getEl('cs-uiName') as HTMLInputElement).value = name;
    (getEl('cs-lat') as HTMLInputElement).value = lat;
    C.lastSubmit_ = null;
    C.processCustomSensorSubmit_();

    return ServiceLocator.getSensorManager().secondarySensors.at(-1)?.objName ?? ServiceLocator.getSensorManager().currentSensors[0].objName;
  };

  it('saves each added site in the registry, keeping the first when a second is added', () => {
    const idA = addSite('RIDGE', '40');
    const idB = addSite('COAST', '41');

    expect(idA).not.toBe(idB);
    expect(getSavedSites().map((s) => s.name)).toEqual(['RIDGE', 'COAST']);
    expect(getSavedSites().map((s) => s.id)).toEqual([idA, idB]);
  });

  it('keeps saved sites after Clear removes the active sensors', () => {
    addSite('RIDGE', '40');
    addSite('COAST', '41');

    (getEl('cs-clear') as HTMLButtonElement).click();

    expect(store.has(StorageKey.CUSTOM_SENSORS)).toBe(false);
    expect(getSavedSites().map((s) => s.name)).toEqual(['RIDGE', 'COAST']);
  });

  it('gives two sites with the same display name different ids', () => {
    const idA = addSite('Same', '40');
    const idB = addSite('Same', '41');

    expect(idA).not.toBe(idB);
    expect(getSavedSites()).toHaveLength(2);
  });

  it('seeds the registry from already-active custom sensors on the next save (older stores)', () => {
    const id = addSite('RIDGE', '40');

    store.delete(StorageKey.CUSTOM_SITE_REGISTRY);
    CustomSensorPlugin.saveCustomSensors();

    expect(getSavedSites().map((s) => s.id)).toEqual([id]);
  });

  it('a site made current after Clear is persisted as the active primary and keeps the other saved', () => {
    const idA = addSite('RIDGE', '40');
    const idB = addSite('COAST', '41');

    (getEl('cs-clear') as HTMLButtonElement).click();
    expect(ServiceLocator.getSensorManager().currentSensors).toHaveLength(0);

    makeSavedSiteCurrent(idB);

    const active = parseCustomSensorStore(store.get(StorageKey.CUSTOM_SENSORS));

    expect(active?.primaryObjName).toBe(idB);
    expect(active?.sensors.map((x) => x.objName)).toEqual([idB]);
    expect(getSavedSites().map((x) => x.id)).toEqual([idA, idB]);
  });
});
