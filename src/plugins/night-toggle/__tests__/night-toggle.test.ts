import { vi } from 'vitest';
import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('NightToggle', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(NightToggle, 'NightToggle');
});
