import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { init } from './aboutManager';

test('Load About Manager', () => {
  keepTrackApi.programs.uiManager.hideSideMenus = jest.fn();

  init();
  keepTrackApi.methods.uiManagerInit();
  keepTrackApi.methods.bottomMenuClick('menu-about');
  keepTrackApi.methods.bottomMenuClick('menu-about');
  keepTrackApi.methods.bottomMenuClick('NOTmenu-about');
  keepTrackApi.methods.hideSideMenus();
});
