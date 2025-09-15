import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { MultiSiteLookAnglesPlugin } from '@app/plugins/sensor/multi-site-look-angles-plugin';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('MultiSiteLookAnglesPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    jest.advanceTimersByTime(1000);
  });

  standardPluginSuite(MultiSiteLookAnglesPlugin);
  standardPluginMenuButtonTests(MultiSiteLookAnglesPlugin);
  standardClickTests(MultiSiteLookAnglesPlugin);
  standardChangeTests(MultiSiteLookAnglesPlugin);
});
