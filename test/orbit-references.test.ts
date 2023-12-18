import { keepTrackApi } from '@app/keepTrackApi';
import { OrbitReferences } from '@app/plugins/orbit-references/orbit-references';
import { SatInfoBoxCore } from '@app/plugins/select-sat-manager/satInfoboxCore';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite } from './generic-tests';

// Create a short test for the OrbitReferences plugin
describe('OrbitReferences', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setupStandardEnvironment([SelectSatManager, SatInfoBoxCore]);
  });
  standardPluginSuite(OrbitReferences, 'OrbitReferences');

  it('should_not_throw_error', () => {
    const orbitReferences = new OrbitReferences();
    expect(() => orbitReferences.init()).not.toThrow();
    keepTrackApi.methods.uiManagerInit();
    keepTrackApi.methods.uiManagerFinal();
    expect(() => keepTrackApi.methods.selectSatData(defaultSat, 0)).not.toThrow();

    keepTrackApi.getCatalogManager().analSatSet = [defaultSat];
    keepTrackApi.getCatalogManager().selectedSat = 0;
    keepTrackApi.getCatalogManager().insertNewAnalystSatellite = () => defaultSat;
    document.getElementById('orbit-references-link').click();
  });
});
