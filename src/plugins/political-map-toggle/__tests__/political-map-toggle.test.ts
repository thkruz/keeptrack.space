import { vi } from 'vitest';
import { PoliticalMapToggle } from '@app/plugins/political-map-toggle/political-map-toggle';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('PoliticalMapToggle', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(PoliticalMapToggle, 'PoliticalMapToggle');
});
