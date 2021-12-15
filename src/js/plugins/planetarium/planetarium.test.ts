import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import * as planetarium from '@app/js/plugins/planetarium/planetarium';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('planetarium.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      planetarium.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('planetarium.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      planetarium.bottomMenuClick('menu-planetarium');
      planetarium.bottomMenuClick('menu-planetarium');
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
      keepTrackApi.programs.astronomy = {};
      planetarium.bottomMenuClick('menu-planetarium');
      planetarium.bottomMenuClick('menu-planetarium');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      planetarium.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('planetarium.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      planetarium.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('planetarium.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      planetarium.bottomMenuClick('menu-planetarium');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      planetarium.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      planetarium.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      planetarium.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      planetarium.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
