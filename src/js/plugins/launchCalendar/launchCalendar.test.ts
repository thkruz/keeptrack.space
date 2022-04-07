import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as launchCalendar from '@app/js/plugins/launchCalendar/launchCalendar';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
// @ponicode
describe('launchCalendar.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      launchCalendar.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('launchCalendar.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      launchCalendar.bottomMenuClick('menu-launches');
      launchCalendar.bottomMenuClick('menu-launches');
      settingsManager.isMobileModeEnabled = true;
      launchCalendar.bottomMenuClick('menu-launches');
      launchCalendar.bottomMenuClick('menu-launches');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      launchCalendar.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('launchCalendar.hideSideMenus', () => {
  test('0', () => {
    const callFunction: any = () => {
      launchCalendar.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('launchCalendar.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      launchCalendar.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('launchCalendar.cboxClosed', () => {
  test('0', () => {
    const callFunction: any = () => {
      launchCalendar.cboxClosed();
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      launchCalendar.bottomMenuClick('menu-launches');
      launchCalendar.cboxClosed();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('launchCalendar.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      launchCalendar.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      launchCalendar.bottomMenuClick('menu-launches');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      launchCalendar.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      launchCalendar.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      launchCalendar.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      launchCalendar.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('launchCalendar.cboxClosed', () => {
  test('0', () => {
    const callFunction: any = () => {
      launchCalendar.cboxClosed();
    };

    expect(callFunction).not.toThrow();
  });
});
