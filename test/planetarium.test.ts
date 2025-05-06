import { PlanetariumPlugin } from '@app/plugins-pro/planetarium/planetarium';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('planetarium plugin', () => {
  standardPluginSuite(PlanetariumPlugin, 'planetarium');
  standardPluginMenuButtonTests(PlanetariumPlugin, 'planetarium');
});
