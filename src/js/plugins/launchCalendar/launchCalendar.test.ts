import * as launchCalendar from '@app/js/plugins/launchCalendar/launchCalendar';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('launchCalendar.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      launchCalendar.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('launchCalendar.bottomMenuClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      launchCalendar.bottomMenuClick('menu-launches');
      launchCalendar.bottomMenuClick('menu-launches');
      keepTrackApi.programs.settingsManager.isMobileModeEnabled = true;
      launchCalendar.bottomMenuClick('menu-launches');
      launchCalendar.bottomMenuClick('menu-launches');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      launchCalendar.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('launchCalendar.hideSideMenus', () => {
  test('0', () => {
    let callFunction: any = () => {
      launchCalendar.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('launchCalendar.uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      launchCalendar.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('launchCalendar.cboxClosed', () => {
  test('0', () => {
    let callFunction: any = () => {
      launchCalendar.cboxClosed();
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      launchCalendar.bottomMenuClick('menu-launches');
      launchCalendar.cboxClosed();
    };

    expect(callFunction).not.toThrow();
  });
});
