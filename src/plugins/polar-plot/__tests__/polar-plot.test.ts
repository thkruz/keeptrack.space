import { PolarPlotPlugin } from '@app/plugins/polar-plot/polar-plot';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('PolarPlotPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs without throwing', () => {
    expect(() => new PolarPlotPlugin()).not.toThrow();
  });

  standardPluginSuite(PolarPlotPlugin, 'PolarPlotPlugin');
  standardPluginMenuButtonTests(PolarPlotPlugin, 'PolarPlotPlugin');
  standardClickTests(PolarPlotPlugin);
  standardChangeTests(PolarPlotPlugin);
});
