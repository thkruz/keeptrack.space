import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as aboutManager from './aboutManager';
import { init } from './aboutManager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

test('Load About Manager', () => {
  init();
  keepTrackApi.methods.uiManagerInit();
  keepTrackApi.methods.bottomMenuClick('menu-about');
  keepTrackApi.methods.bottomMenuClick('menu-about');
  keepTrackApi.methods.bottomMenuClick('NOTmenu-about');
  keepTrackApi.methods.hideSideMenus();
});

// @ponicode
describe('aboutManager.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      aboutManager.init();
    };

    expect(callFunction).not.toThrow();
  });
});
