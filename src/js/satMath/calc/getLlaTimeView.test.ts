import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { defaultSat, keepTrackApiStubs } from '../../api/apiMocks';
import * as getLlaTimeView from './getLlaTimeView';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

const dateNow = new Date(2022, 0, 1);
dateNow.setUTCHours(0, 0, 0, 0);

// @ponicode
describe('satMath.getLlaTimeView', () => {
  test('0', () => {
    getLlaTimeView.getLlaTimeView(dateNow, defaultSat);
  });

  test('1', () => {
    getLlaTimeView.getLlaTimeView(new Date(2022, 0, 2), defaultSat);
  });
});
