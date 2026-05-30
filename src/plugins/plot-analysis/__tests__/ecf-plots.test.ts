import { EcfPlot } from '@app/plugins/plot-analysis/ecf-plots';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';

describe('EcfPlot_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSmokeSuite(EcfPlot, 'EcfPlot');
});
