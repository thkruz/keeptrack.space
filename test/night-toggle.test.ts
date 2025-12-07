import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('NightToggle_class', () => {
  let _nightToggle: NightToggle;

  beforeEach(() => {
    setupStandardEnvironment();
    _nightToggle = new NightToggle();
    void _nightToggle; // Variable is used indirectly by plugin suite tests
  });

  standardPluginSuite(NightToggle, 'NightToggle');
  standardPluginMenuButtonTests(NightToggle, 'Night_Toggle');
});
