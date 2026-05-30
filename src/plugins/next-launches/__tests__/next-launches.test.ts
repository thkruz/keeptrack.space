import { vi } from 'vitest';
import { NextLaunchesPlugin } from '@app/plugins/next-launches/next-launches';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite, standardPluginMenuButtonTests, standardClickTests, standardChangeTests } from '@test/generic-tests';

describe('NextLaunchesPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(NextLaunchesPlugin, 'NextLaunchesPlugin');
  standardPluginMenuButtonTests(NextLaunchesPlugin, 'NextLaunchesPlugin');
  standardClickTests(NextLaunchesPlugin);
  standardChangeTests(NextLaunchesPlugin);
});
