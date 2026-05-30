import { EciPlot } from '@app/plugins/plot-analysis/eci-plots';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';

describe('EciPlot_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSmokeSuite(EciPlot, 'EciPlot');
});
