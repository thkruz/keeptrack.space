import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { init } from './aboutManager';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

test('Load About Manager', () => {
  init();
  keepTrackApi.methods.uiManagerInit();
  keepTrackApi.methods.bottomMenuClick('menu-about');
  keepTrackApi.methods.bottomMenuClick('menu-about');
  keepTrackApi.methods.bottomMenuClick('NOTmenu-about');
  keepTrackApi.methods.hideSideMenus();
});
