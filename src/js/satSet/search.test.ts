import { keepTrackApiStubs } from '../api/apiMocks';
import * as externalApi from '../api/keepTrackApi';
import { keepTrackApi } from '../api/keepTrackApi';
import * as search from '../satSet/search';

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
      search.searchNameRegex(keepTrackApi.programs.satSet.satData, { test: (text) => typeof text === 'string' });
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
  // @ponicode
  describe('search.searchCountryRegex', () => {
    test('0', () => {
      const callFunction: any = () => {
        search.searchCountryRegex(keepTrackApi.programs.satSet.satData, { test: (text) => typeof text === 'string' });
      };

      expect(callFunction).not.toThrow();
    });
  });
});
