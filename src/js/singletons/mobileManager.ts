import { Kilometers } from 'ootk';
import { KeepTrackApiEvents, keepTrackApi } from '../keepTrackApi';
import { getEl } from '../lib/get-el';
import { errorManagerInstance } from './errorManager';

export class MobileManager {
  public static async checkMobileMode() {
    try {
      // Don't become mobile after initialization
      if (!keepTrackApi.isInitialized) {
        if (MobileManager.checkIfMobileDevice()) {
          if (!settingsManager.isMobileModeEnabled) {
            keepTrackApi.getUiManager().toast('Full Version of KeepTrack is not available on mobile devices. Please use a desktop browser to access the full version.', 'normal');
          }
          settingsManager.isMobileModeEnabled = true;

          settingsManager.maxOribtsDisplayed = settingsManager.maxOrbitsDisplayedMobile;
          settingsManager.enableHoverOverlay = false;
          settingsManager.cameraMovementSpeed = 0.0025;
          settingsManager.cameraMovementSpeedMin = 0.0025;
          settingsManager.zoomSpeed = 0.025;

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
          settingsManager.plugins.soundManager = true;

          settingsManager.isDisableGodrays = true;
          settingsManager.isDisableSkybox = true;
          settingsManager.isDisableMoon = true;

          settingsManager.isDisableAsyncReadPixels = true;

          settingsManager.satShader.minSize = 8;
          settingsManager.satShader.maxAllowedSize = 45;
          settingsManager.pickingDotSize = '32.0';
          settingsManager.satShader.maxSize = 70;

          settingsManager.isDisableStars = true;
          settingsManager.isDisableLaunchSites = true;
          settingsManager.isDisableControlSites = true;

          keepTrackApi.register({
            event: KeepTrackApiEvents.selectSatData,
            cbName: 'MobileManager.selectSatData',
            cb: () => {
              const searchManager = keepTrackApi.getUiManager().searchManager;

              if (searchManager.isResultsOpen) {
                searchManager.searchToggle(false);
              }
            },
          });

          keepTrackApi.register({
            event: KeepTrackApiEvents.uiManagerFinal,
            cbName: 'MobileManager.uiManagerFinal',
            cb: () => {
              getEl('tutorial-btn').style.display = 'none';
            },
          });

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
      } else {
        errorManagerInstance.debug('MobileManager.checkMobileMode() called after initialization!');
      }
    } catch (e) {
      console.debug(e);
    }
  }

  public static checkIfMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/iu.test(navigator.userAgent);
  }

  // eslint-disable-next-line class-methods-use-this
  init() {
    MobileManager.checkMobileMode();
  }
}

export const mobileManager = new MobileManager();
