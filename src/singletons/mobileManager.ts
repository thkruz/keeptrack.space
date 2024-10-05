import { hideEl } from '@app/lib/get-el';
import { Kilometers } from 'ootk';
import { keepTrackApi } from '../keepTrackApi';
import { errorManagerInstance } from './errorManager';

export class MobileManager {
  // eslint-disable-next-line require-await
  public static async checkMobileMode() {
    try {
      // Don't become mobile after initialization
      if (!keepTrackApi.isInitialized) {
        if (MobileManager.checkIfMobileDevice()) {
          if (!settingsManager.isMobileModeEnabled) {
            /* SATELIOT */
            // keepTrackApi.getUiManager().toast('Full Version of KeepTrack is not available on mobile devices. Please use a desktop browser to access the full version.', ToastMsgType.normal);
            console.log('Full Version of KeepTrack is not available on mobile devices. Please use a desktop browser to access the full version.');
          }
          settingsManager.isMobileModeEnabled = true;

          settingsManager.maxOribtsDisplayed = settingsManager.maxOrbitsDisplayedMobile;
          settingsManager.enableHoverOverlay = false;
          settingsManager.cameraMovementSpeed = 0.0025;
          settingsManager.cameraMovementSpeedMin = 0.0025;
          settingsManager.zoomSpeed = 0.025;

          // if (settingsManager.isUseHigherFOVonMobile) {
          //   settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
          // } else {
          //   settingsManager.fieldOfView = 0.6;
          // }
          // settingsManager.maxLabels = settingsManager.mobileMaxLabels;

          // Disable desktop only plugins
          // Object.keys(settingsManager.plugins).forEach((key) => {
          //   settingsManager.plugins[key] = false;
          // });

          console.log("Disable Info Box in Mobile");
          settingsManager.plugins.satInfoboxCore = false;
          settingsManager.plugins.topMenu = true;
          settingsManager.plugins.datetime = true;
          settingsManager.plugins.soundManager = false;

          // hide datetime
          hideEl('datetime');

          settingsManager.isDisableGodrays = true;
          settingsManager.isDisableSkybox = true;
          settingsManager.isDisableMoon = true;
          settingsManager.isDisableSearchBox = true;

          settingsManager.isDisableAsyncReadPixels = true;

          // settingsManager.satShader.minSize = 8;
          // settingsManager.satShader.maxAllowedSize = 45;
          // settingsManager.pickingDotSize = '32.0';
          // settingsManager.satShader.maxSize = 70;

          settingsManager.isDisableStars = true;
          settingsManager.isDisableLaunchSites = true;
          settingsManager.isDisableControlSites = true;

          settingsManager.maxAnalystSats = 1;
          settingsManager.maxFieldOfViewMarkers = 1;
          settingsManager.maxMissiles = 1;
          settingsManager.minDistanceFromSatellite = <Kilometers>4;
          settingsManager.isLoadLastSensor = false;
        } else {
          settingsManager.maxOribtsDisplayed = settingsManager.maxOribtsDisplayedDesktop;
          if (typeof settingsManager.enableHoverOverlay === 'undefined') {
            settingsManager.enableHoverOverlay = true;
          }

          settingsManager.isDisableGodrays = false;
          settingsManager.isDisableSkybox = false;
          settingsManager.isDisableMoon = false;

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
      } else {
        errorManagerInstance.debug('MobileManager.checkMobileMode() called after initialization!');
      }
    } catch (e) {
      console.debug(e);
    }
  }

  public static checkIfMobileDevice() {
    return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/iu).test(navigator.userAgent);
  }

  // eslint-disable-next-line class-methods-use-this
  init() {
    MobileManager.checkMobileMode();
  }
}

export const mobileManager = new MobileManager();
