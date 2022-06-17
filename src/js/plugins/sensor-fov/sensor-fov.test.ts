import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as sensorFov from '@app/js/plugins/sensor-fov/sensor-fov';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
// @ponicode
describe('sensorFov.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      sensorFov.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sensorFov.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
      sensorFov.bottomMenuClick('menu-fov-bubble');
      sensorFov.bottomMenuClick('menu-fov-bubble');
      settingsManager.isFOVBubbleModeOn = true;
      settingsManager.isShowSurvFence = false;
      sensorFov.bottomMenuClick('menu-fov-bubble');
      sensorFov.bottomMenuClick('menu-fov-bubble');
      keepTrackApi.programs.sensorManager.checkSensorSelected = () => false;
      sensorFov.bottomMenuClick('menu-fov-bubble');
      sensorFov.bottomMenuClick('menu-fov-bubble');
    };

    expect(callFunction).not.toThrow();
  });
  test('1', () => {
    const callFunction: any = () => {
      sensorFov.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sensorFov.enableFovView', () => {
  test('0', () => {
    const callFunction: any = () => {
      sensorFov.enableFovView();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('sensorFov.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      sensorFov.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sensorFov.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      sensorFov.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sensorFov.enableFovView', () => {
  test('0', () => {
    const callFunction: any = () => {
      sensorFov.enableFovView();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('sensorFov.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      sensorFov.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      sensorFov.bottomMenuClick('menu-fov-bubble');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      sensorFov.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      sensorFov.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      sensorFov.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      sensorFov.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
