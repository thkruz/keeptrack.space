import { Lat2LonPlots } from '@app/plugins/plot-analysis/lat2lon';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite } from '@test/generic-tests';

describe('Lat2LonPlots_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  it('constructs without throwing', () => {
    expect(() => new Lat2LonPlots()).not.toThrow();
  });

  standardPluginSmokeSuite(Lat2LonPlots, 'Lat2LonPlots');
});
