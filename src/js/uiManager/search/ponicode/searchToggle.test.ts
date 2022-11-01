import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as searchToggle from '@app/js/uiManager/search/searchToggle';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('searchToggle.searchToggle', () => {
  test('0', () => {
    let result: any = searchToggle.searchToggle(true);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = searchToggle.searchToggle(false);
    expect(result).toMatchSnapshot();
  });
});
