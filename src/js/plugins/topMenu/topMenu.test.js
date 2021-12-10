import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { init } from './topMenu';

describe('topMenu', () => {
  it('should be initialized', () => {
    init();
  });

  it('should add the top menu', () => {
    keepTrackApi.programs.uiManager = {
      menuController: jest.fn(),
    };
    keepTrackApi.methods.uiManagerInit();
  });
});
