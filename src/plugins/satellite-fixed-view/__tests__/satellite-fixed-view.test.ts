import { vi } from 'vitest';
import { SatelliteFixedView } from '@app/plugins/satellite-fixed-view/satellite-fixed-view';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('SatelliteFixedView', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SatelliteFixedView, 'SatelliteFixedView');
});
