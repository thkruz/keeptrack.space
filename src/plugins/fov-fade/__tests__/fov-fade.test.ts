import { FovFadePlugin } from '@app/plugins/fov-fade/fov-fade';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';

describe('FovFadePlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  it('constructs without throwing', () => {
    expect(() => new FovFadePlugin()).not.toThrow();
  });

  standardPluginSmokeSuite(FovFadePlugin, 'FovFadePlugin');
});
