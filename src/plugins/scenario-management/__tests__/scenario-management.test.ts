import { vi } from 'vitest';
import { ScenarioManagementPlugin } from '@app/plugins/scenario-management/scenario-management';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('ScenarioManagementPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(ScenarioManagementPlugin, 'ScenarioManagementPlugin');
});
