import { vi } from 'vitest';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { CustomSensorPlugin } from '@app/plugins/sensor/custom-sensor-plugin';
import { SensorInfoPlugin } from '@app/plugins/sensor/sensor-info-plugin';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';

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

  standardPluginSuite(CustomSensorPlugin);
  standardPluginMenuButtonTests(CustomSensorPlugin);
  standardClickTests(CustomSensorPlugin);
  standardChangeTests(CustomSensorPlugin);
});
