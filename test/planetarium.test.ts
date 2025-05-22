import { Planetarium } from '@app/plugins-pro/planetarium/planetarium';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('planetarium plugin', () => {
  standardPluginSuite(Planetarium, 'planetarium');
  standardPluginMenuButtonTests(Planetarium, 'planetarium');
});
