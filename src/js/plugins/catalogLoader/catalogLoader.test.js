/* globals it describe */

import '@app/js/settingsManager/settingsManager.js';
import { init } from './catalogLoader';

describe('catalog loader', () => {
  it('should be initialized', () => {
    init();
  });
});
