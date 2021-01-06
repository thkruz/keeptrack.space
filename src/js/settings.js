/**
// /////////////////////////////////////////////////////////////////////////////

Copyright (C) 2016-2020 Theodore Kruczek
Copyright (C) 2020 Heather Kruczek

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

// /////////////////////////////////////////////////////////////////////////////
*/

/*global gremlins, randomizer*/
import * as $ from 'jquery';
import { RADIUS_OF_EARTH } from '@app/js/constants.js';

// Settings Manager Setup
let settingsManager = {};
{
  //  Version Control
  settingsManager.versionNumber = '3.0.5';
  settingsManager.versionDate = 'December 28, 2020';

  // Install Folder Settings
  {
    switch (window.location.host) {
      case 'keeptrack.space':
      case 'www.keeptrack.space':
        settingsManager.installDirectory = '/';
        settingsManager.isOfficialWebsite = true;
        break;
      case 'localhost':
      case '10.0.0.34':
        // Comment Out the Next Two Lines if you are testing on a local server
        // and have the keeptrack files installed in a subdirectory
        settingsManager.installDirectory = '/';
        settingsManager.offline = true;
        settingsManager.breakTheLaw = true;
        break;
      case 'thkruz.github.io':
      case 'www.thkruz.github.io':
        settingsManager.installDirectory = '/keeptrack.space/';
        break;
      case '':
        settingsManager.offline = true;
        settingsManager.breakTheLaw = true;
        settingsManager.installDirectory = './';
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

  settingsManager.maxFieldOfViewMarkers = 105000;
  settingsManager.maxMissiles = 500;
  settingsManager.maxAnalystSats = 256;

  // Enable/Disable gs.json catalog Information
  settingsManager.isEnableGsCatalog = true;
  // Enable/Disable radarData Information
  settingsManager.isEnableRadarData = false;
  settingsManager.maxRadarData = 1; // 70000;
  // Adjust to change camera speed of auto rotate around earth
  settingsManager.autoRotateSpeed = 1.0 * 0.000075;
  // Disable main user interface. Currently an all or nothing package.
  settingsManager.disableUI = false;
  // Currently only disables panning. In the future it will disable all camera
  // movement
  settingsManager.disableCameraControls = false;
  // Disable normal browser events from keyboard/mouse
  settingsManager.disableNormalEvents = false;
  // Disable Scrolling the Window Object
  settingsManager.disableWindowScroll = true;
  // Disable Zoom Keyboard Keys
  settingsManager.disableZoomControls = true;
  // Disable Touch Move Causing Drag Errors on Desktop
  settingsManager.disableWindowTouchMove = true;
  // Enable limited UI features
  settingsManager.enableLimitedUI = false;
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

  // How many draw calls to wait before updating orbit overlay if last draw
  // time was greater than 20ms
  settingsManager.updateHoverDelayLimitSmall = 5;

  // How many draw calls to wait before updating orbit overlay if last draw
  // time was greater than 50ms
  settingsManager.updateHoverDelayLimitBig = 10;

  settingsManager.fieldOfViewMin = 0.04; // 4 Degrees (I think)
  settingsManager.fieldOfViewMax = 1.2; // 120 Degrees (I think)

  settingsManager.minZoomDistance = 6800;
  settingsManager.maxZoomDistance = 120000;

  // Minimum fps or sun/moon/atmosphere are skipped
  settingsManager.fpsThrottle1 = 3;
  // Minimum fps or satellite velocities are ignored
  settingsManager.fpsThrottle2 = 40;

  settingsManager.timeMachineDelay = 5000;

  // settingsManager.earthPanningBufferDistance = 100 // Needs work in main.js

  // Use to Override TLE Settings
  // settingsManager.tleSource = settingsManager.installDirectory + 'tle/TLEdebris.json'

  // Use these to default smallest resolution maps and limited "extras" like
  // the atmosphere and sun. Really useful on small screens and for faster
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
    // settingsManager.smallImages = true;
    settingsManager.isDrawLess = true;
    settingsManager.noMeshManager = true;
    settingsManager.camDistBuffer = 100;
  }

  // //////////////////////////////////////////////////////////////////////////
  // Shader Settings
  // //////////////////////////////////////////////////////////////////////////
  settingsManager.showOrbitThroughEarth = false;

  settingsManager.earthNumLatSegs = 64;
  settingsManager.earthNumLonSegs = 64;
  settingsManager.atmospherelatSegs = 64;
  settingsManager.atmospherelonSegs = 64;

  settingsManager.atmosphereSize = RADIUS_OF_EARTH + 250;
  settingsManager.atmosphereColor = 'vec3(0.35,0.8,1.0)';

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
  settingsManager.satShader.blurFactor4 = '0.2';

  // //////////////////////////////////////////////////////////////////////////
  // Embed Overrides - FOR TESTING ONLY
  // //////////////////////////////////////////////////////////////////////////

  let pageName = location.href.split('/').slice(-1);
  pageName = pageName[0].split('?').slice(0);

  if (pageName[0] == 'embed.html') {
    settingsManager.disableUI = true;
    settingsManager.enableLimitedUI = true;
    settingsManager.startWithOrbitsDisplayed = true;
    settingsManager.isAutoResizeCanvas = true;
    settingsManager.enableHoverOverlay = true;
    settingsManager.enableHoverOrbits = true;
    settingsManager.isDrawLess = true;
    settingsManager.smallImages = true;
    settingsManager.hiresNoCloudsImages = false;
    settingsManager.tleSource = 'tle/TLEdebris.json';
    settingsManager.updateHoverDelayLimitSmall = 25;
    settingsManager.updateHoverDelayLimitBig = 45;
  }

  // //////////////////////////////////////////////////////////////////////////
  // GPU Powered Math from gpu.js
  // //////////////////////////////////////////////////////////////////////////
  settingsManager.gpujsMode = 'webgl';
  // settingsManager.gpujsMode = 'dev';
  // settingsManager.gpujsMode = 'cpu';

  // //////////////////////////////////////////////////////////////////////////
  // Map settings
  // //////////////////////////////////////////////////////////////////////////

  // settingsManager.smallImages = false;
  settingsManager.nasaImages = false;
  settingsManager.blueImages = false;
  settingsManager.lowresImages = false;
  settingsManager.hiresImages = false;
  settingsManager.hiresNoCloudsImages = false;
  settingsManager.vectorImages = false;
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
  settingsManager.colors = JSON.parse(localStorage.getItem('settingsManager-colors'));
  if (settingsManager.colors == null || settingsManager.colors.version !== '1.0.3') {
    settingsManager.colors = {};
    settingsManager.colors.version = '1.0.3';
    settingsManager.colors.facility = [0.64, 0.0, 0.64, 1.0];
    settingsManager.colors.starHi = [1.0, 1.0, 1.0, 1.0];
    settingsManager.colors.starMed = [1.0, 1.0, 1.0, 0.35];
    settingsManager.colors.starLow = [1.0, 1.0, 1.0, 0.15];
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
    settingsManager.colors.inview = [0.85, 0.5, 0.0, 1.0];
    settingsManager.colors.inviewAlt = [0.2, 0.4, 1.0, 1];
    settingsManager.colors.radarData = [0.0, 1.0, 1.0, 1.0];
    settingsManager.colors.radarDataMissile = [1.0, 0.0, 0.0, 1.0];
    settingsManager.colors.radarDataSatellite = [0.0, 1.0, 0.0, 1.0];
    settingsManager.colors.payload = [0.2, 1.0, 0.0, 0.5];
    settingsManager.colors.rocketBody = [0.2, 0.4, 1.0, 1];
    if (settingsManager.trusatOnly) {
      settingsManager.colors.debris = [0.9, 0.9, 0.9, 1];
    } else {
      settingsManager.colors.debris = [0.5, 0.5, 0.5, 1];
    }
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
    localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
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
  settingsManager.orbitGroupColor = [0.3, 1.0, 1.0, 0.7];

  // //////////////////////////////////////////////////////////////////////////
  // UI Settings
  // //////////////////////////////////////////////////////////////////////////
  settingsManager.nextNPassesCount = 5;

  settingsManager.minimumSearchCharacters = 2; // Searches after 3 characters typed
  settingsManager.searchLimit = 400;

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

  // Information Overlay Color Settings
  settingsManager.redTheme = false;
  settingsManager.themes = {};
  settingsManager.isThemesNeeded = false;
  settingsManager.themes.currentTheme = 'Blue';
  settingsManager.themes.retheme = function () {
    if (!settingsManager.isThemesNeeded) return;
    if (settingsManager.themes.currentTheme === 'Blue') settingsManager.themes.blueTheme(true);
    if (settingsManager.themes.currentTheme === 'Red') settingsManager.themes.redTheme(true);
  };
  settingsManager.themes.redTheme = function (isForce) {
    if (settingsManager.retro) return;
    if (settingsManager.themes.currentTheme === 'Red' && !isForce) return;
    document.getElementById('nav-wrapper').classList.remove('light-blue');
    document.getElementById('nav-wrapper').classList.add('red');
    document.getElementById('nav-footer').classList.add('red');
    document.getElementById('nav-footer').classList.add('darken-3');
    $('#bottom-menu').css('background', 'rgb(165, 0, 0)');
    $('.bmenu-item').css('border-right-color', 'orangered');
    $('#menu-info-overlay ').css('border-left-color', 'orangered');
    $('.side-menu').css('background', 'LightCoral');
    $('.side-menu').css('border-color', 'DarkRed');
    $('#sat-infobox').css('background', 'LightCoral');
    $('#sat-infobox').css('border-color', 'DarkRed');
    $('#legend-hover-menu').css('background', 'LightCoral');
    $('#bottom-icons').css('background', 'DarkRed');
    $('#legend-hover-menu').css('border-color', 'DarkRed');
    $('#colorbox').css('border', '10px solid DarkRed');
    // $('#search-results').css('cssText', 'background: LightCoral !important')
    // $('#search-results').css('border-color', 'DarkRed')
    // $('#search-result:hover').css('background', 'DarkRed')
    $('#nav-footer-toggle').css('background', 'DarkRed');
    $('.badge').css('cssText', 'color: DarkRed !important');
    $('.search-hilight').css('color', 'DarkRed');
    $('.btn-ui').css('background-color', 'red');
    settingsManager.themes.currentTheme = 'Red';
  };
  settingsManager.themes.redThemeSearch = function (isForce) {
    if (settingsManager.retro) return;
    if (settingsManager.themes.currentTheme !== 'Red' && !isForce) return;
    $('#search-results').css('background', 'LightCoral');
    $('#search-result:hover').css('background', 'DarkRed');
    $('.search-hilight').css('color', 'DarkRed');
  };
  settingsManager.themes.blueTheme = function (isForce) {
    if (settingsManager.retro) return;
    if (settingsManager.themes.currentTheme === 'Blue' && !isForce) return;
    document.getElementById('nav-wrapper').classList.remove('red');
    document.getElementById('nav-footer').classList.remove('red');
    document.getElementById('nav-footer').classList.remove('darken-3');
    document.getElementById('nav-wrapper').classList.add('light-blue');
    $('#nav-footer').css('background-color', '#172635');
    $('#bottom-menu').css('background', 'rgb(0,105,165)');
    $('.bmenu-item').css('border-right-color', 'steelblue');
    $('.badge').css('color', '#4dacff !important');
    $('#menu-info-overlay ').css('border-left-color', 'steelblue');
    $('.side-menu').css('background', '#1f3347');
    $('.side-menu').css('border-color', '#172635');
    // $('#search-results').css('cssText', 'background: #1f3347 !important')
    // $('#search-results:hover').css('background', '#172635')
    // $('#search-results').css('border-color', '#172635')
    $('#legend-hover-menu').css('background', '#1f3347');
    $('#bottom-icons').css('background', '#1f3347');
    $('#legend-hover-menu').css('border-color', '#172635');
    $('#colorbox').css('border', '10px solid #172635');
    $('#sat-infobox').css('background', '#1f3347');
    $('#sat-infobox').css('border-color', '#172635');
    $('#nav-footer-toggle').css('background', '#172635');
    $('.search-hilight').css('color', '#4dacff');
    $('.btn-ui').css('background-color', '#005a8f');
    settingsManager.themes.currentTheme = 'Blue';
  };

  // //////////////////////////////////////////////////////////////////////////
  // Membership settings
  // //////////////////////////////////////////////////////////////////////////

  // Always Show "Members Only" Menus
  settingsManager.isMembersOnly = true;

  // pageName = pageName[0].split('.html').slice(0);
  //
  // if (pageName[0] == 'basic') {
  //   console.log('Premium Membership');
  //   settingsManager.isMembersOnly = true;
  // }
  //
  // if (pageName[0] == 'index') {
  //   console.log('Free Membership');
  //   settingsManager.isMembersOnly = false;
  // }

  // //////////////////////////////////////////////////////////////////////////
  // Advanced Settings Below This Point
  // Feel free to change these, but they could break something
  // //////////////////////////////////////////////////////////////////////////

  settingsManager.modelsOnSatelliteViewOverride = false;

  // Frames Per Second Limiter
  settingsManager.minimumDrawDt = 0.0; // 20 FPS // 60 FPS = 0.01667

  settingsManager.camDistBuffer = 75;
  settingsManager.zNear = 1.0;
  settingsManager.zFar = 450000.0;

  // If Frag Depth Web GL Extension available then use it for satellite shader
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/iu.test(navigator.userAgent)) {
    settingsManager.desktopOnlySatShaderFix1 = '';
    settingsManager.desktopOnlySatShaderFix2 = '';
  } else {
    settingsManager.desktopOnlySatShaderFix1 = '#extension GL_EXT_frag_depth : enable';
    settingsManager.desktopOnlySatShaderFix2 = 'gl_FragDepthEXT = gl_FragCoord.z * 0.99999975;';
  }

  // //////////////////////////////////////////////////////////////////////////
  // Defaults that should never be changed
  // //////////////////////////////////////////////////////////////////////////

  // Nominal max size - overwritten by settingsManager.satShader.maxAllowedSize
  settingsManager.satShader.maxSize = settingsManager.satShader.maxAllowedSize * 2;

  settingsManager.fieldOfView = 0.6;

  // Determines if the Loading is complete
  settingsManager.cruncherReady = false;

  settingsManager.altLoadMsgs = true;
  settingsManager.loadStr = (str) => {
    if (str == '') {
      $('#loader-text').html('');
      return;
    }
    if (str == 'math') {
      $('#loader-text').html('Attempting to Math...');
    }

    if (settingsManager.altLoadMsgs) {
      if (typeof settingsManager.altMsgNum !== 'undefined') return;
      settingsManager.altMsgNum = Math.random();
      let msg = '';

      if (settingsManager.altMsgNum > 0) {
        msg = `Fun Fact: KeepTrack is on the front page of <a style="color: #48f3e3 !important;" href="https://clearspace.today" target="_blank">ClearSpace-1's Website</a>!`;
      }
      if (settingsManager.altMsgNum > 0.33) {
        msg = `Fun Fact: KeepTrack provided visuals for Studio Roosegaarde's <a style="color: #48f3e3 !important;" href="https://www.studioroosegaarde.net/project/space-waste-lab" target="_blank">Space Waste Lab</a>!`;
      }
      if (settingsManager.altMsgNum > 0.66) {
        msg = `Fun Fact: KeepTrack was used by the <a style="color: #48f3e3 !important;" href="https://www.youtube.com/embed/OfvkKBNup5A?autoplay=0&start=521&modestbranding=1" target="_blank">Joint Space Operations Center</a>!`;
      }
      $('#loader-text').html(msg);
      return;
    }

    switch (str) {
      case 'science':
        $('#loader-text').html('Locating Science...');
        break;
      case 'dots':
        $('#loader-text').html('Drawing Dots in Space...');
        break;
      case 'satIntel':
        $('#loader-text').html('Integrating Satellite Intel...');
        break;
      case 'radarData':
        $('#loader-text').html('Importing Radar Data...');
        break;
      case 'painting':
        $('#loader-text').html('Painting the Earth...');
        break;
      case 'coloring':
        $('#loader-text').html('Coloring Inside the Lines...');
        break;
      case 'elsets':
        $('#loader-text').html('Locating ELSETs...');
        break;
      case 'easterEgg':
        $('#loader-text').html('Llama Llama Llama Duck!');
    }
  };

  settingsManager.lkVerify = Date.now();

  // If No UI Reduce Overhead
  if (settingsManager.disableUI) {
    // LEAVE AT LEAST ONE TO PREVENT ERRORS
    settingsManager.maxFieldOfViewMarkers = 1;
    settingsManager.maxMissiles = 1;
    settingsManager.maxAnalystSats = 1;
  }

  if (settingsManager.enableLimitedUI) {
    settingsManager.zFar = 150000;
  }

  settingsManager.legendMenuOpen = false;

  settingsManager.limitSats = '';
  settingsManager.geolocation = {};
  settingsManager.geolocationUsed = false;
  settingsManager.mapWidth = 800;
  settingsManager.mapHeight = 600;
  settingsManager.currentLegend = 'default';
  settingsManager.socratesOnSatCruncher = null;
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
  settingsManager.isMapMenuOpen = false;
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
}

// This is an initial parse of the GET variables
// to determine critical settings. Other variables are checked later during
// satSet.init
if (!settingsManager.disableUI) {
  (function initParseFromGETVariables() {
    let queryStr = window.location.search.substring(1);
    let params = queryStr.split('&');
    for (let i = 0; i < params.length; i++) {
      let key = params[i].split('=')[0];
      // let val = params[i].split('=')[1];
      switch (key) {
        case 'console':
          settingsManager.isEnableConsole = true;
          break;
        case 'radarData':
          settingsManager.isEnableRadarData = true;
          settingsManager.maxRadarData = 150000;
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
          settingsManager.hiresImages = true;
          settingsManager.earthNumLatSegs = 256;
          settingsManager.earthNumLonSegs = 256;
          settingsManager.atmospherelatSegs = 128;
          settingsManager.atmospherelonSegs = 128;
          settingsManager.minimumDrawDt = 0.01667;
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
        case 'retro':
          settingsManager.retro = true;
          settingsManager.tleSource = 'tle/retro.json';
          break;
        case 'offline':
          settingsManager.offline = true;
          break;
        case 'debris':
          settingsManager.tleSource = 'tle/TLEdebris.json';
          break;
        case 'mw':
          settingsManager.tleSource = 'tle/mw.json';
          break;
        case 'trusat':
          settingsManager.trusatMode = true;
          settingsManager.trusatImages = true;
          break;
        case 'trusat-only':
          settingsManager.trusatMode = true;
          settingsManager.trusatOnly = true;
          settingsManager.trusatImages = true;
          settingsManager.tleSource = 'tle/trusat.json';
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
      }
    }
  })();
}

// Load the previously saved map
if (settingsManager.isLoadLastMap && !settingsManager.isDrawLess) {
  let lastMap = localStorage.getItem('lastMap');
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
    default:
      settingsManager.lowresImages = true;
      break;
  }
}

