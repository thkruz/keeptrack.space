import { Degrees, Kilometers, Milliseconds } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { getEl } from '../../lib/get-el';
import { lat2pitch, lon2yaw } from '../../lib/transforms';
import { TimeMachine } from '../../plugins/time-machine/time-machine';

export const darkClouds = () => {
  const DEFAULT_LATITUDE = <Degrees>0; // NOTE: 0 will make the geosynchronous satellites more apparent
  const DEFAULT_LONGITUDE = <Degrees>20;
  const DELAY_BEFORE_ROTATING = 1000; // ms - NOTE: Number should be at least 1000 or it will fail to fire the event
  const RESTART_ROTATE_TIME = 10; // Restart auto rotate after this many seconds

  settingsManager.disableAllPlugins();
  settingsManager.plugins.timeMachine = true;
  settingsManager.plugins.topMenu = false;

  settingsManager.isDisableAsciiCatalog = true;

  settingsManager.isDisableStars = true;
  settingsManager.maxAnalystSats = 1;
  settingsManager.maxMissiles = 1;
  settingsManager.maxFieldOfViewMarkers = 1;
  settingsManager.noMeshManager = true;
  settingsManager.isLoadLastMap = false;
  settingsManager.isShowAgencies = false;
  settingsManager.lowresImages = true;
  settingsManager.isAllowRightClick = false;
  settingsManager.isDisableSelectSat = false;
  settingsManager.isDisableSensors = true;
  settingsManager.isDisableControlSites = true;
  settingsManager.isDisableLaunchSites = true;
  settingsManager.isLoadLastSensor = false;

  settingsManager.isDisableExtraCatalog = false;
  settingsManager.offline = true;

  settingsManager.startWithOrbitsDisplayed = true;

  settingsManager.colors.payload = [0.2, 1.0, 0.0, 0.5]; // Green
  settingsManager.colors.pink = [0.2, 1.0, 0.0, 0.5]; // "Special" objects often have no data - make them match payloads

  settingsManager.colors.unknown = [1, 0.8, 0.1, 0.85]; // Dark Yellow
  settingsManager.colors.rocketBody = [1, 0.8, 0.1, 0.85]; // Dark Yellow
  settingsManager.colors.debris = [0.8, 0.8, 0.1, 0.85]; // Yellow
  // settingsManager.colors.rocketBody = [0.7, 0.7, 0.7, 0.85]; // Ted's recommendation - Dark Gray
  // settingsManager.colors.debris = [0.8, 0.8, 0.8, 0.85]; // Ted's recommendation - Gray

  settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0.0]; // Transparent

  settingsManager.hoverColor = [1.0, 0.0, 0.0, 1.0]; // Objects Red on Hover
  settingsManager.orbitHoverColor = [1.0, 0.0, 0.0, 0.9]; // Orbit Red on Hover
  settingsManager.orbitGroupAlpha = 0.25; // Transparency of satellite orbits (transparency has no impact on load times)

  settingsManager.satShader.minSize = 12.0; // Change the size of the dots

  // NOTE: Ideally you want each draw cycle to complete within 16ms. 10,000 creates enough lines to make it seem like "everything" to
  // the average person while still keeping performance acceptable.
  settingsManager.maxOribtsDisplayedDesktopAll = 10000; // This applies when showing "all" orbits and improves performance substantially
  settingsManager.maxOribtsDisplayedDesktop = 200000; // settingsManager applies when searching (ie time machine)
  settingsManager.maxOribtsDisplayed = 100000;
  settingsManager.searchLimit = 100000;
  settingsManager.minZoomDistance = <Kilometers>10000;
  settingsManager.maxZoomDistance = <Kilometers>100000;

  // Text Override for Time Machine Toast Messages
  // yearStr is the last two digits of the year in string format
  settingsManager.timeMachineString = (yearStr) => {
    keepTrackApi.getUiManager().dismissAllToasts(); // Dismiss All Toast Messages (workaround to avoid animations)
    const yearPrefix = parseInt(yearStr) < 57 ? '20' : '19';
    const english = `In ${yearPrefix}${yearStr}`;
    // const french = `En ${yearPrefix}${yearStr}`;
    // const german = `Im ${yearPrefix}${yearStr}`;
    const satellitesSpan = `<span style="color: rgb(35, 255, 35);">Satellites </span>`;
    const debrisSpan = `<span style="color: rgb(255, 255, 35);">Debris </span>`;
    document.getElementById('textOverlay').innerHTML = `${satellitesSpan} and ${debrisSpan} ${english}`;
    return `${english}`;
  };

  settingsManager.onLoadCb = () => {
    getEl('nav-footer').style.display = 'none';

    // Create div for textOverlay
    const textOverlay = document.createElement('div');
    textOverlay.id = 'textOverlay';
    document.body.appendChild(textOverlay);

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

    document.getElementById('textOverlay').style.cssText = `
                    border-radius: 2px;
                    bottom: 125px;
                    right: 150px;
                    width: auto;
                    position: absolute;
                    min-height: 48px;
                    line-height: 2.5em !important;
                    background-color: rgb(0, 0, 0) !important;
                    padding: 10px 55px !important;
                    font-size: 3.6rem !important;
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
      keepTrackApi.getSelectSatManager().selectSat(-1); // Deselect Any Satellites
      setTimeout(() => {
        (<TimeMachine>keepTrackApi.getPlugin(TimeMachine)).historyOfSatellitesPlay(); // Start Time Machine
        keepTrackApi.getMainCamera().zoomTarget = 0.8; // Reset Zoom to Default
        keepTrackApi.getMainCamera().camSnap(lat2pitch(DEFAULT_LATITUDE), lon2yaw(DEFAULT_LONGITUDE, new Date())); // Reset Camera to Default
      }, 100);
      setTimeout(() => {
        keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false; // Disable Camera Snap Mode
        keepTrackApi.getMainCamera().autoRotate(true); // Start Rotating Camera
      }, DELAY_BEFORE_ROTATING);
    };

    // Initialize
    settingsManager.lastInteractionTime = Date.now() - RESTART_ROTATE_TIME * 1000 + 1000;
    const allSatsGroup = keepTrackApi.getGroupsManager().createGroup(0, null); // All Satellites
    document.getElementById('textOverlay').innerHTML = 'Building Buffers';

    // Show All Orbits first to build buffers
    keepTrackApi.getGroupsManager().selectGroup(allSatsGroup); // Show all orbits
    setTimeout(() => {
      // Start Time Machine after 5 seconds to allow for buffers to be built
      startTimeMachine();
      // Start Timer To Check for User Activity
      setInterval(() => {
        if (Date.now() - settingsManager.lastInteractionTime > RESTART_ROTATE_TIME * 1000) {
          // If Time Machine is Off
          if (!(<TimeMachine>keepTrackApi.getPlugin(TimeMachine)).isTimeMachineRunning) {
            startTimeMachine();
          } else {
            if ((<TimeMachine>keepTrackApi.getPlugin(TimeMachine)).historyOfSatellitesRunCount >= 67) {
              setTimeout(() => {
                startTimeMachine();
              }, settingsManager.timeMachineDelay);
            }
          }
        } else {
          // If Time Machine is Running
          if ((<TimeMachine>keepTrackApi.getPlugin(TimeMachine)).isTimeMachineRunning) {
            (<TimeMachine>keepTrackApi.getPlugin(TimeMachine)).isTimeMachineRunning = false; // Stop Time Machine

            settingsManager.colors.transparent = keepTrackApi.getOrbitManager().tempTransColor;

            keepTrackApi.getGroupsManager().selectGroup(allSatsGroup); // Show all orbits

            // groupsManager.selectGroup(null); // Deselect all orbits
            keepTrackApi.getColorSchemeManager().setColorScheme(keepTrackApi.getColorSchemeManager().default, true); // Reset All Colors
            keepTrackApi.getUiManager().dismissAllToasts();

            // Add these four lines if you want to hide the orbits when interacting with the mouse
            // const yearGroup = groupsManager.createGroup('yearOrLess', 2022); // Get All Satellites
            // groupsManager.selectGroup(yearGroup);
            // yearGroup.updateOrbits(orbitManager, orbitManager);
            // satSet.setColorScheme(colorSchemeManager.group, true); // force color recalc
            setTimeout(() => {
              document.getElementById('textOverlay').innerHTML = 'Present Day';
            }, 0);
          }
        }
      }, 1000);
    }, 10000);
  };
};
