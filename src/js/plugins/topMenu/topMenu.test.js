import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { init } from './topMenu';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

describe('topMenu', () => {
  it('should be initialized', () => {
    init();
  });

  it('should add the top menu', () => {
    keepTrackApi.methods.uiManagerInit();
  });
});
