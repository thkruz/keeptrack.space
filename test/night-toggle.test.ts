import { keepTrackApi } from '@app/js/keepTrackApi';
import { NightToggle } from '@app/js/plugins/night-toggle/night-toggle';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('NightToggle_class', () => {
  let nightToggle: NightToggle;
  beforeAll(() => {
    setupDefaultHtml();
    nightToggle = new NightToggle();
  });

  standardPluginSuite(NightToggle, 'NightToggle');
  standardPluginMenuButtonTests(NightToggle, 'Night_Toggle');

  // Tests that night toggle callback works
  it('test_night_toggle_callback', () => {
    const nightToggle = new NightToggle();
    nightToggle.init();
    expect(() => keepTrackApi.methods.nightToggle(global.mocks.glMock, null as unknown as WebGLTexture, null as unknown as WebGLTexture)).not.toThrow();
    keepTrackApi.methods.bottomMenuClick('menu-day-night');
    expect(() => keepTrackApi.methods.nightToggle(global.mocks.glMock, null as unknown as WebGLTexture, null as unknown as WebGLTexture)).not.toThrow();
  });
});
