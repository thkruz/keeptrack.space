import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as countries from './countries';
/* eslint-disable no-undefined */

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
settingsManager = window.settingsManager;
// @ponicode
describe('countries.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      countries.init();
    };

    expect(callFunction).not.toThrow();
  });
});

describe('countries.countryMenuClick', () => {
  keepTrackApi.programs.groups.createGroup = () => ({
    sats: [
      { satId: 1, SCC_NUM: '25544' },
      { satId: 1, SCC_NUM: '25544' },
    ],
    updateOrbits: jest.fn(),
  });

  test('0', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('Canada');
      keepTrackApi.programs.groups.Canada = undefined;
      countries.countryMenuClick('Canada');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      countries.countryMenuClick(true);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      countries.countryMenuClick(false);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      countries.countryMenuClick(987650);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('Japan');
      keepTrackApi.programs.groups.Japan = undefined;
      countries.countryMenuClick('Japan');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      countries.countryMenuClick(NaN);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('France');
      keepTrackApi.programs.groups.France = undefined;
      countries.countryMenuClick('France');
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('China');
      keepTrackApi.programs.groups.China = undefined;
      countries.countryMenuClick('China');
    };

    expect(callFunction).not.toThrow();
  });

  test('8', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('India');
      keepTrackApi.programs.groups.India = undefined;
      countries.countryMenuClick('India');
    };

    expect(callFunction).not.toThrow();
  });

  test('9', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('Israel');
      keepTrackApi.programs.groups.Israel = undefined;
      countries.countryMenuClick('Israel');
    };

    expect(callFunction).not.toThrow();
  });

  test('10', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('Russia');
      keepTrackApi.programs.groups.Russia = undefined;
      countries.countryMenuClick('Russia');
    };

    expect(callFunction).not.toThrow();
  });

  test('11', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('UnitedKingdom');
      keepTrackApi.programs.groups.UnitedKingdom = undefined;
      countries.countryMenuClick('UnitedKingdom');
    };

    expect(callFunction).not.toThrow();
  });

  test('12', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('UnitedStates');
      keepTrackApi.programs.groups.UnitedStates = undefined;
      countries.countryMenuClick('UnitedStates');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('countries.groupSelected', () => {
  test('0', () => {
    const callFunction: any = () => {
      countries.groupSelected('SpaceStations');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      countries.groupSelected(undefined);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      countries.groupSelected('National Infrastructure Supervisor');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      countries.groupSelected('spaces');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      countries.groupSelected('callback detected, not supported yet');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      countries.groupSelected('bc23a9d531064583ace8f67dad60f6bb');
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      countries.groupSelected('SpaceStations');
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    const callFunction: any = () => {
      countries.groupSelected(NaN);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('countries.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      countries.bottomMenuClick('menu-countries');
      countries.bottomMenuClick('menu-countries');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      countries.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('countries.hideSideMenus', () => {
  test('0', () => {
    const callFunction: any = () => {
      countries.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('countries.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      countries.bottomMenuClick('menu-countries');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      countries.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      countries.bottomMenuClick('Investment Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      countries.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      countries.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      countries.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('countries.uiManagerInit', () => {
  test('0', () => {
    const callFunction: any = () => {
      countries.uiManagerInit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('countries.countryMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      countries.countryMenuClick(false);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('China');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      countries.countryMenuClick(true);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('France');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('Japan');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      countries.countryMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});
