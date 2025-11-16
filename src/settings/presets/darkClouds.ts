import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import {
  EarthBumpTextureQuality,
  EarthCloudTextureQuality,
  EarthDayTextureQuality, EarthNightTextureQuality,
  EarthPoliticalTextureQuality,
  EarthSpecTextureQuality,
} from '@app/engine/rendering/draw-manager/earth-quality-enums';
import { lat2pitch, lon2yaw } from '@app/engine/utils/transforms';
import { KeepTrack } from '@app/keeptrack';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Degrees, Kilometers, Milliseconds, Radians } from '@ootk/src/main';
import i18next from 'i18next';
import { getEl, hideEl, setInnerHtml } from '../../engine/utils/get-el';
import { TimeMachine } from '../../plugins/time-machine/time-machine';
import { SettingsManager } from '../settings';

export const darkClouds = (settingsManager: SettingsManager) => {
  const DEFAULT_LATITUDE = <Degrees>0; // NOTE: 0 will make the geosynchronous satellites more apparent
  const DEFAULT_LONGITUDE = <Degrees>121;
  const DELAY_BEFORE_ROTATING = 1000; // ms - NOTE: Number should be at least 1000 or it will fail to fire the event
  const RESTART_ROTATE_TIME = 10; // Restart auto rotate after this many seconds

  settingsManager.isBlockPersistence = true;

  settingsManager.disableAllPlugins();
  settingsManager.plugins.TimeMachine = { enabled: true };
  settingsManager.plugins.TopMenu = { enabled: false };

  settingsManager.simulationTime = new Date('2025-04-01T00:00:00Z'); // Set to April 1, 2025

  settingsManager.isEnableJscCatalog = false;

  settingsManager.earthDayTextureQuality = '16k' as EarthDayTextureQuality;
  settingsManager.earthNightTextureQuality = '16k' as EarthNightTextureQuality;
  settingsManager.earthSpecTextureQuality = '8k' as EarthSpecTextureQuality;
  settingsManager.earthBumpTextureQuality = '8k' as EarthBumpTextureQuality;
  settingsManager.earthPoliticalTextureQuality = 'off' as EarthPoliticalTextureQuality;
  settingsManager.earthCloudTextureQuality = '8k' as EarthCloudTextureQuality;

  settingsManager.disableCameraControls = true;

  settingsManager.isEPFL = true; // Enable EPFL
  settingsManager.isShowLoadingHints = false; // Disable Loading Hints

  settingsManager.splashScreenList = ['epfl-1', 'epfl-2']; // Set Splash Screens to EPFL

  EventBus.getInstance().on(EventBusEvent.onKeepTrackReady, () => {
    hideEl('logo-primary');
  });
  settingsManager.isDisableAsciiCatalog = true;
  settingsManager.defaultColorScheme = 'ObjectTypeColorScheme';
  settingsManager.isDisableStars = true;
  settingsManager.isOrbitCruncherInEcf = false;
  settingsManager.maxAnalystSats = 1;
  settingsManager.maxMissiles = 1;
  settingsManager.maxFieldOfViewMarkers = 1;
  settingsManager.noMeshManager = true;
  settingsManager.isLoadLastMap = false;
  settingsManager.isShowAgencies = false;
  settingsManager.isAllowRightClick = false;
  settingsManager.isDisableSelectSat = false;
  settingsManager.isDisableSensors = true;
  settingsManager.isDisableControlSites = true;
  settingsManager.isDisableLaunchSites = true;
  settingsManager.isLoadLastSensor = false;

  settingsManager.isDisableExtraCatalog = false;
  settingsManager.offlineMode = true;

  settingsManager.startWithOrbitsDisplayed = true;

  settingsManager.colors.payload = [0.2, 1.0, 0.0, 0.5]; // Green
  settingsManager.colors.pink = [0.2, 1.0, 0.0, 0.5]; // "Special" objects often have no data - make them match payloads

  settingsManager.colors.unknown = [1, 0.8, 0.1, 0.85]; // Dark Yellow
  settingsManager.colors.rocketBody = [1, 0.8, 0.1, 0.85]; // Dark Yellow
  settingsManager.colors.debris = [0.8, 0.8, 0.1, 0.85]; // Yellow
  /*
   * settingsManager.colors.rocketBody = [0.7, 0.7, 0.7, 0.85]; // Ted's recommendation - Dark Gray
   * settingsManager.colors.debris = [0.8, 0.8, 0.8, 0.85]; // Ted's recommendation - Gray
   */

  settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0.0]; // Transparent

  settingsManager.hoverColor = [1.0, 0.0, 0.0, 1.0]; // Objects Red on Hover
  settingsManager.orbitHoverColor = [1.0, 0.0, 0.0, 0.9]; // Orbit Red on Hover
  settingsManager.orbitGroupAlpha = 0.25; // Transparency of satellite orbits (transparency has no impact on load times)

  settingsManager.satShader.minSize = 12.0; // Change the size of the dots

  /*
   * NOTE: Ideally you want each draw cycle to complete within 16ms. 10,000 creates enough lines to make it seem like "everything" to
   * the average person while still keeping performance acceptable.
   */
  settingsManager.maxOribtsDisplayedDesktopAll = 10000; // This applies when showing "all" orbits and improves performance substantially
  settingsManager.maxOribtsDisplayedDesktop = 200000; // settingsManager applies when searching (ie time machine)
  settingsManager.maxOribtsDisplayed = 100000;
  settingsManager.searchLimit = 100000;
  settingsManager.minZoomDistance = <Kilometers>10000;
  settingsManager.maxZoomDistance = <Kilometers>100000;

  /*
   * Text Override for Time Machine Toast Messages
   * yearStr is the last two digits of the year in string format
   */
  settingsManager.timeMachineString = (yearStr) => {
    ServiceLocator.getUiManager().dismissAllToasts(); // Dismiss All Toast Messages (workaround to avoid animations)
    const satellitesSpan = `<span style="color: rgb(35, 255, 35);">${t7e('darkClouds.satellites')}</span>`;
    const debrisSpan = `<span style="color: rgb(255, 255, 35);">${t7e('darkClouds.debris')}</span>`;
    const yearPrefix = parseInt(yearStr) < 57 ? '20' : '19';
    let inYearString = `${t7e('darkClouds.in')} ${yearPrefix}${yearStr}`;

    if (i18next.language === 'zh') {
      // Chinese language uses a different format
      inYearString = `${yearPrefix}${yearStr}${t7e('darkClouds.in')}`;
      getEl('textOverlay')!.innerHTML = `${inYearString}${satellitesSpan}${t7e('darkClouds.and')}${debrisSpan}`;
    } else {
      getEl('textOverlay')!.innerHTML = `${satellitesSpan} ${t7e('darkClouds.and')} ${debrisSpan} ${inYearString}`;
    }

    return `${inYearString}`;
  };

  settingsManager.onLoadCb = () => {
    hideEl('nav-footer');

    // Create div for textOverlay
    const textOverlay = document.createElement('div');

    textOverlay.id = 'textOverlay';
    KeepTrack.getInstance().containerRoot.appendChild(textOverlay);

    // Update CSS
    const toastCss = `
                    .toast,
                    .toast-container {
                      display: none !important;
                    }
                  `;
    const style = document.createElement('style');

    style.type = 'text/css';
    style.appendChild(document.createTextNode(toastCss));
    document.head.appendChild(style);

    getEl('textOverlay')!.style.cssText = `
                    border-radius: 2px;
                    bottom: 25px;
                    right: 30px;
                    width: auto;
                    position: absolute;
                    min-height: 36px;
                    line-height: 2em !important;
                    background-color: rgb(0, 0, 0) !important;
                    padding: 7px 40px !important;
                    font-size: 2.5rem !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Open Sans', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
                    font-weight: 300;
                    color: white;
                  }`;

    // settingsManager.autoRotateSpeed = 0.05 * 0.000075;
    settingsManager.autoRotateSpeed = 0.5 * 0.000075; // Ted's recommendation

    settingsManager.isDisableSelectSat = true; // Use this to disable selecting satellites

    settingsManager.timeMachineDelay = <Milliseconds>(2 * 1000); // Delay in ms to linger on each year
    settingsManager.timeMachineLongToast = true; // Toast lingers for longer (Might not be needed any more but no impact)
    settingsManager.loopTimeMachine = true; // Loop through the years

    const startTimeMachine = () => {
      PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1); // Deselect Any Satellites
      const mainCameraInstance = ServiceLocator.getMainCamera();

      mainCameraInstance.state.camPitch = lat2pitch(DEFAULT_LATITUDE);
      mainCameraInstance.state.camYaw = lon2yaw(DEFAULT_LONGITUDE, ServiceLocator.getTimeManager().simulationTimeObj);
      mainCameraInstance.state.dragStartPitch = 0.06321641675916885 as Radians;
      mainCameraInstance.state.dragStartYaw = 2.244571612554059 as Radians;
      mainCameraInstance.state.zoomLevel = 0.8;
      mainCameraInstance.state.zoomTarget = 0.8;

      mainCameraInstance.state.screenDragPoint = [mainCameraInstance.state.mouseX, mainCameraInstance.state.mouseY];

      setTimeout(() => {
        (<TimeMachine>PluginRegistry.getPlugin(TimeMachine)).historyOfSatellitesPlay(); // Start Time Machine
      }, 100);
      setTimeout(() => {
        mainCameraInstance.state.isAutoPitchYawToTarget = false; // Disable Camera Snap Mode
        mainCameraInstance.autoRotate(true); // Start Rotating Camera
      }, DELAY_BEFORE_ROTATING);
    };

    // Initialize
    settingsManager.lastInteractionTime = Date.now() - RESTART_ROTATE_TIME * 1000 + 1000;
    const allSatsGroup = ServiceLocator.getGroupsManager().createGroup(0, null); // All Satellites

    setInnerHtml('textOverlay', t7e('darkClouds.buildingBuffers'));

    // Show All Orbits first to build buffers
    ServiceLocator.getGroupsManager().selectGroup(allSatsGroup); // Show all orbits
    setTimeout(() => {
      // Start Time Machine after 5 seconds to allow for buffers to be built
      startTimeMachine();
      // Start Timer To Check for User Activity
      setInterval(() => {
        if (Date.now() - settingsManager.lastInteractionTime > RESTART_ROTATE_TIME * 1000) {
          // If Time Machine is Off
          if (!(<TimeMachine>PluginRegistry.getPlugin(TimeMachine)).isTimeMachineRunning) {
            startTimeMachine();
          } else if ((<TimeMachine>PluginRegistry.getPlugin(TimeMachine)).historyOfSatellitesRunCount >= 67) {
            setTimeout(() => {
              startTimeMachine();
            }, settingsManager.timeMachineDelay);
          }
          // If Time Machine is Running
        } else if ((<TimeMachine>PluginRegistry.getPlugin(TimeMachine)).isTimeMachineRunning) {
          (<TimeMachine>PluginRegistry.getPlugin(TimeMachine)).isTimeMachineRunning = false; // Stop Time Machine

          settingsManager.colors.transparent = ServiceLocator.getOrbitManager().tempTransColor;

          ServiceLocator.getGroupsManager().selectGroup(allSatsGroup); // Show all orbits

          // groupsManager.selectGroup(null); // Deselect all orbits
          ServiceLocator.getColorSchemeManager().calculateColorBuffers(true); // Reset All Colors
          ServiceLocator.getUiManager().dismissAllToasts();

          /*
           * Add these four lines if you want to hide the orbits when interacting with the mouse
           * const yearGroup = groupsManager.createGroup('yearOrLess', 2022); // Get All Satellites
           * groupsManager.selectGroup(yearGroup);
           * yearGroup.updateOrbits(orbitManager, orbitManager);
           * satSet.setColorScheme(colorSchemeManager.group, true); // force color recalc
           */
          setTimeout(() => {
            setInnerHtml('textOverlay', t7e('darkClouds.presentDay'));
          }, 0);
        }
      }, 1000);
    }, 10000);
  };
};
