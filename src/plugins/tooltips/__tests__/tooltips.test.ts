import { vi } from 'vitest';
import { TooltipsPlugin } from '@app/plugins/tooltips/tooltips';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('TooltipsPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(TooltipsPlugin, 'TooltipsPlugin');
});
