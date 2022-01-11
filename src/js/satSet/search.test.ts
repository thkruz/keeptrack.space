import { keepTrackApiStubs } from '../api/apiMocks';
import * as externalApi from '../api/keepTrackApi';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import * as search from '../satSet/search';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
// @ponicode
describe('search.year', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.year(externalApi.keepTrackApi.programs.satSet.satData, 2020);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      search.year(externalApi.keepTrackApi.programs.satSet.satData, 2222);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      search.year(externalApi.keepTrackApi.programs.satSet.satData, 15);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      search.year(externalApi.keepTrackApi.programs.satSet.satData, Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('search.yearOrLess', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.yearOrLess(externalApi.keepTrackApi.programs.satSet.satData, 2021);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      search.yearOrLess(externalApi.keepTrackApi.programs.satSet.satData, 2223);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('search.name', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.name(keepTrackApi.programs.satSet.satData, /ISS/u);
    };

    expect(callFunction).not.toThrow();
  });
});

describe('search.country', () => {
  test('0', () => {
    const callFunction: any = () => {
      search.country(keepTrackApi.programs.satSet.satData, /China/u);
    };

    expect(callFunction).not.toThrow();
  });
});
