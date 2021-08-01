/* globals test jest */

import $ from 'jquery';
import { init } from './twitter';
import { keepTrackApi } from '@app/js/api/externalApi';

test(`main`, async () => {
  keepTrackApi.programs.uiManager = {
    hideSideMenus: jest.fn(),
    searchToggle: jest.fn(),
  };
  keepTrackApi.programs.settingsManager = {
    isMobileModeEnabled: false,
  };

  init();
  keepTrackApi.methods.uiManagerInit();
  keepTrackApi.methods.bottomMenuClick('NOT-menu-twitter');
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
  keepTrackApi.methods.hideSideMenus();

  keepTrackApi.programs.settingsManager.isMobileModeEnabled = true;
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
  keepTrackApi.methods.bottomMenuClick('menu-twitter');
});
