import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SatelliteFov } from '@app/plugins/satellite-fov/satellite-fov';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('SatelliteFov_class', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    ServiceLocator.getCatalogManager().getObject = () => defaultSat;
    ServiceLocator.getCatalogManager().satCruncher = {
      postMessage: jest.fn(),
    } as unknown as Worker;
  });

  standardPluginSuite(SatelliteFov);
  standardPluginMenuButtonTests(SatelliteFov);
});
