import { keepTrackApi } from '@app/keepTrackApi';
import { SatelliteFov } from '@app/plugins/satellite-fov/satellite-fov';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('SatelliteFov_class', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let satelliteFovPlugin: SatelliteFov;

  // eslint-disable-next-line no-console
  console.debug(satelliteFovPlugin);

  beforeEach(() => {
    setupStandardEnvironment();
    satelliteFovPlugin = new SatelliteFov();
    keepTrackApi.getCatalogManager().getObject = () => defaultSat;
    keepTrackApi.getCatalogManager().satCruncher = {
      postMessage: jest.fn(),
    } as unknown as Worker;
  });

  standardPluginSuite(SatelliteFov);
  standardPluginMenuButtonTests(SatelliteFov);
});
