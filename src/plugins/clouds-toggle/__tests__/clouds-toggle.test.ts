import { vi } from 'vitest';
import { CloudsToggle } from '@app/plugins/clouds-toggle/clouds-toggle';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('CloudsToggle', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(CloudsToggle, 'CloudsToggle');
});
