import { keepTrackApi } from '@app/js/keepTrackApi';
import { Astronomy } from '@app/js/plugins/astronomy/astronomy';
import { defaultSensor } from './environment/apiMocks';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('astronomy plugin', () => {
  standardPluginSuite(Astronomy);
  standardPluginMenuButtonTests(Astronomy);

  keepTrackApi.methods.setSensor(defaultSensor, 0);
  keepTrackApi.getCatalogManager().isStarManagerLoaded = true;
  standardPluginMenuButtonTests(Astronomy);
});
