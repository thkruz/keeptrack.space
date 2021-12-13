import { keepTrackApiStubs } from './api/apiMocks';
import { keepTrackApi } from './api/keepTrackApi';
import * as main from './main';

keepTrackApi.programs = <any>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('main.importCss', () => {
  test('0', async () => {
    await main.importCss();
  });
});

// @ponicode
describe('main.redirectHttpToHttps', () => {
  test('0', () => {
    let result: any = main.redirectHttpToHttps();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('main.showErrorCode', () => {
  test('0', () => {
    let result: any = main.showErrorCode({ name: 'Jean-Philippe', message: '<br>', stack: '<br>', lineNumber: 4 });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = main.showErrorCode({ name: 'Anas', message: '<br>', stack: '<br>', lineNumber: 3 });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = main.showErrorCode({ name: 'George', message: '<br>', stack: '<br>', lineNumber: 1 });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = main.showErrorCode({ name: 'Pierre Edouard', message: '<br>', stack: '<br>', lineNumber: 2 });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = main.showErrorCode({ name: 'Michael', message: '<br>', stack: '<br>', lineNumber: 1 });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = main.showErrorCode({ name: '', message: '', stack: '', lineNumber: 0 });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('main.initalizeKeepTrack', () => {
  test('0', async () => {
    jest.setTimeout(60 * 1000);
    keepTrackApi.methods.loadCatalog = jest.fn();
    await main.initalizeKeepTrack();
  });
});
