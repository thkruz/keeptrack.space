/* eslint-disable */

import '@app/js/settings.js';

test('UI should not be disabled.', () => {
  expect(settingsManager.disableUI).toBe(false);
});
