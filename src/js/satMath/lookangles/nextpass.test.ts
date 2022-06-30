import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { defaultSat, defaultSensor, keepTrackApiStubs } from '../../api/apiMocks';
import * as nextpass from './nextpass';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('satMath.nextpassList', () => {
  test('0', () => {
    nextpass.nextpassList([defaultSat, defaultSat]);
  });
});
// @ponicode
describe('satMath.nextpass', () => {
  test('0', () => {
    nextpass.nextpass(defaultSat, [defaultSensor], 7, 5);
  });

  test('1', () => {
    nextpass.nextpass(defaultSat);
  });
});
// @ponicode
describe('satMath.nextNpasses', () => {
  test('0', () => {
    nextpass.nextNpasses(defaultSat, [defaultSensor], 7, 5, 2);
  });
});
