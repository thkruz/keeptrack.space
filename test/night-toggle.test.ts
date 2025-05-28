import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('NightToggle_class', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let nightToggle: NightToggle;

  beforeAll(() => {
    setupDefaultHtml();
    nightToggle = new NightToggle();
  });

  standardPluginSuite(NightToggle, 'NightToggle');
  standardPluginMenuButtonTests(NightToggle, 'Night_Toggle');
});
