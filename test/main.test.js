/* globals test jest */

import 'jsdom-worker';
import { initalizeKeepTrack } from '@app/js/main.js';

test(`main`, async () => {
  await initalizeKeepTrack();
});
