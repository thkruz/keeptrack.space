import { defaultSensor, keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as findBestPasses from '@app/js/satMath/find/findBestPasses';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('findBestPasses.findBestPasses', () => {
  test('4', () => {
    let result: any = findBestPasses.findBestPasses('5,25544', defaultSensor);
    expect(result).toMatchSnapshot();
  });
});
