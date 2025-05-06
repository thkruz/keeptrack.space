import { Doris } from '@app/doris/doris';
import { keepTrackApi } from '@app/keepTrackApi';
import { AstronomyPlugin } from '@app/plugins-pro/astronomy/astronomy';
import { defaultSensor } from './environment/apiMocks';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';


describe('astronomy plugin', () => {
  standardPluginSuite(AstronomyPlugin);
  standardPluginMenuButtonTests(AstronomyPlugin);

  Doris.getInstance().emit(KeepTrackApiEvents.setSensor, defaultSensor, 0);
  keepTrackApi.getCatalogManager().isStarManagerLoaded = true;
  standardPluginMenuButtonTests(AstronomyPlugin);
});
