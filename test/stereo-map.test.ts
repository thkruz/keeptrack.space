import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { StereoMap } from '@app/plugins/stereo-map/stereo-map';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('StereoMapPlugin_class', () => {
  beforeEach(() => {
    keepTrackApi.containerRoot.innerHTML = '';
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    ServiceLocator.getColorSchemeManager().colorData = new Float32Array(Array(100).fill(0));
    ServiceLocator.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    ServiceLocator.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    ServiceLocator.getCatalogManager().objectCache = [defaultSat];
    PluginRegistry.getPlugin(SelectSatManager).selectSat(0);
  });

  standardPluginSuite(StereoMap);
  standardPluginMenuButtonTests(StereoMap);
});
