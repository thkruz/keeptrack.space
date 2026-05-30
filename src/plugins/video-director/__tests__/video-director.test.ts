import { vi } from 'vitest';
import { VideoDirectorPlugin } from '@app/plugins/video-director/video-director';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite, standardPluginMenuButtonTests, standardClickTests, standardChangeTests } from '@test/generic-tests';

describe('VideoDirectorPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(VideoDirectorPlugin, 'VideoDirectorPlugin');
  standardPluginMenuButtonTests(VideoDirectorPlugin, 'VideoDirectorPlugin');
  standardClickTests(VideoDirectorPlugin);
  standardChangeTests(VideoDirectorPlugin);
});
