import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
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
    keepTrackApi.runEvent(KeepTrackApiEvents.bottomMenuClick, 'menu-day-night');
    expect(() => keepTrackApi.methods.nightToggle(global.mocks.glMock, null as unknown as WebGLTexture, null as unknown as WebGLTexture)).not.toThrow();
  });
});
