import { defaultSat, keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as findClosestApproachTime from '@app/js/satMath/find/findClosestApproachTime';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

const defaultSat2 = {
  ...defaultSat,
  ...{
    TLE1: '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-3 0  9997',
    TLE2: '2 25544  51.6416 247.4627 0006703 130.7982 348.5836 15.54278391563537',
  },
};

// @ponicode
describe('findClosestApproachTime.findClosestApproachTime', () => {
  test('0', () => {
    let result: any = findClosestApproachTime.findClosestApproachTime(defaultSat, defaultSat2, 0);
    expect(result).toMatchSnapshot();
  });
});
