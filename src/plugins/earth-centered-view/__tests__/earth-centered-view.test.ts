import { vi } from 'vitest';
import { EarthCenteredView } from '@app/plugins/earth-centered-view/earth-centered-view';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('EarthCenteredView', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(EarthCenteredView, 'EarthCenteredView');
});
