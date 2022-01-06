import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import { demoMode } from './demoMode';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

declare const settingsManager;

// @ponicode
describe('drawManager.demoMode', () => {
  test('0', () => {
    let result: any = demoMode();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    settingsManager.demoModeInterval = -1;
    let result: any = demoMode();
    expect(result).toMatchSnapshot();
    settingsManager.demoModeInterval = 1000;
  });
});
