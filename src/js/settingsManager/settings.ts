/**
// /////////////////////////////////////////////////////////////////////////////

 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { isThisJest } from '@app/js/api/keepTrackApi';
import { SettingsManager } from '@app/js/api/keepTrackTypes';

// Actual Setup
export let settingsManager: SettingsManager = {
  // Classification can be "Unclassified", "Secret", "Top Secret", "Top Secret//SCI"
  classificationStr: '',
  // This controls which of the built-in plugins are loaded
  plugins: {
    debug: false,
    satInfoboxCore: true,
    updateSelectBoxCore: true,
    aboutManager: true,
    collisions: true,
    dops: true,
    findSat: true,
    launchCalendar: true,
    newLaunch: true,
    nextLaunch: true,
    nightToggle: true,
    photoManager: true,
    recorderManager: true,
    satChanges: false,
    stereoMap: true,
    timeMachine: true,
    twitter: true,
    initialOrbit: true,
    missile: true,
    breakup: true,
    editSat: true,
    constellations: true,
    countries: true,
    colorsMenu: true,
    shortTermFences: true,
    orbitReferences: true,
    externalSources: true,
    analysis: true,
    plotAnalysis: true,
    sensorFov: true,
    sensorSurv: true,
    satelliteFov: true,
    satelliteView: true,
    planetarium: true,
    astronomy: true,
    photo: true,
    watchlist: true,
    sensor: true,
    settingsMenu: true,
    datetime: true,
    social: true,
    topMenu: true,
    classification: true,
    soundManager: true,
    gamepad: true,
    scenarioCreator: false,
  },
  colors: null,
  timeMachineDelay: null,
  mapWidth: null,
  mapHeight: null,
  isMapUpdateOverride: null,
  disableUI: null,
  isMobileModeEnabled: null,
  lastMapUpdateTime: null,
  isFOVBubbleModeOn: null,
  isShowSurvFence: null,
  isSatOverflyModeOn: null,
  currentColorScheme: null,
  hiResWidth: null,
  hiResHeight: null,
  screenshotMode: null,
  lastBoxUpdateTime: null,
  isEditTime: null,
  fieldOfView: null,
  db: null,
  isGlobalErrorTrapOn: true,
  isShowSplashScreen: true,
  isUseExtendedCatalog: false,
  isNotionalDebris: false,
  isFreezePropRateOnDrag: false,
  // prettier-ignore
  init: (settingsOverride?: any) => {
    settingsManager.pTime = [];

    // Install Folder Settings
    {
      switch (window.location.host) {
        case 'keeptrack.space':
        case 'www.keeptrack.space':
          settingsManager.installDirectory = '/';
          settingsManager.isOfficialWebsite = true;
          break;
        case 'localhost':
        case '127.0.0.1':
          // Is node running? This must be some kind of test
          if (isThisJest()) {
            settingsManager.installDirectory = 'http://127.0.0.1:8080/';
          } else {
            // Comment Out the Next Two Lines if you are testing on a local server
            // and have the keeptrack files installed in a subdirectory
            settingsManager.installDirectory = '/';
            // settingsManager.offline = true;
          }
          break;
        case 'darts.staging.dso.mil':
          settingsManager.installDirectory = '/keeptrack/';
          break;
        case 'thkruz.github.io':
        case 'www.thkruz.github.io':
          settingsManager.installDirectory = '/keeptrack.space/';
          break;
        case '':
          settingsManager.offline = true;
          settingsManager.installDirectory = './';
          break;
        default:
          settingsManager.installDirectory = '/';
          break;
      }
      if (typeof settingsManager.installDirectory == 'undefined') {
        // Put Your Custom Install Directory Here
        settingsManager.installDirectory = '/';
      }
    }

    settingsManager.lowPerf = false;

    if (window.location.hostname === 'keeptrack.space' || window.location.hostname === 'localhost' || window.location.hostname === 'thkruz.github.io') {
      settingsManager.unofficial = false;
    } else {
      settingsManager.unofficial = true;
    }

    // //////////////////////////////////////////////////////////////////////////
    // Most Commonly Used Settings
    // //////////////////////////////////////////////////////////////////////////
    // Catch Errors and report them
    settingsManager.isGlobalErrorTrapOn = true;

    // ASCII Catalog for offline use
    settingsManager.isDisableAsciiCatalog = true;

    // JSON Catalog for offline use
    settingsManager.isDisableExtraCatalog = false;

    // New Extended Catalog
    settingsManager.isEnableExtendedCatalog = false;

    // This needed to be increased to support large number of CSpOC sensors
    settingsManager.maxFieldOfViewMarkers = 500000;
    settingsManager.maxMissiles = 500;
    settingsManager.maxAnalystSats = 30000;

    // Enable the debris only catalog
    settingsManager.isUseDebrisCatalog = false;

    // Dont load the sensors
    settingsManager.isDisableSensors = false;

    // Splash Screens
    settingsManager.isShowSplashScreen = true;

    // Dont load the launch sites
    settingsManager.isDisableLaunchSites = false;

    // Dont Load the control sites
    settingsManager.isDisableControlSites = false;

    // Enable/Disable gs.json catalog Information
    settingsManager.isEnableGsCatalog = true;
    // Enable/Disable radarData Information
    settingsManager.isEnableRadarData = false;
    settingsManager.maxRadarData = 1; // 70000;


    // Adjust to change camera speed of auto rotate around earth
    settingsManager.autoRotateSpeed = 1.0 * 0.000075;
    // Adjust to change camera speed of auto pan around earth
    settingsManager.autoPanSpeed = {
      x: 1,
      y: 0,
    };
    // Disable main user interface. Currently an all or nothing package.
    settingsManager.disableUI = false;
    // Currently only disables panning. In the future it will disable all camera
    // movement
    settingsManager.disableCameraControls = false;
    // Disable normal browser events from keyboard/mouse
    settingsManager.disableNormalEvents = false;
    // Allow Righ Click Menu
    settingsManager.isAllowRightClick = true;
    // Disable normal browser right click menu
    settingsManager.disableDefaultContextMenu = true;
    // Disable Scrolling the Window Object
    settingsManager.disableWindowScroll = true;
    // Disable Zoom Keyboard Keys
    settingsManager.disableZoomControls = true;
    // Disable Touch Move Causing Drag Errors on Desktop
    settingsManager.disableWindowTouchMove = true;
    // Display ECI on Hover
    settingsManager.isEciOnHover = false;
    // Allows canvas will steal focus on load
    settingsManager.startWithFocus = false;
    // Shows an overlay with object information
    settingsManager.enableHoverOverlay = true;
    // Shows the oribt of the object when highlighted
    settingsManager.enableHoverOrbits = true;
    // Updates Orbit of selected satellite on every draw.
    // Performance hit, but makes it clear what direction the satellite is going
    settingsManager.enableConstantSelectedSatRedraw = true;
    // How much an orbit fades over time
    settingsManager.orbitFadeFactor = 0.6; // 1.0 == No Fade


    // Toggle Drawing the Sun
    settingsManager.isDrawSun = true;
    // Toggle drawing the milky way
    settingsManager.isDrawMilkyWay = true;
    // Automatically display all of the orbits
    settingsManager.startWithOrbitsDisplayed = false;
    // Maximum orbits allowed on fullsize screens
    settingsManager.maxOribtsDisplayedDesktop = 100000;
    // Maximum orbits allowed on smaller screens
    settingsManager.maxOrbitsDisplayedMobile = 1500;
    // Canvas will autoresize on screen resize to width/height of window
    settingsManager.isAutoResizeCanvas = true;
    // Changing the zoom with the mouse wheel will stop the camera from following
    // the satellite.
    settingsManager.isZoomStopsSnappedOnSat = false;

    // Settings this to true will hide the earth textures and make the globe black
    settingsManager.isBlackEarth = false;

    // How many draw calls to wait before updating orbit overlay if last draw
    // time was greater than 20ms
    settingsManager.updateHoverDelayLimitSmall = 3;

    // How many draw calls to wait before updating orbit overlay if last draw
    // time was greater than 50ms
    settingsManager.updateHoverDelayLimitBig = 5;

    settingsManager.fieldOfViewMin = 0.04; // 4 Degrees (I think)
    settingsManager.fieldOfViewMax = 1.2; // 120 Degrees (I think)

    settingsManager.minZoomDistance = 6800;
    settingsManager.maxZoomDistance = 120000;
    settingsManager.zoomSpeed = 0.01;
    settingsManager.isZoomStopsRotation = true;

    // This is for debugging and should be false during production to avoid errors
    settingsManager.isUseNullForBadGetEl = true;

    settingsManager.isEPFL = false;

    // Speed at which isScan lines are drawn (each draw will be +speed lat/lon)
    settingsManager.lineScanSpeedSat = 6; // About 6 seconds to scan earth (no source, just a guess)
    settingsManager.lineScanSpeedRadar = 0.25; // About 30 seconds to scan earth (arbitrary)


    // Minimum elevation to draw a line scan
    settingsManager.lineScanMinEl = 5;

    // Minimum fps or sun/moon are skipped
    settingsManager.fpsThrottle1 = 0;
    // Minimum fps or satellite velocities are ignored
    settingsManager.fpsThrottle2 = 10;

    settingsManager.timeMachineDelay = 5000;
    settingsManager.timeMachineString = () => false; // Placeholder for overrides

    settingsManager.videoBitsPerSecond = 30000000; // 10.0Mbps


    // Show orbits in ECF vs ECI
    settingsManager.isOrbitCruncherInEcf = false;

    // Draw Orbits
    settingsManager.isDrawOrbits = true;

    // Draw Trailing Orbits
    settingsManager.isDrawTrailingOrbits = true;

    // Draw Lines from Sensors to Satellites When in FOV
    settingsManager.isDrawInCoverageLines = true;

    // Show LEO satellites
    settingsManager.isShowLeoSats = true;
    // Show HEO satellites
    settingsManager.isShowHeoSats = true;
    // Show MEO satellites
    settingsManager.isShowMeoSats = true;
    // Show GEO satellites
    settingsManager.isShowGeoSats = true;

    // Show Launch Agency and Payload Owners/Manufacturers
    settingsManager.isShowAgencies = true;

    // settingsManager.earthPanningBufferDistance = 100 // Needs work in main.js
    // Use these to default smallest resolution maps and limited "extras" like
    // the sun. Really useful on small screens and for faster
    // loading times
    // settingsManager.isDrawLess = true;
    // settingsManager.smallImages = true;
    // //////////////////////////////////////////////////////////////////////////
    // Gamepad Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.isLimitedGamepadControls = false;
    settingsManager.lastGamepadMovement = 0; // Initialize as 0


    // //////////////////////////////////////////////////////////////////////////
    // Mobile Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.desktopMinimumWidth = 1300;
    settingsManager.isMobileModeEnabled = false;
    if (window.innerWidth <= settingsManager.desktopMinimumWidth) {
      settingsManager.disableWindowTouchMove = false;
      settingsManager.isMobileModeEnabled = true;
      settingsManager.maxFieldOfViewMarkers = 20000;
      // settingsManager.isDrawLess = true;
      // settingsManager.noMeshManager = true;
      settingsManager.camDistBuffer = 100;
    }

    // //////////////////////////////////////////////////////////////////////////
    // Shader Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.showOrbitThroughEarth = false;

    settingsManager.earthNumLatSegs = 128;
    settingsManager.earthNumLonSegs = 128;

    settingsManager.satShader = {
      largeObjectMinZoom: 0.37,
      largeObjectMaxZoom: 0.58,
      minSize: 5.5,
      minSizePlanetarium: 20.0,
      maxSizePlanetarium: 20.0,
      // Max size dynamically changes based on zoom level
      maxAllowedSize: 35.0,
      isUseDynamicSizing: false,
      dynamicSizeScalar: 1.0,
      starSize: '20.0',


      // NOTE: Use floats not integers because some settings get sent to graphics card
      // Must be a string for GPU to read.
      distanceBeforeGrow: '14000.0',

      // Used for Satellites
      blurFactor1: '0.53',
      blurFactor2: '0.5',
      // Used for Stars
      blurFactor3: '0.43',
      blurFactor4: '0.25',
      maxSize: 70.0,
    };

    // //////////////////////////////////////////////////////////////////////////
    // Meshes
    // //////////////////////////////////////////////////////////////////////////
    // settingsManager.meshListOverride = [
    //   'sat2',
    //   's1u',
    //   's2u',
    //   's3u',
    //   'starlink',
    //   'iss',
    //   'gps',
    //   'aehf',
    //   'dsp',
    //   'flock',
    //   'lemur',
    //   'galileo',
    //   'o3b',
    //   'oneweb',
    //   'orbcomm',
    //   'spacebee1gen',
    //   'spacebee2gen',
    //   'spacebee3gen',
    //   'iridium',
    //   'globalstar',
    //   'debris0',
    //   'debris1',
    //   'debris2',
    //   'rocketbody',
    //   'sbirs',
    //   'misl',
    //   'misl2',
    //   'misl3',
    //   'misl4',
    //   'rv',
    // ];
    // //////////////////////////////////////////////////////////////////////////
    // Embed Overrides - FOR TESTING ONLY
    // //////////////////////////////////////////////////////////////////////////
    let pageName = location.href.split('/').slice(-1);
    pageName = pageName[0].split('?').slice(0);

    if (pageName[0] == 'embed.html') {
      settingsManager.disableUI = true;
      settingsManager.startWithOrbitsDisplayed = true;
      settingsManager.isAutoResizeCanvas = true;
      settingsManager.enableHoverOverlay = true;
      settingsManager.enableHoverOrbits = true;
      settingsManager.isDrawLess = true;
      settingsManager.smallImages = true;
      settingsManager.hiresNoCloudsImages = false;
      settingsManager.updateHoverDelayLimitSmall = 25;
      settingsManager.updateHoverDelayLimitBig = 45;
    }

    // //////////////////////////////////////////////////////////////////////////
    // GPU Powered Math from gpu.js
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.gpujsMode = 'webgl';

    // //////////////////////////////////////////////////////////////////////////
    // Map settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.nasaImages = false;
    settingsManager.blueImages = false;
    settingsManager.lowresImages = false;
    settingsManager.hiresImages = false;
    settingsManager.hiresNoCloudsImages = false;
    settingsManager.vectorImages = false;
    settingsManager.politicalImages = false;
    settingsManager.isLoadLastMap = true;
    if (settingsManager.disableUI) {
      settingsManager.isLoadLastMap = false;
    }

    // //////////////////////////////////////////////////////////////////////////
    // Color Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.currentColorScheme = null;
    settingsManager.setCurrentColorScheme = (val) => {
      settingsManager.currentColorScheme = val;
    };

    settingsManager.hoverColor = [1.0, 1.0, 0.0, 1.0]; // Yellow
    settingsManager.selectedColor = [1.0, 0.0, 0.0, 1.0]; // Red
    settingsManager.selectedColorFallback = settingsManager.selectedColor;

    settingsManager.reColorMinimumTime = 1000;
    settingsManager.colors = null;
    try {
      settingsManager.colors = JSON.parse(localStorage.getItem('settingsManager-colors'));
    } catch {
      console.warn('Settings Manager: Unable to get color settings - localStorage issue!');
    }
    if (settingsManager.colors == null || settingsManager.colors.length === 0 || settingsManager.colors.version !== '1.2.0') {
      settingsManager.colors = {
        version: '1.2.0',
        length: 0,
        facility: [0.64, 0.0, 0.64, 1.0],
        sunlight100: [1.0, 1.0, 1.0, 1.0],
        sunlight80: [1.0, 1.0, 1.0, 0.85],
        sunlight60: [1.0, 1.0, 1.0, 0.65],
        starHi: [1.0, 1.0, 1.0, 1.0],
        starMed: [1.0, 1.0, 1.0, 0.85],
        starLow: [1.0, 1.0, 1.0, 0.65],
        sensor: [1.0, 0.0, 0.0, 1.0],
        marker: [
          [0.2, 1.0, 1.0, 1.0],
          [1.0, 0.2, 1.0, 1.0],
          [1.0, 1.0, 0.2, 1.0],
          [0.2, 0.2, 1.0, 1.0],
          [0.2, 1.0, 0.2, 1.0],
          [1.0, 0.2, 0.2, 1.0],
          [0.5, 0.6, 1.0, 1.0],
          [0.6, 0.5, 1.0, 1.0],
          [1.0, 0.6, 0.5, 1.0],
          [1.0, 1.0, 1.0, 1.0],
          [0.2, 1.0, 1.0, 1.0],
          [1.0, 0.2, 1.0, 1.0],
          [1.0, 1.0, 0.2, 1.0],
          [0.2, 0.2, 1.0, 1.0],
          [0.2, 1.0, 0.2, 1.0],
          [1.0, 0.2, 0.2, 1.0],
          [0.5, 0.6, 1.0, 1.0],
          [0.6, 0.5, 1.0, 1.0],
        ],
        deselected: [1.0, 1.0, 1.0, 0],
        inFOV: [0.85, 0.5, 0.0, 1.0],
        inFOVAlt: [0.2, 0.4, 1.0, 1],
        radarData: [0.0, 1.0, 1.0, 1.0],
        radarDataMissile: [1.0, 0.0, 0.0, 1.0],
        radarDataSatellite: [0.0, 1.0, 0.0, 1.0],
        payload: [0.2, 1.0, 0.0, 0.5],
        rocketBody: [0.2, 0.4, 1.0, 1],
        debris: [0.5, 0.5, 0.5, 1],
        unknown: [0.5, 0.5, 0.5, 0.85],
        pink: [1.0, 0.0, 0.6, 1.0],
        trusat: [1.0, 0.0, 0.6, 1.0],
        analyst: [1.0, 1.0, 1.0, 0.8],
        missile: [1.0, 1.0, 0.0, 1.0],
        missileInview: [1.0, 0.0, 0.0, 1.0],
        transparent: [1.0, 1.0, 1.0, 0.1],
        satHi: [1.0, 1.0, 1.0, 1.0],
        satMed: [1.0, 1.0, 1.0, 0.8],
        satLow: [1.0, 1.0, 1.0, 0.6],
        sunlightInview: [0.85, 0.5, 0.0, 1.0],
        penumbral: [1.0, 1.0, 1.0, 0.3],
        umbral: [1.0, 1.0, 1.0, 0.1],
        // DEBUG Colors
        // sunlight = [0.2, 0.4, 1.0, 1]
        // penumbral = [0.5, 0.5, 0.5, 0.85]
        // umbral = [0.2, 1.0, 0.0, 0.5]
        gradientAmt: 0,
        // Gradients Must be Edited in color-scheme.js
        // apogeeGradient = [1.0 - settingsManager.colors.gradientAmt, settingsManager.colors.gradientAmt, 0.0, 1.0]
        // velGradient = [1.0 - settingsManager.colors.gradientAmt, settingsManager.colors.gradientAmt, 0.0, 1.0]
        satSmall: [0.2, 1.0, 0.0, 0.65],
        rcsXXSmall: [1.0, 0, 0, 0.6],
        rcsXSmall: [1.0, 0.56, 0.01, 0.6],
        rcsSmall: [1.0, 1.0, 0, 0.6],
        rcsMed: [0.2, 0.4, 1.0, 1],
        rcsLarge: [0, 1.0, 0, 0.6],
        rcsUnknown: [1.0, 1.0, 0, 0.6],
        ageNew: [0, 1.0, 0, 0.9],
        ageMed: [1.0, 1.0, 0.0, 0.9],
        ageOld: [1.0, 0.6, 0, 0.9],
        ageLost: [1.0, 0.0, 0, 0.9],
        lostobjects: [0.2, 1.0, 0.0, 0.65],
        satLEO: [0.2, 1.0, 0.0, 0.65],
        satGEO: [0.2, 1.0, 0.0, 0.65],
        inGroup: [1.0, 0.0, 0.0, 1.0],
        countryPRC: [1.0, 0, 0, 0.6],
        countryUS: [0.2, 0.4, 1.0, 1],
        countryCIS: [1.0, 1.0, 1.0, 1.0],
        countryOther: [0, 1.0, 0, 0.6],
        densityPayload: [0.15, 0.7, 0.8, 1.0],
        densityHi: [1, 0, 0, 1],
        densityMed: [1, 0.4, 0, 1],
        densityLow: [1, 1, 0, 0.9],
        densityOther: [0.8, 0.8, 0.8, 0.3],
      };
      try {
        localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
      } catch {
        console.warn('Settings Manager: Unable to save color settings - localStorage issue!');
      }
    }

    // //////////////////////////////////////////////////////////////////////////
    // Orbit Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.orbitSegments = 255;

    settingsManager.orbitSelectColor = [1.0, 0.0, 0.0, 0.9];
    settingsManager.orbitSelectColor2 = [0.0, 0.4, 1.0, 0.9];
    settingsManager.orbitHoverColor = [1.0, 1.0, 0.0, 0.9];
    settingsManager.orbitGroupAlpha = 0.5; // Transparency when a group of satellites is selected


    // settingsManager.orbitHoverColor = [0.5, 0.5, 1.0, 1.0]
    settingsManager.orbitInViewColor = [1.0, 1.0, 1.0, 0.7]; // WHITE
    settingsManager.orbitPlanetariumColor = [1.0, 1.0, 1.0, 0.2]; // Transparent White


    // settingsManager.orbitInViewColor = [1.0, 1.0, 0.0, 1.0] // Applies to Planetarium View
    //settingsManager.orbitGroupColor = [0.3, 0.5, 1.0, 0.4]
    settingsManager.orbitGroupColor = [1.0, 1.0, 0.0, 0.7];

    // //////////////////////////////////////////////////////////////////////////
    // UI Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.nextNPassesCount = 5;

    settingsManager.minimumSearchCharacters = 2; // Searches after 3 characters typed
    settingsManager.searchLimit = 150;

    settingsManager.nameOfSpecialSats = 'Special Sats';

    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    settingsManager.cameraDecayFactor = 5; // Reduce this give momentum to camera changes

    settingsManager.offsetCameraModeX = 15000;
    settingsManager.offsetCameraModeZ = -6000;

    settingsManager.fpsForwardSpeed = 3;
    settingsManager.fpsSideSpeed = 3;
    settingsManager.fpsVertSpeed = 3;
    settingsManager.fpsPitchRate = 0.02;
    settingsManager.fpsYawRate = 0.02;
    settingsManager.fpsRotateRate = 0.02;

    settingsManager.fitTleSteps = 3; // Increasing this will kill performance

    settingsManager.gpsElevationMask = 15;
    settingsManager.daysUntilObjectLost = 60;

    settingsManager.mobileMaxLabels = 100;
    settingsManager.desktopMaxLabels = 20000;
    settingsManager.maxLabels = 20000;

    settingsManager.isAlwaysHidePropRate = false;

    // //////////////////////////////////////////////////////////////////////////
    // Advanced Settings Below This Point
    // Feel free to change these, but they could break something
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.modelsOnSatelliteViewOverride = false;
    settingsManager.meshOverride = null;
    settingsManager.meshRotation = {
      x: 0,
      y: 0,
      z: 0,
    };

    // Frames Per Second Limiter
    settingsManager.minimumDrawDt = 0.0; // 20 FPS // 60 FPS = 0.01667

    settingsManager.camDistBuffer = 75;
    settingsManager.zNear = 1.0;
    settingsManager.zFar = 450000.0;

    // //////////////////////////////////////////////////////////////////////////
    // Load Overrides
    // //////////////////////////////////////////////////////////////////////////
    settingsManager = { ...settingsManager, ...settingsOverride, ...window.settingsOverride };
    const queryStr = window.location.search.substring(1);
    const params = queryStr.split('&');
    const plugins = settingsManager.plugins;
    for (let i = 0; i < params.length; i++) {
      const key = params[i].split('=')[0];
      const val = params[i].split('=')[1];
      if (key === 'settingsManagerOverride') {
        const overrides = JSON.parse(decodeURIComponent(val));
        Object.keys(overrides.plugins)
          .filter((_key) => _key in plugins)
          // eslint-disable-next-line no-loop-func
          .forEach((_key) => {
            if (typeof overrides.plugins[_key] == 'undefined')
              return;
            settingsManager.plugins[_key] = overrides.plugins[_key];
          });
      }
    }

    // //////////////////////////////////////////////////////////////////////////
    // Defaults that should never be changed
    // //////////////////////////////////////////////////////////////////////////
    // Nominal max size - overwritten by settingsManager.satShader.maxAllowedSize
    settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize * 2;

    settingsManager.fieldOfView = 0.6;

    settingsManager.isShowNextPass = false;

    // Determines if the Loading is complete
    settingsManager.cruncherReady = false;

    settingsManager.lkVerify = Date.now();

    // If No UI Reduce Overhead
    if (settingsManager.disableUI) {
      // LEAVE AT LEAST ONE TO PREVENT ERRORS
      settingsManager.maxFieldOfViewMarkers = 1;
      settingsManager.maxMissiles = 1;
      settingsManager.maxAnalystSats = 1;
    }

    settingsManager.legendMenuOpen = false;

    settingsManager.limitSats = '';
    settingsManager.geolocation = {};
    settingsManager.geolocationUsed = false;
    settingsManager.mapWidth = 800;
    settingsManager.mapHeight = 600;
    settingsManager.currentLegend = 'default';
    settingsManager.queuedScreenshot = false;

    settingsManager.isResizing = false;
    if (typeof settingsManager.isOfficialWebsite == 'undefined') {
      settingsManager.isOfficialWebsite = false;
    }

    settingsManager.vertShadersSize = 12;
    settingsManager.isEditTime = false;
    settingsManager.isPropRateChange = false;
    settingsManager.isOnlyFOVChecked = false;
    settingsManager.isBottomMenuOpen = false;
    settingsManager.isDragging = false;

    settingsManager.isDemoModeOn = false;
    settingsManager.demoModeInterval = 3000; // in ms (3 second default)
    settingsManager.isSatLabelModeOn = true;
    settingsManager.satLabelInterval = 100; //  in ms (0.5 second default)

    settingsManager.isSatOverflyModeOn = false;
    settingsManager.isFOVBubbleModeOn = false;

    settingsManager.isMapUpdateOverride = false;
    settingsManager.lastMapUpdateTime = 0;

    settingsManager.lastSearchResults = [];

    // Export settingsManager to everyone else
    window.settingsManager = settingsManager;

    // This is an initial parse of the GET variables
    // to determine critical settings. Other variables are checked later during
    // satSet.init
    if (!settingsManager.disableUI) {
      (function initParseFromGETVariables() {
        for (const param of params) {
          const key = param.split('=')[0];
          switch (key) {
            case 'debug':
              settingsManager.plugins.debug = true;
              break;
            case 'nomarkers':
              settingsManager.maxFieldOfViewMarkers = 1;
              break;
            case 'noorbits':
              settingsManager.isDrawOrbits = false;
              break;
            case 'console':
              settingsManager.isEnableConsole = true;
              break;
            case 'radarData':
              settingsManager.isEnableRadarData = true;
              settingsManager.maxRadarData = 150000;
              break;
            case 'smallImages':
              settingsManager.smallImages = true;
              break;
            case 'lowperf':
              settingsManager.lowPerf = true;
              settingsManager.isDrawMilkyWay = false;
              settingsManager.isDrawLess = true;
              settingsManager.zFar = 250000.0;
              settingsManager.noMeshManager = true;
              settingsManager.maxFieldOfViewMarkers = 1;
              settingsManager.smallImages = true;
              break;
            case 'hires':
              settingsManager.earthNumLatSegs = 128;
              settingsManager.earthNumLonSegs = 128;
              break;
            case 'nostars':
              settingsManager.noStars = true;
              settingsManager.isDrawMilkyWay = false;
              break;
            case 'draw-less':
              settingsManager.isDrawMilkyWay = false;
              settingsManager.isDrawLess = true;
              settingsManager.zFar = 250000.0;
              settingsManager.noMeshManager = true;
              break;
            case 'draw-more':
              settingsManager.isDrawLess = false;
              settingsManager.noMeshManager = false;
              settingsManager.smallImages = false;
              settingsManager.isDrawMilkyWay = true;
              break;
            case 'vec':
              settingsManager.vectorImages = true;
              break;
            case 'political':
              settingsManager.politicalImages = true;
              break;
            case 'retro':
              settingsManager.retro = true;
              settingsManager.tleSource = 'tle/retro.json';
              break;
            case 'offline':
              settingsManager.offline = true;
              break;
            case 'cpo':
              settingsManager.copyrightOveride = true;
              break;
            case 'logo':
              settingsManager.isShowLogo = true;
              break;
            case 'noPropRate':
              settingsManager.isAlwaysHidePropRate = true;
              break;
            default:
          }
        }
      })();
    }

    // Disable resource intense plugins if lowPerf is enabled
    if (settingsManager.lowPerf) {
      settingsManager.plugins.sensorFov = false;
      settingsManager.plugins.sensorSurv = false;
      settingsManager.plugins.satelliteFov = false;
    }

    // Load the previously saved map
    if (settingsManager.isLoadLastMap && !settingsManager.isDrawLess) {
      let lastMap;
      try {
        lastMap = localStorage.getItem('lastMap');
      } catch {
        lastMap = null;
        console.warn('Settings Manager: localStorage not available!');
      }
      switch (lastMap) {
        case 'blue':
          settingsManager.blueImages = true;
          break;
        case 'nasa':
          settingsManager.nasaImages = true;
          break;
        case 'low':
          settingsManager.lowresImages = true;
          break;
        case 'trusat':
          settingsManager.trusatImages = true;
          break;
        case 'high':
          settingsManager.hiresImages = true;
          break;
        case 'high-nc':
          settingsManager.hiresNoCloudsImages = true;
          break;
        case 'vec':
          settingsManager.vectorImages = true;
          break;
        case 'political':
          settingsManager.politicalImages = true;
          break;
        // file deepcode ignore DuplicateCaseBody: The default image could change in the future
        default:
          settingsManager.lowresImages = true;
          break;
      }
    }

    // Make sure there is some map loaded!
    if (!settingsManager.smallImages &&
      !settingsManager.nasaImages &&
      !settingsManager.blueImages &&
      !settingsManager.lowresImages &&
      !settingsManager.hiresImages &&
      !settingsManager.hiresNoCloudsImages &&
      !settingsManager.vectorImages) {
      settingsManager.lowresImages = true;
    }

    // Expose these to the console
    window.settingsManager = settingsManager;
    if (global)
      (<any>global).settingsManager = settingsManager;
  },
  isDisableAsciiCatalog: false,
  settingsManager: null,
  isShowAgencies: null,
  isShowGeoSats: false,
  isShowHeoSats: false,
  isShowMeoSats: false,
  isShowLeoSats: false,
  maxOribtsDisplayedDesktopAll: null,
  orbitGroupAlpha: 0,
  loopTimeMachine: null,
  isDisableSelectSat: null,
  timeMachineLongToast: false,
  timeMachineString: function (_yearStr: string) {
    throw new Error('Function not implementedyet...');
  },
  lastInteractionTime: 0,
  isDisableExtraCatalog: false,
  orbitSegments: 0,
  lastGamepadMovement: 0,
  isLimitedGamepadControls: null,
  isEPFL: false,
  isUseNullForBadGetEl: null,
  isDisableUrlBar: null,
  meshListOverride: [],
  isDebrisOnly: false,
  isDisableCss: null,
  isAllowRightClick: null,
  onLoadCb: null,
  isDrawConstellationBoundaries: null,
  isDrawNasaConstellations: null,
  isDrawSun: null,
  isDrawInCoverageLines: false,
  isDrawOrbits: null,
  isEciOnHover: false,
  isDrawMilkyWay: false,
  isDragging: false,
  isOrbitCruncherInEcf: false,
  lastSearch: null,
  isGroupOverlayDisabled: null,
  nearZoomLevel: 0,
  isPreventColorboxClose: false,
  isDayNightToggle: false,
  isUseHigherFOVonMobile: null,
  lostSatStr: '',
  maxOribtsDisplayed: null,
  isOrbitOverlayVisible: false,
  isShowSatNameNotOrbit: null,
  isShowNextPass: false,
  dotsOnScreen: 0,
  versionDate: '',
  versionNumber: '',
  geolocation: null,
  trusatMode: null,
  isExtraSatellitesAdded: null,
  altMsgNum: null,
  altLoadMsgs: false,
  autoPanSpeed: {
    x: 0,
    y: 0,
  },
  autoRotateSpeed: 0,
  blueImages: false,
  camDistBuffer: 0,
  cameraDecayFactor: 0,
  cameraMovementSpeed: 0,
  cameraMovementSpeedMin: 0,
  copyrightOveride: false,
  cruncherReady: false,
  currentLegend: '',
  daysUntilObjectLost: 0,
  demoModeInterval: 0,
  desktopMaxLabels: 0,
  desktopMinimumWidth: 0,
  disableCameraControls: false,
  disableDefaultContextMenu: false,
  disableNormalEvents: false,
  disableWindowScroll: false,
  disableWindowTouchMove: false,
  disableZoomControls: false,
  earthNumLatSegs: 0,
  earthNumLonSegs: 0,
  enableConstantSelectedSatRedraw: false,
  enableHoverOrbits: false,
  enableHoverOverlay: false,
  enableLimitedUI: false,
  fieldOfViewMax: 0,
  fieldOfViewMin: 0,
  fitTleSteps: 0,
  fpsForwardSpeed: 0,
  fpsPitchRate: 0,
  fpsRotateRate: 0,
  fpsSideSpeed: 0,
  fpsThrottle1: 0,
  fpsThrottle2: 0,
  fpsVertSpeed: 0,
  fpsYawRate: 0,
  geolocationUsed: false,
  gpsElevationMask: 0,
  gpujsMode: '',
  hiresImages: false,
  hiresNoCloudsImages: false,
  hoverColor: [0, 0, 0, 0],
  installDirectory: '',
  isAlwaysHidePropRate: false,
  isAutoResizeCanvas: false,
  isBlackEarth: false,
  isBottomMenuOpen: false,
  isDemoModeOn: false,
  isDisableControlSites: false,
  isDisableLaunchSites: false,
  isDisableSensors: false,
  isDrawLess: false,
  isEnableConsole: false,
  isEnableGsCatalog: false,
  isEnableRadarData: false,
  isLoadLastMap: false,
  isOfficialWebsite: false,
  isOnlyFOVChecked: false,
  isPropRateChange: false,
  isResizing: false,
  isSatLabelModeOn: false,
  isShowLogo: false,
  isUseDebrisCatalog: false,
  isZoomStopsRotation: false,
  isZoomStopsSnappedOnSat: false,
  lastSearchResults: [],
  legendMenuOpen: false,
  limitSats: '',
  lineScanMinEl: 0,
  lineScanSpeedRadar: 0,
  lineScanSpeedSat: 0,
  lkVerify: 0,
  lowPerf: false,
  lowresImages: false,
  maxAnalystSats: 0,
  maxFieldOfViewMarkers: 0,
  maxLabels: 0,
  maxMissiles: 0,
  maxOrbitsDisplayedMobile: 0,
  maxOribtsDisplayedDesktop: 0,
  maxRadarData: 0,
  maxZoomDistance: 0,
  meshOverride: null,
  meshRotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  minimumDrawDt: 0,
  minimumSearchCharacters: 0,
  minZoomDistance: 0,
  mobileMaxLabels: 0,
  modelsOnSatelliteViewOverride: false,
  nameOfSpecialSats: '',
  nasaImages: false,
  nextNPassesCount: 0,
  noMeshManager: false,
  noStars: false,
  offline: false,
  offsetCameraModeX: 0,
  offsetCameraModeZ: 0,
  orbitFadeFactor: 0,
  orbitGroupColor: [0, 0, 0, 0],
  orbitHoverColor: [0, 0, 0, 0],
  orbitInViewColor: [0, 0, 0, 0],
  orbitPlanetariumColor: [0, 0, 0, 0],
  orbitSelectColor: [0, 0, 0, 0],
  orbitSelectColor2: [0, 0, 0, 0],
  politicalImages: false,
  pTime: [],
  queuedScreenshot: false,
  reColorMinimumTime: 0,
  retro: false,
  satLabelInterval: 0,
  satShader: null,
  searchLimit: 0,
  selectedColor: [0, 0, 0, 0],
  setCurrentColorScheme: function (_val: any): void {
    throw new Error('Function not implemented yet...');
  },
  showOrbitThroughEarth: false,
  smallImages: false,
  startWithFocus: false,
  startWithOrbitsDisplayed: false,
  tleSource: '',
  trusatImages: false,
  unofficial: false,
  updateHoverDelayLimitBig: 0,
  updateHoverDelayLimitSmall: 0,
  vectorImages: false,
  vertShadersSize: 0,
  videoBitsPerSecond: 0,
  zFar: 0,
  zNear: 0,
  zoomSpeed: 0,
  isDrawTrailingOrbits: false,
  isEnableExtendedCatalog: false,
  selectedColorFallback: [0, 0, 0, 0],
};
