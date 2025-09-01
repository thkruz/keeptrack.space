import { EventBusEvent } from '@app/engine/core/interfaces';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { OrbitReferences } from '@app/plugins/orbit-references/orbit-references';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
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

  it.skip('should_not_throw_error', () => {
    const orbitReferences = new OrbitReferences();

    expect(() => orbitReferences.init()).not.toThrow();
    keepTrackApi.emit(EventBusEvent.uiManagerInit);
    keepTrackApi.emit(EventBusEvent.uiManagerFinal);
    expect(() => keepTrackApi.emit(EventBusEvent.selectSatData, defaultSat, 0)).not.toThrow();

    keepTrackApi.getCatalogManager().analSatSet = [defaultSat];
    keepTrackApi.getPlugin(SelectSatManager).selectSat(0);
    keepTrackApi.getCatalogManager().addAnalystSat = () => defaultSat;
    getEl('orbit-references-link').click();
  });
});
