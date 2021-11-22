import * as externalApi from '@app/js/api/externalApi';
import { keepTrackApi } from '@app/js/api/externalApi';
import * as search from '@app/js/satSet/search';
import { keepTrackApiStubs } from '../api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('search.searchYear', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.searchYear(externalApi.keepTrackApi.programs.satSet.satData, 2020);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      search.searchYear(externalApi.keepTrackApi.programs.satSet.satData, 2222);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      search.searchYear('v1.2.4', 'December');
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      search.searchYear('v4.0.0-rc.4', 'June');
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      search.searchYear(externalApi.keepTrackApi.programs.satSet.satData, 15);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      search.searchYear(externalApi.keepTrackApi.programs.satSet.satData, Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('search.searchYearOrLess', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.searchYearOrLess(externalApi.keepTrackApi.programs.satSet.satData, 2021);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      search.searchYearOrLess(externalApi.keepTrackApi.programs.satSet.satData, 2223);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      search.searchYearOrLess(false, 59);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      search.searchYearOrLess(0, 79.5);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      search.searchYearOrLess('^5.0.0', 100);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      search.searchYearOrLess('v4.0.0-rc.4', 59);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      search.searchYearOrLess(100, -Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('search.searchNameRegex', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.searchNameRegex(keepTrackApi.programs.satSet.satData, /ISS/u);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('search.searchCountryRegex', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.searchCountryRegex(keepTrackApi.programs.satSet.satData, /China/u);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('search.searchNameRegex', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.searchNameRegex(false, { test: () => -100 });
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      search.searchNameRegex(true, { test: () => true });
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const param1: any = [
      { ON: '2021-07-29T20:12:53.196Z' },
      { ON: '2021-07-29T23:03:48.812Z' },
      { ON: '2021-07-29T17:54:41.653Z' },
      { ON: '2021-07-29T15:31:46.922Z' },
      { ON: '2021-07-29T20:12:53.196Z' },
      { ON: '2021-07-29T20:12:53.196Z' },
      { ON: '2021-07-29T17:54:41.653Z' },
      { ON: '2021-07-29T15:31:46.922Z' },
    ];
    const callFunction: any = () => {
      search.searchNameRegex(param1, { test: () => false });
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      search.searchNameRegex('^5.0.0', { test: () => 100 });
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      search.searchNameRegex(true, { test: () => false });
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      search.searchNameRegex([], { test: () => -Infinity });
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('search.searchCountryRegex', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.searchCountryRegex(true, { test: () => 'Anas' });
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const param1: any = [{ C: '#F00' }, { C: 'black' }, { C: 'rgb(0.1,0.2,0.3)' }, { C: 'red' }, { C: 'hsl(10%,20%,40%)' }, { C: 'red' }, { C: 'rgb(0,100,200)' }, { C: '#F00' }];
    const callFunction: any = () => {
      search.searchCountryRegex(param1, { test: () => false });
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const param1: any = [{ C: 'hsl(10%,20%,40%)' }, { C: 'rgb(0.1,0.2,0.3)' }, { C: 'hsl(10%,20%,40%)' }, { C: '#FF00FF' }, { C: 'rgb(20%,10%,30%)' }, { C: 'rgb(0,100,200)' }, { C: 'rgb(0.1,0.2,0.3)' }, { C: 'black' }];
    const callFunction: any = () => {
      search.searchCountryRegex(param1, { test: () => false });
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      search.searchCountryRegex('4.0.0-beta1\t', { test: () => 100 });
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const param1: any = [{ C: 'rgb(20%,10%,30%)' }, { C: 'rgb(20%,10%,30%)' }, { C: '#F00' }, { C: 'rgb(20%,10%,30%)' }, { C: 'red' }, { C: 'rgb(0.1,0.2,0.3)' }, { C: 'rgb(0.1,0.2,0.3)' }, { C: 'red' }];
    const callFunction: any = () => {
      search.searchCountryRegex(param1, { test: () => -100 });
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      search.searchCountryRegex(NaN, { test: () => NaN });
    };

    expect(callFunction).not.toThrow();
  });
});
