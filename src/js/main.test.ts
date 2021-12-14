import { keepTrackApiStubs } from './api/apiMocks';
import { keepTrackApi } from './api/keepTrackApi';
import * as main from './main';

keepTrackApi.programs = <any>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

const setUrl = (url) => {
  const host = url.split('/')[2] || '';
  let search = url.split('?')[1] || '';
  search = search !== '' ? `?${search}` : '';

  global.window = Object.create(window);
  Object.defineProperty(window, 'location', {
    value: {
      href: url,
      host: host,
      search: search,
    },
    writable: true,
  });
};

// @ponicode
describe('main.importCss', () => {
  test('0', async () => {
    const result = await main.importCss();
    expect(result).toMatchSnapshot();
  });
});

describe('main.forceHttps', () => {
  it('should change an http to https', () => {
    setUrl('http://dummy.com');
    main.forceHttps();
    expect(window.location.href).toBe('https://dummy.com');
  });
  it('should not break an https request', () => {
    setUrl('https://dummy.com');
    main.forceHttps();
    expect(window.location.href).toBe('https://dummy.com');
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
  test('0', async () => {
    jest.setTimeout(60 * 1000);
    keepTrackApi.methods.loadCatalog = jest.fn();
    await main.initalizeKeepTrack();
  });

  it('should be a function', () => {
    expect(main.initalizeKeepTrack).toBeInstanceOf(Function);
  });

  it('should return a promise', () => {
    expect(main.initalizeKeepTrack()).toBeInstanceOf(Promise);
  });

  it('should not throw any errors', async () => {
    const spy = jest.spyOn(main, 'showErrorCode');
    const result = await main.initalizeKeepTrack();
    expect(() => result).not.toThrow();
    expect(spy).not.toBeCalled();
  });
});
