import { ServiceLocator } from '@app/engine/core/service-locator';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
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

/**
 * Integration coverage for the DOM -> core -> sensorManager wiring. The pure
 * validation rules are covered exhaustively in custom-sensor-core.test.ts; this
 * file only confirms the form is read and routed correctly.
 */
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

  it('warns and does not add when a field is out of range', () => {
    setForm({ 'cs-lat': '95' });
    C.processCustomSensorSubmit_();

    expect(warnSpy).toHaveBeenCalled();
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('warns and does not add when a field is not a number', () => {
    setForm({ 'cs-lon': 'abc' });
    C.processCustomSensorSubmit_();

    expect(warnSpy).toHaveBeenCalled();
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('warns and does not add when min elevation exceeds max elevation', () => {
    setForm({ 'cs-minel': '80', 'cs-maxel': '10' });
    C.processCustomSensorSubmit_();

    expect(warnSpy).toHaveBeenCalled();
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('passes the replace flag through to addSecondarySensor', () => {
    setForm();
    C.processCustomSensorSubmit_(true);

    expect(addSpy).toHaveBeenCalledWith(expect.anything(), true);
  });

  it('does not throw when SensorInfo DOM fields are absent', () => {
    // The #sensor-type / #sensor-info-title writes target SensorInfoPlugin and
    // must be guarded; removing them should not break submit.
    getEl('sensor-type', true)?.remove();
    getEl('sensor-info-title', true)?.remove();
    setForm();

    expect(() => C.processCustomSensorSubmit_()).not.toThrow();
    expect(addSpy).toHaveBeenCalledTimes(1);
  });
});
