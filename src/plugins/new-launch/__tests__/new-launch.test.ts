import { vi } from 'vitest';
import { NewLaunch } from '@app/plugins/new-launch/new-launch';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('NewLaunch', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(NewLaunch, 'NewLaunch');
});
