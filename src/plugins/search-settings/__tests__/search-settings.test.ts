import { vi } from 'vitest';
import { SearchSettingsPlugin } from '@app/plugins/search-settings/search-settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('SearchSettingsPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SearchSettingsPlugin, 'SearchSettingsPlugin');
});
