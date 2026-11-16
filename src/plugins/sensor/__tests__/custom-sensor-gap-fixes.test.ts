import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    vi.unstubAllGlobals();
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

  it('does not add a sensor whose name and position match an active one', () => {
    setForm();
    submitForm();
    const added = addSpy.mock.calls[0][0] as DetailedSensor;

    ServiceLocator.getSensorManager().secondarySensors = [added];
    vi.advanceTimersByTime(1500);
    submitForm();

    expect(addSpy).toHaveBeenCalledTimes(1);
    // Never silent: the second Add explains why nothing was added
    expect(toastSpy).toHaveBeenCalledTimes(2);
  });

  it('adds a sensor with a new name at the same position as an active one (#197)', () => {
    setForm();
    submitForm();
    const added = addSpy.mock.calls[0][0] as DetailedSensor;

    ServiceLocator.getSensorManager().secondarySensors = [added];
    vi.advanceTimersByTime(1500);
    setForm({ 'cs-uiName': 'Wide', 'cs-minaz': '0', 'cs-maxaz': '360' });
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

  it('starts with Telescope off and the field-of-view limits visible', () => {
    expect((getEl('cs-telescope') as HTMLInputElement).checked).toBe(false);
    for (const id of ['cs-minaz-div', 'cs-maxaz-div', 'cs-minel-div', 'cs-maxel-div', 'cs-minrange-div', 'cs-maxrange-div']) {
      expect(getEl(id)!.classList.contains('start-hidden')).toBe(false);
    }
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
    // The form says the values were inherited, naming the source sensor
    const note = getEl('cs-prefill-note')!;

    expect(note.style.display).toBe('');
    expect(note.textContent).not.toContain('prefillNote'); // rendered text, not the raw key
  });

  it('keeps the add/replace note aligned with the button labels and above the sticky bar (#327)', () => {
    const css = readFileSync(resolve(__dirname, '../custom-sensor.css'), 'utf8');
    const rule = css.slice(css.lastIndexOf('#custom-sensor-menu-form > #cs-add-replace-note'));

    expect(rule).toMatch(/padding-left:\s*21px/u);
    expect(rule).toMatch(/z-index:\s*3/u);
  });

  it('labels the range fields in km and the mask placeholder is not a sample mask', () => {
    const en = JSON.parse(readFileSync(resolve(__dirname, '../locales/en.src.json'), 'utf8')).plugins.CustomSensorPlugin.labels;

    expect(en.minRange).toContain('(km)');
    expect(en.maxRange).toContain('(km)');
    expect(en.elevation).toContain('(km)');
    expect(en.maskPlaceholder.includes(String.fromCharCode(10))).toBe(false);
    expect((getEl('cs-mask') as HTMLTextAreaElement).placeholder.includes(String.fromCharCode(10))).toBe(false);
  });

  it('Clear Custom Sensors does nothing when the confirmation is declined', () => {
    const sensorManager = ServiceLocator.getSensorManager();
    const clearSpy = vi.spyOn(sensorManager, 'clearSecondarySensors');

    vi.stubGlobal('confirm', () => false);
    getEl('cs-clear')!.click();

    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('Clear Custom Sensors also resets a catalog primary sensor', () => {
    vi.stubGlobal('confirm', () => true);
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
