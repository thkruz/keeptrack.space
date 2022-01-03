import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as twitter from './twitter';
import { init } from './twitter';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('twitter.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      twitter.init();
    };

    expect(callFunction).not.toThrow();
  });
});

test(`main`, async () => {
  (<any>window).settingsManager = {
    isMobileModeEnabled: false,
  };

  init();
  keepTrackApi.methods.uiManagerInit();
  keepTrackApi.methods.bottomMenuClick('NOT-menu-twitter');
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
  keepTrackApi.methods.hideSideMenus();

  (<any>window).settingsManager.isMobileModeEnabled = true;
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
});
