import { vi } from 'vitest';
import { CatalogManagementPlugin } from '@app/plugins/catalog-management/catalog-management';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite, standardPluginMenuButtonTests } from '@test/generic-tests';

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
