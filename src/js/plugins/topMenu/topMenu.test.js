/* globals it jest describe */

import { init } from './topMenu';
import { keepTrackApi } from '@app/js/api/externalApi';

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
