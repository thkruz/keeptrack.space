import { vi } from 'vitest';
import { TimeSlider } from '@app/plugins/time-slider/time-slider';
import { ScenarioManagementPlugin } from '@app/plugins/scenario-management/scenario-management';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
 import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('TimeSlider', () => {
  beforeEach(() => {
    setupStandardEnvironment([ScenarioManagementPlugin, TopMenu]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(TimeSlider, 'TimeSlider');
});
