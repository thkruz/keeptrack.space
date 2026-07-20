import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
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
