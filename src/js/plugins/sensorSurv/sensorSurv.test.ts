import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import * as sensorSurv from '@app/js/plugins/sensorSurv/sensorSurv';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('sensorSurv.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      sensorSurv.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sensorSurv.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
      sensorSurv.bottomMenuClick('menu-surveillance');
      sensorSurv.bottomMenuClick('menu-surveillance');
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => false;
      sensorSurv.bottomMenuClick('menu-surveillance');
      sensorSurv.bottomMenuClick('menu-surveillance');
    };

    expect(callFunction).not.toThrow();
  });
  test('1', () => {
    const callFunction: any = () => {
      sensorSurv.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sensorSurv.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      sensorSurv.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sensorSurv.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      sensorSurv.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sensorSurv.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      sensorSurv.bottomMenuClick('menu-surveillance');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      sensorSurv.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      sensorSurv.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      sensorSurv.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      sensorSurv.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      sensorSurv.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
