import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { defaultSat, defaultSensor, keepTrackApiStubs } from '../../api/apiMocks';
import * as getSunTimes from './getSunTimes';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('satMath.getSunTimes', () => {
  test('0', () => {
    let result: any = getSunTimes.getSunTimes(defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = getSunTimes.getSunTimes(defaultSat, [defaultSensor]);
    expect(result).toMatchSnapshot();
  });
});
