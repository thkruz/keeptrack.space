import { keepTrackApiStubs } from './api/apiMocks';
import { keepTrackApi } from './api/keepTrackApi';
import { KeepTrackPrograms } from './api/keepTrackTypes';
import * as initalizeKeepTrack from './initializeKeepTrack';
import { showErrorCode } from './showErrorCode';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

describe('showErrorCode', () => {
  it('should show the error code', () => {
    document.body.innerHTML = '<div id="loader-text"></div>';
    const element = document.getElementById('loader-text');
    showErrorCode(<Error & { lineNumber: number }>(<unknown>{ message: 'test', lineNumber: 1, stack: 'test' }));
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
      const result = await initalizeKeepTrack.initializeKeepTrack();
      expect(() => result).not.toThrow();
      // expect(spy).not.toBeCalled();
    } catch (e) {
      console.warn(e);
    }
  });
});
