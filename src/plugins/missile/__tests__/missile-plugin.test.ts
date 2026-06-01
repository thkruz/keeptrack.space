import { MissilePlugin } from '@app/plugins/missile/missile-plugin';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';

describe('MissilePlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  standardPluginSmokeSuite(MissilePlugin, 'MissilePlugin');
});
