/* /////////////////////////////////////////////////////////////////////////////

http://keeptrack.space

Copyright (C) 2016-2021 Theodore Kruczek
Copyright (C) 2020 Heather Kruczek
Copyright (C) 2015-2016, James Yoder

Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
under the MIT License. Please reference http://keeptrack.space/licenses/thingsinspace.txt

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

///////////////////////////////////////////////////////////////////////////// */

import $ from 'jquery';
// eslint-disable-next-line sort-imports
import 'jquery-ui-bundle';
import '@app/js/lib/external/jquery-ui-slideraccess.js';
import '@app/js/lib/external/jquery-ui-timepicker.js';
import '@app/js/lib/external/perfect-scrollbar.min.js';
import '@app/js/lib/external/jquery.colorbox.min.js';
import '@app/js/lib/external/jquery-ajax.js';
import '@app/js/lib/external/colorPick.js';
import 'materialize-css';
import { DEG2RAD, RAD2DEG } from '@app/js/lib/constants.js';
import { parseRgba, rgbCss, saveCsv, stringPad } from '@app/js/lib/helpers.js';
import { CanvasRecorder } from '@app/js/lib/external/CanvasRecorder.js';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { adviceList } from '@app/js/uiManager/ui-advice.js';
import { dateFormat } from '@app/js/lib/external/dateFormat.js';
import { drawManager } from '@app/js/drawManager/drawManager.js';
import { mapManager } from '@app/js/uiManager/mapManager.js';
import { missileManager } from '@app/js/missileManager/missileManager.js';
import { mobileManager } from '@app/js/uiManager/mobileManager.js';
import { objectManager } from '@app/js/objectManager/objectManager.js';
import { omManager } from '@app/js/uiManager/omManager.js';
import { orbitManager } from '@app/js/orbitManager/orbitManager.js';
import { sMM } from '@app/js/uiManager/sideMenuManager.js';
import { satSet } from '@app/js/satSet/satSet.js';
import { satellite } from '@app/js/lib/lookangles.js';
import { searchBox } from '@app/js/uiManager/search-box.js';
import { sensorManager } from '@app/js/sensorManager/sensorManager.js';
import { settingsManager } from '@app/js/settingsManager/settingsManager.js';
import { timeManager } from '@app/js/timeManager/timeManager.js';
import { uiInput } from './ui-input.js';
import { uiLimited } from './ui-limited.js';
import { uiValidation } from './ui-validation.js';

const M = window.M;

// Public Variables
const mapImageDOM = $('#map-image');
const mapMenuDOM = $('#map-menu');
const bodyDOM = $('#bodyDOM');
const rightBtnSaveMenuDOM = $('#save-rmb-menu');
const rightBtnViewMenuDOM = $('#view-rmb-menu');
const rightBtnEditMenuDOM = $('#edit-rmb-menu');
const rightBtnCreateMenuDOM = $('#create-rmb-menu');
const rightBtnDrawMenuDOM = $('#draw-rmb-menu');
const rightBtnColorsMenuDOM = $('#colors-rmb-menu');
const rightBtnEarthMenuDOM = $('#earth-rmb-menu');

let isPlanetariumView = false;
let isAstronomyView = false;
let isVideoRecording = false;
let nextPassEarliestTime;
var recorder;

try {
  recorder = new CanvasRecorder(document.getElementById('canvas'));
} catch (e) {
  console.log(e);
}

$.ajaxSetup({
  cache: false,
});

var updateInterval = 1000;
var createClockDOMOnce = false;

const uiManager = {};
uiManager.searchBox = searchBox;
uiManager.adviceList = adviceList;
uiManager.mobileManager = mobileManager;
uiManager.isCurrentlyTyping = false;
uiManager.isTimeMachineRunning = false;

var lastBoxUpdateTime = 0;
var lastOverlayUpdateTime = 0;

var cameraManager, lineManager, starManager, groups;
uiManager.init = (cameraManagerRef, lineManagerRef, starManagerRef, groupsRef, satSet, orbitManager, groupsManager, ColorScheme) => {
  if (settingsManager.disableUI && settingsManager.enableLimitedUI) {
    // Pass the references through to the limited UI
    uiLimited.init(satSet, orbitManager, groupsManager, ColorScheme);
  }
  cameraManager = cameraManagerRef;
  lineManager = lineManagerRef;
  starManager = starManagerRef;
  groups = groupsRef;

  uiValidation();
  sMM.init(satSet, uiManager, sensorManager, satellite, ColorScheme, omManager, timeManager, cameraManager, orbitManager, objectManager, missileManager);

  // Register all UI callback functions with drawLoop in main.js
  // These run during the draw loop
  drawManager.setDrawLoopCallback(function () {
    // _showSatTest();
    uiManager.updateNextPassOverlay();
    _checkWatchlist();
    _updateSelectBox();
  });

  if (settingsManager.trusatMode) {
    $('.legend-pink-box').show();
    $('#logo-trusat').show();
  }
  if (settingsManager.isShowLogo) {
    $('#demo-logo').removeClass('start-hidden');
  }
  if (settingsManager.lowPerf) {
    $('#menu-surveillance').hide();
    $('#menu-sat-fov').hide();
    $('#menu-fov-bubble').hide();
    $('#settings-lowperf').hide();
  }
};

// This runs after the drawManager starts
uiManager.postStart = () => {
  // Enable Satbox Overlay
  if (settingsManager.enableHoverOverlay) {
    try {
      const hoverboxDOM = document.createElement('DIV');
      hoverboxDOM.innerHTML = `
        <div id="sat-hoverbox">
          <span id="sat-hoverbox1"></span>
          <br/>
          <span id="sat-hoverbox2"></span>
          <br/>
          <span id="sat-hoverbox3"></span>
        </div>`;

      document.getElementById('keeptrack-canvas').parentElement.append(hoverboxDOM);
    } catch {
      /* istanbul ignore next */
      console.debug('document.createElement() failed!');
    }
  }
};

var isSearchOpen = false;
var forceClose = false;
var forceOpen = false;
uiManager.searchToggle = function (force) {
  // Reset Force Options
  forceClose = false;
  forceOpen = false;

  // Pass false to force close and true to force open
  if (typeof force != 'undefined') {
    if (!force) forceClose = true;
    if (force) forceOpen = true;
  }

  if ((!isSearchOpen && !forceClose) || forceOpen) {
    isSearchOpen = true;
    $('#search-holder').removeClass('search-slide-up');
    $('#search-holder').addClass('search-slide-down');
    $('#search-icon').addClass('search-icon-search-on');
    $('#fullscreen-icon').addClass('top-menu-icons-search-on');
    $('#tutorial-icon').addClass('top-menu-icons-search-on');
    $('#legend-icon').addClass('top-menu-icons-search-on');
  } else {
    isSearchOpen = false;
    $('#search-holder').removeClass('search-slide-down');
    $('#search-holder').addClass('search-slide-up');
    $('#search-icon').removeClass('search-icon-search-on');
    setTimeout(function () {
      $('#fullscreen-icon').removeClass('top-menu-icons-search-on');
      $('#tutorial-icon').removeClass('top-menu-icons-search-on');
      $('#legend-icon').removeClass('top-menu-icons-search-on');
    }, 500);
    uiManager.hideSideMenus();
    searchBox.hideResults();
    // $('#menu-space-stations').removeClass('bmenu-item-selected');

    // This is getting called too much. Not sure what it was meant to prevent?
    // satSet.setColorScheme(ColorScheme.default, true);
    // uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
  }
};

uiManager.keyHandler = (evt) => {
  // Error Handling
  if (typeof evt.key == 'undefined') return;

  if (uiManager.isCurrentlyTyping) return;
  // console.log(Number(evt.charCode));
  switch (evt.key.toUpperCase()) {
    case 'R':
      cameraManager.rotateEarth();
      break;
    case 'C':
      // Create a local reference to the current cameraType
      // This will get passed to the cameraManager after uiManager figures out
      // what the new cameraType is
      var curCam = cameraManager.cameraType.current;
      if (curCam === cameraManager.cameraType.planetarium) {
        orbitManager.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
      }

      curCam++;

      if (curCam == cameraManager.cameraType.fixedToSat && objectManager.selectedSat == -1) {
        curCam++;
      }

      if (curCam === cameraManager.cameraType.planetarium && (!objectManager.isSensorManagerLoaded || !sensorManager.checkSensorSelected())) {
        curCam++;
      }

      if (curCam === cameraManager.cameraType.satellite && objectManager.selectedSat === -1) {
        curCam++;
      }

      if (curCam === cameraManager.cameraType.astronomy && (!objectManager.isSensorManagerLoaded || !sensorManager.checkSensorSelected())) {
        curCam++;
      }

      if (curCam === 7) {
        // 7 is a placeholder to reset camera type
        cameraManager.localRotateReset = true;
        settingsManager.fieldOfView = 0.6;
        drawManager.glInit();
        if (objectManager.selectedSat !== -1) {
          cameraManager.camZoomSnappedOnSat = true;
          curCam = cameraManager.cameraType.fixedToSat;
        } else {
          curCam = cameraManager.cameraType.default;
        }
      }

      cameraManager.cameraType.set(curCam);

      switch (curCam) {
        case cameraManager.cameraType.default:
          uiManager.toast('Earth Centered Camera Mode', 'standby');
          cameraManager.zoomLevel = 0.5;
          break;
        case cameraManager.cameraType.offset:
          uiManager.toast('Offset Camera Mode', 'standby');
          break;
        case cameraManager.cameraType.fps:
          uiManager.toast('Free Camera Mode', 'standby');
          $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
          break;
        case cameraManager.cameraType.planetarium:
          uiManager.toast('Planetarium Camera Mode', 'standby');
          uiManager.legendMenuChange('planetarium');
          $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
          break;
        case cameraManager.cameraType.satellite:
          uiManager.toast('Satellite Camera Mode', 'standby');
          $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
          break;
        case cameraManager.cameraType.astronomy:
          uiManager.toast('Astronomy Camera Mode', 'standby');
          uiManager.legendMenuChange('astronomy');
          $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
          break;
      }
      break;
  }

  switch (evt.key) {
    case '!':
      timeManager.propOffset = 0; // Reset to Current Time
      settingsManager.isPropRateChange = true;
      break;
    case ',':
      timeManager.propOffset -= 1000 * 60; // Move back a Minute
      settingsManager.isPropRateChange = true;
      $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.propRealTime + timeManager.propOffset));
      break;
    case '.':
      timeManager.propOffset += 1000 * 60; // Move a Minute
      settingsManager.isPropRateChange = true;
      $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.propRealTime + timeManager.propOffset));
      break;
    case '<':
      timeManager.propOffset -= 1000 * 60 * 60 * 24 * 365.25; // Move back a year
      settingsManager.isPropRateChange = true;
      $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.propRealTime + timeManager.propOffset));
      break;
    case '>':
      timeManager.propOffset += 1000 * 60 * 60 * 24 * 365.25; // Move forward a year
      settingsManager.isPropRateChange = true;
      $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.propRealTime + timeManager.propOffset));
      break;
    case '0':
      timeManager.setPropRateZero();
      timeManager.updatePropTime();
      timeManager.propOffset = timeManager.getPropOffset();
      settingsManager.isPropRateChange = true;
      break;
    case '+':
    case '=':
      timeManager.updatePropTime();
      timeManager.propOffset = timeManager.getPropOffset();
      if (timeManager.propRate < 0.001 && timeManager.propRate > -0.001) {
        timeManager.propRate = 0.001;
      }

      if (timeManager.propRate > 1000) {
        timeManager.propRate = 1000;
      }

      if (timeManager.propRate < 0) {
        timeManager.propRate *= 0.666666;
      } else {
        timeManager.propRate *= 1.5;
      }
      settingsManager.isPropRateChange = true;
      break;
    case '-':
    case '_':
      timeManager.updatePropTime();
      timeManager.propOffset = timeManager.getPropOffset();

      if (timeManager.propRate < 0.001 && timeManager.propRate > -0.001) {
        timeManager.propRate = -0.001;
      }

      if (timeManager.propRate < -1000) {
        timeManager.propRate = -1000;
      }

      if (timeManager.propRate > 0) {
        timeManager.propRate *= 0.666666;
      } else {
        timeManager.propRate *= 1.5;
      }
      settingsManager.isPropRateChange = true;
      break;
    case '1':
      timeManager.updatePropTime();
      timeManager.propOffset = timeManager.getPropOffset();
      timeManager.propRate = 1.0;
      settingsManager.isPropRateChange = true;
      break;
  }

  if (settingsManager.isPropRateChange) {
    timeManager.propRealTime = Date.now();
    timeManager.propTime();
    satSet.satCruncher.postMessage({
      typ: 'offset',
      dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
    });
    if (settingsManager.isPropRateChange && !settingsManager.isAlwaysHidePropRate && timeManager.propRate0 !== timeManager.propRate) {
      if (timeManager.propRate > 1.01 || timeManager.propRate < 0.99) {
        if (timeManager.propRate < 10) uiManager.toast(`Propagation Speed: ${timeManager.propRate.toFixed(1)}x`, 'standby');
        if (timeManager.propRate >= 10 && timeManager.propRate < 100) uiManager.toast(`Propagation Speed: ${timeManager.propRate.toFixed(1)}x`, 'caution');
        if (timeManager.propRate >= 100) uiManager.toast(`Propagation Speed: ${timeManager.propRate.toFixed(1)}x`, 'serious');
      } else {
        uiManager.toast(`Propagation Speed: ${timeManager.propRate.toFixed(1)}x`, 'normal');
      }
    }

    if (!settingsManager.disableUI) {
      if (!createClockDOMOnce) {
        document.getElementById('datetime-text').innerText = timeManager.timeTextStr;
        createClockDOMOnce = true;
      } else {
        document.getElementById('datetime-text').childNodes[0].nodeValue = timeManager.timeTextStr;
      }
    }
  }
};

uiManager.hideLoadingScreen = () => {
  // Don't wait if we are running Jest
  if ((drawManager.sceneManager.earth.isUseHiRes && drawManager.sceneManager.earth.isHiResReady !== true) || typeof process !== 'undefined') {
    setTimeout(function () {
      uiManager.hideLoadingScreen();
    }, 100);
    return;
  }

  // Display content when loading is complete.
  $('#canvas-holder').attr('style', 'display:block');

  mobileManager.checkMobileMode();

  if (settingsManager.isMobileModeEnabled) {
    $('#spinner').hide();
    settingsManager.loadStr('math');
    $('#loading-screen').hide();
  } else {
    // Loading Screen Resized and Hidden
    if (settingsManager.trusatMode) {
      setTimeout(function () {
        $('#loading-screen').removeClass('full-loader');
        $('#loading-screen').addClass('mini-loader-container');
        $('#logo-inner-container').addClass('mini-loader');
        $('#logo-text').html('');
        $('#logo-trusat').hide();
        $('#loading-screen').hide();
        settingsManager.loadStr('math');
      }, 100);
    } else {
      setTimeout(function () {
        $('#loading-screen').removeClass('full-loader');
        $('#loading-screen').addClass('mini-loader-container');
        $('#logo-inner-container').addClass('mini-loader');
        $('#logo-text').html('');
        $('#logo-trusat').hide();
        $('#loading-screen').hide();
        settingsManager.loadStr('math');
      }, 100);
    }
  }
};

