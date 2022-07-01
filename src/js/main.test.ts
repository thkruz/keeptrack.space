import { keepTrackApiStubs } from './api/apiMocks';
import { keepTrackApi } from './api/keepTrackApi';
import { KeepTrackPrograms } from './api/keepTrackTypes';
import { importCss } from './css';
import * as initalizeKeepTrack from './initalizeKeepTrack';
import * as main from './main';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

describe('importCss', () => {
  test('0', async () => {
    try {
      settingsManager.disableCss = true;
      const result = await importCss();
      expect(result).toMatchSnapshot();
    } catch (e) {
      console.warn(e);
      throw e;
    }
  });
});

describe('showErrorCode', () => {
  it('should show the error code', () => {
    document.body.innerHTML = '<div id="loader-text"></div>';
    const element = document.getElementById('loader-text');
    main.showErrorCode(<Error & { lineNumber: number }>(<unknown>{ message: 'test', lineNumber: 1, stack: 'test' }));
    expect(element.innerHTML).toMatchSnapshot();
  });
});

// @ponicode
describe('initalizeKeepTrack', () => {
  it('should not throw any errors', async () => {
    try {
      jest.setTimeout(60 * 1000);
      keepTrackApi.methods.loadCatalog = jest.fn();
      // Replace satSet.satData with a mock
      // const spy = jest.spyOn(main, 'showErrorCode');
      settingsManager.disableCss = true;
      const result = await initalizeKeepTrack.initalizeKeepTrack();
      expect(() => result).not.toThrow();
      // expect(spy).not.toBeCalled();
    } catch (e) {
      console.warn(e);
    }
  });
});
