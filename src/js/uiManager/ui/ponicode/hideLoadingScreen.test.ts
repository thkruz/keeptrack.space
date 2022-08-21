import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as hideLoadingScreen from '@app/js/uiManager/ui/hideLoadingScreen';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('hideLoadingScreen.hideLoadingScreen', () => {
  test('0', () => {
    keepTrackApi.programs.drawManager.sceneManager.earth.isUseHiRes = true;
    let result: any = hideLoadingScreen.hideLoadingScreen();
    expect(result).toMatchSnapshot();
  });
});
