/* globals test jest */

import 'jsdom-worker';
import '@app/js/settingsManager/settingsManager.js';
import { initalizeKeepTrack } from '@app/js/main.js';

test(`main`, async () => {
  await initalizeKeepTrack();
});
