import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import * as astronomy from '@app/js/plugins/astronomy/astronomy';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('astronomy.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      astronomy.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('astronomy.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
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
    const callFunction: any = () => {
      astronomy.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('astronomy.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      astronomy.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('astronomy.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      astronomy.bottomMenuClick('menu-astronomy');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      astronomy.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      astronomy.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      astronomy.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      astronomy.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      astronomy.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
