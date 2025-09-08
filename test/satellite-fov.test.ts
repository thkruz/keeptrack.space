import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { keepTrackApi } from '@app/keepTrackApi';
import { SatelliteFov } from '@app/plugins/satellite-fov/satellite-fov';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('SatelliteFov_class', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    keepTrackApi.getCatalogManager().getObject = () => defaultSat;
    keepTrackApi.getCatalogManager().satCruncher = {
      postMessage: jest.fn(),
    } as unknown as Worker;
  });

  standardPluginSuite(SatelliteFov);
  standardPluginMenuButtonTests(SatelliteFov);
});
