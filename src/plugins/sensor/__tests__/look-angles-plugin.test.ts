import { vi } from 'vitest';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { LookAnglesPlugin } from '@app/plugins/sensor/look-angles-plugin';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';

describe('LookAnglesPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.advanceTimersByTime(1000);
  });

  standardPluginSuite(LookAnglesPlugin);
  standardPluginMenuButtonTests(LookAnglesPlugin);
  standardClickTests(LookAnglesPlugin);
  standardChangeTests(LookAnglesPlugin);
});
