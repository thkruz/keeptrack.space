import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { init } from './twitter';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

test(`main`, async () => {
  settingsManager = {
    isMobileModeEnabled: false,
  };

  init();
  keepTrackApi.methods.uiManagerInit();
  keepTrackApi.methods.bottomMenuClick('NOT-menu-twitter');
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
  keepTrackApi.methods.hideSideMenus();

  settingsManager.isMobileModeEnabled = true;
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
});
