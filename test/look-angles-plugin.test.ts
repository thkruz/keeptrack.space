import { LookAnglesPlugin } from '@app/plugins/sensor/look-angles-plugin';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('LookAnglesPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([]);
  });

  afterEach(() => {
    jest.advanceTimersByTime(1000);
  });

  standardPluginSuite(LookAnglesPlugin);
  standardPluginMenuButtonTests(LookAnglesPlugin);
  standardClickTests(LookAnglesPlugin);
  standardChangeTests(LookAnglesPlugin);
});
