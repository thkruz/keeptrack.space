/* eslint-disable */

import '@app/js/settingsManager/settingsManager.js';

test('UI should not be disabled.', () => {
  expect(settingsManager.disableUI).toBe(false);
});
