import { keepTrackApi } from '@app/js/keepTrackApi';
import { DopsPlugin } from '@app/js/plugins/dops/dops';
import { Degrees, Kilometers } from 'ootk';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginRmbTests, standardPluginSuite } from './generic-tests';

describe('Dops_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    keepTrackApi.getInputManager().Mouse = {
      latLon: {
        lat: <Degrees>0,
        lon: <Degrees>0,
      },
      dragPosition: [<Kilometers>0, <Kilometers>0, <Kilometers>0],
    } as any;
  });

  standardPluginSuite(DopsPlugin, 'DopsPlugin');
  standardPluginMenuButtonTests(DopsPlugin, 'DopsPlugin');
  standardPluginRmbTests(DopsPlugin, 'DopsPlugin');
});
