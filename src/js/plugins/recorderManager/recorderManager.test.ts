import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as recorderManager from './recorderManager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

window.settingsManager.offline = true;
Object.defineProperty(global.navigator, 'getDisplayMedia', {
  value: {},
});
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getDisplayMedia: () => {},
  },
});

// @ponicode
describe('recorderManager.init', () => {
  test('0', () => {
    let result: any = recorderManager.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('recorderManager.uiManagerOnReady', () => {
  test('0', () => {
    let result: any = recorderManager.uiManagerOnReady();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('recorderManager.uiManagerInit', () => {
  test('0', () => {
    let result: any = recorderManager.uiManagerInit();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('recorderManager.bottomMenuClick', () => {
  beforeAll(() => {
    window.M = {
      toast: jest.fn(),
    };
  });

  test('0', () => {
    let result: any = recorderManager.bottomMenuClick('menu-record');
    expect(result).toMatchSnapshot();
  });
  test('1', () => {
    let result: any = () => {
      recorderManager.uiManagerOnReady();
      recorderManager.getRecorderObject().setIsRecording(true);
      recorderManager.bottomMenuClick('menu-record');
      recorderManager.bottomMenuClick('menu-record');
    };
    expect(result).toThrow();
  });

  test('2', () => {
    let result: any = () => {
      recorderManager.uiManagerOnReady();
      recorderManager.getRecorderObject().setIsRecording(false);
      recorderManager.bottomMenuClick('menu-record');
      recorderManager.bottomMenuClick('menu-record');
    };
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = () => {
      recorderManager.bottomMenuClick('menu-record');
      recorderManager.bottomMenuClick('menu-record');
    };
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = recorderManager.bottomMenuClick('');
    expect(result).toMatchSnapshot();
  });
});
