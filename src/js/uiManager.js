/**
 * @prettier
 */

/* /////////////////////////////////////////////////////////////////////////////

http://keeptrack.space

Copyright (C) 2016-2020 Theodore Kruczek
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

import * as $ from 'jquery';
// eslint-disable-next-line sort-imports
import 'jquery-ui-bundle';
import '@app/js/lib/jquery-ui-slideraccess.js';
import '@app/js/lib/jquery-ui-timepicker.js';
import '@app/js/lib/perfect-scrollbar.min.js';
import '@app/js/lib/jquery.colorbox.min.js';
import '@app/js/lib/jquery-ajax.js';
import '@app/js/lib/colorPick.js';
import 'materialize-css';
import '@app/js/keeptrack-foot.js';
import { db, settingsManager } from '@app/js/keeptrack-head.js';
import { dlManager, webGlInit } from '@app/js/main.js';
import { earth, lineManager } from '@app/js/sceneManager/sceneManager.js';
import { helpers, mathValue, saveAs, saveCsv } from '@app/js/helpers.js';
import { satCruncher, satSet } from '@app/js/satSet.js';
import { Camera } from '@app/js/cameraManager/camera.js';
import { CanvasRecorder } from '@app/js/lib/CanvasRecorder.js';
import { ColorScheme } from '@app/js/color-scheme.js';
import { adviceList } from '@app/js/advice-module.js';
import { dateFormat } from '@app/js/lib/dateFormat.js';
import { groups } from '@app/js/groups.js';
import { mapManager } from '@app/js/mapManager.js';
import { missileManager } from '@app/modules/missileManager.js';
import { mobile } from '@app/js/mobile.js';
import { nextLaunchManager } from '@app/modules/nextLaunchManager.js';
import { objectManager } from '@app/js/objectManager.js';
import { omManager } from '@app/js/omManager.js';
import { orbitManager } from '@app/js/orbitManager.js';
import { radarDataManager } from '@app/js/radarDataManager.js';
import { sMM } from '@app/js/sideMenuManager.js';
import { satLinkManager } from '@app/modules/satLinkManager.js';
import { satellite } from '@app/js/lookangles.js';
import { searchBox } from '@app/js/search-box.js';
import { sensorManager } from '@app/modules/sensorManager.js';
import { starManager } from '@app/modules/starManager.js';
import { timeManager } from '@app/js/timeManager.js';
let M = window.M;

// Public Variables
var recorder;
try {
  recorder = new CanvasRecorder(document.getElementById('canvas'));
} catch (e) {
  console.log(e);
}
// var dropdownInstance;
const mapImageDOM = $('#map-image');
const mapMenuDOM = $('#map-menu');

const rightBtnSaveMenuDOM = $('#save-rmb-menu');
const rightBtnViewMenuDOM = $('#view-rmb-menu');
const rightBtnEditMenuDOM = $('#edit-rmb-menu');
const rightBtnCreateMenuDOM = $('#create-rmb-menu');
const rightBtnDrawMenuDOM = $('#draw-rmb-menu');
const rightBtnColorsMenuDOM = $('#colors-rmb-menu');
const rightBtnEarthMenuDOM = $('#earth-rmb-menu');

// const viewInfoRMB = $('#view-info-rmb');
// const editSatRMB = $('#edit-sat-rmb');
// const createObserverRMB = $('#create-observer-rmb');
// const createSensorRMB = $('#create-sensor-rmb');
// const clearScreenRMB = $('#clear-screen-rmb');

$.ajaxSetup({
  cache: false,
});

var updateInterval = 1000;
var createClockDOMOnce = false;

var uiManager = {};
uiManager.isAnalysisMenuOpen = false;

uiManager.isCurrentlyTyping = false;

var lastBoxUpdateTime = 0;
var lastOverlayUpdateTime = 0;
// var lastSatUpdateTime = 0;

var isSensorListMenuOpen = false;
var isInfoOverlayMenuOpen = false;
var isTwitterMenuOpen = false;
var isFindByLooksMenuOpen = false;
var isSensorInfoMenuOpen = false;
var isWatchlistMenuOpen = false;
var isLaunchMenuOpen = false;
var isAboutSelected = false;
var isColorSchemeMenuOpen = false;
var isConstellationsMenuOpen = false;
var isCountriesMenuOpen = false;
var isExternalMenuOpen = false;
var isSocratesMenuOpen = false;
var isNextLaunchMenuOpen = false;
var issatChngMenuOpen = false;
var isSettingsMenuOpen = false;
var isObfitMenuOpen = false;
var isPlanetariumView = false;
var isAstronomyView = false;
// var isSatView = false;
var isVideoRecording = false;

var watchlistList = [];
var watchlistInViewList = [];
var nextPassArray = [];
var nextPassEarliestTime;
var isWatchlistChanged = null;

/**
 * @todo Merge _uiInit and uiManager.init
 * @body Managers will become Classes and won't autoInit
 */
var cameraManager;
uiManager.init = (cameraManagerRef) => {
  cameraManager = cameraManagerRef;
};

