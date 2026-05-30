import { vi } from 'vitest';
import { SatelliteEciView } from '@app/plugins/satellite-eci-view/satellite-eci-view';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('SatelliteEciView', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SatelliteEciView, 'SatelliteEciView');
});
