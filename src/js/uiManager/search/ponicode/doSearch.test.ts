import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as doSearch from '@app/js/uiManager/search/doSearch';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('doSearch.doSearch', () => {
  test('0', () => {
    let result: any = doSearch.doSearch('Hello, world!', true);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = doSearch.doSearch('This is a Text', false);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = doSearch.doSearch('Foo bar', true);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = doSearch.doSearch('foo bar', false);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = doSearch.doSearch('Foo bar', false);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = doSearch.doSearch('', true);
    expect(result).toMatchSnapshot();
  });
});
