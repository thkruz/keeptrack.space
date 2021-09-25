import * as satelliteFov from '@app/js/plugins/satelliteFov/satelliteFov';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('satelliteFov.uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      satelliteFov.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('satelliteFov.bottomMenuClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      satelliteFov.bottomMenuClick('menu-sat-fov');
      satelliteFov.bottomMenuClick('menu-sat-fov');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      document.body.innerHTML = `<input id="search" val=""></input>`;
      keepTrackApi.programs.objectManager.selectedSat = -1;
      satelliteFov.bottomMenuClick('menu-sat-fov');
      satelliteFov.bottomMenuClick('menu-sat-fov');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      satelliteFov.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
