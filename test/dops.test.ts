import { keepTrackApi } from '@app/keepTrackApi';
import { DopsPlugin } from '@app/plugins/dops/dops';
import { MouseInput } from '@app/singletons/input-manager/mouse-input';
import { Degrees, Kilometers } from 'ootk';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginRmbTests, standardPluginSuite } from './generic-tests';

describe('Dops_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    keepTrackApi.getInputManager().mouse = {
      latLon: {
        lat: <Degrees>0,
        lon: <Degrees>0,
      },
      dragPosition: [<Kilometers>0, <Kilometers>0, <Kilometers>0],
    } as unknown as MouseInput;
  });

  standardPluginSuite(DopsPlugin, 'DopsPlugin');
  standardPluginMenuButtonTests(DopsPlugin, 'DopsPlugin');
  standardPluginRmbTests(DopsPlugin, 'DopsPlugin');
});
