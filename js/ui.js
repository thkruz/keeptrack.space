/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2019, Theodore Kruczek
(c) 2015-2016, James Yoder

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
    missileManager.MassRaidPre
    saveAs
    Blob
    FileReader
    missileManager.UsaICBM
    missileManager.RussianICBM
    missileManager.NorthKoreanBM
    missileManager.ChinaICBM
    Missile
    missileManager.missilesInUse
    missileManager.lastMissileError
    settingsManager
*/
var canvasDOM = $('#canvas');
var bodyDOM = $('#bodyDOM');
var dropdownInstance;
var mapImageDOM = $('#map-image');
var mapMenuDOM = $('#map-menu');
var satHoverBoxDOM = $('#sat-hoverbox');
var rightBtnMenuDOM = $('#right-btn-menu');
var viewInfoRMB = $('#view-info-rmb');
var clearScreenRMB = $('#clear-screen-rmb');
var satHoverBoxNode1 = document.getElementById('sat-hoverbox1');
var satHoverBoxNode2 = document.getElementById('sat-hoverbox2');
var satHoverBoxNode3 = document.getElementById('sat-hoverbox3');
var lkpassed = false;
var isDayNightToggle = false;

(function () {
  var lastBoxUpdateTime = 0;
  var lastOverlayUpdateTime = 0;
  var lastSatUpdateTime = 0;

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
  var isMilSatSelected = false;
  var isSocratesMenuOpen = false;
  var isSettingsMenuOpen = false;

  var watchlistList = [];
  var watchlistInViewList = [];
  var nextPassArray = [];
  var nextPassEarliestTime;
  var isWatchlistChanged = false;

  var updateInterval = 1000;
  var speedModifier = 1;

  var uiController = {};

  var touchHoldButton = '';
  $(document).ready(function () { // Code Once index.htm is loaded
    mobile.checkMobileMode();
    if (settingsManager.offline) updateInterval = 250;
    (function _licenseCheck () {
      if (typeof satel === 'undefined') satel = null;
      if (settingsManager.offline && !_clk(satel, olia)) {
        _offlineMessage();
        throw new Error('Please Contact Theodore Kruczek To Renew Your License <br> theodore.kruczek@gmail.com');
      } else {
        // ga('send', 'event', 'Offline Software', settingsManager.offlineLocation, 'Licensed');
      }
      uiController.resize2DMap();
    })();
    (function _httpsCheck () {
        if (location.protocol !== 'https:') {
          $('#cs-geolocation').hide();
          $('#geolocation-btn').hide();
        }
    })();
    (function _resizeWindow () {
      var resizing = false;
      $(window).resize(function () {
        uiController.resize2DMap();
        mobile.checkMobileMode();
        if (!resizing) {
          window.setTimeout(function () {
            resizing = false;
            webGlInit();
          }, 500);
        }
        resizing = true;
      });
    })();

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
      $('head').append('<link rel="stylesheet" type="text/css" href="css/style.css?v=' + settingsManager.versionNumber + '"">');

      // Load ALl The Images Now
      $('img').each(function () {
        $(this).attr('src', $(this).attr('delayedsrc'));
      });

      // Initialize Navigation Menu
      $('.dropdown-button').dropdown();
      $('.tooltipped').tooltip({delay: 50});

      // Initialize Materialize Select Menus
      M.AutoInit();
      dropdownInstance = M.Dropdown.getInstance($('.dropdown-trigger'));

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
          // $('#datetime-text').fadeIn();
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
          $('#menu-launches').removeClass('bmenu-item-selected');
        }
      });
    })();
    (function _canvasController () {
      var latLon;
      canvasDOM.on('touchmove', function (evt) {
        evt.preventDefault();
        if (isPinching) {
          var currentPinchDistance = Math.hypot(
            evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX,
            evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY);
          deltaPinchDistance = ((startPinchDistance - currentPinchDistance) / maxPinchSize);
          zoomTarget += deltaPinchDistance * (settingsManager.cameraMovementSpeed + 0.006);
          zoomTarget = Math.min(Math.max(zoomTarget, 0), 1); // Force between 0 and 1
        } else { // Dont Move While Zooming
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
        }
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

        if (delta < 0) {
          isZoomIn = true;
        } else {
          isZoomIn = false;
        }

        zoomTarget += delta / 100 / 50 / speedModifier; // delta is +/- 100
        zoomTarget = Math.min(Math.max(zoomTarget, 0), 1); // Force between 0 and 1
        rotateTheEarth = false;
        camZoomSnappedOnSat = false;

        if (cameraType.current === cameraType.PLANETARIUM || cameraType.current === cameraType.FPS || cameraType.current === cameraType.SATELLITE) {
          settingsManager.fieldOfView += delta * 0.0002;
          if (settingsManager.fieldOfView > settingsManager.fieldOfViewMax) settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
          if (settingsManager.fieldOfView < settingsManager.fieldOfViewMin) settingsManager.fieldOfView = settingsManager.fieldOfViewMin;
          webGlInit();
        }
      });
      canvasDOM.click(function (evt) {
        rightBtnMenuDOM.hide();
        if ($('#colorbox').css('display') === 'block') {
          $.colorbox.close(); // Close colorbox if it was open
        }
      });
      canvasDOM.mousedown(function (evt) {
        if (speedModifier === 1) {
          settingsManager.cameraMovementSpeed = 0.003;
          settingsManager.cameraMovementSpeedMin = 0.005;
        }

        dragPoint = getEarthScreenPoint(mouseX, mouseY);
        latLon = satellite.xyz2latlon(dragPoint[0], dragPoint[1], dragPoint[2]);
        screenDragPoint = [mouseX, mouseY];
        dragStartPitch = camPitch;
        dragStartYaw = camYaw;
        // debugLine.set(dragPoint, getCamPos());
        isDragging = true;
        camSnapMode = false;
        rotateTheEarth = false;
        rightBtnMenuDOM.hide();
      });
      canvasDOM.on('touchstart', function (evt) {
        settingsManager.cameraMovementSpeed = 0.0001;
        settingsManager.cameraMovementSpeedMin = 0.0001;
        if (evt.originalEvent.touches.length > 1) { // Two Finger Touch
            isPinching = true;
            startPinchDistance = Math.hypot(
              evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX,
              evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY);
            // _pinchStart(evt);
        } else { // Single Finger Touch
          mouseX = evt.originalEvent.touches[0].clientX;
          mouseY = evt.originalEvent.touches[0].clientY;
          mouseSat = getSatIdFromCoord(mouseX, mouseY);
          settingsManager.cameraMovementSpeed = Math.max(0.005 * zoomLevel, settingsManager.cameraMovementSpeedMin);
          screenDragPoint = [mouseX, mouseY];
          // dragPoint = getEarthScreenPoint(x, y);
          dragPoint = screenDragPoint; // NOTE: Ignore the earth on mobile
          dragStartPitch = camPitch;
          dragStartYaw = camYaw;
          // debugLine.set(dragPoint, getCamPos());
          isDragging = true;
          // if ($(document).width() <= 1000) {
          //   isDragging = false;
          // }
          camSnapMode = false;
          rotateTheEarth = false;
        }
      });
      canvasDOM.mouseup(function (evt) {
        var numMenuItems = 1;
        if (!dragHasMoved) {
          var clickedSat = mouseSat;
          if (evt.button === 0) { // Left Mouse Button Clicked
            if (cameraType.current === cameraType.SATELLITE) {
              if (clickedSat !== -1 && !satSet.getSatExtraOnly(clickedSat).static) { selectSat(clickedSat); }
            } else {
              selectSat(clickedSat);
            }
          }
          if (evt.button === 2) { // Right Mouse Button Clicked
            if (mouseSat !== -1) {
              $('#edit-sat-rmb').show();
              numMenuItems++;
            } else {
              $('#edit-sat-rmb').hide();
            }

            // Is this the Earth?
            if (isNaN(latLon.latitude) || isNaN(latLon.longitude)) {
              $('#view-info-rmb').hide();
              $('#create-sensor-rmb').hide();
            } else {
              $('#view-info-rmb').show();
              numMenuItems++;
              $('#create-sensor-rmb').show();
              numMenuItems++;
            }


            rightBtnMenuDOM.show();
            // NOTE: Need to be adjusted if number of menus change
            var offsetX = (mouseX < (canvasDOM.innerWidth() / 2)) ? 0 : -100;
            var offsetY = (mouseY < (canvasDOM.innerHeight() / 2)) ? 0 : (numMenuItems * -50);
            rightBtnMenuDOM.css({
              display: 'block',
              'text-align': 'center',
              position: 'absolute',
              left: mouseX + offsetX,
              top: mouseY + offsetY
            });
          }
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
        if (isPinching) {
            // pinchEnd(e);
            isPinching = false;
        }
        mouseY = 0;
        mouseX = 0;
        dragHasMoved = false;
        isDragging = false;
        rotateTheEarth = false;
      });

      rightBtnMenuDOM.click(function (e) {
        switch (e.target.innerText) {
          case 'View Info':
            M.toast({html: 'Lat: ' + latLon.latitude + ' Lon: ' + latLon.longitude});
          break;
          case 'Edit Satellite':
            selectSat(mouseSat);
            if (!isEditSatMenuOpen) {
              _bottomIconPress({currentTarget: {id: 'menu-editSat'}});
            }
          break;
          case 'Create Sensor Here':
            if (!isCustomSensorMenuOpen) {
              _bottomIconPress({currentTarget: {id: 'menu-customSensor'}});
            }
            $('#cs-lat').val(latLon.latitude);
            $('#cs-lon').val(latLon.longitude);
            $('#customSensor').submit();
          break;
          case 'Clear Screen':
            console.log('clear');
            (function clearScreenRMB () {
              $('#search').val('');
              searchBox.hideResults();
              isMilSatSelected = false;
              $('#menu-space-stations').removeClass('bmenu-item-selected');

              if (satellite.sensorSelected() && cameraType.current !== cameraType.PLANETARIUM) {
                uiController.legendMenuChange('default');
              }
            })();
            break;
          }
          rightBtnMenuDOM.hide();
      });

      clearScreenRMB.click(function (e) {

      });

      bodyDOM.on('keypress', _keyHandler); // On Key Press Event Run _keyHandler Function
      bodyDOM.on('keydown', _keyDownHandler); // On Key Press Event Run _keyHandler Function
      bodyDOM.on('keyup', _keyUpHandler); // On Key Press Event Run _keyHandler Function
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
          // $('#datetime-text').fadeOut();
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
        searchBox.hideResults();
        $('#search').val('');
        isMilSatSelected = false;
        $('#menu-space-stations').removeClass('bmenu-item-selected');
      });

      $('#info-overlay-content').on('click', '.watchlist-object', function (evt) {
        var objNum = evt.currentTarget.textContent.split(':');
        objNum = objNum[0];
        var satId = satSet.getIdFromObjNum(objNum);
        if (satId !== null) {
          selectSat(satId);
        }
      });

      $('#bottom-icons').on('click', '.bmenu-item', _bottomIconPress); // Bottom Button Pressed

      $('#bottom-menu').on('click', '.FOV-object', function (evt) {
        var objNum = evt.currentTarget.textContent;
        objNum = objNum.slice(-5);
        var satId = satSet.getIdFromObjNum(objNum);
        if (satId !== null) {
          selectSat(satId);
        }
      });

      // $('#facebook-share').click(function () {
      //   ga('send', 'social', 'Facebook', 'share', 'http://keeptrack.com');
      // });
      //
      // $('#twitter-share').click(function () {
      //   ga('send', 'social', 'Twitter', 'share', 'http://keeptrack.com');
      // });
      //
      // $('#reddit-share').click(function () {
      //   ga('send', 'social', 'Reddit', 'share', 'http://keeptrack.com');
      // });

      // NOTE: MOVE THIS
        $('#legend-hover-menu').click(function (e) {
          switch (e.target.classList[1]) {
            case "legend-green-box":
              if (ColorScheme.objectTypeFlags.green) {
                ColorScheme.objectTypeFlags.green = false;
                $('.legend-green-box').css('background', 'black');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              } else {
                ColorScheme.objectTypeFlags.green = true;
                $('.legend-green-box').css('background', 'green');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              }
              break;
            case "legend-blue-box":
              if (ColorScheme.objectTypeFlags.blue) {
                ColorScheme.objectTypeFlags.blue = false;
                $('.legend-blue-box').css('background', 'black');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              } else {
                ColorScheme.objectTypeFlags.blue = true;
                $('.legend-blue-box').css('background', 'blue');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              }
              break;
            case "legend-gray-box":
              if (ColorScheme.objectTypeFlags.gray) {
                ColorScheme.objectTypeFlags.gray = false;
                $('.legend-gray-box').css('background', 'black');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              } else {
                ColorScheme.objectTypeFlags.gray = true;
                $('.legend-gray-box').css('background', 'gray');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              }
              break;
            case "legend-orange-box":
              if (ColorScheme.objectTypeFlags.orange) {
                ColorScheme.objectTypeFlags.orange = false;
                $('.legend-orange-box').css('background', 'black');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              } else {
                ColorScheme.objectTypeFlags.orange = true;
                $('.legend-orange-box').css('background', 'orange');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              }
              break;
            case "legend-yellow-box":
              if (ColorScheme.objectTypeFlags.yellow) {
                ColorScheme.objectTypeFlags.yellow = false;
                $('.legend-yellow-box').css('background', 'black');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              } else {
                ColorScheme.objectTypeFlags.yellow = true;
                $('.legend-yellow-box').css('background', 'yellow');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              }
              break;
            case "legend-white-box":
              if (ColorScheme.objectTypeFlags.white) {
                ColorScheme.objectTypeFlags.white = false;
                $('.legend-white-box').css('background', 'black');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              } else {
                ColorScheme.objectTypeFlags.white = true;
                $('.legend-white-box').css('background', 'white');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              }
              break;
            case "legend-red-box":
              if (ColorScheme.objectTypeFlags.red) {
                ColorScheme.objectTypeFlags.red = false;
                $('.legend-red-box').css('background', 'black');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              } else {
                ColorScheme.objectTypeFlags.red = true;
                $('.legend-red-box').css('background', 'red');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              }
              break;
            case "legend-purple-box":
              if (ColorScheme.objectTypeFlags.purple) {
                ColorScheme.objectTypeFlags.purple = false;
                $('.legend-purple-box').css('background', 'black');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              } else {
                ColorScheme.objectTypeFlags.purple = true;
                $('.legend-purple-box').css('background', 'purple');
                settingsManager.isForceColorScheme = true;
                satSet.setColorScheme(settingsManager.currentColorScheme, true);
              }
              break;
          }
        });

      $('#legend-menu').click(function () {
        if ($('#legend-hover-menu').css('display') === 'block') {
          $('#legend-hover-menu').hide();
        } else {
          $('#legend-hover-menu').show();
          $('#search').val('');
          searchBox.hideResults();
          $('#search-results').hide();
        }
      });

      $('.menu-selectable').click(function () {
        // $('#menu-sensor-info').removeClass('bmenu-item-disabled');
        // $('#menu-planetarium').removeClass('bmenu-item-disabled');
        if (selectedSat !== -1) {
          $('#menu-lookangles').removeClass('bmenu-item-disabled');
          $('#menu-satview').removeClass('bmenu-item-disabled');
        }
        if (watchlistList.length > 0) {
          $('#menu-info-overlay').removeClass('bmenu-item-disabled');
        }
      });

      // When any sensor is selected
      $('#sensor-list-content > div > ul > .menu-selectable').click(function() {
         adviceList.sensor();
       });

      // USAF Radars
      $('#radar-cspocAll').click(function () {
        adviceList.cspocSensors();
        sensorManager.setSensor('SSN');
      });
      $('#radar-mwAll').click(function () {
        adviceList.mwSensors();
        sensorManager.setSensor('NATO-MW');
      });
      $('#radar-beale').click(function () { sensorManager.setSensor(sensorManager.sensorList.BLE); });
      $('#radar-capecod').click(function () { sensorManager.setSensor(sensorManager.sensorList.COD); });
      $('#radar-clear').click(function () { sensorManager.setSensor(sensorManager.sensorList.CLR); });
      $('#radar-eglin').click(function () { sensorManager.setSensor(sensorManager.sensorList.EGL); });
      $('.radar-fylingdales').click(function () { sensorManager.setSensor(sensorManager.sensorList.FYL); });
      $('#radar-parcs').click(function () { sensorManager.setSensor(sensorManager.sensorList.CAV); });
      $('#radar-thule').click(function () { sensorManager.setSensor(sensorManager.sensorList.THL); });
      $('#radar-cobradane').click(function () { sensorManager.setSensor(sensorManager.sensorList.CDN); });
      $('#radar-altair').click(function () { sensorManager.setSensor(sensorManager.sensorList.ALT); });
      $('#radar-millstone').click(function () { sensorManager.setSensor(sensorManager.sensorList.MIL); });
      $('#radar-ascension').click(function () { sensorManager.setSensor(sensorManager.sensorList.ASC); });
      $('#radar-globus').click(function () { sensorManager.setSensor(sensorManager.sensorList.GLB); });
      $('#optical-diego-garcia').click(function () { sensorManager.setSensor(sensorManager.sensorList.DGC); });
      $('#optical-maui').click(function () { sensorManager.setSensor(sensorManager.sensorList.MAU); });
      $('#optical-socorro').click(function () { sensorManager.setSensor(sensorManager.sensorList.SOC); });

      // ESOC Radars
      $('#esoc-graves').click(function () { sensorManager.setSensor(sensorManager.sensorList.GRV); });
      $('#esoc-tira').click(function () { sensorManager.setSensor(sensorManager.sensorList.TIR); });
      $('#esoc-northern-cross').click(function () { sensorManager.setSensor(sensorManager.sensorList.NRC); });
      $('#esoc-troodos').click(function () { sensorManager.setSensor(sensorManager.sensorList.TRO); });
      $('#esoc-space-debris-telescope').click(function () { sensorManager.setSensor(sensorManager.sensorList.SDT); });

      // Russian Radars
      $('#radar-rus-all').click(function () { sensorManager.setSensor('RUS-ALL'); });
      $('#russian-armavir').click(function () { sensorManager.setSensor(sensorManager.sensorList.ARM); });
      $('#russian-balkhash').click(function () { sensorManager.setSensor(sensorManager.sensorList.BAL); });
      $('#russian-gantsevichi').click(function () { sensorManager.setSensor(sensorManager.sensorList.GAN); });
      $('#russian-lekhtusi').click(function () { sensorManager.setSensor(sensorManager.sensorList.LEK); });
      $('#russian-mishelevka-d').click(function () { sensorManager.setSensor(sensorManager.sensorList.MIS); });
      $('#russian-olenegorsk').click(function () { sensorManager.setSensor(sensorManager.sensorList.OLE); });
      $('#russian-pechora').click(function () { sensorManager.setSensor(sensorManager.sensorList.PEC); });
      $('#russian-pionersky').click(function () { sensorManager.setSensor(sensorManager.sensorList.PIO); });

      // Chinese Radars
      $('#chinese-xuanhua').click(function () { sensorManager.setSensor(sensorManager.sensorList.XUA); });

      $('#reset-sensor-button').click(function () {
        // satSet.setColorScheme(ColorScheme.default);
        settingsManager.isForceColorScheme = false;
        $('#menu-sensor-info').addClass('bmenu-item-disabled');
        $('#menu-fov-bubble').addClass('bmenu-item-disabled');
        $('#menu-surveillance').addClass('bmenu-item-disabled');
        $('#menu-planetarium').addClass('bmenu-item-disabled');
        _resetSensorSelected();
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
        var fblType = $('#fbl-type').val();
        $('#search').val(''); // Reset the search first
        var res = satSet.searchAzElRange(fblAzimuth, fblElevation, fblRange, fblInc, fblAzimuthM, fblElevationM, fblRangeM, fblIncM, fblPeriod, fblPeriodM, fblType);
        if (typeof res === 'undefined') {
          $('#fbl-error').html('No Search Criteria');
        } else if (res.length === 0) {
          $('#fbl-error').html('No Satellites Found');
        }
        e.preventDefault();
      });
      $('#settings-form').change(function (e) {
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
      $('#settings-form').submit(function (e) {
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
          ga('send', 'event', 'Settings Menu', 'Hide Other Satellites', 'Option Selected');
        } else {
          settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0.1];
        }
        ColorScheme.reloadColors();

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
        var sat = satSet.getSatExtraOnly(satId);

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

          // FIXME: Why?
          // sat = satSet.getSat(satId);
        } else {
          $('#es-error').html('Failed Altitude Check</br>Try Different Parameters');
          $('#es-error').show();
        }
        e.preventDefault();
      });

      $('#editSat-save').click(function (e) {
        var scc = $('#es-scc').val();
        var satId = satSet.getIdFromObjNum(scc);
        var sat = satSet.getSatExtraOnly(satId);
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
          var sat = satSet.getSatExtraOnly(satId);
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
        var time = evt.currentTarget.attributes.time.value; // TODO: Find correct code for this.
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
        var hiddenRow = evt.currentTarget.attributes.hiddenrow.value; // TODO: Find correct code for this.
        if (hiddenRow !== null) {
          _socrates(hiddenRow);
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
        uiController.updateWatchlist();
        if (watchlistList.length <= 0) {
          searchBox.doSearch('');
          satSet.setColorScheme(ColorScheme.default, true);
          settingsManager.themes.blueTheme();
        }
        if (!satellite.sensorSelected() || watchlistList.length <= 0) {
          $('#menu-info-overlay').addClass('bmenu-item-disabled');
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
          uiController.updateWatchlist();
        }
        if (satellite.sensorSelected()) {
          $('#menu-info-overlay').removeClass('bmenu-item-disabled');
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
          uiController.updateWatchlist();
        }
        if (satellite.sensorSelected()) {
          $('#menu-info-overlay').removeClass('bmenu-item-disabled');
        }
        $('#watchlist-new').val(''); // Clear the search box after enter pressed/selected
        e.preventDefault();
      });
      $('#watchlist-save').click(function (e) {
        var saveWatchlist = [];
        for (var i = 0; i < watchlistList.length; i++) {
          var sat = satSet.getSatExtraOnly(watchlistList[i]);
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
          uiController.updateWatchlist();
          if (satellite.sensorSelected()) {
            $('#menu-info-overlay').removeClass('bmenu-item-disabled');
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
          var satId = satSet.getIdFromObjNum($('#hc-scc').val());
          var mainsat = satSet.getSat(satId);
          // NOTE: Launch Points are the Satellites Current Location

          var TEARR = satellite.getTEARR(mainsat);
          var launchLat, launchLon, alt;
          launchLon = satellite.degreesLong(TEARR.lon);
          launchLat = satellite.degreesLat(TEARR.lat);
          alt = TEARR.alt;

          var upOrDown = satellite.getDirection(mainsat);
          // console.log(upOrDown);

          var currentEpoch = satellite.currentEpoch(timeManager.propTime());
          mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);

          camSnapMode = false;

          var TLEs;
          // Ignore argument of perigee for round orbits OPTIMIZE
          if ((mainsat.apogee - mainsat.perigee) < 300) {
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
            TLE2: TLE2
          });
          orbitDisplay.updateOrbitBuffer(satId, true, TLE1, TLE2);

          var breakupSearchString = '';

          var breakupCount = 100; // settingsManager.maxAnalystSats;
          for (var i = 0; i < breakupCount; i++) {
            for (var incIterat = 0; incIterat < 10; incIterat++) {
              for (var meanmoIterat = 0; meanmoIterat < 10; meanmoIterat++) {
                if (i >= breakupCount) continue;
                satId = satSet.getIdFromObjNum(80000 + i);
                var sat = satSet.getSat(satId);
                sat = mainsat;
                var iTLE1 = '1 ' + (80000 + i) + TLE1.substr(7);

                var iTLEs;
                // Ignore argument of perigee for round orbits OPTIMIZE
                if ((sat.apogee - sat.perigee) < 300) {
                  iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset);
                } else {
                  iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset, alt);
                }
                iTLE1 = iTLEs[0];
                iTLE2 = iTLEs[1];

                // For the first 30
                var inc = TLE2.substr(8, 8);
                inc = parseFloat(inc - 0.3 + (0.6 / (10 / (incIterat + 1)))).toPrecision(7);
                inc = inc.split('.');
                inc[0] = inc[0].substr(-3, 3);
                if (inc[1]) {
                  inc[1] = inc[1].substr(0, 4);
                } else {
                  inc[1] = '0000';
                }
                inc = (inc[0] + '.' + inc[1]).toString();
                inc = _padEmpty(inc, 8);

                // For the second 30
                var meanmo = TLE2.substr(52, 10);
                meanmo = parseFloat(meanmo - (0.005 / 10) + (0.01 * ((meanmoIterat + 1) / 10))).toPrecision(10);
                meanmo = meanmo.split('.');
                meanmo[0] = meanmo[0].substr(-2, 2);
                if (meanmo[1]) {
                  meanmo[1] = meanmo[1].substr(0, 8);
                } else {
                  meanmo[1] = '00000000';
                }
                meanmo = (meanmo[0] + '.' + meanmo[1]).toString();

                var iTLE2 = '2 ' + (80000 + i) + ' ' + inc + ' ' + TLE2.substr(17, 35) + meanmo + TLE2.substr(63);
                sat = satSet.getSat(satId);
                sat.TLE1 = iTLE1;
                sat.TLE2 = iTLE2;
                sat.active = true;
                if (satellite.altitudeCheck(iTLE1, iTLE2, timeManager.propOffset) > 1) {
                  satCruncher.postMessage({
                    typ: 'satEdit',
                    id: satId,
                    TLE1: iTLE1,
                    TLE2: iTLE2
                  });
                  orbitDisplay.updateOrbitBuffer(satId, true, iTLE1, iTLE2);
                } else {
                  console.error('Breakup Generator Failed');
                }
                i++;
              }
            }
          }
          breakupSearchString += mainsat.SCC_NUM + ',Analyst Sat';
          $('#search').val(breakupSearchString);
          searchBox.doSearch($('#search').val());

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
          if (type === 1) missileManager.MassRaidPre(launchTime, 'simulation/Russia2USA.json');
          if (type === 2) missileManager.MassRaidPre(launchTime, 'simulation/Russia2USAalt.json');
          if (type === 3) missileManager.MassRaidPre(launchTime, 'simulation/China2USA.json');
          if (type === 4) missileManager.MassRaidPre(launchTime, 'simulation/NorthKorea2USA.json');
          if (type === 5) missileManager.MassRaidPre(launchTime, 'simulation/USA2Russia.json');
          if (type === 6) missileManager.MassRaidPre(launchTime, 'simulation/USA2China.json');
          if (type === 7) missileManager.MassRaidPre(launchTime, 'simulation/USA2NorthKorea.json');
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
            tgtLat = missileManager.globalBMTargets[target * 3];
            tgtLon = missileManager.globalBMTargets[(target * 3) + 1];
          }

          var a, b, attackerName;

          if (attacker < 200) { // USA
            a = attacker - 100;
            b = 500 - missileManager.missilesInUse;
            attackerName = missileManager.UsaICBM[a * 4 + 2];
            missileManager.Missile(missileManager.UsaICBM[a * 4], missileManager.UsaICBM[a * 4 + 1], tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States');
          } else if (attacker < 300) { // Russian
            a = attacker - 200;
            b = 500 - missileManager.missilesInUse;
            attackerName = missileManager.RussianICBM[a * 4 + 2];
            missileManager.Missile(missileManager.RussianICBM[a * 4], missileManager.RussianICBM[a * 4 + 1], tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.RussianICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.RussianICBM[a * 4 + 3], 'Russia');
          } else if (attacker < 400) { // Chinese
            a = attacker - 300;
            b = 500 - missileManager.missilesInUse;
            attackerName = missileManager.ChinaICBM[a * 4 + 2];
            missileManager.Missile(missileManager.ChinaICBM[a * 4], missileManager.ChinaICBM[a * 4 + 1], tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.ChinaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.ChinaICBM[a * 4 + 3], 'China');
          } else if (attacker < 500) { // North Korean
            a = attacker - 400;
            b = 500 - missileManager.missilesInUse;
            attackerName = missileManager.NorthKoreanBM[a * 4 + 2];
            missileManager.Missile(missileManager.NorthKoreanBM[a * 4], missileManager.NorthKoreanBM[a * 4 + 1], tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.NorthKoreanBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.NorthKoreanBM[a * 4 + 3], 'North Korea');
          }
          ga('send', 'event', 'New Missile', attackerName, 'Attacker');
          ga('send', 'event', 'New Missile', tgtLat + ', ' + tgtLon, 'Target');

          $('#ms-error').html(missileManager.lastMissileError);
          $('#ms-error').show();
        }
        e.preventDefault();
      });

      $('#ms-error').click(function () {
        $('#ms-error').hide();
      });

      $('#fbl-error').click(function () {
        $('#fbl-error').hide();
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
          if (satellite.sensorSelected()) {
            $('#cs-minaz').val(sensorManager.selectedSensor.obsminaz);
            $('#cs-maxaz').val(sensorManager.selectedSensor.obsmaxaz);
            $('#cs-minel').val(sensorManager.selectedSensor.obsminel);
            $('#cs-maxel').val(sensorManager.selectedSensor.obsmaxel);
            $('#cs-minrange').val(sensorManager.selectedSensor.obsminrange);
            $('#cs-maxrange').val(sensorManager.selectedSensor.obsmaxrange);
          }
        }
      });

      $('#customSensor').submit(function (e) {
        $('#menu-sensor-info').removeClass('bmenu-item-disabled');
        $('#menu-fov-bubble').removeClass('bmenu-item-disabled');
        $('#menu-surveillance').removeClass('bmenu-item-disabled');
        $('#menu-planetarium').removeClass('bmenu-item-disabled');
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
            lat: lat * 1,
            long: lon * 1,
            obshei: obshei * 1,
            obsminaz: minaz * 1,
            obsmaxaz: maxaz * 1,
            obsminel: minel * 1,
            obsmaxel: maxel * 1,
            obsminrange: minrange * 1,
            obsmaxrange: maxrange * 1
          }
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
          obsmaxrange: maxrange * 1
        });

        selectSat(-1);
        lat = lat * 1;
        lon = lon * 1;
        if (maxrange > 6000) {
          changeZoom('geo');
        } else {
          changeZoom('leo');
        }
        camSnap(latToPitch(lat), longToYaw(lon));

        uiController.legendMenuChange('default');

        e.preventDefault();
      });

    })();

    var socratesObjOne = []; // Array for tr containing CATNR1
    var socratesObjTwo = []; // Array for tr containing CATNR2
    function _socrates (row) {
      // SOCRATES Variables

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
      ga('send', 'event', 'Bottom Icon', evt.currentTarget.id, 'Selected');
      switch (evt.currentTarget.id) {
        case 'menu-sensor-list': // No Keyboard Commands
          if (isSensorListMenuOpen) {
            uiController.hideSideMenus();
            isSensorListMenuOpen = false;
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            $('#sensor-list-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            isSensorListMenuOpen = true;
            $('#menu-sensor-list').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-info-overlay':
          if (!satellite.sensorSelected()) { // No Sensor Selected
            if (!$('#menu-info-overlay:animated').length) {
              $('#menu-info-overlay').effect('shake', {distance: 10});
            }
            break;
          }
          if (isInfoOverlayMenuOpen) {
            isInfoOverlayMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            uiController.hideSideMenus();
            if ((nextPassArray.length === 0 || nextPassEarliestTime > timeManager.now ||
                new Date(nextPassEarliestTime * 1 + (1000 * 60 * 60 * 24)) < timeManager.now) ||
                isWatchlistChanged) {
              $('#loading-screen').fadeIn('slow', function () {
                  nextPassArray = [];
                  for (var x = 0; x < watchlistList.length; x++) {
                    nextPassArray.push(satSet.getSatExtraOnly(watchlistList[x]));
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
            $('#info-overlay-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            $('#menu-info-overlay').addClass('bmenu-item-selected');
            isInfoOverlayMenuOpen = true;
            break;
          }
          break;
        case 'menu-sensor-info': // No Keyboard Commands
          if (!satellite.sensorSelected()) { // No Sensor Selected
            adviceList.sensorInfoDisabled();
            if (!$('#menu-sensor-info:animated').length) {
              $('#menu-sensor-info').effect('shake', {distance: 10});
            }
            break;
          }
          if (isSensorInfoMenuOpen) {
            uiController.hideSideMenus();
            isSensorInfoMenuOpen = false;
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            satellite.getsensorinfo();
            $('#sensor-info-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            isSensorInfoMenuOpen = true;
            $('#menu-sensor-info').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-lookangles': // S
          if (isLookanglesMenuOpen) {
            isLookanglesMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            sat = satSet.getSatExtraOnly(selectedSat);
            if (!satellite.sensorSelected() || sat.static || sat.missile || selectedSat === -1) { // No Sensor or Satellite Selected
              adviceList.lookanglesDisabled();
              if (!$('#menu-lookangles:animated').length) {
                $('#menu-lookangles').effect('shake', {distance: 10});
              }
              break;
            }
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            isLookanglesMenuOpen = true;
            $('#loading-screen').fadeIn('slow', function () {
              satellite.getlookangles(sat, isLookanglesMenuOpen);
              $('#menu-lookangles').addClass('bmenu-item-selected');
              $('#loading-screen').fadeOut();
              $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            });
            break;
          }
          break;
        case 'menu-watchlist': // S
          if (isWatchlistMenuOpen) {
            isWatchlistMenuOpen = false;
            $('#menu-watchlist').removeClass('bmenu-item-selected');
            $('#search-holder').show();
            uiController.hideSideMenus();
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            $('#watchlist-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            $('#search-holder').hide();
            uiController.updateWatchlist();
            isWatchlistMenuOpen = true;
            $('#menu-watchlist').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-lookanglesmultisite':
          if (isLookanglesMultiSiteMenuOpen) {
            isLookanglesMultiSiteMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            if (selectedSat === -1) { // No Satellite Selected
              adviceList.ssnLookanglesDisabled();
              if (!$('#menu-lookanglesmultisite:animated').length) {
                $('#menu-lookanglesmultisite').effect('shake', {distance: 10});
              }
              break;
            }
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            isLookanglesMultiSiteMenuOpen = true;
            $('#menu-lookanglesmultisite').addClass('bmenu-item-selected');
            if (selectedSat !== -1) {
              $('#loading-screen').fadeIn('slow', function () {
                sat = satSet.getSatExtraOnly(selectedSat);
                satellite.getlookanglesMultiSite(sat, isLookanglesMultiSiteMenuOpen);
                $('#loading-screen').fadeOut();
                $('#lookanglesmultisite-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
              });
            }
            break;
          }
          break;
        case 'menu-find-sat': // F
          if (isFindByLooksMenuOpen) {
            isFindByLooksMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            $('#findByLooks-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            isFindByLooksMenuOpen = true;
            $('#menu-find-sat').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-twitter': // T
          if (isTwitterMenuOpen) {
            isTwitterMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            if ($('#twitter-menu').is(':empty')) {
              $('#twitter-menu').html('<a class="twitter-timeline" data-theme="dark" data-link-color="#2B7BB9" href="https://twitter.com/RedKosmonaut/lists/space-news">A Twitter List by RedKosmonaut</a> <script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>');
            }
            $('#twitter-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            isTwitterMenuOpen = true;
            $('#menu-twitter').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-map': // W
          if (settingsManager.isMapMenuOpen) {
            settingsManager.isMapMenuOpen = false;
            uiController.hideSideMenus();
            break;
          }
          if (!settingsManager.isMapMenuOpen) {
            if (selectedSat === -1) { // No Satellite Selected
              adviceList.mapDisabled();
              if (!$('#menu-map:animated').length) {
                $('#menu-map').effect('shake', {distance: 10});
              }
              break;
            }
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            $('#map-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            settingsManager.isMapMenuOpen = true;
            uiController.updateMap();
            var satData = satSet.getSatExtraOnly(selectedSat);
            $('#map-sat').tooltip({delay: 50, html: satData.SCC_NUM, position: 'left'});
            $('#menu-map').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-launches': // L
          if (isLaunchMenuOpen) {
            isLaunchMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            if (location.protocol === 'https:') {
              $.colorbox({href: 'https://space.skyrocket.de/doc_chr/lau2019.htm', iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
            } else {
              $.colorbox({href: 'http://space.skyrocket.de/doc_chr/lau2019.htm', iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
            }
            isLaunchMenuOpen = true;
            $('#menu-launches').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-about': // No Keyboard Shortcut
          if (isAboutSelected) {
            isAboutSelected = false;
            uiController.hideSideMenus();
            break;
          } else {
            uiController.hideSideMenus();
            $('#about-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            isAboutSelected = true;
            $('#menu-about').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-satellite-collision': // No Keyboard Shortcut
          if (isSocratesMenuOpen) {
            isSocratesMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            $('#socrates-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            isSocratesMenuOpen = true;
            _socrates(-1);
            $('#menu-satellite-collision').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-settings': // T
          if (isSettingsMenuOpen) {
            isSettingsMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            $('#settings-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            isSettingsMenuOpen = true;
            $('#menu-settings').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-editSat':
          if (isEditSatMenuOpen) {
            isEditSatMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            if (selectedSat !== -1) {
              if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
              uiController.hideSideMenus();
              $('#editSat-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
              $('#menu-editSat').addClass('bmenu-item-selected');
              isEditSatMenuOpen = true;

              sat = satSet.getSatExtraOnly(selectedSat);
              $('#es-scc').val(sat.SCC_NUM);

              var inc = (sat.inclination * RAD2DEG).toPrecision(7);
              inc = inc.split('.');
              inc[0] = inc[0].substr(-3, 3);
              inc[1] = inc[1].substr(0, 4);
              inc = (inc[0] + '.' + inc[1]).toString();

              $('#es-inc').val(_pad0(inc, 8));
              $('#es-year').val(sat.TLE1.substr(18, 2));
              $('#es-day').val(sat.TLE1.substr(20, 12));
              $('#es-meanmo').val(sat.TLE2.substr(52, 11));

              var rasc = (sat.raan * RAD2DEG).toPrecision(7);
              rasc = rasc.split('.');
              rasc[0] = rasc[0].substr(-3, 3);
              rasc[1] = rasc[1].substr(0, 4);
              rasc = (rasc[0] + '.' + rasc[1]).toString();

              $('#es-rasc').val(_pad0(rasc, 8));
              $('#es-ecen').val(sat.eccentricity.toPrecision(7).substr(2, 7));

              var argPe = (sat.argPe * RAD2DEG).toPrecision(7);
              argPe = argPe.split('.');
              argPe[0] = argPe[0].substr(-3, 3);
              argPe[1] = argPe[1].substr(0, 4);
              argPe = (argPe[0] + '.' + argPe[1]).toString();

              $('#es-argPe').val(_pad0(argPe, 8));
              $('#es-meana').val(sat.TLE2.substr(44 - 1, 7 + 1));
              // $('#es-rasc').val(sat.TLE2.substr(18 - 1, 7 + 1).toString());
            } else {
              adviceList.editSatDisabled();
              if (!$('#menu-editSat:animated').length) {
                $('#menu-editSat').effect('shake', {distance: 10});
              }
            }
          }
          break;
        case 'menu-newLaunch':
          if (isNewLaunchMenuOpen) {
            isNewLaunchMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            if (selectedSat !== -1) {
              if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
              uiController.hideSideMenus();
              $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
              $('#menu-newLaunch').addClass('bmenu-item-selected');
              isNewLaunchMenuOpen = true;

              sat = satSet.getSatExtraOnly(selectedSat);
              $('#nl-scc').val(sat.SCC_NUM);
              $('#nl-inc').val((sat.inclination * RAD2DEG).toPrecision(2));
            } else {
              adviceList.newLaunchDisabled();
              if (!$('#menu-newLaunch:animated').length) {
                $('#menu-newLaunch').effect('shake', {distance: 10});
              }
            }
            break;
          }
          break;
        case 'menu-breakup':
          if (isBreakupMenuOpen) {
            isBreakupMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            if (selectedSat !== -1) {
              if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
              uiController.hideSideMenus();
              $('#breakup-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
              $('#menu-breakup').addClass('bmenu-item-selected');
              isBreakupMenuOpen = true;

              sat = satSet.getSatExtraOnly(selectedSat);
              $('#hc-scc').val(sat.SCC_NUM);
            } else {
              adviceList.breakupDisabled();
              if (!$('#menu-breakup:animated').length) {
                $('#menu-breakup').effect('shake', {distance: 10});
              }
            }
            break;
          }
          break;
        case 'menu-customSensor': // T
          if (isCustomSensorMenuOpen) {
            isCustomSensorMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();

            if (satellite.sensorSelected()) {
              $('#cs-lat').val(sensorManager.selectedSensor.lat);
              $('#cs-lon').val(sensorManager.selectedSensor.long);
              $('#cs-hei').val(sensorManager.selectedSensor.obshei);
            }
            $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            isCustomSensorMenuOpen = true;
            $('#menu-customSensor').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-missile':
          if (isMissileMenuOpen) {
            isMissileMenuOpen = false;
            uiController.hideSideMenus();
            break;
          } else {
             if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            $('#missile-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            $('#menu-missile').addClass('bmenu-item-selected');
            isMissileMenuOpen = true;
            break;
          }
          break;
        case 'menu-fov-bubble': // No Keyboard Commands
          if (!satellite.sensorSelected()) { // No Sensor Selected
            adviceList.bubbleDisabled();
            if (!$('#menu-fov-bubble:animated').length) {
              $('#menu-fov-bubble').effect('shake', {distance: 10});
            }
            break;
          }
          if (settingsManager.isFOVBubbleModeOn && !settingsManager.isShowSurvFence) {
            settingsManager.isFOVBubbleModeOn = false;
            $('#menu-fov-bubble').removeClass('bmenu-item-selected');
            satCruncher.postMessage({
              isShowFOVBubble: 'reset',
              isShowSurvFence: 'disable'
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
              isShowSurvFence: 'disable'
            });
            break;
          }
          break;
        case 'menu-surveillance': // No Keyboard Commands
          if (!satellite.sensorSelected()) { // No Sensor Selected
            adviceList.survFenceDisabled();
            if (!$('#menu-surveillance:animated').length) {
              $('#menu-surveillance').effect('shake', {distance: 10});
            }
            break;
          }
          if (settingsManager.isShowSurvFence) {
            settingsManager.isShowSurvFence = false;
            $('#menu-surveillance').removeClass('bmenu-item-selected');
            satCruncher.postMessage({
              isShowSurvFence: 'disable',
              isShowFOVBubble: 'reset'
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
              isShowSurvFence: 'enable'
            });
            break;
          }
          break;
        case 'menu-sat-fov': // No Keyboard Commands
          if (selectedSat === -1 && $('#search').val() === "") { // No Sat Selected and No Search Present
            adviceList.satFOVDisabled();
            if (!$('#menu-sat-fov:animated').length) {
              $('#menu-sat-fov').effect('shake', {distance: 10});
            }
            break;
          }
          if (settingsManager.isSatOverflyModeOn) {
            settingsManager.isSatOverflyModeOn = false;
            $('#menu-sat-fov').removeClass('bmenu-item-selected');
            satCruncher.postMessage({
              isShowSatOverfly: 'reset'
            });
            break;
          } else {
            $('#menu-fov-bubble').removeClass('bmenu-item-selected');
            $('#menu-surveillance').removeClass('bmenu-item-selected');
            settingsManager.isShowSurvFence = false;
            settingsManager.isFOVBubbleModeOn = false;

            settingsManager.isSatOverflyModeOn = true;

            if ($('#search').val() !== '') { // If Group Selected
              searchBox.doSearch($('#search').val());
            }

            var satFieldOfView = $('#satFieldOfView').val() * 1;
            $('#menu-sat-fov').addClass('bmenu-item-selected');
            satCruncher.postMessage({
              isShowFOVBubble: 'reset',
              isShowSurvFence: 'disable',
              isShowSatOverfly: 'enable',
              selectedSatFOV: satFieldOfView
            });
            satSet.setColorScheme(settingsManager.currentColorScheme, true);
            break;
          }
          break;
        case 'menu-day-night': // No Keyboard Commands
          if (isDayNightToggle) {
            isDayNightToggle = false;
            $('#menu-day-night').removeClass('bmenu-item-selected');
            break;
          } else {
            isDayNightToggle = true;
            $('#menu-day-night').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-color-scheme': // No Keyboard Commands
          if (isColorSchemeMenuOpen) {
            uiController.hideSideMenus();
            isColorSchemeMenuOpen = false;
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            $('#color-scheme-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            isColorSchemeMenuOpen = true;
            $('#menu-color-scheme').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-constellations': // No Keyboard Commands
          if (isConstellationsMenuOpen) {
            uiController.hideSideMenus();
            isConstellationsMenuOpen = false;
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            $('#constellations-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            isConstellationsMenuOpen = true;
            $('#menu-constellations').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-countries': // No Keyboard Commands
          if (isCountriesMenuOpen) {
            uiController.hideSideMenus();
            isCountriesMenuOpen = false;
            break;
          } else {
            if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
            uiController.hideSideMenus();
            $('#countries-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            isCountriesMenuOpen = true;
            $('#menu-countries').addClass('bmenu-item-selected');
            break;
          }
          break;
        case 'menu-planetarium':
          if (isPlanetariumView) {
            isPlanetariumView = false;
            uiController.hideSideMenus();
            orbitDisplay.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
            cameraType.current = cameraType.DEFAULT; // Back to normal Camera Mode
            $('#menu-planetarium').removeClass('bmenu-item-selected');
            break;
          } else {
            if (satellite.sensorSelected()) {
              cameraType.current = cameraType.PLANETARIUM; // Activate Planetarium Camera Mode
              uiController.legendMenuChange('planetarium');
              $('#menu-planetarium').addClass('bmenu-item-selected');
              isPlanetariumView = true;
            } else {
              adviceList.planetariumDisabled();
              if (!$('#menu-planetarium:animated').length) {
                $('#menu-planetarium').effect('shake', {distance: 10});
              }
            }
            break;
          }
          break;
        case 'menu-satview':
          if (cameraType.current === cameraType.SATELLITE) {
            isSatView = false;
            uiController.hideSideMenus();
            cameraType.current = cameraType.DEFAULT; // Back to normal Camera Mode
            $('#menu-satview').removeClass('bmenu-item-selected');
            break;
          } else {
            if (selectedSat !== -1) {
              cameraType.current = cameraType.SATELLITE; // Activate Satellite Camera Mode
              $('#menu-satview').addClass('bmenu-item-selected');
              isSatView = true;
            } else {
              adviceList.satViewDisabled();
              if (!$('#menu-satview:animated').length) {
                $('#menu-satview').effect('shake', {distance: 10});
              }
            }
            break;
          }
          break;
      }
    }

    uiController.hideSideMenus = function () {
      // Close any open colorboxes
      $.colorbox.close();

      // Hide all side menus
      $('#sensor-list-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#info-overlay-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#sensor-info-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#watchlist-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#lookanglesmultisite-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#findByLooks-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#twitter-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#map-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#socrates-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#settings-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#editSat-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#breakup-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#missile-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
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
      $('#menu-lookanglesmultisite').removeClass('bmenu-item-selected');
      $('#menu-launches').removeClass('bmenu-item-selected');
      $('#menu-find-sat').removeClass('bmenu-item-selected');
      $('#menu-twitter').removeClass('bmenu-item-selected');
      $('#menu-map').removeClass('bmenu-item-selected');
      $('#menu-satellite-collision').removeClass('bmenu-item-selected');
      $('#menu-settings').removeClass('bmenu-item-selected');
      $('#menu-editSat').removeClass('bmenu-item-selected');
      $('#menu-newLaunch').removeClass('bmenu-item-selected');
      $('#menu-breakup').removeClass('bmenu-item-selected');
      $('#menu-missile').removeClass('bmenu-item-selected');
      $('#menu-customSensor').removeClass('bmenu-item-selected');
      $('#menu-color-scheme').removeClass('bmenu-item-selected');
      $('#menu-countries').removeClass('bmenu-item-selected');
      $('#menu-constellations').removeClass('bmenu-item-selected');
      $('#menu-about').removeClass('bmenu-item-selected');

      // Unflag all open menu variables
      isSensorListMenuOpen = false;
      isInfoOverlayMenuOpen = false;
      isSensorInfoMenuOpen = false;
      isWatchlistMenuOpen = false;
      isLaunchMenuOpen = false;
      isTwitterMenuOpen = false;
      isFindByLooksMenuOpen = false;
      settingsManager.isMapMenuOpen = false;
      isLookanglesMenuOpen = false;
      isLookanglesMultiSiteMenuOpen = false;
      isSocratesMenuOpen = false;
      isSettingsMenuOpen = false;
      isEditSatMenuOpen = false;
      isNewLaunchMenuOpen = false;
      isBreakupMenuOpen = false;
      isMissileMenuOpen = false;
      isCustomSensorMenuOpen = false;
      isColorSchemeMenuOpen = false;
      isConstellationsMenuOpen = false;
      isCountriesMenuOpen = false;
      isAboutSelected = false;
      // isPlanetariumView = false;
    };

    uiController.updateWatchlist = function (updateWatchlistList, updateWatchlistInViewList) {
      if (typeof updateWatchlistList !== 'undefined') {
        watchlistList = updateWatchlistList;
      }
      if (typeof updateWatchlistInViewList !== 'undefined') {
        watchlistInViewList = updateWatchlistInViewList;
      }

      if (!watchlistList) return;
      settingsManager.isThemesNeeded = true;
      isWatchlistChanged = true;
      var watchlistString = '';
      var watchlistListHTML = '';
      var sat;
      for (var i = 0; i < watchlistList.length; i++) {
        sat = satSet.getSatExtraOnly(watchlistList[i]);
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
        watchlistString += satSet.getSatExtraOnly(watchlistList[i]).SCC_NUM;
        if (i !== watchlistList.length - 1) watchlistString += ',';
      }
      $('#search').val(watchlistString);
      searchBox.doSearch(watchlistString, true);

      var saveWatchlist = [];
      for (i = 0; i < watchlistList.length; i++) {
        sat = satSet.getSatExtraOnly(watchlistList[i]);
        saveWatchlist[i] = sat.SCC_NUM;
      }
      var variable = JSON.stringify(saveWatchlist);
      localStorage.setItem("watchlistList", variable);
    }

    var isCurrentlyTyping = false;
    $('#search').focus(function(){
      isCurrentlyTyping = true;
    });
    $('#ui-wrapper').focusin(function(){
      isCurrentlyTyping = true;
    });

    $('#search').blur(function(){
      isCurrentlyTyping = false;
    });
    $('#ui-wrapper').focusout(function(){
      isCurrentlyTyping = false;
    });

    function _keyUpHandler (evt) {
      if (isCurrentlyTyping) return;

      if (evt.key.toUpperCase() === 'A' && FPSSideSpeed === -settingsManager.FPSSideSpeed) {
        isFPSSideSpeedLock = false;
      }
      if (evt.key.toUpperCase() === 'D' && FPSSideSpeed === settingsManager.FPSSideSpeed) {
        isFPSSideSpeedLock = false;
      }
      if (evt.key.toUpperCase() === 'S' && FPSForwardSpeed === -settingsManager.FPSForwardSpeed) {
        isFPSForwardSpeedLock = false;
      }
      if (evt.key.toUpperCase() === 'W' && FPSForwardSpeed === settingsManager.FPSForwardSpeed) {
        isFPSForwardSpeedLock = false;
      }
      if (evt.key.toUpperCase() === 'Q') {
        if (FPSVertSpeed === -settingsManager.FPSVertSpeed) isFPSVertSpeedLock = false;
        FPSRotateRate = 0;
      }
      if (evt.key.toUpperCase() === 'E') {
        if (FPSVertSpeed === settingsManager.FPSVertSpeed) isFPSVertSpeedLock = false;
        FPSRotateRate = 0;
      }
      if (evt.key.toUpperCase() === 'J' || evt.key.toUpperCase() === 'L') {
        FPSYawRate = 0;
      }
      if (evt.key.toUpperCase() === 'I' || evt.key.toUpperCase() === 'K') {
        FPSPitchRate = 0;
      }

      if (evt.key.toUpperCase() === 'SHIFT') {
        FPSRun = 1;
        settingsManager.cameraMovementSpeed = 0.003;
        settingsManager.cameraMovementSpeedMin = 0.005;
        speedModifier = 1;
        if (!isFPSForwardSpeedLock) FPSForwardSpeed = 0;
        if (!isFPSSideSpeedLock) FPSSideSpeed = 0;
        if (!isFPSVertSpeedLock) FPSVertSpeed = 0;
      }
      // TODO: Alternative for IE?
      if (evt.key === 'ShiftRight') {
        FPSRun = 1;
        settingsManager.cameraMovementSpeed = 0.003;
        settingsManager.cameraMovementSpeedMin = 0.005;
        speedModifier = 1;
      }
    }

    function _keyDownHandler (evt) {
      if (isCurrentlyTyping) return;
      if (evt.key.toUpperCase() === 'SHIFT') {
        if (cameraType.current === cameraType.FPS) {
          FPSRun = 0.05;
        }
        speedModifier = 8;
        settingsManager.cameraMovementSpeed = 0.003 / 8;
        settingsManager.cameraMovementSpeedMin = 0.005 / 8;
      }
      // TODO: Alternative for IE?
      if (evt.key === 'ShiftRight') {
        if (cameraType.current === cameraType.FPS) {
          FPSRun = 3;
        }
      }
      if (evt.key.toUpperCase() === 'W') {
        if (cameraType.current === cameraType.FPS) {
          FPSForwardSpeed = settingsManager.FPSForwardSpeed;
          isFPSForwardSpeedLock = true;
        }
      }
      if (evt.key.toUpperCase() === 'A') {
        if (cameraType.current === cameraType.FPS) {
          FPSSideSpeed = -settingsManager.FPSSideSpeed;
          isFPSSideSpeedLock = true;
        }
      }
      if (evt.key.toUpperCase() === 'S') {
        if (cameraType.current === cameraType.FPS) {
          FPSForwardSpeed = -settingsManager.FPSForwardSpeed;
          isFPSForwardSpeedLock = true;
        }
      }
      if (evt.key.toUpperCase() === 'D') {
        if (cameraType.current === cameraType.FPS) {
          FPSSideSpeed = settingsManager.FPSSideSpeed;
          isFPSSideSpeedLock = true;
        }
      }
      if (evt.key.toUpperCase() === 'I') {
        if (cameraType.current === cameraType.FPS || cameraType.current === cameraType.SATELLITE) {
          FPSPitchRate = settingsManager.FPSPitchRate / speedModifier;
        }
      }
      if (evt.key.toUpperCase() === 'K') {
        if (cameraType.current === cameraType.FPS || cameraType.current === cameraType.SATELLITE) {
          FPSPitchRate = -settingsManager.FPSPitchRate / speedModifier;
        }
      }
      if (evt.key.toUpperCase() === 'J') {
        if (cameraType.current === cameraType.FPS || cameraType.current === cameraType.SATELLITE) {
          FPSYawRate = -settingsManager.FPSYawRate / speedModifier;
        }
      }
      if (evt.key.toUpperCase() === 'L') {
        if (cameraType.current === cameraType.FPS || cameraType.current === cameraType.SATELLITE) {
          FPSYawRate = settingsManager.FPSYawRate / speedModifier;
        }
      }
      if (evt.key.toUpperCase() === 'Q') {
        if (cameraType.current === cameraType.FPS) {
          FPSVertSpeed = -settingsManager.FPSVertSpeed;
          isFPSVertSpeedLock = true;
        }
        if (cameraType.current === cameraType.SATELLITE) {
          FPSRotateRate = settingsManager.FPSRotateRate / speedModifier;
        }
      }
      if (evt.key.toUpperCase() === 'E') {
        if (cameraType.current === cameraType.FPS) {
          FPSVertSpeed = settingsManager.FPSVertSpeed;
          isFPSVertSpeedLock = true;
      }
        if (cameraType.current === cameraType.SATELLITE) {
          FPSRotateRate = -settingsManager.FPSRotateRate / speedModifier;
        }
      }
    }

    function _keyHandler (evt) {
      if (isCurrentlyTyping) return;
      // console.log(Number(evt.charCode));
      switch (evt.key.toUpperCase()) {
        case 'R':
          rotateTheEarth = !rotateTheEarth;
          // console.log('toggled rotation');
          break;
        case 'C':
          if (cameraType.current === cameraType.PLANETARIUM) orbitDisplay.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View

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
              uiController.legendMenuChange('planetarium');
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
          timeManager.propOffset = timeManager.getPropOffset();
          settingsManager.isPropRateChange = true;
          break;
        case '+':
        case '=':
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
        case '-':
        case '_':
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
        case '1':
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

  uiController.resize2DMap = function () {
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
  };

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
        var satInView = satSet.getSatInViewOnly(satSet.getIdFromObjNum(nextPassArray[s].SCC_NUM)).inview;
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
        console.log(1);
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
        missileManager.getMissileTEARR(sat);
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
  }

  $('#colors-menu>ul>li').click(function () {
    selectSat(-1); // clear selected sat
    var colorName = $(this).data('color');
    switch (colorName) {
      case 'default':
        if (satellite.sensorSelected()) {
          uiController.legendMenuChange('default');
        } else {
          uiController.legendMenuChange('default');
        }
        satSet.setColorScheme(ColorScheme.default, true);
        ga('send', 'event', 'ColorScheme Menu', 'Default Color', 'Selected');
        break;
      case 'velocity':
        uiController.legendMenuChange('velocity');
        satSet.setColorScheme(ColorScheme.velocity);
        ga('send', 'event', 'ColorScheme Menu', 'Velocity', 'Selected');
        break;
      case 'near-earth':
        uiController.legendMenuChange('near');
        satSet.setColorScheme(ColorScheme.leo);
        ga('send', 'event', 'ColorScheme Menu', 'near-earth', 'Selected');
        break;
      case 'deep-space':
        uiController.legendMenuChange('deep');
        satSet.setColorScheme(ColorScheme.geo);
        ga('send', 'event', 'ColorScheme Menu', 'Deep-Space', 'Selected');
        break;
      case 'lost-objects':
        $('#search').val('');
        $('#loading-screen').fadeIn('slow', function () {
          satSet.setColorScheme(ColorScheme.lostobjects);
          ga('send', 'event', 'ColorScheme Menu', 'Lost Objects', 'Selected');
          searchBox.doSearch($('#search').val());
          $('#loading-screen').fadeOut();
        });
        break;
      case 'rcs':
        uiController.legendMenuChange('rcs');
        satSet.setColorScheme(ColorScheme.rcs);
        ga('send', 'event', 'ColorScheme Menu', 'RCS', 'Selected');
        break;
      case 'smallsats':
        uiController.legendMenuChange('small');
        satSet.setColorScheme(ColorScheme.smallsats);
        ga('send', 'event', 'ColorScheme Menu', 'Small Satellites', 'Selected');
        break;
      case 'countries':
        uiController.legendMenuChange('countries');
        satSet.setColorScheme(ColorScheme.countries);
        ga('send', 'event', 'ColorScheme Menu', 'Countries', 'Selected');
        break;
    }

    // Close Open Menus
    if (settingsManager.isMobileModeEnabled) mobile.searchToggle(false);
    uiController.hideSideMenus();
  });

  uiController.useCurrentGeolocationAsSensor = function () {
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

        $('#cs-lat').val(settingsManager.geolocation.lat).trigger("change");
        $('#cs-lon').val(settingsManager.geolocation.long).trigger("change");
        $('#cs-hei').val(settingsManager.geolocation.obshei).trigger("change");

        $('#cs-telescope').attr('checked','checked');
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

        selectSat(-1);
        lat = lat * 1;
        lon = lon * 1;
        if (maxrange > 6000) {
          changeZoom('geo');
        } else {
          changeZoom('leo');
        }
        console.log('2: ' + Date.now());
        camSnap(latToPitch(lat), longToYaw(lon));
      });
    }
  };

  uiController.legendMenuChange = function (menu) {
    $('#legend-list-default').hide();
    $('#legend-list-default-sensor').hide();
    $('#legend-list-rcs').hide();
    $('#legend-list-small').hide();
    $('#legend-list-near').hide();
    $('#legend-list-deep').hide();
    $('#legend-list-velocity').hide();
    $('#legend-list-countries').hide();
    $('#legend-list-planetarium').hide();
    switch (menu) {
      case 'default':
        if (satellite.sensorSelected()) {
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
      case 'countries':
        $('#legend-list-countries').show();
        break;
      case 'planetarium':
        $('#legend-list-planetarium').show();
        break;
      case 'clear':
        $('#legend-hover-menu').hide();
        if (satellite.sensorSelected()) {
          $('#legend-list-default-sensor').show();
        } else {
          $('#legend-list-default').show();
        }
        break;
    }
    if (settingsManager.currentLegend !== menu) {
      $('.legend-green-box').css('background', 'green');
      $('.legend-blue-box').css('background', 'blue');
      $('.legend-gray-box').css('background', 'gray');
      $('.legend-orange-box').css('background', 'orange');
      $('.legend-yellow-box').css('background', 'yellow');
      $('.legend-white-box').css('background', 'white');
      $('.legend-red-box').css('background', 'red');
      $('.legend-purple-box').css('background', 'purple');
      ColorScheme.objectTypeFlags.green = true;
      ColorScheme.objectTypeFlags.blue = true;
      ColorScheme.objectTypeFlags.gray = true;
      ColorScheme.objectTypeFlags.orange = true;
      ColorScheme.objectTypeFlags.yellow = true;
      ColorScheme.objectTypeFlags.white = true;
      ColorScheme.objectTypeFlags.red = true;
      ColorScheme.objectTypeFlags.purple = true;
    }
    settingsManager.currentLegend = menu;
  };

  $('#editSat>div>input').bind({
    keydown: function (e) {
      _validateNumOnly(e);
    }
  });

  $('#es-ecen').bind({
    keydown: function (e) {
      if (e.keyCode === 190) e.preventDefault();
    }
  });

  $('#es-day').keyup(function () {
    if ($('#es-day').val() < 0) $('#es-day').val('000.00000000');
    if ($('#es-day').val() > 367) $('#es-day').val('365.00000000');
  });
  $('#es-inc').keyup(function () {
    if ($('#es-inc').val() < 0) $('#es-inc').val('000.0000');
    if ($('#es-inc').val() > 180) $('#es-inc').val('180.0000');
  });
  $('#es-rasc').keyup(function () {
    if ($('#es-rasc').val() < 0) $('#es-rasc').val('000.0000');
    if ($('#es-rasc').val() > 360) $('#es-rasc').val('360.0000');
  });
  $('#es-meanmo').keyup(function () {
    if ($('#es-meanmo').val() < 0) $('#es-meanmo').val('00.00000000');
    if ($('#es-meanmo').val() > 18) $('#es-meanmo').val('18.00000000');
  });
  $('#es-argPe').keyup(function () {
    if ($('#es-argPe').val() < 0) $('#es-argPe').val('000.0000');
    if ($('#es-argPe').val() > 360) $('#es-argPe').val('360.0000');
  });
  $('#es-meana').keyup(function () {
    if ($('#es-meana').val() < 0) $('#es-meana').val('000.0000');
    if ($('#es-meana').val() > 360) $('#es-meana').val('360.0000');
  });

  $('#ms-lat').keyup(function () {
    if ($('#ms-lat').val() < -90) $('#ms-lat').val('-90.000');
    if ($('#ms-lat').val() > 90) $('#ms-lat').val('90.000');
  });
  $('#ms-lon').keyup(function () {
    if ($('#ms-lon').val() < -180) $('#ms-lon').val('-180.000');
    if ($('#ms-lon').val() > 180) $('#ms-lon').val('180.000');
  });

  _validateNumOnly = function (e) {
    // Allow: backspace, delete, tab, escape, enter and .
      if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110]) !== -1 ||
           // Allow: Ctrl+A, Command+A
          (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
           // Allow: home, end, left, right, down, up
          (e.keyCode >= 35 && e.keyCode <= 40) ||
          // Allow: period
          (e.keyCode === 190)) {
               // let it happen, don't do anything
               return;
      }
      // Ensure that it is a number and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
          e.preventDefault();
      }
  };

  var $search = $('#search');
  $('#country-menu>ul>li').click(function () {
    var groupName = $(this).data('group');
    switch (groupName) {
      case 'Canada':
        if (typeof groups.Canada == 'undefined') {
          groups.Canada = new groups.SatGroup('countryRegex', /CA/);
        }
        break;
      case 'China':
        if (typeof groups.China == 'undefined') {
          groups.China = new groups.SatGroup('countryRegex', /PRC/);
        }
        break;
      case 'France':
        if (typeof groups.France == 'undefined') {
          groups.France = new groups.SatGroup('countryRegex', /FR/);
        }
        break;
      case 'India':
        if (typeof groups.India == 'undefined') {
          groups.India = new groups.SatGroup('countryRegex', /IND/);
        }
        break;
      case 'Israel':
        if (typeof groups.Israel == 'undefined') {
          groups.Israel = new groups.SatGroup('countryRegex', /ISRA/);
        }
        break;
      case 'Japan':
        if (typeof groups.Japan == 'undefined') {
          groups.Japan = new groups.SatGroup('countryRegex', /JPN/);
        }
        break;
      case 'Russia':
        if (typeof groups.Russia == 'undefined') {
          groups.Russia = new groups.SatGroup('countryRegex', /CIS/);
        }
        break;
      case 'UnitedKingdom':
        if (typeof groups.UnitedKingdom == 'undefined') {
          groups.UnitedKingdom = new groups.SatGroup('countryRegex', /UK/);
        }
        break;
      case 'UnitedStates':
        if (typeof groups.UnitedStates == 'undefined') {
          groups.UnitedStates = new groups.SatGroup('countryRegex', /US/);
        }
        break;
    }
    _groupSelected(groupName);
  });
  $('#constellation-menu>ul>li').click(function () {
    var groupName = $(this).data('group');
    switch (groupName) {
      case 'SpaceStations':
        if (typeof groups.SpaceStations == 'undefined') {
          groups.SpaceStations = new groups.SatGroup('objNum', [25544, 41765]);
        }
        break;
      case 'GlonassGroup':
        if (typeof groups.GlonassGroup == 'undefined') {
          groups.GlonassGroup = new groups.SatGroup('nameRegex', /GLONASS/);
        }
        break;
      case 'GalileoGroup':
        if (typeof groups.GalileoGroup == 'undefined') {
          groups.GalileoGroup = new groups.SatGroup('nameRegex', /GALILEO/);
        }
        break;
      case 'GPSGroup':
        if (typeof groups.GPSGroup == 'undefined') {
          groups.GPSGroup = new groups.SatGroup('nameRegex', /NAVSTAR/);
        }
        break;
      case 'AmatuerRadio':
        if (typeof groups.AmatuerRadio == 'undefined') {
          groups.AmatuerRadio = new groups.SatGroup('objNum', [7530, 14781, 20442, 22826, 24278, 25338, 25397, 25544, 26931,
            27607, 27844, 27848, 28895, 32785, 32788, 32789, 32791, 33493, 33498, 33499, 35932, 35933, 35935, 37224,
            37839, 37841, 37855, 38760, 39090, 39134, 39136, 39161, 39417, 39430, 39436, 39439, 39440, 39444, 39469,
            39770, 40014, 40021, 40024, 40025, 40030, 40032, 40042, 40043, 40057, 40071, 40074, 40377, 40378, 40379,
            40380, 40654, 40719, 40900, 40903, 40906, 40907, 40908, 40910, 40911, 40912, 40926, 40927, 40928, 40931,
            40967, 40968, 41168, 41171, 41340, 41459, 41460, 41465, 41474, 41600, 41619, 41789, 41932, 41935, 42017]);
        }
        break;
      case 'MilitarySatellites':
        if (typeof groups.MilitarySatellites == 'undefined') {
          // SCC#s based on Uninon of Concerned Scientists
          groups.MilitarySatellites = new groups.SatGroup('objNum', [40420, 41394, 32783, 35943, 36582, 40353, 40555, 41032, 38010, 38008, 38007, 38009,
            37806, 41121, 41579, 39030, 39234, 28492, 36124, 39194, 36095, 40358, 40258, 37212,
            37398, 38995, 40296, 40900, 39650, 27434, 31601, 36608, 28380, 28521, 36519, 39177,
            40699, 34264, 36358, 39375, 38248, 34807, 28908, 32954, 32955, 32956, 35498, 35500,
            37152, 37154, 38733, 39057, 39058, 39059, 39483, 39484, 39485, 39761, 39762, 39763,
            40920, 40921, 40922, 39765, 29658, 31797, 32283, 32750, 33244, 39208, 26694, 40614,
            20776, 25639, 26695, 30794, 32294, 33055, 39034, 28946, 33751, 33752, 27056, 27057,
            27464, 27465, 27868, 27869, 28419, 28420, 28885, 29273, 32476, 31792, 36834, 37165,
            37875, 37941, 38257, 38354, 39011, 39012, 39013, 39239, 39240, 39241, 39363, 39410,
            40109, 40111, 40143, 40275, 40305, 40310, 40338, 40339, 40340, 40362, 40878, 41026,
            41038, 41473, 28470, 37804, 37234, 29398, 40110, 39209, 39210, 36596]);
        }
        break;
    }
    _groupSelected(groupName);
    searchBox.doSearch($('#search').val());
  });
  _groupSelected = function (groupName) {
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

    selectSat(-1); // Clear selected sat

    // Close Menus
    if (settingsManager.isMobileModeEnabled) mobile.searchToggle(true);
    uiController.hideSideMenus();
  };

  _resetSensorSelected = function () {
    // Return to default settings with nothing 'inview'
    satellite.setobs(null, true);
    satCruncher.postMessage({
      typ: 'offset',
      dat: (timeManager.propOffset).toString() + ' ' + (timeManager.propRate).toString(),
      setlatlong: true,
      resetObserverGd: true,
      sensor: satellite.defaultSensor,
    });
    satCruncher.postMessage({
      isShowFOVBubble: 'reset',
      isShowSurvFence: 'disable'
    });
    settingsManager.isFOVBubbleModeOn = false;
    settingsManager.isShowSurvFence = false;
    $('#menu-sensor-info').removeClass('bmenu-item-selected');
    $('#menu-fov-bubble').removeClass('bmenu-item-selected');
    $('#menu-surveillance').removeClass('bmenu-item-selected');
    $('#menu-lookangles').removeClass('bmenu-item-selected');
    $('#menu-planetarium').removeClass('bmenu-item-selected');
    $('#menu-sensor-info').addClass('bmenu-item-disabled');
    $('#menu-fov-bubble').addClass('bmenu-item-disabled');
    $('#menu-surveillance').addClass('bmenu-item-disabled');
    $('#menu-lookangles').addClass('bmenu-item-disabled');
    $('#menu-planetarium').addClass('bmenu-item-disabled');

    setTimeout(function(){ satSet.setColorScheme(ColorScheme.default, true); }, 1500);
  };

  _offlineMessage = function () {
    $('#loader-text').html('Please Contact Theodore Kruczek To Renew Your License <br> theodore.kruczek@gmail.com');
    // ga('send', 'event', 'Expired Offline Software', settingsManager.offlineLocation, 'Expired');
  };

  var isFooterShown = true;
  uiController.footerToggle = function () {
    if (isFooterShown) {
      isFooterShown = false;
      // uiController.hideSideMenus();
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

  uiController.startLowPerf = function () {
    window.location.replace("index.htm?lowperf");
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
        $('#map-look' + i).tooltip({delay: 50, html: satellite.map(sat, i).time, position: 'top'});
      } else {
        $('#map-look' + i).tooltip({delay: 50, html: satellite.map(sat, i).time, position: 'bottom'});
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
