import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as newLaunch from './newLaunch';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('newLaunch.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      newLaunch.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('newLaunch.newLaunchSubmit', () => {
  test('0', () => {
    const callFunction: any = () => {
      keepTrackApi.programs.objectManager.isLaunchSiteManagerLoaded = true;
      newLaunch.newLaunchSubmit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('newLaunch.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      newLaunch.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('newLaunch.hideSideMenus', () => {
  test('0', () => {
    const callFunction: any = () => {
      newLaunch.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('newLaunch.adviceReady', () => {
  test('0', () => {
    const callFunction: any = () => {
      newLaunch.adviceReady();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('newLaunch.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      newLaunch.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      keepTrackApi.programs.objectManager.selectedSat = 1;
      newLaunch.bottomMenuClick('menu-newLaunch');
      newLaunch.bottomMenuClick('menu-newLaunch');
      keepTrackApi.programs.objectManager.selectedSat = -1;
      newLaunch.bottomMenuClick('menu-newLaunch');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      newLaunch.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('newLaunch.newLaunchSubmit', () => {
  test('0', () => {
    const callFunction: any = () => {
      newLaunch.newLaunchSubmit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('newLaunch.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      newLaunch.bottomMenuClick('menu-newLaunch');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      newLaunch.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      newLaunch.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      newLaunch.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      newLaunch.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      newLaunch.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