uiManager.resize2DMap = function () {
  if ($(window).width() > $(window).height()) {
    // If widescreen
    settingsManager.mapWidth = $(window).width();
    mapImageDOM.width(settingsManager.mapWidth);
    settingsManager.mapHeight = (settingsManager.mapWidth * 3) / 4;
    mapImageDOM.height(settingsManager.mapHeight);
    mapMenuDOM.width($(window).width());
  } else {
    settingsManager.mapHeight = $(window).height() - 100; // Subtract 100 portrait (mobile)
    mapImageDOM.height(settingsManager.mapHeight);
    settingsManager.mapWidth = (settingsManager.mapHeight * 4) / 3;
    mapImageDOM.width(settingsManager.mapWidth);
    mapMenuDOM.width($(window).width());
  }
};

var infoOverlayDOM = [];
uiManager.updateNextPassOverlay = (isForceUpdate) => {
  if (sMM.nextPassArray.length <= 0 && !sMM.isInfoOverlayMenuOpen) return;

  // FIXME This should auto update the overlay when the time changes outside the original search window
  // Update once every 10 seconds
  if ((timeManager.now > lastOverlayUpdateTime * 1 + 10000 && objectManager.selectedSat === -1 && !cameraManager.isDragging && cameraManager.zoomLevel === cameraManager.zoomTarget) || isForceUpdate) {
    var propTime = timeManager.propTime();
    infoOverlayDOM = [];
    infoOverlayDOM.push('<div>');
    for (var s = 0; s < sMM.nextPassArray.length; s++) {
      var satInView = satSet.getSatInViewOnly(satSet.getIdFromObjNum(sMM.nextPassArray[s].SCC_NUM)).inview;
      // If old time and not in view, skip it
      if (sMM.nextPassArray[s].time - propTime < -1000 * 60 * 5 && !satInView) continue;

      // Get the pass Time
      var time = dateFormat(sMM.nextPassArray[s].time, 'isoTime', true);

      // Yellow - In View and Time to Next Pass is +/- 30 minutes
      if (satInView && sMM.nextPassArray[s].time - propTime < 1000 * 60 * 30 && propTime - sMM.nextPassArray[s].time < 1000 * 60 * 30) {
        infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: yellow">' + sMM.nextPassArray[s].SCC_NUM + ': ' + time + '</h5></div>');
        continue;
      }
      // Blue - Time to Next Pass is between 10 minutes before and 20 minutes after the current time
      // This makes recent objects stay at the top of the list in blue
      if (sMM.nextPassArray[s].time - propTime < 1000 * 60 * 10 && propTime - sMM.nextPassArray[s].time < 1000 * 60 * 20) {
        infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: blue">' + sMM.nextPassArray[s].SCC_NUM + ': ' + time + '</h5></div>');
        continue;
      }
      // White - Any future pass not fitting the above requirements
      if (sMM.nextPassArray[s].time - propTime > 0) {
        infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: white">' + sMM.nextPassArray[s].SCC_NUM + ': ' + time + '</h5></div>');
      }
    }
    infoOverlayDOM.push('</div>');
    document.getElementById('info-overlay-content').innerHTML = infoOverlayDOM.join('');
    lastOverlayUpdateTime = timeManager.now;
  }
};
var _checkWatchlist = () => {
  if (sMM.watchlistList.length <= 0) return;
  for (let i = 0; i < sMM.watchlistList.length; i++) {
    var sat = satSet.getSat(sMM.watchlistList[i]);
    if (sat.inview === 1 && sMM.watchlistInViewList[i] === false) {
      // Is inview and wasn't previously
      sMM.watchlistInViewList[i] = true;
      orbitManager.addInViewOrbit(sMM.watchlistList[i]);
    }
    if (sat.inview === 0 && sMM.watchlistInViewList[i] === true) {
      // Isn't inview and was previously
      sMM.watchlistInViewList[i] = false;
      orbitManager.removeInViewOrbit(sMM.watchlistList[i]);
    }
  }
  for (let i = 0; i < sMM.watchlistInViewList.length; i++) {
    if (sMM.watchlistInViewList[i] === true) {
      // Someone is still in view on the watchlist
      settingsManager.themes.redTheme();
      return;
    }
  }
  // None of the sats on the watchlist are in view
  settingsManager.themes.blueTheme();
};
var _updateSelectBox = () => {
  // Don't update if no object is selected
  if (objectManager.selectedSat === -1) return;

  var sat = satSet.getSat(objectManager.selectedSat);

  // Don't bring up the update box for static dots
  if (sat.static) return;

  // IDEA: Include updates when satellite edited regardless of time.
  if (timeManager.now * 1 > lastBoxUpdateTime * 1 + updateInterval) {
    if (!sat.missile) {
      if (objectManager.isSensorManagerLoaded) {
        sat.getTEARR();
      }
    } else {
      satellite.setTEARR(missileManager.getMissileTEARR(sat));
    }
    if (satellite.degreesLong(satellite.currentTEARR.lon) >= 0) {
      $('#sat-longitude').html(satellite.degreesLong(satellite.currentTEARR.lon).toFixed(3) + '°E');
    } else {
      $('#sat-longitude').html((satellite.degreesLong(satellite.currentTEARR.lon) * -1).toFixed(3) + '°W');
    }
    if (satellite.degreesLat(satellite.currentTEARR.lat) >= 0) {
      $('#sat-latitude').html(satellite.degreesLat(satellite.currentTEARR.lat).toFixed(3) + '°N');
    } else {
      $('#sat-latitude').html((satellite.degreesLat(satellite.currentTEARR.lat) * -1).toFixed(3) + '°S');
    }
    var jday = timeManager.getDayOfYear(timeManager.propTimeVar);
    $('#jday').html(jday);

    if (sMM.isMapMenuOpen && timeManager.now > settingsManager.lastMapUpdateTime + 30000) {
      uiManager.updateMap();
      settingsManager.lastMapUpdateTime = timeManager.now;
    }

    if (!sat.missile) {
      $('#sat-altitude').html(sat.getAltitude().toFixed(2) + ' km');
      $('#sat-velocity').html(sat.velocity.total.toFixed(2) + ' km/s');
    } else {
      $('#sat-altitude').html(satellite.currentTEARR.alt.toFixed(2) + ' km');
    }

    if (objectManager.isSensorManagerLoaded) {
      if (satellite.currentTEARR.inview) {
        $('#sat-azimuth').html(satellite.currentTEARR.az.toFixed(0) + '°'); // Convert to Degrees
        $('#sat-elevation').html(satellite.currentTEARR.el.toFixed(1) + '°');
        $('#sat-range').html(satellite.currentTEARR.rng.toFixed(2) + ' km');
      } else {
        $('#sat-azimuth').html('Out of FOV');
        $('#sat-azimuth').prop('title', 'Azimuth: ' + satellite.currentTEARR.az.toFixed(0) + '°');
        $('#sat-elevation').html('Out of FOV');
        $('#sat-elevation').prop('title', 'Elevation: ' + satellite.currentTEARR.el.toFixed(1) + '°');
        $('#sat-range').html('Out of FOV');
        $('#sat-range').prop('title', 'Range: ' + satellite.currentTEARR.rng.toFixed(2) + ' km');
      }
    } else {
      $('#sat-azimuth').parent().hide();
      $('#sat-elevation').parent().hide();
      $('#sat-range').parent().hide();
    }

    if (objectManager.isSensorManagerLoaded) {
      if (sensorManager.checkSensorSelected()) {
        if (objectManager.selectedSat !== objectManager.lastSelectedSat() && !sat.missile) {
          $('#sat-nextpass').html(satellite.nextpass(sat));

          // IDEA: Code isInSun()
          //sun.getXYZ();
          //lineManager.create('ref',[sun.sunvar.position.x,sun.sunvar.position.y,sun.sunvar.position.z]);
        }
        objectManager.lastSelectedSat(objectManager.selectedSat);
      } else {
        $('#sat-nextpass').html('Unavailable');
      }
    } else {
      $('#sat-nextpass').parent().hide();
    }

    lastBoxUpdateTime = timeManager.now;
  }
};

