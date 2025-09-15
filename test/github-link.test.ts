import { GithubLinkPlugin } from '@app/plugins/github-link/github-link';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite } from './generic-tests';

describe('social_media_plugin', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
  });

  standardPluginSuite(GithubLinkPlugin, 'GithubLinkPlugin');
});
