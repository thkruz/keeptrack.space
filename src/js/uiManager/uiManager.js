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
import { rgbCss, saveCsv } from '@app/js/lib/helpers';
import { ColorSchemeFactory as ColorScheme } from '@app/js/colorManager/color-scheme-factory.js';
import { DEG2RAD } from '@app/js/lib/constants.js';
import { drawManager } from '@app/js/drawManager/drawManager.js';
import { keepTrackApi } from '@app/js/api/externalApi';
import { mobileManager } from '@app/js/uiManager/mobileManager.js';
import { objectManager } from '@app/js/objectManager/objectManager.js';
import { orbitManager } from '@app/js/orbitManager/orbitManager.js';
import { satSet } from '@app/js/satSet/satSet.js';
import { satellite } from '@app/js/lib/lookangles.js';
import { searchBox } from '@app/js/uiManager/search-box.js';
import { sensorManager } from '@app/js/plugins/sensor/sensorManager.js';
import { settingsManager } from '@app/js/settingsManager/settingsManager.ts';
import { timeManager } from '@app/js/timeManager/timeManager.ts';
import { uiInput } from './ui-input';
import { uiLimited } from './ui-limited.js';
import { uiValidation } from './ui-validation.js';

const M = window.M;

$.ajaxSetup({
  cache: false,
});

var updateInterval = 1000;
var createClockDOMOnce = false;
settingsManager.lastBoxUpdateTime = 0;

const uiManager = {};
uiManager.searchBox = searchBox;
uiManager.mobileManager = mobileManager;
uiManager.isCurrentlyTyping = false;

