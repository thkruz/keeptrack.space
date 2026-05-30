import { vi } from 'vitest';
import { ShortTermFences } from '@app/plugins/short-term-fences/short-term-fences';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
 import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite, standardPluginMenuButtonTests, standardClickTests, standardChangeTests } from '@test/generic-tests';

describe('ShortTermFences', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(ShortTermFences, 'ShortTermFences');
  standardPluginMenuButtonTests(ShortTermFences, 'ShortTermFences');
  standardClickTests(ShortTermFences);
  standardChangeTests(ShortTermFences);
});
