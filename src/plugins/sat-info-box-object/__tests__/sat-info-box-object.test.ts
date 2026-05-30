import { vi } from 'vitest';
import { SatInfoBoxObject } from '@app/plugins/sat-info-box-object/sat-info-box-object';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
 import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('SatInfoBoxObject', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SatInfoBoxObject, 'SatInfoBoxObject');
});
