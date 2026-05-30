import { vi } from 'vitest';
import { FpsView } from '@app/plugins/fps-view/fps-view';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('FpsView', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(FpsView, 'FpsView');
});
