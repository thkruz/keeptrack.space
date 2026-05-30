import { vi } from 'vitest';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';

describe('SensorListPlugin_class', () => {
  beforeEach(() => {
    // Mock DateTimeManager uiManagerFinal_ to prevent errors
    (DateTimeManager.prototype as any).uiManagerFinal_ = vi.fn();
    setupStandardEnvironment([TopMenu, DateTimeManager]);
  });

  afterEach(() => {
    vi.advanceTimersByTime(1000);
  });

  standardPluginSuite(SensorListPlugin);
  standardPluginMenuButtonTests(SensorListPlugin);
  standardClickTests(SensorListPlugin);
});
