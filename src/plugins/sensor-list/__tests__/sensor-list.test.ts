import { vi } from 'vitest';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
 import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite, standardPluginMenuButtonTests, standardClickTests, standardChangeTests } from '@test/generic-tests';

describe('SensorListPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SensorListPlugin, 'SensorListPlugin');
  standardPluginMenuButtonTests(SensorListPlugin, 'SensorListPlugin');
  standardClickTests(SensorListPlugin);
  standardChangeTests(SensorListPlugin);
});
