import { vi } from 'vitest';
import { SatelliteFov } from '@app/plugins/satellite-fov/satellite-fov';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('SatelliteFov', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SatelliteFov, 'SatelliteFov');
});
