import { settingsManager } from '@app/js/settingsManager/settingsManager.ts';

var mobileManager = {};
// Wrap everything in an init to make sure the loading order is respected
mobileManager.init = async () => {
  mobileManager.fullscreenToggle = function () {
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

  mobileManager.checkMobileMode = async () => {
    if (mobileManager.checkIfMobileDevice()) {
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

  mobileManager.checkIfMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/iu.test(navigator.userAgent);

  // //////////////////////////////////////////////////////////////
  // This is run at the end of init
  // The assignments have to happen first
  // //////////////////////////////////////////////////////////////
  mobileManager.checkMobileMode();
};

export { mobileManager };
