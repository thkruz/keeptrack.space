import * as externalApi from '@app/js/api/keepTrackApi';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import * as exportTle from '@app/js/satSet/exportTle';
import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../api/apiMocks';
import { KeepTrackPrograms } from '../api/keepTrackTypes';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
// @ponicode
describe('exportTle.exportTle2Csv', () => {
  test('0', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Csv(keepTrackApi.programs.satSet.satData);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Csv(keepTrackApi.programs.satSet.satData, false);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Csv([]);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('exportTle.exportTle2Txt', () => {
  test('0', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Txt(externalApi.keepTrackApi.programs.satSet.satData);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Txt(keepTrackApi.programs.satSet.satData);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Txt(keepTrackApi.programs.satSet.satData, 3);
    };

    expect(callFunction).not.toThrow();
  });

  test('6', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Txt([]);
    };

    expect(callFunction).not.toThrow();
  });
});
