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

// organize-imports-ignore
import 'jquery-ui-bundle';
import '@app/js/lib/external/jquery-ui-slideraccess.js';
import '@app/js/lib/external/jquery-ui-timepicker.js';
import '@app/js/lib/external/perfect-scrollbar.min.js';
import '@app/js/lib/external/jquery.colorbox.min.js';
import '@app/js/lib/external/jquery-ajax.js';
import '@app/js/lib/external/colorPick.js';
import '@materializecss/materialize';
// eslint-disable-next-line sort-imports
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { drawManager } from '@app/js/drawManager/drawManager';
import { DEG2RAD } from '@app/js/lib/constants';
import { rgbCss } from '@app/js/lib/helpers';
import { mobileManager } from '@app/js/uiManager/mobileManager';
import { searchBox } from '@app/js/uiManager/searchBox';
import $ from 'jquery';
import { SensorObject, UiManager } from '../api/keepTrackTypes';
import { useCurrentGeolocationAsSensor } from './httpsOnly';
import { keyHandler } from './keyHandler';
import { initMenuController } from './menuController';
import { uiLimited } from './ui-limited.js';
import { uiInput } from './uiInput';
import { initUiValidation } from './uiValidation';

// materializecss/materialize goes to window.M, but we want a local reference
const M = window.M;

$.ajaxSetup({
  cache: false,
});

var updateInterval = 1000;
settingsManager.lastBoxUpdateTime = 0;

