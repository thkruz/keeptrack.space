import { keepTrackApiStubs } from './api/apiMocks';
import { keepTrackApi } from './api/keepTrackApi';
import { KeepTrackPrograms } from './api/keepTrackTypes';
import { importCss } from './css';
import * as main from './main';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

describe('main.importCss', () => {
  test('0', async () => {
    const result = await importCss();
    expect(result).toMatchSnapshot();
  });
});

describe('main.showErrorCode', () => {
  it('should show the error code', () => {
    document.body.innerHTML = '<div id="loader-text"></div>';
    const element = document.getElementById('loader-text');
    main.showErrorCode(<Error & { lineNumber: number }>(<unknown>{ message: 'test', lineNumber: 1, stack: 'test' }));
    expect(element.innerHTML).toMatchSnapshot();
  });
});

// @ponicode
describe('main.initalizeKeepTrack', () => {
  it('should be a function', () => {
    expect(main.initalizeKeepTrack).toBeInstanceOf(Function);
  });

  it('should return a promise', () => {
    expect(main.initalizeKeepTrack()).toBeInstanceOf(Promise);
  });

  it('should not throw any errors', async () => {
    jest.setTimeout(60 * 1000);
    keepTrackApi.methods.loadCatalog = jest.fn();
    // Replace satSet.satData with a mock
    const spy = jest.spyOn(main, 'showErrorCode');
    const result = await main.initalizeKeepTrack();
    expect(() => result).not.toThrow();
    expect(spy).not.toBeCalled();
  });
});
