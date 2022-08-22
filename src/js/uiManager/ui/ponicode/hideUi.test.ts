import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as hideUi from '@app/js/uiManager/ui/hideUi';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('hideUi.hideUi', () => {
  test('0', () => {
    let result: any = hideUi.hideUi();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = () => {
      hideUi.hideUi();
      hideUi.hideUi();
      hideUi.hideUi();
    };
    expect(result()).toMatchSnapshot();
  });
});
