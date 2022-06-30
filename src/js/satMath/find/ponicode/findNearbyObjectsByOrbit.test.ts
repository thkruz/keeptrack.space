import { defaultSat, keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as findNearbyObjectsByOrbit from '@app/js/satMath/find/findNearbyObjectsByOrbit';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('findNearbyObjectsByOrbit.findNearbyObjectsByOrbit', () => {
  test('0', () => {
    let result: any = findNearbyObjectsByOrbit.findNearbyObjectsByOrbit(defaultSat);
    expect(result).toMatchSnapshot();
  });
});
