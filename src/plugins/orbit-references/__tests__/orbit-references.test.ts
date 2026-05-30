import { vi } from 'vitest';
import { OrbitReferences } from '@app/plugins/orbit-references/orbit-references';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
 import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('OrbitReferences', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(OrbitReferences, 'OrbitReferences');
});
