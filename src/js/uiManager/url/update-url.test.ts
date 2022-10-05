import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import '@app/js/settingsManager/settings';
import { searchBox } from '@app/js/uiManager/search/searchBox';
import { updateURL } from './update-url';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

describe('updateUrl', () => {
  it('should update url', () => {
    updateURL();
    expect(window.location.href).toMatchSnapshot();
  });

  it('should handle trusatMode', () => {
    settingsManager.trusatMode = true;
    updateURL();
    expect(window.location.href).toMatchSnapshot();
    settingsManager.trusatMode = false;
  });

  it('should handle selectedSat', () => {
    keepTrackApi.programs.objectManager.selectedSat = 0;
    updateURL();
    expect(window.location.href).toMatchSnapshot();
    keepTrackApi.programs.objectManager.selectedSat = -1;
  });

  it('should handle a search query', () => {
    jest.spyOn(searchBox, 'getCurrentSearch').mockImplementation(() => 'query');
    updateURL();
    expect(window.location.href).toMatchSnapshot();
  });

  it('should handle a time offset', () => {
    keepTrackApi.programs.timeManager.staticOffset = 1500;
    keepTrackApi.programs.timeManager.dynamicOffsetEpoch = 1500;
    updateURL();
    expect(window.location.href).toMatchSnapshot();
  });
});
