import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as satelliteFov from '@app/js/plugins/satellite-fov/satellite-fov';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('satelliteFov.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      satelliteFov.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('satelliteFov.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      satelliteFov.bottomMenuClick('menu-sat-fov');
      satelliteFov.bottomMenuClick('menu-sat-fov');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      document.body.innerHTML = `<input id="search" val=""></input>`;
      keepTrackApi.programs.objectManager.selectedSat = -1;
      satelliteFov.bottomMenuClick('menu-sat-fov');
      satelliteFov.bottomMenuClick('menu-sat-fov');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      satelliteFov.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('satelliteFov.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      satelliteFov.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('satelliteFov.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      satelliteFov.bottomMenuClick('menu-sat-fov');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      satelliteFov.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      satelliteFov.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      satelliteFov.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      satelliteFov.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      satelliteFov.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
