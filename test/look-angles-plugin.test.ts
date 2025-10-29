import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { LookAnglesPlugin } from '@app/plugins/sensor/look-angles-plugin';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('LookAnglesPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    jest.advanceTimersByTime(1000);
  });

  standardPluginSuite(LookAnglesPlugin);
  standardPluginMenuButtonTests(LookAnglesPlugin);
  standardClickTests(LookAnglesPlugin);
  standardChangeTests(LookAnglesPlugin);
});
