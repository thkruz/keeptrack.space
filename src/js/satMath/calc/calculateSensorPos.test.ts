import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { defaultSensor, keepTrackApiStubs } from '../../api/apiMocks';
import * as calculateSensorPos from './calculateSensorPos';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('satMath.calculateSensorPos', () => {
  test('0', () => {
    calculateSensorPos.calculateSensorPos([defaultSensor]);
  });

  test('1', () => {
    calculateSensorPos.calculateSensorPos();
  });
});
