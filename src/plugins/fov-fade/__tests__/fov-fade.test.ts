import { FovFadePlugin } from '@app/plugins/fov-fade/fov-fade';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';

describe('FovFadePlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  standardPluginSmokeSuite(FovFadePlugin, 'FovFadePlugin');
});
