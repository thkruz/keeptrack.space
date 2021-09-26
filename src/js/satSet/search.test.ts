import * as search from '@app/js/satSet/search';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '../api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('search.searchYear', () => {
  test('0', () => {
    let callFunction: any = () => {
      search.searchYear(keepTrackApi.programs.satSet.satData, 2020);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('search.searchYearOrLess', () => {
  test('0', () => {
    let callFunction: any = () => {
      search.searchYearOrLess(keepTrackApi.programs.satSet.satData, 2021);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('search.searchNameRegex', () => {
  test('0', () => {
    let callFunction: any = () => {
      search.searchNameRegex(keepTrackApi.programs.satSet.satData, /ISS/u);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('search.searchCountryRegex', () => {
  test('0', () => {
    let callFunction: any = () => {
      search.searchCountryRegex(keepTrackApi.programs.satSet.satData, /China/u);
    };

    expect(callFunction).not.toThrow();
  });
});
