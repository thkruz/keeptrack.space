import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import {
  AtmosphereSettings,
  EarthCloudTextureQuality,
  EarthDayTextureQuality,
  EarthNightTextureQuality,
  EarthTextureStyle,
} from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { KeepTrack } from '@app/keeptrack';
import { t7e } from '@app/locales/keys';
import { Kilometers, Radians } from '@ootk/src/main';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { getEl, hideEl } from '../../engine/utils/get-el';

export class MobileManager {
  static readonly MOBILE_ORBIT_LIMIT = 1500;

  /** Plugins that keep their configured state on phones; every other plugin is switched off. */
  static readonly MOBILE_PLUGINS: readonly (keyof typeof settingsManager.plugins)[] = [
    'SoundToggle',
    'SelectSatManager',
    'SatInfoBoxCore',
    'SatInfoBoxObject',
    'SatInfoBoxOrbital',
    'SatInfoBoxMission',
    'SatInfoBoxSponsor',
    'SatInfoBoxLinks',
    'TopMenu',
    'DateTimeManager',
    'ScenarioManagementPlugin',
    'TimeSlider',
    'CountriesMenu',
    'FilterMenuPlugin',
    'Reentries',
    'TimeMachine',
    'NaturalEventsPlugin',
    'SeismicActivityPlugin',
    'DeepSpaceMissionsPlugin',
    'NightToggle',
    'GraticuleToggle',
    'CloudsToggle',
    'TheSpaceDevLaunchCalendarPlugin',
    // Added for phones 2026-10-30: list and share menus that fit a narrow screen.
    'ShareMenuPlugin',
    'SatConstellations',
    'WatchlistPlugin',
    'KtocNoticesPlugin',
    'ColorMenu',
    'Screenshot',
    'FindSatPlugin',
    'SatellitePhotos',
  ];

  static checkMobileMode() {
    try {
      // Don't become mobile after initialization
      if (!KeepTrack.getInstance().isInitialized) {
        if (MobileManager.checkIfMobileDevice()) {
          settingsManager.isMobileModeEnabled = true;
          settingsManager.disableWindowTouchMove = false;
          settingsManager.isShowLoadingHints = false;
          settingsManager.isDisableBottomMenu = false;
          settingsManager.maxOrbitsDisplayed = MobileManager.MOBILE_ORBIT_LIMIT;
          settingsManager.enableHoverOverlay = false;
          settingsManager.cameraMovementSpeed = settingsManager.touchCameraMovementSpeed;
          settingsManager.cameraMovementSpeedMin = settingsManager.touchCameraMovementSpeed;
          settingsManager.zoomSpeed = 0.025;

          if (settingsManager.isUseHigherFOVonMobile) {
            settingsManager.fieldOfView = settingsManager.fieldOfViewMax as Radians;
          } else {
            settingsManager.fieldOfView = 0.6 as Radians;
          }
          settingsManager.maxLabels = settingsManager.mobileMaxLabels;

          // Mobile mode has a lot of desktop-only plugins that are not optimized for mobile and would cause performance issues, so we disable them by default.
          // However, we allow users to re-enable any plugins they want in the settings.
          const cachePlugins = { ...settingsManager.plugins };

          // Disable desktop only plugins
          Object.keys(settingsManager.plugins).forEach((key) => {
            settingsManager.plugins[key] = false;
          });
          for (const key of MobileManager.MOBILE_PLUGINS) {
            (settingsManager.plugins as Record<string, unknown>)[key] = cachePlugins[key];
          }

          settingsManager.defaultColorScheme = 'CelestrakColorScheme';
          settingsManager.isDisablePlanets = true;

          // Get the size of keeptrack-root
          const keeptrackRoot = getEl('keeptrack-root');

          if ((keeptrackRoot?.clientWidth ?? 601) < 600) {
            settingsManager.isShowPrimaryLogo = false;
            settingsManager.isShowSecondaryLogo = false;
          } else if (!settingsManager.isMobileModeEnabled) {
            ServiceLocator.getUiManager().toast(t7e('toasts.mobileFullVersionUnavailable'), ToastMsgType.normal);
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
            isDisableBottomMenu: false,
            isDrawSun: true,
            isDrawMilkyWay: true,
            isDisableGodrays: true,
            godraysSamples: -1,
            isDisableMoon: false,
            earthDayTextureQuality: EarthDayTextureQuality.HIGH,
            earthNightTextureQuality: EarthNightTextureQuality.HIGH,
            isDrawNightAsDay: false,
            // earthSpecTextureQuality: '1k',
            isDrawSpecMap: false,
            // earthBumpTextureQuality: '1k',
            isDrawBumpMap: false,
            // earthCloudTextureQuality: '1k',
            isDrawCloudsMap: true,
            earthCloudTextureQuality: EarthCloudTextureQuality.HIGH,
            // earthPoliticalTextureQuality: '1k',
            isDrawPoliticalMap: false,
            earthTextureStyle: EarthTextureStyle.BLUE_MARBLE,
            isDrawAtmosphere: AtmosphereSettings.ON,
            isDisableSkybox: false,
            isDisableSearchBox: false,
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

          EventBus.getInstance().on(EventBusEvent.selectSatData, () => {
            ServiceLocator.getUiManager().searchManager.closeSearch();
            hideEl('actions-section');
          });

          settingsManager.maxAnalystSats = 1;
          settingsManager.maxFieldOfViewMarkers = 1;
          settingsManager.maxMissiles = 1;
          settingsManager.minDistanceFromSatellite = <Kilometers>25;
          settingsManager.isLoadLastSensor = false;
        } else {
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
    // Check if we are manually overriding this setting in the settingsOverride.js file
    if (typeof window.settingsOverride?.isForceMobileMode === 'boolean') {
      return window.settingsOverride.isForceMobileMode;
    }

    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/iu.test(navigator.userAgent);
  }
}

export const mobileManager = new MobileManager();
