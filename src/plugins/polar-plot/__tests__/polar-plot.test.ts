import { vi } from 'vitest';
import { PolarPlotPlugin } from '@app/plugins/polar-plot/polar-plot';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';

describe('PolarPlotPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(PolarPlotPlugin, 'PolarPlotPlugin');
});
