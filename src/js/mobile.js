/**
 * @format
 */

import { db, settingsManager } from '@app/js/keeptrack-head.js';

var mobile = {};

mobile.fullscreenToggle = function () {
  db.log('mobile.fullscreenToggle');
  if ((document.fullScreenElement && document.fullScreenElement !== null) || (!document.mozFullScreen && !document.webkitIsFullScreen)) {
    if (document.documentElement.requestFullScreen) {
      document.documentElement.requestFullScreen();
    } else if (document.documentElement.mozRequestFullScreen) {
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullScreen) {
      document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
  }
};

mobile.checkMobileMode = function () {
  db.log('mobile.checkMobileMode');
  if (mobile.checkIfMobileDevice()) {
    mobile.forceResize = true;
    settingsManager.maxOribtsDisplayed = settingsManager.maxOrbitsDisplayedMobile;
    settingsManager.enableHoverOverlay = false;
    settingsManager.isMobileModeEnabled = true;
    settingsManager.cameraMovementSpeed = 0.0001;
    settingsManager.cameraMovementSpeedMin = 0.0001;
    if (settingsManager.isUseHigherFOVonMobile) {
      settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
    } else {
      settingsManager.fieldOfView = 0.6;
    }
    settingsManager.maxLabels = settingsManager.mobileMaxLabels;
  } else {
    settingsManager.maxOribtsDisplayed = settingsManager.maxOribtsDisplayedDesktop;
    if (typeof settingsManager.enableHoverOverlay == 'undefined') {
      settingsManager.enableHoverOverlay = true;
    }
    settingsManager.isMobileModeEnabled = false;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    if (settingsManager.isUseHigherFOVonMobile) {
      settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
    } else {
      settingsManager.fieldOfView = 0.6;
    }
    settingsManager.maxLabels = settingsManager.desktopMaxLabels;
  }
};

mobile.checkIfMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/iu.test(navigator.userAgent);

// mobile.start = function () {
//   db.log('mobile.checkMobileMode');
//   mobile.checkMobileMode();
//   mobile.fullscreenToggle();
//   $('#loading-screen').removeClass('full-loader');
//   $('#loading-screen').addClass('mini-loader-container');
//   $('#logo-inner-container').addClass('mini-loader');
//   $('#logo-text').html('');
//   $('#loading-screen').hide();
//   settingsManager.loadStr('math');
//   $('#spinner').show();
//   $('#mobile-start-button').hide();
//   settingsManager.enableHoverOverlay = false;
// };

export { mobile };
