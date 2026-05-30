import { vi } from 'vitest';
import { ViewInfoRmbPlugin } from '@app/plugins/view-info-rmb/view-info-rmb';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('ViewInfoRmbPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(ViewInfoRmbPlugin, 'ViewInfoRmbPlugin');
});
