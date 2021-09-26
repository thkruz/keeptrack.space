import * as exportTle from '@app/js/satSet/exportTle';

import { expect } from '@jest/globals';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '../api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };
// @ponicode
describe('exportTle.exportTle2Csv', () => {
  test('0', () => {
    let callFunction: any = () => {
      exportTle.exportTle2Csv(keepTrackApi.programs.satSet.satData);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('exportTle.exportTle2Txt', () => {
  test('0', () => {
    let callFunction: any = () => {
      exportTle.exportTle2Txt(keepTrackApi.programs.satSet.satData);
    };

    expect(callFunction).not.toThrow();
  });
});
