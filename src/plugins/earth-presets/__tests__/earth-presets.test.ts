import { vi } from 'vitest';
import { EarthPresetsPlugin } from '@app/plugins/earth-presets/earth-presets';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('EarthPresetsPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(EarthPresetsPlugin, 'EarthPresetsPlugin');
});
