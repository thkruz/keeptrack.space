import { vi } from 'vitest';
import { SkipInterpolationToggle } from '@app/plugins/skip-interpolation-toggle/skip-interpolation-toggle';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('SkipInterpolationToggle', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SkipInterpolationToggle, 'SkipInterpolationToggle');
});
