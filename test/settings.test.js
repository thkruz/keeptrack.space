/* eslint-disable */

import '../src/js/keeptrack-head.js';

test('UI should not be disabled.', () => {
  expect(settingsManager.disableUI).toBe(false);
});