// Make sure there is some map loaded!
if (!settingsManager.smallImages && !settingsManager.nasaImages && !settingsManager.blueImages && !settingsManager.lowresImages && !settingsManager.hiresImages && !settingsManager.hiresNoCloudsImages && !settingsManager.vectorImages) {
  settingsManager.lowresImages = true;
}

//Global Debug Manager
let db = {};
{
  try {
    db = JSON.parse(localStorage.getItem('db'));
    if (db == null) throw new Error('Reload Debug Manager');
    if (typeof db.enabled == 'undefined') throw new Error('Reload Debug Manager');
  } catch (e) {
    db = {};
    db.enabled = false;
    db.verbose = false;
    localStorage.setItem('db', JSON.stringify(db));
  }
  db.init = (function () {
    db.log = function (message, isVerbose) {
      // Don't Log Verbose Stuff Normally
      if (isVerbose && !db.verbose) return;

      // If Logging is Enabled - Log It
      if (db.enabled) {
        console.log(message);
      }
    };
    db.on = function () {
      db.enabled = true;
      console.log('db is now on!');
      localStorage.setItem('db', JSON.stringify(db));
    };
    db.off = function () {
      db.enabled = false;
      console.log('db is now off!');
      localStorage.setItem('db', JSON.stringify(db));
    };
  })();
  db.gremlinsSettings = {};
  db.gremlinsSettings.nb = 100000;
  db.gremlinsSettings.delay = 5;
  db.gremlins = () => {
    $('#nav-footer').height(200);
    $('#nav-footer-toggle').hide();
    $('#bottom-icons-container').height(200);
    $('#bottom-icons').height(200);
    let startGremlins = () => {
      const bottomMenuGremlinClicker = gremlins.species.clicker({
        // Click only if parent is has class test-class
        canClick: (element) => {
          if (typeof element.parentElement == 'undefined' || element.parentElement == null) return null;
          return element.parentElement.className === 'bmenu-item';
        },
        defaultPositionSelector: () => {
          [
            randomizer.natural({
              max: Math.max(0, document.documentElement.clientWidth - 1),
            }),
            randomizer.natural({
              min: Math.max(0, document.documentElement.clientHeight - 100),
              max: Math.max(0, document.documentElement.clientHeight - 1),
            }),
          ];
        },
      });
      const bottomMenuGremlinScroller = gremlins.species.toucher({
        touchTypes: ['gesture'],
        defaultPositionSelector: () => {
          [
            randomizer.natural({
              max: Math.max(0, document.documentElement.clientWidth - 1),
            }),
            randomizer.natural({
              min: Math.max(0, document.documentElement.clientHeight - 100),
              max: Math.max(0, document.documentElement.clientHeight - 1),
            }),
          ];
        },
      });
      const distributionStrategy = gremlins.strategies.distribution({
        distribution: [0.3, 0.3, 0.1, 0.1, 0.1, 0.1], // the first three gremlins have more chances to be executed than the last
        delay: 5, // wait 5 ms between each action
      });
      gremlins
        .createHorde({
          species: [
            bottomMenuGremlinClicker,
            bottomMenuGremlinScroller,
            // gremlins.species.scroller(),
            gremlins.species.clicker(),
            gremlins.species.toucher(),
            gremlins.species.formFiller(),
            gremlins.species.typer(),
          ],
          mogwais: [gremlins.mogwais.alert(), gremlins.mogwais.fps(), gremlins.mogwais.gizmo({ maxErrors: 1000 })],
          strategies: [distributionStrategy],
        })
        .unleash();
      return;
    };
    if (typeof gremlins == 'undefined') {
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/gremlins.js';
      if (s.addEventListener) {
        s.addEventListener('load', startGremlins, false);
      } else if (s.readyState) {
        s.onreadystatechange = startGremlins;
      }
      document.body.appendChild(s);
    } else {
      startGremlins();
    }
  };
}

// Try to Make Older Versions of Jquery Work
if (typeof window.$ == 'undefined') {
  if (typeof window.jQuery !== 'undefined') {
    window.$ = window.jQuery;
  }
}

// Import CSS needed for loading screen
if (!settingsManager.disableUI) {
  import('@app/css/fonts.css').then((resp) => resp);
  import('@app/css/materialize.css').then(import('@app/css/materialize-local.css').then((resp) => resp));
  import('@app/js/lib/external/colorPick.css').then((resp) => resp);
  import('@app/modules/nextLaunchManager.css').then((resp) => resp);
  import('@app/css/perfect-scrollbar.min.css').then((resp) => resp);
  import('@app/css/jquery-ui.min.css').then((resp) => resp);
  import('@app/css/jquery-ui-timepicker-addon.css').then((resp) => resp);
  import('@app/css/style.css').then(import('@app/css/responsive.css').then((resp) => resp));
} else if (settingsManager.enableLimitedUI) {
  import('@app/css/limitedUI.css').then((resp) => resp);
} else {
  // console.log('ERROR');
}

// Expose these to the console
window.settingsManager = settingsManager;
window.db = db;
export { db, settingsManager };
