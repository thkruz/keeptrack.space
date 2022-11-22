import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as updateSelectBox from '@app/js/uiManager/updateSelectBox';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('updateSelectBox.updateSelectBox', () => {
  test('0', () => {
    const result: any = () => {
      keepTrackApi.isInitialized = true;
      updateSelectBox.updateSelectBox();
    };
    expect(result()).toMatchSnapshot();
  });

  test('1', () => {
    const result: any = () => {
      keepTrackApi.isInitialized = true;
      updateSelectBox.updateSelectBox();
    };
    expect(result()).toMatchSnapshot();
  });
});
