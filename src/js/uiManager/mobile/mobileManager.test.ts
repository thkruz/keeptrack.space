import { mobileManager } from '@app/js/uiManager/mobile/mobileManager';

test(`mobileManager Unit Tests`, () => {
  mobileManager.init();
  mobileManager.fullscreenToggle();
  mobileManager.checkMobileMode();

  // Make this a iPhone
  Object.defineProperty(window.navigator, 'userAgent', {
    // get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
    get: () => 'iPhone',
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
