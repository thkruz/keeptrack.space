import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { StereoMap } from '@app/plugins/stereo-map/stereo-map';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('StereoMapPlugin_class', () => {
  beforeEach(() => {
    keepTrackApi.containerRoot.innerHTML = '';
    setupStandardEnvironment();
    keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.getCatalogManager().objectCache = [defaultSat];
    keepTrackApi.getPlugin(SelectSatManager).selectSat(0);
  });

  standardPluginSuite(StereoMap);
  standardPluginMenuButtonTests(StereoMap);
});
