/* eslint-disable */

import '@app/js/keeptrack-head.js';

test('UI should not be disabled.', () => {
  expect(settingsManager.disableUI).toBe(false);
});