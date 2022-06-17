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
      exportTle.exportTle2Csv(externalApi.keepTrackApi.programs.satSet.satData);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Csv(['v1.2.4', false]);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Csv([true, '^5.0.0', 0]);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Csv([false, '^5.0.0', -100]);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Csv([true, true, false, 0]);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Csv([true, false, false, -100]);
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
      exportTle.exportTle2Txt(['v4.0.0-rc.4', true, 'v1.2.4', 100, 0]);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Txt([100, true, '1.0.0']);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Txt(['v1.2.4', false, 'v4.0.0-rc.4', -100, 100]);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Txt([true, 'v4.0.0-rc.4', '^5.0.0', false]);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    const callFunction: any = () => {
      exportTle.exportTle2Txt([-5.48, true, '^5.0.0']);
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
