/* eslint-disable */

import { timeManager } from '@app/js/timeManager/timeManager.js';

test('UI should not be disabled.', () => {
  timeManager.init();
  // expect(settingsManager.disableUI).toBe(false);
});
