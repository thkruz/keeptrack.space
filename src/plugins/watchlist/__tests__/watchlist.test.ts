import { vi } from 'vitest';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite, standardPluginMenuButtonTests } from '@test/generic-tests';

describe('WatchlistPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(WatchlistPlugin, 'WatchlistPlugin');
  standardPluginMenuButtonTests(WatchlistPlugin, 'WatchlistPlugin');
});
