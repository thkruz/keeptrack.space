import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { Degrees, Kilometers, SpaceObjectType } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const VALID = {
  'cs-uiName': 'My Scope',
  'cs-lat': '40',
  'cs-lon': '-75',
  'cs-hei': '0.1',
  'cs-type': 'Observer',
  'cs-minaz': '0',
  'cs-maxaz': '360',
  'cs-minel': '0',
  'cs-maxel': '90',
  'cs-minrange': '0',
  'cs-maxrange': '1000',
  'cs-mask': '',
};

const setForm = (over: Partial<typeof VALID> = {}) => {
  for (const [id, value] of Object.entries({ ...VALID, ...over })) {
    const el = getEl(id, true) as HTMLInputElement | null;

    if (el) {
      el.value = value;
    }
  }
};

const submitForm = () => {
  (getEl('custom-sensor-menu-form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));
};

/** A catalog-shaped (non-custom) sensor, as the Sensors menu would select. */
const catalogSensor = () =>
  new DetailedSensor({
    objName: 'MITMIL',
    name: 'Millstone',
    uiName: 'Millstone Hill',
    type: SpaceObjectType.MECHANICAL,
    lat: 42.6233 as Degrees,
    lon: -71.4882 as Degrees,
    alt: 0.131 as Kilometers,
    minAz: 0 as Degrees,
    maxAz: 360 as Degrees,
    minEl: 1 as Degrees,
    maxEl: 90 as Degrees,
    minRng: 200 as Kilometers,
    maxRng: 50000 as Kilometers,
    elevationMasks: [
      { startAz: 0 as Degrees, stopAz: 0 as Degrees, minEl: 5 as Degrees },
      { startAz: 180 as Degrees, stopAz: 180 as Degrees, minEl: 12 as Degrees },
    ],
    interpolateMask: true,
  });

describe('CustomSensorPlugin gap fixes', () => {
  let plugin: CustomSensorPlugin;
  let addSpy: ReturnType<typeof vi.spyOn>;
  let toastSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorInfoPlugin, SensorListPlugin]);
    plugin = new CustomSensorPlugin();
    websiteInit(plugin);
    addSpy = vi.spyOn(ServiceLocator.getSensorManager(), 'addSecondarySensor').mockImplementation(() => undefined as never);
    toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast');
    toastSpy.mockClear();
    vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.advanceTimersByTime(1000);
  });

  it('shows a success toast naming the sensor after Add', () => {
    setForm();
    submitForm();

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(String(toastSpy.mock.calls[0][0])).toContain('My Scope');
  });

  it('ignores a double-click: the same values submitted twice in a row add one sensor', () => {
    setForm();
    submitForm();
    submitForm();

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });

  it('accepts the same values again once the double-click window has passed', () => {
    setForm();
    submitForm();
    vi.advanceTimersByTime(1500);
    submitForm();

    expect(addSpy).toHaveBeenCalledTimes(2);
  });

  it('accepts a different sensor submitted right after the first', () => {
    setForm();
    submitForm();
    setForm({ 'cs-uiName': 'Second', 'cs-lat': '10' });
    submitForm();

    expect(addSpy).toHaveBeenCalledTimes(2);
  });

  it('emits pluginFormSubmitted only for a created sensor, not for a rejected or duplicate submit', () => {
    const emitted: string[] = [];

    EventBus.getInstance().on(EventBusEvent.pluginFormSubmitted, (id: string) => emitted.push(id));

    setForm({ 'cs-lat': '95' });
    submitForm();
    expect(emitted).toEqual([]);
    expect(toastSpy).not.toHaveBeenCalled();

    setForm();
    submitForm();
    submitForm();
    expect(emitted).toEqual(['CustomSensorPlugin']);
  });

  it('Replace Sensor pre-fills every field of the current sensor', () => {
    const sensorManager = ServiceLocator.getSensorManager();

    sensorManager.currentSensors = [catalogSensor()];
    vi.spyOn(sensorManager, 'isSensorSelected').mockReturnValue(true);
    plugin.isMenuButtonActive = true;
    plugin.bottomIconCallback();

    const value = (id: string) => (getEl(id) as HTMLInputElement).value;

    expect(getEl('cs-replace')!.style.display).toBe('');
    expect(value('cs-uiName')).toBe('Millstone Hill');
    expect(value('cs-type')).toBe('Mechanical');
    expect(value('cs-lat')).toBe('42.6233');
    expect(value('cs-lon')).toBe('-71.4882');
    expect(value('cs-hei')).toBe('0.131');
    expect(value('cs-minaz')).toBe('0');
    expect(value('cs-maxaz')).toBe('360');
    expect(value('cs-minel')).toBe('1');
    expect(value('cs-maxel')).toBe('90');
    expect(value('cs-minrange')).toBe('200');
    expect(value('cs-maxrange')).toBe('50000');
    expect(value('cs-mask')).toBe('0,5\n180,12');
    // Telescope off so the copied limits are visible
    expect((getEl('cs-telescope') as HTMLInputElement).checked).toBe(false);
  });

  it('Clear Custom Sensors also resets a catalog primary sensor', () => {
    const sensorManager = ServiceLocator.getSensorManager();

    sensorManager.currentSensors = [catalogSensor()];
    const resetSpy = vi.spyOn(sensorManager, 'resetSensorSelected').mockImplementation(() => {
      sensorManager.currentSensors = [];
    });

    getEl('cs-clear')!.click();

    expect(resetSpy).toHaveBeenCalled();
    expect(sensorManager.isSensorSelected()).toBe(false);
  });
});
