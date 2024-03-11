import { Planetarium } from '@app/plugins/planetarium/planetarium';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('planetarium plugin', () => {
  standardPluginSuite(Planetarium, 'planetarium');
  standardPluginMenuButtonTests(Planetarium, 'planetarium');
});