let cameraManager, lineManager, starManager;
uiManager.init = () => {
  if (settingsManager.disableUI && settingsManager.enableLimitedUI) {
    // Pass the references through to the limited UI
    uiLimited.init(keepTrackApi.programs.satSet, keepTrackApi.programs.orbitManager, keepTrackApi.programs.groupsManager, keepTrackApi.programs.ColorScheme);
  }
  cameraManager = keepTrackApi.programs.cameraManager;
  lineManager = keepTrackApi.programs.lineManager;
  starManager = keepTrackApi.programs.starManager;

  uiValidation();

  // Register all UI callback functions with drawLoop in main.js
  // These run during the draw loop
  drawManager.setDrawLoopCallback(function () {
    // _showSatTest();
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

  keepTrackApi.methods.uiManagerInit();

  // Allow Resizing the bottom menu
  const maxHeight = document.getElementById('bottom-icons') !== null ? document.getElementById('bottom-icons').offsetHeight : 0;
  $('.resizable').resizable({
    handles: {
      n: '#footer-handle',
    },
    alsoResize: '#bottom-icons-container',
    // No larger than the stack of icons
    maxHeight: maxHeight,
    minHeight: 50,
    stop: () => {
      const bottomHeight = document.getElementById('bottom-icons-container').offsetHeight;
      document.documentElement.style.setProperty('--bottom-menu-height', bottomHeight + 'px');
      if (window.getComputedStyle(document.getElementById('nav-footer')).bottom !== '0px') {
        document.documentElement.style.setProperty('--bottom-menu-top', '0px');
      } else {
        const bottomHeight = document.getElementById('bottom-icons-container').offsetHeight;
        document.documentElement.style.setProperty('--bottom-menu-top', bottomHeight + 'px');
      }
    },
  });

  // Initialize Materialize
  M.AutoInit();

  // Initialize Navigation and Select Menus
  let elems;
  elems = document.querySelectorAll('.dropdown-button');
  M.Dropdown.init(elems);
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
      keepTrackApi.methods.updateDateTime(new Date(timeManager.propRealTime + timeManager.propOffset));
      break;
    case '.':
      timeManager.propOffset += 1000 * 60; // Move a Minute
      settingsManager.isPropRateChange = true;
      keepTrackApi.methods.updateDateTime(new Date(timeManager.propRealTime + timeManager.propOffset));
      break;
    case '<':
      timeManager.propOffset -= 1000 * 60 * 60 * 24 * 365.25; // Move back a year
      settingsManager.isPropRateChange = true;
      keepTrackApi.methods.updateDateTime(new Date(timeManager.propRealTime + timeManager.propOffset));
      break;
    case '>':
      timeManager.propOffset += 1000 * 60 * 60 * 24 * 365.25; // Move forward a year
      settingsManager.isPropRateChange = true;
      keepTrackApi.methods.updateDateTime(new Date(timeManager.propRealTime + timeManager.propOffset));
      break;
    case '0':
      timeManager.updatePropTime();
      timeManager.setPropRateZero();
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

var _updateSelectBox = () => {
  // IDEA: Include updates when satellite edited regardless of time.

  // Don't update if no object is selected
  if (objectManager.selectedSat === -1) return;

  const sat = satSet.getSat(objectManager.selectedSat);

  // Don't bring up the update box for static dots
  if (typeof sat === 'undefined' || sat.static) return;

  if (timeManager.now * 1 > settingsManager.lastBoxUpdateTime * 1 + updateInterval) {
    keepTrackApi.methods.updateSelectBox(sat);
    settingsManager.lastBoxUpdateTime = timeManager.now;
  }
};

uiManager.useCurrentGeolocationAsSensor = function () {
  if (location.protocol === 'https:' && !settingsManager.geolocationUsed && settingsManager.isMobileModeEnabled) {
    navigator.geolocation.getCurrentPosition(function (position) {
      settingsManager.geolocation.lat = position.coords.lat;
      settingsManager.geolocation.lon = position.coords.lon;
      settingsManager.geolocation.alt = 0;
      settingsManager.geolocation.minaz = 0;
      settingsManager.geolocation.maxaz = 360;
      settingsManager.geolocation.minel = 30;
      settingsManager.geolocation.maxel = 90;
      settingsManager.geolocation.minrange = 0;
      settingsManager.geolocation.maxrange = 100000;
      sensorManager.whichRadar = 'CUSTOM';

      $('#cs-lat').val(settingsManager.geolocation.lat).trigger('change');
      $('#cs-lon').val(settingsManager.geolocation.lon).trigger('change');
      $('#cs-hei').val(settingsManager.geolocation.alt).trigger('change');

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

      var lon = settingsManager.geolocation.lon;
      var lat = settingsManager.geolocation.lat;
      var alt = settingsManager.geolocation.alt;
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
          lon: lon,
          alt: alt,
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
        lon: lon,
        alt: alt,
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
  cameraManager.lookAtSensor(sensorManager.selectedSensor.zoom, sensorManager.selectedSensor.lat, sensorManager.selectedSensor.lon, timeManager.selectedDate);
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
  $('#sensor-longitude').html(sensorManager.currentSensor.lon);
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
      toastMsg.$el[0].style.background = 'var(--statusDarkStandby)';
      keepTrackApi.programs.soundManager.play('standby');
      break;
    case 'normal':
      toastMsg.$el[0].style.background = 'var(--statusDarkNormal)';
      keepTrackApi.programs.soundManager.play('standby');
      break;
    case 'caution':
      toastMsg.$el[0].style.background = 'var(--statusDarkCaution)';
      break;
    case 'serious':
      toastMsg.$el[0].style.background = 'var(--statusDarkSerious)';
      break;
    case 'critical':
      toastMsg.$el[0].style.background = 'var(--statusDarkCritical)';
      break;
  }
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

uiManager.onReady = () => {
  // Code Once index.htm is loaded
  if (settingsManager.offline) updateInterval = 250;
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

  (function _menuInit() {
    $('.tooltipped').tooltip({ delay: 50 });

    // Initialize Perfect Scrollbar
    $('#search-results').perfectScrollbar();

    // Setup Legend Colors
    uiManager.legendColorsChange();

    window.oncontextmenu = function (event) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    };
  })();

  uiManager.clearRMBSubMenu = () => {
    $('#save-rmb-menu').hide();
    $('#view-rmb-menu').hide();
    $('#edit-rmb-menu').hide();
    $('#create-rmb-menu').hide();
    $('#colors-rmb-menu').hide();
    $('#draw-rmb-menu').hide();
    $('#earth-rmb-menu').hide();
  };

  uiManager.menuController = () => {
    // Reset time if in retro mode
    if (settingsManager.retro) {
      timeManager.propOffset = new Date(2000, 2, 13) - Date.now();
      keepTrackApi.methods.updateDateTime(new Date(timeManager.propRealTime + timeManager.propOffset));
      satSet.satCruncher.postMessage({
        typ: 'offset',
        dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
      });
    }

    $('#search-icon').on('click', function () {
      uiManager.searchToggle();
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

    $('#legend-menu').on('click', function () {
      if (settingsManager.legendMenuOpen) {
        $('#legend-hover-menu').hide();
        $('#legend-icon').removeClass('bmenu-item-selected');
        settingsManager.legendMenuOpen = false;
      } else {
        // uiManager.legendColorsChange(); // Disabled colors show up again.
        $('#legend-hover-menu').show();
        $('#legend-icon').addClass('bmenu-item-selected');
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
    });

    // Resizing Listener
    $(window).on('resize', function () {
      mobileManager.checkMobileMode();
      if (!settingsManager.disableUI) {
        const bodyDOM = $('#bodyDOM');
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

    $('#fullscreen-icon').on('click', function () {
      mobileManager.fullscreenToggle();
    });

    $('#nav-footer-toggle').on('click', function () {
      uiManager.footerToggle();
      if (parseInt(window.getComputedStyle(document.getElementById('nav-footer')).bottom.replace('px', '')) < 0) {
        setTimeout(() => {
          const bottomHeight = document.getElementById('bottom-icons-container').offsetHeight;
          document.documentElement.style.setProperty('--bottom-menu-top', bottomHeight + 'px');
        }, 1000); // Wait for the footer to be fully visible.
      } else {
        // If the footer is open, then it will be hidden shortly but we don't want to wait for it to be hidden
        document.documentElement.style.setProperty('--bottom-menu-top', '0px');
      }
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

    $('#customSensor-menu').resizable({
      handles: 'e',
      stop: function () {
        $(this).css('height', '');
      },
      maxWidth: 450,
      minWidth: 280,
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

    $('#export-multiSiteArray').on('click', function () {
      saveCsv(satellite.lastMultiSiteArray, 'multiSiteLooks');
    });
  };

  // Run any plugins code
  keepTrackApi.methods.uiManagerOnReady();
  uiManager.bottomIconPress = (evt) => keepTrackApi.methods.bottomMenuClick(evt.currentTarget.id);
  $('#bottom-icons').on('click', '.bmenu-item', function (evt) {
    uiManager.bottomIconPress(evt);
  });
  uiManager.hideSideMenus = () => {
    // Close any open colorboxes
    try {
      $.colorbox.close();
    } catch {
      // Intentionally Left Blank (Fails Jest Testing)
    }

    keepTrackApi.methods.hideSideMenus();
  };
  $('#bottom-icons').sortable({ tolerance: 'pointer' });
};

export { doSearch, uiManager, uiLimited, uiInput };
