import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('NightToggle', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(NightToggle, 'NightToggle');
  standardPluginMenuButtonTests(NightToggle, 'Night_Toggle');
});
