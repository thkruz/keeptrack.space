import { vi } from 'vitest';
import { Screenshot } from '@app/plugins/screenshot/screenshot';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('Screenshot', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(Screenshot, 'Screenshot');
});
