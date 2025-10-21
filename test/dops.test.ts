import { DopsPlugin } from '@app/plugins/dops/dops';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginRmbTests, standardPluginSuite } from './generic-tests';

describe('Dops_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  standardPluginSuite(DopsPlugin);
  standardPluginMenuButtonTests(DopsPlugin);
  standardPluginRmbTests(DopsPlugin);
});
