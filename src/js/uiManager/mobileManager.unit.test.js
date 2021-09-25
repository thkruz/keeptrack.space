/* eslint-disable no-undefined */
/*globals
  global
  test
*/

import { mobileManager } from '@app/js/uiManager/mobileManager.js';

test(`mobileManager Unit Tests`, () => {
  mobileManager.init();
  mobileManager.fullscreenToggle();
  mobileManager.checkMobileMode();

  // Make this a iPhone
  navigator.__defineGetter__('userAgent', function () {
    return 'iPhone'; // customized user agent
  });

  mobileManager.fullscreenToggle();
  mobileManager.checkMobileMode();

  global.document = Object.create(document);
  Object.defineProperty(document, 'fullScreenElement', {
    value: 'fake',
    writable: true,
  });

  mobileManager.fullscreenToggle();
});
