import { vi } from 'vitest';
import { SatInfoBoxOrbitGuard } from '@app/plugins/sat-info-box-orbit-guard/sat-info-box-orbit-guard';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
 import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('SatInfoBoxOrbitGuard', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SatInfoBoxOrbitGuard, 'SatInfoBoxOrbitGuard');
});
