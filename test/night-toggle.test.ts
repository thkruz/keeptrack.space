import { Doris } from '@app/doris/doris';
import { KeepTrackApiEvents } from '@app/interfaces';
import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('NightToggle_class', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let nightToggle: NightToggle;

  // eslint-disable-next-line no-console
  console.debug(nightToggle);

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
    Doris.getInstance().emit(
      KeepTrackApiEvents.nightToggle,
      global.mocks.glMock,
      global.mocks.textureNight,
      global.mocks.textureDay,
    );
    Doris.getInstance().emit(KeepTrackApiEvents.bottomMenuClick, 'menu-day-night');
    expect(() =>
      Doris.getInstance().emit(
        KeepTrackApiEvents.nightToggle,
        global.mocks.glMock,
        null as unknown as WebGLTexture,
        null as unknown as WebGLTexture,
      ),
    ).not.toThrow();
  });
});
