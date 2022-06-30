import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as findReentries from '@app/js/satMath/find/findReentries';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('findReentries.findReentries', () => {
  test('0', () => {
    let result: any = findReentries.findReentries();
    expect(result).toMatchSnapshot();
  });
});
