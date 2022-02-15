import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as externalSources from './externalSources';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
settingsManager = window.settingsManager;

// @ponicode
describe('externalSources.init', () => {
  test('0', () => {
    let callFunction: any = () => {
      externalSources.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('externalSources.hideSideMenus', () => {
  test('0', () => {
    let callFunction: any = () => {
      externalSources.hideSideMenus();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('externalSources.n2yoFormSubmit', () => {
  test('0', () => {
    let callFunction: any = () => {
      externalSources.n2yoFormSubmit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('externalSources.searchN2yo', () => {
  test('0', () => {
    let callFunction: any = () => {
      externalSources.searchN2yo(69660, 56784);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      externalSources.searchN2yo(-5.48, 34864);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      externalSources.searchN2yo(true, 12345);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      externalSources.searchN2yo(Infinity, Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('externalSources.searchN2yoOnLoad', () => {
  test.skip('0', () => {
    let callFunction: any = () => {
      externalSources.searchN2yoOnLoad({ status: 200, response: '<div id="tle"><pre>\n1  25544\n2  25544' }, 12345);
    };

    expect(callFunction).not.toThrow();
  });

  test('0', () => {
    let callFunction: any = () => {
      externalSources.searchN2yoOnLoad({ status: 200, response: '<div id="tle"><pre>\n3  25544\n2  25544' }, 12345);
    };

    expect(callFunction).toThrow();
  });

  test('0', () => {
    let callFunction: any = () => {
      externalSources.searchN2yoOnLoad({ status: 200, response: '<div id="tle"><pre>\n1  25544\n3  25544' }, 12345);
    };

    expect(callFunction).toThrow();
  });
});

describe('externalSources.bottomMenuClick', () => {
  test('0', () => {
    const callFunction: any = () => {
      externalSources.bottomMenuClick('menu-external');
      externalSources.bottomMenuClick('menu-external');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      externalSources.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('externalSources.celestrakFormSubmit', () => {
  test('0', () => {
    let callFunction: any = () => {
      externalSources.celestrakFormSubmit();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('externalSources.searchCelestrak', () => {
  test('0', () => {
    let callFunction: any = () => {
      externalSources.searchCelestrak(-100, 987650);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction: any = () => {
      externalSources.searchCelestrak(Infinity, Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('externalSources.bottomMenuClick', () => {
  test('0', () => {
    let callFunction: any = () => {
      externalSources.bottomMenuClick('menu-external');
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      externalSources.bottomMenuClick('Home Loan Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction: any = () => {
      externalSources.bottomMenuClick('Credit Card Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction: any = () => {
      externalSources.bottomMenuClick('Checking Account');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction: any = () => {
      externalSources.bottomMenuClick('');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('externalSources.searchCelestrackOnLoad', () => {
  test('0', () => {
    let callFunction: any = () => {
      externalSources.searchCelestrackOnLoad('POST', 987650);
    };

    expect(callFunction).not.toThrow();
  });

  test.skip('1', () => {
    let callFunction: any = () => {
      externalSources.searchCelestrackOnLoad({ status: 200, response: JSON.stringify('\n1  25544\n2  25544') }, 12345);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      externalSources.searchCelestrackOnLoad({ status: 200, response: JSON.stringify('\n3  25544\n2  25544') }, 12345);
    };

    expect(callFunction).toThrow();
  });

  test('1', () => {
    let callFunction: any = () => {
      externalSources.searchCelestrackOnLoad({ status: 200, response: JSON.stringify('\n1  25544\n3  25544') }, 12345);
    };

    expect(callFunction).toThrow();
  });

  test('11', () => {
    let result: any = externalSources.searchCelestrackOnLoad(NaN, NaN);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('externalSources.uiManagerInit', () => {
  test('0', () => {
    let result: any = externalSources.uiManagerInit();
    expect(result).toMatchSnapshot();
  });
});