export const init = () => {
  if (settingsManager.disableUI && settingsManager.enableLimitedUI) {
    // Pass the references through to the limited UI
    uiLimited.init(keepTrackApi.programs.satSet, keepTrackApi.programs.orbitManager, keepTrackApi.programs.groupsManager, keepTrackApi.programs.colorSchemeManager);
  }

  initUiValidation();

  // Register all UI callback functions with drawLoop in main.js
  // These run during the draw loop
  // TODO: Move DrawLoopCallback logic to the API so that plugins can use it too!
  drawManager.setDrawLoopCallback(function () {
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
  (<any>$('.resizable')).resizable({
    handles: {
      n: '#footer-handle',
    },
    alsoResize: '#bottom-icons-container',
    // No larger than the stack of icons
    maxHeight: maxHeight,
    minHeight: 50,
    stop: () => {
      let bottomHeight = document.getElementById('bottom-icons-container').offsetHeight;
      document.documentElement.style.setProperty('--bottom-menu-height', bottomHeight + 'px');
      if (window.getComputedStyle(document.getElementById('nav-footer')).bottom !== '0px') {
        document.documentElement.style.setProperty('--bottom-menu-top', '0px');
      } else {
        bottomHeight = document.getElementById('bottom-icons-container').offsetHeight;
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
export const postStart = () => {
  setTimeout(() => {
    $('img').each(function () {
      $(this).attr('src', $(this).attr('delayedsrc'));
    });
  }, 0);

  // Enable Satbox Overlay
  if (settingsManager.enableHoverOverlay) {
    try {
      const hoverboxDOM = document.createElement('div');
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

const hideUi = () => {
  if (uiManager.isUiVisible) {
    $('#header').hide();
    $('#ui-wrapper').hide();
    $('#nav-footer').hide();
    uiManager.isUiVisible = false;
  } else {
    $('#header').show();
    $('#ui-wrapper').show();
    $('#nav-footer').show();
    uiManager.isUiVisible = true;
  }
};

const _updateSelectBox = () => {
  const { objectManager, satSet, timeManager } = keepTrackApi.programs;

  // IDEA: Include updates when satellite edited regardless of time.

  // Don't update if no object is selected
  if (objectManager.selectedSat === -1) return;

  const sat = satSet.getSat(objectManager.selectedSat);

  // Don't bring up the update box for static dots
  if (typeof sat === 'undefined' || sat.static) return;

  if (timeManager.realTime * 1 > settingsManager.lastBoxUpdateTime * 1 + updateInterval) {
    keepTrackApi.methods.updateSelectBox(sat);
    settingsManager.lastBoxUpdateTime = timeManager.realTime;
  }
};

export const legendMenuChange = (menu: string) => {
  const { objectManager, sensorManager, colorSchemeManager } = keepTrackApi.programs;

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
    $('.legend-payload-box').css('background', settingsManager.colors.payload.toString());
    colorSchemeManager.objectTypeFlags.payload = true;
    $('.legend-rocketBody-box').css('background', settingsManager.colors.rocketBody.toString());
    colorSchemeManager.objectTypeFlags.rocketBody = true;
    $('.legend-debris-box').css('background', settingsManager.colors.debris.toString());
    colorSchemeManager.objectTypeFlags.debris = true;
    $('.legend-sensor-box').css('background', settingsManager.colors.sensor.toString());
    colorSchemeManager.objectTypeFlags.sensor = true;
    $('.legend-facility-box').css('background', settingsManager.colors.facility.toString());
    colorSchemeManager.objectTypeFlags.facility = true;
    $('.legend-missile-box').css('background', settingsManager.colors.missile.toString());
    colorSchemeManager.objectTypeFlags.missile = true;
    $('.legend-missileInview-box').css('background', settingsManager.colors.missileInview.toString());
    colorSchemeManager.objectTypeFlags.missileInview = true;
    $('.legend-trusat-box').css('background', settingsManager.colors.trusat.toString());
    colorSchemeManager.objectTypeFlags.trusat = true;
    $('.legend-inFOV-box').css('background', settingsManager.colors.inView.toString());
    colorSchemeManager.objectTypeFlags.inFOV = true;
    $('.legend-starLow-box').css('background', settingsManager.colors.starLow.toString());
    colorSchemeManager.objectTypeFlags.starLow = true;
    $('.legend-starMed-box').css('background', settingsManager.colors.starMed.toString());
    colorSchemeManager.objectTypeFlags.starMed = true;
    $('.legend-starHi-box').css('background', settingsManager.colors.starHi.toString());
    colorSchemeManager.objectTypeFlags.starHi = true;
    $('.legend-satLow-box').css('background', settingsManager.colors.sunlight60.toString());
    colorSchemeManager.objectTypeFlags.satLow = true;
    $('.legend-satMed-box').css('background', settingsManager.colors.sunlight80.toString());
    colorSchemeManager.objectTypeFlags.satMed = true;
    $('.legend-satHi-box').css('background', settingsManager.colors.sunlight100.toString());
    colorSchemeManager.objectTypeFlags.satHi = true;
    $('.legend-rcsSmall-box').css('background', settingsManager.colors.rcsSmall.toString());
    colorSchemeManager.objectTypeFlags.satSmall = true;
    $('.legend-satSmall-box').css('background', settingsManager.colors.satSmall.toString());
    colorSchemeManager.objectTypeFlags.rcsSmall = true;
    $('.legend-rcsMed-box').css('background', settingsManager.colors.rcsMed.toString());
    colorSchemeManager.objectTypeFlags.rcsMed = true;
    $('.legend-rcsLarge-box').css('background', settingsManager.colors.rcsLarge.toString());
    colorSchemeManager.objectTypeFlags.rcsLarge = true;
    $('.legend-rcsUnknown-box').css('background', settingsManager.colors.rcsUnknown.toString());
    colorSchemeManager.objectTypeFlags.rcsUnknown = true;
    $('.legend-velocitySlow-box').css('background', [1.0, 0, 0.0, 1.0].toString());
    colorSchemeManager.objectTypeFlags.velocitySlow = true;
    $('.legend-velocityMed-box').css('background', [0.5, 0.5, 0.0, 1.0].toString());
    colorSchemeManager.objectTypeFlags.velocityMed = true;
    $('.legend-velocityFast-box').css('background', [0, 1, 0.0, 1.0].toString());
    colorSchemeManager.objectTypeFlags.velocityFast = true;
    $('.legend-inviewAlt-box').css('background', settingsManager.colors.inViewAlt.toString());
    colorSchemeManager.objectTypeFlags.inViewAlt = true;
    $('.legend-satLEO-box').css('background', settingsManager.colors.satLEO.toString());
    colorSchemeManager.objectTypeFlags.satLEO = true;
    $('.legend-satGEO-box').css('background', settingsManager.colors.satGEO.toString());
    colorSchemeManager.objectTypeFlags.satGEO = true;
    $('.legend-countryUS-box').css('background', settingsManager.colors.countryUS.toString());
    colorSchemeManager.objectTypeFlags.countryUS = true;
    $('.legend-countryCIS-box').css('background', settingsManager.colors.countryCIS.toString());
    colorSchemeManager.objectTypeFlags.countryCIS = true;
    $('.legend-countryPRC-box').css('background', settingsManager.colors.countryPRC.toString());
    colorSchemeManager.objectTypeFlags.countryPRC = true;
    $('.legend-countryOther-box').css('background', settingsManager.colors.countryOther.toString());
    colorSchemeManager.objectTypeFlags.countryOther = true;
    $('.legend-ageNew-box').css('background', settingsManager.colors.ageNew.toString());
    colorSchemeManager.objectTypeFlags.ageNew = true;
    $('.legend-ageMed-box').css('background', settingsManager.colors.ageMed.toString());
    colorSchemeManager.objectTypeFlags.ageMed = true;
    $('.legend-ageOld-box').css('background', settingsManager.colors.ageOld.toString());
    colorSchemeManager.objectTypeFlags.ageOld = true;
    $('.legend-ageLost-box').css('background', settingsManager.colors.ageLost.toString());
    colorSchemeManager.objectTypeFlags.ageLost = true;
  }
  settingsManager.currentLegend = menu;
};

var isFooterShown = true;

export const footerToggle = function () {
  if (isFooterShown) {
    isFooterShown = false;
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

export const getsensorinfo = () => {
  const { currentSensor }: { currentSensor: SensorObject[] } = keepTrackApi.programs.sensorManager;

  const firstSensor = currentSensor[0];
  $('#sensor-latitude').html(firstSensor.lat.toString());
  $('#sensor-longitude').html(firstSensor.lon.toString());
  $('#sensor-minazimuth').html(firstSensor.obsminaz.toString());
  $('#sensor-maxazimuth').html(firstSensor.obsmaxaz.toString());
  $('#sensor-minelevation').html(firstSensor.obsminel.toString());
  $('#sensor-maxelevation').html(firstSensor.obsmaxel.toString());
  $('#sensor-minrange').html(firstSensor.obsminrange.toString());
  $('#sensor-maxrange').html(firstSensor.obsmaxrange.toString());
};

let doSearch = (searchString: string, isPreventDropDown: boolean) => {
  if (searchString == '') {
    searchBox.hideResults();
  } else {
    uiManager.doSearch(searchString, isPreventDropDown);
  }
};

export const legendHoverMenuClick = (legendType?: string) => {
  const { satSet, colorSchemeManager } = keepTrackApi.programs;

  switch (legendType) {
    case 'legend-payload-box':
      if (colorSchemeManager.objectTypeFlags.payload) {
        colorSchemeManager.objectTypeFlags.payload = false;
        $('.legend-payload-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.payload = true;
        $('.legend-payload-box').css('background', rgbCss(settingsManager.colors.payload));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-rocketBody-box':
      if (colorSchemeManager.objectTypeFlags.rocketBody) {
        colorSchemeManager.objectTypeFlags.rocketBody = false;
        $('.legend-rocketBody-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.rocketBody = true;
        $('.legend-rocketBody-box').css('background', rgbCss(settingsManager.colors.rocketBody));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-debris-box':
      if (colorSchemeManager.objectTypeFlags.debris) {
        colorSchemeManager.objectTypeFlags.debris = false;
        $('.legend-debris-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.debris = true;
        $('.legend-debris-box').css('background', rgbCss(settingsManager.colors.debris));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-starHi-box':
      if (colorSchemeManager.objectTypeFlags.starHi) {
        colorSchemeManager.objectTypeFlags.starHi = false;
        $('.legend-starHi-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.starHi = true;
        $('.legend-starHi-box').css('background', rgbCss(settingsManager.colors.starHi));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-starMed-box':
      if (colorSchemeManager.objectTypeFlags.starMed) {
        colorSchemeManager.objectTypeFlags.starMed = false;
        $('.legend-starMed-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.starMed = true;
        $('.legend-starMed-box').css('background', rgbCss(settingsManager.colors.starMed));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-starLow-box':
      if (colorSchemeManager.objectTypeFlags.starLow) {
        colorSchemeManager.objectTypeFlags.starLow = false;
        $('.legend-starLow-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.starLow = true;
        $('.legend-starLow-box').css('background', rgbCss(settingsManager.colors.starLow));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-satHi-box':
      if (colorSchemeManager.objectTypeFlags.satHi) {
        colorSchemeManager.objectTypeFlags.satHi = false;
        $('.legend-satHi-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.satHi = true;
        $('.legend-satHi-box').css('background', 'rgb(250, 250, 250)');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-satMed-box':
      if (colorSchemeManager.objectTypeFlags.satMed) {
        colorSchemeManager.objectTypeFlags.satMed = false;
        $('.legend-satMed-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.satMed = true;
        $('.legend-satMed-box').css('background', 'rgb(150, 150, 150)');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-satLow-box':
      if (colorSchemeManager.objectTypeFlags.satLow) {
        colorSchemeManager.objectTypeFlags.satLow = false;
        $('.legend-satLow-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.satLow = true;
        $('.legend-satLow-box').css('background', 'rgb(200, 200, 200)');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-inFOV-box':
      if (colorSchemeManager.objectTypeFlags.inFOV) {
        colorSchemeManager.objectTypeFlags.inFOV = false;
        $('.legend-inFOV-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.inFOV = true;
        $('.legend-inFOV-box').css('background', rgbCss(settingsManager.colors.inView));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-velocityFast-box':
      if (colorSchemeManager.objectTypeFlags.velocityFast) {
        colorSchemeManager.objectTypeFlags.velocityFast = false;
        $('.legend-velocityFast-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.velocityFast = true;
        $('.legend-velocityFast-box').css('background', [0, 1, 0.0, 1.0].toString());
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-velocityMed-box':
      if (colorSchemeManager.objectTypeFlags.velocityMed) {
        colorSchemeManager.objectTypeFlags.velocityMed = false;
        $('.legend-velocityMed-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.velocityMed = true;
        $('.legend-velocityMed-box').css('background', [0.5, 0.5, 0.0, 1.0].toString());
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-velocitySlow-box':
      if (colorSchemeManager.objectTypeFlags.velocitySlow) {
        colorSchemeManager.objectTypeFlags.velocitySlow = false;
        $('.legend-velocitySlow-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.velocitySlow = true;
        $('.legend-velocitySlow-box').css('background', [1.0, 0, 0.0, 1.0].toString());
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-inviewAlt-box':
      if (colorSchemeManager.objectTypeFlags.inViewAlt) {
        colorSchemeManager.objectTypeFlags.inViewAlt = false;
        $('.legend-inviewAlt-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.inViewAlt = true;
        $('.legend-inviewAlt-box').css('background', rgbCss(settingsManager.colors.inViewAlt));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-ageNew-box':
      if (colorSchemeManager.objectTypeFlags.ageNew) {
        colorSchemeManager.objectTypeFlags.ageNew = false;
        $('.legend-ageNew-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.ageNew = true;
        $('.legend-ageNew-box').css('background', rgbCss(settingsManager.colors.ageNew));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-ageMed-box':
      if (colorSchemeManager.objectTypeFlags.ageMed) {
        colorSchemeManager.objectTypeFlags.ageMed = false;
        $('.legend-ageMed-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.ageMed = true;
        $('.legend-ageMed-box').css('background', rgbCss(settingsManager.colors.ageMed));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-ageOld-box':
      if (colorSchemeManager.objectTypeFlags.ageOld) {
        colorSchemeManager.objectTypeFlags.ageOld = false;
        $('.legend-ageOld-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.ageOld = true;
        $('.legend-ageOld-box').css('background', rgbCss(settingsManager.colors.ageOld));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-ageLost-box':
      if (colorSchemeManager.objectTypeFlags.ageLost) {
        colorSchemeManager.objectTypeFlags.ageLost = false;
        $('.legend-ageLost-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.ageLost = true;
        $('.legend-ageLost-box').css('background', rgbCss(settingsManager.colors.ageLost));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-rcsSmall-box':
      if (colorSchemeManager.objectTypeFlags.rcsSmall) {
        colorSchemeManager.objectTypeFlags.rcsSmall = false;
        $('.legend-rcsSmall-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.rcsSmall = true;
        $('.legend-rcsSmall-box').css('background', rgbCss(settingsManager.colors.rcsSmall));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-rcsMed-box':
      if (colorSchemeManager.objectTypeFlags.rcsMed) {
        colorSchemeManager.objectTypeFlags.rcsMed = false;
        $('.legend-rcsMed-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.rcsMed = true;
        $('.legend-rcsMed-box').css('background', rgbCss(settingsManager.colors.rcsMed));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-rcsLarge-box':
      if (colorSchemeManager.objectTypeFlags.rcsLarge) {
        colorSchemeManager.objectTypeFlags.rcsLarge = false;
        $('.legend-rcsLarge-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.rcsLarge = true;
        $('.legend-rcsLarge-box').css('background', rgbCss(settingsManager.colors.rcsLarge));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-rcsUnknown-box':
      if (colorSchemeManager.objectTypeFlags.rcsUnknown) {
        colorSchemeManager.objectTypeFlags.rcsUnknown = false;
        $('.legend-rcsUnknown-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.rcsUnknown = true;
        $('.legend-rcsUnknown-box').css('background', rgbCss(settingsManager.colors.rcsUnknown));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-missile-box':
      if (colorSchemeManager.objectTypeFlags.missile) {
        colorSchemeManager.objectTypeFlags.missile = false;
        $('.legend-missile-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.missile = true;
        $('.legend-missile-box').css('background', rgbCss(settingsManager.colors.missile));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-missileInview-box':
      if (colorSchemeManager.objectTypeFlags.missileInview) {
        colorSchemeManager.objectTypeFlags.missileInview = false;
        $('.legend-missileInview-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.missileInview = true;
        $('.legend-missileInview-box').css('background', rgbCss(settingsManager.colors.missileInview));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-sensor-box':
      if (colorSchemeManager.objectTypeFlags.sensor) {
        colorSchemeManager.objectTypeFlags.sensor = false;
        $('.legend-sensor-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.sensor = true;
        $('.legend-sensor-box').css('background', rgbCss(settingsManager.colors.sensor));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-facility-box':
      if (colorSchemeManager.objectTypeFlags.facility) {
        colorSchemeManager.objectTypeFlags.facility = false;
        $('.legend-facility-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.facility = true;
        $('.legend-facility-box').css('background', rgbCss(settingsManager.colors.facility));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-trusat-box':
      if (colorSchemeManager.objectTypeFlags.trusat) {
        colorSchemeManager.objectTypeFlags.trusat = false;
        $('.legend-trusat-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.trusat = true;
        $('.legend-trusat-box').css('background', rgbCss(settingsManager.colors.trusat));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-countryUS-box':
      if (colorSchemeManager.objectTypeFlags.countryUS) {
        colorSchemeManager.objectTypeFlags.countryUS = false;
        $('.legend-countryUS-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.countryUS = true;
        $('.legend-countryUS-box').css('background', rgbCss(settingsManager.colors.countryUS));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-countryCIS-box':
      if (colorSchemeManager.objectTypeFlags.countryCIS) {
        colorSchemeManager.objectTypeFlags.countryCIS = false;
        $('.legend-countryCIS-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.countryCIS = true;
        $('.legend-countryCIS-box').css('background', rgbCss(settingsManager.colors.countryCIS));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-countryPRC-box':
      if (colorSchemeManager.objectTypeFlags.countryPRC) {
        colorSchemeManager.objectTypeFlags.countryPRC = false;
        $('.legend-countryPRC-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.countryPRC = true;
        $('.legend-countryPRC-box').css('background', rgbCss(settingsManager.colors.countryPRC));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    case 'legend-countryOther-box':
      if (colorSchemeManager.objectTypeFlags.countryOther) {
        colorSchemeManager.objectTypeFlags.countryOther = false;
        $('.legend-countryOther-box').css('background', 'black');
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      } else {
        colorSchemeManager.objectTypeFlags.countryOther = true;
        $('.legend-countryOther-box').css('background', rgbCss(settingsManager.colors.countryOther));
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme, true);
      }
      break;
    default:
      break;
  }
};

export const onReady = () => {
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
      setup: function (_, ns, handle: any) {
        if (ns.includes('noPreventDefault')) {
          this.addEventListener('touchstart', handle, { passive: false });
        } else {
          this.addEventListener('touchstart', handle, { passive: true });
        }
      },
    };
  }

  (function _menuInit() {
    $('.tooltipped').tooltip(<any>{ delay: 50 });

    // Initialize Perfect Scrollbar
    (<any>$('#search-results')).perfectScrollbar();

    // Setup Legend Colors
    uiManager.legendColorsChange();
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

  uiManager.menuController = initMenuController;

  // Run any plugins code
  keepTrackApi.methods.uiManagerOnReady();
  uiManager.bottomIconPress = (evt: Event) => keepTrackApi.methods.bottomMenuClick((<any>evt.currentTarget).id);
  $('#bottom-icons').on('click', '.bmenu-item', function (evt: Event) {
    uiManager.bottomIconPress(evt);
  });
  uiManager.hideSideMenus = () => {
    // Close any open colorboxes
    try {
      (<any>$).colorbox.close();
    } catch {
      // Intentionally Left Blank (Fails Jest Testing)
    }

    keepTrackApi.methods.hideSideMenus();
  };
  (<any>$('#bottom-icons')).sortable({ tolerance: 'pointer' });
};

export const uiManager: UiManager = {
  hideUi: hideUi,
  isUiVisible: false,
  keyHandler: keyHandler,
  uiInput: uiInput,
  useCurrentGeolocationAsSensor: useCurrentGeolocationAsSensor,
  searchBox: searchBox,
  mobileManager: mobileManager,
  isCurrentlyTyping: false,
  onReady: onReady,
  legendMenuChange: legendMenuChange,
  init: init,
  postStart: postStart,
  getsensorinfo: getsensorinfo,
  footerToggle: footerToggle,
  searchToggle: null,
  hideSideMenus: null,
  hideLoadingScreen: null,
  loadStr: null,
  legendColorsChange: null,
  colorSchemeChangeAlert: null,
  lastColorScheme: null,
  updateURL: null,
  lookAtLatLon: null,
  reloadLastSensor: null,
  doSearch: null,
  startLowPerf: null,
  panToStar: null,
  clearRMBSubMenu: null,
  menuController: null,
  legendHoverMenuClick: legendHoverMenuClick,
  bottomIconPress: null,
  toast: null,
  createClockDOMOnce: false,
  lastNextPassCalcSatId: 0,
  lastNextPassCalcSensorId: null,
  resize2DMap: null,
  isAnalysisMenuOpen: false,
  updateNextPassOverlay: null,
  earthClicked: null,
};

// c is string name of star
// TODO: uiManager.panToStar needs to be finished
// Yaw needs fixed. Needs to incorporate a time calculation
/* istanbul ignore next */
uiManager.panToStar = function (c) {
  const { objectManager, satSet, timeManager, lineManager, mainCamera, starManager } = keepTrackApi.programs;

  // Try with the pname
  let satId = satSet.getIdFromStarName(c.pname);
  let sat = satSet.getSat(satId);

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
  mainCamera.cameraType.current = mainCamera.cameraType.Offset;
  console.log(sat);
  // ======================================================
  // Need to calculate the time to get the right RA offset
  // ======================================================
  mainCamera.camSnap(mainCamera.latToPitch(sat.dec) * -1, mainCamera.longToYaw(sat.ra * DEG2RAD, timeManager.selectedDate));
};
uiManager.loadStr = (str) => {
  if (str == '') {
    $('#loader-text').html('');
    return;
  }
  if (str == 'math') {
    $('#loader-text').html('Attempting to Math...');
  }

  switch (str) {
    case 'science':
      $('#loader-text').html('Locating Science...');
      break;
    case 'science2':
      $('#loader-text').html('Found Science...');
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
uiManager.doSearch = (searchString: string, isPreventDropDown: boolean) => {
  const { satSet } = keepTrackApi.programs;

  let idList = searchBox.doSearch(searchString, isPreventDropDown);
  if (idList.length === 0) return;

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
uiManager.toast = (toastText: string, type: string, isLong: boolean) => {
  let toastMsg = M.toast({
    html: toastText,
  });
  type = type || 'standby';
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
uiManager.updateURL = () => {
  const { objectManager, satSet, timeManager } = keepTrackApi.programs;

  var arr = window.location.href.split('?');
  var url = arr[0];
  var paramSlices = [];

  if (settingsManager.trusatMode) {
    paramSlices.push('trusat');
  }
  if (objectManager.selectedSat !== -1 && typeof satSet.getSatExtraOnly(objectManager.selectedSat).sccNum != 'undefined') {
    paramSlices.push('sat=' + satSet.getSatExtraOnly(objectManager.selectedSat).sccNum);
  }
  var currentSearch = searchBox.getCurrentSearch();
  if (currentSearch != null) {
    paramSlices.push('search=' + currentSearch);
  }
  if (timeManager.propRate < 0.99 || timeManager.propRate > 1.01) {
    paramSlices.push('rate=' + timeManager.propRate);
  }

  if (timeManager.staticOffset < -1000 || timeManager.staticOffset > 1000) {
    paramSlices.push('date=' + (timeManager.dynamicOffsetEpoch + timeManager.staticOffset).toString());
  }

  if (paramSlices.length > 0) {
    url += '?' + paramSlices.join('&');
  }

  window.history.replaceState(null, 'Keeptrack', url);
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
      const { sensorManager, mainCamera, timeManager } = keepTrackApi.programs;

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
          mainCamera.lookAtLatLon(sensorManager.selectedSensor.lat, sensorManager.selectedSensor.lon, sensorManager.selectedSensor.zoom, timeManager.selectedDate);
        } else {
          // Seems to be a single sensor without a staticnum, load that
          sensorManager.setSensor(sensorManager.sensorList[currentSensor[0].shortName], currentSensor[1]);
          uiManager.getsensorinfo();
          uiManager.legendMenuChange('default');
          mainCamera.lookAtLatLon(sensorManager.selectedSensor.lat, sensorManager.selectedSensor.lon, sensorManager.selectedSensor.zoom, timeManager.selectedDate);
        }
      }
    } catch (e) {
      // Clear old settings because they seem corrupted
      try {
        localStorage.setItem('currentSensor', null);
        console.warn('Saved Sensor Information Invalid');
      } catch {
        // do nothing
      }
    }
  }
};
uiManager.colorSchemeChangeAlert = (newScheme) => {
  // Don't Make an alert the first time!
  if (typeof uiManager.lastColorScheme == 'undefined' && newScheme.default) {
    uiManager.lastColorScheme = newScheme;
    return;
  }

  const { colorSchemeManager } = keepTrackApi.programs;

  // Don't make an alert unless something has really changed
  if (uiManager.lastColorScheme == newScheme) return;

  for (const scheme in colorSchemeManager) {
    if (newScheme == colorSchemeManager[scheme] && scheme !== 'currentColorScheme') {
      // record the new color scheme
      uiManager.lastColorScheme = newScheme;
      // Make an alert
      uiManager.toast(`Color Scheme Changed to ${scheme}`, 'normal', false);
      return;
    }
  }

  // If we get here, the color scheme is invalid
  throw new Error('Invalid Color Scheme');
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
    uiManager.loadStr('math');
    $('#loading-screen').hide();
  } else {
    // Loading Screen Resized and Hidden
    setTimeout(function () {
      $('#loading-screen').removeClass('full-loader');
      $('#loading-screen').addClass('mini-loader-container');
      $('#logo-inner-container').addClass('mini-loader');
      $('#logo-text').html('');
      $('#logo-text-version').html('');
      $('#logo-trusat').hide();
      $('#loading-screen').hide();
      uiManager.loadStr('math');
    }, 100);
  }
};
uiManager.searchToggle = (force?: boolean) => {
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
    // satSet.setColorScheme(colorSchemeManager.default, true);
    // uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
  }
};

uiManager.legendColorsChange = function () {
  const { colorSchemeManager } = keepTrackApi.programs;
  colorSchemeManager.resetObjectTypeFlags();

  $('.legend-payload-box').css('background', rgbCss(settingsManager.colors.payload));
  $('.legend-rocketBody-box').css('background', rgbCss(settingsManager.colors.rocketBody));
  $('.legend-debris-box').css('background', rgbCss(settingsManager.colors.debris));
  $('.legend-inFOV-box').css('background', rgbCss(settingsManager.colors.inView));
  $('.legend-facility-box').css('background', rgbCss(settingsManager.colors.facility));
  $('.legend-sensor-box').css('background', rgbCss(settingsManager.colors.sensor));
  if (settingsManager.trusatMode || settingsManager.isExtraSatellitesAdded) {
    $('.legend-trusat-box').css('background', rgbCss(settingsManager.colors.trusat));
  } else {
    try {
      $('.legend-trusat-box')[1].parentElement.style.display = 'none';
      $('.legend-trusat-box')[2].parentElement.style.display = 'none';
      $('.legend-trusat-box')[3].parentElement.style.display = 'none';
    } catch {
      // do nothing
    }
  }
  $('.legend-velocityFast-box').css('background', rgbCss([0.75, 0.75, 0, 1]));
  $('.legend-velocityMed-box').css('background', rgbCss([0.75, 0.25, 0, 1]));
  $('.legend-velocitySlow-box').css('background', rgbCss([1, 0, 0, 1]));
  $('.legend-inviewAlt-box').css('background', rgbCss(settingsManager.colors.inViewAlt));
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

export { doSearch, uiLimited, uiInput };
