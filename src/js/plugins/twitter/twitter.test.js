import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { init } from './twitter';

test(`main`, async () => {
  keepTrackApi.programs.uiManager = {
    hideSideMenus: jest.fn(),
    searchToggle: jest.fn(),
  };
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
