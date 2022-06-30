import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { defaultSat, keepTrackApiStubs } from '../../api/apiMocks';
import { dateNow } from '../satMath.test';
import * as getAlt from './getAlt';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

describe('satMath.altitudeCheck', () => {
  test('0', () => {
    getAlt.getAlt(defaultSat.TLE1, defaultSat.TLE2, dateNow);
  });
});
