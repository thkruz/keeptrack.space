import { vi } from 'vitest';
import { SatelliteViewPlugin } from '@app/plugins/satellite-view/satellite-view';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('SatelliteViewPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SatelliteViewPlugin, 'SatelliteViewPlugin');
});
