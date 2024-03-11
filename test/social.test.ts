import { SocialMedia } from '@app/plugins/social/social';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite } from './generic-tests';

describe('social_media_plugin', () => {
  beforeEach(() => {
    setupStandardEnvironment([SocialMedia]);
  });

  standardPluginSuite(SocialMedia, 'SocialMedia');
});
