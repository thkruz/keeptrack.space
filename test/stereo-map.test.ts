import { keepTrackApi } from '@app/js/keepTrackApi';
import { StereoMapPlugin } from '@app/js/plugins/stereo-map/stereo-map';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('StereoMapPlugin_class', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setupStandardEnvironment();
    keepTrackApi.getColorSchemeManager().colorData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.getDotsManager().sizeData = Array(100).fill(0) as unknown as Int8Array;
    keepTrackApi.getDotsManager().positionData = Array(100).fill(0) as unknown as Float32Array;
    keepTrackApi.getCatalogManager().satData = [defaultSat];
    keepTrackApi.getCatalogManager().selectSat(0);
  });

  standardPluginSuite(StereoMapPlugin);
  standardPluginMenuButtonTests(StereoMapPlugin);
});
