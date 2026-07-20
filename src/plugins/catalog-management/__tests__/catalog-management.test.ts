import { CatalogManagementPlugin } from '@app/plugins/catalog-management/catalog-management';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('CatalogManagementPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs without throwing', () => {
    expect(() => new CatalogManagementPlugin()).not.toThrow();
  });

  standardPluginSuite(CatalogManagementPlugin, 'CatalogManagementPlugin');
  standardPluginMenuButtonTests(CatalogManagementPlugin, 'CatalogManagementPlugin');
});
