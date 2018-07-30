/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2018, Theodore Kruczek
(c) 2015-2017, James Yoder

main.js is the primary javascript file for keeptrack.space. It manages all user
interaction with the application.
http://keeptrack.space

Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt

All additions and modifications of original code is Copyright © 2016-2018 by
Theodore Kruczek. All rights reserved. No part of this web site may be reproduced,
published, distributed, displayed, performed, copied or stored for public or private
use, without written permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

/* global
    satSet
    searchBox
    $
    satellite
    ColorScheme
    orbitDisplay
    shaderLoader
    SunCalc
    earth
    groups
    mat4
    vec3
    vec4
    requestAnimationFrame
    ga
    mapManager
    sensorManager
    tleManager
    MassRaidPre
    saveAs
    Blob
    FileReader
    UsaICBM
    RussianICBM
    NorthKoreanBM
    ChinaICBM
    Missile
    missilesInUse
    lastMissileError
    settingsManager
*/
var canvasDOM = $('#canvas');
var mapImageDOM = $('#map-image');
var mapMenuDOM = $('#map-menu');
var satHoverBoxDOM = $('#sat-hoverbox');
var lkpassed = false;

(function () {
  var lastBoxUpdateTime = 0;
  var lastOverlayUpdateTime = 0;
  var lastSatUpdateTime = 0;

  var isInfoOverlayMenuOpen = false;
  var isTwitterMenuOpen = false;
  var isWeatherMenuOpen = false;
  // var isSpaceWeatherMenuOpen = false;
  var isFindByLooksMenuOpen = false;
  var isSensorInfoMenuOpen = false;
  var isWatchlistMenuOpen = false;
  var isLaunchMenuOpen = false;
  var isAboutSelected = false;
  var isMilSatSelected = false;
  var isSocratesMenuOpen = false;
  var isSettingsMenuOpen = false;

  var watchlistList = [];
  var watchlistInViewList = [];
  var nextPassArray = [];
  var nextPassEarliestTime;
  var isWatchlistChanged = false;

  var updateInterval = 1000;

  var uiController = {};

  var touchHoldButton = '';
  $(document).ready(function () { // Code Once index.htm is loaded
    if (settingsManager.offline) updateInterval = 250;
    (function _licenseCheck () {
      if (typeof satel === 'undefined') satel = null;
      if (settingsManager.offline && !_clk(satel, olia)) {
        _offlineMessage();
        throw new Error('Please Contact Theodore Kruczek To Renew Your License <br> theodore.kruczek@gmail.com');
      } else {
        ga('send', 'event', 'Offline Software', settingsManager.offlineLocation, 'Licensed');
      }
      _resize2DMap();
    })();
    (function _resizeWindow () {
      var resizing = false;
      $(window).resize(function () {
        _resize2DMap();
        if (!resizing) {
          window.setTimeout(function () {
            resizing = false;
            webGlInit();
          }, 500);
        }
        resizing = true;
      });
    })();

    function _resize2DMap () {
      if ($(window).width() > $(window).height()) { // If widescreen
        settingsManager.mapWidth = $(window).width();
        mapImageDOM.width(settingsManager.mapWidth);
        settingsManager.mapHeight = settingsManager.mapWidth * 3 / 4;
        mapImageDOM.height(settingsManager.mapHeight);
        mapMenuDOM.width($(window).width());
      } else {
        settingsManager.mapHeight = $(window).height() - 100; // Subtract 100 portrait (mobile)
        mapImageDOM.height(settingsManager.mapHeight);
        settingsManager.mapWidth = settingsManager.mapHeight * 4 / 3;
        mapImageDOM.width(settingsManager.mapWidth);
        mapMenuDOM.width($(window).width());
      }
    }

    (function _uiInit () {
      // Register all UI callback functions with drawLoop in main.js
      drawLoopCallback = function () { _showSatTest(); _updateNextPassOverlay(); _checkWatchlist(); _updateSelectBox(); _mobileScreenControls(); };
    })();
    (function _menuInit () {
      // Load the current JDAY
      var jday = 'JDAY: ' + timeManager.getDayOfYear(timeManager.propTime());
      $('#jday').html(jday);
      jday = null; // Garbage collect

      // Load the Stylesheets
      $('head').append('<link rel="stylesheet" type="text/css" href="css/style.css">');

      // Load ALl The Images Now
      $('img').each(function () {
        $(this).attr('src', $(this).attr('delayedsrc'));
      });

      // Initialize Navigation Menu
      $('.dropdown-button').dropdown();
      $('.tooltipped').tooltip({delay: 50});

      // Initialize Materialize Select Menus
      $('select').material_select();

      // Initialize Perfect Scrollbar
      $('#search-results').perfectScrollbar();

      // Initialize the date/time picker
      $('#datetime-input-tb').datetimepicker({
        dateFormat: 'yy-mm-dd',
        timeFormat: 'HH:mm:ss',
        timezone: '+0000',
        gotoCurrent: true,
        addSliderAccess: true,
        // minDate: -14, // No more than 7 days in the past
        // maxDate: 14,
        sliderAccessArgs: { touchonly: false }}).on('change.dp', function (e) { // or 7 days in the future to make sure ELSETs are valid
          // NOTE: This code gets called when the done button is pressed or the time sliders are closed
          $('#datetime-input').fadeOut();
          $('#datetime-text').fadeIn();
          _updateNextPassOverlay(true);
          settingsManager.isEditTime = false;
        });

      window.oncontextmenu = function (event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      };
      $(document).bind('cbox_closed', function () {
        if (isLaunchMenuOpen) {
          isLaunchMenuOpen = false;
          $('#menu-launches img').removeClass('bmenu-item-selected');
        }
      });
    })();
    (function _canvasController () {
      canvasDOM.on('touchmove', function (evt) {
        evt.preventDefault();
        mouseX = evt.originalEvent.touches[0].clientX;
        mouseY = evt.originalEvent.touches[0].clientY;
        if (isDragging && screenDragPoint[0] !== mouseX && screenDragPoint[1] !== mouseY) {
          dragHasMoved = true;
          camAngleSnappedOnSat = false;
          camZoomSnappedOnSat = false;
        }
        isMouseMoving = true;
        clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(function () {
          isMouseMoving = false;
        }, 250);
      });
      canvasDOM.mousemove(function (evt) {
        mouseX = evt.clientX;
        mouseY = evt.clientY;
        if (isDragging && screenDragPoint[0] !== mouseX && screenDragPoint[1] !== mouseY) {
          dragHasMoved = true;
          camAngleSnappedOnSat = false;
          camZoomSnappedOnSat = false;
        }
        isMouseMoving = true;
        clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(function () {
          isMouseMoving = false;
        }, 250);
      });
      canvasDOM.on('wheel', function (evt) {
        var delta = evt.originalEvent.deltaY;
        if (evt.originalEvent.deltaMode === 1) {
          delta *= 33.3333333;
        }
        zoomTarget += delta * 0.0002;
        if (zoomTarget > 1) zoomTarget = 1;
        if (zoomTarget < 0) zoomTarget = 0;
        rotateTheEarth = false;
        camZoomSnappedOnSat = false;

        if (cameraType.current === cameraType.PLANETARIUM) {
          settingsManager.fieldOfView += delta * 0.0002;
          if (settingsManager.fieldOfView > 2.12) settingsManager.fieldOfView = 2.12;
          if (settingsManager.fieldOfView < 0.5) settingsManager.fieldOfView = 0.5;
          webGlInit();
        }
      });
      canvasDOM.click(function (evt) {
        if ($('#colorbox').css('display') === 'block') {
          $.colorbox.close(); // Close colorbox if it was open
        }
      });
      canvasDOM.mousedown(function (evt) {
        dragPoint = getEarthScreenPoint(mouseX, mouseY);
        screenDragPoint = [mouseX, mouseY];
        dragStartPitch = camPitch;
        dragStartYaw = camYaw;
        // debugLine.set(dragPoint, getCamPos());
        isDragging = true;
        if ($(document).width() <= 1000) {
          isDragging = false;
        }
        camSnapMode = false;
        rotateTheEarth = false;
      });
      canvasDOM.on('touchstart', function (evt) {
        var x = evt.originalEvent.touches[0].clientX;
        var y = evt.originalEvent.touches[0].clientY;
        dragPoint = getEarthScreenPoint(x, y);
        screenDragPoint = [x, y];
        dragStartPitch = camPitch;
        dragStartYaw = camYaw;
        // debugLine.set(dragPoint, getCamPos());
        isDragging = true;
        if ($(document).width() <= 1000) {
          isDragging = false;
        }
        camSnapMode = false;
        rotateTheEarth = false;
      });
      canvasDOM.mouseup(function (evt) {
        if (!dragHasMoved) {
          var clickedSat = getSatIdFromCoord(mouseX, mouseY);
          if (clickedSat === -1 && evt.button === 2) { // Right Mouse Button Click
            $('#search').val('');
            searchBox.hideResults();
            isMilSatSelected = false;
            $('#menu-space-stations img').removeClass('bmenu-item-selected');
            if ($(document).width() <= 1000) {
              $('#search-results').attr('style', 'height:110px;margin-bottom:-50px;width:100%;bottom:auto;margin-top:50px;');
              $('#controls-up-wrapper').css('top', '80px');
            } else {
              $('#search-results').attr('style', 'max-height:100%;margin-bottom:-50px;');
              $('#legend-hover-menu').hide();
            }

            // Hide All legends
            $('#legend-list-default').hide();
            $('#legend-list-default-sensor').hide();
            $('#legend-list-rcs').hide();
            $('#legend-list-small').hide();
            $('#legend-list-near').hide();
            $('#legend-list-deep').hide();
            $('#legend-list-velocity').hide();

            if (satellite.sensorSelected()) {
              $('#menu-in-coverage img').removeClass('bmenu-item-disabled');
              $('#legend-list-default-sensor').show();
            } else {
              $('#legend-list-default').show();
            }

            satSet.setColorScheme(ColorScheme.default, true);
          }
          selectSat(clickedSat);
        }
        // Repaint the theme to ensure it is the right color
        settingsManager.themes.retheme();
        // Force the serach bar to get repainted because it gets overwrote a lot
        settingsManager.themes.redThemeSearch();
        dragHasMoved = false;
        isDragging = false;
        rotateTheEarth = false;
      });
      canvasDOM.on('touchend', function (evt) {
        dragHasMoved = false;
        isDragging = false;
        rotateTheEarth = false;
      });
      canvasDOM.on('keypress', _keyHandler); // On Key Press Event Run _keyHandler Function
      canvasDOM.on('keydown', _keyDownHandler); // On Key Press Event Run _keyHandler Function
      canvasDOM.on('keyup', _keyUpHandler); // On Key Press Event Run _keyHandler Function
      canvasDOM.attr('tabIndex', 0);
      canvasDOM.focus();
    })();
    (function _menuController () {

      // Reset time if in retro mode
      if (settingsManager.retro) {
        timeManager.propOffset = new Date(2000, 2, 13) - Date.now();
        $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.propRealTime + timeManager.propOffset));
        satCruncher.postMessage({
          typ: 'offset',
          dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString()
        });
      }

      $('#datetime-text').click(function () {
        if (!settingsManager.isEditTime) {
          $('#datetime-text').fadeOut();
          $('#datetime-input').fadeIn();
          $('#datetime-input-tb').focus();
          settingsManager.isEditTime = true;
        }
      });

      $('.menu-item').mouseover(function (evt) {
        $(this).children('.submenu').css({
          display: 'block'
        });
      });

      $('.menu-item').mouseout(function (evt) {
        $(this).children('.submenu').css({
          display: 'none'
        });
      });

      $('#search-close').click(function () {
        $('#search').val('');
        searchBox.hideResults();
        isMilSatSelected = false;
        $('#menu-space-stations img').removeClass('bmenu-item-selected');
        $('#controls-up-wrapper').css('top', '80px');
      });

      $('#mobile-controls').on('touchstop mouseup', function () {
        touchHoldButton = '';
      });

      $('#controls-zoom-in').on('touchstart mousedown', function () {
        touchHoldButton = 'zoom-in';
        rotateTheEarth = false;
        camZoomSnappedOnSat = false;
      });

      $('#controls-zoom-out').on('touchstart mousedown', function () {
        touchHoldButton = 'zoom-out';
        rotateTheEarth = false;
        camZoomSnappedOnSat = false;
      });
      $('#controls-up').on('touchstart mousedown', function () {
        touchHoldButton = 'move-up';
        rotateTheEarth = false;
        camZoomSnappedOnSat = false;
      });

      $('#controls-down').on('touchstart mousedown', function () {
        touchHoldButton = 'move-down';
        rotateTheEarth = false;
        camZoomSnappedOnSat = false;
      });

      $('#controls-left').on('touchstart mousedown', function () {
        touchHoldButton = 'move-left';
        rotateTheEarth = false;
        camZoomSnappedOnSat = false;
      });

      $('#controls-right').on('touchstart mousedown', function () {
        touchHoldButton = 'move-right';
        rotateTheEarth = false;
        camZoomSnappedOnSat = false;
      });

      $('#info-overlay-content').on('click', '.watchlist-object', function (evt) {
        var objNum = $(this).context.textContent.split(':');
        objNum = objNum[0];
        var satId = satSet.getIdFromObjNum(objNum);
        if (satId !== null) {
          selectSat(satId);
        }
      });

      $('#bottom-icons').on('click', '.bmenu-item', _bottomIconPress); // Bottom Button Pressed

      $('#bottom-menu').on('click', '.FOV-object', function (evt) {
        var objNum = $(this).context.textContent;
        objNum = objNum.slice(-5);
        var satId = satSet.getIdFromObjNum(objNum);
        if (satId !== null) {
          selectSat(satId);
        }
      });

      $('#facebook-share').click(function () {
        ga('send', 'social', 'Facebook', 'share', 'http://keeptrack.com');
      });

      $('#twitter-share').click(function () {
        ga('send', 'social', 'Twitter', 'share', 'http://keeptrack.com');
      });

      $('#reddit-share').click(function () {
        ga('send', 'social', 'Reddit', 'share', 'http://keeptrack.com');
      });

      $('#us-radar-menu').click(function () {
        if ($('#legend-list-default').css('display') === 'block') {
          $('#legend-list-default').hide();
          $('#legend-list-default-sensor').show();
        }
        uiController.updateMap();
      });

      $('#russian-menu').click(function () {
        if ($('#legend-list-default').css('display') === 'block') {
          $('#legend-list-default').hide();
          $('#legend-list-default-sensor').show();
        }
        uiController.updateMap();
      });

      $('#legend-menu').click(function () {
        if ($('#legend-hover-menu').css('display') === 'block') {
          $('#legend-hover-menu').hide();
        } else {
          $('#legend-hover-menu').show();
          $('#search').val('');
          searchBox.hideResults();
          $('#search-results').hide();
          $('#legend-hover-menu').css({
            height: 'inherit'
          });
        }
      });

      // USAF Radars
      $('#radar-beale').click(function () { // Select Beale's Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.BLE);
      });
      $('#radar-capecod').click(function () { // Select Cape Cod's Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.COD);
      });
      $('#radar-clear').click(function () { // Select Clear's Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.CLR);
      });
      $('#radar-eglin').click(function () { // Select Clear's Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.EGL);
      });
      $('#radar-fylingdales').click(function () { // Select Fylingdales's Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.FYL);
      });
      $('#radar-parcs').click(function () { // Select PARCS' Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.CAV);
      });
      $('#radar-thule').click(function () { // Select Thule's Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.THL);
      });
      $('#radar-cobradane').click(function () { // Select Cobra Dane's Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.CDN);
      });

      // US Contributing Radars
      $('#radar-altair').click(function () { // Select Altair's Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.ALT);
      });
      $('#radar-millstone').click(function () { // Select Millstone's Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.MIL);
      });
      $('#radar-ascension').click(function () { // Select Ascension's Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.ASC);
      });
      $('#radar-globus').click(function () { // Select Globus II's Radar Coverage
        sensorManager.setSensor(sensorManager.sensorList.GLB);
      });

      // Optical
      $('#optical-diego-garcia').click(function () { // Select Diego Garcia's Optical Coverage
        sensorManager.setSensor(sensorManager.sensorList.DGC);
      });
      $('#optical-maui').click(function () { // Select Maui's Optical Coverage
        sensorManager.setSensor(sensorManager.sensorList.MAU);
      });
      $('#optical-socorro').click(function () { // Select Socorro's Optical Coverage
        sensorManager.setSensor(sensorManager.sensorList.SOC);
      });

      // Russian Radars
      $('#russian-armavir').click(function () {
        sensorManager.setSensor(sensorManager.sensorList.ARM);
      });
      $('#russian-balkhash').click(function () {
        sensorManager.setSensor(sensorManager.sensorList.BAL);
      });
      $('#russian-gantsevichi').click(function () {
        sensorManager.setSensor(sensorManager.sensorList.GAN);
      });
      $('#russian-lekhtusi').click(function () {
        sensorManager.setSensor(sensorManager.sensorList.LEK);
      });
      $('#russian-mishelevka-d').click(function () {
        sensorManager.setSensor(sensorManager.sensorList.MIS);
      });
      $('#russian-olenegorsk').click(function () {
        sensorManager.setSensor(sensorManager.sensorList.OLE);
      });
      $('#russian-pechora').click(function () {
        sensorManager.setSensor(sensorManager.sensorList.PEC);
      });
      $('#russian-pionersky').click(function () {
        sensorManager.setSensor(sensorManager.sensorList.PIO);
      });

      // Chinese Radars
      $('#chinese-xuanhua').click(function () {
        sensorManager.setSensor(sensorManager.sensorList.XUA);
      });

      $('.sensor-selected').click(function () {
        $('#menu-sensor-info img').removeClass('bmenu-item-disabled');
        if (selectedSat !== -1) {
          $('#menu-lookangles img').removeClass('bmenu-item-disabled');
        }
        if (watchlistList.length > 0) {
          $('#menu-info-overlay img').removeClass('bmenu-item-disabled');
        }
        $('#menu-in-coverage img').removeClass('bmenu-item-disabled');
      });

      $('#datetime-input-form').change(function (e) {
        var selectedDate = $('#datetime-input-tb').datepicker('getDate');
        var today = new Date();
        var jday = 'JDAY: ' + timeManager.getDayOfYear(timeManager.propTime());
        $('#jday').html(jday);
        timeManager.propOffset = selectedDate - today;
        satCruncher.postMessage({
          typ: 'offset',
          dat: (timeManager.propOffset).toString() + ' ' + (1.0).toString()
        });
        timeManager.propRealTime = Date.now();
        timeManager.propTime();
        // Reset last update times when going backwards in time
        lastOverlayUpdateTime = timeManager.now * 1 - 7000;
        lastBoxUpdateTime = timeManager.now;
        _updateNextPassOverlay(true);
        e.preventDefault();
      });
      $('#findByLooks').submit(function (e) {
        var fblAzimuth = $('#fbl-azimuth').val();
        var fblElevation = $('#fbl-elevation').val();
        var fblRange = $('#fbl-range').val();
        var fblInc = $('#fbl-inc').val();
        var fblPeriod = $('#fbl-period').val();
        var fblAzimuthM = $('#fbl-azimuth-margin').val();
        var fblElevationM = $('#fbl-elevation-margin').val();
        var fblRangeM = $('#fbl-range-margin').val();
        var fblIncM = $('#fbl-inc-margin').val();
        var fblPeriodM = $('#fbl-period-margin').val();
        $('#search').val(''); // Reset the search first
        satSet.searchAzElRange(fblAzimuth, fblElevation, fblRange, fblInc, fblAzimuthM, fblElevationM, fblRangeM, fblIncM, fblPeriod, fblPeriodM);
        e.preventDefault();
      });
      $('#settings-form').submit(function (e) {
        var isResetSensorChecked = document.getElementById('settings-resetSensor').checked;
        var isHOSChecked = document.getElementById('settings-hos').checked;
        settingsManager.isOnlyFOVChecked = document.getElementById('settings-onlyfov').checked;
        var isLimitSats = document.getElementById('settings-limitSats-enabled').checked;
        var isChangeSharperShaders = document.getElementById('settings-shaders').checked;
        var isSNPChecked = document.getElementById('settings-snp').checked;
        var isSDChecked = document.getElementById('settings-sd').checked;
        var isRiseSetChecked = document.getElementById('settings-riseset').checked;

        /** Filter On and Shaders On */
        if (!settingsManager.isSharperShaders && isChangeSharperShaders && isLimitSats) {
          shadersOnFilterOn();
        } else if (isLimitSats && limitSats !== $('#limitSats').val() && !isChangeSharperShaders) {
          shadersOffFilterOn();
        } else if (!settingsManager.isSharperShaders && isChangeSharperShaders && !isLimitSats) {
          shadersOnFilterOff();
        } else if (!isLimitSats && limitSats !== '') {
        /** Filter turned off was previously on */
          if (isChangeSharperShaders === false) {
            shadersOffFilterOff();
          } else {
            shadersOnFilterOff();
          }
        } else if (settingsManager.isSharperShaders !== isChangeSharperShaders) {
        /** If shaders change */
          if (!isLimitSats || limitSats === '') {
            if (isChangeSharperShaders) { shadersOnFilterOff(); }
            if (!isChangeSharperShaders) { shadersOffFilterOff(); }
          } else {
            if (isChangeSharperShaders) { shadersOnFilterOn(); }
            if (!isChangeSharperShaders) { shadersOffFilterOn(); }
          }
        }

        function shadersOnFilterOn () {
          limitSats = $('#limitSats').val();
          window.location = '/index.htm?sharperShaders=true&limitSats=' + limitSats;
        }
        function shadersOnFilterOff () { window.location = '/index.htm?sharperShaders=true'; }
        function shadersOffFilterOn () {
          limitSats = $('#limitSats').val();
          window.location = '/index.htm?limitSats=' + limitSats;
        }
        function shadersOffFilterOff () { window.location = '/index.htm'; }

        if (isResetSensorChecked) {
          // Return to default settings with nothing 'inview'
          satCruncher.postMessage({
            typ: 'offset',
            dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString(),
            setlatlong: true,
            sensor: satellite.defaultSensor
          });
          satellite.setobs(null, true);
          sensorManager.whichRadar = ''; // Disable Weather
          $('#menu-sensor-info img').addClass('bmenu-item-disabled');
          $('#menu-in-coverage img').addClass('bmenu-item-disabled');
          $('#menu-lookangles img').addClass('bmenu-item-disabled');
          $('#menu-weather img').addClass('bmenu-item-disabled');
        }
        if (isHOSChecked) {
          settingsManager.otherSatelliteTransparency = 0;
          ga('send', 'event', 'Settings Menu', 'Hide Other Satellites', 'Option Selected');
        } else {
          settingsManager.otherSatelliteTransparency = 0.1;
        }
        if (settingsManager.isOnlyFOVChecked) {
          satSet.setColorScheme(ColorScheme.onlyFOV, true);
          ga('send', 'event', 'Settings Menu', 'Show Only FOV', 'Option Selected');
          ga('send', 'event', 'ColorScheme Menu', 'Only FOV', 'Selected');
        }
        if (isSNPChecked) {
          isShowNextPass = true;
          ga('send', 'event', 'Settings Menu', 'Show Next Pass on Hover', 'Option Selected');
        } else {
          isShowNextPass = false;
        }

        if (isRiseSetChecked) {
          satellite.isRiseSetLookangles = true;
          ga('send', 'event', 'Settings Menu', 'Show Only Rise/Set Times', 'Option Selected');
        } else {
          satellite.isRiseSetLookangles = false;
        }

        satellite.lookanglesLength = $('#lookanglesLength').val() * 1;
        satellite.lookanglesInterval = $('#lookanglesInterval').val() * 1;

        document.getElementById('settings-resetSensor').checked = false;
        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
        e.preventDefault();
      });

      $('#editSat').submit(function (e) {
        $('#es-error').hide();
        var scc = $('#es-scc').val();
        var satId = satSet.getIdFromObjNum(scc);
        if (satId === null) {
          console.log('Not a Real Satellite');
          e.preventDefault();
          return;
        }
        var sat = satSet.getSat(satId);

        var intl = sat.TLE1.substr(9, 8);

        // TODO: Calculate current J-Day to change Epoch Date

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
        inc = _pad0(inc, 8);

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
        meanmo = _pad0(meanmo, 8);

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
        rasc = _pad0(rasc, 8);

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
        argPe = _pad0(argPe, 8);

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
        meana = _pad0(meana, 8);

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
            TLE2: TLE2
          });
          orbitDisplay.updateOrbitBuffer(satId, true, TLE1, TLE2);
          sat.active = true;

          sat = satSet.getSat(satId);
        } else {
          $('#es-error').html('Failed Altitude Check</br>Try Different Parameters');
          $('#es-error').show();
        }
        e.preventDefault();
      });

      $('#editSat-save').click(function (e) {
        var scc = $('#es-scc').val();
        var satId = satSet.getIdFromObjNum(scc);
        var sat = satSet.getSat(satId);
        var sat2 = {
          TLE1: sat.TLE1,
          TLE2: sat.TLE2
        };
        var variable = JSON.stringify(sat2);
        var blob = new Blob([variable], {type: 'text/plain;charset=utf-8'});
        saveAs(blob, scc + '.tle');
        e.preventDefault();
      });

      $('#editSat-open').click(function (e) {
        $('#editSat-file').trigger('click');
      });

      $('#editSat-file').change(function (evt) {
        if (!window.FileReader) return; // Browser is not compatible

        var reader = new FileReader();

        reader.onload = function (evt) {
          if (evt.target.readyState !== 2) return;
          if (evt.target.error) {
            console.log('error');
            return;
          }

          var object = JSON.parse(evt.target.result);
          var scc = parseInt(_pad0(object.TLE1.substr(2, 5).trim(), 5));
          var satId = satSet.getIdFromObjNum(scc);
          var sat = satSet.getSat(satId);
          if (satellite.altitudeCheck(object.TLE1, object.TLE2, timeManager.propOffset) > 1) {
            satCruncher.postMessage({
              typ: 'satEdit',
              id: sat.id,
              active: true,
              TLE1: object.TLE1,
              TLE2: object.TLE2
            });
            orbitDisplay.updateOrbitBuffer(sat.id, true, object.TLE1, object.TLE2);
            sat.active = true;
          } else {
            $('#es-error').html('Failed Altitude Check</br>Try Different Parameters');
            $('#es-error').show();
          }
        };
        reader.readAsText(evt.target.files[0]);
        evt.preventDefault();
      });

      $('#es-error').click(function () {
        $('#es-error').hide();
      });

      $('#map-menu').on('click', '.map-look', function (evt) {
        settingsManager.isMapUpdateOverride = true;
        var time = $(this).context.attributes.time.value; // TODO: Find correct code for this.
        if (time !== null) {
          time = time.split(' ');
          time = new Date(time[0] + 'T' + time[1] + 'Z');
          var today = new Date(); // Need to know today for offset calculation
          timeManager.propOffset = time - today; // Find the offset from today
          satCruncher.postMessage({ // Tell satCruncher we have changed times for orbit calculations
            typ: 'offset',
            dat: (timeManager.propOffset).toString() + ' ' + (1.0).toString()
          });
        }
      });

      $('#socrates-menu').on('click', '.socrates-object', function (evt) {
        var hiddenRow = $(this).context.attributes.hiddenrow.value; // TODO: Find correct code for this.
        if (hiddenRow !== null) {
          socrates(hiddenRow);
        }
      });
      $('#watchlist-list').on('click', '.watchlist-remove', function (evt) {
        var satId = $(this).data('sat-id');
        for (var i = 0; i < watchlistList.length; i++) {
          if (watchlistList[i] === satId) {
            watchlistList.splice(i, 1);
            watchlistInViewList.splice(i, 1);
          }
        }
        _updateWatchlist();
        if (watchlistList.length <= 0) {
          searchBox.doSearch('');
          satSet.setColorScheme(ColorScheme.default, true);
          settingsManager.themes.blueTheme();
        }
        if (!satellite.sensorSelected() || watchlistList.length <= 0) {
          $('#menu-info-overlay img').addClass('bmenu-item-disabled');
        }
      });
      // Add button selected on watchlist menu
      $('#watchlist-content').on('click', '.watchlist-add', function (evt) {
        var satId = satSet.getIdFromObjNum(_pad0($('#watchlist-new').val(), 5));
        var duplicate = false;
        for (var i = 0; i < watchlistList.length; i++) { // No duplicates
          if (watchlistList[i] === satId) duplicate = true;
        }
        if (!duplicate) {
          watchlistList.push(satId);
          watchlistInViewList.push(false);
          _updateWatchlist();
        }
        if (satellite.sensorSelected()) {
          $('#menu-info-overlay img').removeClass('bmenu-item-disabled');
        }
        $('#watchlist-new').val(''); // Clear the search box after enter pressed/selected
      });
      // Enter pressed/selected on watchlist menu
      $('#watchlist-content').submit(function (e) {
        var satId = satSet.getIdFromObjNum(_pad0($('#watchlist-new').val(), 5));
        var duplicate = false;
        for (var i = 0; i < watchlistList.length; i++) { // No duplicates
          if (watchlistList[i] === satId) duplicate = true;
        }
        if (!duplicate) {
          watchlistList.push(satId);
          watchlistInViewList.push(false);
          _updateWatchlist();
        }
        if (satellite.sensorSelected()) {
          $('#menu-info-overlay img').removeClass('bmenu-item-disabled');
        }
        $('#watchlist-new').val(''); // Clear the search box after enter pressed/selected
        e.preventDefault();
      });
      $('#watchlist-save').click(function (e) {
        var saveWatchlist = [];
        for (var i = 0; i < watchlistList.length; i++) {
          var sat = satSet.getSat(watchlistList[i]);
          saveWatchlist[i] = sat.SCC_NUM;
        }
        var variable = JSON.stringify(saveWatchlist);
        var blob = new Blob([variable], {type: 'text/plain;charset=utf-8'});
        saveAs(blob, 'watchlist.json');
        e.preventDefault();
      });
      $('#watchlist-open').click(function (e) {
        $('#watchlist-file').trigger('click');
      });
      $('#watchlist-file').change(function (evt) {
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
            var sat = satSet.getSat(satSet.getIdFromObjNum(newWatchlist[i]));
            if (sat !== null) {
              newWatchlist[i] = sat.id;
              watchlistInViewList.push(false);
            } else {
              console.error('Watchlist File Format Incorret');
              return;
            }
          }
          watchlistList = newWatchlist;
          _updateWatchlist();
          if (satellite.sensorSelected()) {
            $('#menu-info-overlay img').removeClass('bmenu-item-disabled');
          }
        };
        reader.readAsText(evt.target.files[0]);
        evt.preventDefault();
      });

      $('#newLaunch').submit(function (e) {
        $('#loading-screen').fadeIn('slow', function () {
          $('#nl-error').hide();
          var scc = $('#nl-scc').val();
          var satId = satSet.getIdFromObjNum(scc);
          var sat = satSet.getSat(satId);
          // var intl = sat.INTLDES.trim();

          var upOrDown = $('#nl-updown').val();

          // TODO: Calculate current J-Day to change Epoch Date

          var launchFac = $('#nl-facility').val();
          ga('send', 'event', 'New Launch', launchFac, 'Launch Site');

          var launchLat, launchLon;

          for (var launchSite in window.launchSiteManager.launchSiteList) {
            if (window.launchSiteManager.launchSiteList[launchSite].name === launchFac) {
              launchLat = window.launchSiteManager.launchSiteList[launchSite].lat;
              launchLon = window.launchSiteManager.launchSiteList[launchSite].lon;
            }
          }
          if (launchLon > 180) { // if West not East
            launchLon -= 360; // Convert from 0-360 to -180-180
          }

          // Set time to 0000z for relative time.

          var today = new Date(); // Need to know today for offset calculation
          var quadZTime = new Date(today.getFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0); // New Date object of the future collision
          // Date object defaults to local time.
          quadZTime.setUTCHours(0); // Move to UTC Hour

          timeManager.propOffset = quadZTime - today; // Find the offset from today
          camSnapMode = false;
          satCruncher.postMessage({ // Tell satCruncher we have changed times for orbit calculations
            typ: 'offset',
            dat: (timeManager.propOffset).toString() + ' ' + (1.0).toString()
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
              TLE2: TLE2
            });
            orbitDisplay.updateOrbitBuffer(satId, true, TLE1, TLE2);

            sat = satSet.getSat(satId);
          } else {
            $('#nl-error').html('Failed Altitude Check</br>Try Editing Manually');
            $('#nl-error').show();
          }
          $('#loading-screen').fadeOut();
        });
        e.preventDefault();
      });

      $('#nl-error').click(function () {
        $('#nl-error').hide();
      });

      $('#breakup').submit(function (e) {
        $('#loading-screen').fadeIn('slow', function () {
          var scc = $('#hc-scc').val();
          var satId = satSet.getIdFromObjNum(scc);
          var mainsat = satSet.getSat(satId);
          var currentEpoch = satellite.currentEpoch(time);
          mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);

          // TODO: Calculate current J-Day to change Epoch Date

          var launchFac = $('#nl-facility').val();
          ga('send', 'event', 'New Launch', launchFac, 'Launch Site');

          var launchLat, launchLon;
          launchLon = satellite.degreesLong(satellite.lon);
          launchLat = satellite.degreesLat(satellite.lat);

          camSnapMode = false;

          var upOrDown = 'S';

          var TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset);
          var TLE1 = TLEs[0];
          var TLE2 = TLEs[1];

          for (var i = 0; i < 30; i++) {
            satId = satSet.getIdFromObjNum(80000 + i);
            var sat = satSet.getSat(satId);
            var iTLE1 = '1 ' + (80000 + i) + TLE1.substr(7);

            var inc = TLE2.substr(8, 8);
            inc = parseFloat(inc - 0.3 + (0.6 / (15 / (i + 1)))).toPrecision(7);
            inc = inc.split('.');
            inc[0] = inc[0].substr(-3, 3);
            if (inc[1]) {
              inc[1] = inc[1].substr(0, 4);
            } else {
              inc[1] = '0000';
            }
            inc = (inc[0] + '.' + inc[1]).toString();
            inc = _padEmpty(inc, 8);

            var meanmo = TLE2.substr(52, 10);
            meanmo = parseFloat(meanmo - (0.03 / 15) + (0.06 * ((i + 1) / 15))).toPrecision(10);
            meanmo = meanmo.split('.');
            meanmo[0] = meanmo[0].substr(-2, 2);
            if (meanmo[1]) {
              meanmo[1] = meanmo[1].substr(0, 8);
            } else {
              meanmo[1] = '00000000';
            }
            meanmo = (meanmo[0] + '.' + meanmo[1]).toString();

            var iTLE2 = '2 ' + (80000 + i) + ' ' + inc + ' ' + TLE2.substr(17, 35) + meanmo + TLE2.substr(63);
            sat.TLE1 = iTLE1;
            sat.TLE2 = iTLE2;
            var iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset);
            iTLE1 = iTLEs[0];
            iTLE2 = iTLEs[1];
            if (satellite.altitudeCheck(iTLE1, iTLE2, timeManager.propOffset) > 1) {
              satCruncher.postMessage({
                typ: 'satEdit',
                id: satId,
                TLE1: iTLE1,
                TLE2: iTLE2
              });
              orbitDisplay.updateOrbitBuffer(satId, true, iTLE1, iTLE2);

              sat = satSet.getSat(satId);
            } else {
              console.error('Breakup Generator Failed');
            }
          }
          $('#loading-screen').fadeOut();
        });
        e.preventDefault();
      });

      $('#missile').submit(function (e) {
        $('#ms-error').hide();
        var type = $('#ms-type').val() * 1;
        var attacker = $('#ms-attacker').val() * 1;
        var target = $('#ms-target').val() * 1;
        var tgtLat = $('#ms-lat').val() * 1;
        var tgtLon = $('#ms-lon').val() * 1;
        // var result = false;

        var launchTime = $('#datetime-text').text().substr(0, 19);
        launchTime = launchTime.split(' ');
        launchTime = new Date(launchTime[0] + 'T' + launchTime[1] + 'Z').getTime();

        if (type > 0) {
          if (type === 1) MassRaidPre(launchTime, 'simulation/Russia2USA.json');
          if (type === 2) MassRaidPre(launchTime, 'simulation/Russia2USAalt.json');
          if (type === 3) MassRaidPre(launchTime, 'simulation/China2USA.json');
          if (type === 4) MassRaidPre(launchTime, 'simulation/NorthKorea2USA.json');
          if (type === 5) MassRaidPre(launchTime, 'simulation/USA2Russia.json');
          if (type === 6) MassRaidPre(launchTime, 'simulation/USA2China.json');
          if (type === 7) MassRaidPre(launchTime, 'simulation/USA2NorthKorea.json');
          ga('send', 'event', 'Missile Sim', type, 'Sim Number');
          $('#ms-error').html('Large Scale Attack Loaded');
          $('#ms-error').show();
        } else {
          if (target === -1) { // Custom Target
            if (isNaN(tgtLat)) {
              $('#ms-error').html('Please enter a number<br>for Target Latitude');
              $('#ms-error').show();
              e.preventDefault();
              return;
            }
            if (isNaN(tgtLon)) {
              $('#ms-error').html('Please enter a number<br>for Target Longitude');
              $('#ms-error').show();
              e.preventDefault();
              return;
            }
          } else { // Premade Target
            tgtLat = globalBMTargets[target * 3];
            tgtLon = globalBMTargets[(target * 3) + 1];
          }

          var a, b, attackerName;

          if (attacker < 200) { // USA
            a = attacker - 100;
            b = 500 - missilesInUse;
            attackerName = UsaICBM[a * 4 + 2];
            Missile(UsaICBM[a * 4], UsaICBM[a * 4 + 1], tgtLat, tgtLon, 3, satSet.getSatData().length - b, launchTime, UsaICBM[a * 4 + 2], 30, 2.9, 0.07, UsaICBM[a * 4 + 3], 'United States');
          } else if (attacker < 300) { // Russian
            a = attacker - 200;
            b = 500 - missilesInUse;
            attackerName = RussianICBM[a * 4 + 2];
            Missile(RussianICBM[a * 4], RussianICBM[a * 4 + 1], tgtLat, tgtLon, 3, satSet.getSatData().length - b, launchTime, RussianICBM[a * 4 + 2], 30, 2.9, 0.07, RussianICBM[a * 4 + 3], 'Russia');
          } else if (attacker < 400) { // Chinese
            a = attacker - 300;
            b = 500 - missilesInUse;
            attackerName = ChinaICBM[a * 4 + 2];
            Missile(ChinaICBM[a * 4], ChinaICBM[a * 4 + 1], tgtLat, tgtLon, 3, satSet.getSatData().length - b, launchTime, ChinaICBM[a * 4 + 2], 30, 2.9, 0.07, ChinaICBM[a * 4 + 3], 'China');
          } else if (attacker < 500) { // North Korean
            a = attacker - 400;
            b = 500 - missilesInUse;
            attackerName = NorthKoreanBM[a * 4 + 2];
            Missile(NorthKoreanBM[a * 4], NorthKoreanBM[a * 4 + 1], tgtLat, tgtLon, 3, satSet.getSatData().length - b, launchTime, NorthKoreanBM[a * 4 + 2], 30, 2.9, 0.07, NorthKoreanBM[a * 4 + 3], 'North Korea');
          }
          ga('send', 'event', 'New Missile', attackerName, 'Attacker');
          ga('send', 'event', 'New Missile', tgtLat + ', ' + tgtLon, 'Target');

          $('#ms-error').html(lastMissileError);
          $('#ms-error').show();
        }
        e.preventDefault();
      });

      $('#ms-error').click(function () {
        $('#ms-error').hide();
      });

      $('#missile').change(function (e) {
        if ($('#ms-type').val() * 1 !== 0) {
          $('#ms-custom-opt').hide();
        } else {
          $('#ms-custom-opt').show();
        }
      });

      $('#cs-telescope').click(function (e) {
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
          $('#cs-maxrange').val(50000);
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
        }
      });

      $('#customSensor').submit(function (e) {
        $('#menu-sensor-info img').removeClass('bmenu-item-disabled');
        sensorManager.whichRadar = 'CUSTOM';
        if ($('#cs-telescope').val()) {
          $('#sensor-type').html('Telescope');
        } else {
          $('#sensor-type').html('Radar');
        }
        $('#sensor-info-title').html('Custom Sensor');
        $('#sensor-country').html('Custom Sensor');

        var lon = $('#cs-lon').val();
        var lat = $('#cs-lat').val();
        var obshei = $('#cs-hei').val();
        var minaz = $('#cs-minaz').val();
        var maxaz = $('#cs-maxaz').val();
        var minel = $('#cs-minel').val();
        var maxel = $('#cs-maxel').val();
        var minrange = $('#cs-minrange').val();
        var maxrange = $('#cs-maxrange').val();

        satCruncher.postMessage({ // Send SatCruncher File information on this radar
          typ: 'offset', // Tell satcruncher to update something
          dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
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
            obsmaxrange: maxrange
          }
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
          obsmaxrange: maxrange
        });

        lat = lat * 1;
        lon = lon * 1;
        camSnap(latToPitch(lat), longToYaw(lon));
        if (maxrange > 6000) {
          changeZoom('geo');
        } else {
          changeZoom('leo');
        }

        e.preventDefault();
      });

    })();

    function _socrates (row) {
      // SOCRATES Variables
      var socratesObjOne = []; // Array for tr containing CATNR1
      var socratesObjTwo = []; // Array for tr containing CATNR2

      /* SOCRATES.htm is a 20 row .pl script pulled from celestrak.com/cgi-bin/searchSOCRATES.pl
      If it ever becomes unavailable a similar, but less accurate (maybe?) cron job could be
      created using satCruncer.

      The variable row determines which set of objects on SOCRATES.htm we are using. First
      row is 0 and last one is 19. */
      if (row === -1 && socratesObjOne.length === 0 && socratesObjTwo.length === 0) { // Only generate the table if receiving the -1 argument for the first time
        $.get('/SOCRATES.htm', function (socratesHTM) { // Load SOCRATES.htm so we can use it instead of index.htm
          var tableRowOne = $("[name='CATNR1']", socratesHTM).closest('tr'); // Find the row(s) containing the hidden input named CATNR1
          var tableRowTwo = $("[name='CATNR2']", socratesHTM).closest('tr'); // Find the row(s) containing the hidden input named CATNR2
          tableRowOne.each(function (rowIndex, r) {
            var cols = [];
            $(this).find('td').each(function (colIndex, c) {
              cols.push(c.textContent);
            });
            socratesObjOne.push(cols);
          });
          tableRowTwo.each(function (rowIndex, r) {
            var cols = [];
            $(this).find('td').each(function (colIndex, c) {
              cols.push(c.textContent);
            });
            socratesObjTwo.push(cols);
          });
          // SOCRATES Menu
          var tbl = document.getElementById('socrates-table'); // Identify the table to update
          tbl.innerHTML = '';                                  // Clear the table from old object data
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

          for (var i = 0; i < 20; i++) {                       // 20 rows
            tr = tbl.insertRow();
            tr.setAttribute('class', 'socrates-object link');
            tr.setAttribute('hiddenrow', i);
            tdT = tr.insertCell();
            var socratesDate = socratesObjTwo[i][4].split(' '); // Date/time is on the second line 5th column
            var socratesTime = socratesDate[3].split(':'); // Split time from date for easier management
            var socratesTimeS = socratesTime[2].split('.'); // Split time from date for easier management
            tdT.appendChild(document.createTextNode(socratesDate[2] + ' ' + socratesDate[1] + ' ' + socratesDate[0] + ' - ' + _pad0(socratesTime[0], 2) + ':' +
            _pad0(socratesTime[1], 2) + ':' + _pad0(socratesTimeS[0], 2) + 'Z'));
            tdS1 = tr.insertCell();
            tdS1.appendChild(document.createTextNode(socratesObjOne[i][1]));
            tdS2 = tr.insertCell();
            tdS2.appendChild(document.createTextNode(socratesObjTwo[i][0]));
          }
        });
      }
      if (row !== -1) { // If an object was selected from the menu
        findFutureDate(socratesObjTwo); // Jump to the date/time of the collision

        $('#search').val(socratesObjOne[row][1] + ',' + socratesObjTwo[row][0]); // Fill in the serach box with the two objects
        searchBox.doSearch(socratesObjOne[row][1] + ',' + socratesObjTwo[row][0]); // Actually perform the search of the two objects
        settingsManager.socratesOnSatCruncher = satSet.getIdFromObjNum(socratesObjOne[row][1]);
      } // If a row was selected

      function findFutureDate (socratesObjTwo) {
        var socratesDate = socratesObjTwo[row][4].split(' '); // Date/time is on the second line 5th column
        var socratesTime = socratesDate[3].split(':'); // Split time from date for easier management

        var sYear = parseInt(socratesDate[0]); // UTC Year
        var sMon = MMMtoInt(socratesDate[1]); // UTC Month in MMM prior to converting
        var sDay = parseInt(socratesDate[2]); // UTC Day
        var sHour = parseInt(socratesTime[0]); // UTC Hour
        var sMin = parseInt(socratesTime[1]); // UTC Min
        var sSec = parseInt(socratesTime[2]); // UTC Sec - This is a decimal, but when we convert to int we drop those

        function MMMtoInt (month) {
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
        } // Convert MMM format to an int for Date() constructor

        var selectedDate = new Date(sYear, sMon, sDay, sHour, sMin, sSec); // New Date object of the future collision
        // Date object defaults to local time.
        selectedDate.setUTCDate(sDay); // Move to UTC day.
        selectedDate.setUTCHours(sHour); // Move to UTC Hour

        var today = new Date(); // Need to know today for offset calculation
        timeManager.propOffset = selectedDate - today; // Find the offset from today
        camSnapMode = false;
        satCruncher.postMessage({ // Tell satCruncher we have changed times for orbit calculations
          typ: 'offset',
          dat: (timeManager.propOffset).toString() + ' ' + (1.0).toString()
        });
        timeManager.propRealTime = Date.now(); // Reset realtime TODO: This might not be necessary...
        timeManager.propTime();
      } // Allows passing -1 argument to socrates function to skip these steps
    }
    function _bottomIconPress (evt) {
      var sat;
      if (settingsManager.isBottomIconsEnabled === false) { return; } // Exit if menu is disabled
      ga('send', 'event', 'Bottom Icon', $(this).context.id, 'Selected');
      switch ($(this).context.id) {
        case 'menu-info-overlay':
          if (!satellite.sensorSelected()) { // No Sensor Selected
            if (!$('#menu-info-overlay img:animated').length) {
              $('#menu-info-overlay img').effect('shake', {distance: 10});
            }
            break;
          }
          if (isInfoOverlayMenuOpen) {
            isInfoOverlayMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            _hideSideMenus();
            if ((nextPassArray.length === 0 || nextPassEarliestTime > timeManager.now ||
                new Date(nextPassEarliestTime * 1 + (1000 * 60 * 60 * 24)) < timeManager.now) ||
                isWatchlistChanged) {
              $('#loading-screen').fadeIn('slow', function () {
                  nextPassArray = [];
                  for (var x = 0; x < watchlistList.length; x++) {
                    nextPassArray.push(satSet.getSat(watchlistList[x]));
                  }
                  nextPassArray = satellite.nextpassList(nextPassArray);
                  nextPassArray.sort(function(a, b) {
                      return new Date(a.time) - new Date(b.time);
                  });
                  nextPassEarliestTime = timeManager.now;
                  lastOverlayUpdateTime = 0;
                _updateNextPassOverlay(true);
                $('#loading-screen').fadeOut();
                isWatchlistChanged = false;
              });
            } else {
              _updateNextPassOverlay(true);
            }
            $('#info-overlay-menu').fadeIn();
            $('#menu-info-overlay img').addClass('bmenu-item-selected');
            isInfoOverlayMenuOpen = true;
            break;
          }
        case 'menu-sensor-info': // No Keyboard Commands
          if (!satellite.sensorSelected()) { // No Sensor Selected
            if (!$('#menu-sensor-info img:animated').length) {
              $('#menu-sensor-info img').effect('shake', {distance: 10});
            }
            break;
          }
          if (isSensorInfoMenuOpen) {
            _hideSideMenus();
            isSensorInfoMenuOpen = false;
            break;
          } else {
            _hideSideMenus();
            satellite.getsensorinfo();
            $('#sensor-info-menu').fadeIn();
            isSensorInfoMenuOpen = true;
            $('#menu-sensor-info img').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-in-coverage': // B
          if (!satellite.sensorSelected()) { // No Sensor Selected
            if (!$('#menu-in-coverage img:animated').length) {
              $('#menu-in-coverage img').effect('shake', {distance: 10});
            }
            break;
          }
          if (settingsManager.isBottomMenuOpen) {
            $('#bottom-menu').fadeOut();
            $('#menu-in-coverage img').removeClass('bmenu-item-selected');
            settingsManager.isBottomMenuOpen = false;
            break;
          } else {
            $('#bottom-menu').fadeIn();
            $('#menu-in-coverage img').addClass('bmenu-item-selected');
            settingsManager.isBottomMenuOpen = true;
            break;
          }
          break;
        case 'menu-lookangles': // S
          if (isLookanglesMenuOpen) {
            isLookanglesMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            if (!satellite.sensorSelected() || selectedSat === -1) { // No Sensor or Satellite Selected
              if (!$('#menu-lookangles img:animated').length) {
                $('#menu-lookangles img').effect('shake', {distance: 10});
              }
              break;
            }
            _hideSideMenus();
            $('#lookangles-menu').fadeIn();
            isLookanglesMenuOpen = true;
            $('#menu-lookangles img').addClass('bmenu-item-selected');
            if (selectedSat !== -1) {
              sat = satSet.getSat(selectedSat);
              if (sat.static || sat.missile) {
                if (!$('#menu-lookangles img:animated').length) {
                  $('#menu-lookangles img').effect('shake', {distance: 10});
                }
                break;
              } else {
                $('#loading-screen').fadeIn('slow', function () {
                  satellite.getlookangles(sat, isLookanglesMenuOpen);
                  $('#loading-screen').fadeOut();
                });
              }
            }
            break;
          }
          break;
        case 'menu-watchlist': // S
          if (isWatchlistMenuOpen) {
            isWatchlistMenuOpen = false;
            $('#menu-watchlist img').removeClass('bmenu-item-selected');
            $('#search-holder').show();
            _hideSideMenus();
            break;
          } else {
            _hideSideMenus();
            $('#watchlist-menu').fadeIn();
            $('#search-holder').hide();
            _updateWatchlist();
            isWatchlistMenuOpen = true;
            $('#menu-watchlist img').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-lookanglesmultisite':
          if (isLookanglesMultiSiteMenuOpen) {
            isLookanglesMultiSiteMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            if (selectedSat === -1) { // No Satellite Selected
              if (!$('#menu-lookanglesmultisite img:animated').length) {
                $('#menu-lookanglesmultisite img').effect('shake', {distance: 10});
              }
              break;
            }
            _hideSideMenus();
            $('#lookanglesmultisite-menu').fadeIn();
            isLookanglesMultiSiteMenuOpen = true;
            $('#menu-lookanglesmultisite img').addClass('bmenu-item-selected');
            if (selectedSat !== -1) {
              $('#loading-screen').fadeIn('slow', function () {
                sat = satSet.getSat(selectedSat);
                satellite.getlookanglesMultiSite(sat, isLookanglesMultiSiteMenuOpen);
                $('#loading-screen').fadeOut();
              });
            }
            break;
          }
          break;
        case 'menu-find-sat': // F
          if (isFindByLooksMenuOpen) {
            isFindByLooksMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            _hideSideMenus();
            $('#findByLooks-menu').fadeIn();
            isFindByLooksMenuOpen = true;
            $('#menu-find-sat img').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-twitter': // T
          if (isTwitterMenuOpen) {
            isTwitterMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            _hideSideMenus();
            if ($('#twitter-menu').is(':empty')) {
              $('#twitter-menu').html('<a class="twitter-timeline" data-theme="dark" data-link-color="#2B7BB9" href="https://twitter.com/RedKosmonaut/lists/space-news">A Twitter List by RedKosmonaut</a> <script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>');
            }
            $('#twitter-menu').fadeIn();
            isTwitterMenuOpen = true;
            $('#menu-twitter img').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-weather': // W
          if (isWeatherMenuOpen) {
            isWeatherMenuOpen = false;
            _hideSideMenus();
            break;
          }
          if (!isWeatherMenuOpen && sensorManager.whichRadar !== '') {
            if (sensorManager.whichRadar === 'COD' || sensorManager.whichRadar === 'MIL') {
              $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/BOX_0.png');
            }
            if (sensorManager.whichRadar === 'EGL') {
              $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/EVX_0.png');
            }
            if (sensorManager.whichRadar === 'CLR') {
              $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/APD_0.png');
            }
            if (sensorManager.whichRadar === 'PAR') {
              $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/MVX_0.png');
            }
            if (sensorManager.whichRadar === 'BLE') {
              $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/DAX_0.png');
            }
            if (sensorManager.whichRadar === 'FYL') {
              $('#weather-image').attr('src', 'http://i.cdn.turner.com/cnn/.element/img/3.0/weather/maps/satuseurf.gif');
            }
            if (sensorManager.whichRadar === 'DGC') {
              $('#weather-image').attr('src', 'http://images.myforecast.com/images/cw/satellite/CentralAsia/CentralAsia.jpeg');
            }
            _hideSideMenus();
            $('#weather-menu').fadeIn();
            isWeatherMenuOpen = true;
            $('#menu-weather img').addClass('bmenu-item-selected');
            break;
          } else {
            if (!$('#menu-weather img:animated').length) {
              $('#menu-weather img').effect('shake', {distance: 10});
            }
          }
          break;
        case 'menu-map': // W
          if (settingsManager.isMapMenuOpen) {
            settingsManager.isMapMenuOpen = false;
            _hideSideMenus();
            break;
          }
          if (!settingsManager.isMapMenuOpen) {
            if (selectedSat === -1) { // No Satellite Selected
              if (!$('#menu-map img:animated').length) {
                $('#menu-map img').effect('shake', {distance: 10});
              }
              break;
            }
            _hideSideMenus();
            $('#map-menu').fadeIn();
            settingsManager.isMapMenuOpen = true;
            uiController.updateMap();
            var satData = satSet.getSat(selectedSat);
            $('#map-sat').tooltip({delay: 50, tooltip: satData.SCC_NUM, position: 'left'});
            $('#menu-map img').addClass('bmenu-item-selected');
            break;
          }
          break;
        // case 'menu-space-weather': // Q
        //   if (isSpaceWeatherMenuOpen) {
        //     isSpaceWeatherMenuOpen = false;
        //     _hideSideMenus();
        //     break;
        //   }
        //   $('#space-weather-image').attr('src', 'http://services.swpc.noaa.gov/images/animations/ovation-north/latest.png');
        //   _hideSideMenus();
        //   $('#space-weather-menu').fadeIn();
        //   isSpaceWeatherMenuOpen = true;
        //   $('#menu-space-weather img').addClass('bmenu-item-selected');
        //   break;
        case 'menu-launches': // L
          if (isLaunchMenuOpen) {
            isLaunchMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            _hideSideMenus();
            $.colorbox({href: 'http://space.skyrocket.de/doc_chr/lau2017.htm', iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
            isLaunchMenuOpen = true;
            $('#menu-launches img').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-about': // No Keyboard Shortcut
          if (isAboutSelected) {
            isAboutSelected = false;
            _hideSideMenus();
            break;
          } else {
            _hideSideMenus();
            $('#about-menu').fadeIn();
            isAboutSelected = true;
            $('#menu-about img').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-space-stations': // No Keyboard Shortcut
          if (isMilSatSelected) {
            $('#search').val('');
            searchBox.hideResults();
            isMilSatSelected = false;
            $('#menu-space-stations img').removeClass('bmenu-item-selected');
            break;
          } else {
            $('#search').val('40420,41394,32783,35943,36582,40353,40555,41032,38010,38008,38007,38009,37806,41121,41579,39030,39234,28492,36124,39194,36095,40358,40258,37212,37398,38995,40296,40900,39650,27434,31601,36608,28380,28521,36519,39177,40699,34264,36358,39375,38248,34807,28908,32954,32955,32956,35498,35500,37152,37154,38733,39057,39058,39059,39483,39484,39485,39761,39762,39763,40920,40921,40922,39765,29658,31797,32283,32750,33244,39208,26694,40614,20776,25639,26695,30794,32294,33055,39034,28946,33751,33752,27056,27057,27464,27465,27868,27869,28419,28420,28885,29273,32476,31792,36834,37165,37875,37941,38257,38354,39011,39012,39013,39239,39240,39241,39363,39410,40109,40111,40143,40275,40305,40310,40338,40339,40340,40362,40878,41026,41038,41473,28470,37804,37234,29398,40110,39209,39210,36596');
            searchBox.doSearch('40420,41394,32783,35943,36582,40353,40555,41032,38010,38008,38007,38009,37806,41121,41579,39030,39234,28492,36124,39194,36095,40358,40258,37212,37398,38995,40296,40900,39650,27434,31601,36608,28380,28521,36519,39177,40699,34264,36358,39375,38248,34807,28908,32954,32955,32956,35498,35500,37152,37154,38733,39057,39058,39059,39483,39484,39485,39761,39762,39763,40920,40921,40922,39765,29658,31797,32283,32750,33244,39208,26694,40614,20776,25639,26695,30794,32294,33055,39034,28946,33751,33752,27056,27057,27464,27465,27868,27869,28419,28420,28885,29273,32476,31792,36834,37165,37875,37941,38257,38354,39011,39012,39013,39239,39240,39241,39363,39410,40109,40111,40143,40275,40305,40310,40338,40339,40340,40362,40878,41026,41038,41473,28470,37804,37234,29398,40110,39209,39210,36596');
            isMilSatSelected = true;
            $('#menu-about img').removeClass('bmenu-item-selected');
            $('#menu-space-stations img').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-satellite-collision': // No Keyboard Shortcut
          if (isSocratesMenuOpen) {
            isSocratesMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            _hideSideMenus();
            $('#socrates-menu').fadeIn();
            isSocratesMenuOpen = true;
            _socrates(-1);
            $('#menu-satellite-collision img').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-settings': // T
          if (isSettingsMenuOpen) {
            isSettingsMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            _hideSideMenus();
            $('#settings-menu').fadeIn();
            isSettingsMenuOpen = true;
            $('#menu-settings img').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-editSat':
          if (isEditSatMenuOpen) {
            isEditSatMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            if (selectedSat !== -1) {
              _hideSideMenus();
              $('#editSat-menu').fadeIn();
              $('#menu-editSat img').addClass('bmenu-item-selected');
              isEditSatMenuOpen = true;

              sat = satSet.getSat(selectedSat);
              $('#es-scc').val(sat.SCC_NUM);

              var inc = (sat.inclination * RAD2DEG).toPrecision(7);
              inc = inc.split('.');
              inc[0] = inc[0].substr(-3, 3);
              inc[1] = inc[1].substr(0, 4);
              inc = (inc[0] + '.' + inc[1]).toString();

              $('#es-inc').val(_padEmpty(inc, 8));
              $('#es-year').val(sat.TLE1.substr(18, 2));
              $('#es-day').val(sat.TLE1.substr(20, 12));
              $('#es-meanmo').val(sat.TLE2.substr(52, 11));

              var rasc = (sat.raan * RAD2DEG).toPrecision(7);
              rasc = rasc.split('.');
              rasc[0] = rasc[0].substr(-3, 3);
              rasc[1] = rasc[1].substr(0, 4);
              rasc = (rasc[0] + '.' + rasc[1]).toString();

              $('#es-rasc').val(_padEmpty(rasc, 8));
              $('#es-ecen').val(sat.eccentricity.toPrecision(7).substr(2, 7));

              var argPe = (sat.argPe * RAD2DEG).toPrecision(7);
              argPe = argPe.split('.');
              argPe[0] = argPe[0].substr(-3, 3);
              argPe[1] = argPe[1].substr(0, 4);
              argPe = (argPe[0] + '.' + argPe[1]).toString();

              $('#es-argPe').val(_padEmpty(argPe, 8));
              $('#es-meana').val(sat.TLE2.substr(44 - 1, 7 + 1));
              // $('#es-rasc').val(sat.TLE2.substr(18 - 1, 7 + 1).toString());
            } else {
              if (!$('#menu-editSat img:animated').length) {
                $('#menu-editSat img').effect('shake', {distance: 10});
              }
            }
          }
          break;
        case 'menu-newLaunch':
          if (isNewLaunchMenuOpen) {
            isNewLaunchMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            // TODO: NEW LAUNCH
            if (selectedSat !== -1) {
              _hideSideMenus();
              $('#newLaunch-menu').fadeIn();
              $('#menu-newLaunch img').addClass('bmenu-item-selected');
              isNewLaunchMenuOpen = true;

              sat = satSet.getSat(selectedSat);
              $('#nl-scc').val(sat.SCC_NUM);
              $('#nl-inc').val((sat.inclination * RAD2DEG).toPrecision(2));
            } else {
              if (!$('#menu-newLaunch img:animated').length) {
                $('#menu-newLaunch img').effect('shake', {distance: 10});
              }
            }
            break;
          }
          break;
        case 'menu-customSensor': // T
          if (isCustomSensorMenuOpen) {
            isCustomSensorMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            _hideSideMenus();

            // TODO: Requires https on chrome, but I will come back to this idea another time
            // if (navigator.geolocation) {
            //   navigator.geolocation.getCurrentPosition(function (position) {
            //     console.log('Latitude: ' + position.coords.latitude);
            //     console.log('Longitude: ' + position.coords.longitude);
            //   });
            // }

            $('#customSensor-menu').fadeIn();
            isCustomSensorMenuOpen = true;
            $('#menu-customSensor img').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-missile':
          if (isMissileMenuOpen) {
            isMissileMenuOpen = false;
            _hideSideMenus();
            break;
          } else {
            // TODO: NEW LAUNCH
            _hideSideMenus();
            $('#missile-menu').fadeIn();
            $('#menu-missile img').addClass('bmenu-item-selected');
            isMissileMenuOpen = true;
            break;
          }
          break;
        case 'menu-planetarium':
          if (isPlanetariumView) {
            isPlanetariumView = false;
            _hideSideMenus();
            cameraType.current = cameraType.DEFAULT; // Back to normal Camera Mode
            break;
          } else {
            _hideSideMenus();
            if (satellite.sensorSelected()) {
              cameraType.current = cameraType.PLANETARIUM; // Activate Planetarium Camera Mode
            }
            $('#menu-planetarium img').addClass('bmenu-item-selected');
            isPlanetariumView = true;
            break;
          }
          break;
      }
      function _hideSideMenus () {
        // Close any open colorboxes
        $.colorbox.close();

        // Hide all side menus
        $('#info-overlay-menu').fadeOut();
        $('#sensor-info-menu').fadeOut();
        $('#watchlist-menu').fadeOut();
        $('#lookangles-menu').fadeOut();
        $('#lookanglesmultisite-menu').fadeOut();
        $('#findByLooks-menu').fadeOut();
        $('#twitter-menu').fadeOut();
        $('#weather-menu').fadeOut();
        $('#map-menu').fadeOut();
        // $('#space-weather-menu').fadeOut();
        $('#socrates-menu').fadeOut();
        $('#settings-menu').fadeOut();
        $('#editSat-menu').fadeOut();
        $('#newLaunch-menu').fadeOut();
        $('#missile-menu').fadeOut();
        $('#customSensor-menu').fadeOut();
        $('#about-menu').fadeOut();

        // Remove red color from all menu icons
        $('#menu-info-overlay img').removeClass('bmenu-item-selected');
        $('#menu-sensor-info img').removeClass('bmenu-item-selected');
        $('#menu-watchlist img').removeClass('bmenu-item-selected');
        $('#menu-lookangles img').removeClass('bmenu-item-selected');
        $('#menu-lookanglesmultisite img').removeClass('bmenu-item-selected');
        $('#menu-launches img').removeClass('bmenu-item-selected');
        $('#menu-find-sat img').removeClass('bmenu-item-selected');
        $('#menu-twitter img').removeClass('bmenu-item-selected');
        $('#menu-weather img').removeClass('bmenu-item-selected');
        $('#menu-map img').removeClass('bmenu-item-selected');
        // $('#menu-space-weather img').removeClass('bmenu-item-selected');
        $('#menu-satellite-collision img').removeClass('bmenu-item-selected');
        $('#menu-settings img').removeClass('bmenu-item-selected');
        $('#menu-editSat img').removeClass('bmenu-item-selected');
        $('#menu-newLaunch img').removeClass('bmenu-item-selected');
        $('#menu-missile img').removeClass('bmenu-item-selected');
        $('#menu-customSensor img').removeClass('bmenu-item-selected');
        $('#menu-about img').removeClass('bmenu-item-selected');
        $('#menu-planetarium img').removeClass('bmenu-item-selected');

        // Unflag all open menu variables
        isInfoOverlayMenuOpen = false;
        isSensorInfoMenuOpen = false;
        isWatchlistMenuOpen = false;
        isLaunchMenuOpen = false;
        isTwitterMenuOpen = false;
        isFindByLooksMenuOpen = false;
        isWeatherMenuOpen = false;
        settingsManager.isMapMenuOpen = false;
        // isSpaceWeatherMenuOpen = false;
        isLookanglesMenuOpen = false;
        isLookanglesMultiSiteMenuOpen = false;
        isSocratesMenuOpen = false;
        isSettingsMenuOpen = false;
        isEditSatMenuOpen = false;
        isNewLaunchMenuOpen = false;
        isMissileMenuOpen = false;
        isCustomSensorMenuOpen = false;
        isAboutSelected = false;
        isPlanetariumView = false;
      }
    }
    function _updateWatchlist () {
      if (!watchlistList) return;
      isWatchlistChanged = true;
      var watchlistString = '';
      var watchlistListHTML = '';
      for (var i = 0; i < watchlistList.length; i++) {
        var sat = satSet.getSat(watchlistList[i]);
        if (sat == null) {
          watchlistList.splice(i, 1);
          continue;
        }
        watchlistListHTML += '<div class="row">' +
          '<div class="col s3 m3 l3">' + sat.SCC_NUM + '</div>' +
          '<div class="col s7 m7 l7">' + sat.ON + '</div>' +
          '<div class="col s2 m2 l2 center-align remove-icon"><img class="watchlist-remove" data-sat-id="' + sat.id + '" src="images/remove.png"></img></div>' +
        '</div>';
      }
      $('#watchlist-list').html(watchlistListHTML);
      for (i = 0; i < watchlistList.length; i++) { // No duplicates
        watchlistString += satSet.getSat(watchlistList[i]).SCC_NUM;
        if (i !== watchlistList.length - 1) watchlistString += ',';
      }
      $('#search').val(watchlistString);
      searchBox.doSearch(watchlistString);
    }
    function _keyUpHandler (evt) {
      // console.log(Number(evt.keyCode));
      if (Number(evt.keyCode) === 65 || Number(evt.keyCode) === 68) {
        FPSSideSpeed = 0;
      }
      if (Number(evt.keyCode) === 83 || Number(evt.keyCode) === 87) {
        FPSForwardSpeed = 0;
      }
      if (Number(evt.keyCode) === 69 || Number(evt.keyCode) === 81) {
        FPSYawRate = 0;
      }
      if (Number(evt.keyCode) === 16) {
        FPSRun = 1;
      }
    }
    function _keyDownHandler (evt) {
      if (Number(evt.keyCode) === 16) {
        if (cameraType.current === cameraType.FPS) {
          FPSRun = 3;
        }
      }
    }
    function _keyHandler (evt) {
      // console.log(Number(evt.charCode));
      switch (Number(evt.charCode)) {
        case 87: // W
        case 119: // w
          if (cameraType.current === cameraType.FPS) {
            FPSForwardSpeed = 10;
          }
          break;
        case 65: // A
        case 97: // a
          if (cameraType.current === cameraType.FPS) {
            FPSSideSpeed = -10;
          }
          break;
        case 83: // S
        case 115: // s
          if (cameraType.current === cameraType.FPS) {
            FPSForwardSpeed = -10;
          }
          break;
        case 68: // D
        case 100: // d
          if (cameraType.current === cameraType.FPS) {
            FPSSideSpeed = 10;
          }
          break;
        case 81: // Q
        case 113: // q
          if (cameraType.current === cameraType.FPS) {
            FPSYawRate = -0.1;
          }
          break;
        case 69: // E
        case 101: // e
          if (cameraType.current === cameraType.FPS) {
            FPSYawRate = 0.1;
          }
          break;
      }

      switch (Number(evt.charCode)) {
        case 114: // r
          rotateTheEarth = !rotateTheEarth;
          // console.log('toggled rotation');
          break;
        case 99: // c
          cameraType.current += 1;
          if (cameraType.current === cameraType.PLANETARIUM && !satellite.sensorSelected()) {
            cameraType.current = cameraType.SATELLITE;
          }

          if (cameraType.current === cameraType.SATELLITE && selectedSat === -1) {
            cameraType.current = 5; // 5 is a placeholder to reset camera type
          }

          if (cameraType.current === 5) { // 5 is a placeholder to reset camera type
            cameraType.current = 0;
            FPSPitch = 0;
            FPSYaw = 0;
            FPSxPos = 0;
            FPSyPos = 25000;
            FPSzPos = 0;
          }

          switch (cameraType.current) {
            case cameraType.DEFAULT:
              $('#camera-status-box').html('Earth Centered Camera Mode');
              break;
            case cameraType.OFFSET:
              $('#camera-status-box').html('Offset Camera Mode');
              break;
            case cameraType.FPS:
              $('#camera-status-box').html('Free Camera Mode');
              break;
            case cameraType.PLANETARIUM:
              $('#camera-status-box').html('Planetarium Camera Mode');
              break;
            case cameraType.SATELLITE:
              $('#camera-status-box').html('Satellite Camera Mode');
              break;
          }
          $('#camera-status-box').show();
          setTimeout(function () {
            $('#camera-status-box').hide();
          }, 3000);
          break;
        case 33: // !
          timeManager.propOffset = 0; // Reset to Current Time
          settingsManager.isPropRateChange = true;
          break;
        case 60: // <
          timeManager.propOffset -= 1000 * 60 * 60 * 24 * 365.25; // Move back a year
          settingsManager.isPropRateChange = true;
          $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.propRealTime + timeManager.propOffset));
          break;
        case 62: // >
          timeManager.propOffset += 1000 * 60 * 60 * 24 * 365.25; // Move forward a year
          settingsManager.isPropRateChange = true;
          $('#datetime-input-tb').datepicker('setDate', new Date(timeManager.propRealTime + timeManager.propOffset));
          break;
        case 48: // 0
          timeManager.setPropRateZero();
          timeManager.propOffset = timeManager.getPropOffset();
          settingsManager.isPropRateChange = true;
          break;
        case 43: // +
        case 61: // =
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
          timeManager.propOffset = timeManager.getPropOffset();
          settingsManager.isPropRateChange = true;
          break;
        case 45: // -
        case 95: // _
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

          timeManager.propOffset = timeManager.getPropOffset();
          settingsManager.isPropRateChange = true;
          break;
        case 49: // 1
          timeManager.propRate = 1.0;
          timeManager.propOffset = timeManager.getPropOffset();
          settingsManager.isPropRateChange = true;
          break;
      }

      if (settingsManager.isPropRateChange) {
        satCruncher.postMessage({
          typ: 'offset',
          dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString()
        });
        timeManager.propRealTime = Date.now();
        timeManager.propTime();
      }
    }
    function browserUnsupported () {
      $('#canvas-holder').hide();
      $('#no-webgl').css('display', 'block');
    }
    function _clk (lk, lk2) {
      if (lk == 'undefined') return false;
      if (settingsManager.lkVerify > lk) return false;
      var olcv = 0;
      for (x = 0; x < settingsManager.offlineLocation.length; x++) {
        olcv += (settingsManager.offlineLocation.charCodeAt(x) * 41690);
      }
      if (olcv === lk2) return true;
      return false;
    }
  });

  function _padEmpty (num, size) {
    var s = '   ' + num;
    return s.substr(s.length - size);
  }
  function _pad0 (str, max) {
    return str.length < max ? _pad0('0' + str, max) : str;
  }

  // Callbacks from DrawLoop
  var infoOverlayDOM = [];
  var satNumberOverlay = [];
  function _showSatTest () {
    // if (timeManager.now > (lastSatUpdateTime * 1 + 10000)) {
    //   for (var i = 0; i < satSet.getSatData().length; i++) {
    //     satNumberOverlay[i] = satSet.getScreenCoords(i, pMatrix, camMatrix);
    //     if (satNumberOverlay[i] !== 1) console.log(satNumberOverlay[i]);
    //     lastSatUpdateTime = timeManager.now;
    //   }
    // }

  }

  function _updateNextPassOverlay (isForceUpdate) {
    if (nextPassArray.length <= 0 && !isInfoOverlayMenuOpen) return;

    // FIXME This should auto update the overlay when the time changes outside the original search window

    // Update once every 10 seconds
    if (((timeManager.now > (lastOverlayUpdateTime * 1 + 10000) &&
                           selectedSat === -1) &&
                           !isDragging && zoomLevel === zoomTarget) || isForceUpdate) {
      var propTime = timeManager.propTime();
      infoOverlayDOM = [];
      infoOverlayDOM.push('<div>');
      for (var s = 0; s < nextPassArray.length; s++) {
        var satInView = satSet.getSat(satSet.getIdFromObjNum(nextPassArray[s].SCC_NUM)).inview;
        // If old time and not in view, skip it
        if (nextPassArray[s].time - propTime < -1000 * 60 * 5 && !satInView) continue;

        // Get the pass Time
        var time = timeManager.dateFormat(nextPassArray[s].time, 'isoTime', true);

        // Yellow - In View and Time to Next Pass is +/- 30 minutes
        if ((satInView && (nextPassArray[s].time - propTime < 1000 * 60 * 30) && (propTime - nextPassArray[s].time < 1000 * 60 * 30))) {
          infoOverlayDOM.push('<div class="row">' +
                        '<h5 class="center-align watchlist-object link" style="color: yellow">' + nextPassArray[s].SCC_NUM + ': ' + time + '</h5>' +
                        '</div>');
          continue;
        }
        // Blue - Time to Next Pass is between 10 minutes before and 20 minutes after the current time
        // This makes recent objects stay at the top of the list in blue
        if ((nextPassArray[s].time - propTime < 1000 * 60 * 10) && (propTime - nextPassArray[s].time < 1000 * 60 * 20)) {
          infoOverlayDOM.push('<div class="row">' +
                        '<h5 class="center-align watchlist-object link" style="color: blue">' + nextPassArray[s].SCC_NUM + ': ' + time + '</h5>' +
                        '</div>');
          continue;
        }
        // White - Any future pass not fitting the above requirements
        if (nextPassArray[s].time - propTime > 0) {
          infoOverlayDOM.push('<div class="row">' +
                      '<h5 class="center-align watchlist-object link" style="color: white">' + nextPassArray[s].SCC_NUM + ': ' + time + '</h5>' +
                      '</div>');
        }
      }
      infoOverlayDOM.push('</div>');
      document.getElementById('info-overlay-content').innerHTML = infoOverlayDOM.join('');
      lastOverlayUpdateTime = timeManager.now;
    }
  }
  function _checkWatchlist () {
    if (watchlistList.length <= 0) return;
    for (var i = 0; i < watchlistList.length; i++) {
      var sat = satSet.getSat(watchlistList[i]);
      if (sat.inview === 1 && watchlistInViewList[i] === false) { // Is inview and wasn't previously
        watchlistInViewList[i] = true;
        orbitDisplay.addInViewOrbit(watchlistList[i]);
      }
      if (sat.inview === 0 && watchlistInViewList[i] === true) { // Isn't inview and was previously
        watchlistInViewList[i] = false;
        orbitDisplay.removeInViewOrbit(watchlistList[i]);
      }
    }
    for (i = 0; i < watchlistInViewList.length; i++) {
      if (watchlistInViewList[i] === true) {
        // Someone is still in view on the watchlist
        settingsManager.themes.redTheme();
        return;
      }
    }
    // None of the sats on the watchlist are in view
    settingsManager.themes.blueTheme();
  }
  function _updateSelectBox () {
    // Don't update if no object is selected
    if (selectedSat === -1) return;

    var sat = satSet.getSat(selectedSat);

    // Don't bring up the update box for static dots
    if (sat.static) return;

    // TODO: Include updates when satellite edited regardless of time.
    if (timeManager.now > (lastBoxUpdateTime * 1 + updateInterval)) {
      if (!sat.missile) {
        satellite.getTEARR(sat);
      } else {
        getMissileTEARR(sat);
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
      var jday = 'JDAY: ' + timeManager.getDayOfYear(timeManager.propTime());
      $('#jday').html(jday);

      if (settingsManager.isMapMenuOpen && timeManager.now > settingsManager.lastMapUpdateTime + 30000) {
        uiController.updateMap();
        settingsManager.lastMapUpdateTime = timeManager.now;
      }

      $('#sat-altitude').html(satellite.currentTEARR.alt.toFixed(2) + ' km');
      $('#sat-velocity').html(sat.velocity.toFixed(2) + ' km/s');
      if (satellite.currentTEARR.inview) {
        $('#sat-azimuth').html(satellite.currentTEARR.azimuth.toFixed(0) + '°'); // Convert to Degrees
        $('#sat-elevation').html(satellite.currentTEARR.elevation.toFixed(1) + '°');
        $('#sat-range').html(satellite.currentTEARR.range.toFixed(2) + ' km');
      } else {
        $('#sat-azimuth').html('Out of Bounds');
        $('#sat-azimuth').prop('title', 'Azimuth: ' + satellite.currentTEARR.azimuth.toFixed(0) + '°');
        $('#sat-elevation').html('Out of Bounds');
        $('#sat-elevation').prop('title', 'Elevation: ' + satellite.currentTEARR.elevation.toFixed(1) + '°');
        $('#sat-range').html('Out of Bounds');
        $('#sat-range').prop('title', 'Range: ' + satellite.currentTEARR.range.toFixed(2) + ' km');
      }

      if (satellite.sensorSelected()) {
        if (selectedSat !== lastSelectedSat && !sat.missile) {
          $('#sat-nextpass').html(satellite.nextpass(sat));
        }
        lastSelectedSat = selectedSat;
      } else {
        $('#sat-nextpass').html('Unavailable');
      }

      lastBoxUpdateTime = timeManager.now;
    }
  }
  function _mobileScreenControls () {
    if (touchHoldButton === '') return;
    if (touchHoldButton === 'zoom-in') {
      zoomTarget -= 0.0025;
      if (zoomTarget < 0) zoomTarget = 0;
    }
    if (touchHoldButton === 'zoom-out') {
      zoomTarget += 0.0025;
      if (zoomTarget > 1) zoomTarget = 1;
    }
    if (touchHoldButton === 'move-up') {
      camPitchSpeed += 0.000075 * zoomLevel;
      if (camPitch > Math.PI / 2) camPitchSpeed = 0;
    }
    if (touchHoldButton === 'move-down') {
      camPitchSpeed -= 0.000075 * zoomLevel;
      if (camPitch < -Math.PI / 2) camPitchSpeed = 0;
    }
    if (touchHoldButton === 'move-left') {
      camYawSpeed -= 0.0002 * zoomLevel;
    }
    if (touchHoldButton === 'move-right') {
      camYawSpeed += 0.0002 * zoomLevel;
    }
  }

  _offlineMessage = function () {
    $('#loader-text').html('Please Contact Theodore Kruczek To Renew Your License <br> theodore.kruczek@gmail.com');
    ga('send', 'event', 'Expired Offline Software', settingsManager.offlineLocation, 'Expired');
  };

  uiController.updateMap = function () {
    if (selectedSat === -1) return;
    if (!settingsManager.isMapMenuOpen) return;
    var sat = satSet.getSat(selectedSat);
    var map;
    satellite.getTEARR(sat);
    map = mapManager.braun({lon: satellite.degreesLong(satellite.currentTEARR.lon), lat: satellite.degreesLat(satellite.currentTEARR.lat)}, {meridian: 0, latLimit: 90});
    map.x = map.x * settingsManager.mapWidth - 10;
    map.y = map.y / 0.6366197723675813 * settingsManager.mapHeight - 10;
    $('#map-sat').attr('style', 'left:' + map.x + 'px;top:' + map.y + 'px;'); // Set to size of the map image (800x600)
    if (satellite.sensorSelected()) {
      map = mapManager.braun({lon: satellite.currentSensor.long, lat: satellite.currentSensor.lat}, {meridian: 0, latLimit: 90});
      map.x = map.x * settingsManager.mapWidth - 10;
      map.y = map.y / 0.6366197723675813 * settingsManager.mapHeight - 10;
      $('#map-sensor').attr('style', 'left:' + map.x + 'px;top:' + map.y + 'px;z-index:11;'); // Set to size of the map image (800x600)
    }
    for (var i = 1; i <= 50; i++) {
      map = mapManager.braun({lon: satellite.map(sat, i).lon, lat: satellite.map(sat, i).lat}, {meridian: 0, latLimit: 90});
      map.x = map.x * settingsManager.mapWidth - 3.5;
      map.y = map.y / 0.6366197723675813 * settingsManager.mapHeight - 3.5;
      if (map.y > settingsManager.mapHeight / 2) {
        $('#map-look' + i).tooltip({delay: 50, tooltip: satellite.map(sat, i).time, position: 'top'});
      } else {
        $('#map-look' + i).tooltip({delay: 50, tooltip: satellite.map(sat, i).time, position: 'bottom'});
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
  window.uiController = uiController;
})();
