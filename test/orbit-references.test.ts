import { Doris } from '@app/doris/doris';
import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { OrbitReferences } from '@app/plugins/orbit-references/orbit-references';
import { SatInfoBox } from '@app/plugins/select-sat-manager/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginSuite } from './generic-tests';

// Create a short test for the OrbitReferences plugin
describe('OrbitReferences', () => {
  beforeEach(() => {
    keepTrackApi.containerRoot.innerHTML = '';
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
  });
  standardPluginSuite(OrbitReferences, 'OrbitReferences');

  it('should_not_throw_error', () => {
    const orbitReferences = new OrbitReferences();

    expect(() => orbitReferences.init()).not.toThrow();
    Doris.getInstance().emit(KeepTrackApiEvents.HtmlInitialize);
    Doris.getInstance().emit(KeepTrackApiEvents.AfterHtmlInitialize);
    expect(() => Doris.getInstance().emit(KeepTrackApiEvents.selectSatData, defaultSat, 0)).not.toThrow();

    keepTrackApi.getCatalogManager().analSatSet = [defaultSat];
    keepTrackApi.getPlugin(SelectSatManager).selectSat(0);
    keepTrackApi.getCatalogManager().addAnalystSat = () => defaultSat;
    getEl('orbit-references-link').click();
  });
});
