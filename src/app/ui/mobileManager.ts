import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { AtmosphereSettings, EarthCloudTextureQuality, EarthDayTextureQuality, EarthNightTextureQuality, EarthTextureStyle } from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { KeepTrack } from '@app/keeptrack';
import { Kilometers, Radians } from '@ootk/src/main';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { getEl, hideEl } from '../../engine/utils/get-el';

export class MobileManager {
  static readonly MOBILE_ORBIT_LIMIT = 1500;

  // eslint-disable-next-line require-await
  static async checkMobileMode() {
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
          settingsManager.plugins.SoundToggle = cachePlugins.SoundToggle;
          settingsManager.plugins.SelectSatManager = cachePlugins.SelectSatManager;
          settingsManager.plugins.SatInfoBoxCore = cachePlugins.SatInfoBoxCore;
          settingsManager.plugins.SatInfoBoxObject = cachePlugins.SatInfoBoxObject;
          settingsManager.plugins.TopMenu = cachePlugins.TopMenu;
          settingsManager.plugins.DateTimeManager = cachePlugins.DateTimeManager;
          settingsManager.plugins.SatInfoBoxOrbital = cachePlugins.SatInfoBoxOrbital;
          settingsManager.plugins.SatInfoBoxMission = cachePlugins.SatInfoBoxMission;
          settingsManager.plugins.SatInfoBoxSponsor = cachePlugins.SatInfoBoxSponsor;
          settingsManager.plugins.ScenarioManagementPlugin = cachePlugins.ScenarioManagementPlugin;
          settingsManager.plugins.TimeSlider = cachePlugins.TimeSlider;

          settingsManager.plugins.CountriesMenu = cachePlugins.CountriesMenu;
          settingsManager.plugins.FilterMenuPlugin = cachePlugins.FilterMenuPlugin;
          settingsManager.plugins.Reentries = cachePlugins.Reentries;
          settingsManager.plugins.TimeMachine = cachePlugins.TimeMachine;
          settingsManager.plugins.NaturalEventsPlugin = cachePlugins.NaturalEventsPlugin;
          settingsManager.plugins.SeismicActivityPlugin = cachePlugins.SeismicActivityPlugin;
          settingsManager.plugins.FilterMenuPlugin = cachePlugins.FilterMenuPlugin;
          settingsManager.plugins.DeepSpaceMissionsPlugin = cachePlugins.DeepSpaceMissionsPlugin;
          settingsManager.plugins.NightToggle = cachePlugins.NightToggle;
          settingsManager.plugins.GraticuleToggle = cachePlugins.GraticuleToggle;
          settingsManager.plugins.CloudsToggle = cachePlugins.CloudsToggle;

          settingsManager.plugins.GunterLaunchCalendar = cachePlugins.GunterLaunchCalendar;
          settingsManager.plugins.TheSpaceDevLaunchCalendarPlugin = cachePlugins.TheSpaceDevLaunchCalendarPlugin;

          settingsManager.defaultColorScheme = 'CelestrakColorScheme';
          settingsManager.isDisablePlanets = true;

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

          EventBus.getInstance().on(
            EventBusEvent.selectSatData,
            () => {
              ServiceLocator.getUiManager().searchManager.closeSearch();
              hideEl('actions-section');
            },
          );

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
    if (typeof settingsOverride?.isForceMobileMode === 'boolean') {
      return settingsOverride.isForceMobileMode;
    }

    return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/iu).test(navigator.userAgent);
  }
}

export const mobileManager = new MobileManager();
