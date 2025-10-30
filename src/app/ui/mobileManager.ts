import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { EarthTextureStyle } from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { KeepTrack } from '@app/keeptrack';
import { Kilometers, Radians } from '@ootk/src/main';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { getEl, hideEl } from '../../engine/utils/get-el';

export class MobileManager {
  // eslint-disable-next-line require-await
  static async checkMobileMode() {
    try {
      // Don't become mobile after initialization
      if (!KeepTrack.getInstance().isInitialized) {
        if (MobileManager.checkIfMobileDevice()) {
          settingsManager.isMobileModeEnabled = true;
          settingsManager.disableWindowTouchMove = false;
          settingsManager.isShowLoadingHints = false;
          settingsManager.isDisableBottomMenu = true;
          settingsManager.maxOribtsDisplayed = settingsManager.maxOrbitsDisplayedMobile;
          settingsManager.enableHoverOverlay = false;
          settingsManager.cameraMovementSpeed = 0.0025;
          settingsManager.cameraMovementSpeedMin = 0.0025;
          settingsManager.zoomSpeed = 0.025;

          if (settingsManager.isUseHigherFOVonMobile) {
            settingsManager.fieldOfView = settingsManager.fieldOfViewMax as Radians;
          } else {
            settingsManager.fieldOfView = 0.6 as Radians;
          }
          settingsManager.maxLabels = settingsManager.mobileMaxLabels;

          // Disable desktop only plugins
          const cachePlugins = { ...settingsManager.plugins };

          Object.keys(settingsManager.plugins).forEach((key) => {
            settingsManager.plugins[key] = false;
          });
          settingsManager.plugins.SoundManager = cachePlugins.SoundManager;
          settingsManager.plugins.SatInfoBoxCore = cachePlugins.SatInfoBoxCore;
          settingsManager.plugins.SatInfoBoxObject = cachePlugins.SatInfoBoxObject;
          settingsManager.plugins.TopMenu = cachePlugins.TopMenu;
          settingsManager.plugins.DateTimeManager = cachePlugins.DateTimeManager;
          settingsManager.plugins.SatInfoBoxOrbital = cachePlugins.SatInfoBoxOrbital;
          settingsManager.plugins.SatInfoBoxMission = cachePlugins.SatInfoBoxMission;
          settingsManager.defaultColorScheme = 'CelestrakColorScheme';

          // Get the size of keeptrack-root
          const keeptrackRoot = getEl('keeptrack-root');

          if (keeptrackRoot?.clientWidth ?? 601 < 600) {
            settingsManager.isShowPrimaryLogo = false;
            settingsManager.isShowSecondaryLogo = false;
          } else if (!settingsManager.isMobileModeEnabled) {
            ServiceLocator.getUiManager().toast('Full Version of KeepTrack is not available on mobile devices. Please use a desktop browser to access the full version.',
              ToastMsgType.normal);
          }

          Object.assign(settingsManager, {
            isEnableJscCatalog: true,
            noMeshManager: false,
            isShowSplashScreen: true,
            // isDisableSelectSat: true,
            isDisableKeyboard: true,
            isAllowRightClick: false,
            isShowLoadingHints: false,
            isBlockPersistence: true,
            isDisableBottomMenu: true,
            isDrawSun: false,
            isDrawMilkyWay: false,
            isDisableGodrays: true,
            godraysSamples: -1,
            isDisableMoon: true,
            earthDayTextureQuality: '2k',
            earthNightTextureQuality: '2k',
            isDrawNightAsDay: false,
            // earthSpecTextureQuality: '1k',
            isDrawSpecMap: false,
            // earthBumpTextureQuality: '1k',
            isDrawBumpMap: false,
            // earthCloudTextureQuality: '1k',
            isDrawCloudsMap: false,
            // earthPoliticalTextureQuality: '1k',
            isDrawPoliticalMap: false,
            earthTextureStyle: EarthTextureStyle.BLUE_MARBLE,
            isDisableSkybox: true,
            isDisableSearchBox: true,
            isDrawCovarianceEllipsoid: false,
            isDisableAsyncReadPixels: true,
            pickingDotSize: '32.0',
            isDisableStars: true,
            isDisableControlSites: true,
            isDisableSensors: true,
            isDisableLaunchSites: true,
          });

          Object.assign(settingsManager.satShader, {
            minSize: 8,
            maxAllowedSize: 45,
            maxSize: 70,
          });

          EventBus.getInstance().on(
            EventBusEvent.selectSatData,
            () => {
              ServiceLocator.getUiManager().searchManager.closeSearch();
              hideEl('actions-section');
            },
          );

          EventBus.getInstance().on(
            EventBusEvent.uiManagerFinal,
            () => {
              hideEl('tutorial-btn');
            },
          );

          settingsManager.maxAnalystSats = 1;
          settingsManager.maxFieldOfViewMarkers = 1;
          settingsManager.maxMissiles = 1;
          settingsManager.minDistanceFromSatellite = <Kilometers>25;
          settingsManager.isLoadLastSensor = false;
        } else {
          settingsManager.maxOribtsDisplayed = settingsManager.maxOribtsDisplayedDesktop;
          if (typeof settingsManager.enableHoverOverlay === 'undefined') {
            settingsManager.enableHoverOverlay = true;
          }

          settingsManager.isDisableGodrays = false;
          settingsManager.isDisableSkybox = false;
          settingsManager.isDisablePlanets = false;

          settingsManager.isMobileModeEnabled = false;
          settingsManager.cameraMovementSpeed = 0.003;
          settingsManager.cameraMovementSpeedMin = 0.005;
          if (settingsManager.isUseHigherFOVonMobile) {
            settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
          } else {
            settingsManager.fieldOfView = 0.6 as Radians;
          }
          settingsManager.maxLabels = settingsManager.desktopMaxLabels;
        }
      } else {
        errorManagerInstance.debug('MobileManager.checkMobileMode() called after initialization!');
      }
    } catch (e) {
      errorManagerInstance.log(e);
    }
  }

  static checkIfMobileDevice() {
    return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/iu).test(navigator.userAgent);
  }
}

export const mobileManager = new MobileManager();
