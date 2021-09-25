import * as astronomy from '@app/js/plugins/astronomy/astronomy';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('astronomy.uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      astronomy.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('astronomy.bottomMenuClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      keepTrackApi.programs.astronomy = {};
      keepTrackApi.programs.astronomy.isAstronomyView = false;
      astronomy.bottomMenuClick('menu-astronomy');
      astronomy.bottomMenuClick('menu-astronomy');
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
      keepTrackApi.programs.planetarium = {};
      astronomy.bottomMenuClick('menu-astronomy');
      astronomy.bottomMenuClick('menu-astronomy');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      astronomy.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
