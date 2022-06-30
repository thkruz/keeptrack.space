import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as getSunDirection from './getSunDirection';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('satMath.getSunDirection', () => {
  test('0', () => {
    let result: any = getSunDirection.getSunDirection(12345678);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = getSunDirection.getSunDirection(1234567890);
    expect(result).toMatchSnapshot();
  });
});