var touchHoldButton = '';
$(document).ready(function () {
  // Code Once index.htm is loaded
  if (settingsManager.offline) updateInterval = 250;
  $('#versionNumber-text')[0].innerHTML = `${settingsManager.versionNumber} - ${settingsManager.versionDate}`;
  uiManager.resize2DMap();
  (function _httpsCheck() {
    db.log('_httpsCheck');
    if (location.protocol !== 'https:') {
      $('#cs-geolocation').hide();
      $('#geolocation-btn').hide();
    }
  })();

  (function _uiInit() {
    // Register all UI callback functions with drawLoop in main.js
    // These run during the draw loop
    dlManager.setDrawLoopCallback(function () {
      // _showSatTest();
      _updateNextPassOverlay();
      _checkWatchlist();
      _updateSelectBox();
      _mobileScreenControls();
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
  })();

  (function _menuInit() {
    db.log('_menuInit');
    // Load the current JDAY
    var jday = timeManager.getDayOfYear(timeManager.propTime());
    $('#jday').html(jday);
    jday = null; // Garbage collect

    // Initialize Navigation Menu
    document.addEventListener('DOMContentLoaded', function () {
      var elems = document.querySelectorAll('.dropdown-button');
      M.Dropdown.init(elems);
    });

    $('.tooltipped').tooltip({ delay: 50 });

    // Initialize Materialize Select Menus
    M.AutoInit();
    // dropdownInstance = M.Dropdown.getInstance($('.dropdown-trigger'));

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
        _updateNextPassOverlay(true);
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
      if (isLaunchMenuOpen) {
        isLaunchMenuOpen = false;
        $('#menu-launches').removeClass('bmenu-item-selected');
      }
    });
  })();

  var isNotColorPickerInitialSetup = false;
  (function _setupColorPicker() {
    db.log('_setupColorPicker');
    var colorPalette = [
      _rgbCSS([1.0, 0.0, 0.0, 1.0]), // Red
      _rgbCSS([1.0, 0.75, 0.0, 1.0]), // Orange
      _rgbCSS([0.85, 0.5, 0.0, 1.0]), // Dark Orange
      _rgbCSS([1.0, 1.0, 0.0, 1.0]), // Yellow
      _rgbCSS([0, 1, 0, 1]), // Green
      _rgbCSS([0.2, 1.0, 0.0, 0.5]), // Mint
      _rgbCSS([0.2, 1.0, 1.0, 1.0]), // Bright Green
      _rgbCSS([0, 0, 1, 1]), // Royal Blue
      _rgbCSS([0.2, 0.4, 1.0, 1]), // Dark Blue
      _rgbCSS([0.64, 0.0, 0.64, 1.0]), // Purple
      _rgbCSS([1.0, 0.0, 0.6, 1.0]), // Pink
      _rgbCSS([0.5, 0.5, 0.5, 1]), // Gray
      _rgbCSS([1, 1, 1, 1]), // White
    ];
    $('#settings-color-payload').css({
      backgroundColor: _rgbCSS(settingsManager.colors.payload),
    });
    $('#settings-color-payload').colorPick({
      initialColor: _rgbCSS(settingsManager.colors.payload),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css({
          backgroundColor: this.color,
          color: this.color,
        });
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.payload = getRGBA(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-rocketBody').css({
      backgroundColor: _rgbCSS(settingsManager.colors.rocketBody),
    });
    $('#settings-color-rocketBody').colorPick({
      initialColor: _rgbCSS(settingsManager.colors.rocketBody),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css({
          backgroundColor: this.color,
          color: this.color,
        });
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.rocketBody = getRGBA(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-debris').css({
      backgroundColor: _rgbCSS(settingsManager.colors.debris),
    });
    $('#settings-color-debris').colorPick({
      initialColor: _rgbCSS(settingsManager.colors.debris),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css({
          backgroundColor: this.color,
          color: this.color,
        });
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.debris = getRGBA(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-inview').colorPick({
      initialColor: _rgbCSS(settingsManager.colors.inview),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css({
          backgroundColor: this.color,
          color: this.color,
        });
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.inview = getRGBA(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-missile').colorPick({
      initialColor: _rgbCSS(settingsManager.colors.missile),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css({
          backgroundColor: this.color,
          color: this.color,
        });
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.missile = getRGBA(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-missileInview').colorPick({
      initialColor: _rgbCSS(settingsManager.colors.missileInview),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css({
          backgroundColor: this.color,
          color: this.color,
        });
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.missileInview = getRGBA(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    $('#settings-color-trusat').colorPick({
      initialColor: _rgbCSS(settingsManager.colors.trusat),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css({
          backgroundColor: this.color,
          color: this.color,
        });
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.trusat = getRGBA(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    isNotColorPickerInitialSetup = true;
  })();

  uiManager.clearRMBSubMenu = () => {
    db.log('uiManager.clearRMBSubMenu', true);
    rightBtnSaveMenuDOM.hide();
    rightBtnViewMenuDOM.hide();
    rightBtnEditMenuDOM.hide();
    rightBtnCreateMenuDOM.hide();
    rightBtnColorsMenuDOM.hide();
    rightBtnDrawMenuDOM.hide();
    rightBtnEarthMenuDOM.hide();
  };
  (function _menuController() {
    db.log('_menuController');

    // Reset time if in retro mode
    if (settingsManager.retro) {
      timeManager.propOffset = new Date(2000, 2, 13) - Date.now();
      $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.propRealTime + timeManager.propOffset));
      satCruncher.postMessage({
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
      _bottomIconPress(evt);
    });

    $('#bottom-menu').on('click', '.FOV-object', function (evt) {
      var objNum = evt.currentTarget.textContent;
      objNum = objNum.slice(-5);
      var satId = satSet.getIdFromObjNum(objNum);
      if (satId !== null) {
        objectManager.setSelectedSat(satId);
      }
    });

    $('#legend-hover-menu').on('click', function (e) {
      switch (e.target.classList[1]) {
        case 'legend-payload-box':
          if (ColorScheme.objectTypeFlags.payload) {
            ColorScheme.objectTypeFlags.payload = false;
            $('.legend-payload-box').css('background', 'black');
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          } else {
            ColorScheme.objectTypeFlags.payload = true;
            $('.legend-payload-box').css('background', _rgbCSS(settingsManager.colors.payload));
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
            $('.legend-rocketBody-box').css('background', _rgbCSS(settingsManager.colors.rocketBody));
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
            $('.legend-debris-box').css('background', _rgbCSS(settingsManager.colors.debris));
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
            $('.legend-starHi-box').css('background', _rgbCSS(settingsManager.colors.star100));
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
            $('.legend-starMed-box').css('background', _rgbCSS(settingsManager.colors.star75));
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
            $('.legend-starLow-box').css('background', _rgbCSS(settingsManager.colors.star100));
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
            $('.legend-inFOV-box').css('background', _rgbCSS(settingsManager.colors.inview));
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
            $('.legend-inviewAlt-box').css('background', _rgbCSS(settingsManager.colors.inviewAlt));
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
            $('.legend-ageNew-box').css('background', _rgbCSS(settingsManager.colors.ageNew));
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
            $('.legend-ageMed-box').css('background', _rgbCSS(settingsManager.colors.ageMed));
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
            $('.legend-ageOld-box').css('background', _rgbCSS(settingsManager.colors.ageOld));
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
            $('.legend-ageLost-box').css('background', _rgbCSS(settingsManager.colors.ageLost));
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
            $('.legend-rcsSmall-box').css('background', _rgbCSS(settingsManager.colors.rcsSmall));
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
            $('.legend-rcsMed-box').css('background', _rgbCSS(settingsManager.colors.rcsMed));
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
            $('.legend-rcsLarge-box').css('background', _rgbCSS(settingsManager.colors.rcsLarge));
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
            $('.legend-rcsUnknown-box').css('background', _rgbCSS(settingsManager.colors.rcsUnknown));
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
            $('.legend-missile-box').css('background', _rgbCSS(settingsManager.colors.missile));
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
            $('.legend-missileInview-box').css('background', _rgbCSS(settingsManager.colors.missileInview));
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
            $('.legend-sensor-box').css('background', _rgbCSS(settingsManager.colors.sensor));
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
            $('.legend-facility-box').css('background', _rgbCSS(settingsManager.colors.facility));
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
            $('.legend-trusat-box').css('background', _rgbCSS(settingsManager.colors.trusat));
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
        //     $('.legend-satLEO-box').css('background', _rgbCSS(settingsManager.colors.satLEO));
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
        //     $('.legend-satGEO-box').css('background', _rgbCSS(settingsManager.colors.satGEO));
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
            $('.legend-countryUS-box').css('background', _rgbCSS(settingsManager.colors.countryUS));
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
            $('.legend-countryCIS-box').css('background', _rgbCSS(settingsManager.colors.countryCIS));
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
            $('.legend-countryPRC-box').css('background', _rgbCSS(settingsManager.colors.countryPRC));
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
            $('.legend-countryOther-box').css('background', _rgbCSS(settingsManager.colors.countryOther));
            settingsManager.isForceColorScheme = true;
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
          }
          break;
      }
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
      // $('#menu-sensor-info').removeClass('bmenu-item-disabled');
      // $('#menu-planetarium').removeClass('bmenu-item-disabled');
      if (objectManager.selectedSat !== -1) {
        $('#menu-lookangles').removeClass('bmenu-item-disabled');
        $('#menu-satview').removeClass('bmenu-item-disabled');
      }
      if (watchlistList.length > 0) {
        $('#menu-info-overlay').removeClass('bmenu-item-disabled');
      }
    });

    /**
     * @todo Combine Sensor selection listeners
     * @body Refactor this into a single call using above and a case switch and remove the timeout for lookAtSensor.
     */

    // When any sensor is selected
    $('#sensor-list-content > div > ul > .menu-selectable').on('click', function () {
      adviceList.sensor();
      // Delay to ensure the below code is run first. This should be removed.
      setTimeout(() => uiManager.lookAtSensor(), 1000);
    });

    // USAF Radars
    $('#radar-cspocAll').on('click', function () {
      adviceList.cspocSensors();
      sensorManager.setSensor('SSN');
    });
    $('#radar-mwAll').on('click', function () {
      adviceList.mwSensors();
      sensorManager.setSensor('NATO-MW');
    });
    $('#radar-beale').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.BLE);
    });
    $('#radar-capecod').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.COD);
    });
    $('#radar-clear').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.CLR);
    });
    $('#radar-eglin').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.EGL);
    });
    $('.radar-fylingdales').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.FYL);
    });
    $('#radar-parcs').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.CAV);
    });
    $('#radar-thule').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.THL);
    });
    $('#radar-cobradane').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.CDN);
    });
    $('#radar-altair').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.ALT);
    });
    $('#radar-mmw').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.MMW);
    });
    $('#radar-alcor').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.ALC);
    });
    $('#radar-tradex').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.TDX);
    });
    $('#radar-millstone').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.MIL);
    });
    $('#radar-ascension').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.ASC);
    });
    $('#radar-globus').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.GLB);
    });
    $('#optical-diego-garcia').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.DGC);
    });
    $('#optical-maui').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.MAU);
    });
    $('#optical-socorro').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.SOC);
    });
    $('#radar-taiwan').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.TAI);
    });

    // Missile Defense Radars
    $('#radar-md-all').on('click', function () {
      sensorManager.setSensor('MD-ALL');
    });
    $('#radar-md-har').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.HAR);
    });
    $('#radar-md-qtr').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.QTR);
    });
    $('#radar-md-kur').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.KUR);
    });
    $('#radar-md-sha').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.SHA);
    });
    $('#radar-md-kcs').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.KCS);
    });
    $('#radar-md-sbx').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.SBX);
    });

    // LeoLabs Commercial Radars
    $('#radar-ll-all').on('click', function () {
      sensorManager.setSensor('LEO-LABS');
    });
    $('#radar-ll-msr').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.MSR);
    });
    $('#radar-ll-pfisr').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.PFISR);
    });
    $('#radar-ll-ksr').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.KSR);
    });

    // ESOC Radars
    $('#esoc-graves').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.GRV);
    });
    $('#esoc-tira').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.TIR);
    });
    $('#esoc-northern-cross').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.NRC);
    });
    $('#esoc-troodos').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.TRO);
    });
    $('#esoc-space-debris-telescope').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.SDT);
    });
    $('#esoc-galileo-station').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.GGS);
    });

    // Russian Radars
    $('#radar-rus-all').on('click', function () {
      sensorManager.setSensor('RUS-ALL');
    });
    $('#russian-armavir').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.ARM);
    });
    $('#russian-balkhash').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.BAL);
    });
    $('#russian-gantsevichi').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.GAN);
    });
    $('#russian-lekhtusi').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.LEK);
    });
    $('#russian-mishelevka-d').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.MIS);
    });
    $('#russian-olenegorsk').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.OLE);
    });
    $('#russian-pechora').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.PEC);
    });
    $('#russian-pionersky').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.PIO);
    });

    // Chinese Radars
    $('#chinese-xuanhua').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.XUA);
    });
    $('#chinese-purple').on('click', function () {
      sensorManager.setSensor(sensorManager.sensorList.PMO);
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
      var selectedDate = $('#datetime-input-tb').datepicker('getDate');
      var today = new Date();
      var jday = timeManager.getDayOfYear(timeManager.propTime());
      $('#jday').html(jday);
      timeManager.propOffset = selectedDate - today;
      satCruncher.postMessage({
        typ: 'offset',
        dat: timeManager.propOffset.toString() + ' ' + (1.0).toString(),
      });
      timeManager.propRealTime = Date.now();
      timeManager.propTime();
      // Reset last update times when going backwards in time
      lastOverlayUpdateTime = timeManager.now * 1 - 7000;
      lastBoxUpdateTime = timeManager.now;
      _updateNextPassOverlay(true);

      radarDataManager.findFirstDataTime();

      e.preventDefault();
    });
    $('#findByLooks').on('submit', function (e) {
      var fblAzimuth = $('#fbl-azimuth').val();
      var fblElevation = $('#fbl-elevation').val();
      var fblRange = $('#fbl-range').val();
      var fblInc = $('#fbl-inc').val();
      var fblPeriod = $('#fbl-period').val();
      var fblRcs = $('#fbl-rcs').val();
      var fblAzimuthM = $('#fbl-azimuth-margin').val();
      var fblElevationM = $('#fbl-elevation-margin').val();
      var fblRangeM = $('#fbl-range-margin').val();
      var fblIncM = $('#fbl-inc-margin').val();
      var fblPeriodM = $('#fbl-period-margin').val();
      var fblRcsM = $('#fbl-rcs-margin').val();
      var fblType = $('#fbl-type').val();
      $('#search').val(''); // Reset the search first
      var res = satSet.searchAzElRange(fblAzimuth, fblElevation, fblRange, fblInc, fblAzimuthM, fblElevationM, fblRangeM, fblIncM, fblPeriod, fblPeriodM, fblRcs, fblRcsM, fblType);
      if (typeof res === 'undefined') {
        uiManager.toast(`No Search Criteria Entered`, 'critical');
      } else if (res.length === 0) {
        uiManager.toast(`No Satellites Found`, 'critical');
      }
      e.preventDefault();
    });
    $('#analysis-form').on('submit', function (e) {
      let chartType = $('#anal-type').val();
      let sat = $('#anal-sat').val();
      let sensor = sensorManager.currentSensor.shortName;
      if (typeof sensor == 'undefined') {
        $.colorbox({
          href: `https://keeptrack.space/analysis/?sat=${sat}&type=${chartType}`,
          iframe: true,
          width: '60%',
          height: '60%',
          fastIframe: false,
          closeButton: false,
        });
      } else {
        $.colorbox({
          href: `https://keeptrack.space/analysis/?sat=${sat}&type=${chartType}&sensor=${sensor}`,
          iframe: true,
          width: '60%',
          height: '60%',
          fastIframe: false,
          closeButton: false,
        });
      }
      e.preventDefault();
    });
    $('#analysis-bpt').on('submit', function (e) {
      let sats = $('#analysis-bpt-sats').val();
      if (!sensorManager.checkSensorSelected()) {
        // Default to COD
        satellite.findBestPasses(sats, sensorManager.sensorList.COD);
      } else {
        satellite.findBestPasses(sats, sensorManager.selectedSensor);
      }
      e.preventDefault();
    });
    $('#settings-form').on('change', function (e) {
      var isDMChecked = document.getElementById('settings-demo-mode').checked;
      var isSLMChecked = document.getElementById('settings-sat-label-mode').checked;

      if (isSLMChecked && e.target.id === 'settings-demo-mode') {
        document.getElementById('settings-sat-label-mode').checked = false;
        $('#settings-demo-mode').removeClass('lever:after');
      }

      if (isDMChecked && e.target.id === 'settings-sat-label-mode') {
        document.getElementById('settings-demo-mode').checked = false;
        $('#settings-sat-label-mode').removeClass('lever:after');
      }
    });
    $('#settings-form').on('submit', function (e) {
      var isHOSChecked = document.getElementById('settings-hos').checked;
      var isDMChecked = document.getElementById('settings-demo-mode').checked;
      var isSLMChecked = document.getElementById('settings-sat-label-mode').checked;
      var isSNPChecked = document.getElementById('settings-snp').checked;
      var isRiseSetChecked = document.getElementById('settings-riseset').checked;

      if (isSLMChecked) {
        settingsManager.isSatLabelModeOn = true;
      } else {
        settingsManager.isSatLabelModeOn = false;
      }

      if (isDMChecked) {
        settingsManager.isDemoModeOn = true;
      } else {
        settingsManager.isDemoModeOn = false;
      }

      if (isHOSChecked) {
        settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0];
      } else {
        settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0.1];
      }
      ColorScheme.reloadColors();

      if (isSNPChecked) {
        sMM.isShowNextPass(true);
      } else {
        sMM.isShowNextPass(false);
      }

      if (isRiseSetChecked) {
        satellite.isRiseSetLookangles = true;
      } else {
        satellite.isRiseSetLookangles = false;
      }

      satellite.lookanglesLength = $('#lookanglesLength').val() * 1;
      satellite.lookanglesInterval = $('#lookanglesInterval').val() * 1;

      settingsManager.isForceColorScheme = true;
      satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
      e.preventDefault();
    });

    $('#obfit-form').on('submit', function (e) {
      let t1v, x1v, y1v, z1v, xd1v, yd1v, zd1v;
      let t2v, x2v, y2v, z2v, xd2v, yd2v, zd2v;
      let t3v, x3v, y3v, z3v, xd3v, yd3v, zd3v;
      let isOb1 = true;
      let isOb2 = true;
      let isOb3 = true;
      const t1 = document.getElementById('obfit-t1').value;
      if (t1.length > 0) {
        t1v = parseFloat(t1);
      } else {
        t1v = NaN;
      }
      const x1 = document.getElementById('obfit-x1').value;
      if (x1.length > 0) {
        x1v = parseFloat(x1);
      } else {
        x1v = NaN;
      }
      const y1 = document.getElementById('obfit-y1').value;
      if (y1.length > 0) {
        y1v = parseFloat(y1);
      } else {
        y1v = NaN;
      }
      const z1 = document.getElementById('obfit-z1').value;
      if (z1.length > 0) {
        z1v = parseFloat(z1);
      } else {
        z1v = NaN;
      }
      const xd1 = document.getElementById('obfit-xd1').value;
      if (xd1.length > 0) {
        xd1v = parseFloat(xd1);
      } else {
        xd1v = NaN;
      }
      const yd1 = document.getElementById('obfit-yd1').value;
      if (yd1.length > 0) {
        yd1v = parseFloat(yd1);
      } else {
        yd1v = NaN;
      }
      const zd1 = document.getElementById('obfit-zd1').value;
      if (zd1.length > 0) {
        zd1v = parseFloat(zd1);
      } else {
        zd1v = NaN;
      }
      const t2 = document.getElementById('obfit-t2').value;
      if (t2.length > 0) {
        t2v = parseFloat(t2);
      } else {
        isOb2 = false;
      }
      const x2 = document.getElementById('obfit-x2').value;
      if (x2.length > 0) {
        x2v = parseFloat(x2);
      } else {
        isOb2 = false;
      }
      const y2 = document.getElementById('obfit-y2').value;
      if (y2.length > 0) {
        y2v = parseFloat(y2);
      } else {
        isOb2 = false;
      }
      const z2 = document.getElementById('obfit-z2').value;
      if (z2.length > 0) {
        z2v = parseFloat(z2);
      } else {
        isOb2 = false;
      }
      const xd2 = document.getElementById('obfit-xd2').value;
      if (xd2.length > 0) {
        xd2v = parseFloat(xd2);
      } else {
        isOb2 = false;
      }
      const yd2 = document.getElementById('obfit-yd2').value;
      if (yd2.length > 0) {
        yd2v = parseFloat(yd2);
      } else {
        isOb2 = false;
      }
      const zd2 = document.getElementById('obfit-zd2').value;
      if (zd2.length > 0) {
        zd2v = parseFloat(zd2);
      } else {
        isOb2 = false;
      }
      const t3 = document.getElementById('obfit-t3').value;
      if (t3.length > 0) {
        t3v = parseFloat(t3);
      } else {
        isOb3 = false;
      }
      const x3 = document.getElementById('obfit-x3').value;
      if (x3.length > 0) {
        x3v = parseFloat(x3);
      } else {
        isOb3 = false;
      }
      const y3 = document.getElementById('obfit-y3').value;
      if (y3.length > 0) {
        y3v = parseFloat(y3);
      } else {
        isOb3 = false;
      }
      const z3 = document.getElementById('obfit-z3').value;
      if (z3.length > 0) {
        z3v = parseFloat(z3);
      } else {
        isOb3 = false;
      }
      const xd3 = document.getElementById('obfit-xd3').value;
      if (xd3.length > 0) {
        xd3v = parseFloat(xd3);
      } else {
        isOb3 = false;
      }
      const yd3 = document.getElementById('obfit-yd3').value;
      if (yd3.length > 0) {
        yd3v = parseFloat(yd3);
      } else {
        isOb3 = false;
      }
      const zd3 = document.getElementById('obfit-zd3').value;
      if (zd3.length > 0) {
        zd3v = parseFloat(zd3);
      } else {
        isOb3 = false;
      }

      let svs = [];
      let sv1 = [];
      {
        if (isOb1 && isNaN(t1)) {
          isOb1 = false;
          uiManager.toast(`Time 1 is Invalid!`, 'critical');
          return false;
        }
        if (isOb1 && isNaN(x1)) {
          isOb1 = false;
          uiManager.toast(`X 1 is Invalid!`, 'critical');
          return false;
        }
        if (isOb1 && isNaN(y1)) {
          isOb1 = false;
          uiManager.toast(`Y 1 is Invalid!`, 'critical');
          return false;
        }
        if (isOb1 && isNaN(z1)) {
          isOb1 = false;
          uiManager.toast(`Z 1 is Invalid!`, 'critical');
          return false;
        }
        if (isOb1 && isNaN(xd1)) {
          isOb1 = false;
          uiManager.toast(`X Dot 1 is Invalid!`, 'critical');
          return false;
        }
        if (isOb1 && isNaN(yd1)) {
          isOb1 = false;
          uiManager.toast(`Y Dot 1 is Invalid!`, 'critical');
          return false;
        }
        if (isOb1 && isNaN(zd1)) {
          isOb1 = false;
          uiManager.toast(`Z Dot 1 is Invalid!`, 'critical');
          return false;
        }
        if (isOb1) {
          sv1 = [t1v, x1v, y1v, z1v, xd1v, yd1v, zd1v];
          svs.push(sv1);
        }
      }

      let sv2 = [];
      {
        if (isOb2 && isNaN(t2)) {
          isOb2 = false;
          uiManager.toast(`Time 2 is Invalid!`, 'caution');
        }
        if (isOb2 && isNaN(x2)) {
          isOb2 = false;
          uiManager.toast(`X 2 is Invalid!`, 'caution');
        }
        if (isOb2 && isNaN(y2)) {
          isOb2 = false;
          uiManager.toast(`Y 2 is Invalid!`, 'caution');
        }
        if (isOb2 && isNaN(z2)) {
          isOb2 = false;
          uiManager.toast(`Z 2 is Invalid!`, 'caution');
        }
        if (isOb2 && isNaN(xd2)) {
          isOb2 = false;
          uiManager.toast(`X Dot 2 is Invalid!`, 'caution');
        }
        if (isOb2 && isNaN(yd2)) {
          isOb2 = false;
          uiManager.toast(`Y Dot 2 is Invalid!`, 'caution');
        }
        if (isOb2 && isNaN(zd2)) {
          isOb2 = false;
          uiManager.toast(`Z Dot 2 is Invalid!`, 'caution');
        }
        if (isOb2) {
          sv2 = [t2v, x2v, y2v, z2v, xd2v, yd2v, zd2v];
          svs.push(sv2);
        }
      }

      isOb3 = !isOb2 ? false : isOb3;
      let sv3 = [];
      {
        if (isOb3 && isNaN(t3)) {
          isOb3 = false;
          uiManager.toast(`Time 3 is Invalid!`, 'caution');
        }
        if (isOb3 && isNaN(x3)) {
          isOb3 = false;
          uiManager.toast(`X 3 is Invalid!`, 'caution');
        }
        if (isOb3 && isNaN(y3)) {
          isOb3 = false;
          uiManager.toast(`Y 3 is Invalid!`, 'caution');
        }
        if (isOb3 && isNaN(z3)) {
          isOb3 = false;
          uiManager.toast(`Z 3 is Invalid!`, 'caution');
        }
        if (isOb3 && isNaN(xd3)) {
          isOb3 = false;
          uiManager.toast(`X Dot 3 is Invalid!`, 'caution');
        }
        if (isOb3 && isNaN(yd3)) {
          isOb3 = false;
          uiManager.toast(`Y Dot 3 is Invalid!`, 'caution');
        }
        if (isOb3 && isNaN(zd3)) {
          isOb3 = false;
          uiManager.toast(`Z Dot 3 is Invalid!`, 'caution');
        }
        if (isOb3) {
          sv3 = [t3v, x3v, y3v, z3v, xd3v, yd3v, zd3v];
          svs.push(sv3);
        }
      }
      console.log(svs);
      omManager.svs2analyst(svs);
      e.preventDefault();
    });

    $('#n2yo-form').on('submit', function (e) {
      $('#loading-screen').fadeIn(1000, function () {
        let satnum = $('#ext-n2yo').val() * 1;
        satSet.searchN2yo(satnum);
        $('#loading-screen').fadeOut('slow');
      });
      e.preventDefault();
    });

    $('#celestrak-form').on('submit', function (e) {
      $('#loading-screen').fadeIn(1000, function () {
        let satnum = $('#ext-celestrak').val() * 1;
        satSet.searchCelestrak(satnum);
        $('#loading-screen').fadeOut('slow');
      });
      e.preventDefault();
    });

    $('#editSat-newTLE').on('click', function () {
      $('#loading-screen').fadeIn(1000, function () {
        // Update Satellite TLE so that Epoch is Now but ECI position is very very close
        var satId = satSet.getIdFromObjNum($('#es-scc').val());
        var mainsat = satSet.getSat(satId);

        // Launch Points are the Satellites Current Location
        var TEARR = mainsat.getTEARR();
        var launchLat, launchLon, alt;
        launchLon = satellite.degreesLong(TEARR.lon);
        launchLat = satellite.degreesLat(TEARR.lat);
        alt = TEARR.alt;

        var upOrDown = mainsat.getDirection();

        var currentEpoch = satellite.currentEpoch(timeManager.propTime());
        mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);

        cameraManager.camSnapMode = false;

        var TLEs;
        // Ignore argument of perigee for round orbits OPTIMIZE
        if (mainsat.apogee - mainsat.perigee < 300) {
          TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset);
        } else {
          TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset, alt);
        }
        var TLE1 = TLEs[0];
        var TLE2 = TLEs[1];
        satCruncher.postMessage({
          typ: 'satEdit',
          id: satId,
          TLE1: TLE1,
          TLE2: TLE2,
        });
        orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);
        //
        // Reload Menu with new TLE
        //
        let sat = satSet.getSatExtraOnly(objectManager.selectedSat);
        $('#es-scc').val(sat.SCC_NUM);

        var inc = (sat.inclination * mathValue.RAD2DEG).toPrecision(7);
        inc = inc.split('.');
        inc[0] = inc[0].substr(-3, 3);
        inc[1] = inc[1].substr(0, 4);
        inc = (inc[0] + '.' + inc[1]).toString();

        $('#es-inc').val(helpers.pad0(inc, 8));
        $('#es-year').val(sat.TLE1.substr(18, 2));
        $('#es-day').val(sat.TLE1.substr(20, 12));
        $('#es-meanmo').val(sat.TLE2.substr(52, 11));

        var rasc = (sat.raan * mathValue.RAD2DEG).toPrecision(7);
        rasc = rasc.split('.');
        rasc[0] = rasc[0].substr(-3, 3);
        rasc[1] = rasc[1].substr(0, 4);
        rasc = (rasc[0] + '.' + rasc[1]).toString();

        $('#es-rasc').val(helpers.pad0(rasc, 8));
        $('#es-ecen').val(sat.eccentricity.toPrecision(7).substr(2, 7));

        var argPe = (sat.argPe * mathValue.RAD2DEG).toPrecision(7);
        argPe = argPe.split('.');
        argPe[0] = argPe[0].substr(-3, 3);
        argPe[1] = argPe[1].substr(0, 4);
        argPe = (argPe[0] + '.' + argPe[1]).toString();

        $('#es-argPe').val(helpers.pad0(argPe, 8));
        $('#es-meana').val(sat.TLE2.substr(44 - 1, 7 + 1));

        $('#loading-screen').fadeOut('slow');
      });
    });

    $('#editSat').on('submit', function (e) {
      $('#es-error').hide();
      var scc = $('#es-scc').val();
      var satId = satSet.getIdFromObjNum(scc);
      if (satId === null) {
        console.log('Not a Real Satellite');
        e.preventDefault();
        return false;
      }
      var sat = satSet.getSatExtraOnly(satId);

      var intl = sat.TLE1.substr(9, 8);

      var inc = $('#es-inc').val();

      inc = parseFloat(inc).toPrecision(7);
      inc = inc.split('.');
      inc[0] = inc[0].substr(-3, 3);
      if (inc[1]) {
        inc[1] = inc[1].substr(0, 4);
      } else {
        inc[1] = '0000';
      }
      inc = (inc[0] + '.' + inc[1]).toString();
      inc = helpers.pad0(inc, 8);

      var meanmo = $('#es-meanmo').val();

      meanmo = parseFloat(meanmo).toPrecision(10);
      meanmo = meanmo.split('.');
      meanmo[0] = meanmo[0].substr(-2, 2);
      if (meanmo[1]) {
        meanmo[1] = meanmo[1].substr(0, 8);
      } else {
        meanmo[1] = '00000000';
      }
      meanmo = (meanmo[0] + '.' + meanmo[1]).toString();
      meanmo = helpers.pad0(meanmo, 8);

      var rasc = $('#es-rasc').val();

      rasc = parseFloat(rasc).toPrecision(7);
      rasc = rasc.split('.');
      rasc[0] = rasc[0].substr(-3, 3);
      if (rasc[1]) {
        rasc[1] = rasc[1].substr(0, 4);
      } else {
        rasc[1] = '0000';
      }
      rasc = (rasc[0] + '.' + rasc[1]).toString();
      rasc = helpers.pad0(rasc, 8);

      var ecen = $('#es-ecen').val();
      var argPe = $('#es-argPe').val();

      argPe = parseFloat(argPe).toPrecision(7);
      argPe = argPe.split('.');
      argPe[0] = argPe[0].substr(-3, 3);
      if (argPe[1]) {
        argPe[1] = argPe[1].substr(0, 4);
      } else {
        argPe[1] = '0000';
      }
      argPe = (argPe[0] + '.' + argPe[1]).toString();
      argPe = helpers.pad0(argPe, 8);

      var meana = $('#es-meana').val();

      meana = parseFloat(meana).toPrecision(7);
      meana = meana.split('.');
      meana[0] = meana[0].substr(-3, 3);
      if (meana[1]) {
        meana[1] = meana[1].substr(0, 4);
      } else {
        meana[1] = '0000';
      }
      meana = (meana[0] + '.' + meana[1]).toString();
      meana = helpers.pad0(meana, 8);

      var epochyr = $('#es-year').val();
      var epochday = $('#es-day').val();

      var TLE1Ending = sat.TLE1.substr(32, 39);

      var TLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
      var TLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

      if (satellite.altitudeCheck(TLE1, TLE2, timeManager.propOffset) > 1) {
        satCruncher.postMessage({
          typ: 'satEdit',
          id: satId,
          active: true,
          TLE1: TLE1,
          TLE2: TLE2,
        });
        orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);
        sat.active = true;
      } else {
        $('#es-error').html('Failed Altitude Check</br>Try Different Parameters');
        $('#es-error').show();
      }
      e.preventDefault();
    });

    $('#editSat-save').on('click', function (e) {
      var scc = $('#es-scc').val();
      var satId = satSet.getIdFromObjNum(scc);
      var sat = satSet.getSatExtraOnly(satId);
      var sat2 = {
        TLE1: sat.TLE1,
        TLE2: sat.TLE2,
      };
      var variable = JSON.stringify(sat2);
      var blob = new Blob([variable], {
        type: 'text/plain;charset=utf-8',
      });
      saveAs(blob, scc + '.tle');
      e.preventDefault();
    });

    $('#editSat-open').on('click', function () {
      $('#editSat-file').trigger('click');
    });

    $('#editSat-file').on('change', function (evt) {
      if (!window.FileReader) return; // Browser is not compatible

      var reader = new FileReader();

      reader.onload = function (evt) {
        if (evt.target.readyState !== 2) return;
        if (evt.target.error) {
          console.log('error');
          return;
        }

        var object = JSON.parse(evt.target.result);
        var scc = parseInt(helpers.pad0(object.TLE1.substr(2, 5).trim(), 5));
        var satId = satSet.getIdFromObjNum(scc);
        var sat = satSet.getSatExtraOnly(satId);
        if (satellite.altitudeCheck(object.TLE1, object.TLE2, timeManager.propOffset) > 1) {
          satCruncher.postMessage({
            typ: 'satEdit',
            id: sat.id,
            active: true,
            TLE1: object.TLE1,
            TLE2: object.TLE2,
          });
          orbitManager.updateOrbitBuffer(sat.id, true, object.TLE1, object.TLE2);
          sat.active = true;
        } else {
          $('#es-error').html('Failed Altitude Check</br>Try Different Parameters');
          $('#es-error').show();
        }
      };
      reader.readAsText(evt.target.files[0]);
      evt.preventDefault();
    });

    $('#es-error').on('click', function () {
      $('#es-error').hide();
    });

    $('#map-menu').on('click', '.map-look', function (evt) {
      settingsManager.isMapUpdateOverride = true;
      // Might be better code for this.
      var time = evt.currentTarget.attributes.time.value;
      if (time !== null) {
        time = time.split(' ');
        time = new Date(time[0] + 'T' + time[1] + 'Z');
        var today = new Date(); // Need to know today for offset calculation
        timeManager.propOffset = time - today; // Find the offset from today
        satCruncher.postMessage({
          // Tell satCruncher we have changed times for orbit calculations
          typ: 'offset',
          dat: timeManager.propOffset.toString() + ' ' + (1.0).toString(),
        });
      }
    });

    $('#socrates-menu').on('click', '.socrates-object', function (evt) {
      // Might be better code for this.
      var hiddenRow = evt.currentTarget.attributes.hiddenrow.value;
      if (hiddenRow !== null) {
        _socrates(hiddenRow);
      }
    });
    $('#satChng-menu').on('click', '.satChng-object', function (evt) {
      // Might be better code for this.
      var hiddenRow = evt.currentTarget.attributes.hiddenrow.value;
      if (hiddenRow !== null) {
        uiManager.satChng(hiddenRow);
      }
    });
    // $('#nextLaunch-menu').on('click', '.satChng-object', function (evt) {
    //   Might be better code for this
    //   var hiddenRow = evt.currentTarget.attributes.hiddenrow.value;
    //   if (hiddenRow !== null) {
    //     uiManager.satChng(hiddenRow);
    //   }
    // });
    $('#watchlist-list').on('click', '.watchlist-remove', function () {
      var satId = $(this).data('sat-id');
      for (var i = 0; i < watchlistList.length; i++) {
        if (watchlistList[i] === satId) {
          watchlistList.splice(i, 1);
          watchlistInViewList.splice(i, 1);
        }
      }
      uiManager.updateWatchlist();
      if (watchlistList.length <= 0) {
        uiManager.doSearch('');
        satSet.setColorScheme(ColorScheme.default, true);
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        settingsManager.themes.blueTheme();
      }
      if (!sensorManager.checkSensorSelected() || watchlistList.length <= 0) {
        isWatchlistChanged = false;
        $('#menu-info-overlay').addClass('bmenu-item-disabled');
      }
    });
    // Add button selected on watchlist menu
    $('#watchlist-content').on('click', '.watchlist-add', function () {
      var satId = satSet.getIdFromObjNum(helpers.pad0($('#watchlist-new').val(), 5));
      var duplicate = false;
      for (var i = 0; i < watchlistList.length; i++) {
        // No duplicates
        if (watchlistList[i] === satId) duplicate = true;
      }
      if (!duplicate) {
        watchlistList.push(satId);
        watchlistInViewList.push(false);
        uiManager.updateWatchlist();
      }
      if (sensorManager.checkSensorSelected()) {
        $('#menu-info-overlay').removeClass('bmenu-item-disabled');
      }
      $('#watchlist-new').val(''); // Clear the search box after enter pressed/selected
    });
    // Enter pressed/selected on watchlist menu
    $('#watchlist-content').on('submit', function (e) {
      var satId = satSet.getIdFromObjNum(helpers.pad0($('#watchlist-new').val(), 5));
      var duplicate = false;
      for (var i = 0; i < watchlistList.length; i++) {
        // No duplicates
        if (watchlistList[i] === satId) duplicate = true;
      }
      if (!duplicate) {
        watchlistList.push(satId);
        watchlistInViewList.push(false);
        uiManager.updateWatchlist();
      }
      if (sensorManager.checkSensorSelected()) {
        $('#menu-info-overlay').removeClass('bmenu-item-disabled');
      }
      $('#watchlist-new').val(''); // Clear the search box after enter pressed/selected
      e.preventDefault();
    });
    $('#watchlist-save').on('click', function (e) {
      var saveWatchlist = [];
      for (var i = 0; i < watchlistList.length; i++) {
        var sat = satSet.getSatExtraOnly(watchlistList[i]);
        saveWatchlist[i] = sat.SCC_NUM;
      }
      var variable = JSON.stringify(saveWatchlist);
      var blob = new Blob([variable], {
        type: 'text/plain;charset=utf-8',
      });
      saveAs(blob, 'watchlist.json');
      e.preventDefault();
    });
    $('#watchlist-open').on('click', function () {
      $('#watchlist-file').trigger('click');
    });
    $('#watchlist-file').on('change', function (evt) {
      if (!window.FileReader) return; // Browser is not compatible

      var reader = new FileReader();

      reader.onload = function (evt) {
        if (evt.target.readyState !== 2) return;
        if (evt.target.error) {
          console.log('error');
          return;
        }

        var newWatchlist = JSON.parse(evt.target.result);
        watchlistInViewList = [];
        for (var i = 0; i < newWatchlist.length; i++) {
          var sat = satSet.getSatExtraOnly(satSet.getIdFromObjNum(newWatchlist[i]));
          if (sat !== null) {
            newWatchlist[i] = sat.id;
            watchlistInViewList.push(false);
          } else {
            console.error('Watchlist File Format Incorret');
            return;
          }
        }
        watchlistList = newWatchlist;
        uiManager.updateWatchlist();
        if (sensorManager.checkSensorSelected()) {
          $('#menu-info-overlay').removeClass('bmenu-item-disabled');
        }
      };
      reader.readAsText(evt.target.files[0]);
      evt.preventDefault();
    });

    $('#newLaunch').on('submit', function (e) {
      $('#loading-screen').fadeIn(1000, function () {
        $('#nl-error').hide();
        var scc = $('#nl-scc').val();
        var satId = satSet.getIdFromObjNum(scc);
        var sat = satSet.getSat(satId);
        // var intl = sat.INTLDES.trim();

        var upOrDown = $('#nl-updown').val();

        var launchFac = $('#nl-facility').val();
        // if (settingsManager.isOfficialWebsite) ga('send', 'event', 'New Launch', launchFac, 'Launch Site');

        var launchLat, launchLon;

        if (objectManager.isLaunchSiteManagerLoaded) {
          for (var launchSite in window.launchSiteManager.launchSiteList) {
            if (window.launchSiteManager.launchSiteList[launchSite].name === launchFac) {
              launchLat = window.launchSiteManager.launchSiteList[launchSite].lat;
              launchLon = window.launchSiteManager.launchSiteList[launchSite].lon;
            }
          }
        }
        if (launchLon > 180) {
          // if West not East
          launchLon -= 360; // Convert from 0-360 to -180-180
        }

        // Set time to 0000z for relative time.

        var today = new Date(); // Need to know today for offset calculation
        var quadZTime = new Date(today.getFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0); // New Date object of the future collision
        // Date object defaults to local time.
        quadZTime.setUTCHours(0); // Move to UTC Hour

        timeManager.propOffset = quadZTime - today; // Find the offset from today
        cameraManager.camSnapMode = false;
        satCruncher.postMessage({
          // Tell satCruncher we have changed times for orbit calculations
          typ: 'offset',
          dat: timeManager.propOffset.toString() + ' ' + (1.0).toString(),
        });

        var TLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset);

        var TLE1 = TLEs[0];
        var TLE2 = TLEs[1];

        if (satellite.altitudeCheck(TLE1, TLE2, timeManager.propOffset) > 1) {
          satCruncher.postMessage({
            typ: 'satEdit',
            id: satId,
            active: true,
            TLE1: TLE1,
            TLE2: TLE2,
          });
          orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);

          sat = satSet.getSat(satId);
        } else {
          $('#nl-error').html('Failed Altitude Check</br>Try Editing Manually');
          $('#nl-error').show();
        }
        $('#loading-screen').fadeOut('slow');
      });
      e.preventDefault();
    });

    $('#nl-error').on('click', function () {
      $('#nl-error').hide();
    });

    $('#breakup').on('submit', function (e) {
      $('#loading-screen').fadeIn(1000, function () {
        var satId = satSet.getIdFromObjNum($('#hc-scc').val());
        var mainsat = satSet.getSat(satId);
        var origsat = mainsat;

        // Launch Points are the Satellites Current Location
        // TODO: Remove TEARR References
        //
        // var latlon = satellite.eci2ll(mainsat.position.x,mainsat.position.y,mainsat.position.z);
        // var launchLat = satellite.degreesLat(latlon.latitude * DEG2RAD);
        // var launchLon = satellite.degreesLong(latlon.longitude * DEG2RAD);
        // var alt = satellite.altitudeCheck(mainsat.TLE1, mainsat.TLE2, timeManager.getPropOffset());
        // console.log(launchLat);
        // console.log(launchLon);
        // console.log(alt);

        // Launch Points are the Satellites Current Location
        var TEARR = mainsat.getTEARR();
        var launchLat, launchLon, alt;
        launchLat = satellite.degreesLat(TEARR.lat);
        launchLon = satellite.degreesLong(TEARR.lon);
        alt = TEARR.alt;

        var upOrDown = mainsat.getDirection();
        // console.log(upOrDown);

        var currentEpoch = satellite.currentEpoch(timeManager.propTime());
        mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);

        cameraManager.camSnapMode = false;

        var TLEs;
        // Ignore argument of perigee for round orbits OPTIMIZE
        if (mainsat.apogee - mainsat.perigee < 300) {
          TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset);
        } else {
          TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset, alt);
        }
        var TLE1 = TLEs[0];
        var TLE2 = TLEs[1];
        satCruncher.postMessage({
          typ: 'satEdit',
          id: satId,
          TLE1: TLE1,
          TLE2: TLE2,
        });
        orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);

        var breakupSearchString = '';

        var meanmoVariation = $('#hc-per').val();
        var incVariation = $('#hc-inc').val();
        var rascVariation = $('#hc-raan').val();

        var breakupCount = 100; // settingsManager.maxAnalystSats;
        for (var i = 0; i < breakupCount; i++) {
          for (var incIterat = 0; incIterat <= 4; incIterat++) {
            for (var meanmoIterat = 0; meanmoIterat <= 4; meanmoIterat++) {
              for (var rascIterat = 0; rascIterat <= 4; rascIterat++) {
                if (i >= breakupCount) continue;
                satId = satSet.getIdFromObjNum(80000 + i);
                var sat = satSet.getSat(satId);
                sat = origsat;
                var iTLE1 = '1 ' + (80000 + i) + TLE1.substr(7);

                var rascOffset = -rascVariation / 2 + rascVariation * (rascIterat / 4);

                var iTLEs;
                // Ignore argument of perigee for round orbits OPTIMIZE
                if (sat.apogee - sat.perigee < 300) {
                  iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset, 0, rascOffset);
                } else {
                  iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset, alt, rascOffset);
                }
                iTLE1 = iTLEs[0];
                iTLE2 = iTLEs[1];

                // For the first 30
                var inc = TLE2.substr(8, 8);
                inc = parseFloat(inc - incVariation / 2 + incVariation * (incIterat / 4)).toPrecision(7);
                inc = inc.split('.');
                inc[0] = inc[0].substr(-3, 3);
                if (inc[1]) {
                  inc[1] = inc[1].substr(0, 4);
                } else {
                  inc[1] = '0000';
                }
                inc = (inc[0] + '.' + inc[1]).toString();
                inc = helpers.padEmpty(inc, 8);

                // For the second 30
                var meanmo = iTLE2.substr(52, 10);
                meanmo = parseFloat(meanmo - (meanmo * meanmoVariation) / 2 + meanmo * meanmoVariation * (meanmoIterat / 4)).toPrecision(10);
                // meanmo = parseFloat(meanmo - (0.005 / 10) + (0.01 * ((meanmoIterat + 1) / 10))).toPrecision(10);
                meanmo = meanmo.split('.');
                meanmo[0] = meanmo[0].substr(-2, 2);
                if (meanmo[1]) {
                  meanmo[1] = meanmo[1].substr(0, 8);
                } else {
                  meanmo[1] = '00000000';
                }
                meanmo = (meanmo[0] + '.' + meanmo[1]).toString();

                var iTLE2 = '2 ' + (80000 + i) + ' ' + inc + ' ' + iTLE2.substr(17, 35) + meanmo + iTLE2.substr(63);
                sat = satSet.getSat(satId);
                sat.TLE1 = iTLE1;
                sat.TLE2 = iTLE2;
                sat.active = true;
                if (satellite.altitudeCheck(iTLE1, iTLE2, timeManager.propOffset) > 1) {
                  satCruncher.postMessage({
                    typ: 'satEdit',
                    id: satId,
                    TLE1: iTLE1,
                    TLE2: iTLE2,
                  });
                  orbitManager.updateOrbitBuffer(satId, true, iTLE1, iTLE2);
                } else {
                  console.error('Breakup Generator Failed');
                }
                i++;
              }
            }
          }
        }
        breakupSearchString += mainsat.SCC_NUM + ',Analyst Sat';
        uiManager.doSearch(breakupSearchString);

        $('#loading-screen').fadeOut('slow');
      });
      e.preventDefault();
    });

    $('#missile').on('submit', function (e) {
      $('#loading-screen').fadeIn(1000, function () {
        $('#ms-error').hide();
        var type = $('#ms-type').val() * 1;
        var attacker = $('#ms-attacker').val() * 1;
        let lauLat = $('#ms-lat-lau').val() * 1;
        let lauLon = $('#ms-lon-lau').val() * 1;
        var target = $('#ms-target').val() * 1;
        var tgtLat = $('#ms-lat').val() * 1;
        var tgtLon = $('#ms-lon').val() * 1;
        // var result = false;

        let launchTime = timeManager.selectedDate * 1;

        if (type > 0) {
          let sim = '';
          if (type === 1) {
            sim = 'simulation/Russia2USA.json';
            missileManager.MassRaidPre(launchTime, sim);
          }
          if (type === 2) {
            sim = 'simulation/Russia2USAalt.json';
            missileManager.MassRaidPre(launchTime, sim);
          }
          if (type === 3) {
            sim = 'simulation/China2USA.json';
            missileManager.MassRaidPre(launchTime, sim);
          }
          if (type === 4) {
            sim = 'simulation/NorthKorea2USA.json';
            missileManager.MassRaidPre(launchTime, sim);
          }
          if (type === 5) {
            sim = 'simulation/USA2Russia.json';
            missileManager.MassRaidPre(launchTime, sim);
          }
          if (type === 6) {
            sim = 'simulation/USA2China.json';
            missileManager.MassRaidPre(launchTime, sim);
          }
          if (type === 7) {
            sim = 'simulation/USA2NorthKorea.json';
            missileManager.MassRaidPre(launchTime, sim);
          }
          // if (settingsManager.isOfficialWebsite) ga('send','event','Missile Sim',type,'Sim Number');
          uiManager.toast(`${sim} Loaded`, 'standby', true);
        } else {
          if (target === -1) {
            // Custom Target
            if (isNaN(tgtLat)) {
              uiManager.toast(`Invalid Target Latitude!`, 'critical');
              e.preventDefault();
              $('#loading-screen').hide();
              return;
            }
            if (isNaN(tgtLon)) {
              uiManager.toast(`Invalid Target Longitude!`, 'critical');
              e.preventDefault();
              $('#loading-screen').hide();
              return;
            }
          } else {
            // Premade Target
            tgtLat = missileManager.globalBMTargets[target * 3];
            tgtLon = missileManager.globalBMTargets[target * 3 + 1];
          }

          if (isNaN(lauLat)) {
            uiManager.toast(`Invalid Launch Latitude!`, 'critical');
            e.preventDefault();
            $('#loading-screen').hide();
            return;
          }
          if (isNaN(lauLon)) {
            uiManager.toast(`Invalid Launch Longitude!`, 'critical');
            e.preventDefault();
            $('#loading-screen').hide();
            return;
          }

          var a, b; //, attackerName;

          if (attacker < 200) {
            // USA
            a = attacker - 100;
            b = 500 - missileManager.missilesInUse;
            let missileMinAlt = 1200;
            if (attacker != 100) {
              // Use Custom Launch Site
              lauLat = missileManager.UsaICBM[a * 4];
              lauLon = missileManager.UsaICBM[a * 4 + 1];
              missileMinAlt = 1100; //https://www.space.com/8689-air-force-launches-ballistic-missile-suborbital-test.html
            }
            // attackerName = missileManager.UsaICBM[a * 4 + 2];
            missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', missileMinAlt);
          } else if (attacker < 300) {
            // Russian
            a = attacker - 200;
            b = 500 - missileManager.missilesInUse;
            let missileMinAlt = 1120;
            if (attacker != 213 && attacker != 214 && attacker != 215) {
              // Use Custom Launch Site
              lauLat = missileManager.RussianICBM[a * 4];
              lauLon = missileManager.RussianICBM[a * 4 + 1];
            }
            // attackerName = missileManager.RussianICBM[a * 4 + 2];
            missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.RussianICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.RussianICBM[a * 4 + 3], 'Russia', missileMinAlt);
          } else if (attacker < 400) {
            // Chinese
            a = attacker - 300;
            b = 500 - missileManager.missilesInUse;
            let missileMinAlt = 1120;
            if (attacker != 321) {
              // Use Custom Launch Site
              lauLat = missileManager.ChinaICBM[a * 4];
              lauLon = missileManager.ChinaICBM[a * 4 + 1];
            }
            // attackerName = missileManager.ChinaICBM[a * 4 + 2];
            missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.ChinaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.ChinaICBM[a * 4 + 3], 'China', missileMinAlt);
          } else if (attacker < 500) {
            // North Korean
            a = attacker - 400;
            b = 500 - missileManager.missilesInUse;
            let missileMinAlt = 1120;
            if (attacker != 400) {
              // Use Custom Launch Site
              lauLat = missileManager.NorthKoreanBM[a * 4];
              lauLon = missileManager.NorthKoreanBM[a * 4 + 1];
            }
            // attackerName = missileManager.NorthKoreanBM[a * 4 + 2];
            missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.NorthKoreanBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.NorthKoreanBM[a * 4 + 3], 'North Korea', missileMinAlt);
          } else if (attacker < 600) {
            // French SLBM
            a = attacker - 500;
            b = 500 - missileManager.missilesInUse;
            // attackerName = missileManager.FraSLBM[a * 4 + 2];
            let missileMinAlt = 1000;
            if (attacker != 500) {
              // Use Custom Launch Site
              lauLat = missileManager.FraSLBM[a * 4];
              lauLon = missileManager.FraSLBM[a * 4 + 1];
            }
            // https://etikkradet.no/files/2017/02/EADS-Engelsk.pdf
            missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.FraSLBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.FraSLBM[a * 4 + 3], 'France', missileMinAlt);
          } else if (attacker < 700) {
            // United Kingdom SLBM
            a = attacker - 600;
            b = 500 - missileManager.missilesInUse;
            // attackerName = missileManager.ukSLBM[a * 4 + 2];
            let missileMinAlt = 1200;
            if (attacker != 600) {
              // Use Custom Launch Site
              lauLat = missileManager.ukSLBM[a * 4];
              lauLon = missileManager.ukSLBM[a * 4 + 1];
            }
            missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.ukSLBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.ukSLBM[a * 4 + 3], 'United Kigndom', missileMinAlt);
          }
          // if (settingsManager.isOfficialWebsite)
          //     ga(
          //         'send',
          //         'event',
          //         'New Missile',
          //         attackerName,
          //         'Attacker'
          //     );
          // if (settingsManager.isOfficialWebsite)
          //     ga(
          //         'send',
          //         'event',
          //         'New Missile',
          //         tgtLat + ', ' + tgtLon,
          //         'Target'
          //     );
          uiManager.toast(missileManager.lastMissileError, missileManager.lastMissileErrorType);
          uiManager.doSearch('RV_');
        }
        $('#loading-screen').hide();
      });
      e.preventDefault();
    });

    $('#ms-attacker').on('change', () => {
      let isSub = false;
      let subList = [100, 600, 213, 214, 215, 321, 500, 400];
      for (var i = 0; i < subList.length; i++) {
        if (subList[i] == parseInt($('#ms-attacker').val())) {
          isSub = true;
        }
      }
      if (!isSub) {
        $('#ms-lau-holder-lat').hide();
        $('#ms-lau-holder-lon').hide();
      } else {
        $('#ms-lau-holder-lat').show();
        $('#ms-lau-holder-lon').show();
      }
    });

    $('#ms-target').on('change', () => {
      if (parseInt($('#ms-target').val()) !== -1) {
        $('#ms-tgt-holder-lat').hide();
        $('#ms-tgt-holder-lon').hide();
      } else {
        $('#ms-tgt-holder-lat').show();
        $('#ms-tgt-holder-lon').show();
      }
    });

    $('#ms-error').on('click', function () {
      $('#ms-error').hide();
    });

    $('#fbl-error').on('click', function () {
      $('#fbl-error').hide();
    });

    $('#missile').on('change', function () {
      if ($('#ms-type').val() * 1 !== 0) {
        $('#ms-custom-opt').hide();
      } else {
        $('#ms-custom-opt').show();
      }
    });

    $('#cs-telescope').on('click', function () {
      if ($('#cs-telescope').is(':checked')) {
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
        $('#cs-maxrange').val(1000000);
      } else {
        $('#cs-minaz').attr('disabled', false);
        $('#cs-maxaz').attr('disabled', false);
        $('#cs-minel').attr('disabled', false);
        $('#cs-maxel').attr('disabled', false);
        $('#cs-minrange').attr('disabled', false);
        $('#cs-maxrange').attr('disabled', false);
        $('#cs-minaz-div').show();
        $('#cs-maxaz-div').show();
        $('#cs-minel-div').show();
        $('#cs-maxel-div').show();
        $('#cs-minrange-div').show();
        $('#cs-maxrange-div').show();
        if (sensorManager.checkSensorSelected()) {
          $('#cs-minaz').val(sensorManager.selectedSensor.obsminaz);
          $('#cs-maxaz').val(sensorManager.selectedSensor.obsmaxaz);
          $('#cs-minel').val(sensorManager.selectedSensor.obsminel);
          $('#cs-maxel').val(sensorManager.selectedSensor.obsmaxel);
          $('#cs-minrange').val(sensorManager.selectedSensor.obsminrange);
          $('#cs-maxrange').val(sensorManager.selectedSensor.obsmaxrange);
        }
      }
    });

    $('#customSensor').on('submit', function (e) {
      $('#menu-sensor-info').removeClass('bmenu-item-disabled');
      $('#menu-fov-bubble').removeClass('bmenu-item-disabled');
      $('#menu-surveillance').removeClass('bmenu-item-disabled');
      $('#menu-planetarium').removeClass('bmenu-item-disabled');
      $('#menu-astronomy').removeClass('bmenu-item-disabled');
      sensorManager.whichRadar = 'CUSTOM';
      $('#sensor-type').html($('#cs-type').val());
      $('#sensor-info-title').html('Custom Sensor');
      $('#sensor-country').html('Custom Sensor');

      var lon = $('#cs-lon').val();
      var lat = $('#cs-lat').val();
      var obshei = $('#cs-hei').val();
      var sensorType = $('#cs-type').val();
      var minaz = $('#cs-minaz').val();
      var maxaz = $('#cs-maxaz').val();
      var minel = $('#cs-minel').val();
      var maxel = $('#cs-maxel').val();
      var minrange = $('#cs-minrange').val();
      var maxrange = $('#cs-maxrange').val();

      satCruncher.postMessage({
        // Send SatCruncher File information on this radar
        typ: 'offset', // Tell satcruncher to update something
        dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(), // Tell satcruncher what time it is and how fast time is moving
        setlatlong: true, // Tell satcruncher we are changing observer location
        sensor: {
          lat: lat * 1,
          long: lon * 1,
          obshei: obshei * 1,
          obsminaz: minaz * 1,
          obsmaxaz: maxaz * 1,
          obsminel: minel * 1,
          obsmaxel: maxel * 1,
          obsminrange: minrange * 1,
          obsmaxrange: maxrange * 1,
          type: sensorType,
        },
      });

      satellite.setobs({
        lat: lat * 1,
        long: lon * 1,
        obshei: obshei * 1,
        obsminaz: minaz * 1,
        obsmaxaz: maxaz * 1,
        obsminel: minel * 1,
        obsmaxel: maxel * 1,
        obsminrange: minrange * 1,
        obsmaxrange: maxrange * 1,
        type: sensorType,
      });

      // objectManager.setSelectedSat(-1);
      lat = lat * 1;
      lon = lon * 1;
      if (maxrange > 6000) {
        cameraManager.changeZoom('geo');
      } else {
        cameraManager.changeZoom('leo');
      }
      cameraManager.camSnap(Camera.latToPitch(lat), Camera.longToYaw(lon, timeManager.selectedDate));

      e.preventDefault();
    });

    $('#dops-form').on('submit', function (e) {
      uiManager.hideSideMenus();
      sMM.isDOPMenuOpen(true);
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
      e.preventDefault();
    });
  })();

  var satChngTable = [];
  uiManager.satChng = function (row) {
    db.log('uiManager.satChng');

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

  var socratesObjOne = []; // Array for tr containing CATNR1
  var socratesObjTwo = []; // Array for tr containing CATNR2
  var findFutureDate = (socratesObjTwo, row) => {
    var socratesDate = socratesObjTwo[row][4].split(' '); // Date/time is on the second line 5th column
    var socratesTime = socratesDate[3].split(':'); // Split time from date for easier management

    var sYear = parseInt(socratesDate[0]); // UTC Year
    var sMon = MMMtoInt(socratesDate[1]); // UTC Month in MMM prior to converting
    var sDay = parseInt(socratesDate[2]); // UTC Day
    var sHour = parseInt(socratesTime[0]); // UTC Hour
    var sMin = parseInt(socratesTime[1]); // UTC Min
    var sSec = parseInt(socratesTime[2]); // UTC Sec - This is a decimal, but when we convert to int we drop those

    var MMMtoInt = (month) => {
      switch (month) {
        case 'Jan':
          return 0;
        case 'Feb':
          return 1;
        case 'Mar':
          return 2;
        case 'Apr':
          return 3;
        case 'May':
          return 4;
        case 'Jun':
          return 5;
        case 'Jul':
          return 6;
        case 'Aug':
          return 7;
        case 'Sep':
          return 8;
        case 'Oct':
          return 9;
        case 'Nov':
          return 10;
        case 'Dec':
          return 11;
      }
    }; // Convert MMM format to an int for Date() constructor

    var selectedDate = new Date(sYear, sMon, sDay, sHour, sMin, sSec); // New Date object of the future collision
    // Date object defaults to local time.
    selectedDate.setUTCDate(sDay); // Move to UTC day.
    selectedDate.setUTCHours(sHour); // Move to UTC Hour

    var today = new Date(); // Need to know today for offset calculation
    timeManager.propOffset = selectedDate - today; // Find the offset from today
    cameraManager.camSnapMode = false;
    satCruncher.postMessage({
      // Tell satCruncher we have changed times for orbit calculations
      typ: 'offset',
      dat: timeManager.propOffset.toString() + ' ' + (1.0).toString(),
    });
    timeManager.propRealTime = Date.now(); // Reset realtime...this might not be necessary...
    timeManager.propTime();
  }; // Allows passing -1 argument to socrates function to skip these steps
  var _socrates = (row) => {
    db.log('_socrates');
    // SOCRATES Variables

    /* SOCRATES.htm is a 20 row .pl script pulled from celestrak.com/cgi-bin/searchSOCRATES.pl
    If it ever becomes unavailable a similar, but less accurate (maybe?) cron job could be
    created using satCruncer.

    The variable row determines which set of objects on SOCRATES.htm we are using. First
    row is 0 and last one is 19. */
    if (row === -1 && socratesObjOne.length === 0 && socratesObjTwo.length === 0) {
      // Only generate the table if receiving the -1 argument for the first time
      $.get('/SOCRATES.htm', function (socratesHTM) {
        // Load SOCRATES.htm so we can use it instead of index.htm
        var tableRowOne = $("[name='CATNR1']", socratesHTM).closest('tr'); // Find the row(s) containing the hidden input named CATNR1
        var tableRowTwo = $("[name='CATNR2']", socratesHTM).closest('tr'); // Find the row(s) containing the hidden input named CATNR2
        // eslint-disable-next-line no-unused-vars
        tableRowOne.each(function (rowIndex, r) {
          var cols = [];
          $(this)
            .find('td')
            .each(function (colIndex, c) {
              cols.push(c.textContent);
            });
          socratesObjOne.push(cols);
        });
        // eslint-disable-next-line no-unused-vars
        tableRowTwo.each(function (rowIndex, r) {
          var cols = [];
          $(this)
            .find('td')
            .each(function (colIndex, c) {
              cols.push(c.textContent);
            });
          socratesObjTwo.push(cols);
        });
        // SOCRATES Menu
        var tbl = document.getElementById('socrates-table'); // Identify the table to update
        tbl.innerHTML = ''; // Clear the table from old object data
        // var tblLength = 0;                                   // Iniially no rows to the table

        var tr = tbl.insertRow();
        var tdT = tr.insertCell();
        tdT.appendChild(document.createTextNode('Time'));
        tdT.setAttribute('style', 'text-decoration: underline');
        var tdS1 = tr.insertCell();
        tdS1.appendChild(document.createTextNode('#1'));
        tdS1.setAttribute('style', 'text-decoration: underline');
        var tdS2 = tr.insertCell();
        tdS2.appendChild(document.createTextNode('#2'));
        tdS2.setAttribute('style', 'text-decoration: underline');

        for (var i = 0; i < 20; i++) {
          // 20 rows
          tr = tbl.insertRow();
          tr.setAttribute('class', 'socrates-object link');
          tr.setAttribute('hiddenrow', i);
          tdT = tr.insertCell();
          var socratesDate = socratesObjTwo[i][4].split(' '); // Date/time is on the second line 5th column
          var socratesTime = socratesDate[3].split(':'); // Split time from date for easier management
          var socratesTimeS = socratesTime[2].split('.'); // Split time from date for easier management
          tdT.appendChild(document.createTextNode(socratesDate[2] + ' ' + socratesDate[1] + ' ' + socratesDate[0] + ' - ' + helpers.pad0(socratesTime[0], 2) + ':' + helpers.pad0(socratesTime[1], 2) + ':' + helpers.pad0(socratesTimeS[0], 2) + 'Z'));
          tdS1 = tr.insertCell();
          tdS1.appendChild(document.createTextNode(socratesObjOne[i][1]));
          tdS2 = tr.insertCell();
          tdS2.appendChild(document.createTextNode(socratesObjTwo[i][0]));
        }
      });
    }
    if (row !== -1) {
      // If an object was selected from the menu
      findFutureDate(socratesObjTwo, row); // Jump to the date/time of the collision

      uiManager.doSearch(socratesObjOne[row][1] + ',' + socratesObjTwo[row][0]); // Actually perform the search of the two objects
      settingsManager.socratesOnSatCruncher = satSet.getIdFromObjNum(socratesObjOne[row][1]);
    } // If a row was selected
  };

  uiManager.loginPopup = () => {
    if (uiManager.isMembershipMenuOpen) {
      uiManager.hideSideMenus();
      uiManager.isMembershipMenuOpen = false;
      return;
    } else {
      uiManager.toast(`Membership Required for this Feature!`, 'critical');
      uiManager.hideSideMenus();
      $('#membership-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
      uiManager.isMembershipMenuOpen = true;
      // $('#menu-sensor-info').addClass('bmenu-item-selected');
      return;
    }
  };

  uiManager.bottomIconPress = (evt) => {
    _bottomIconPress(evt);
  };
  var _bottomIconPress = (evt) => {
    db.log('_bottomIconPress');
    db.log(evt.currentTarget.id);
    // if (settingsManager.isOfficialWebsite)
    //     ga(
    //         'send',
    //         'event',
    //         'Bottom Icon',
    //         evt.currentTarget.id,
    //         'Selected'
    //     );
    switch (evt.currentTarget.id) {
      case 'menu-membership': // No Keyboard Commands
        uiManager.loginPopup();
        break;
      case 'menu-sensor-list': // No Keyboard Commands
        if (isSensorListMenuOpen) {
          uiManager.hideSideMenus();
          isSensorListMenuOpen = false;
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#sensor-list-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isSensorListMenuOpen = true;
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
        if (isInfoOverlayMenuOpen) {
          isInfoOverlayMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (watchlistList.length === 0 && !isWatchlistChanged) {
            uiManager.toast(`Add Satellites to Watchlist!`, 'caution');
            nextPassArray = [];
            break;
          }
          uiManager.hideSideMenus();
          if (nextPassArray.length === 0 || nextPassEarliestTime > timeManager.now || new Date(nextPassEarliestTime * 1 + 1000 * 60 * 60 * 24) < timeManager.now || isWatchlistChanged) {
            $('#loading-screen').fadeIn(1000, function () {
              nextPassArray = [];
              for (var x = 0; x < watchlistList.length; x++) {
                nextPassArray.push(satSet.getSatExtraOnly(watchlistList[x]));
              }
              nextPassArray = satellite.nextpassList(nextPassArray);
              nextPassArray.sort(function (a, b) {
                return new Date(a.time) - new Date(b.time);
              });
              nextPassEarliestTime = timeManager.now;
              lastOverlayUpdateTime = 0;
              _updateNextPassOverlay(true);
              $('#loading-screen').fadeOut('slow');
              isWatchlistChanged = false;
            });
          } else {
            _updateNextPassOverlay(true);
          }
          $('#info-overlay-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-info-overlay').addClass('bmenu-item-selected');
          isInfoOverlayMenuOpen = true;
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
        if (isSensorInfoMenuOpen) {
          uiManager.hideSideMenus();
          isSensorInfoMenuOpen = false;
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          uiManager.getsensorinfo();
          $('#sensor-info-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isSensorInfoMenuOpen = true;
          $('#menu-sensor-info').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-lookangles': // S
        if (sMM.isLookanglesMenuOpen()) {
          sMM.isLookanglesMenuOpen(false);
          uiManager.hideSideMenus();
          break;
        } else {
          let sat = satSet.getSatExtraOnly(objectManager.selectedSat);
          if (sat == null) return;

          if (!sensorManager.checkSensorSelected() || sat.static || sat.missile || objectManager.selectedSat === -1) {
            // No Sensor or Satellite Selected
            adviceList.lookanglesDisabled();
            if (!$('#menu-lookangles:animated').length) {
              $('#menu-lookangles').effect('shake', {
                distance: 10,
              });
            }
            break;
          }
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          sMM.isLookanglesMenuOpen(true);
          $('#loading-screen').fadeIn(1000, function () {
            satellite.getlookangles(sat);
            $('#menu-lookangles').addClass('bmenu-item-selected');
            $('#loading-screen').fadeOut('slow');
            $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          });
          break;
        }
      case 'menu-dops': // S
        // if (!$('#menu-dops:animated').length) {
        //     $('#menu-dops').effect('shake', {distance: 10});
        // }
        // break;
        if (sMM.isDOPMenuOpen()) {
          sMM.isDOPMenuOpen(false);
          uiManager.hideSideMenus();
          break;
        } else {
          uiManager.hideSideMenus();
          sMM.isDOPMenuOpen(true);
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
        if (isWatchlistMenuOpen) {
          isWatchlistMenuOpen = false;
          $('#menu-watchlist').removeClass('bmenu-item-selected');
          // $('#search-holder').hide();
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#watchlist-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          // uiManager.searchToggle(true);
          uiManager.updateWatchlist();
          isWatchlistMenuOpen = true;
          $('#menu-watchlist').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-analysis':
        if (uiManager.isAnalysisMenuOpen) {
          uiManager.isAnalysisMenuOpen = false;
          $('#menu-analysis').removeClass('bmenu-item-selected');
          uiManager.hideSideMenus();
          break;
        } else {
          uiManager.hideSideMenus();
          uiManager.isAnalysisMenuOpen = true;
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
          document.addEventListener('DOMContentLoaded', function () {
            var elems = document.querySelectorAll('anal-type');
            M.FormSelect.init(elems);
          });

          $('#analysis-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          sMM.isAnalysisMenuOpen(true);
          $('#menu-analysis').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-external':
        if (isExternalMenuOpen) {
          isExternalMenuOpen = false;
          $('#menu-external').removeClass('bmenu-item-selected');
          uiManager.hideSideMenus();
          break;
        } else {
          uiManager.hideSideMenus();
          $('#external-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          uiManager.updateWatchlist();
          isExternalMenuOpen = true;
          $('#menu-external').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-lookanglesmultisite':
        if (sMM.isLookanglesMultiSiteMenuOpen()) {
          sMM.isLookanglesMultiSiteMenuOpen(false);
          uiManager.hideSideMenus();
          break;
        } else {
          if (objectManager.selectedSat === -1) {
            // No Satellite Selected
            adviceList.ssnLookanglesDisabled();
            if (!$('#menu-lookanglesmultisite:animated').length) {
              $('#menu-lookanglesmultisite').effect('shake', {
                distance: 10,
              });
            }
            break;
          }
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          sMM.isLookanglesMultiSiteMenuOpen(true);
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
        if (isFindByLooksMenuOpen) {
          isFindByLooksMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#findByLooks-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isFindByLooksMenuOpen = true;
          $('#menu-find-sat').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-twitter': // T
        if (isTwitterMenuOpen) {
          isTwitterMenuOpen = false;
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
          isTwitterMenuOpen = true;
          $('#menu-twitter').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-map': // W
        if (settingsManager.isMapMenuOpen) {
          settingsManager.isMapMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        }
        if (!settingsManager.isMapMenuOpen) {
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
          settingsManager.isMapMenuOpen = true;
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
        if (isLaunchMenuOpen) {
          isLaunchMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          settingsManager.isPreventColorboxClose = true;
          setTimeout(function () {
            settingsManager.isPreventColorboxClose = false;
          }, 2000);
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
          isLaunchMenuOpen = true;
          $('#menu-launches').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-about': // No Keyboard Shortcut
        if (isAboutSelected) {
          isAboutSelected = false;
          uiManager.hideSideMenus();
          break;
        } else {
          uiManager.hideSideMenus();
          $('#about-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isAboutSelected = true;
          $('#menu-about').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-satellite-collision': // No Keyboard Shortcut
        if (isSocratesMenuOpen) {
          isSocratesMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#socrates-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isSocratesMenuOpen = true;
          _socrates(-1);
          $('#menu-satellite-collision').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-satChng': // No Keyboard Shortcut
        if (issatChngMenuOpen) {
          issatChngMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#satChng-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          issatChngMenuOpen = true;
          uiManager.satChng(-1);
          $('#menu-satChng').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-obfit': // T
        if (isObfitMenuOpen) {
          isObfitMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#obfit-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isObfitMenuOpen = true;
          $('#menu-obfit').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-settings': // T
        if (isSettingsMenuOpen) {
          isSettingsMenuOpen = false;
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#settings-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isSettingsMenuOpen = true;
          $('#menu-settings').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-editSat':
        if (sMM.isEditSatMenuOpen()) {
          sMM.isEditSatMenuOpen(false);
          uiManager.hideSideMenus();
          break;
        } else {
          if (objectManager.selectedSat !== -1) {
            if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
            uiManager.hideSideMenus();
            $('#editSat-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            $('#menu-editSat').addClass('bmenu-item-selected');
            sMM.isEditSatMenuOpen(true);

            let sat = satSet.getSatExtraOnly(objectManager.selectedSat);
            $('#es-scc').val(sat.SCC_NUM);

            var inc = (sat.inclination * mathValue.RAD2DEG).toPrecision(7);
            inc = inc.split('.');
            inc[0] = inc[0].substr(-3, 3);
            inc[1] = inc[1].substr(0, 4);
            inc = (inc[0] + '.' + inc[1]).toString();

            $('#es-inc').val(helpers.pad0(inc, 8));
            $('#es-year').val(sat.TLE1.substr(18, 2));
            $('#es-day').val(sat.TLE1.substr(20, 12));
            $('#es-meanmo').val(sat.TLE2.substr(52, 11));

            var rasc = (sat.raan * mathValue.RAD2DEG).toPrecision(7);
            rasc = rasc.split('.');
            rasc[0] = rasc[0].substr(-3, 3);
            rasc[1] = rasc[1].substr(0, 4);
            rasc = (rasc[0] + '.' + rasc[1]).toString();

            $('#es-rasc').val(helpers.pad0(rasc, 8));
            $('#es-ecen').val(sat.eccentricity.toPrecision(7).substr(2, 7));

            var argPe = (sat.argPe * mathValue.RAD2DEG).toPrecision(7);
            argPe = argPe.split('.');
            argPe[0] = argPe[0].substr(-3, 3);
            argPe[1] = argPe[1].substr(0, 4);
            argPe = (argPe[0] + '.' + argPe[1]).toString();

            $('#es-argPe').val(helpers.pad0(argPe, 8));
            $('#es-meana').val(sat.TLE2.substr(44 - 1, 7 + 1));
            // $('#es-rasc').val(sat.TLE2.substr(18 - 1, 7 + 1).toString());
          } else {
            adviceList.editSatDisabled();
            if (!$('#menu-editSat:animated').length) {
              $('#menu-editSat').effect('shake', {
                distance: 10,
              });
            }
          }
        }
        break;
      case 'menu-newLaunch':
        if (sMM.isNewLaunchMenuOpen()) {
          sMM.isNewLaunchMenuOpen(false);
          uiManager.hideSideMenus();
          break;
        } else {
          if (objectManager.selectedSat !== -1) {
            if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
            uiManager.hideSideMenus();
            $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            $('#menu-newLaunch').addClass('bmenu-item-selected');
            sMM.isNewLaunchMenuOpen(true);

            let sat = satSet.getSatExtraOnly(objectManager.selectedSat);
            $('#nl-scc').val(sat.SCC_NUM);
            $('#nl-inc').val((sat.inclination * mathValue.RAD2DEG).toPrecision(2));
          } else {
            adviceList.newLaunchDisabled();
            if (!$('#menu-newLaunch:animated').length) {
              $('#menu-newLaunch').effect('shake', {
                distance: 10,
              });
            }
          }
          break;
        }
      case 'menu-breakup':
        if (sMM.isBreakupMenuOpen()) {
          sMM.isBreakupMenuOpen(false);
          uiManager.hideSideMenus();
          break;
        } else {
          if (objectManager.selectedSat !== -1) {
            if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
            uiManager.hideSideMenus();
            $('#breakup-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            $('#menu-breakup').addClass('bmenu-item-selected');
            sMM.isBreakupMenuOpen(true);

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
        if (sMM.isMissileMenuOpen()) {
          sMM.isMissileMenuOpen(false);
          uiManager.hideSideMenus();
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#missile-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-missile').addClass('bmenu-item-selected');
          sMM.isMissileMenuOpen(true);
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
          satCruncher.postMessage({
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
          satCruncher.postMessage({
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
          satCruncher.postMessage({
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
          satCruncher.postMessage({
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
          satCruncher.postMessage({
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
          satCruncher.postMessage({
            isShowFOVBubble: 'reset',
            isShowSurvFence: 'disable',
            isShowSatOverfly: 'enable',
            selectedSatFOV: satFieldOfView,
          });
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          break;
        }
      case 'menu-day-night': // No Keyboard Commands
        if (earth.isDayNightToggle()) {
          earth.isDayNightToggle(false);
          $('#menu-day-night').removeClass('bmenu-item-selected');
          break;
        } else {
          earth.isDayNightToggle(true);
          $('#menu-day-night').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-time-machine':
        if (orbitManager.isTimeMachineRunning) {
          // Merge to one variable?
          orbitManager.isTimeMachineRunning = false;
          orbitManager.isTimeMachineVisible = false;

          settingsManager.colors.transparent = orbitManager.tempTransColor;
          groups.clearSelect();
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
        if (isColorSchemeMenuOpen) {
          uiManager.hideSideMenus();
          isColorSchemeMenuOpen = false;
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#color-scheme-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isColorSchemeMenuOpen = true;
          $('#menu-color-scheme').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-constellations': // No Keyboard Commands
        if (isConstellationsMenuOpen) {
          uiManager.hideSideMenus();
          isConstellationsMenuOpen = false;
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#constellations-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isConstellationsMenuOpen = true;
          $('#menu-constellations').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-countries': // No Keyboard Commands
        if (isCountriesMenuOpen) {
          uiManager.hideSideMenus();
          isCountriesMenuOpen = false;
          break;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#countries-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isCountriesMenuOpen = true;
          $('#menu-countries').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-nextLaunch': // No Keyboard Commands
        if (isNextLaunchMenuOpen) {
          uiManager.hideSideMenus();
          isNextLaunchMenuOpen = false;
          break;
        } else {
          uiManager.hideSideMenus();
          nextLaunchManager.showTable();
          $('#nextLaunch-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isNextLaunchMenuOpen = true;
          $('#menu-nextLaunch').addClass('bmenu-item-selected');
          break;
        }
      case 'menu-planetarium':
        if (isPlanetariumView) {
          isPlanetariumView = false;
          cameraManager.panReset = true;
          cameraManager.localRotateReset = true;
          settingsManager.fieldOfView = 0.6;
          webGlInit();
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
          webGlInit();
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
    db.log("$('#search').focus");
    uiManager.isCurrentlyTyping = true;
  });
  $('#ui-wrapper').on('focusin', function () {
    db.log("$('#ui-wrapper').focusin");
    uiManager.isCurrentlyTyping = true;
  });

  $('#search').on('blur', function () {
    db.log("('#search').blur");
    uiManager.isCurrentlyTyping = false;
  });
  $('#ui-wrapper').on('focusout', function () {
    db.log("('#ui-wrapper').focusout");
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

  uiManager.hideSideMenus = function () {
    db.log('uiManager.hideSideMenus');
    // Close any open colorboxes
    $.colorbox.close();

    // Hide all side menus
    $('#membership-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#sensor-list-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#info-overlay-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#sensor-info-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#watchlist-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#dops-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#lookanglesmultisite-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#findByLooks-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#twitter-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#map-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#socrates-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#satChng-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#nextLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#obfit-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#settings-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#editSat-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#breakup-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#missile-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#external-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#analysis-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#color-scheme-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#countries-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#constellations-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#about-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);

    // Remove red color from all menu icons
    $('#menu-sensor-list').removeClass('bmenu-item-selected');
    $('#menu-info-overlay').removeClass('bmenu-item-selected');
    $('#menu-sensor-info').removeClass('bmenu-item-selected');
    $('#menu-watchlist').removeClass('bmenu-item-selected');
    $('#menu-lookangles').removeClass('bmenu-item-selected');
    $('#menu-dops').removeClass('bmenu-item-selected');
    $('#menu-lookanglesmultisite').removeClass('bmenu-item-selected');
    $('#menu-launches').removeClass('bmenu-item-selected');
    $('#menu-find-sat').removeClass('bmenu-item-selected');
    $('#menu-twitter').removeClass('bmenu-item-selected');
    $('#menu-map').removeClass('bmenu-item-selected');
    $('#menu-satellite-collision').removeClass('bmenu-item-selected');
    $('#menu-satChng').removeClass('bmenu-item-selected');
    $('#menu-settings').removeClass('bmenu-item-selected');
    $('#menu-editSat').removeClass('bmenu-item-selected');
    $('#menu-newLaunch').removeClass('bmenu-item-selected');
    $('#menu-nextLaunch').removeClass('bmenu-item-selected');
    $('#menu-breakup').removeClass('bmenu-item-selected');
    $('#menu-missile').removeClass('bmenu-item-selected');
    $('#menu-external').removeClass('bmenu-item-selected');
    $('#menu-analysis').removeClass('bmenu-item-selected');
    $('#menu-customSensor').removeClass('bmenu-item-selected');
    $('#menu-color-scheme').removeClass('bmenu-item-selected');
    $('#menu-countries').removeClass('bmenu-item-selected');
    $('#menu-constellations').removeClass('bmenu-item-selected');
    $('#menu-obfit').removeClass('bmenu-item-selected');
    $('#menu-about').removeClass('bmenu-item-selected');

    // Unflag all open menu variables
    uiManager.isMembershipMenuOpen = false;
    isSensorListMenuOpen = false;
    isInfoOverlayMenuOpen = false;
    isSensorInfoMenuOpen = false;
    isWatchlistMenuOpen = false;
    isLaunchMenuOpen = false;
    isTwitterMenuOpen = false;
    isFindByLooksMenuOpen = false;
    settingsManager.isMapMenuOpen = false;
    sMM.isLookanglesMenuOpen(false);
    sMM.isDOPMenuOpen(false);
    sMM.isLookanglesMultiSiteMenuOpen(false);
    isSocratesMenuOpen = false;
    isNextLaunchMenuOpen = false;
    issatChngMenuOpen = false;
    isSettingsMenuOpen = false;
    isObfitMenuOpen = false;
    sMM.isEditSatMenuOpen(false);
    sMM.isNewLaunchMenuOpen(false);
    sMM.isBreakupMenuOpen(false);
    sMM.isMissileMenuOpen(false);
    sMM.isCustomSensorMenuOpen = false;
    isColorSchemeMenuOpen = false;
    sMM.isAnalysisMenuOpen(false);
    isExternalMenuOpen = false;
    isConstellationsMenuOpen = false;
    isCountriesMenuOpen = false;
    isAboutSelected = false;
  };

  $('#fullscreen-icon').on('click', function () {
    mobile.fullscreenToggle();
    uiManager.resize2DMap();
  });

  $('#nav-footer-toggle').on('click', function () {
    uiManager.footerToggle();
  });

  $('#export-lookangles').on('click', function () {
    saveCsv(satellite.lastlooksArray, 'lookAngles');
  });

  $('#export-launch-info').on('click', function () {
    saveCsv(nextLaunchManager.launchList, 'launchList');
  });

  $('#export-multiSiteArray').on('click', function () {
    saveCsv(satellite.lastMultiSiteArray, 'multiSiteLooks');
  });

  $('#search-icon').on('click', function () {
    uiManager.searchToggle();
  });
});

uiManager.updateWatchlist = function (updateWatchlistList, updateWatchlistInViewList) {
  db.log('uiManager.updateWatchlist');
  if (typeof updateWatchlistList !== 'undefined') {
    watchlistList = updateWatchlistList;
  }
  if (typeof updateWatchlistInViewList !== 'undefined') {
    watchlistInViewList = updateWatchlistInViewList;
  }

  if (!watchlistList) return;
  settingsManager.isThemesNeeded = true;
  if (isWatchlistChanged == null) {
    isWatchlistChanged = false;
  } else {
    isWatchlistChanged = true;
  }
  var watchlistString = '';
  var watchlistListHTML = '';
  var sat;
  for (let i = 0; i < watchlistList.length; i++) {
    sat = satSet.getSatExtraOnly(watchlistList[i]);
    if (sat == null) {
      watchlistList.splice(i, 1);
      continue;
    }
    watchlistListHTML +=
      '<div class="row">' +
      '<div class="col s3 m3 l3">' +
      sat.SCC_NUM +
      '</div>' +
      '<div class="col s7 m7 l7">' +
      sat.ON +
      '</div>' +
      '<div class="col s2 m2 l2 center-align remove-icon"><img class="watchlist-remove" data-sat-id="' +
      sat.id +
      '" src="images/remove.png"></img></div>' +
      '</div>';
  }
  $('#watchlist-list').html(watchlistListHTML);
  for (let i = 0; i < watchlistList.length; i++) {
    // No duplicates
    watchlistString += satSet.getSatExtraOnly(watchlistList[i]).SCC_NUM;
    if (i !== watchlistList.length - 1) watchlistString += ',';
  }
  uiManager.doSearch(watchlistString, true);
  satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc

  var saveWatchlist = [];
  for (let i = 0; i < watchlistList.length; i++) {
    sat = satSet.getSatExtraOnly(watchlistList[i]);
    saveWatchlist[i] = sat.SCC_NUM;
  }
  var variable = JSON.stringify(saveWatchlist);
  localStorage.setItem('watchlistList', variable);
};

var isSearchOpen = false;
var forceClose = false;
var forceOpen = false;
uiManager.searchToggle = function (force) {
  db.log('uiManager.searchToggle');
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
    $('#menu-space-stations').removeClass('bmenu-item-selected');

    // This is getting called too much. Not sure what it was meant to prevent?
    // satSet.setColorScheme(ColorScheme.default, true);
    // uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
  }
};

uiManager.keyHandler = (evt) => {
  db.log('uiManager.keyHandler');
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
        webGlInit();
        if (objectManager.selectedSat !== -1) {
          cameraManager.camZoomSnappedOnSat(true);
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
    satCruncher.postMessage({
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
  if (earth.isUseHiRes && earth.isHiResReady !== true) {
    setTimeout(function () {
      uiManager.hideLoadingScreen();
    }, 100);
    return;
  }

  // Display content when loading is complete.
  $('#canvas-holder').attr('style', 'display:block');

  mobile.checkMobileMode();

  if (settingsManager.isMobileModeEnabled) {
    $('#spinner').hide();
    settingsManager.loadStr('math');
    // settingsManager.loadStr('');
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
      }, 3000);
    } else {
      setTimeout(function () {
        $('#loading-screen').removeClass('full-loader');
        $('#loading-screen').addClass('mini-loader-container');
        $('#logo-inner-container').addClass('mini-loader');
        $('#logo-text').html('');
        $('#logo-trusat').hide();
        $('#loading-screen').hide();
        settingsManager.loadStr('math');
      }, 1500);
    }
  }

  // if (!settingsManager.isMobileModeEnabled) {
  //   // settingsManager.loadStr('painting');
  //   $('#loading-screen').hide();
  // } else {
  //   // settingsManager.loadStr('painting');
  //   $('#loading-screen').hide();
  // }
};

uiManager.resize2DMap = function () {
  db.log('uiManager.resize2DMap');
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

// Callbacks from DrawLoop
var infoOverlayDOM = [];
// var satNumberOverlay = [];
// eslint-disable-next-line arrow-body-style
// var _showSatTest = () => {
// return;
// db.log('_showSatTest');
// if (timeManager.now > (lastSatUpdateTime * 1 + 10000)) {
//   for (var i = 0; i < satSet.getSatData().length; i++) {
//     satNumberOverlay[i] = satSet.getScreenCoords(i, pMatrix, camMatrix);
//     if (satNumberOverlay[i] !== 1) console.log(satNumberOverlay[i]);
//     lastSatUpdateTime = timeManager.now;
//   }
// }
// };

var _updateNextPassOverlay = (isForceUpdate) => {
  if (nextPassArray.length <= 0 && !isInfoOverlayMenuOpen) return;
  db.log('_updateNextPassOverlay');

  // FIXME This should auto update the overlay when the time changes outside the original search window
  // Update once every 10 seconds
  if ((timeManager.now > lastOverlayUpdateTime * 1 + 10000 && objectManager.selectedSat === -1 && !cameraManager.isDragging && cameraManager.zoomLevel === cameraManager.zoomTarget) || isForceUpdate) {
    var propTime = timeManager.propTime();
    infoOverlayDOM = [];
    infoOverlayDOM.push('<div>');
    for (var s = 0; s < nextPassArray.length; s++) {
      var satInView = satSet.getSatInViewOnly(satSet.getIdFromObjNum(nextPassArray[s].SCC_NUM)).inview;
      // If old time and not in view, skip it
      if (nextPassArray[s].time - propTime < -1000 * 60 * 5 && !satInView) continue;

      // Get the pass Time
      var time = dateFormat(nextPassArray[s].time, 'isoTime', true);

      // Yellow - In View and Time to Next Pass is +/- 30 minutes
      if (satInView && nextPassArray[s].time - propTime < 1000 * 60 * 30 && propTime - nextPassArray[s].time < 1000 * 60 * 30) {
        infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: yellow">' + nextPassArray[s].SCC_NUM + ': ' + time + '</h5></div>');
        continue;
      }
      // Blue - Time to Next Pass is between 10 minutes before and 20 minutes after the current time
      // This makes recent objects stay at the top of the list in blue
      if (nextPassArray[s].time - propTime < 1000 * 60 * 10 && propTime - nextPassArray[s].time < 1000 * 60 * 20) {
        infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: blue">' + nextPassArray[s].SCC_NUM + ': ' + time + '</h5></div>');
        continue;
      }
      // White - Any future pass not fitting the above requirements
      if (nextPassArray[s].time - propTime > 0) {
        infoOverlayDOM.push('<div class="row"><h5 class="center-align watchlist-object link" style="color: white">' + nextPassArray[s].SCC_NUM + ': ' + time + '</h5></div>');
      }
    }
    infoOverlayDOM.push('</div>');
    document.getElementById('info-overlay-content').innerHTML = infoOverlayDOM.join('');
    lastOverlayUpdateTime = timeManager.now;
  }
};
var _checkWatchlist = () => {
  if (watchlistList.length <= 0) return;
  db.log('_checkWatchlist');
  for (let i = 0; i < watchlistList.length; i++) {
    var sat = satSet.getSat(watchlistList[i]);
    if (sat.inview === 1 && watchlistInViewList[i] === false) {
      // Is inview and wasn't previously
      watchlistInViewList[i] = true;
      orbitManager.addInViewOrbit(watchlistList[i]);
    }
    if (sat.inview === 0 && watchlistInViewList[i] === true) {
      // Isn't inview and was previously
      watchlistInViewList[i] = false;
      orbitManager.removeInViewOrbit(watchlistList[i]);
    }
  }
  for (let i = 0; i < watchlistInViewList.length; i++) {
    if (watchlistInViewList[i] === true) {
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
  db.log('_updateSelectBox', true);

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

    if (settingsManager.isMapMenuOpen && timeManager.now > settingsManager.lastMapUpdateTime + 30000) {
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
        $('#sat-azimuth').html(satellite.currentTEARR.azimuth.toFixed(0) + '°'); // Convert to Degrees
        $('#sat-elevation').html(satellite.currentTEARR.elevation.toFixed(1) + '°');
        $('#sat-range').html(satellite.currentTEARR.range.toFixed(2) + ' km');
      } else {
        $('#sat-azimuth').html('Out of FOV');
        $('#sat-azimuth').prop('title', 'Azimuth: ' + satellite.currentTEARR.azimuth.toFixed(0) + '°');
        $('#sat-elevation').html('Out of FOV');
        $('#sat-elevation').prop('title', 'Elevation: ' + satellite.currentTEARR.elevation.toFixed(1) + '°');
        $('#sat-range').html('Out of FOV');
        $('#sat-range').prop('title', 'Range: ' + satellite.currentTEARR.range.toFixed(2) + ' km');
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
var _mobileScreenControls = () => {
  if (settingsManager.isMobileModeEnabled) {
    db.log('_mobileScreenControls', true);
    if (touchHoldButton === '') return;
    if (touchHoldButton === 'zoom-in') {
      cameraManager.zoomTarget = cameraManager.zoomTarget - 0.0025;
      if (cameraManager.zoomTarget < 0) cameraManager.zoomTarget = 0;
    }
    if (touchHoldButton === 'zoom-out') {
      cameraManager.zoomTarget = cameraManager.zoomTarget + 0.0025;
      if (cameraManager.zoomTarget > 1) cameraManager.zoomTarget = 1;
    }
  }
};

$('#colors-menu>ul>li').on('click', function () {
  objectManager.setSelectedSat(-1); // clear selected sat
  var colorName = $(this).data('color');
  if (colorName !== 'sunlight') {
    satCruncher.postMessage({
      isSunlightView: false,
    });
  }
  switch (colorName) {
    case 'default':
      uiManager.legendMenuChange('default');
      satSet.setColorScheme(ColorScheme.default, true);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      // if (settingsManager.isOfficialWebsite)
      //     ga(
      //         'send',
      //         'event',
      //         'ColorScheme Menu',
      //         'Default Color',
      //         'Selected'
      //     );
      break;
    case 'velocity':
      uiManager.legendMenuChange('velocity');
      satSet.setColorScheme(ColorScheme.velocity);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      // if (settingsManager.isOfficialWebsite)
      //     ga(
      //         'send',
      //         'event',
      //         'ColorScheme Menu',
      //         'Velocity',
      //         'Selected'
      //     );
      break;
    case 'sunlight':
      uiManager.legendMenuChange('sunlight');
      satSet.setColorScheme(ColorScheme.sunlight, true);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      settingsManager.isForceColorScheme = true;
      satCruncher.postMessage({
        isSunlightView: true,
      });
      // if (settingsManager.isOfficialWebsite)
      //     ga(
      //         'send',
      //         'event',
      //         'ColorScheme Menu',
      //         'Sunlight',
      //         'Selected'
      //     );
      break;
    case 'near-earth':
      uiManager.legendMenuChange('near');
      satSet.setColorScheme(ColorScheme.leo);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      // if (settingsManager.isOfficialWebsite)
      //     ga(
      //         'send',
      //         'event',
      //         'ColorScheme Menu',
      //         'near-earth',
      //         'Selected'
      //     );
      break;
    case 'deep-space':
      uiManager.legendMenuChange('deep');
      satSet.setColorScheme(ColorScheme.geo);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      // if (settingsManager.isOfficialWebsite)
      //     ga(
      //         'send',
      //         'event',
      //         'ColorScheme Menu',
      //         'Deep-Space',
      //         'Selected'
      //     );
      break;
    case 'elset-age':
      $('#loading-screen').fadeIn(1000, function () {
        uiManager.legendMenuChange('ageOfElset');
        satSet.setColorScheme(ColorScheme.ageOfElset);
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        // if (settingsManager.isOfficialWebsite)
        //     ga(
        //         'send',
        //         'event',
        //         'ColorScheme Menu',
        //         'Age of Elset',
        //         'Selected'
        //     );
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'lost-objects':
      $('#search').val('');
      $('#loading-screen').fadeIn(1000, function () {
        satSet.setColorScheme(ColorScheme.lostobjects);
        uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
        // if (settingsManager.isOfficialWebsite)
        //     ga(
        //         'send',
        //         'event',
        //         'ColorScheme Menu',
        //         'Lost Objects',
        //         'Selected'
        //     );
        uiManager.doSearch($('#search').val());
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'rcs':
      uiManager.legendMenuChange('rcs');
      satSet.setColorScheme(ColorScheme.rcs);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      // if (settingsManager.isOfficialWebsite)
      //     ga('send', 'event', 'ColorScheme Menu', 'RCS', 'Selected');
      break;
    case 'smallsats':
      uiManager.legendMenuChange('small');
      satSet.setColorScheme(ColorScheme.smallsats);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      // if (settingsManager.isOfficialWebsite)
      //     ga(
      //         'send',
      //         'event',
      //         'ColorScheme Menu',
      //         'Small Satellites',
      //         'Selected'
      //     );
      break;
    case 'countries':
      uiManager.legendMenuChange('countries');
      satSet.setColorScheme(ColorScheme.countries);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      // if (settingsManager.isOfficialWebsite)
      //     ga(
      //         'send',
      //         'event',
      //         'ColorScheme Menu',
      //         'Countries',
      //         'Selected'
      //     );
      break;
  }

  // Close Open Menus
  if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
  uiManager.hideSideMenus();
});

uiManager.useCurrentGeolocationAsSensor = function () {
  db.log('uiManager.legendColorsChange');
  if (location.protocol === 'https:' && !settingsManager.geolocationUsed && settingsManager.isMobileModeEnabled) {
    navigator.geolocation.getCurrentPosition(function (position) {
      settingsManager.geolocation.lat = position.coords.latitude;
      settingsManager.geolocation.long = position.coords.longitude;
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

      satCruncher.postMessage({
        // Send SatCruncher File information on this radar
        typ: 'offset', // Tell satcruncher to update something
        dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(), // Tell satcruncher what time it is and how fast time is moving
        setlatlong: true, // Tell satcruncher we are changing observer location
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
      cameraManager.camSnap(Camera.latToPitch(lat), Camera.longToYaw(lon, timeManager.selectedDate));
    });
  }
};

uiManager.showCSObjects = () => {
  $('#loading-screen').fadeIn(1000, function () {
    let searchStr = satellite.findCloseObjects();
    uiManager.doSearch(searchStr);
    $('#loading-screen').fadeOut('slow');
  });
};

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
  searchBox.doArraySearch(satellite.findNearbyObjectsByOrbit(satSet.getSat(window.selectedSat)));
});

uiManager.legendColorsChange = function () {
  db.log('uiManager.legendColorsChange');

  ColorScheme.resetObjectTypeFlags();

  $('.legend-payload-box').css('background', _rgbCSS(settingsManager.colors.payload));
  $('.legend-rocketBody-box').css('background', _rgbCSS(settingsManager.colors.rocketBody));
  $('.legend-debris-box').css('background', _rgbCSS(settingsManager.colors.debris));
  $('.legend-inFOV-box').css('background', _rgbCSS(settingsManager.colors.inview));
  $('.legend-facility-box').css('background', _rgbCSS(settingsManager.colors.facility));
  $('.legend-sensor-box').css('background', _rgbCSS(settingsManager.colors.sensor));
  if (settingsManager.trusatMode || settingsManager.isExtraSatellitesAdded) {
    $('.legend-trusat-box').css('background', _rgbCSS(settingsManager.colors.trusat));
  } else {
    $('.legend-trusat-box')[1].parentElement.style.display = 'none';
    $('.legend-trusat-box')[2].parentElement.style.display = 'none';
    $('.legend-trusat-box')[3].parentElement.style.display = 'none';
  }
  $('.legend-velocityFast-box').css('background', _rgbCSS([0.75, 0.75, 0, 1]));
  $('.legend-velocityMed-box').css('background', _rgbCSS([0.75, 0.25, 0, 1]));
  $('.legend-velocitySlow-box').css('background', _rgbCSS([1, 0, 0, 1]));
  $('.legend-inviewAlt-box').css('background', _rgbCSS(settingsManager.colors.inviewAlt));
  $('.legend-rcsSmall-box').css('background', _rgbCSS(settingsManager.colors.rcsSmall));
  $('.legend-rcsMed-box').css('background', _rgbCSS(settingsManager.colors.rcsMed));
  $('.legend-rcsLarge-box').css('background', _rgbCSS(settingsManager.colors.rcsLarge));
  $('.legend-rcsUnknown-box').css('background', _rgbCSS(settingsManager.colors.rcsUnknown));
  $('.legend-ageNew-box').css('background', _rgbCSS(settingsManager.colors.ageNew));
  $('.legend-ageMed-box').css('background', _rgbCSS(settingsManager.colors.ageMed));
  $('.legend-ageOld-box').css('background', _rgbCSS(settingsManager.colors.ageOld));
  $('.legend-ageLost-box').css('background', _rgbCSS(settingsManager.colors.ageLost));
  $('.legend-satLEO-box').css('background', _rgbCSS(settingsManager.colors.satLEO));
  $('.legend-satGEO-box').css('background', _rgbCSS(settingsManager.colors.satGEO));
  $('.legend-satSmall-box').css('background', _rgbCSS(settingsManager.colors.satSmall));
  $('.legend-countryUS-box').css('background', _rgbCSS(settingsManager.colors.countryUS));
  $('.legend-countryCIS-box').css('background', _rgbCSS(settingsManager.colors.countryCIS));
  $('.legend-countryPRC-box').css('background', _rgbCSS(settingsManager.colors.countryPRC));
  $('.legend-countryOther-box').css('background', _rgbCSS(settingsManager.colors.countryOther));
};

uiManager.legendMenuChange = function (menu) {
  db.log('uiManager.legendMenuChange');
  db.log(menu);
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

$('#editSat>div>input').on({
  keydown: function (e) {
    _validateNumOnly(e);
  },
});

$('#es-ecen').on({
  keydown: function (e) {
    if (e.keyCode === 190) e.preventDefault();
  },
});

$('#es-day').on('keyup', function () {
  if ($('#es-day').val() < 0) $('#es-day').val('000.00000000');
  if ($('#es-day').val() > 367) $('#es-day').val('365.00000000');
});
$('#es-inc').on('keyup', function () {
  if ($('#es-inc').val() < 0) $('#es-inc').val('000.0000');
  if ($('#es-inc').val() > 180) $('#es-inc').val('180.0000');
});
$('#es-rasc').on('keyup', function () {
  if ($('#es-rasc').val() < 0) $('#es-rasc').val('000.0000');
  if ($('#es-rasc').val() > 360) $('#es-rasc').val('360.0000');
});
$('#es-meanmo').on('keyup', function () {
  if ($('#es-meanmo').val() < 0) $('#es-meanmo').val('00.00000000');
  if ($('#es-meanmo').val() > 18) $('#es-meanmo').val('18.00000000');
});
$('#es-argPe').on('keyup', function () {
  if ($('#es-argPe').val() < 0) $('#es-argPe').val('000.0000');
  if ($('#es-argPe').val() > 360) $('#es-argPe').val('360.0000');
});
$('#es-meana').on('keyup', function () {
  if ($('#es-meana').val() < 0) $('#es-meana').val('000.0000');
  if ($('#es-meana').val() > 360) $('#es-meana').val('360.0000');
});

$('#ms-lat').on('keyup', function () {
  if ($('#ms-lat').val() < -90) $('#ms-lat').val('-90.000');
  if ($('#ms-lat').val() > 90) $('#ms-lat').val('90.000');
});
$('#ms-lon').on('keyup', function () {
  if ($('#ms-lon').val() < -180) $('#ms-lon').val('-180.000');
  if ($('#ms-lon').val() > 180) $('#ms-lon').val('180.000');
});

var _validateNumOnly = function (e) {
  // Allow: backspace, delete, tab, escape, enter and .
  if (
    $.inArray(e.keyCode, [46, 8, 9, 27, 13, 110]) !== -1 ||
    // Allow: Ctrl+A, Command+A
    (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
    // Allow: home, end, left, right, down, up
    (e.keyCode >= 35 && e.keyCode <= 40) ||
    // Allow: period
    e.keyCode === 190
  ) {
    // let it happen, don't do anything
    return;
  }
  // Ensure that it is a number and stop the keypress
  if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
    e.preventDefault();
  }
};

var $search = $('#search');
$('#country-menu>ul>li').on('click', function () {
  var groupName = $(this).data('group');
  switch (groupName) {
    case 'Canada':
      if (typeof groups.Canada == 'undefined') {
        groups.Canada = new groups.SatGroup('countryRegex', /CA/u);
      }
      break;
    case 'China':
      if (typeof groups.China == 'undefined') {
        groups.China = new groups.SatGroup('countryRegex', /PRC/u);
      }
      break;
    case 'France':
      if (typeof groups.France == 'undefined') {
        groups.France = new groups.SatGroup('countryRegex', /FR/u);
      }
      break;
    case 'India':
      if (typeof groups.India == 'undefined') {
        groups.India = new groups.SatGroup('countryRegex', /IND/u);
      }
      break;
    case 'Israel':
      if (typeof groups.Israel == 'undefined') {
        groups.Israel = new groups.SatGroup('countryRegex', /ISRA/u);
      }
      break;
    case 'Japan':
      if (typeof groups.Japan == 'undefined') {
        groups.Japan = new groups.SatGroup('countryRegex', /JPN/u);
      }
      break;
    case 'Russia':
      if (typeof groups.Russia == 'undefined') {
        groups.Russia = new groups.SatGroup('countryRegex', /CIS/u);
      }
      break;
    case 'UnitedKingdom':
      if (typeof groups.UnitedKingdom == 'undefined') {
        groups.UnitedKingdom = new groups.SatGroup('countryRegex', /UK/u);
      }
      break;
    case 'UnitedStates':
      if (typeof groups.UnitedStates == 'undefined') {
        groups.UnitedStates = new groups.SatGroup('countryRegex', /US/u);
      }
      break;
  }
  _groupSelected(groupName);
});
$('#constellation-menu>ul>li').on('click', function () {
  var groupName = $(this).data('group');
  switch (groupName) {
    case 'SpaceStations':
      if (typeof groups.SpaceStations == 'undefined') {
        groups.SpaceStations = new groups.SatGroup('objNum', [25544, 41765]);
      }
      break;
    case 'GlonassGroup':
      if (typeof groups.GlonassGroup == 'undefined') {
        groups.GlonassGroup = new groups.SatGroup('nameRegex', /GLONASS/u);
      }
      break;
    case 'GalileoGroup':
      if (typeof groups.GalileoGroup == 'undefined') {
        groups.GalileoGroup = new groups.SatGroup('nameRegex', /GALILEO/u);
      }
      break;
    case 'GPSGroup':
      if (typeof groups.GPSGroup == 'undefined') {
        groups.GPSGroup = new groups.SatGroup('nameRegex', /NAVSTAR/u);
      }
      break;
    case 'AmatuerRadio':
      if (typeof groups.AmatuerRadio == 'undefined') {
        groups.AmatuerRadio = new groups.SatGroup('objNum', [
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
        groups.aehf = new groups.SatGroup('objNum', satSet.convertIdArrayToSatnumArray(satLinkManager.aehf));
      }
      $('#loading-screen').fadeIn(1000, function () {
        lineManager.clear();
        satLinkManager.showLinks('aehf');
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'wgs':
      // WGS also selects DSCS
      if (typeof groups.wgs == 'undefined') {
        groups.wgs = new groups.SatGroup('objNum', satSet.convertIdArrayToSatnumArray(satLinkManager.wgs.concat(satLinkManager.dscs)));
      }
      $('#loading-screen').fadeIn(1000, function () {
        lineManager.clear();
        try {
          satLinkManager.showLinks('wgs');
        } catch (e) {
          // Maybe the satLinkManager isn't installed?
        }
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'starlink':
      // WGS also selects DSCS
      if (typeof groups.starlink == 'undefined') {
        groups.starlink = new groups.SatGroup('objNum', satSet.convertIdArrayToSatnumArray(satLinkManager.starlink));
      }
      $('#loading-screen').fadeIn(1000, function () {
        lineManager.clear();
        try {
          satLinkManager.showLinks('starlink');
        } catch (e) {
          // Maybe the satLinkManager isn't installed?
        }
        $('#loading-screen').fadeOut('slow');
      });
      break;
    case 'sbirs':
      // SBIRS and DSP
      if (typeof groups.sbirs == 'undefined') {
        groups.sbirs = new groups.SatGroup('objNum', satSet.convertIdArrayToSatnumArray(satLinkManager.sbirs));
      }
      $('#loading-screen').fadeIn(1000, function () {
        lineManager.clear();
        try {
          satLinkManager.showLinks('sbirs');
        } catch (e) {
          // Maybe the satLinkManager isn't installed?
        }
        $('#loading-screen').fadeOut('slow');
      });
      break;
  }
  _groupSelected(groupName);
  uiManager.doSearch($('#search').val());
});
var _groupSelected = function (groupName) {
  if (typeof groupName == 'undefined') return;
  if (typeof groups[groupName] == 'undefined') return;
  groups.selectGroup(groups[groupName]);
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

  searchBox.fillResultBox(groups[groupName].sats);

  objectManager.setSelectedSat(-1); // Clear selected sat

  // Close Menus
  if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(true);
  uiManager.hideSideMenus();
};

var _resetSensorSelected = function () {
  // Return to default settings with nothing 'inview'
  satellite.setobs(null);
  sensorManager.setSensor(null, null); // Pass staticNum to identify which sensor the user clicked
  satCruncher.postMessage({
    typ: 'offset',
    dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(),
    setlatlong: true,
    resetObserverGd: true,
    sensor: sensorManager.defaultSensor,
  });
  satCruncher.postMessage({
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

// eslint-disable-next-line no-unused-vars
var _offlineMessage = () => {
  settingsManager.loadStr('easterEgg');
  // ga('send', 'event', 'Expired Offline Software', settingsManager.offlineLocation, 'Expired');
};

var getRGBA = (str) => {
  db.log('getRGBA');
  // eslint-disable-next-line no-useless-escape
  var [r, g, b, a] = str.match(/[\d\.]+/gu);
  r = parseInt(r) / 255;
  g = parseInt(g) / 255;
  b = parseInt(b) / 255;
  a = parseFloat(a);
  return [r, g, b, a];
};

// eslint-disable-next-line no-unused-vars
var hexToRgbA = (hex) => {
  db.log('_hexToRgbA');
  var c;
  // eslint-disable-next-line prefer-named-capture-group
  if (/^#([A-Fa-f0-9]{3}){1,2}$/u.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    var r = ((c >> 16) & 255) / 255;
    var g = ((c >> 8) & 255) / 255;
    var b = (c & 255) / 255;
    return [r, g, b, 1];
  }
  throw new Error('Bad Hex');
};

var _rgbCSS = (values) => {
  db.log('_rgbCSS');
  return `rgba(${values[0] * 255},${values[1] * 255},${values[2] * 255},${values[3]})`;
};

var isFooterShown = true;

uiManager.updateURL = () => {
  db.log('uiManager.updateURL', true);
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
        uiManager.legendMenuChange('default');
      } else {
        // If the sensor is a string, load that collection of sensors
        if (typeof currentSensor[0].shortName == 'undefined') {
          sensorManager.setSensor(currentSensor[0], currentSensor[1]);
          uiManager.legendMenuChange('default');
          uiManager.lookAtSensor();
        } else {
          // Seems to be a single sensor without a staticnum, load that
          sensorManager.setSensor(sensorManager.sensorList[currentSensor[0].shortName], currentSensor[1]);
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
  db.log('uiManager.footerToggle');
  if (isFooterShown) {
    isFooterShown = false;
    // uiManager.hideSideMenus();
    $('#sat-infobox').addClass('sat-infobox-fullsize');
    $('#nav-footer').removeClass('footer-slide-up');
    $('#nav-footer').addClass('footer-slide-down');
    $('#nav-footer-toggle').html('&#x25B2;');
  } else {
    isFooterShown = true;
    $('#sat-infobox').removeClass('sat-infobox-fullsize');
    $('#nav-footer').removeClass('footer-slide-down');
    $('#nav-footer').addClass('footer-slide-up');
    $('#nav-footer-toggle').html('&#x25BC;');
  }
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
  let idList = searchBox.doSearch(searchString, isPreventDropDown);
  if (settingsManager.isSatOverflyModeOn) {
    satCruncher.postMessage({
      satelliteSelected: idList,
    });
  }
  // Don't let the search overlap with the legend
  uiManager.legendMenuChange('clear');
  uiManager.updateURL();
};

uiManager.startLowPerf = function () {
  db.log('uiManager.startLowPerf');
  // IDEA: Replace browser variables with localStorage
  // The settings passed as browser variables could be saved as localStorage items
  window.location.replace('index.htm?lowperf');
};

uiManager.isTimeMachineRunning = false;

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
uiManager.panToStar = function (c) {
  db.log('uiManager.panToStar');
  db.log(`c: ${c}`, true);

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
  cameraManager.camSnap(Camera.latToPitch(sat.dec) * -1, Camera.longToYaw(sat.ra * mathValue.DEG2RAD, timeManager.selectedDate));
  setTimeout(function () {
    // console.log(`pitch ${camPitch * mathValue.RAD2DEG} -- yaw ${camYaw * mathValue.RAD2DEG}`);
  }, 2000);
};

uiManager.updateMap = function () {
  db.log('uiManager.updateMap');
  if (objectManager.selectedSat === -1) return;
  if (!settingsManager.isMapMenuOpen) return;
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
      $('#map-look' + i).attr('src', 'images/yellow-square.png'); // If inview then make yellow
    } else {
      $('#map-look' + i).attr('src', 'images/red-square.png'); // If not inview then make red
    }
    $('#map-look' + i).attr('style', 'left:' + map.x + 'px;top:' + map.y + 'px;'); // Set to size of the map image (800x600)
    $('#map-look' + i).attr('time', satellite.map(sat, i).time);
  }
};

export { doSearch, uiManager };
