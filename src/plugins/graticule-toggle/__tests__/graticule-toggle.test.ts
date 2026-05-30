import { vi } from 'vitest';
import { GraticuleToggle } from '@app/plugins/graticule-toggle/graticule-toggle';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('GraticuleToggle', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(GraticuleToggle, 'GraticuleToggle');
});
