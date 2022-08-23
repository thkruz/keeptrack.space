import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { defaultSat, keepTrackApiStubs } from '../../api/apiMocks';
import * as map from './map';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('satMath.map', () => {
  test('0', () => {
    map.map(defaultSat, 0);
  });

  test('1', () => {
    map.map(defaultSat, 10);
  });
});
