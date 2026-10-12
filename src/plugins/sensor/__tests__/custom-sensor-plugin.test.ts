import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { Degrees } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('CustomSensorPlugin_class', () => {
  let customSensorPlugin: CustomSensorPlugin;

  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorInfoPlugin, SensorListPlugin]);
    customSensorPlugin = new CustomSensorPlugin();
    expect(customSensorPlugin).toBeDefined(); // Variable is used indirectly by plugin suite tests
  });

  afterEach(() => {
    vi.advanceTimersByTime(1000);
  });

  it('constructs without throwing', () => {
    expect(() => new CustomSensorPlugin()).not.toThrow();
  });

  standardPluginSuite(CustomSensorPlugin);
  standardPluginMenuButtonTests(CustomSensorPlugin);
  standardClickTests(CustomSensorPlugin);
  standardChangeTests(CustomSensorPlugin);
});

describe('CustomSensorPlugin horizon mask', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorInfoPlugin, SensorListPlugin]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.advanceTimersByTime(1000);
  });

  const setValue = (id: string, value: string) => {
    (getEl(id) as HTMLInputElement | HTMLTextAreaElement).value = value;
  };

  it('renders the mask textarea in the field-of-view card', () => {
    const plugin = new CustomSensorPlugin();

    websiteInit(plugin);

    const textarea = getEl('cs-mask') as HTMLTextAreaElement;

    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.closest('form')?.id).toBe('custom-sensor-menu-form');
  });

  it('submits a masked sensor whose FieldOfView carries every vertex', () => {
    const plugin = new CustomSensorPlugin();

    websiteInit(plugin);
    const addSpy = vi.spyOn(ServiceLocator.getSensorManager(), 'addSecondarySensor').mockImplementation(() => undefined);

    setValue('cs-mask', '0,5\n90,25\n\n180,5;270,25');
    plugin.onFormSubmit();

    expect(addSpy).toHaveBeenCalledTimes(1);
    const sensor = addSpy.mock.calls[0][0] as DetailedSensor;

    expect(sensor.elevationMasks).toHaveLength(4);
    expect(sensor.interpolateMask).toBe(true);
    expect(sensor.getFieldOfView()?.elevationMasks).toHaveLength(4);
    // Floor at az 45 between (0,5) and (90,25): 5 + 20 * 45/90 = 15
    expect(sensor.getMaskElevationAt(45 as Degrees)).toBeCloseTo(15, 9);
  });

  it('refuses a bad mask and names the offending pair', () => {
    const plugin = new CustomSensorPlugin();

    websiteInit(plugin);
    const addSpy = vi.spyOn(ServiceLocator.getSensorManager(), 'addSecondarySensor').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(errorManagerInstance, 'warn').mockImplementation(() => undefined);

    setValue('cs-mask', '0,5\n400,10');
    plugin.onFormSubmit();

    expect(addSpy).not.toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain('"400,10"');
  });
});
