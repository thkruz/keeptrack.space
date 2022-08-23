import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as satelliteView from './satellite-view';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('satelliteView.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      satelliteView.init();
      keepTrackApi.methods.uiManagerInit();
      keepTrackApi.methods.bottomMenuClick('menu-fake');
      keepTrackApi.methods.bottomMenuClick('menu-satview');
      keepTrackApi.methods.bottomMenuClick('menu-satview');

      keepTrackApi.programs.objectManager.selectedSat = 0;
      keepTrackApi.methods.bottomMenuClick('menu-satview');

      settingsManager.plugins.topMenu = true;
      keepTrackApi.methods.bottomMenuClick('menu-satview');
    };

    expect(callFunction).not.toThrow();
  });
});
