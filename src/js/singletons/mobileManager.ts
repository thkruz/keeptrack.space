import { Kilometers } from 'ootk';
import { keepTrackApi } from '../keepTrackApi';

export class MobileManager {
  public static async checkMobileMode() {
    try {
      // Don't become mobile after initialization
      if (!keepTrackApi.isInitialized && MobileManager.checkIfMobileDevice()) {
        if (!settingsManager.isMobileModeEnabled) {
          keepTrackApi.getUiManager().toast('Full Version of KeepTrack is not available on mobile devices. Please use a desktop browser to access the full version.', 'normal');
        }
        settingsManager.isMobileModeEnabled = true;

        settingsManager.maxOribtsDisplayed = settingsManager.maxOrbitsDisplayedMobile;
        settingsManager.enableHoverOverlay = false;
        settingsManager.cameraMovementSpeed = 0.0001;
        settingsManager.cameraMovementSpeedMin = 0.0001;
        if (settingsManager.isUseHigherFOVonMobile) {
          settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
        } else {
          settingsManager.fieldOfView = 0.6;
        }
        settingsManager.maxLabels = settingsManager.mobileMaxLabels;

        // Disable desktop only plugins
        Object.keys(settingsManager.plugins).forEach((key) => {
          settingsManager.plugins[key] = false;
        });
        settingsManager.plugins.satInfoboxCore = true;
        settingsManager.plugins.updateSelectBoxCore = true;
        settingsManager.plugins.topMenu = true;
        settingsManager.plugins.datetime = true;

        settingsManager.maxAnalystSats = 1;
        settingsManager.maxFieldOfViewMarkers = 1;
        settingsManager.maxMissiles = 1;
        settingsManager.minDistanceFromSatellite = <Kilometers>50;
        settingsManager.isLoadLastSensor = false;
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
  }

  public static checkIfMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/iu.test(navigator.userAgent);
  }
}

export const mobileManager = new MobileManager();