$('#colors-menu>ul>li').on('click', function () {
  objectManager.setSelectedSat(-1); // clear selected sat
  var colorName = $(this).data('color');
  if (colorName !== 'sunlight') {
    satSet.satCruncher.postMessage({
      isSunlightView: false,
    });
  }
  switch (colorName) {
    case 'default':
      uiManager.legendMenuChange('default');
      satSet.setColorScheme(ColorScheme.default, true);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'velocity':
      uiManager.legendMenuChange('velocity');
      satSet.setColorScheme(ColorScheme.velocity);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'sunlight':
      uiManager.legendMenuChange('sunlight');
      satSet.setColorScheme(ColorScheme.sunlight, true);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      settingsManager.isForceColorScheme = true;
      satSet.satCruncher.postMessage({
        isSunlightView: true,
      });
      break;
    case 'near-earth':
      uiManager.legendMenuChange('near');
      satSet.setColorScheme(ColorScheme.leo);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'deep-space':
      uiManager.legendMenuChange('deep');
      satSet.setColorScheme(ColorScheme.geo);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'elset-age':
      $('#loading-screen').fadeIn(1000, function () {
        uiManager.legendMenuChange('ageOfElset');
        satSet.setColorScheme(ColorScheme.ageOfElset);
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'lost-objects':
      $('#search').val('');
      $('#loading-screen').fadeIn(1000, function () {
        settingsManager.lostSatStr = '';
        satSet.setColorScheme(ColorScheme.lostobjects);
        document.getElementById('search').value = settingsManager.lostSatStr;
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        uiManager.doSearch($('#search').val());
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'rcs':
      uiManager.legendMenuChange('rcs');
      satSet.setColorScheme(ColorScheme.rcs);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'smallsats':
      uiManager.legendMenuChange('small');
      satSet.setColorScheme(ColorScheme.smallsats);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'countries':
      uiManager.legendMenuChange('countries');
      satSet.setColorScheme(ColorScheme.countries);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
  }

  // Close Open Menus
  if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
  uiManager.hideSideMenus();
});

uiManager.useCurrentGeolocationAsSensor = function () {
  if (location.protocol === 'https:' && !settingsManager.geolocationUsed && settingsManager.isMobileModeEnabled) {
    navigator.geolocation.getCurrentPosition(function (position) {
      settingsManager.geolocation.lat = position.coords.lat;
      settingsManager.geolocation.long = position.coords.lon;
      settingsManager.geolocation.obshei = 0;
      settingsManager.geolocation.minaz = 0;
      settingsManager.geolocation.maxaz = 360;
      settingsManager.geolocation.minel = 30;
      settingsManager.geolocation.maxel = 90;
      settingsManager.geolocation.minrange = 0;
      settingsManager.geolocation.maxrange = 100000;
      sensorManager.whichRadar = 'CUSTOM';

      $('#cs-lat').val(settingsManager.geolocation.lat).trigger('change');
      $('#cs-lon').val(settingsManager.geolocation.long).trigger('change');
      $('#cs-hei').val(settingsManager.geolocation.obshei).trigger('change');

      $('#cs-telescope').attr('checked', 'checked');
      $('#cs-minaz').attr('disabled', true);
      $('#cs-maxaz').attr('disabled', true);
      $('#cs-minel').attr('disabled', true);
      $('#cs-maxel').attr('disabled', true);
      $('#cs-minrange').attr('disabled', true);
      $('#cs-maxrange').attr('disabled', true);
      $('#cs-minaz-div').hide();
      $('#cs-maxaz-div').hide();
      $('#cs-minel-div').hide();
      $('#cs-maxel-div').hide();
      $('#cs-minrange-div').hide();
      $('#cs-maxrange-div').hide();
      $('#cs-minaz').val(0);
      $('#cs-maxaz').val(360);
      $('#cs-minel').val(10);
      $('#cs-maxel').val(90);
      $('#cs-minrange').val(100);
      $('#cs-maxrange').val(50000);

      $('#sensor-type').html('Telescope');
      $('#sensor-info-title').html('Custom Sensor');
      $('#sensor-country').html('Custom Sensor');

      var lon = settingsManager.geolocation.long;
      var lat = settingsManager.geolocation.lat;
      var obshei = settingsManager.geolocation.obshei;
      var minaz = settingsManager.geolocation.minaz;
      var maxaz = settingsManager.geolocation.maxaz;
      var minel = settingsManager.geolocation.minel;
      var maxel = settingsManager.geolocation.maxel;
      var minrange = settingsManager.geolocation.minrange;
      var maxrange = settingsManager.geolocation.maxrange;

      satSet.satCruncher.postMessage({
        // Send satSet.satCruncher File information on this radar
        typ: 'offset', // Tell satSet.satCruncher to update something
        dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(), // Tell satSet.satCruncher what time it is and how fast time is moving
        setlatlong: true, // Tell satSet.satCruncher we are changing observer location
        sensor: {
          lat: lat,
          long: lon,
          obshei: obshei,
          obsminaz: minaz,
          obsmaxaz: maxaz,
          obsminel: minel,
          obsmaxel: maxel,
          obsminrange: minrange,
          obsmaxrange: maxrange,
        },
      });

      satellite.setobs({
        lat: lat,
        long: lon,
        obshei: obshei,
        obsminaz: minaz,
        obsmaxaz: maxaz,
        obsminel: minel,
        obsmaxel: maxel,
        obsminrange: minrange,
        obsmaxrange: maxrange,
      });

      objectManager.setSelectedSat(-1);
      lat = lat * 1;
      lon = lon * 1;
      if (maxrange > 6000) {
        cameraManager.changeZoom('geo');
      } else {
        cameraManager.changeZoom('leo');
      }
      cameraManager.camSnap(cameraManager.latToPitch(lat), cameraManager.longToYaw(lon, timeManager.selectedDate));
    });
  }
};

$('#findCsoBtn').on('click', function () {
  $('#loading-screen').fadeIn(1000, function () {
    let searchStr = satellite.findCloseObjects();
    uiManager.doSearch(searchStr);
    $('#loading-screen').fadeOut('slow');
  });
});

$('#all-objects-link').on('click', function () {
  if (objectManager.selectedSat === -1) {
    return;
  }
  let intldes = satSet.getSatExtraOnly(objectManager.selectedSat).intlDes;
  let searchStr = intldes.slice(0, 8);
  uiManager.doSearch(searchStr);
  $('#search').val(searchStr);
});

$('#near-orbits-link').on('click', () => {
  // searchBox.doArraySearch(satellite.findNearbyObjectsByOrbit(satSet.getSat(objectManager.selectedSat)));
  let searchStr = searchBox.doArraySearch(satellite.findNearbyObjectsByOrbit(satSet.getSat(window.selectedSat)));
  searchBox.doSearch(searchStr);
});

uiManager.legendColorsChange = function () {
  ColorScheme.resetObjectTypeFlags();

  $('.legend-payload-box').css('background', rgbCss(settingsManager.colors.payload));
  $('.legend-rocketBody-box').css('background', rgbCss(settingsManager.colors.rocketBody));
  $('.legend-debris-box').css('background', rgbCss(settingsManager.colors.debris));
  $('.legend-inFOV-box').css('background', rgbCss(settingsManager.colors.inview));
  $('.legend-facility-box').css('background', rgbCss(settingsManager.colors.facility));
  $('.legend-sensor-box').css('background', rgbCss(settingsManager.colors.sensor));
  if (settingsManager.trusatMode || settingsManager.isExtraSatellitesAdded) {
    $('.legend-trusat-box').css('background', rgbCss(settingsManager.colors.trusat));
  } else {
    $('.legend-trusat-box')[1].parentElement.style.display = 'none';
    $('.legend-trusat-box')[2].parentElement.style.display = 'none';
    $('.legend-trusat-box')[3].parentElement.style.display = 'none';
  }
  $('.legend-velocityFast-box').css('background', rgbCss([0.75, 0.75, 0, 1]));
  $('.legend-velocityMed-box').css('background', rgbCss([0.75, 0.25, 0, 1]));
  $('.legend-velocitySlow-box').css('background', rgbCss([1, 0, 0, 1]));
  $('.legend-inviewAlt-box').css('background', rgbCss(settingsManager.colors.inviewAlt));
  $('.legend-rcsSmall-box').css('background', rgbCss(settingsManager.colors.rcsSmall));
  $('.legend-rcsMed-box').css('background', rgbCss(settingsManager.colors.rcsMed));
  $('.legend-rcsLarge-box').css('background', rgbCss(settingsManager.colors.rcsLarge));
  $('.legend-rcsUnknown-box').css('background', rgbCss(settingsManager.colors.rcsUnknown));
  $('.legend-ageNew-box').css('background', rgbCss(settingsManager.colors.ageNew));
  $('.legend-ageMed-box').css('background', rgbCss(settingsManager.colors.ageMed));
  $('.legend-ageOld-box').css('background', rgbCss(settingsManager.colors.ageOld));
  $('.legend-ageLost-box').css('background', rgbCss(settingsManager.colors.ageLost));
  $('.legend-satLEO-box').css('background', rgbCss(settingsManager.colors.satLEO));
  $('.legend-satGEO-box').css('background', rgbCss(settingsManager.colors.satGEO));
  $('.legend-satSmall-box').css('background', rgbCss(settingsManager.colors.satSmall));
  $('.legend-countryUS-box').css('background', rgbCss(settingsManager.colors.countryUS));
  $('.legend-countryCIS-box').css('background', rgbCss(settingsManager.colors.countryCIS));
  $('.legend-countryPRC-box').css('background', rgbCss(settingsManager.colors.countryPRC));
  $('.legend-countryOther-box').css('background', rgbCss(settingsManager.colors.countryOther));
};

uiManager.legendMenuChange = function (menu) {
  $('#legend-list-default').hide();
  $('#legend-list-default-sensor').hide();
  $('#legend-list-rcs').hide();
  $('#legend-list-sunlight').hide();
  $('#legend-list-small').hide();
  $('#legend-list-near').hide();
  $('#legend-list-deep').hide();
  $('#legend-list-velocity').hide();
  $('#legend-list-countries').hide();
  $('#legend-list-planetarium').hide();
  $('#legend-list-astronomy').hide();
  $('#legend-list-ageOfElset').hide();

  // Update Legend Colors
  uiManager.legendColorsChange();

  switch (menu) {
    case 'default':
      if (objectManager.isSensorManagerLoaded && sensorManager.checkSensorSelected()) {
        $('#legend-list-default-sensor').show();
      } else {
        $('#legend-list-default').show();
      }
      break;
    case 'rcs':
      $('#legend-list-rcs').show();
      break;
    case 'small':
      $('#legend-list-small').show();
      break;
    case 'near':
      $('#legend-list-near').show();
      break;
    case 'deep':
      $('#legend-list-deep').show();
      break;
    case 'velocity':
      $('#legend-list-velocity').show();
      break;
    case 'sunlight':
      $('#legend-list-sunlight').show();
      break;
    case 'ageOfElset':
      $('#legend-list-ageOfElset').show();
      break;
    case 'countries':
      $('#legend-list-countries').show();
      break;
    case 'planetarium':
      $('#legend-list-planetarium').show();
      break;
    case 'astronomy':
      $('#legend-list-astronomy').show();
      break;
    case 'clear':
      $('#legend-hover-menu').hide();
      if (objectManager.isSensorManagerLoaded && sensorManager.checkSensorSelected()) {
        $('#legend-list-default-sensor').show();
      } else {
        $('#legend-list-default').show();
      }
      break;
  }
  if (settingsManager.currentLegend !== menu) {
    $('.legend-payload-box').css('background', settingsManager.colors.payload);
    ColorScheme.objectTypeFlags.payload = true;
    $('.legend-rocketBody-box').css('background', settingsManager.colors.rocketBodyBody);
    ColorScheme.objectTypeFlags.rocketBody = true;
    $('.legend-debris-box').css('background', settingsManager.colors.debris);
    ColorScheme.objectTypeFlags.debris = true;
    $('.legend-sensor-box').css('background', settingsManager.colors.sensor);
    ColorScheme.objectTypeFlags.sensor = true;
    $('.legend-facility-box').css('background', settingsManager.colors.facility);
    ColorScheme.objectTypeFlags.facility = true;
    $('.legend-missile-box').css('background', settingsManager.colors.missile);
    ColorScheme.objectTypeFlags.missile = true;
    $('.legend-missileInview-box').css('background', settingsManager.colors.missileInview);
    ColorScheme.objectTypeFlags.missileInview = true;
    $('.legend-trusat-box').css('background', settingsManager.colors.trusat);
    ColorScheme.objectTypeFlags.trusat = true;
    $('.legend-inFOV-box').css('background', settingsManager.colors.inview);
    ColorScheme.objectTypeFlags.inFOV = true;
    $('.legend-starLow-box').css('background', settingsManager.colors.starLow);
    ColorScheme.objectTypeFlags.starLow = true;
    $('.legend-starMed-box').css('background', settingsManager.colors.starMed);
    ColorScheme.objectTypeFlags.starMed = true;
    $('.legend-starHi-box').css('background', settingsManager.colors.starHi);
    ColorScheme.objectTypeFlags.starHi = true;
    $('.legend-satLow-box').css('background', settingsManager.colors.sunlight60);
    ColorScheme.objectTypeFlags.satLow = true;
    $('.legend-satMed-box').css('background', settingsManager.colors.sunlight80);
    ColorScheme.objectTypeFlags.satMed = true;
    $('.legend-satHi-box').css('background', settingsManager.colors.sunlight100);
    ColorScheme.objectTypeFlags.satHi = true;
    $('.legend-rcsSmall-box').css('background', settingsManager.colors.rcsSmall);
    ColorScheme.objectTypeFlags.satSmall = true;
    $('.legend-satSmall-box').css('background', settingsManager.colors.satSmall);
    ColorScheme.objectTypeFlags.rcsSmall = true;
    $('.legend-rcsMed-box').css('background', settingsManager.colors.rcsMed);
    ColorScheme.objectTypeFlags.rcsMed = true;
    $('.legend-rcsLarge-box').css('background', settingsManager.colors.rcsLarge);
    ColorScheme.objectTypeFlags.rcsLarge = true;
    $('.legend-rcsUnknown-box').css('background', settingsManager.colors.rcsUnknown);
    ColorScheme.objectTypeFlags.rcsUnknown = true;
    $('.legend-velocitySlow-box').css('background', [1.0, 0, 0.0, 1.0]);
    ColorScheme.objectTypeFlags.velocitySlow = true;
    $('.legend-velocityMed-box').css('background', [0.5, 0.5, 0.0, 1.0]);
    ColorScheme.objectTypeFlags.velocityMed = true;
    $('.legend-velocityFast-box').css('background', [0, 1, 0.0, 1.0]);
    ColorScheme.objectTypeFlags.velocityFast = true;
    $('.legend-inviewAlt-box').css('background', settingsManager.colors.inviewAlt);
    ColorScheme.objectTypeFlags.inviewAlt = true;
    $('.legend-satLEO-box').css('background', settingsManager.colors.satLEO);
    ColorScheme.objectTypeFlags.satLEO = true;
    $('.legend-satGEO-box').css('background', settingsManager.colors.satGEO);
    ColorScheme.objectTypeFlags.satGEO = true;
    $('.legend-countryUS-box').css('background', settingsManager.colors.countryUS);
    ColorScheme.objectTypeFlags.countryUS = true;
    $('.legend-countryCIS-box').css('background', settingsManager.colors.countryCIS);
    ColorScheme.objectTypeFlags.countryCIS = true;
    $('.legend-countryPRC-box').css('background', settingsManager.colors.countryPRC);
    ColorScheme.objectTypeFlags.countryPRC = true;
    $('.legend-countryOther-box').css('background', settingsManager.colors.countryOther);
    ColorScheme.objectTypeFlags.countryOther = true;
    $('.legend-ageNew-box').css('background', settingsManager.colors.ageNew);
    ColorScheme.objectTypeFlags.ageNew = true;
    $('.legend-ageMed-box').css('background', settingsManager.colors.ageMed);
    ColorScheme.objectTypeFlags.ageMed = true;
    $('.legend-ageOld-box').css('background', settingsManager.colors.ageOld);
    ColorScheme.objectTypeFlags.ageOld = true;
    $('.legend-ageLost-box').css('background', settingsManager.colors.ageLost);
    ColorScheme.objectTypeFlags.ageLost = true;
  }
  settingsManager.currentLegend = menu;
};

uiManager.colorSchemeChangeAlert = (scheme) => {
  // Don't Make an alert the first time!
  if (typeof uiManager.lastColorScheme == 'undefined' && scheme.default) {
    uiManager.lastColorScheme = scheme;
    return;
  }

  // Don't make an alert unless something has really changed
  if (uiManager.lastColorScheme == scheme) return;
  uiManager.lastColorScheme = scheme;
  for (var i = 0; i < Object.keys(ColorScheme).length; i++) {
    if (scheme == ColorScheme[Object.keys(ColorScheme)[i]]) {
      M.toast({
        html: `Color Scheme changed to ${Object.keys(ColorScheme)[i]}`,
      });
    }
  }
};

uiManager.countryMenuClick = (groupName) => {
  if (typeof groups == 'undefined') return;
  switch (groupName) {
    case 'Canada':
      if (typeof groups.Canada == 'undefined') {
        groups.Canada = groups.createGroup('countryRegex', /CA/u);
      }
      break;
    case 'China':
      if (typeof groups.China == 'undefined') {
        groups.China = groups.createGroup('countryRegex', /PRC/u);
      }
      break;
    case 'France':
      if (typeof groups.France == 'undefined') {
        groups.France = groups.createGroup('countryRegex', /FR/u);
      }
      break;
    case 'India':
      if (typeof groups.India == 'undefined') {
        groups.India = groups.createGroup('countryRegex', /IND/u);
      }
      break;
    case 'Israel':
      if (typeof groups.Israel == 'undefined') {
        groups.Israel = groups.createGroup('countryRegex', /ISRA/u);
      }
      break;
    case 'Japan':
      if (typeof groups.Japan == 'undefined') {
        groups.Japan = groups.createGroup('countryRegex', /JPN/u);
      }
      break;
    case 'Russia':
      if (typeof groups.Russia == 'undefined') {
        groups.Russia = groups.createGroup('countryRegex', /CIS/u);
      }
      break;
    case 'UnitedKingdom':
      if (typeof groups.UnitedKingdom == 'undefined') {
        groups.UnitedKingdom = groups.createGroup('countryRegex', /UK/u);
      }
      break;
    case 'UnitedStates':
      if (typeof groups.UnitedStates == 'undefined') {
        groups.UnitedStates = groups.createGroup('countryRegex', /US/u);
      }
      break;
  }
  _groupSelected(groupName);
};
var $search = $('#search');
$('#country-menu>ul>li').on('click', () => {
  uiManager.countryMenuClick($(this).data('group'));
});

uiManager.constellationMenuClick = (groupName) => {
  if (typeof groups == 'undefined') return;
  switch (groupName) {
    case 'SpaceStations':
      if (typeof groups.SpaceStations == 'undefined') {
        groups.SpaceStations = groups.createGroup('objNum', [25544, 41765]);
      }
      break;
    case 'GlonassGroup':
      if (typeof groups.GlonassGroup == 'undefined') {
        groups.GlonassGroup = groups.createGroup('nameRegex', /GLONASS/u);
      }
      break;
    case 'GalileoGroup':
      if (typeof groups.GalileoGroup == 'undefined') {
        groups.GalileoGroup = groups.createGroup('nameRegex', /GALILEO/u);
      }
      break;
    case 'GPSGroup':
      if (typeof groups.GPSGroup == 'undefined') {
        groups.GPSGroup = groups.createGroup('nameRegex', /NAVSTAR/u);
      }
      break;
    case 'AmatuerRadio':
      if (typeof groups.AmatuerRadio == 'undefined') {
        groups.AmatuerRadio = groups.createGroup('objNum', [
          7530,
          14781,
          20442,
          22826,
          24278,
          25338,
          25397,
          25544,
          26931,
          27607,
          27844,
          27848,
          28895,
          32785,
          32788,
          32789,
          32791,
          33493,
          33498,
          33499,
          35932,
          35933,
          35935,
          37224,
          37839,
          37841,
          37855,
          38760,
          39090,
          39134,
          39136,
          39161,
          39417,
          39430,
          39436,
          39439,
          39440,
          39444,
          39469,
          39770,
          40014,
          40021,
          40024,
          40025,
          40030,
          40032,
          40042,
          40043,
          40057,
          40071,
          40074,
          40377,
          40378,
          40379,
          40380,
          40654,
          40719,
          40900,
          40903,
          40906,
          40907,
          40908,
          40910,
          40911,
          40912,
          40926,
          40927,
          40928,
          40931,
          40967,
          40968,
          41168,
          41171,
          41340,
          41459,
          41460,
          41465,
          41474,
          41600,
          41619,
          41789,
          41932,
          41935,
          42017,
        ]);
      }
      break;
    case 'aehf':
      if (typeof groups.aehf == 'undefined') {
        groups.aehf = groups.createGroup('objNum', satSet.convertIdArrayToSatnumArray(objectManager.satLinkManager.aehf));
      }
      $('#loading-screen').fadeIn(1000, function () {
        lineManager.clear();
        objectManager.satLinkManager.showLinks(lineManager, satSet, 'aehf');
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'wgs':
      // WGS also selects DSCS
      if (typeof groups.wgs == 'undefined') {
        groups.wgs = groups.createGroup('objNum', satSet.convertIdArrayToSatnumArray(objectManager.satLinkManager.wgs.concat(objectManager.satLinkManager.dscs)));
      }
      $('#loading-screen').fadeIn(1000, function () {
        lineManager.clear();
        try {
          objectManager.satLinkManager.showLinks(lineManager, satSet, 'wgs');
        } catch (e) {
          // Maybe the objectManager.satLinkManager isn't installed?
        }
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'starlink':
      // WGS also selects DSCS
      if (typeof groups.starlink == 'undefined') {
        groups.starlink = groups.createGroup('objNum', satSet.convertIdArrayToSatnumArray(objectManager.satLinkManager.starlink));
      }
      $('#loading-screen').fadeIn(1000, function () {
        lineManager.clear();
        try {
          objectManager.satLinkManager.showLinks(lineManager, satSet, 'starlink');
        } catch (e) {
          // Maybe the objectManager.satLinkManager isn't installed?
        }
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'sbirs':
      // SBIRS and DSP
      if (typeof groups.sbirs == 'undefined') {
        groups.sbirs = groups.createGroup('objNum', satSet.convertIdArrayToSatnumArray(objectManager.satLinkManager.sbirs));
      }
      $('#loading-screen').fadeIn(1000, function () {
        lineManager.clear();
        try {
          objectManager.satLinkManager.showLinks(lineManager, satSet, 'sbirs');
        } catch (e) {
          // Maybe the objectManager.satLinkManager isn't installed?
        }
        $('#loading-screen').fadeOut('slow');
      });
      break;
  }
  _groupSelected(groupName);
  uiManager.doSearch($('#search').val());
};

$('#constellation-menu>ul>li').on('click', function () {
  uiManager.constellationMenuClick($(this).data('group'));
});
var _groupSelected = function (groupName) {
  if (typeof groupName == 'undefined') return;
  if (typeof groups[groupName] == 'undefined') return;
  groups.selectGroup(groups[groupName], orbitManager);
  $search.val('');

  var results = groups[groupName].sats;
  for (var i = 0; i < results.length; i++) {
    var satId = groups[groupName].sats[i].satId;
    var scc = satSet.getSat(satId).SCC_NUM;
    if (i === results.length - 1) {
      $search.val($search.val() + scc);
    } else {
      $search.val($search.val() + scc + ',');
    }
  }

  searchBox.fillResultBox(groups[groupName].sats, satSet);

  objectManager.setSelectedSat(-1); // Clear selected sat

  // Close Menus
  if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(true);
  uiManager.hideSideMenus();
};

var _resetSensorSelected = function () {
  // Return to default settings with nothing 'inview'
  satellite.setobs(null);
  sensorManager.setSensor(null, null); // Pass staticNum to identify which sensor the user clicked
  uiManager.getsensorinfo();
  if (settingsManager.currentColorScheme == ColorScheme.default) {
    uiManager.legendMenuChange('default');
  }
  satSet.satCruncher.postMessage({
    typ: 'offset',
    dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
    setlatlong: true,
    resetObserverGd: true,
    sensor: sensorManager.defaultSensor,
  });
  satSet.satCruncher.postMessage({
    isShowFOVBubble: 'reset',
    isShowSurvFence: 'disable',
  });
  settingsManager.isFOVBubbleModeOn = false;
  settingsManager.isShowSurvFence = false;
  $('#menu-sensor-info').removeClass('bmenu-item-selected');
  $('#menu-fov-bubble').removeClass('bmenu-item-selected');
  $('#menu-surveillance').removeClass('bmenu-item-selected');
  $('#menu-lookangles').removeClass('bmenu-item-selected');
  $('#menu-planetarium').removeClass('bmenu-item-selected');
  $('#menu-astronomy').removeClass('bmenu-item-selected');
  $('#menu-sensor-info').addClass('bmenu-item-disabled');
  $('#menu-fov-bubble').addClass('bmenu-item-disabled');
  $('#menu-surveillance').addClass('bmenu-item-disabled');
  $('#menu-lookangles').addClass('bmenu-item-disabled');
  $('#menu-planetarium').addClass('bmenu-item-disabled');
  $('#menu-astronomy').addClass('bmenu-item-disabled');

  setTimeout(function () {
    satSet.resetSatInView();
    satSet.setColorScheme(settingsManager.currentColorScheme, true);
  }, 2000);
};

var isFooterShown = true;

uiManager.updateURL = () => {
  var arr = window.location.href.split('?');
  var url = arr[0];
  var paramSlices = [];

  if (settingsManager.trusatMode) {
    paramSlices.push('trusat');
  }
  if (objectManager.selectedSat !== -1 && typeof satSet.getSatExtraOnly(objectManager.selectedSat).SCC_NUM != 'undefined') {
    paramSlices.push('sat=' + satSet.getSatExtraOnly(objectManager.selectedSat).SCC_NUM);
  }
  var currentSearch = searchBox.getCurrentSearch();
  if (currentSearch != null) {
    paramSlices.push('search=' + currentSearch);
  }
  if (timeManager.propRate < 0.99 || timeManager.propRate > 1.01) {
    paramSlices.push('rate=' + timeManager.propRate);
  }

  if (timeManager.propOffset < -1000 || timeManager.propOffset > 1000) {
    paramSlices.push('date=' + (timeManager.propRealTime + timeManager.propOffset).toString());
  }

  if (paramSlices.length > 0) {
    url += '?' + paramSlices.join('&');
  }

  window.history.replaceState(null, 'Keeptrack', url);
};

uiManager.lookAtSensor = () => {
  cameraManager.lookAtSensor(sensorManager.selectedSensor.zoom, sensorManager.selectedSensor.lat, sensorManager.selectedSensor.long, timeManager.selectedDate);
};

uiManager.reloadLastSensor = () => {
  let currentSensor;
  try {
    currentSensor = JSON.parse(localStorage.getItem('currentSensor'));
  } catch (e) {
    currentSensor = null;
  }
  if (currentSensor !== null) {
    try {
      // If there is a staticnum set use that
      if (typeof currentSensor[0] == 'undefined' || currentSensor[0] == null) {
        sensorManager.setSensor(null, currentSensor[1]);
        uiManager.getsensorinfo();
        uiManager.legendMenuChange('default');
      } else {
        // If the sensor is a string, load that collection of sensors
        if (typeof currentSensor[0].shortName == 'undefined') {
          sensorManager.setSensor(currentSensor[0], currentSensor[1]);
          uiManager.getsensorinfo();
          uiManager.legendMenuChange('default');
          uiManager.lookAtSensor();
        } else {
          // Seems to be a single sensor without a staticnum, load that
          sensorManager.setSensor(sensorManager.sensorList[currentSensor[0].shortName], currentSensor[1]);
          uiManager.getsensorinfo();
          uiManager.legendMenuChange('default');
          uiManager.lookAtSensor();
        }
      }
    } catch (e) {
      // Clear old settings because they seem corrupted
      localStorage.setItem('currentSensor', null);
      console.warn('Saved Sensor Information Invalid');
    }
  }
};

uiManager.footerToggle = function () {
  if (isFooterShown) {
    isFooterShown = false;
    // uiManager.hideSideMenus();
    $('#sat-infobox').addClass('sat-infobox-fullsize');
    $('#nav-footer').addClass('footer-slide-trans');
    $('#nav-footer').removeClass('footer-slide-up');
    $('#nav-footer').addClass('footer-slide-down');
    $('#nav-footer-toggle').html('&#x25B2;');
  } else {
    isFooterShown = true;
    $('#sat-infobox').removeClass('sat-infobox-fullsize');
    $('#nav-footer').addClass('footer-slide-trans');
    $('#nav-footer').removeClass('footer-slide-down');
    $('#nav-footer').addClass('footer-slide-up');
    $('#nav-footer-toggle').html('&#x25BC;');
  }
  // After 1 second the transition should be complete so lets stop moving slowly
  setTimeout(() => {
    $('#nav-footer').removeClass('footer-slide-trans');
  }, 1000);
};

uiManager.getsensorinfo = () => {
  $('#sensor-latitude').html(sensorManager.currentSensor.lat);
  $('#sensor-longitude').html(sensorManager.currentSensor.long);
  $('#sensor-minazimuth').html(sensorManager.currentSensor.obsminaz);
  $('#sensor-maxazimuth').html(sensorManager.currentSensor.obsmaxaz);
  $('#sensor-minelevation').html(sensorManager.currentSensor.obsminel);
  $('#sensor-maxelevation').html(sensorManager.currentSensor.obsmaxel);
  $('#sensor-minrange').html(sensorManager.currentSensor.obsminrange);
  $('#sensor-maxrange').html(sensorManager.currentSensor.obsmaxrange);
};

let doSearch = (searchString, isPreventDropDown) => {
  if (searchString == '') {
    searchBox.hideResults();
  } else {
    uiManager.doSearch(searchString, isPreventDropDown);
  }
};

uiManager.doSearch = (searchString, isPreventDropDown) => {
  let idList = searchBox.doSearch(searchString, isPreventDropDown, satSet);
  if (settingsManager.isSatOverflyModeOn) {
    satSet.satCruncher.postMessage({
      satelliteSelected: idList,
    });
  }
  // Don't let the search overlap with the legend
  uiManager.legendMenuChange('clear');
  uiManager.updateURL();
};

uiManager.startLowPerf = function () {
  // IDEA: Replace browser variables with localStorage
  // The settings passed as browser variables could be saved as localStorage items
  window.location.replace('index.htm?lowperf');
};

uiManager.toast = (toastText, type, isLong) => {
  let toastMsg = M.toast({
    html: toastText,
  });
  if (isLong) toastMsg.timeRemaining = 100000;
  switch (type) {
    case 'standby':
      toastMsg.$el[0].style.background = '#2dccff';
      break;
    case 'normal':
      toastMsg.$el[0].style.background = '#56f000';
      break;
    case 'caution':
      toastMsg.$el[0].style.background = '#fce83a';
      break;
    case 'serious':
      toastMsg.$el[0].style.background = '#ffb302';
      break;
    case 'critical':
      toastMsg.$el[0].style.background = '#ff3838';
      break;
  }
};

uiManager.saveHiResPhoto = (resolution) => {
  switch (resolution) {
    case 'hd':
      settingsManager.hiResWidth = 1920;
      settingsManager.hiResHeight = 1080;
      break;
    case '4k':
      settingsManager.hiResWidth = 3840;
      settingsManager.hiResHeight = 2160;
      break;
    case '8k':
      settingsManager.hiResWidth = 7680;
      settingsManager.hiResHeight = 4320;
      break;
  }

  settingsManager.screenshotMode = true;
};

// c is string name of star
// TODO: uiManager.panToStar needs to be finished
// Yaw needs fixed. Needs to incorporate a time calculation
/* istanbul ignore next */
uiManager.panToStar = function (c) {
  // Try with the pname
  var satId = satSet.getIdFromStarName(c.pname);
  var sat = satSet.getSat(satId);

  // If null try again with the bf
  if (sat == null) {
    satId = satSet.getIdFromStarName(c.bf);
    sat = satSet.getSat(satId);
  }

  // Star isn't working - give up
  if (sat == null) {
    console.warn(`sat is null!`);
    return;
  }

  lineManager.clear();
  if (objectManager.isStarManagerLoaded) {
    starManager.isAllConstellationVisible = false;
  }

  lineManager.create('ref', [sat.position.x, sat.position.y, sat.position.z], [1, 0.4, 0, 1]);
  cameraManager.cameraType.current = cameraManager.cameraType.offset;
  console.log(sat);
  // ======================================================
  // Need to calculate the time to get the right RA offset
  // ======================================================
  cameraManager.camSnap(cameraManager.latToPitch(sat.dec) * -1, cameraManager.longToYaw(sat.ra * DEG2RAD, timeManager.selectedDate));
  setTimeout(function () {
    // console.log(`pitch ${camPitch * RAD2DEG} -- yaw ${camYaw * RAD2DEG}`);
  }, 2000);
};

uiManager.updateMap = function () {
  if (objectManager.selectedSat === -1) return;
  if (!sMM.isMapMenuOpen) return;
  var sat = satSet.getSat(objectManager.selectedSat);
  var map;
  sat.getTEARR();
  map = mapManager.braun(
    {
      lon: satellite.degreesLong(satellite.currentTEARR.lon),
      lat: satellite.degreesLat(satellite.currentTEARR.lat),
    },
    { meridian: 0, latLimit: 90 }
  );
  map.x = map.x * settingsManager.mapWidth - 10;
  map.y = (map.y / 0.6366197723675813) * settingsManager.mapHeight - 10;
  $('#map-sat').attr('style', 'left:' + map.x + 'px;top:' + map.y + 'px;'); // Set to size of the map image (800x600)
  if (sensorManager.checkSensorSelected()) {
    map = mapManager.braun(
      {
        lon: sensorManager.currentSensor.long,
        lat: sensorManager.currentSensor.lat,
      },
      { meridian: 0, latLimit: 90 }
    );
    map.x = map.x * settingsManager.mapWidth - 10;
    map.y = (map.y / 0.6366197723675813) * settingsManager.mapHeight - 10;
    $('#map-sensor').attr('style', 'left:' + map.x + 'px;top:' + map.y + 'px;z-index:11;'); // Set to size of the map image (800x600)
  }
  for (var i = 1; i <= 50; i++) {
    map = mapManager.braun(
      {
        lon: satellite.map(sat, i).lon,
        lat: satellite.map(sat, i).lat,
      },
      { meridian: 0, latLimit: 90 }
    );
    map.x = map.x * settingsManager.mapWidth - 3.5;
    map.y = (map.y / 0.6366197723675813) * settingsManager.mapHeight - 3.5;
    if (map.y > settingsManager.mapHeight / 2) {
      $('#map-look' + i).tooltip({
        delay: 50,
        html: satellite.map(sat, i).time,
        position: 'top',
      });
    } else {
      $('#map-look' + i).tooltip({
        delay: 50,
        html: satellite.map(sat, i).time,
        position: 'bottom',
      });
    }
    if (satellite.map(sat, i).inview === 1) {
      $('#map-look' + i).attr('src', 'img/yellow-square.png'); // If inview then make yellow
    } else {
      $('#map-look' + i).attr('src', 'img/red-square.png'); // If not inview then make red
    }
    $('#map-look' + i).attr('style', 'left:' + map.x + 'px;top:' + map.y + 'px;'); // Set to size of the map image (800x600)
    $('#map-look' + i).attr('time', satellite.map(sat, i).time);
  }
};

uiManager.onReady = () => {
  // Code Once index.htm is loaded
  if (settingsManager.offline) updateInterval = 250;
  try {
    $('#versionNumber-text')[0].innerHTML = `${settingsManager.versionNumber} - ${settingsManager.versionDate}`;
  } catch (e) {
    //
  }
  uiManager.resize2DMap();
  (function _httpsCheck() {
    if (location.protocol !== 'https:') {
      $('#cs-geolocation').hide();
      $('#geolocation-btn').hide();
    }
  })();

  // Load Bottom icons
  if (!settingsManager.disableUI) {
    $.event.special.touchstart = {
      setup: function (_, ns, handle) {
        if (ns.includes('noPreventDefault')) {
          this.addEventListener('touchstart', handle, { passive: false });
        } else {
          this.addEventListener('touchstart', handle, { passive: true });
        }
      },
    };
  }

  // Version Info Updated
  $('#version-info').html(settingsManager.versionNumber);
  $('#version-info').tooltip({
    delay: 50,
    html: settingsManager.versionDate,
    position: 'top',
  });

  (function _menuInit() {
    // Load the current JDAY
    var jday = timeManager.getDayOfYear(timeManager.propTime());
    $('#jday').html(jday);
    jday = null; // Garbage collect

    // Initialize Materialize
    M.AutoInit();
    // dropdownInstance = M.Dropdown.getInstance($('.dropdown-trigger'));

    // Initialize Navigation and Select Menus
    let elems;
    elems = document.querySelectorAll('.dropdown-button');
    M.Dropdown.init(elems);

    // elems = document.querySelectorAll('select');
    // M.FormSelect.init(elems);

    $('.tooltipped').tooltip({ delay: 50 });

    // Initialize Perfect Scrollbar
    $('#search-results').perfectScrollbar();

    // Initialize the date/time picker
    $('#datetime-input-tb')
      .datetimepicker({
        dateFormat: 'yy-mm-dd',
        timeFormat: 'HH:mm:ss',
        timezone: '+0000',
        gotoCurrent: true,
        addSliderAccess: true,
        // minDate: -14, // No more than 7 days in the past
        // maxDate: 14, // or 7 days in the future to make sure ELSETs are valid
        sliderAccessArgs: { touchonly: false },
      })
      .on('change.dp', function () {
        // This code gets called when the done button is pressed or the time sliders are closed
        $('#datetime-input').fadeOut();
        uiManager.updateNextPassOverlay(true);
        settingsManager.isEditTime = false;
      });

    // Setup Legend Colors
    uiManager.legendColorsChange();

    window.oncontextmenu = function (event) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    };
    $(document).on('cbox_closed', function () {
      if (sMM.isLaunchMenuOpen) {
        sMM.isLaunchMenuOpen = false;
        $('#menu-launches').removeClass('bmenu-item-selected');
      }
    });
  })();

  var isNotColorPickerInitialSetup = false;
  (function _setupColorPicker() {
    var colorPalette = [
      rgbCss([1.0, 0.0, 0.0, 1.0]), // Red
      rgbCss([1.0, 0.75, 0.0, 1.0]), // Orange
      rgbCss([0.85, 0.5, 0.0, 1.0]), // Dark Orange
      rgbCss([1.0, 1.0, 0.0, 1.0]), // Yellow
      rgbCss([0, 1, 0, 1]), // Green
      rgbCss([0.2, 1.0, 0.0, 0.5]), // Mint
      rgbCss([0.2, 1.0, 1.0, 1.0]), // Bright Green
      rgbCss([0, 0, 1, 1]), // Royal Blue
      rgbCss([0.2, 0.4, 1.0, 1]), // Dark Blue
      rgbCss([0.64, 0.0, 0.64, 1.0]), // Purple
      rgbCss([1.0, 0.0, 0.6, 1.0]), // Pink
      rgbCss([0.5, 0.5, 0.5, 1]), // Gray
      rgbCss([1, 1, 1, 1]), // White
    ];
    $('#settings-color-payload').colorPick({
      initialColor: rgbCss(settingsManager.colors.payload),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.payload = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-rocketBody').colorPick({
      initialColor: rgbCss(settingsManager.colors.rocketBody),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.rocketBody = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-debris').colorPick({
      initialColor: rgbCss(settingsManager.colors.debris),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.debris = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-inview').colorPick({
      initialColor: rgbCss(settingsManager.colors.inview),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.inview = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-missile').colorPick({
      initialColor: rgbCss(settingsManager.colors.missile),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.missile = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-missileInview').colorPick({
      initialColor: rgbCss(settingsManager.colors.missileInview),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.missileInview = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-trusat').colorPick({
      initialColor: rgbCss(settingsManager.colors.trusat),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.trusat = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    isNotColorPickerInitialSetup = true;
  })();

  uiManager.clearRMBSubMenu = () => {
    rightBtnSaveMenuDOM.hide();
    rightBtnViewMenuDOM.hide();
    rightBtnEditMenuDOM.hide();
    rightBtnCreateMenuDOM.hide();
    rightBtnColorsMenuDOM.hide();
    rightBtnDrawMenuDOM.hide();
    rightBtnEarthMenuDOM.hide();
  };

  (function _menuController() {
    // Reset time if in retro mode
    if (settingsManager.retro) {
      timeManager.propOffset = new Date(2000, 2, 13) - Date.now();
      $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.propRealTime + timeManager.propOffset));
      satSet.satCruncher.postMessage({
        typ: 'offset',
        dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
      });
    }

    $('#datetime-text').on('click', function () {
      if (!settingsManager.isEditTime) {
        // $('#datetime-text').fadeOut();
        $('#datetime-input').fadeIn();
        $('#datetime-input-tb').trigger('focus');
        settingsManager.isEditTime = true;
      }
    });

    $('.menu-item').on('mouseover', function () {
      $(this).children('.submenu').css({
        display: 'block',
      });
    });

    $('.menu-item').on('mouseout', function () {
      $(this).children('.submenu').css({
        display: 'none',
      });
    });

    $('#search-close').on('click', function () {
      searchBox.hideResults();
      $('#menu-space-stations').removeClass('bmenu-item-selected');
    });

    $('#info-overlay-content').on('click', '.watchlist-object', function (evt) {
      var objNum = evt.currentTarget.textContent.split(':');
      objNum = objNum[0];
      var satId = satSet.getIdFromObjNum(objNum);
      if (satId !== null) {
        objectManager.setSelectedSat(satId);
      }
    });

    $('#bottom-icons').on('click', '.bmenu-item', function (evt) {
      uiManager.bottomIconPress(evt);
    });

    $('#bottom-menu').on('click', '.FOV-object', function (evt) {
      var objNum = evt.currentTarget.textContent;
      objNum = objNum.slice(-5);
      var satId = satSet.getIdFromObjNum(objNum);
      if (satId !== null) {
        objectManager.setSelectedSat(satId);
      }
    });

    uiManager.legendHoverMenuClick = (legendType) => {
      switch (legendType) {
        case 'legend-payload-box':
          if (ColorScheme.objectTypeFlags.payload) {
            ColorScheme.objectTypeFlags.payload = false;
            $('.legend-payload-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.payload = true;
            $('.legend-payload-box').css('background', rgbCss(settingsManager.colors.payload));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-rocketBody-box':
          if (ColorScheme.objectTypeFlags.rocketBody) {
            ColorScheme.objectTypeFlags.rocketBody = false;
            $('.legend-rocketBody-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.rocketBody = true;
            $('.legend-rocketBody-box').css('background', rgbCss(settingsManager.colors.rocketBody));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-debris-box':
          if (ColorScheme.objectTypeFlags.debris) {
            ColorScheme.objectTypeFlags.debris = false;
            $('.legend-debris-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.debris = true;
            $('.legend-debris-box').css('background', rgbCss(settingsManager.colors.debris));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-starHi-box':
          if (ColorScheme.objectTypeFlags.starHi) {
            ColorScheme.objectTypeFlags.starHi = false;
            $('.legend-starHi-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.starHi = true;
            $('.legend-starHi-box').css('background', rgbCss(settingsManager.colors.starHi));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-starMed-box':
          if (ColorScheme.objectTypeFlags.starMed) {
            ColorScheme.objectTypeFlags.starMed = false;
            $('.legend-starMed-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.starMed = true;
            $('.legend-starMed-box').css('background', rgbCss(settingsManager.colors.starMed));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-starLow-box':
          if (ColorScheme.objectTypeFlags.starLow) {
            ColorScheme.objectTypeFlags.starLow = false;
            $('.legend-starLow-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.starLow = true;
            $('.legend-starLow-box').css('background', rgbCss(settingsManager.colors.starLow));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-satHi-box':
          if (ColorScheme.objectTypeFlags.satHi) {
            ColorScheme.objectTypeFlags.satHi = false;
            $('.legend-satHi-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.satHi = true;
            $('.legend-satHi-box').css('background', 'rgb(250, 250, 250)');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-satMed-box':
          if (ColorScheme.objectTypeFlags.satMed) {
            ColorScheme.objectTypeFlags.satMed = false;
            $('.legend-satMed-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.satMed = true;
            $('.legend-satMed-box').css('background', 'rgb(150, 150, 150)');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-satLow-box':
          if (ColorScheme.objectTypeFlags.satLow) {
            ColorScheme.objectTypeFlags.satLow = false;
            $('.legend-satLow-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.satLow = true;
            $('.legend-satLow-box').css('background', 'rgb(200, 200, 200)');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-inFOV-box':
          if (ColorScheme.objectTypeFlags.inFOV) {
            ColorScheme.objectTypeFlags.inFOV = false;
            $('.legend-inFOV-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.inFOV = true;
            $('.legend-inFOV-box').css('background', rgbCss(settingsManager.colors.inview));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-velocityFast-box':
          if (ColorScheme.objectTypeFlags.velocityFast) {
            ColorScheme.objectTypeFlags.velocityFast = false;
            $('.legend-velocityFast-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.velocityFast = true;
            $('.legend-velocityFast-box').css('background', [0, 1, 0.0, 1.0]);
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-velocityMed-box':
          if (ColorScheme.objectTypeFlags.velocityMed) {
            ColorScheme.objectTypeFlags.velocityMed = false;
            $('.legend-velocityMed-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.velocityMed = true;
            $('.legend-velocityMed-box').css('background', [0.5, 0.5, 0.0, 1.0]);
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-velocitySlow-box':
          if (ColorScheme.objectTypeFlags.velocitySlow) {
            ColorScheme.objectTypeFlags.velocitySlow = false;
            $('.legend-velocitySlow-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.velocitySlow = true;
            $('.legend-velocitySlow-box').css('background', [1.0, 0, 0.0, 1.0]);
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-inviewAlt-box':
          if (ColorScheme.objectTypeFlags.inviewAlt) {
            ColorScheme.objectTypeFlags.inviewAlt = false;
            $('.legend-inviewAlt-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.inviewAlt = true;
            $('.legend-inviewAlt-box').css('background', rgbCss(settingsManager.colors.inviewAlt));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-ageNew-box':
          if (ColorScheme.objectTypeFlags.ageNew) {
            ColorScheme.objectTypeFlags.ageNew = false;
            $('.legend-ageNew-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.ageNew = true;
            $('.legend-ageNew-box').css('background', rgbCss(settingsManager.colors.ageNew));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-ageMed-box':
          if (ColorScheme.objectTypeFlags.ageMed) {
            ColorScheme.objectTypeFlags.ageMed = false;
            $('.legend-ageMed-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.ageMed = true;
            $('.legend-ageMed-box').css('background', rgbCss(settingsManager.colors.ageMed));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-ageOld-box':
          if (ColorScheme.objectTypeFlags.ageOld) {
            ColorScheme.objectTypeFlags.ageOld = false;
            $('.legend-ageOld-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.ageOld = true;
            $('.legend-ageOld-box').css('background', rgbCss(settingsManager.colors.ageOld));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-ageLost-box':
          if (ColorScheme.objectTypeFlags.ageLost) {
            ColorScheme.objectTypeFlags.ageLost = false;
            $('.legend-ageLost-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.ageLost = true;
            $('.legend-ageLost-box').css('background', rgbCss(settingsManager.colors.ageLost));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-rcsSmall-box':
          if (ColorScheme.objectTypeFlags.rcsSmall) {
            ColorScheme.objectTypeFlags.rcsSmall = false;
            $('.legend-rcsSmall-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.rcsSmall = true;
            $('.legend-rcsSmall-box').css('background', rgbCss(settingsManager.colors.rcsSmall));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-rcsMed-box':
          if (ColorScheme.objectTypeFlags.rcsMed) {
            ColorScheme.objectTypeFlags.rcsMed = false;
            $('.legend-rcsMed-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.rcsMed = true;
            $('.legend-rcsMed-box').css('background', rgbCss(settingsManager.colors.rcsMed));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-rcsLarge-box':
          if (ColorScheme.objectTypeFlags.rcsLarge) {
            ColorScheme.objectTypeFlags.rcsLarge = false;
            $('.legend-rcsLarge-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.rcsLarge = true;
            $('.legend-rcsLarge-box').css('background', rgbCss(settingsManager.colors.rcsLarge));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-rcsUnknown-box':
          if (ColorScheme.objectTypeFlags.rcsUnknown) {
            ColorScheme.objectTypeFlags.rcsUnknown = false;
            $('.legend-rcsUnknown-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.rcsUnknown = true;
            $('.legend-rcsUnknown-box').css('background', rgbCss(settingsManager.colors.rcsUnknown));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-missile-box':
          if (ColorScheme.objectTypeFlags.missile) {
            ColorScheme.objectTypeFlags.missile = false;
            $('.legend-missile-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.missile = true;
            $('.legend-missile-box').css('background', rgbCss(settingsManager.colors.missile));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-missileInview-box':
          if (ColorScheme.objectTypeFlags.missileInview) {
            ColorScheme.objectTypeFlags.missileInview = false;
            $('.legend-missileInview-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.missileInview = true;
            $('.legend-missileInview-box').css('background', rgbCss(settingsManager.colors.missileInview));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-sensor-box':
          if (ColorScheme.objectTypeFlags.sensor) {
            ColorScheme.objectTypeFlags.sensor = false;
            $('.legend-sensor-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.sensor = true;
            $('.legend-sensor-box').css('background', rgbCss(settingsManager.colors.sensor));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-facility-box':
          if (ColorScheme.objectTypeFlags.facility) {
            ColorScheme.objectTypeFlags.facility = false;
            $('.legend-facility-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.facility = true;
            $('.legend-facility-box').css('background', rgbCss(settingsManager.colors.facility));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-trusat-box':
          if (ColorScheme.objectTypeFlags.trusat) {
            ColorScheme.objectTypeFlags.trusat = false;
            $('.legend-trusat-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.trusat = true;
            $('.legend-trusat-box').css('background', rgbCss(settingsManager.colors.trusat));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        // No benefit to disabling the only color
        // case "legend-satLEO-box":
        //   if (ColorScheme.objectTypeFlags.satLEO) {
        //     ColorScheme.objectTypeFlags.satLEO = false;
        //     $('.legend-satLEO-box').css('background', 'black');
        //     settingsManager.isForceColorScheme = true;
        //     satSet.setColorScheme(settingsManager.currentColorScheme, true);
        //   } else {
        //     ColorScheme.objectTypeFlags.satLEO = true;
        //     $('.legend-satLEO-box').css('background', rgbCss(settingsManager.colors.satLEO));
        //     settingsManager.isForceColorScheme = true;
        //     satSet.setColorScheme(settingsManager.currentColorScheme, true);
        //   }
        //   break;
        // case "legend-satGEO-box":
        //   if (ColorScheme.objectTypeFlags.satGEO) {
        //     ColorScheme.objectTypeFlags.satGEO = false;
        //     $('.legend-satGEO-box').css('background', 'black');
        //     settingsManager.isForceColorScheme = true;
        //     satSet.setColorScheme(settingsManager.currentColorScheme, true);
        //   } else {
        //     ColorScheme.objectTypeFlags.satGEO = true;
        //     $('.legend-satGEO-box').css('background', rgbCss(settingsManager.colors.satGEO));
        //     settingsManager.isForceColorScheme = true;
        //     satSet.setColorScheme(settingsManager.currentColorScheme, true);
        //   }
        //   break;
        case 'legend-countryUS-box':
          if (ColorScheme.objectTypeFlags.countryUS) {
            ColorScheme.objectTypeFlags.countryUS = false;
            $('.legend-countryUS-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.countryUS = true;
            $('.legend-countryUS-box').css('background', rgbCss(settingsManager.colors.countryUS));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-countryCIS-box':
          if (ColorScheme.objectTypeFlags.countryCIS) {
            ColorScheme.objectTypeFlags.countryCIS = false;
            $('.legend-countryCIS-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.countryCIS = true;
            $('.legend-countryCIS-box').css('background', rgbCss(settingsManager.colors.countryCIS));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-countryPRC-box':
          if (ColorScheme.objectTypeFlags.countryPRC) {
            ColorScheme.objectTypeFlags.countryPRC = false;
            $('.legend-countryPRC-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.countryPRC = true;
            $('.legend-countryPRC-box').css('background', rgbCss(settingsManager.colors.countryPRC));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        case 'legend-countryOther-box':
          if (ColorScheme.objectTypeFlags.countryOther) {
            ColorScheme.objectTypeFlags.countryOther = false;
            $('.legend-countryOther-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.countryOther = true;
            $('.legend-countryOther-box').css('background', rgbCss(settingsManager.colors.countryOther));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
        default:
          break;
      }
    };

    $('#legend-hover-menu').on('click', function (e) {
      uiManager.legendHoverMenuClick(e.target.classList[1]);
    });

    $('#time-machine-icon').on('click', function () {
      if ($('#time-machine-menu').css('display') === 'block') {
        $('#time-machine-menu').hide();
      } else {
        $('#time-machine-menu').show();
        searchBox.hideResults();
        $('#search-results').hide();
      }
    });

    $('#legend-menu').on('click', function () {
      if (settingsManager.legendMenuOpen) {
        $('#legend-hover-menu').hide();
        settingsManager.legendMenuOpen = false;
      } else {
        // uiManager.legendColorsChange(); // Disabled colors show up again.
        $('#legend-hover-menu').show();
        searchBox.hideResults();
        $('#search-results').hide();
        settingsManager.legendMenuOpen = true;
      }
    });

    $('.menu-selectable').on('click', function () {
      if (objectManager.selectedSat !== -1) {
        $('#menu-lookangles').removeClass('bmenu-item-disabled');
        $('#menu-satview').removeClass('bmenu-item-disabled');
      }
      if (sMM.watchlistList.length > 0) {
        $('#menu-info-overlay').removeClass('bmenu-item-disabled');
      }
    });

    $('#sensor-list-content > div > ul > .menu-selectable').on('click', function () {
      adviceList.sensor();

      switch (this.dataset.sensor) {
        case 'cspocAll':
          adviceList.cspocSensors();
          sensorManager.setSensor('SSN');
          break;
        case 'mwAll':
          adviceList.mwSensors();
          sensorManager.setSensor('NATO-MW');
          break;
        case 'mdAll':
          sensorManager.setSensor('MD-ALL');
          break;
        case 'llAll':
          sensorManager.setSensor('LEO-LABS');
          break;
        case 'rusAll':
          sensorManager.setSensor('RUS-ALL');
          break;
        default:
          sensorManager.setSensor(sensorManager.sensorList[`${this.dataset.sensor}`]);
          break;
      }

      uiManager.getsensorinfo();

      try {
        uiManager.lookAtSensor();
      } catch (e) {
        // TODO: More intentional conditional statement
        // Multi-sensors break this
      }
      if (settingsManager.currentColorScheme == ColorScheme.default) {
        uiManager.legendMenuChange('default');
      }
    });

    $('#reset-sensor-button').on('click', function () {
      settingsManager.isForceColorScheme = false;
      $('#menu-sensor-info').addClass('bmenu-item-disabled');
      $('#menu-fov-bubble').addClass('bmenu-item-disabled');
      $('#menu-surveillance').addClass('bmenu-item-disabled');
      $('#menu-planetarium').addClass('bmenu-item-disabled');
      $('#menu-astronomy').addClass('bmenu-item-disabled');
      _resetSensorSelected();
    });

    $('#datetime-input-form').on('change', function (e) {
      let selectedDate = $('#datetime-input-tb').datepicker('getDate');
      let today = new Date();
      let jday = timeManager.getDayOfYear(timeManager.propTime());
      $('#jday').html(jday);
      console.warn(timeManager.propOffset);
      timeManager.propOffset = selectedDate - today;
      console.warn(timeManager.propOffset);
      satSet.satCruncher.postMessage({
        typ: 'offset',
        dat: timeManager.propOffset.toString() + ' ' + (1.0).toString(),
      });
      timeManager.propRealTime = Date.now();
      timeManager.propTime();
      // Reset last update times when going backwards in time
      lastOverlayUpdateTime = timeManager.now * 1 - 7000;
      lastBoxUpdateTime = timeManager.now;
      uiManager.updateNextPassOverlay(true);

      // satSet.findRadarDataFirstDataTime();

      e.preventDefault();
    });
  })();

  var satChngTable = [];
  uiManager.satChng = function (row) {
    if (row === -1 && satChngTable.length === 0) {
      // Only generate the table if receiving the -1 argument for the first time
      $.get('/analysis/satchng.json?v=' + settingsManager.versionNumber).done(function (resp) {
        resp = [...new Set(resp)];
        for (let i = 0; i < resp.length; i++) {
          var prefix = resp[i].year > 50 ? '19' : '20';
          var year = parseInt(prefix + resp[i].year.toString());
          var date = timeManager.dateFromDay(year, resp[i].day);
          date = new Date(date.getTime() + (resp[i].day % 1) * 1440 * 60000);
          resp[i].date = date;
        }
        satChngTable = resp;
        // satChng Menu
        var tbl = document.getElementById('satChng-table'); // Identify the table to update
        tbl.innerHTML = ''; // Clear the table from old object data
        // var tblLength = 0;                                   // Iniially no rows to the table

        var tr = tbl.insertRow();
        var tdT = tr.insertCell();
        tdT.appendChild(document.createTextNode('Time'));
        tdT.setAttribute('style', 'text-decoration: underline');
        var tdSat = tr.insertCell();
        tdSat.appendChild(document.createTextNode('Sat'));
        tdSat.setAttribute('style', 'text-decoration: underline');
        var tdInc = tr.insertCell();
        tdInc.appendChild(document.createTextNode('Inc'));
        tdInc.setAttribute('style', 'text-decoration: underline');
        var tdPer = tr.insertCell();
        tdPer.appendChild(document.createTextNode('Per'));
        tdPer.setAttribute('style', 'text-decoration: underline');

        for (let i = 0; i < Math.min(satChngTable.length, 20); i++) {
          // 20 rows
          tr = tbl.insertRow();
          tr.setAttribute('class', 'satChng-object link');
          tr.setAttribute('hiddenrow', i);
          tdT = tr.insertCell();
          var dateStr = satChngTable[i].date.toJSON();
          var timeTextStr = '';
          for (var iText = 0; iText < 20; iText++) {
            if (iText < 10) timeTextStr += dateStr[iText];
            if (iText === 10) timeTextStr += ' ';
            if (iText > 11) timeTextStr += dateStr[iText - 1];
          }
          tdT.appendChild(document.createTextNode(timeTextStr));
          tdSat = tr.insertCell();
          tdSat.appendChild(document.createTextNode(satChngTable[i].SCC));
          tdInc = tr.insertCell();
          tdInc.appendChild(document.createTextNode(satChngTable[i].inc.toFixed(2)));
          tdPer = tr.insertCell();
          let deltaMeanMo = satChngTable[i].meanmo;
          let sat = satSet.getSat(satSet.getIdFromObjNum(satChngTable[i].SCC));
          let origPer = 1440 / (parseFloat(sat.meanMotion) + deltaMeanMo);
          let perDelta = 1440 / parseFloat(sat.meanMotion) - origPer;
          tdPer.appendChild(document.createTextNode(perDelta.toFixed(2)));
        }
      });
    }
    if (row !== -1) {
      // If an object was selected from the menu
      uiManager.doSearch(satChngTable[row].SCC); // Actually perform the search of the two objects
      $('#anal-sat').val(satChngTable[row].SCC);
    } // If a row was selected
  };

  // Resizing Listener
  $(window).on('resize', function () {
    if (!settingsManager.disableUI) {
      uiManager.resize2DMap();
    }
    mobileManager.checkMobileMode();
    if (!settingsManager.disableUI) {
      if (settingsManager.screenshotMode) {
        bodyDOM.css('overflow', 'visible');
        $('#canvas-holder').css('overflow', 'visible');
        $('#canvas-holder').width = 3840;
        $('#canvas-holder').height = 2160;
        bodyDOM.width = 3840;
        bodyDOM.height = 2160;
      } else {
        bodyDOM.css('overflow', 'hidden');
        $('#canvas-holder').css('overflow', 'hidden');
      }
    }
    settingsManager.isResizing = true;
  });

  uiManager.bottomIconPress = (evt) => {
    switch (evt.currentTarget.id) {
      case 'menu-sensor-list': // No Keyboard Commands
        if (sMM.isSensorListMenuOpen) {
          uiManager.hideSideMenus();
          sMM.isSensorListMenuOpen = false;
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#sensor-list-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isSensorListMenuOpen = true;
          $('#menu-sensor-list').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-info-overlay':
        if (!sensorManager.checkSensorSelected()) {
          // No Sensor Selected
          uiManager.toast(`Select a Sensor First!`, 'caution', true);
          if (!$('#menu-info-overlay:animated').length) {
            $('#menu-info-overlay').effect('shake', {
              distance: 10,
            });
          }
          break;
        }
        if (sMM.isInfoOverlayMenuOpen) {
          sMM.isInfoOverlayMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (sMM.watchlistList.length === 0 && !sMM.isWatchlistChanged) {
            uiManager.toast(`Add Satellites to Watchlist!`, 'caution');
            if (!$('#menu-info-overlay:animated').length) {
              $('#menu-info-overlay').effect('shake', {
                distance: 10,
              });
            }
            sMM.nextPassArray = [];
            break;
          }
          uiManager.hideSideMenus();
          if (sMM.nextPassArray.length === 0 || nextPassEarliestTime > timeManager.now || new Date(nextPassEarliestTime * 1 + 1000 * 60 * 60 * 24) < timeManager.now || sMM.isWatchlistChanged) {
            $('#loading-screen').fadeIn(1000, function () {
              sMM.nextPassArray = [];
              for (var x = 0; x < sMM.watchlistList.length; x++) {
                sMM.nextPassArray.push(satSet.getSatExtraOnly(sMM.watchlistList[x]));
              }
              sMM.nextPassArray = satellite.nextpassList(sMM.nextPassArray);
              sMM.nextPassArray.sort(function (a, b) {
                return new Date(a.time) - new Date(b.time);
              });
              nextPassEarliestTime = timeManager.now;
              lastOverlayUpdateTime = 0;
              uiManager.updateNextPassOverlay(true);
              $('#loading-screen').fadeOut('slow');
              sMM.isWatchlistChanged = false;
            });
          } else {
            uiManager.updateNextPassOverlay(true);
          }

          $('#info-overlay-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-info-overlay').addClass('bmenu-item-selected');
          sMM.isInfoOverlayMenuOpen = true;
          break;
        }
      case 'menu-sensor-info': // No Keyboard Commands
        if (!sensorManager.checkSensorSelected()) {
          // No Sensor Selected
          adviceList.sensorInfoDisabled();
          uiManager.toast(`Select a Sensor First!`, 'caution');
          if (!$('#menu-sensor-info:animated').length) {
            $('#menu-sensor-info').effect('shake', {
              distance: 10,
            });
          }
          break;
        }
        if (sMM.isSensorInfoMenuOpen) {
          uiManager.hideSideMenus();
          sMM.isSensorInfoMenuOpen = false;
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          uiManager.getsensorinfo();
          $('#sensor-info-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isSensorInfoMenuOpen = true;
          $('#menu-sensor-info').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-lookangles': // S
        if (sMM.isLookanglesMenuOpen) {
          sMM.isLookanglesMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          let sat = satSet.getSatExtraOnly(objectManager.selectedSat);
          if (sat == null) return;

          if (!sensorManager.checkSensorSelected() || sat.static || sat.missile || objectManager.selectedSat === -1) {
            // No Sensor or Satellite Selected
            adviceList.lookanglesDisabled();
            uiManager.toast(`Select a Satellite First!`, 'caution');
            if (!$('#menu-lookangles:animated').length) {
              $('#menu-lookangles').effect('shake', {
                distance: 10,
              });
            }
            break;
          }
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          sMM.isLookanglesMenuOpen = true;
          $('#loading-screen').fadeIn(1000, function () {
            satellite.getlookangles(sat);
            $('#menu-lookangles').addClass('bmenu-item-selected');
            $('#loading-screen').fadeOut('slow');
            $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          });
          break;
        }
      case 'menu-dops': // S
        if (sMM.isDOPMenuOpen) {
          sMM.isDOPMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          uiManager.hideSideMenus();
          sMM.isDOPMenuOpen = true;
          $('#loading-screen').fadeIn(1000, function () {
            var lat = $('#dops-lat').val() * 1;
            var lon = $('#dops-lon').val() * 1;
            var alt = $('#dops-alt').val() * 1;
            var el = $('#dops-el').val() * 1;
            settingsManager.gpsElevationMask = el;
            satellite.getDOPsTable(lat, lon, alt);
            $('#menu-dops').addClass('bmenu-item-selected');
            $('#loading-screen').fadeOut('slow');
            $('#dops-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          });
        }
        break;
      case 'menu-watchlist': // S
        if (sMM.isWatchlistMenuOpen) {
          sMM.isWatchlistMenuOpen = false;
          $('#menu-watchlist').removeClass('bmenu-item-selected');
          // $('#search-holder').hide();
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#watchlist-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          // uiManager.searchToggle(true);
          sMM.updateWatchlist();
          sMM.isWatchlistMenuOpen = true;
          $('#menu-watchlist').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-analysis':
        if (sMM.isAnalysisMenuOpen) {
          sMM.isAnalysisMenuOpen = false;
          $('#menu-analysis').removeClass('bmenu-item-selected');
          uiManager.hideSideMenus();
          break;
        } else {
          uiManager.hideSideMenus();
          sMM.isAnalysisMenuOpen = true;
          if (objectManager.selectedSat != -1) {
            let sat = satSet.getSat(objectManager.selectedSat);
            $('#anal-sat').val(sat.SCC_NUM);
          }
          if (sensorManager.checkSensorSelected()) {
            $('#anal-type').html(
              `<optgroup label="Orbital Parameters">
                <option value='inc'>Inclination</option>
                <option value='ap'>Apogee</option>
                <option value='pe'>Perigee</option>
                <option value='per'>Period</option>
                <option value='e'>Eccentricity</option>
                <option value='ra'>RAAN</option>
                <option value='all'>All</option>
              </optgroup>
              <optgroup id="anal-look-opt" label="Look Angles">
                <option value='az'>Azimuth</option>
                <option value='el'>Elevation</option>
                <option value='rng'>Range</option>
                <option value='rae'>All</option>
              </optgroup>`
            );
          } else {
            $('#anal-type').html(
              `<optgroup label="Orbital Parameters">
                <option value='inc'>Inclination</option>
                <option value='ap'>Apogee</option>
                <option value='pe'>Perigee</option>
                <option value='per'>Period</option>
                <option value='e'>Eccentricity</option>
                <option value='ra'>RAAN</option>
                <option value='all'>All</option>
              </optgroup>`
            );
          }
          // Reinitialize the Material CSS Code
          let elems = document.querySelectorAll('select');
          M.FormSelect.init(elems);

          $('#analysis-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-analysis').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-external':
        if (sMM.isExternalMenuOpen) {
          sMM.isExternalMenuOpen = false;
          $('#menu-external').removeClass('bmenu-item-selected');
          uiManager.hideSideMenus();
          break;
        } else {
          uiManager.hideSideMenus();
          $('#external-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.updateWatchlist();
          sMM.isExternalMenuOpen = true;
          $('#menu-external').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-lookanglesmultisite':
        if (sMM.isLookanglesMultiSiteMenuOpen) {
          sMM.isLookanglesMultiSiteMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (objectManager.selectedSat === -1) {
            // No Satellite Selected
            adviceList.ssnLookanglesDisabled();
            uiManager.toast(`Select a Satellite First!`, 'caution');
            if (!$('#menu-lookanglesmultisite:animated').length) {
              $('#menu-lookanglesmultisite').effect('shake', {
                distance: 10,
              });
            }
            break;
          }
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          sMM.isLookanglesMultiSiteMenuOpen = true;
          $('#menu-lookanglesmultisite').addClass('bmenu-item-selected');
          if (objectManager.selectedSat !== -1) {
            $('#loading-screen').fadeIn(1000, function () {
              let sat = satSet.getSatExtraOnly(objectManager.selectedSat);
              satellite.getlookanglesMultiSite(sat);
              $('#loading-screen').fadeOut('slow');
              $('#lookanglesmultisite-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            });
          }
          break;
        }
      case 'menu-find-sat': // F
        if (sMM.isFindByLooksMenuOpen) {
          sMM.isFindByLooksMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#findByLooks-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isFindByLooksMenuOpen = true;
          $('#menu-find-sat').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-twitter': // T
        if (sMM.isTwitterMenuOpen) {
          sMM.isTwitterMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          if ($('#twitter-menu').is(':empty')) {
            $('#twitter-menu').html(
              '<a class="twitter-timeline" data-theme="dark" data-link-color="#2B7BB9" href="https://twitter.com/RedKosmonaut/lists/space-news">A Twitter List by RedKosmonaut</a> <script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>'
            );
          }
          $('#twitter-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isTwitterMenuOpen = true;
          $('#menu-twitter').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-map': // W
        if (sMM.isMapMenuOpen) {
          sMM.isMapMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        }
        if (!sMM.isMapMenuOpen) {
          if (objectManager.selectedSat === -1) {
            // No Satellite Selected
            adviceList.mapDisabled();
            uiManager.toast(`Select a Satellite First!`, 'caution');
            if (!$('#menu-map:animated').length) {
              $('#menu-map').effect('shake', {
                distance: 10,
              });
            }
            break;
          }
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#map-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isMapMenuOpen = true;
          uiManager.updateMap();
          var satData = satSet.getSatExtraOnly(objectManager.selectedSat);
          $('#map-sat').tooltip({
            delay: 50,
            html: satData.SCC_NUM,
            position: 'left',
          });
          $('#menu-map').addClass('bmenu-item-selected');
          break;
        }
        break;
      case 'menu-launches': // L
        if (sMM.isLaunchMenuOpen) {
          sMM.isLaunchMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          settingsManager.isPreventColorboxClose = true;
          setTimeout(function () {
            settingsManager.isPreventColorboxClose = false;
          }, 2000);
          try {
            if (location.protocol === 'https:') {
              $.colorbox({
                href: 'https://space.skyrocket.de/doc_chr/lau2020.htm',
                iframe: true,
                width: '80%',
                height: '80%',
                fastIframe: false,
                closeButton: false,
              });
            } else {
              $.colorbox({
                href: 'http://space.skyrocket.de/doc_chr/lau2020.htm',
                iframe: true,
                width: '80%',
                height: '80%',
                fastIframe: false,
                closeButton: false,
              });
            }
          } catch (error) {
            console.warn(error);
          }
          sMM.isLaunchMenuOpen = true;
          $('#menu-launches').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-about': // No Keyboard Shortcut
        if (sMM.isAboutSelected) {
          sMM.isAboutSelected = false;
          uiManager.hideSideMenus();
          break;
        } else {
          uiManager.hideSideMenus();
          $('#about-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isAboutSelected = true;
          $('#menu-about').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-satellite-collision': // No Keyboard Shortcut
        if (sMM.isSocratesMenuOpen) {
          sMM.isSocratesMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#socrates-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isSocratesMenuOpen = true;
          sMM.socrates(-1);
          $('#menu-satellite-collision').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-satChng': // No Keyboard Shortcut
        if (sMM.issatChngMenuOpen) {
          sMM.issatChngMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#satChng-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.issatChngMenuOpen = true;
          uiManager.satChng(-1);
          $('#menu-satChng').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-obfit': // T
        if (sMM.isObfitMenuOpen) {
          sMM.isObfitMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#obfit-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isObfitMenuOpen = true;
          $('#menu-obfit').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-settings': // T
        if (sMM.isSettingsMenuOpen) {
          sMM.isSettingsMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#settings-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isSettingsMenuOpen = true;
          $('#menu-settings').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-editSat':
        if (sMM.isEditSatMenuOpen) {
          sMM.isEditSatMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (objectManager.selectedSat !== -1) {
            if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
            uiManager.hideSideMenus();
            $('#editSat-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            $('#menu-editSat').addClass('bmenu-item-selected');
            sMM.isEditSatMenuOpen = true;

            let sat = satSet.getSatExtraOnly(objectManager.selectedSat);
            $('#es-scc').val(sat.SCC_NUM);

            var inc = (sat.inclination * RAD2DEG).toPrecision(7);
            inc = inc.split('.');
            inc[0] = inc[0].substr(-3, 3);
            inc[1] = inc[1].substr(0, 4);
            inc = (inc[0] + '.' + inc[1]).toString();

            $('#es-inc').val(stringPad.pad0(inc, 8));
            $('#es-year').val(sat.TLE1.substr(18, 2));
            $('#es-day').val(sat.TLE1.substr(20, 12));
            $('#es-meanmo').val(sat.TLE2.substr(52, 11));

            var rasc = (sat.raan * RAD2DEG).toPrecision(7);
            rasc = rasc.split('.');
            rasc[0] = rasc[0].substr(-3, 3);
            rasc[1] = rasc[1].substr(0, 4);
            rasc = (rasc[0] + '.' + rasc[1]).toString();

            $('#es-rasc').val(stringPad.pad0(rasc, 8));
            $('#es-ecen').val(sat.eccentricity.toPrecision(7).substr(2, 7));

            var argPe = (sat.argPe * RAD2DEG).toPrecision(7);
            argPe = argPe.split('.');
            argPe[0] = argPe[0].substr(-3, 3);
            argPe[1] = argPe[1].substr(0, 4);
            argPe = (argPe[0] + '.' + argPe[1]).toString();

            $('#es-argPe').val(stringPad.pad0(argPe, 8));
            $('#es-meana').val(sat.TLE2.substr(44 - 1, 7 + 1));
            // $('#es-rasc').val(sat.TLE2.substr(18 - 1, 7 + 1).toString());
          } else {
            adviceList.editSatDisabled();
            uiManager.toast(`Select a Satellite First!`, 'caution');
            if (!$('#menu-editSat:animated').length) {
              $('#menu-editSat').effect('shake', {
                distance: 10,
              });
            }
          }
        }
        break;
      case 'menu-newLaunch':
        if (sMM.isNewLaunchMenuOpen) {
          sMM.isNewLaunchMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (objectManager.selectedSat !== -1) {
            if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
            uiManager.hideSideMenus();
            $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            $('#menu-newLaunch').addClass('bmenu-item-selected');
            sMM.isNewLaunchMenuOpen = true;

            let sat = satSet.getSatExtraOnly(objectManager.selectedSat);
            $('#nl-scc').val(sat.SCC_NUM);
            $('#nl-inc').val((sat.inclination * RAD2DEG).toPrecision(2));
          } else {
            adviceList.newLaunchDisabled();
            uiManager.toast(`Select a Satellite First!`, 'caution');
            if (!$('#menu-newLaunch:animated').length) {
              $('#menu-newLaunch').effect('shake', {
                distance: 10,
              });
            }
          }
          break;
        }
      case 'menu-breakup':
        if (sMM.isBreakupMenuOpen) {
          sMM.isBreakupMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (objectManager.selectedSat !== -1) {
            if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
            uiManager.hideSideMenus();
            $('#breakup-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            $('#menu-breakup').addClass('bmenu-item-selected');
            sMM.isBreakupMenuOpen = true;

            let sat = satSet.getSatExtraOnly(objectManager.selectedSat);
            $('#hc-scc').val(sat.SCC_NUM);
          } else {
            adviceList.breakupDisabled();
            uiManager.toast(`Select a Satellite First!`, 'caution');
            if (!$('#menu-breakup:animated').length) {
              $('#menu-breakup').effect('shake', {
                distance: 10,
              });
            }
          }
          break;
        }
      case 'menu-customSensor': // T
        if (sMM.isCustomSensorMenuOpen) {
          sMM.isCustomSensorMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();

          if (sensorManager.checkSensorSelected()) {
            $('#cs-lat').val(sensorManager.selectedSensor.lat);
            $('#cs-lon').val(sensorManager.selectedSensor.long);
            $('#cs-hei').val(sensorManager.selectedSensor.obshei);
          }
          $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isCustomSensorMenuOpen = true;
          $('#menu-customSensor').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-missile':
        if (sMM.isMissileMenuOpen) {
          sMM.isMissileMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#missile-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-missile').addClass('bmenu-item-selected');
          sMM.isMissileMenuOpen = true;
          break;
        }
      case 'menu-fov-bubble': // No Keyboard Commands
        if (!sensorManager.checkSensorSelected()) {
          // No Sensor Selected
          adviceList.bubbleDisabled();
          uiManager.toast(`Select a Sensor First!`, 'caution');
          if (!$('#menu-fov-bubble:animated').length) {
            $('#menu-fov-bubble').effect('shake', {
              distance: 10,
            });
          }
          break;
        }
        if (settingsManager.isFOVBubbleModeOn && !settingsManager.isShowSurvFence) {
          settingsManager.isFOVBubbleModeOn = false;
          $('#menu-fov-bubble').removeClass('bmenu-item-selected');
          satSet.satCruncher.postMessage({
            isShowFOVBubble: 'reset',
            isShowSurvFence: 'disable',
          });
          break;
        } else {
          // Disable Satellite Overfly
          settingsManager.isSatOverflyModeOn = false;
          $('#menu-sat-fov').removeClass('bmenu-item-selected');

          settingsManager.isFOVBubbleModeOn = true;
          settingsManager.isShowSurvFence = false;
          $('#menu-fov-bubble').addClass('bmenu-item-selected');
          $('#menu-surveillance').removeClass('bmenu-item-selected');
          satSet.satCruncher.postMessage({
            isShowSatOverfly: 'reset',
            isShowFOVBubble: 'enable',
            isShowSurvFence: 'disable',
          });
          break;
        }
      case 'menu-surveillance': // No Keyboard Commands
        if (!sensorManager.checkSensorSelected()) {
          // No Sensor Selected
          adviceList.survFenceDisabled();
          uiManager.toast(`Select a Sensor First!`, 'caution');
          if (!$('#menu-surveillance:animated').length) {
            $('#menu-surveillance').effect('shake', {
              distance: 10,
            });
          }
          break;
        }
        if (settingsManager.isShowSurvFence) {
          settingsManager.isShowSurvFence = false;
          $('#menu-surveillance').removeClass('bmenu-item-selected');
          satSet.satCruncher.postMessage({
            isShowSurvFence: 'disable',
            isShowFOVBubble: 'reset',
          });
          break;
        } else {
          // Disable Satellite Overfly
          settingsManager.isSatOverflyModeOn = false;
          $('#menu-sat-fov').removeClass('bmenu-item-selected');

          settingsManager.isShowSurvFence = true;
          $('#menu-surveillance').addClass('bmenu-item-selected');
          $('#menu-fov-bubble').removeClass('bmenu-item-selected');
          satSet.satCruncher.postMessage({
            isShowSatOverfly: 'reset',
            isShowFOVBubble: 'enable',
            isShowSurvFence: 'enable',
          });
          break;
        }
      case 'menu-sat-fov': // No Keyboard Commands
        if (objectManager.selectedSat === -1 && $('#search').val() === '') {
          // No Sat Selected and No Search Present
          adviceList.satFOVDisabled();
          uiManager.toast(`Select a Satellite First!`, 'caution');
          if (!$('#menu-sat-fov:animated').length) {
            $('#menu-sat-fov').effect('shake', {
              distance: 10,
            });
          }
          break;
        }
        if (settingsManager.isSatOverflyModeOn) {
          settingsManager.isSatOverflyModeOn = false;
          $('#menu-sat-fov').removeClass('bmenu-item-selected');
          satSet.satCruncher.postMessage({
            isShowSatOverfly: 'reset',
          });
          break;
        } else {
          $('#menu-fov-bubble').removeClass('bmenu-item-selected');
          $('#menu-surveillance').removeClass('bmenu-item-selected');
          settingsManager.isShowSurvFence = false;
          settingsManager.isFOVBubbleModeOn = false;

          settingsManager.isSatOverflyModeOn = true;

          if ($('#search').val() !== '') {
            // If Group Selected
            uiManager.doSearch($('#search').val());
          }

          var satFieldOfView = $('#satFieldOfView').val() * 1;
          $('#menu-sat-fov').addClass('bmenu-item-selected');
          satSet.satCruncher.postMessage({
            isShowFOVBubble: 'reset',
            isShowSurvFence: 'disable',
            isShowSatOverfly: 'enable',
            selectedSatFOV: satFieldOfView,
          });
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          break;
        }
      case 'menu-day-night': // No Keyboard Commands
        if (drawManager.sceneManager.earth.isDayNightToggle()) {
          drawManager.sceneManager.earth.isDayNightToggle(false);
          $('#menu-day-night').removeClass('bmenu-item-selected');
          break;
        } else {
          drawManager.sceneManager.earth.isDayNightToggle(true);
          $('#menu-day-night').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-time-machine':
        if (orbitManager.isTimeMachineRunning) {
          // Merge to one variable?
          orbitManager.isTimeMachineRunning = false;
          orbitManager.isTimeMachineVisible = false;

          settingsManager.colors.transparent = orbitManager.tempTransColor;
          try {
            groups.clearSelect();
          } catch {
            // Intentionally Blank
          }
          satSet.setColorScheme(ColorScheme.default, true); // force color recalc

          $('#menu-time-machine').removeClass('bmenu-item-selected');
          break;
        } else {
          // Merge to one variable?
          orbitManager.isTimeMachineRunning = true;
          orbitManager.isTimeMachineVisible = true;
          $('#menu-time-machine').addClass('bmenu-item-selected');
          orbitManager.historyOfSatellitesPlay();
          break;
        }
      case 'menu-photo':
        uiManager.saveHiResPhoto('4k');
        break;
      case 'menu-color-scheme': // No Keyboard Commands
        if (sMM.isColorSchemeMenuOpen) {
          uiManager.hideSideMenus();
          sMM.isColorSchemeMenuOpen = false;
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#color-scheme-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isColorSchemeMenuOpen = true;
          $('#menu-color-scheme').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-constellations': // No Keyboard Commands
        if (sMM.isConstellationsMenuOpen) {
          uiManager.hideSideMenus();
          sMM.isConstellationsMenuOpen = false;
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#constellations-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isConstellationsMenuOpen = true;
          $('#menu-constellations').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-countries': // No Keyboard Commands
        if (sMM.isCountriesMenuOpen) {
          uiManager.hideSideMenus();
          sMM.isCountriesMenuOpen = false;
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#countries-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isCountriesMenuOpen = true;
          $('#menu-countries').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-nextLaunch': // No Keyboard Commands
        if (sMM.isNextLaunchMenuOpen) {
          uiManager.hideSideMenus();
          sMM.isNextLaunchMenuOpen = false;
          break;
        } else {
          uiManager.hideSideMenus();
          satSet.nextLaunchManager.showTable();
          $('#nextLaunch-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isNextLaunchMenuOpen = true;
          $('#menu-nextLaunch').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-planetarium':
        if (isPlanetariumView) {
          isPlanetariumView = false;
          cameraManager.panReset = true;
          cameraManager.localRotateReset = true;
          settingsManager.fieldOfView = 0.6;
          drawManager.glInit();
          uiManager.hideSideMenus();
          orbitManager.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
          cameraManager.cameraType.current = cameraManager.cameraType.default; // Back to normal Camera Mode
          $('#fov-text').html('');
          $('#menu-planetarium').removeClass('bmenu-item-selected');
          break;
        } else {
          if (sensorManager.checkSensorSelected()) {
            cameraManager.cameraType.current = cameraManager.cameraType.planetarium; // Activate Planetarium Camera Mode
            $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
            uiManager.legendMenuChange('planetarium');
            if (objectManager.isStarManagerLoaded) {
              starManager.clearConstellations();
            }
            isAstronomyView = false;
            $('#menu-astronomy').removeClass('bmenu-item-selected');
            isPlanetariumView = true;
            $('#menu-planetarium').addClass('bmenu-item-selected');
          } else {
            adviceList.planetariumDisabled();
            uiManager.toast(`Select a Sensor First!`, 'caution');
            if (!$('#menu-planetarium:animated').length) {
              $('#menu-planetarium').effect('shake', {
                distance: 10,
              });
            }
          }
          break;
        }
      case 'menu-astronomy':
        if (isAstronomyView) {
          isAstronomyView = false;
          cameraManager.panReset = true;
          cameraManager.localRotateReset = true;
          settingsManager.fieldOfView = 0.6;
          drawManager.glInit();
          uiManager.hideSideMenus();
          cameraManager.cameraType.current = cameraManager.cameraType.default; // Back to normal Camera Mode
          uiManager.legendMenuChange('default');
          if (objectManager.isStarManagerLoaded) {
            starManager.clearConstellations();
          }
          $('#fov-text').html('');
          // $('#el-text').html('');
          $('#menu-astronomy').removeClass('bmenu-item-selected');
          break;
        } else {
          if (sensorManager.checkSensorSelected()) {
            if (objectManager.isStarManagerLoaded) {
              starManager.drawAllConstellations();
            }
            orbitManager.clearInViewOrbit();
            cameraManager.cameraType.current = cameraManager.cameraType.astronomy; // Activate Astronomy Camera Mode
            $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
            uiManager.legendMenuChange('astronomy');
            isPlanetariumView = false;
            $('#menu-planetarium').removeClass('bmenu-item-selected');
            isAstronomyView = true;
            $('#menu-astronomy').addClass('bmenu-item-selected');
          } else {
            uiManager.toast(`Select a Sensor First!`, 'caution');
            if (!$('#menu-astronomy:animated').length) {
              $('#menu-astronomy').effect('shake', {
                distance: 10,
              });
            }
          }
          break;
        }
      case 'menu-satview':
        if (cameraManager.cameraType.current === cameraManager.cameraType.satellite) {
          // isSatView = false;
          uiManager.hideSideMenus();
          cameraManager.cameraType.current = cameraManager.cameraType.fixedToSat; // Back to normal Camera Mode
          $('#menu-satview').removeClass('bmenu-item-selected');
          break;
        } else {
          if (objectManager.selectedSat !== -1) {
            cameraManager.cameraType.current = cameraManager.cameraType.satellite; // Activate Satellite Camera Mode
            $('#menu-satview').addClass('bmenu-item-selected');
            // isSatView = true;
          } else {
            uiManager.toast(`Select a Satellite First!`, 'caution');
            adviceList.satViewDisabled();
            if (!$('#menu-satview:animated').length) {
              $('#menu-satview').effect('shake', {
                distance: 10,
              });
            }
          }
          break;
        }
      case 'menu-record': // No Keyboard Commands
        if (isVideoRecording) {
          recorder.stop();
          recorder.save('keeptrack.webm');
          isVideoRecording = false;
          $('#menu-record').removeClass('bmenu-item-selected');
          break;
        } else {
          try {
            recorder.start();
          } catch (e) {
            M.toast({
              html: `Compatibility Error with Recording`,
            });
            isVideoRecording = false;
            $('#menu-record').removeClass('bmenu-item-selected');
            $('#menu-record').addClass('bmenu-item-disabled');
            if (!$('#menu-record:animated').length) {
              $('#menu-record').effect('shake', {
                distance: 10,
              });
            }
          }
          // isVideoRecording = true;
          // $('#menu-record').addClass('bmenu-item-selected');
          break;
        }
    }
  };

  $('#search').on('focus', function () {
    uiManager.isCurrentlyTyping = true;
  });
  $('#ui-wrapper').on('focusin', function () {
    uiManager.isCurrentlyTyping = true;
  });

  $('#search').on('blur', function () {
    uiManager.isCurrentlyTyping = false;
  });
  $('#ui-wrapper').on('focusout', function () {
    uiManager.isCurrentlyTyping = false;
  });

  $('#near-objects-link').on('click', function () {
    if (objectManager.selectedSat === -1) {
      return;
    }
    var sat = objectManager.selectedSat;
    var SCCs = [];
    var pos = satSet.getSatPosOnly(sat).position;
    var posXmin = pos.x - 100;
    var posXmax = pos.x + 100;
    var posYmin = pos.y - 100;
    var posYmax = pos.y + 100;
    var posZmin = pos.z - 100;
    var posZmax = pos.z + 100;
    $('#search').val('');
    for (let i = 0; i < satSet.numSats; i++) {
      pos = satSet.getSatPosOnly(i).position;
      if (pos.x < posXmax && pos.x > posXmin && pos.y < posYmax && pos.y > posYmin && pos.z < posZmax && pos.z > posZmin) {
        SCCs.push(satSet.getSatExtraOnly(i).SCC_NUM);
      }
    }

    for (let i = 0; i < SCCs.length; i++) {
      if (i < SCCs.length - 1) {
        $('#search').val($('#search').val() + SCCs[i] + ',');
      } else {
        $('#search').val($('#search').val() + SCCs[i]);
      }
    }

    uiManager.doSearch($('#search').val());
  });

  $('#search-results').on('click', '.search-result', function () {
    var satId = $(this).data('sat-id');
    objectManager.setSelectedSat(satId);
  });

  $('#search-results').on('mouseover', '.search-result', function () {
    var satId = $(this).data('sat-id');
    orbitManager.setHoverOrbit(satId);
    satSet.setHover(satId);
    searchBox.isHovering(true);
    searchBox.setHoverSat(satId);
  });
  $('#search-results').on('mouseout', function () {
    orbitManager.clearHoverOrbit();
    satSet.setHover(-1);
    searchBox.isHovering(false);
  });

  $('#search').on('input', function () {
    var searchStr = $('#search').val();
    uiManager.doSearch(searchStr);
  });

  var isSocialOpen = false;
  $('#share-icon').on('click', function () {
    if (!isSocialOpen) {
      isSocialOpen = true;
      $('#github-share').removeClass('share-up');
      $('#twitter-share').removeClass('share-up');
      $('#github-share').addClass('github-share-down');
      $('#twitter-share').addClass('twitter-share-down');
    } else {
      isSocialOpen = false;
      $('#github-share').addClass('share-up');
      $('#twitter-share').addClass('share-up');
      $('#github-share').removeClass('github-share-down');
      $('#twitter-share').removeClass('twitter-share-down');
    }
  });

  uiManager.hideSideMenus = () => sMM.hideSideMenus();

  $('#fullscreen-icon').on('click', function () {
    mobileManager.fullscreenToggle();
    uiManager.resize2DMap();
  });

  if ($(window).width() > $(window).height()) {
    settingsManager.mapHeight = $(window).width(); // Subtract 12 px for the scroll
    $('#map-image').width(settingsManager.mapHeight);
    settingsManager.mapHeight = (settingsManager.mapHeight * 3) / 4;
    $('#map-image').height(settingsManager.mapHeight);
    $('#map-menu').width($(window).width());
  } else {
    settingsManager.mapHeight = $(window).height() - 100; // Subtract 12 px for the scroll
    $('#map-image').height(settingsManager.mapHeight);
    settingsManager.mapHeight = (settingsManager.mapHeight * 4) / 3;
    $('#map-image').width(settingsManager.mapHeight);
    $('#map-menu').width($(window).width());
  }

  $('#nav-footer-toggle').on('click', function () {
    uiManager.footerToggle();
  });

  // Allow Resizing the bottom menu
  $('.resizable').resizable({
    handles: {
      n: '#footer-handle',
    },
    alsoResize: '#bottom-icons-container',
    maxHeight: 260,
    minHeight: 50,
  });

  // Allow All Side Menu Resizing
  $('#sensor-list-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 400,
    minWidth: 280,
  });

  $('#sensor-info-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 400,
    minWidth: 280,
  });

  $('#watchlist-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#lookangles-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#lookanglesmultisite-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 300,
  });

  $('#findByLooks-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#socrates-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 290,
  });

  $('#editSat-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#newLaunch-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#breakup-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#missile-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#dops-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#customSensor-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#color-scheme-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#constellations-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#countries-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#satChng-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#obfit-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 650,
    minWidth: 400,
  });

  $('#analysis-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#external-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#nextLaunch-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 650,
    minWidth: 450,
  });

  $('#settings-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#about-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#export-lookangles').on('click', function () {
    saveCsv(satellite.lastlooksArray, 'lookAngles');
  });

  $('#export-launch-info').on('click', function () {
    saveCsv(satSet.nextLaunchManager.launchList, 'launchList');
  });

  $('#export-multiSiteArray').on('click', function () {
    saveCsv(satellite.lastMultiSiteArray, 'multiSiteLooks');
  });

  $('#search-icon').on('click', function () {
    uiManager.searchToggle();
  });
};
$(document).ready(() => uiManager.onReady());

uiManager.sMM = sMM;
export { doSearch, uiManager, uiLimited, uiInput };
