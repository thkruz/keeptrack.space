import { vi } from 'vitest';
import { VideoDirectorPlugin } from '@app/plugins/video-director/video-director';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('VideoDirectorPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(VideoDirectorPlugin, 'VideoDirectorPlugin');
});
