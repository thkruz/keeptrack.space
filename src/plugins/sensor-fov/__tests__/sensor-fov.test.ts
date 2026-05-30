import { vi } from 'vitest';
import { SensorFov } from '@app/plugins/sensor-fov/sensor-fov';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { DateTimeManager } from '@app/plugins/date-time-manager/date-time-manager';
import { SensorListPlugin } from '@app/plugins/sensor-list/sensor-list';
 import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('SensorFov', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu, DateTimeManager, SensorListPlugin]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SensorFov, 'SensorFov');
});
