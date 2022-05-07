import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import * as scenarioCreator from './scenario-creator';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('scenarioCreator.init', () => {
  test('0', () => {
    let result: any = scenarioCreator.init();
    expect(result).toMatchSnapshot();
  });
});
