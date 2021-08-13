/* globals it describe */

import '@app/js/settingsManager/settingsManager.js';
import { init } from './topMenu';
import { keepTrackApi } from '@app/js/api/externalApi';

describe('topMenu', () => {
  it('should be initialized', () => {
    init();
  });

  it('should add the top menu', () => {
    keepTrackApi.methods.uiManagerInit();
  });
});
