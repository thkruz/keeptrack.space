import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as dops from '../../plugins/dops/dops';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
// @ponicode
describe('dops.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      dops.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('dops.dopsFormSubmit', () => {
  test('0', () => {
    const callFunction: any = () => {
      dops.dopsFormSubmit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('dops.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      dops.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('dops.adviceReady', () => {
  test('0', () => {
    const callFunction: any = () => {
      dops.adviceReady();
      keepTrackApi.programs.adviceManager.adviceList.socrates();
      keepTrackApi.programs.adviceManager.adviceList.socrates();
      keepTrackApi.programs.adviceManager.adviceList.socrates();
      keepTrackApi.programs.adviceManager.adviceList.socrates();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('dops.loadingScreenFadeIn', () => {
  test('0', () => {
    const callFunction: any = () => {
      dops.loadingScreenFadeIn();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('dops.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      dops.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('0', () => {
    const callFunction: any = () => {
      dops.bottomMenuClick('menu-dops');
      dops.bottomMenuClick('menu-dops');
    };

    expect(callFunction).not.toThrow();
  });
  test('1', () => {
    const callFunction: any = () => {
      dops.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('dops.hideSideMenus', () => {
  test('0', () => {
    const callFunction: any = () => {
      dops.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('dops.adviceReady', () => {
  test('0', () => {
    const callFunction: any = () => {
      dops.adviceReady();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('dops.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      dops.bottomMenuClick('menu-dops');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      dops.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      dops.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      dops.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      dops.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      dops.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
