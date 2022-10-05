import { defaultSat, keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import { demoMode } from './demoMode';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('drawManager.demoMode', () => {
  test('0', () => {
    let result: any = demoMode();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    settingsManager.demoModeInterval = -1;
    keepTrackApi.programs.drawManager.demoModeSatellite = 0;
    keepTrackApi.programs.satSet.getScreenCoords = () => ({ x: 0, y: 0, z: 0, error: false });
    keepTrackApi.programs.drawManager.hoverBoxOnSat = () => {};
    keepTrackApi.programs.satSet.satData = [defaultSat];
    let result: any = demoMode();
    expect(result).toMatchSnapshot();
    settingsManager.demoModeInterval = 1000;
  });
});
