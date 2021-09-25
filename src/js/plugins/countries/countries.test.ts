import * as countries from "@app/js/plugins/countries/countries"

import { expect } from "@jest/globals"
import { keepTrackApi } from "@app/js/api/externalApi"
import { keepTrackApiStubs } from "@app/js/api/apiMocks"

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
keepTrackApi.programs.settingsManager = window.settingsManager;
// @ponicode
describe("countries.init", () => {
    test("0", () => {
        let callFunction: any = () => {
            countries.init()
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe('countries.countryMenuClick', () => {
  keepTrackApi.programs.groups.createGroup = () => ({
    sats: [
      { satId: 1, SCC_NUM: '25544' },
      { satId: 1, SCC_NUM: '25544' },
    ],
    updateOrbits: jest.fn(),
  });

  test('0', () => {
    let callFunction: any = () => {
      countries.countryMenuClick('Canada');
      keepTrackApi.programs.groups.Canada = undefined;
      countries.countryMenuClick('Canada');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      countries.countryMenuClick(true);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      countries.countryMenuClick(false);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      countries.countryMenuClick(987650);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      countries.countryMenuClick('Japan');
      keepTrackApi.programs.groups.Japan = undefined;
      countries.countryMenuClick('Japan');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      countries.countryMenuClick(NaN);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    let callFunction: any = () => {
      countries.countryMenuClick('France');
      keepTrackApi.programs.groups.France = undefined;
      countries.countryMenuClick('France');
    };

    expect(callFunction).not.toThrow();
  });

  test('7', () => {
    let callFunction: any = () => {
      countries.countryMenuClick('China');
      keepTrackApi.programs.groups.China = undefined;
      countries.countryMenuClick('China');
    };

    expect(callFunction).not.toThrow();
  });

  test('8', () => {
    let callFunction: any = () => {
      countries.countryMenuClick('India');
      keepTrackApi.programs.groups.India = undefined;
      countries.countryMenuClick('India');
    };

    expect(callFunction).not.toThrow();
  });

  test('9', () => {
    let callFunction: any = () => {
      countries.countryMenuClick('Israel');
      keepTrackApi.programs.groups.Israel = undefined;
      countries.countryMenuClick('Israel');
    };

    expect(callFunction).not.toThrow();
  });

  test('10', () => {
    let callFunction: any = () => {
      countries.countryMenuClick('Russia');
      keepTrackApi.programs.groups.Russia = undefined;
      countries.countryMenuClick('Russia');
    };

    expect(callFunction).not.toThrow();
  });

  test('11', () => {
    let callFunction: any = () => {
      countries.countryMenuClick('UnitedKingdom');
      keepTrackApi.programs.groups.UnitedKingdom = undefined;
      countries.countryMenuClick('UnitedKingdom');
    };

    expect(callFunction).not.toThrow();
  });

  test('12', () => {
    let callFunction: any = () => {
      countries.countryMenuClick('UnitedStates');
      keepTrackApi.programs.groups.UnitedStates = undefined;
      countries.countryMenuClick('UnitedStates');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe("countries.groupSelected", () => {
    test("0", () => {
        let callFunction: any = () => {
            countries.groupSelected('SpaceStations')
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction: any = () => {
            countries.groupSelected(undefined)
        }
    
        expect(callFunction).not.toThrow()
    })
})

describe('countries.bottomMenuClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      countries.bottomMenuClick('menu-countries');
      countries.bottomMenuClick('menu-countries');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      countries.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe("countries.hideSideMenus", () => {
    test("0", () => {
        let callFunction: any = () => {
            countries.hideSideMenus()
        }
    
        expect(callFunction).not.toThrow()
    })
})
