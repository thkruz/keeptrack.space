/**
// /////////////////////////////////////////////////////////////////////////////

Copyright (C) 2016-2022 Theodore Kruczek
Copyright (C) 2020 Heather Kruczek

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

// /////////////////////////////////////////////////////////////////////////////
*/

/** settingsManager is a global object that manages universally accessible parameters*/
let settingsManager = window.settingsManager; // This declaration is to ensure proper type checking

// Actual Setup
settingsManager = {
  // Classification can be "Unclassified", "Secret", "Top Secret", "Top Secret//SCI"
  classificationStr: '',
  // This controls which of the built-in plugins are loaded
  plugins: {
    debug: true,
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
    satChanges: true,
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
  },
  colors: {
    transparent: null,
  },
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
  init: () => { // NOSONAR
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
          if (typeof process !== 'undefined') {
            settingsManager.installDirectory = 'http://127.0.0.1:8080/';
          } else {
            // Comment Out the Next Two Lines if you are testing on a local server
            // and have the keeptrack files installed in a subdirectory
            settingsManager.installDirectory = '/';
            settingsManager.offline = true;
            settingsManager.breakTheLaw = true;
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
          settingsManager.breakTheLaw = true;
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

    // This needed to be increased to support large number of CSpOC sensors
    settingsManager.maxFieldOfViewMarkers = 500000;
    settingsManager.maxMissiles = 500;
    settingsManager.maxAnalystSats = 30000;

    // Enable the debris only catalog
    settingsManager.isUseDebrisCatalog = false;

    // Dont load the sensors
    settingsManager.isDisableSensors = false;

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
    // Disable normal browser right click menu
    settingsManager.disableDefaultContextMenu = true;
    // Disable Scrolling the Window Object
    settingsManager.disableWindowScroll = true;
    // Disable Zoom Keyboard Keys
    settingsManager.disableZoomControls = true;
    // Disable Touch Move Causing Drag Errors on Desktop
    settingsManager.disableWindowTouchMove = true;
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

    settingsManager.videoBitsPerSecond = 30000000; // 10.0Mbps

    // settingsManager.earthPanningBufferDistance = 100 // Needs work in main.js

    // Use these to default smallest resolution maps and limited "extras" like
    // the sun. Really useful on small screens and for faster
    // loading times
    // settingsManager.isDrawLess = true;
    // settingsManager.smallImages = true;

    // //////////////////////////////////////////////////////////////////////////
    // Mobile Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.desktopMinimumWidth = 1300;
    settingsManager.isMobileModeEnabled = false;
    if (window.innerWidth <= settingsManager.desktopMinimumWidth) {
      settingsManager.disableWindowTouchMove = false;
      settingsManager.isMobileModeEnabled = true;
      settingsManager.maxFieldOfViewMarkers = 20000;
      settingsManager.isDrawLess = true;
      settingsManager.noMeshManager = true;
      settingsManager.camDistBuffer = 100;
    }

    // //////////////////////////////////////////////////////////////////////////
    // Shader Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.showOrbitThroughEarth = false;

    settingsManager.earthNumLatSegs = 128;
    settingsManager.earthNumLonSegs = 128;

    settingsManager.satShader = {};
    settingsManager.satShader.largeObjectMinZoom = 0.37;
    settingsManager.satShader.largeObjectMaxZoom = 0.58;
    settingsManager.satShader.minSize = 5.5;
    settingsManager.satShader.minSizePlanetarium = 20.0;
    settingsManager.satShader.maxSizePlanetarium = 20.0;
    // Max size dynamically changes based on zoom level
    settingsManager.satShader.maxAllowedSize = 35.0;
    settingsManager.satShader.isUseDynamicSizing = false;
    settingsManager.satShader.dynamicSizeScalar = 1.0;
    settingsManager.satShader.starSize = '20.0'; // Has to be a string
    // NOTE: Use floats not integers because some settings get sent to graphics card
    // Must be a string for GPU to read.
    settingsManager.satShader.distanceBeforeGrow = '14000.0'; // Km allowed before grow
    // Used for Satellites
    settingsManager.satShader.blurFactor1 = '0.53';
    settingsManager.satShader.blurFactor2 = '0.5';
    // Used for Stars
    settingsManager.satShader.blurFactor3 = '0.43';
    settingsManager.satShader.blurFactor4 = '0.25';

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

    settingsManager.reColorMinimumTime = 1000;
    settingsManager.colors = {};
    try {
      settingsManager.colors = JSON.parse(localStorage.getItem('settingsManager-colors'));
    } catch {
      console.warn('Settings Manager: Unable to get color settings - localStorage issue!');
    }
    if (settingsManager.colors == null || settingsManager.colors.length === 0 || settingsManager.colors.version !== '1.0.4') {
      settingsManager.colors = {};
      settingsManager.colors.version = '1.0.4';
      settingsManager.colors.facility = [0.64, 0.0, 0.64, 1.0];
      settingsManager.colors.sunlight100 = [1.0, 1.0, 1.0, 1.0];
      settingsManager.colors.sunlight80 = [1.0, 1.0, 1.0, 0.85];
      settingsManager.colors.sunlight60 = [1.0, 1.0, 1.0, 0.65];
      settingsManager.colors.starHi = [1.0, 1.0, 1.0, 1.0];
      settingsManager.colors.starMed = [1.0, 1.0, 1.0, 0.85];
      settingsManager.colors.starLow = [1.0, 1.0, 1.0, 0.65];
      settingsManager.colors.sensor = [1.0, 0.0, 0.0, 1.0];
      settingsManager.colors.marker = [
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
      ];
      settingsManager.colors.deselected = [1.0, 1.0, 1.0, 0];
      settingsManager.colors.inView = [0.85, 0.5, 0.0, 1.0];
      settingsManager.colors.inViewAlt = [0.2, 0.4, 1.0, 1];
      settingsManager.colors.radarData = [0.0, 1.0, 1.0, 1.0];
      settingsManager.colors.radarDataMissile = [1.0, 0.0, 0.0, 1.0];
      settingsManager.colors.radarDataSatellite = [0.0, 1.0, 0.0, 1.0];
      settingsManager.colors.payload = [0.2, 1.0, 0.0, 0.5];
      settingsManager.colors.rocketBody = [0.2, 0.4, 1.0, 1];
      settingsManager.colors.debris = [0.5, 0.5, 0.5, 1];
      settingsManager.colors.unknown = [0.5, 0.5, 0.5, 0.85];
      settingsManager.colors.trusat = [1.0, 0.0, 0.6, 1.0];
      settingsManager.colors.analyst = [1.0, 1.0, 1.0, 0.8];
      settingsManager.colors.missile = [1.0, 1.0, 0.0, 1.0];
      settingsManager.colors.missileInview = [1.0, 0.0, 0.0, 1.0];
      settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0.1];
      settingsManager.colors.satHi = [1.0, 1.0, 1.0, 1.0];
      settingsManager.colors.satMed = [1.0, 1.0, 1.0, 0.8];
      settingsManager.colors.satLow = [1.0, 1.0, 1.0, 0.6];
      settingsManager.colors.sunlightInview = [0.85, 0.5, 0.0, 1.0];
      settingsManager.colors.penumbral = [1.0, 1.0, 1.0, 0.3];
      settingsManager.colors.umbral = [1.0, 1.0, 1.0, 0.1];
      // DEBUG Colors
      // settingsManager.colors.sunlight = [0.2, 0.4, 1.0, 1]
      // settingsManager.colors.penumbral = [0.5, 0.5, 0.5, 0.85]
      // settingsManager.colors.umbral = [0.2, 1.0, 0.0, 0.5]

      settingsManager.colors.gradientAmt = 0;
      // Gradients Must be Edited in color-scheme.js
      // settingsManager.colors.apogeeGradient = [1.0 - settingsManager.colors.gradientAmt, settingsManager.colors.gradientAmt, 0.0, 1.0]
      // settingsManager.colors.velGradient = [1.0 - settingsManager.colors.gradientAmt, settingsManager.colors.gradientAmt, 0.0, 1.0]
      settingsManager.colors.satSmall = [0.2, 1.0, 0.0, 0.65];
      settingsManager.colors.rcsSmall = [1.0, 0, 0, 0.6];
      settingsManager.colors.rcsMed = [0.2, 0.4, 1.0, 1];
      settingsManager.colors.rcsLarge = [0, 1.0, 0, 0.6];
      settingsManager.colors.rcsUnknown = [1.0, 1.0, 0, 0.6];
      settingsManager.colors.ageNew = [0, 1.0, 0, 0.9];
      settingsManager.colors.ageMed = [1.0, 1.0, 0.0, 0.9];
      settingsManager.colors.ageOld = [1.0, 0.6, 0, 0.9];
      settingsManager.colors.ageLost = [1.0, 0.0, 0, 0.9];
      settingsManager.colors.lostobjects = [0.2, 1.0, 0.0, 0.65];
      settingsManager.colors.satLEO = [0.2, 1.0, 0.0, 0.65];
      settingsManager.colors.satGEO = [0.2, 1.0, 0.0, 0.65];
      settingsManager.colors.inGroup = [1.0, 0.0, 0.0, 1.0];
      settingsManager.colors.countryPRC = [1.0, 0, 0, 0.6];
      settingsManager.colors.countryUS = [0.2, 0.4, 1.0, 1];
      settingsManager.colors.countryCIS = [1.0, 1.0, 1.0, 1.0];
      settingsManager.colors.countryOther = [0, 1.0, 0, 0.6];
      try {
        localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
      } catch {
        console.warn('Settings Manager: Unable to save color settings - localStorage issue!');
      }
    }

    // //////////////////////////////////////////////////////////////////////////
    // Orbit Color Settings
    // //////////////////////////////////////////////////////////////////////////
    settingsManager.orbitSelectColor = [1.0, 0.0, 0.0, 0.9];
    settingsManager.orbitHoverColor = [1.0, 1.0, 0.0, 0.9];
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
    settingsManager = { ...settingsManager, ...window.settingsManagerOverride };
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
            if (typeof overrides.plugins[_key] == 'undefined') return;
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
    settingsManager.isForceColorScheme = false;

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
              break;
            case 'draw-less':
              settingsManager.isDrawLess = true;
              settingsManager.zFar = 250000.0;
              settingsManager.noMeshManager = true;
              break;
            case 'draw-more':
              settingsManager.isDrawLess = false;
              settingsManager.noMeshManager = false;
              settingsManager.smallImages = false;
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
    if (
      !settingsManager.smallImages &&
      !settingsManager.nasaImages &&
      !settingsManager.blueImages &&
      !settingsManager.lowresImages &&
      !settingsManager.hiresImages &&
      !settingsManager.hiresNoCloudsImages &&
      !settingsManager.vectorImages
    ) {
      settingsManager.lowresImages = true;
    }
  },
};

settingsManager.init();

// Expose these to the console
window.settingsManager = settingsManager;
