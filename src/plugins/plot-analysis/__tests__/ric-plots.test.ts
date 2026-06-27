import { RicPlot } from '@app/plugins/plot-analysis/ric-plots';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';

describe('RicPlot_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  it('constructs without throwing', () => {
    expect(() => new RicPlot()).not.toThrow();
  });

  standardPluginSmokeSuite(RicPlot, 'RicPlot');
});
