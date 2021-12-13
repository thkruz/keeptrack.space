// Wrap everything in an init to make sure the loading order is respected
export const fullscreenToggle = function () {
  const doc = <any>document;

  if ((doc.fullScreenElement && doc.fullScreenElement !== null) || (!doc.mozFullScreen && !doc.webkitIsFullScreen)) {
    if (doc.docElement?.requestFullScreen) {
      doc.docElement.requestFullScreen();
    } else if (doc.docElement?.mozRequestFullScreen) {
      doc.docElement.mozRequestFullScreen();
    } else if (doc.docElement?.webkitRequestFullScreen) {
      doc.docElement.webkitRequestFullScreen((<any>Element).ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (doc.cancelFullScreen) {
      doc.cancelFullScreen();
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
    } else if (doc.webkitCancelFullScreen) {
      doc.webkitCancelFullScreen();
    }
  }
};

export const checkMobileMode = async () => {
  try {
    if (checkIfMobileDevice()) {
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
  } catch (e) {
    console.debug(e);
  }
};

export const checkIfMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/iu.test(navigator.userAgent);

export const init = async () => {
  checkMobileMode();
};

export const mobileManager = {
  init,
  checkIfMobileDevice,
  checkMobileMode,
  fullscreenToggle,
};
