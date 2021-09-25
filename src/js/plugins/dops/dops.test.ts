import * as dops from '@app/js/plugins/dops/dops';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('dops.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      dops.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('dops.dopsFormSubmit', () => {
  test('0', () => {
    let callFunction: any = () => {
      dops.dopsFormSubmit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('dops.uiManagerInit', () => {
  test('0', () => {
    let callFunction: any = () => {
      dops.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('dops.adviceReady', () => {
  test('0', () => {
    let callFunction: any = () => {
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
    let callFunction: any = () => {
      dops.loadingScreenFadeIn();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('dops.bottomMenuClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      dops.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('0', () => {
    let callFunction: any = () => {
      dops.bottomMenuClick('menu-dops');
      dops.bottomMenuClick('menu-dops');
    };

    expect(callFunction).not.toThrow();
  });
  test('1', () => {
    let callFunction: any = () => {
      dops.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('dops.hideSideMenus', () => {
  test('0', () => {
    let callFunction: any = () => {
      dops.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});
