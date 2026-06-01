import { ServiceLocator } from '@app/engine/core/service-locator';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
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
};

describe('CustomSensorPlugin.processCustomSensorSubmit_', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = CustomSensorPlugin as any;
  let addSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  const setForm = (over: Partial<typeof VALID> = {}) => {
    const fields = { ...VALID, ...over };

    for (const [id, value] of Object.entries(fields)) {
      const el = getEl(id, true) as HTMLInputElement | null;

      if (el) {
        el.value = value;
      }
    }
  };

  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorInfoPlugin, SensorListPlugin]);
    const plugin = new CustomSensorPlugin();

    websiteInit(plugin);
    // 'sensor-type' is written to before validation; ensure it exists.
    if (!getEl('sensor-type', true)) {
      document.body.insertAdjacentHTML('beforeend', '<input id="sensor-type" />');
    }
    addSpy = vi.spyOn(ServiceLocator.getSensorManager(), 'addSecondarySensor').mockImplementation(() => undefined as never);
    warnSpy = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds a secondary sensor for a fully valid form', () => {
    setForm();
    C.processCustomSensorSubmit_();

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['cs-lat', '95'],
    ['cs-lon', '200'],
    ['cs-hei', '-5'],
    ['cs-minaz', '400'],
    ['cs-maxaz', '400'],
    ['cs-minel', '-100'],
    ['cs-maxel', '100'],
    ['cs-minrange', '-1'],
    ['cs-maxrange', '-1'],
  ])('rejects an out-of-range %s and warns', (field, badValue) => {
    setForm({ [field]: badValue } as Partial<typeof VALID>);
    C.processCustomSensorSubmit_();

    expect(warnSpy).toHaveBeenCalled();
    expect(addSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['Optical'],
    ['Mechanical'],
    ['Phased Array Radar'],
  ])('builds a %s sensor', (sensorType) => {
    setForm({ 'cs-type': sensorType });
    C.processCustomSensorSubmit_();

    expect(addSpy).toHaveBeenCalledTimes(1);
  });

  it('defaults an unknown sensor type to Observer', () => {
    setForm({ 'cs-type': 'Wormhole Array' });
    C.processCustomSensorSubmit_();

    expect(addSpy).toHaveBeenCalledTimes(1);
  });

  it('passes the replace flag through to addSecondarySensor', () => {
    setForm();
    C.processCustomSensorSubmit_(true);

    expect(addSpy).toHaveBeenCalledWith(expect.anything(), true);
  });
});
