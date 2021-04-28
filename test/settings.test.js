/* eslint-disable */

import '@app/js/settingsManager/settingsManager.js';

test('UI should not be disabled.', () => {
  expect(settingsManager.disableUI).toBe(false);
});

test('gremlins needs to work.', () => {
  db.gremlins();
  // expect(settingsManager.isOfficialWebsite).toBe(true);
});
