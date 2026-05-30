import { vi } from 'vitest';
import { WatchlistFilterPlugin } from '@app/plugins/watchlist-filter/watchlist-filter';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
 import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('WatchlistFilterPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment([WatchlistPlugin]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(WatchlistFilterPlugin, 'WatchlistFilterPlugin');
});
