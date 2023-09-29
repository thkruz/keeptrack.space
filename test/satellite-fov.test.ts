import { keepTrackApi } from '@app/js/keepTrackApi';
import { SatelliteFov } from '@app/js/plugins/satellite-fov/satellite-fov';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('SatelliteFov_class', () => {
  let satelliteFovPlugin: SatelliteFov;
  beforeEach(() => {
    setupStandardEnvironment();
    satelliteFovPlugin = new SatelliteFov();
    keepTrackApi.getCatalogManager().getSat = () => defaultSat;
    keepTrackApi.getCatalogManager().satCruncher = {
      postMessage: jest.fn(),
    } as any;
  });

  standardPluginSuite(SatelliteFov);
  standardPluginMenuButtonTests(SatelliteFov);
});
