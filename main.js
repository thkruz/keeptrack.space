/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2017, Theodore Kruczek
main.js is the primary javascript file for keeptrack.space. It manages all user
interaction with the application.
http://keeptrack.space

Unless otherwise noted, all of the code contained within is Copyright © 2016-2017
by Theodore Kruczek. All rights reserved. No part of this web site may be reproduced,
published, distributed, displayed, performed, copied or stored for public or private
use in any information retrieval system, or transmitted in any form by any mechanical,
photographic or electronic process, including electronically or digitally on the
Internet or World Wide Web, or over any network, or local area network, without
written permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

Thank you for respecting the intellectual property rights protected by the copyright
laws of the United States and International Copyright Treaty.

///////////////////////////////////////////////////////////////////////////// */

/* /////////////////////////////////////////////////////////////////////////////

                                INDEX OF CODE
1 - main
2 - shader-loader
3 - color-scheme
4 - groups
5 - search-box
6 - orbit-display
7 - line
8 - earth
9 - sun
10 - sat

///////////////////////////////////////////////////////////////////////////// */

/* global

    satSet
    searchBox
    shaderData
    $
    satellite
    Image
    ColorScheme
    orbitDisplay
    shaderLoader
    sun
    SunCalc
    earth
    groups
    mat3
    mat4
    vec3
    vec4
    Worker
    requestAnimationFrame

*/

// **** 1 - main ***

// Constants
var ZOOM_EXP = 3;
var DIST_MIN = 6800;
var DIST_MAX = 200000;
var RADIUS_OF_EARTH = 6371.0;
// var maxOrbitsDisplayed = 100; // Used in sat.js and orbit-display.js TODO: issues:23 Add settings option to change maxOrbitsDisplayed

var satCruncher;
var gl;

// Time Variables
var propRealTime = Date.now(); // actual time we're running it
var propOffset = 0.0; // offset we're propagating to, msec
var propRate = 1.0; // time rate multiplier for propagation
var propFrozen = Date.now(); // for when propRate 0
var time; // Only used in drawLoop function

// Camera Variables
var R2D = 180 / Math.PI;
var camYaw = 0;
var camPitch = 0.5;
var camYawTarget = 0;
var camPitchTarget = 0;
var camSnapMode = false;
var camZoomSnappedOnSat = false;
var camAngleSnappedOnSat = false;
var zoomLevel = 0.5;
var zoomTarget = 0.5;
var camPitchSpeed = 0;
var camYawSpeed = 0;

// SOCRATES Variables
var socratesObjOne = []; // Array for tr containing CATNR1
var socratesObjTwo = []; // Array for tr containing CATNR2

var whichRadar = '';
var isBottomIconsEnabled = false;
var isLookanglesMenuOpen = false;
var isLookanglesMultiSiteMenuOpen = false;
var isTwitterMenuOpen = false;
var isWeatherMenuOpen = false;
var isSpaceWeatherMenuOpen = false;
var isFindByLooksMenuOpen = false;
var isSensorInfoMenuOpen = false;
var isLaunchMenuOpen = false;
var isBottomMenuOpen = false;
var isAboutSelected = false;
var isMilSatSelected = false;
var isSocratesMenuOpen = false;
var isSettingsMenuOpen = false;
var isEditSatMenuOpen = false;
var isNewLaunchMenuOpen = false;
var isCustomSensorMenuOpen = false;
var isEditTime = false;
var isShowNextPass = false;
var isOnlyFOVChecked = false;

var otherSatelliteTransparency = 0.1;

var lastBoxUpdateTime = 0;

var pickFb, pickTex;
var pickColorBuf;

var pMatrix = mat4.create();
var camMatrix = mat4.create();

var selectedSat = -1;

var mouseX = 0;
var mouseY = 0;
var mouseSat = -1;

var dragPoint = [0, 0, 0];
var screenDragPoint = [0, 0];
var dragStartPitch = 0;
var dragStartYaw = 0;
var isDragging = false;
var dragHasMoved = false;

var rotateTheEarth = true; // Set to False to disable initial rotation
var rotateTheEarthSpeed = 0.000075; // Adjust to change camera speed when rotating around earth

// var debugContext, debugImageData;
// var debugLine, debugLine2, debugLine3;
// var spinner;

$(document).ready(function () { // Code Once index.php is loaded
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

  $('#search-results').perfectScrollbar();

  var resizing = false;

  $(window).resize(function () {
    if (!resizing) {
      window.setTimeout(function () {
        resizing = false;
        webGlInit();
      }, 500);
    }
    resizing = true;
  });

  webGlInit();
  earth.init();
  ColorScheme.init();
  satSet.init(function (satData) {
    orbitDisplay.init();
    groups.init();
    searchBox.init(satData);

    // debugLine = new Line();
    // debugLine2 = new Line();
    // debugLine3 = new Line();
  });

  $('#datetime-input-tb').datetimepicker({
    dateFormat: 'yy-mm-dd',
    timeFormat: 'HH:mm:ss',
    timezone: '+0000',
    minDate: -14, // No more than 7 days in the past
    maxDate: 14 }).on('change.dp', function (e) { // or 7 days in the future to make sure ELSETs are valid
      $('#datetime-input').fadeOut();
      $('#datetime-text').fadeIn();
      isEditTime = false;
    });

  satSet.onCruncherReady(function (satData) {
    // do querystring stuff
    var queryStr = window.location.search.substring(1);
    var params = queryStr.split('&');
    for (var i = 0; i < params.length; i++) {
      var key = params[i].split('=')[0];
      var val = params[i].split('=')[1];
      switch (key) {
        case 'intldes':
          // console.log('url snapping to ' + val);
          var urlSatId = satSet.getIdFromIntlDes(val.toUpperCase());
          if (urlSatId !== null) {
            selectSat(urlSatId);
          }
          break;
        case 'search':
          // console.log('preloading search to ' + val);
          searchBox.doSearch(val);
          $('#search').val(val);
          break;
        case 'rate':
          val = Math.min(val, 1000);
          // could run time backwards, but let's not!
          val = Math.max(val, 0.0);
          // console.log('propagating at rate ' + val + ' x real time ');
          propRate = Number(val);
          satCruncher.postMessage({
            typ: 'offset',
            dat: (propOffset).toString() + ' ' + (propRate).toString()
          });
          break;
        case 'hrs':
          // console.log('propagating at offset ' + val + ' hrs');
          // offset is in msec
          propOffset = Number(val) * 3600 * 1000;
          satCruncher.postMessage({
            typ: 'offset',
            dat: (propOffset).toString() + ' ' + (propRate).toString()
          });
          break;
      }
    }

    searchBox.init(satData);
    satSet.satDataString = null; // Clears stringified json file and clears 7MB of memory.
  });

  $('#canvas').on('touchmove', function (evt) {
    evt.preventDefault();
    if (isDragging && screenDragPoint[0] !== evt.originalEvent.touches[0].clientX && screenDragPoint[1] !== evt.originalEvent.touches[0].clientY) {
      dragHasMoved = true;
      camAngleSnappedOnSat = false;
      camZoomSnappedOnSat = false;
    }
    mouseX = evt.originalEvent.touches[0].clientX;
    mouseY = evt.originalEvent.touches[0].clientY;
  });

  $('#canvas').mousemove(function (evt) {
    if (isDragging && screenDragPoint[0] !== evt.clientX && screenDragPoint[1] !== evt.clientY) {
      dragHasMoved = true;
      camAngleSnappedOnSat = false;
      camZoomSnappedOnSat = false;
    }
    mouseX = evt.clientX;
    mouseY = evt.clientY;
  });

  $('#canvas').on('wheel', function (evt) {
    var delta = evt.originalEvent.deltaY;
    if (evt.originalEvent.deltaMode === 1) {
      delta *= 33.3333333;
    }
    zoomTarget += delta * 0.0002;
    if (zoomTarget > 1) zoomTarget = 1;
    if (zoomTarget < 0) zoomTarget = 0;
    rotateTheEarth = false;
    camZoomSnappedOnSat = false;
  });

  $('#canvas').click(function (evt) {
    $.colorbox.close();
  });

  $(document).bind('cbox_closed', function () {
    if (isLaunchMenuOpen) {
      isLaunchMenuOpen = false;
      $('#menu-launches img').removeClass('bmenu-item-selected');
    }
  });

  $('#canvas').contextmenu(function () {
    return false; // stop right-click menu
  });

  $('#canvas').mousedown(function (evt) {
    // if(evt.which === 3) {//RMB
    dragPoint = getEarthScreenPoint(evt.clientX, evt.clientY);
    screenDragPoint = [evt.clientX, evt.clientY];
    dragStartPitch = camPitch;
    dragStartYaw = camYaw;
    // debugLine.set(dragPoint, getCamPos());
    isDragging = true;
    if ($(document).width() <= 992) {
      isDragging = false;
    }
    camSnapMode = false;
    rotateTheEarth = false;
    // }
  });

  $('#canvas').on('touchstart', function (evt) {
    var x = evt.originalEvent.touches[0].clientX;
    var y = evt.originalEvent.touches[0].clientY;
    dragPoint = getEarthScreenPoint(x, y);
    screenDragPoint = [x, y];
    if ($(document).width() <= 992) {
      console.log($(document).width());
    }
    dragStartPitch = camPitch;
    dragStartYaw = camYaw;
    // debugLine.set(dragPoint, getCamPos());
    isDragging = true;
    if ($(document).width() <= 992) {
      isDragging = false;
    }
    camSnapMode = false;
    rotateTheEarth = false;
  });

  $('#canvas').mouseup(function (evt) {
    // if(evt.which === 3) {//RMB
    if (!dragHasMoved) {
      var clickedSat = getSatIdFromCoord(evt.clientX, evt.clientY);
      if (clickedSat === -1 && evt.button === 2) { // Right Mouse Buttom Click
        // clearMenuCountries();
        $('#search').val('');
        searchBox.hideResults();
        isMilSatSelected = false;
        $('#menu-space-stations img').removeClass('bmenu-item-selected');
        $('#search-results').attr('style', 'max-height:100%;margin-bottom:-50px;');

        satSet.setColorScheme(ColorScheme.default);

        if (lookangles.sensorSelected()) {
          $('#menu-in-coverage img').removeClass('bmenu-item-disabled');
        }
      }
      selectSat(clickedSat);
    }
    dragHasMoved = false;
    isDragging = false;
    rotateTheEarth = false;
    // }
  });

  $('#canvas').on('touchend', function (evt) {
    dragHasMoved = false;
    isDragging = false;
    rotateTheEarth = false;
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
  });

  $('#zoom-in').click(function () {
    zoomTarget -= 0.04;
    if (zoomTarget < 0) zoomTarget = 0;
    rotateTheEarth = false;
    camZoomSnappedOnSat = false;
  });

  $('#zoom-out').click(function () {
    zoomTarget += 0.04;
    if (zoomTarget > 1) zoomTarget = 1;
    rotateTheEarth = false;
    camZoomSnappedOnSat = false;
  });
 //   debugContext = $('#debug-canvas')[0].getContext('2d');
 //   debugImageData = debugContext.createImageData(debugContext.canvas.width, debugContext.canvas.height);

  $('#bottom-menu').on('click', '.FOV-object', function (evt) {
    var objNum = $(this)['context']['textContent']; // TODO: Find correct code for this.
    objNum = objNum.slice(-5);
    var satId = satSet.getIdFromObjNum(objNum);
    if (satId !== null) {
      selectSat(satId);
    }
  });

  // USAF Radars
  $('#radar-beale').click(function () { // Select Beale's Radar Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 39.136064,
      long: -121.351237,
      hei: 0.060966, // TODO: Find correct height
      obsminaz: 126,
      obsmaxaz: 6,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 500,
      obsmaxrange: 5555
    });

    lookangles.setobs({
      lat: 39.136064,
      long: -121.351237,
      hei: 0.060966, // TODO: Find correct height
      obsminaz: 126,
      obsmaxaz: 6,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 500,
      obsmaxrange: 5555
    });

    whichRadar = 'BLE';
    $('#sensor-info-title').html('Beale AFB');
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    camSnap(latToPitch(39.136064), longToYaw(-121.351237));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#radar-capecod').click(function () { // Select Cape Cod's Radar Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 41.754785,
      long: -70.539151,
      hei: 0.060966,
      obsminaz: 347,
      obsmaxaz: 227,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 500,
      obsmaxrange: 5555
    });

    lookangles.setobs({
      lat: 41.754785,
      long: -70.539151,
      hei: 0.060966,
      obsminaz: 347,
      obsmaxaz: 227,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 500,
      obsmaxrange: 5555
    });

    $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html'>Cape Cod AFS</a>");
    $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    whichRadar = 'COD';
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    camSnap(latToPitch(41.754785), longToYaw(-70.539151));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#radar-clear').click(function () { // Select Clear's Radar Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 64.290556,
      long: -149.186944,
      hei: 0.060966,
      obsminaz: 184,
      obsmaxaz: 64,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 500,
      obsmaxrange: 4910
    });

    lookangles.setobs({
      lat: 64.290556,
      long: -149.186944,
      hei: 0.060966,
      obsminaz: 184,
      obsmaxaz: 64,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 500,
      obsmaxrange: 4910
    });

    whichRadar = 'CLR';
    $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html'>Clear AFS</a>");
    $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    camSnap(latToPitch(64.290556), longToYaw(-149.186944));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#radar-eglin').click(function () { // Select Clear's Radar Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 30.572411,
      long: -86.214836,
      hei: 0.060966, // TODO: Confirm Altitude
      obsminaz: 120,
      obsmaxaz: 240,
      obsminel: 3,
      obsmaxel: 105,
      obsminrange: 500,
      obsmaxrange: 50000
    });

    lookangles.setobs({
      lat: 30.572411,
      long: -86.214836,
      hei: 0.060966, // TODO: Confirm Altitude
      obsminaz: 120,
      obsmaxaz: 240,
      obsminel: 3,
      obsmaxel: 105,
      obsminrange: 500,
      obsmaxrange: 50000
    });

    whichRadar = 'EGL';
    $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte002.en.html'>Eglin AFB</a>");
    $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    camSnap(latToPitch(30.572411), longToYaw(-86.214836));
    changeZoom('geo');
    lookangles.getsensorinfo();
  });
  $('#radar-fylingdales').click(function () { // Select Fylingdales's Radar Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 54.361758,
      long: -0.670051,
      hei: 0.060966, // TODO: Find correct height
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 500,
      obsmaxrange: 4820
    });

    lookangles.setobs({
      lat: 54.361758,
      long: -0.670051,
      hei: 0.060966, // TODO: Find correct height
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 500,
      obsmaxrange: 4820
    });

    whichRadar = 'FYL';
    $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html'>RAF Fylingdales</a>");
    $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
    $('#sensor-country').html('United Kingdom');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    camSnap(latToPitch(54.361758), longToYaw(-0.670051));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#radar-parcs').click(function () { // Select PARCS' Radar Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 48.724567,
      long: -97.899755,
      hei: 0.060966, // TODO: Find correct height
      obsminaz: 298,
      obsmaxaz: 78,
      obsminel: 1.9,
      obsmaxel: 95,
      obsminrange: 500,
      obsmaxrange: 3300 // TODO: Double check this
    });

    lookangles.setobs({
      lat: 48.724567,
      long: -97.899755,
      hei: 0.060966, // TODO: Find correct height
      obsminaz: 298,
      obsmaxaz: 78,
      obsminel: 1.9,
      obsmaxel: 95,
      obsminrange: 500,
      obsmaxrange: 3300 // TODO: Double check this
    });

    whichRadar = 'PAR';
    $('#sensor-info-title').html("<a class='iframe' href='https://mostlymissiledefense.com/2012/04/12/parcs-cavalier-radar-april-12-2012/'>Cavalier AFS</a>");
    $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    camSnap(latToPitch(48.724567), longToYaw(-97.899755));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#radar-thule').click(function () { // Select Thule's Radar Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 76.570322,
      long: -68.299211,
      hei: 0.060966, // TODO: Find correct height
      obsminaz: 297,
      obsmaxaz: 177,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 500,
      obsmaxrange: 5555
    });

    lookangles.setobs({
      lat: 76.570322,
      long: -68.299211,
      hei: 0.060966, // TODO: Find correct height
      obsminaz: 297,
      obsmaxaz: 177,
      obsminel: 3,
      obsmaxel: 85,
      obsminrange: 500,
      obsmaxrange: 5555
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte004.en.html'>Thule AFB</a>");
    $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    // No Weather
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(76.570322), longToYaw(-68.299211));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });

  // US Contributing Radars
  $('#radar-altair').click(function () { // Select Altair's Radar Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 8.716667,
      long: 167.733333,
      hei: 0,
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 1,
      obsmaxel: 90,
      obsminrange: 500,
      obsmaxrange: 50000
    });

    lookangles.setobs({
      lat: 8.716667,
      long: 167.733333,
      hei: 0,
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 1,
      obsmaxel: 90,
      obsminrange: 500,
      obsmaxrange: 50000
    });

    whichRadar = '';
    $('#sensor-info-title').html("<a class='iframe' href='http://www.radartutorial.eu/19.kartei/01.oth/karte005.en.html'>ALTAIR</a>");
    $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Mechanical');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    camSnap(latToPitch(8.716667), longToYaw(167.733333));
    changeZoom('geo');
    lookangles.getsensorinfo();
  });
  $('#radar-millstone').click(function () { // Select Millstone's Radar Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 42.6233,
      long: -71.4882,
      hei: 0.131,
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 1,
      obsmaxel: 90,
      obsminrange: 500,
      obsmaxrange: 50000
    });

    lookangles.setobs({
      lat: 42.6233,
      long: -71.4882,
      hei: 0.131,
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 1,
      obsmaxel: 90,
      obsminrange: 500,
      obsmaxrange: 50000
    });

    whichRadar = 'MIL';
    $('#sensor-info-title').html("<a class='iframe' href='https://mostlymissiledefense.com/2012/05/05/space-surveillance-sensors-millstone-hill-radar/'>Millstone Hill Steerable Antenna</a>");
    $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Mechanical');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    camSnap(latToPitch(42.6233), longToYaw(-71.4882));
    changeZoom('geo');
    lookangles.getsensorinfo();
  });

  // Optical
  $('#optical-diego-garcia').click(function () { // Select Diego Garcia's Optical Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: -7.296480,
      long: 72.390153,
      hei: 0.0,
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 20,
      obsmaxel: 90,
      obsminrange: 20000,
      obsmaxrange: 500000
    });

    lookangles.setobs({
      lat: -7.296480,
      long: 72.390153,
      hei: 0.0,
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 20,
      obsmaxel: 90,
      obsminrange: 20000,
      obsmaxrange: 500000
    });

    whichRadar = 'DGC';
    $('#sensor-info-title').html("<a class='iframe' href='https://mostlymissiledefense.com/2012/08/20/space-surveillance-sensors-geodss-ground-based-electro-optical-deep-space-surveillance-system-august-20-2012/'>Diego Garcia GEODSS</a>");
    $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');

    $('#menu-weather img').removeClass('bmenu-item-disabled');
    camSnap(latToPitch(-7.296480), longToYaw(72.390153));
    changeZoom('geo');
    lookangles.getsensorinfo();
  });
  $('#optical-maui').click(function () { // Select Maui's Optical Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 20.708350,
      long: -156.257595,
      hei: 3.0,
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 20,
      obsmaxel: 90,
      obsminrange: 20000,
      obsmaxrange: 500000
    });

    lookangles.setobs({
      lat: 20.708350,
      long: -156.257595,
      hei: 3.0,
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 20,
      obsmaxel: 90,
      obsminrange: 20000,
      obsmaxrange: 500000
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('Maui GEODSS');
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Optical');
    // No Weather
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(20.708350), longToYaw(-156.257595));
    changeZoom('geo');
    lookangles.getsensorinfo();
  });
  $('#optical-socorro').click(function () { // Select Socorro's Optical Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 33.817233,
      long: -106.659961,
      hei: 1.24,
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 20,
      obsmaxel: 90,
      obsminrange: 20000,
      obsmaxrange: 500000
    });

    lookangles.setobs({
      lat: 33.817233,
      long: -106.659961,
      hei: 1.24,
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 20,
      obsmaxel: 90,
      obsminrange: 20000,
      obsmaxrange: 500000
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('Socorro GEODSS');
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Optical');
    // No Weather
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(33.817233), longToYaw(-106.659961));
    changeZoom('geo');
    lookangles.getsensorinfo();
  });
  $('#optical-spain').click(function () { // Select Spain's Optical Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 37.166962, // ENHANCEMENT: Verify this information.
      long: -5.600839, // ENHANCEMENT: Verify this information.
      hei: 0.5, // ENHANCEMENT: Verify this information.
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 20,
      obsmaxel: 90,
      obsminrange: 20000,
      obsmaxrange: 500000
    });

    lookangles.setobs({
      lat: 37.166962, // ENHANCEMENT: Verify this information.
      long: -5.600839, // ENHANCEMENT: Verify this information.
      hei: 0.5, // ENHANCEMENT: Verify this information.
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 20,
      obsmaxel: 90,
      obsminrange: 20000,
      obsmaxrange: 500000
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('Moron Air Base');
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Optical');
    // No Weather
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(37.166962), longToYaw(-5.600839));
    changeZoom('geo');
    lookangles.getsensorinfo();
  });

  // Russian Radars
  $('#russian-armavir').click(function () {
    satCruncher.postMessage({ // Send SatCruncher File information on this radar
      typ: 'offset', // Tell satcruncher to update something
      dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
      setlatlong: true, // Tell satcruncher we are changing observer location
      lat: 44.925106,
      long: 40.983894,
      hei: 0.0,
      obsminaz: 55, // All Information via russianforces.org
      obsmaxaz: 295,
      obsminel: 2,
      obsmaxel: 60,
      obsminrange: 100,
      obsmaxrange: 4200
    });

    lookangles.setobs({
      lat: 44.925106,
      long: 40.983894,
      hei: 0.0,
      obsminaz: 55, // All Information via russianforces.org
      obsmaxaz: 295,
      obsminel: 2,
      obsmaxel: 60,
      obsminrange: 100,
      obsmaxrange: 4200
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('Armavir Radar Station');
    $('#sensor-country').html('Russia');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(44.925106), longToYaw(40.983894));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#russian-balkhash').click(function () {
    satCruncher.postMessage({ // Send SatCruncher File information on this radar
      typ: 'offset', // Tell satcruncher to update something
      dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
      setlatlong: true, // Tell satcruncher we are changing observer location
      lat: 46.603076,
      long: 74.530985,
      hei: 0.0,
      obsminaz: 91, // All Information via russianforces.org
      obsmaxaz: 151,
      obsminel: 5.5,
      obsmaxel: 34.5,
      obsminrange: 385,
      obsmaxrange: 4600
    });

    lookangles.setobs({
      lat: 46.603076,
      long: 74.530985,
      hei: 0.0,
      obsminaz: 91, // All Information via russianforces.org
      obsmaxaz: 151,
      obsminel: 5.5,
      obsmaxel: 34.5,
      obsminrange: 385,
      obsmaxrange: 4600
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('Balkhash Radar Station');
    $('#sensor-country').html('Russia');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(46.603076), longToYaw(74.530985));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#russian-gantsevichi').click(function () {
    satCruncher.postMessage({ // Send SatCruncher File information on this radar
      typ: 'offset', // Tell satcruncher to update something
      dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
      setlatlong: true, // Tell satcruncher we are changing observer location
      lat: 52.850000,
      long: 26.480000,
      hei: 0.0,
      obsminaz: 190, // All Information via russianforces.org
      obsmaxaz: 310,
      obsminel: 3,
      obsmaxel: 80,
      obsminrange: 300,
      obsmaxrange: 6500
    });

    lookangles.setobs({
      lat: 52.850000,
      long: 26.480000,
      hei: 0.0,
      obsminaz: 190, // All Information via russianforces.org
      obsmaxaz: 310,
      obsminel: 3,
      obsmaxel: 80,
      obsminrange: 300,
      obsmaxrange: 6500
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('Gantsevichi Radar Station');
    $('#sensor-country').html('Russia');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(52.850000), longToYaw(26.480000));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#russian-lekhtusi').click(function () {
    satCruncher.postMessage({ // Send SatCruncher File information on this radar
      typ: 'offset', // Tell satcruncher to update something
      dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
      setlatlong: true, // Tell satcruncher we are changing observer location
      lat: 60.275458,
      long: 30.546017,
      hei: 0.0,
      obsminaz: 245, // All Information via russianforces.org
      obsmaxaz: 355,
      obsminel: 2,
      obsmaxel: 70,
      obsminrange: 100,
      obsmaxrange: 4200
    });

    lookangles.setobs({
      lat: 60.275458,
      long: 30.546017,
      hei: 0.0,
      obsminaz: 245,
      obsmaxaz: 355,
      obsminel: 2,
      obsmaxel: 70,
      obsminrange: 100,
      obsmaxrange: 4200
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('Lehktusi Radar Station');
    $('#sensor-country').html('Russia');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(60.275458), longToYaw(30.546017));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#russian-mishelevka-d').click(function () {
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 52.855500,
      long: 103.231700,
      hei: 0.0,
      obsminaz: 41, // All Information via russianforces.org
      obsmaxaz: 219,
      obsminel: 5.5,
      obsmaxel: 34.5,
      obsminrange: 250,
      obsmaxrange: 4600
    });

    lookangles.setobs({
      lat: 52.855500,
      long: 103.231700,
      hei: 0.0,
      obsminaz: 41, // All Information via russianforces.org
      obsmaxaz: 219,
      obsminel: 5.5,
      obsmaxel: 34.5,
      obsminrange: 250,
      obsmaxrange: 4600
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('Mishelevka Radar Station');
    $('#sensor-country').html('Russia');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(52.855500), longToYaw(103.231700));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#russian-olenegorsk').click(function () {
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 68.114100,
      long: 33.910200,
      hei: 0.0,
      obsminaz: 280, // All Information via russianforces.org
      obsmaxaz: 340,
      obsminel: 5.5,
      obsmaxel: 34.5,
      obsminrange: 250,
      obsmaxrange: 4600
    });

    lookangles.setobs({
      lat: 68.114100,
      long: 33.910200,
      hei: 0.0,
      obsminaz: 280, // All Information via russianforces.org
      obsmaxaz: 340,
      obsminel: 5.5,
      obsmaxel: 34.5,
      obsminrange: 250,
      obsmaxrange: 4600
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('Olenegorsk Radar Station');
    $('#sensor-country').html('Russia');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(68.114100), longToYaw(33.910200));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#russian-pechora').click(function () {
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 65.210000,
      long: 57.295000,
      hei: 0.0,
      obsminaz: 305, // All Information via russianforces.org
      obsmaxaz: 55,
      obsminel: 2,
      obsmaxel: 55,
      obsminrange: 300,
      obsmaxrange: 7200
    });

    lookangles.setobs({
      lat: 65.210000,
      long: 57.295000,
      hei: 0.0,
      obsminaz: 305, // All Information via russianforces.org
      obsmaxaz: 55,
      obsminel: 2,
      obsmaxel: 55,
      obsminrange: 300,
      obsmaxrange: 7200
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('Pechora Radar Station');
    $('#sensor-country').html('Russia');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(65.210000), longToYaw(57.295000));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });
  $('#russian-pionersky').click(function () {
    satCruncher.postMessage({ // Send SatCruncher File information on this radar
      typ: 'offset', // Tell satcruncher to update something
      dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
      setlatlong: true, // Tell satcruncher we are changing observer location
      lat: 54.857294,
      long: 20.182350,
      hei: 0.0,
      obsminaz: 187.5, // All Information via russianforces.org
      obsmaxaz: 292.5,
      obsminel: 2,
      obsmaxel: 60,
      obsminrange: 100,
      obsmaxrange: 4200
    });

    lookangles.setobs({
      lat: 54.857294,
      long: 20.182350,
      hei: 0.0,
      obsminaz: 187.5, // All Information via russianforces.org
      obsmaxaz: 292.5,
      obsminel: 2,
      obsmaxel: 60,
      obsminrange: 100,
      obsmaxrange: 4200
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('Armavir Radar Station');
    $('#sensor-country').html('Russia');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(54.857294), longToYaw(20.182350));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });

  // Chinese Radars
  $('#chinese-xuanhua').click(function () {
    satCruncher.postMessage({ // Send SatCruncher File information on this radar
      typ: 'offset', // Tell satcruncher to update something
      dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
      setlatlong: true, // Tell satcruncher we are changing observer location
      lat: 40.446944,
      long: 115.116389,
      hei: 1.6,
      obsminaz: 300,    // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
      obsmaxaz: 60,     // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
      obsminel: 2,      // Information via globalsecurity.org
      obsmaxel: 80,     // Information via globalsecurity.org
      obsminrange: 300, // TODO: Verify
      obsmaxrange: 3000 // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
    });

    lookangles.setobs({
      lat: 40.446944,
      long: 115.116389,
      hei: 1.6,
      obsminaz: 300,    // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
      obsmaxaz: 60,     // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
      obsminel: 2,      // Information via globalsecurity.org
      obsmaxel: 80,     // Information via globalsecurity.org
      obsminrange: 300, // TODO: Verify
      obsmaxrange: 3000 // Information via global ssa sensors amos 2010.pdf (sinodefence.com/special/airdefense/project640.asp)
    });

    whichRadar = ''; // Disables Weather Menu from Opening
    $('#sensor-info-title').html('7010 Large Phased Array Radar (LPAR)');
    $('#sensor-country').html('China');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').addClass('bmenu-item-disabled');
    camSnap(latToPitch(40.446944), longToYaw(115.116389));
    changeZoom('leo');
    lookangles.getsensorinfo();
  });

  $('.sensor-selected').click(function () {
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');
    if (selectedSat !== -1) {
      $('#menu-lookangles img').removeClass('bmenu-item-disabled');
    }
    $('#menu-in-coverage img').removeClass('bmenu-item-disabled');
  });

  $('#datetime-input-form').change(function (e) {
    var selectedDate = $('#datetime-input-tb').datepicker('getDate');
    var today = new Date();
    propOffset = selectedDate - today;
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (1.0).toString()
    });
    propRealTime = Date.now();
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
    satSet.searchAzElRange(fblAzimuth, fblElevation, fblRange, fblInc, fblAzimuthM, fblElevationM, fblRangeM, fblIncM, fblPeriod, fblPeriodM);
    e.preventDefault();
  });
  $('#settings-form').submit(function (e) {
    var isResetSensorChecked = document.getElementById('settings-resetSensor').checked;
    var isHOSChecked = document.getElementById('settings-hos').checked;
    isOnlyFOVChecked = document.getElementById('settings-onlyfov').checked;
    var isSNPChecked = document.getElementById('settings-snp').checked;
    if (isResetSensorChecked) {
      // Return to default settings with nothing 'inview'
      satCruncher.postMessage({
        typ: 'offset',
        dat: (propOffset).toString() + ' ' + (propRate).toString(),
        setlatlong: true,
        lat: 0,
        long: 0,
        hei: 0,
        obsminaz: 0,
        obsmaxaz: 0,
        obsminel: 0,
        obsmaxel: 0,
        obsminrange: 0,
        obsmaxrange: 0
      });
      lookangles.setobs({
        lat: null,
        long: 0,
        hei: 0,
        obsminaz: 0,
        obsmaxaz: 0,
        obsminel: 0,
        obsmaxel: 0,
        obsminrange: undefined,
        obsmaxrange: undefined
      });
      whichRadar = ''; // Disable Weather
      $('#menu-sensor-info img').addClass('bmenu-item-disabled');
      $('#menu-in-coverage img').addClass('bmenu-item-disabled');
      $('#menu-lookangles img').addClass('bmenu-item-disabled');
      $('#menu-weather img').addClass('bmenu-item-disabled');
    }
    if (isHOSChecked) {
      otherSatelliteTransparency = 0;
    } else {
      otherSatelliteTransparency = 0.1;
    }
    if (isOnlyFOVChecked) {
      satSet.setColorScheme(ColorScheme.onlyFOV);
    }
    if (isSNPChecked) {
      isShowNextPass = true;
    } else {
      isShowNextPass = false;
    }
    document.getElementById('settings-resetSensor').checked = false;
    e.preventDefault();
  });

  $('#editSat').submit(function (e) {
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

    function pad (str, max) {
      return str.length < max ? pad(' ' + str, max) : str;
    }

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
    inc = pad(inc, 8);

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
    meanmo = pad(meanmo, 8);

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
    rasc = pad(rasc, 8);

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
    argPe = pad(argPe, 8);

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
    meana = pad(meana, 8);

    var epochyr = $('#es-year').val();
    var epochday = $('#es-day').val();

    var TLE1Ending = sat.TLE1.substr(32, 39);

    var TLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
    var TLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

    satCruncher.postMessage({
      typ: 'satEdit',
      id: satId,
      TLE1: TLE1,
      TLE2: TLE2
    });
    orbitDisplay.updateOrbitBuffer(satId, true, TLE1, TLE2);

    sat = satSet.getSat(satId);
    e.preventDefault();
  });

  $('#newLaunch').submit(function (e) {
    var scc = $('#nl-scc').val();
    var satId = satSet.getIdFromObjNum(scc);
    var sat = satSet.getSat(satId);
    // var intl = sat.INTLDES.trim();

    var upOrDown = $('#nl-updown').val();

    // TODO: Calculate current J-Day to change Epoch Date

    var launchFac = $('#nl-facility').val();
    launchFac = launchFac * 1; // Convert to number

    switch (launchFac) {
      // If Longitude is west then subtract from 360
      case 1: // Cape Canaveral
        var launchLat = 28.466;
        var launchLon = (360 - 80.558);
        break;
      case 2: // Vandenberg
        launchLat = 34.772;
        launchLon = (360 - 120.601);
        break;
      case 3: // Wallops
        launchLat = 37.846;
        launchLon = (360 - 75.479);
        break;
      case 4: // Kodiak
        launchLat = 57.435;
        launchLon = (360 - 152.339);
        break;
      case 5: // Baikonur
        launchLat = 45.955;
        launchLon = (63.350);
        break;
      case 6: // Plesetsk
        launchLat = 62.925;
        launchLon = (40.577);
        break;
      case 7: // Jiuquan SLC
        launchLat = 41.118;
        launchLon = (100.463);
        break;
      case 8: // Taiyuan SLC
        launchLat = 39.143;
        launchLon = (111.967);
        break;
      case 9: // Xichang
        launchLat = 28.246;
        launchLon = (102.028);
        break;
      case 10: // Wenchang
        launchLat = 19.614;
        launchLon = (110.951);
        break;
      case 11: // Tanegashima
        launchLat = 39.389;
        launchLon = (130.968);
        break;
      case 12: // Uchinoura
        launchLat = 31.251;
        launchLon = (131.079);
        break;
      case 13: // Koruou, French Guiana
        launchLat = 5.237;
        launchLon = (360 - 52.769);
        break;
      case 14: // Onenui Station, NZ
        launchLat = -39.260;
        launchLon = (177.865);
        break;
      case 15: // Sriharikota, India
        launchLat = 13.737;
        launchLon = (80.235);
        break;
      case 16: // Semnan, Iran
        launchLat = 35.234;
        launchLon = (53.920);
        break;
      case 20: // Sohae, North Korea
        launchLat = 39.665457;
        launchLon = 124.701897;
        break;
      case 21: // Tonghae, North Korea
        launchLat = 40.8555995;
        launchLon = 129.6660233;
        break;
      case 22: // AF Test Range, Palmachim, Israel
        launchLat = 31.897778;
        launchLon = 34.690556000000015;
        break;
    }

    // Set time to 0000z for relative time.

    var today = new Date(); // Need to know today for offset calculation
    var quadZTime = new Date(today.getFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0); // New Date object of the future collision
    // Date object defaults to local time.
    quadZTime.setUTCHours(0); // Move to UTC Hour

    propOffset = quadZTime - today; // Find the offset from today
    camSnapMode = false;
    satCruncher.postMessage({ // Tell satCruncher we have changed times for orbit calculations
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (1.0).toString()
    });

    var TLEs = lookangles.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, propOffset);

    var TLE1 = TLEs[0];
    var TLE2 = TLEs[1];

    satCruncher.postMessage({
      typ: 'satEdit',
      id: satId,
      TLE1: TLE1,
      TLE2: TLE2
    });
    orbitDisplay.updateOrbitBuffer(satId, true, TLE1, TLE2);

    sat = satSet.getSat(satId);
    e.preventDefault();
  });

  $('#customSensor').submit(function (e) {
    var lat = $('#cs-lat').val();
    var lon = $('#cs-lon').val();
    var hei = $('#cs-hei').val();
    var minaz = $('#cs-minaz').val();
    var maxaz = $('#cs-maxaz').val();
    var minel = $('#cs-minel').val();
    var maxel = $('#cs-maxel').val();
    var minrange = $('#cs-minrange').val();
    var maxrange = $('#cs-maxrange').val();

    satCruncher.postMessage({ // Send SatCruncher File information on this radar
      typ: 'offset', // Tell satcruncher to update something
      dat: (propOffset).toString() + ' ' + (propRate).toString(), // Tell satcruncher what time it is and how fast time is moving
      setlatlong: true, // Tell satcruncher we are changing observer location
      lat: lat,
      long: lon,
      hei: hei,
      obsminaz: minaz,
      obsmaxaz: maxaz,
      obsminel: minel,
      obsmaxel: maxel,
      obsminrange: minrange,
      obsmaxrange: maxrange
    });

    lookangles.setobs({
      lat: lat,
      long: lon,
      hei: hei,
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

  $('#canvas').on('keypress', keyHandler); // On Key Press Event Run keyHandler Function
  $('#bottom-icons').on('click', '.bmenu-item', bottomIconPress); // Bottom Button Pressed
  $('#canvas').attr('tabIndex', 0);
  $('#canvas').focus();

  drawLoop(); // kick off the animationFrame()s
});

function socrates (row) {
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
        tdT.appendChild(document.createTextNode(socratesDate[2] + ' ' + socratesDate[1] + ' ' + socratesDate[0] + ' - ' + pad(socratesTime[0], 2) + ':' +
        pad(socratesTime[1], 2) + ':' + pad(socratesTimeS[0], 2) + 'Z'));
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
    setTimeout(function () {
      selectSat(satSet.getIdFromObjNum(socratesObjOne[row][1])); // Select the first object listed in SOCRATES
    }, 1000); // Wait 1 second before selecting the sat because satcruncher updates on 1 second intervals
              // and will cause the camera to rotate twice
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
    propOffset = selectedDate - today; // Find the offset from today
    camSnapMode = false;
    satCruncher.postMessage({ // Tell satCruncher we have changed times for orbit calculations
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (1.0).toString()
    });
    propRealTime = Date.now(); // Reset realtime TODO: This might not be necessary...
  } // Allows passing -1 argument to socrates function to skip these steps
  function pad (str, max) {
    return str.length < max ? pad('0' + str, max) : str;
  }
}

$('#socrates-menu').on('click', '.socrates-object', function (evt) {
  var hiddenRow = $(this)['context']['attributes']['hiddenrow']['value']; // TODO: Find correct code for this.
  if (hiddenRow !== null) {
    socrates(hiddenRow);
  }
});

function keyHandler (evt) {
  var ratechange = false;
  // console.log(evt);
  switch (Number(evt.charCode)) {
    case 114: // r
      rotateTheEarth = !rotateTheEarth;
      // console.log('toggled rotation');
      break;
    case 66: // B
      if (isBottomMenuOpen) {
        $('#bottom-menu').fadeOut();
        isBottomMenuOpen = false;
        break;
      } else {
        $('#bottom-menu').fadeIn();
        isBottomMenuOpen = true;
        break;
      }
    case 76: // L
      if (isLaunchMenuOpen) {
        isLaunchMenuOpen = false;
        break;
      } else {
        hideSideMenus();
        $.colorbox({href: 'http://space.skyrocket.de/doc_chr/lau2017.htm', iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        isLaunchMenuOpen = true;
        break;
      }
    case 70: // F
      if (isFindByLooksMenuOpen) {
        $('#findByLooks-menu').fadeOut();
        isFindByLooksMenuOpen = false;
        break;
      } else {
        hideSideMenus();
        $('#findByLooks-menu').fadeIn();
        isFindByLooksMenuOpen = true;
        break;
      }
    case 84: // T
      if (isTwitterMenuOpen) {
        $('#twitter-menu').fadeOut();
        isTwitterMenuOpen = false;
        break;
      } else {
        hideSideMenus();
        $('#twitter-menu').fadeIn();
        isTwitterMenuOpen = true;
        break;
      }
    case 87: // W
      if (isWeatherMenuOpen) {
        $('#weather-menu').fadeOut();
        isWeatherMenuOpen = false;
        break;
      }
      if (!isWeatherMenuOpen && whichRadar !== '') {
        if (whichRadar === 'COD' || whichRadar === 'MIL') {
          $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/BOX_0.png');
        }
        if (whichRadar === 'EGL') {
          $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/EVX_0.png');
        }
        if (whichRadar === 'CLR') {
          $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/APD_0.png');
        }
        if (whichRadar === 'PAR') {
          $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/MVX_0.png');
        }
        if (whichRadar === 'BLE') {
          $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/DAX_0.png');
        }
        if (whichRadar === 'FYL') {
          $('#weather-image').attr('src', 'http://i.cdn.turner.com/cnn/.element/img/3.0/weather/maps/satuseurf.gif');
        }
        if (whichRadar === 'DGC') {
          $('#weather-image').attr('src', 'http://images.myforecast.com/images/cw/satellite/CentralAsia/CentralAsia.jpeg');
        }
        hideSideMenus();
        $('#weather-menu').fadeIn();
        isWeatherMenuOpen = true;
        break;
      }
      break;
    case 81: // Q
      if (isSpaceWeatherMenuOpen) {
        $('#space-weather-menu').fadeOut();
        isSpaceWeatherMenuOpen = false;
        break;
      }
      $('#space-weather-image').attr('src', 'http://services.swpc.noaa.gov/images/animations/ovation-north/latest.png');
      hideSideMenus();
      $('#space-weather-menu').fadeIn();
      isSpaceWeatherMenuOpen = true;
      break;
    case 83: // S
      if (isLookanglesMenuOpen) {
        $('#lookangles-menu').fadeOut();
        isLookanglesMenuOpen = false;
        break;
      } else {
        hideSideMenus();
        $('#lookangles-menu').fadeIn();
        isLookanglesMenuOpen = true;
        if (selectedSat !== -1) {
          var sat = satSet.getSat(selectedSat);
          lookangles.getlookanglesMultiSite(sat, isLookanglesMenuOpen);
        }
        break;
      }
    case 33: // !
      propOffset = 0; // Reset to Current Time
      ratechange = true;
      break;
    case 60: // <
      propOffset -= 60000; // Move back 60 seconds
      ratechange = true;
      break;
    case 62: // >
      propOffset += 60000; // Move forward 60 seconds
      ratechange = true;
      break;
    case 48: // 0
      propRate = 0;
      propFrozen = new Date();
      propOffset = getPropOffset();
      ratechange = true;
      break;
    case 43: // +
    case 61: // =
      if (propRate < 0.001 && propRate > -0.001) {
        propRate = 0.001;
      }

      if (propRate > 1000) {
        propRate = 1000;
      }

      if (propRate < 0) {
        propRate *= 0.666666;
      } else {
        propRate *= 1.5;
      }
      propOffset = getPropOffset();
      ratechange = true;
      break;
    case 45: // -
    case 95: // _
      if (propRate < 0.001 && propRate > -0.001) {
        propRate = -0.001;
      }

      if (propRate < -1000) {
        propRate = -1000;
      }

      if (propRate > 0) {
        propRate *= 0.666666;
      } else {
        propRate *= 1.5;
      }

      propOffset = getPropOffset();
      ratechange = true;
      break;
    case 49: // 1
      propRate = 1.0;
      propOffset = getPropOffset();
      ratechange = true;
      break;
  }
  function getPropOffset () {
    var selectedDate = $('#datetime-text').text().substr(0, 19);
    selectedDate = selectedDate.split(' ');
    selectedDate = new Date(selectedDate[0] + 'T' + selectedDate[1] + 'Z');
    var today = new Date();
    propOffset = selectedDate - today;// - (selectedDate.getTimezoneOffset() * 60 * 1000);
    // console.log(propOffset);
    return propOffset;
  }

  if (ratechange) {
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString()
    });
    propRealTime = Date.now();
  }
}
function hideSideMenus () {
  // Close any open colorboxes
  $.colorbox.close();

  // Hide all side menus
  $('#sensor-info-menu').fadeOut();
  $('#lookangles-menu').fadeOut();
  $('#lookanglesmultisite-menu').fadeOut();
  $('#findByLooks-menu').fadeOut();
  $('#twitter-menu').fadeOut();
  $('#weather-menu').fadeOut();
  $('#space-weather-menu').fadeOut();
  $('#socrates-menu').fadeOut();
  $('#settings-menu').fadeOut();
  $('#editSat-menu').fadeOut();
  $('#newLaunch-menu').fadeOut();
  $('#customSensor-menu').fadeOut();
  $('#about-menu').fadeOut();

  // Remove red color from all menu icons
  $('#menu-sensor-info img').removeClass('bmenu-item-selected');
  $('#menu-lookangles img').removeClass('bmenu-item-selected');
  $('#menu-lookanglesmultisite img').removeClass('bmenu-item-selected');
  $('#menu-launches img').removeClass('bmenu-item-selected');
  $('#menu-find-sat img').removeClass('bmenu-item-selected');
  $('#menu-twitter img').removeClass('bmenu-item-selected');
  $('#menu-weather img').removeClass('bmenu-item-selected');
  $('#menu-space-weather img').removeClass('bmenu-item-selected');
  $('#menu-satellite-collision img').removeClass('bmenu-item-selected');
  $('#menu-settings img').removeClass('bmenu-item-selected');
  $('#menu-editSat img').removeClass('bmenu-item-selected');
  $('#menu-newLaunch img').removeClass('bmenu-item-selected');
  $('#menu-customSensor img').removeClass('bmenu-item-selected');
  $('#menu-about img').removeClass('bmenu-item-selected');

  // Unflag all open menu variables
  isSensorInfoMenuOpen = false;
  isLaunchMenuOpen = false;
  isTwitterMenuOpen = false;
  isFindByLooksMenuOpen = false;
  isWeatherMenuOpen = false;
  isSpaceWeatherMenuOpen = false;
  isLookanglesMenuOpen = false;
  isLookanglesMultiSiteMenuOpen = false;
  isSocratesMenuOpen = false;
  isSettingsMenuOpen = false;
  isEditSatMenuOpen = false;
  isNewLaunchMenuOpen = false;
  isCustomSensorMenuOpen = false;
  isAboutSelected = false;
}
function bottomIconPress (evt) {
  if (isBottomIconsEnabled === false) { return; } // Exit if menu is disabled
  switch ($(this)['context']['id']) {
    case 'menu-sensor-info': // No Keyboard Commands
      if (whichRadar === '') { // No Sensor Selected
        if (!$('#menu-sensor-info img:animated').length) {
          $('#menu-sensor-info img').effect('shake', {distance: 10});
        }
        break;
      }
      if (isSensorInfoMenuOpen) {
        hideSideMenus();
        isSensorInfoMenuOpen = false;
        break;
      } else {
        hideSideMenus();
        lookangles.getsensorinfo();
        $('#sensor-info-menu').fadeIn();
        isSensorInfoMenuOpen = true;
        $('#menu-sensor-info img').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-in-coverage': // B
      if (lookangles.obslat == null) { // No Sensor Selected
        if (!$('#menu-in-coverage img:animated').length) {
          $('#menu-in-coverage img').effect('shake', {distance: 10});
        }
        break;
      }
      if (isBottomMenuOpen) {
        $('#bottom-menu').fadeOut();
        $('#menu-in-coverage img').removeClass('bmenu-item-selected');
        isBottomMenuOpen = false;
        break;
      } else {
        $('#bottom-menu').fadeIn();
        $('#menu-in-coverage img').addClass('bmenu-item-selected');
        isBottomMenuOpen = true;
        break;
      }
    case 'menu-lookangles': // S
      if (isLookanglesMenuOpen) {
        isLookanglesMenuOpen = false;
        hideSideMenus();
        break;
      } else {
        if (lookangles.obslat == null || selectedSat === -1) { // No Sensor or Satellite Selected
          if (!$('#menu-lookangles img:animated').length) {
            $('#menu-lookangles img').effect('shake', {distance: 10});
          }
          break;
        }
        hideSideMenus();
        $('#lookangles-menu').fadeIn();
        isLookanglesMenuOpen = true;
        $('#menu-lookangles img').addClass('bmenu-item-selected');
        if (selectedSat !== -1) {
          var sat = satSet.getSat(selectedSat);
          lookangles.getlookangles(sat, isLookanglesMenuOpen);
        }
        break;
      }
    case 'menu-lookanglesmultisite':
      if (isLookanglesMultiSiteMenuOpen) {
        isLookanglesMultiSiteMenuOpen = false;
        hideSideMenus();
        break;
      } else {
        if (selectedSat === -1) { // No Satellite Selected
          if (!$('#menu-lookanglesmultisite img:animated').length) {
            $('#menu-lookanglesmultisite img').effect('shake', {distance: 10});
          }
          break;
        }
        hideSideMenus();
        $('#lookanglesmultisite-menu').fadeIn();
        isLookanglesMultiSiteMenuOpen = true;
        $('#menu-lookanglesmultisite img').addClass('bmenu-item-selected');
        if (selectedSat !== -1) {
          sat = satSet.getSat(selectedSat);
          lookangles.getlookanglesMultiSite(sat, isLookanglesMultiSiteMenuOpen);
        }
        break;
      }
    case 'menu-find-sat': // F
      if (isFindByLooksMenuOpen) {
        isFindByLooksMenuOpen = false;
        hideSideMenus();
        break;
      } else {
        hideSideMenus();
        $('#findByLooks-menu').fadeIn();
        isFindByLooksMenuOpen = true;
        $('#menu-find-sat img').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-twitter': // T
      if (isTwitterMenuOpen) {
        isTwitterMenuOpen = false;
        hideSideMenus();
        break;
      } else {
        hideSideMenus();
        if ($('#twitter-menu').is(':empty')) {
          $('#twitter-menu').html('<a class="twitter-timeline" data-theme="dark" data-link-color="#2B7BB9" href="https://twitter.com/RedKosmonaut/lists/space-news">A Twitter List by RedKosmonaut</a> <script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>');
        }
        $('#twitter-menu').fadeIn();
        isTwitterMenuOpen = true;
        $('#menu-twitter img').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-weather': // W
      if (isWeatherMenuOpen) {
        isWeatherMenuOpen = false;
        hideSideMenus();
        break;
      }
      if (!isWeatherMenuOpen && whichRadar !== '') {
        if (whichRadar === 'COD' || whichRadar === 'MIL') {
          $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/BOX_0.png');
        }
        if (whichRadar === 'EGL') {
          $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/EVX_0.png');
        }
        if (whichRadar === 'CLR') {
          $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/APD_0.png');
        }
        if (whichRadar === 'PAR') {
          $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/MVX_0.png');
        }
        if (whichRadar === 'BLE') {
          $('#weather-image').attr('src', 'http://radar.weather.gov/lite/NCR/DAX_0.png');
        }
        if (whichRadar === 'FYL') {
          $('#weather-image').attr('src', 'http://i.cdn.turner.com/cnn/.element/img/3.0/weather/maps/satuseurf.gif');
        }
        if (whichRadar === 'DGC') {
          $('#weather-image').attr('src', 'http://images.myforecast.com/images/cw/satellite/CentralAsia/CentralAsia.jpeg');
        }
        hideSideMenus();
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
    case 'menu-space-weather': // Q
      if (isSpaceWeatherMenuOpen) {
        isSpaceWeatherMenuOpen = false;
        hideSideMenus();
        break;
      }
      $('#space-weather-image').attr('src', 'http://services.swpc.noaa.gov/images/animations/ovation-north/latest.png');
      hideSideMenus();
      $('#space-weather-menu').fadeIn();
      isSpaceWeatherMenuOpen = true;
      $('#menu-space-weather img').addClass('bmenu-item-selected');
      break;
    case 'menu-launches': // L
      if (isLaunchMenuOpen) {
        isLaunchMenuOpen = false;
        hideSideMenus();
        break;
      } else {
        hideSideMenus();
        $.colorbox({href: 'http://space.skyrocket.de/doc_chr/lau2017.htm', iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
        isLaunchMenuOpen = true;
        $('#menu-launches img').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-about': // No Keyboard Shortcut
      if (isAboutSelected) {
        isAboutSelected = false;
        hideSideMenus();
        break;
      } else {
        hideSideMenus();
        $('#about-menu').fadeIn();
        isAboutSelected = true;
        $('#menu-about img').addClass('bmenu-item-selected');
        break;
      }
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
    case 'menu-satellite-collision': // No Keyboard Shortcut
      if (isSocratesMenuOpen) {
        isSocratesMenuOpen = false;
        hideSideMenus();
        break;
      } else {
        hideSideMenus();
        $('#socrates-menu').fadeIn();
        isSocratesMenuOpen = true;
        socrates(-1);
        $('#menu-satellite-collision img').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-settings': // T
      if (isSettingsMenuOpen) {
        isSettingsMenuOpen = false;
        hideSideMenus();
        break;
      } else {
        hideSideMenus();
        $('#settings-menu').fadeIn();
        isSettingsMenuOpen = true;
        $('#menu-settings img').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-editSat':
      if (isEditSatMenuOpen) {
        isEditSatMenuOpen = false;
        hideSideMenus();
        break;
      } else {
        if (selectedSat !== -1) {
          hideSideMenus();
          $('#editSat-menu').fadeIn();
          $('#menu-editSat img').addClass('bmenu-item-selected');
          isEditSatMenuOpen = true;

          sat = satSet.getSat(selectedSat);
          $('#es-scc').val(sat.SCC_NUM);

          var inc = (sat.inclination * R2D).toPrecision(7);
          inc = inc.split('.');
          inc[0] = inc[0].substr(-3, 3);
          inc[1] = inc[1].substr(0, 4);
          inc = (inc[0] + '.' + inc[1]).toString();

          $('#es-inc').val(pad(inc, 8));
          $('#es-year').val(sat.TLE1.substr(18, 2));
          $('#es-day').val(sat.TLE1.substr(20, 12));
          $('#es-meanmo').val(sat.TLE2.substr(52, 11));

          var rasc = (sat.raan * R2D).toPrecision(7);
          rasc = rasc.split('.');
          rasc[0] = rasc[0].substr(-3, 3);
          rasc[1] = rasc[1].substr(0, 4);
          rasc = (rasc[0] + '.' + rasc[1]).toString();

          $('#es-rasc').val(pad(rasc, 8));
          $('#es-ecen').val(sat.eccentricity.toPrecision(7).substr(2, 7));

          var argPe = (sat.argPe * R2D).toPrecision(7);
          argPe = argPe.split('.');
          argPe[0] = argPe[0].substr(-3, 3);
          argPe[1] = argPe[1].substr(0, 4);
          argPe = (argPe[0] + '.' + argPe[1]).toString();

          $('#es-argPe').val(pad(argPe, 8));
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
        hideSideMenus();
        break;
      } else {
        // TODO: NEW LAUNCH
        if (selectedSat !== -1) {
          hideSideMenus();
          $('#newLaunch-menu').fadeIn();
          $('#menu-newLaunch img').addClass('bmenu-item-selected');
          isNewLaunchMenuOpen = true;

          sat = satSet.getSat(selectedSat);
          $('#nl-scc').val(sat.SCC_NUM);
          $('#nl-inc').val((sat.inclination * R2D).toPrecision(2));
        } else {
          if (!$('#menu-newLaunch img:animated').length) {
            $('#menu-newLaunch img').effect('shake', {distance: 10});
          }
        }
        break;
      }
    case 'menu-customSensor': // T
      if (isCustomSensorMenuOpen) {
        isCustomSensorMenuOpen = false;
        hideSideMenus();
        break;
      } else {
        hideSideMenus();
        $('#customSensor-menu').fadeIn();
        isCustomSensorMenuOpen = true;
        $('#menu-customSensor img').addClass('bmenu-item-selected');
        break;
      }
  }
}
function pad (num, size) {
  // console.log(num);
  var s = '   ' + num;
  return s.substr(s.length - size);
}
function updateUrl () { // URL Updater
  var arr = window.location.href.split('?');
  var url = arr[0];
  var paramSlices = [];

  if (selectedSat !== -1 && satSet.getSat(selectedSat).intlDes !== 'none') {
    paramSlices.push('intldes=' + satSet.getSat(selectedSat).intlDes);
  }

  var currentSearch = searchBox.getCurrentSearch();
  if (currentSearch != null) {
    paramSlices.push('search=' + currentSearch);
  }
  if (propRate < 0.99 || propRate > 1.01) {
    paramSlices.push('rate=' + propRate);
  }

  if (propOffset < -1000 || propOffset > 1000) {
    paramSlices.push('hrs=' + (propOffset / 1000.0 / 3600.0).toString());
  }

  if (lookangles.sensorSelected()) {
    paramSlices.push('lat=' + lookangles.obslat);
    paramSlices.push('long=' + lookangles.obslong);
    paramSlices.push('hei=' + lookangles.hei);
    paramSlices.push('minaz=' + lookangles.obsminaz);
    paramSlices.push('maxaz=' + lookangles.obsmaxaz);
    paramSlices.push('minel=' + lookangles.obsminel);
    paramSlices.push('maxel=' + lookangles.obsmaxel);
    paramSlices.push('minrange=' + lookangles.obsminrange);
    paramSlices.push('maxrange=' + lookangles.obsmaxrange);
  }

  if (paramSlices.length > 0) {
    url += '?' + paramSlices.join('&');
  }

  window.history.replaceState(null, 'Keeptrack', url);
}

function selectSat (satId) {
  selectedSat = satId;
  if (satId === -1) {
    $('#sat-infobox').fadeOut();
    if ($('#search-results').css('display') === 'block') {
      $('#search-results').attr('style', 'display:block;max-height:100%;margin-bottom:-50px;');
    } else {
      $('#search-results').attr('style', 'max-height:100%;margin-bottom:-50px;');
    }
    $('#iss-stream').html('');
    $('#iss-stream-menu').fadeOut();
    orbitDisplay.clearSelectOrbit();
    // Remove Red Box
    $('#menu-lookanglesmultisite img').removeClass('bmenu-item-selected');
    $('#menu-lookangles img').removeClass('bmenu-item-selected');
    $('#menu-editSat img').removeClass('bmenu-item-selected');
    $('#menu-newLaunch img').removeClass('bmenu-item-selected');
    // Add Grey Out
    $('#menu-lookanglesmultisite img').addClass('bmenu-item-disabled');
    $('#menu-lookangles img').addClass('bmenu-item-disabled');
    $('#menu-editSat img').addClass('bmenu-item-disabled');
    $('#menu-newLaunch img').addClass('bmenu-item-disabled');
    // Remove Side Menus
    $('#lookanglesmultisite-menu').fadeOut();
    $('#lookangles-menu').fadeOut();
    $('#editSat-menu').fadeOut();
    $('#newLaunch-menu').fadeOut();
    $('#customSensor-menu').fadeOut();
    // Toggle the side menus as closed
    isEditSatMenuOpen = false;
    isLookanglesMenuOpen = false;
    isLookanglesMultiSiteMenuOpen = false;
    isNewLaunchMenuOpen = false;
    isCustomSensorMenuOpen = false;
  } else {
    camZoomSnappedOnSat = true;
    camAngleSnappedOnSat = true;

    if (lookangles.sensorSelected()) {
      $('#menu-lookangles img').removeClass('bmenu-item-disabled');
    }

    $('#menu-lookanglesmultisite img').removeClass('bmenu-item-disabled');
    $('#menu-editSat img').removeClass('bmenu-item-disabled');
    $('#menu-newLaunch img').removeClass('bmenu-item-disabled');

    satSet.selectSat(satId);
    camSnapToSat(satId);
    var sat = satSet.getSat(satId);
    if (!sat) return;
    orbitDisplay.setSelectOrbit(satId);
    if ($('#search-results').css('display') === 'block') {
      $('#search-results').attr('style', 'display:block; max-height:27%');
    } else {
      $('#search-results').attr('style', 'max-height:27%');
    }
    $('#sat-infobox').fadeIn();
    $('#sat-info-title').html(sat.ON);

    if (sat.URL) {
      $('#sat-info-title').html("<a class='iframe' href='" + sat.URL + "'>" + sat.ON + '</a>');
    }

    $('#sat-intl-des').html(sat.intlDes);
    if (sat.OT === 'unknown') {
      $('#sat-objnum').html(1 + sat.TLE2.substr(2, 7).toString());
    } else {
      //      $('#sat-objnum').html(sat.TLE2.substr(2,7));
      $('#sat-objnum').html(sat.SCC_NUM);
    }

    var objtype;
    if (sat.OT === 0) { objtype = 'TBA'; }
    if (sat.OT === 1) { objtype = 'Payload'; }
    if (sat.OT === 2) { objtype = 'Rocket Body'; }
    if (sat.OT === 3) { objtype = 'Debris'; }
    $('#sat-type').html(objtype);

    // /////////////////////////////////////////////////////////////////////////
    // Country Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    var country;
    if (sat.C === 'U') {
      country = 'Unknown';
    // Table Nested in ELSE to Make Hiding it Easier
    } else {
      if (sat.C === 'AB') { // Headquartered in Riyadh, Saudi Arabia
        country = 'Saudi Arabia';
      }
      if (sat.C === 'AC') {
        country = 'AsiaSat Corp';
      }
      if (sat.C === 'ALG') {
        country = 'Algeria';
      }
      if (sat.C === 'ALL') {
        country = 'All';
      }
      if (sat.C === 'ARGN') {
        country = 'Argentina';
      }
      if (sat.C === 'ASRA') {
        country = 'Austria';
      }
      if (sat.C === 'AUS') {
        country = 'Australia';
      }
      if (sat.C === 'AZER') {
        country = 'Azerbaijan';
      }
      if (sat.C === 'BEL') {
        country = 'Belgium';
      }
      if (sat.C === 'BELA') {
        country = 'Belarus';
      }
      if (sat.C === 'BERM') {
        country = 'Bermuda';
      }
      if (sat.C === 'BOL') {
        country = 'Bolivia';
      }
      if (sat.C === 'BRAZ') {
        country = 'Brazil';
      }
      if (sat.C === 'CA') {
        country = 'Canada';
      }
      if (sat.C === 'CHBZ') {
        country = 'China/Brazil';
      }
      if (sat.C === 'CHLE') {
        country = 'Chile';
      }
      if (sat.C === 'CIS') {
        country = 'Commonwealth of Ind States';
      }
      if (sat.C === 'COL') {
        country = 'Colombia';
      }
      if (sat.C === 'CZCH') {
        country = 'Czechoslovakia';
      }
      if (sat.C === 'DEN') {
        country = 'Denmark';
      }
      if (sat.C === 'ECU') {
        country = 'Ecuador';
      }
      if (sat.C === 'EGYP') {
        country = 'Egypt';
      }
      if (sat.C === 'ESA') {
        country = 'European Space Agency';
      }
      if (sat.C === 'ESA') {
        country = 'European Space Research Org';
      }
      if (sat.C === 'EST') {
        country = 'Estonia';
      }
      if (sat.C === 'EUME') {
        country = 'EUMETSAT';
      }
      if (sat.C === 'EUTE') {
        country = 'EUTELSAT';
      }
      if (sat.C === 'FGER') {
        country = 'France/Germany';
      }
      if (sat.C === 'FR') {
        country = 'France';
      }
      if (sat.C === 'FRIT') {
        country = 'France/Italy';
      }
      if (sat.C === 'GER') {
        country = 'Germany';
      }
      if (sat.C === 'GLOB') { // Headquartered in Louisiana, USA
        country = 'United States';
      }
      if (sat.C === 'GREC') {
        country = 'Greece';
      }
      if (sat.C === 'HUN') {
        country = 'Hungary';
      }
      if (sat.C === 'IM') { // Headquartered in London, UK
        country = 'United Kingdom';
      }
      if (sat.C === 'IND') {
        country = 'India';
      }
      if (sat.C === 'INDO') {
        country = 'Indonesia';
      }
      if (sat.C === 'IRAN') {
        country = 'Iran';
      }
      if (sat.C === 'IRAQ') {
        country = 'Iraq';
      }
      if (sat.C === 'ISRA') {
        country = 'Israel';
      }
      if (sat.C === 'ISS') {
        country = 'International';
      }
      if (sat.C === 'IT') {
        country = 'Italy';
      }
      if (sat.C === 'ITSO') { // Headquartered in Luxembourg District, Luxembourg
        country = 'Luxembourg';
      }
      if (sat.C === 'JPN') {
        country = 'Japan';
      }
      if (sat.C === 'KAZ') {
        country = 'Kazakhstan';
      }
      if (sat.C === 'LAOS') {
        country = 'Laos';
      }
      if (sat.C === 'LTU') {
        country = 'Lithuania';
      }
      if (sat.C === 'LUXE') {
        country = 'Luxembourg';
      }
      if (sat.C === 'MALA') {
        country = 'Malaysia';
      }
      if (sat.C === 'MEX') {
        country = 'Mexico';
      }
      if (sat.C === 'NATO') {
        country = 'North Atlantic Treaty Org';
      }
      if (sat.C === 'NETH') {
        country = 'Netherlands';
      }
      if (sat.C === 'NICO') { // Headquartered in Washington, USA
        country = 'United States';
      }
      if (sat.C === 'NIG') {
        country = 'Nigeria';
      }
      if (sat.C === 'NKOR') {
        country = 'North Korea';
      }
      if (sat.C === 'NOR') {
        country = 'Norway';
      }
      if (sat.C === 'O3B') { // Majority Shareholder Based in Luxembourg
        country = 'Luxembourg';
      }
      if (sat.C === 'ORB') { // Headquartered in Louisiana, USA
        country = 'United States';
      }
      if (sat.C === 'PAKI') {
        country = 'Pakistan';
      }
      if (sat.C === 'PERU') {
        country = 'Peru';
      }
      if (sat.C === 'POL') {
        country = 'Poland';
      }
      if (sat.C === 'POR') {
        country = 'Portugal';
      }
      if (sat.C === 'PRC') {
        country = 'China';
      }
      if (sat.C === 'RASC') { // Headquartered in Mauritius
        country = 'Mauritius';
      }
      if (sat.C === 'ROC') {
        country = 'Taiwan';
      }
      if (sat.C === 'ROM') {
        country = 'Romania';
      }
      if (sat.C === 'RP') {
        country = 'Philippines';
      }
      if (sat.C === 'SAFR') {
        country = 'South Africa';
      }
      if (sat.C === 'SAUD') {
        country = 'Saudi Arabia';
      }
      if (sat.C === 'SEAL') { // Primary Shareholder Russian
        country = 'Russia';
      }
      if (sat.C === 'RP') {
        country = 'Philippines';
      }
      if (sat.C === 'SES') {
        country = 'Luxembourg';
      }
      if (sat.C === 'SING') {
        country = 'Singapore';
      }
      if (sat.C === 'SKOR') {
        country = 'South Korea';
      }
      if (sat.C === 'SPN') {
        country = 'Spain';
      }
      if (sat.C === 'STCT') {
        country = 'Singapore/Taiwan';
      }
      if (sat.C === 'SWED') {
        country = 'Sweden';
      }
      if (sat.C === 'SWTZ') {
        country = 'Switzerland';
      }
      if (sat.C === 'THAI') {
        country = 'Thailand';
      }
      if (sat.C === 'TMMC') {
        country = 'Turkmenistan/Monaco';
      }
      if (sat.C === 'TURK') {
        country = 'Turkey';
      }
      if (sat.C === 'UAE') {
        country = 'United Arab Emirates';
      }
      if (sat.C === 'UK') {
        country = 'United Kingdom';
      }
      if (sat.C === 'UKR') {
        country = 'Ukraine';
      }
      if (sat.C === 'URY') {
        country = 'Uruguay';
      }
      if (sat.C === 'US') {
        country = 'United States';
      }
      if (sat.C === 'USBZ') {
        country = 'United States/Brazil';
      }
      if (sat.C === 'VENZ') {
        country = 'Venezuela';
      }
      if (sat.C === 'VTNM') {
        country = 'Vietnam';
      }
    }
    $('#sat-country').html(country);

    // /////////////////////////////////////////////////////////////////////////
    // Launch Site Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    var site, sitec;
    if (sat.LS === 'U') {
      site = 'Unknown';
      sitec = 'Unknown';
    // Table Nested in ELSE to Make Hiding it Easier
    } else {
      if (sat.LS === 'AFETR') {
        site = 'Cape Canaveral AFS';
        sitec = 'United States';
      }
      if (sat.LS === 'AFWTR') {
        site = 'Vandenberg AFB';
        sitec = 'United States';
      }
      if (sat.LS === 'CAS') {
        site = 'Canary Islands';
        sitec = 'United States';
      }
      if (sat.LS === 'FRGUI') {
        site = 'French Guiana';
        sitec = 'United States';
      }
      if (sat.LS === 'HGSTR') {
        site = 'Hammaguira STR';
        sitec = 'Algeria';
      }
      if (sat.LS === 'KSCUT') {
        site = 'Uchinoura Space Center';
        sitec = 'Japan';
      }
      if (sat.LS === 'KYMTR') {
        site = 'Kapustin Yar MSC';
        sitec = 'Russia';
      }
      if (sat.LS === 'PKMTR') {
        site = 'Plesetsk MSC';
        sitec = 'Russia';
      }
      if (sat.LS === 'WSC') {
        site = 'Wenchang SLC';
        sitec = 'China';
      }
      if (sat.LS === 'SNMLP') {
        site = 'San Marco LP';
        sitec = 'Kenya';
      }
      if (sat.LS === 'SRI') {
        site = 'Satish Dhawan SC';
        sitec = 'India';
      }
      if (sat.LS === 'TNSTA') {
        site = 'Tanegashima SC';
        sitec = 'Japan';
      }
      if (sat.LS === 'TTMTR') {
        site = 'Baikonur Cosmodrome';
        sitec = 'Kazakhstan';
      }
      if (sat.LS === 'WLPIS') {
        site = 'Wallops Island';
        sitec = 'United States';
      }
      if (sat.LS === 'WOMRA') {
        site = 'Woomera';
        sitec = 'Australia';
      }
      if (sat.LS === 'VOSTO') {
        site = 'Vostochny Cosmodrome';
        sitec = 'Russia';
      }
      if (sat.LS === 'PMRF') {
        site = 'PMRF Barking Sands';
        sitec = 'United States';
      }
      if (sat.LS === 'SEAL') {
        site = 'Sea Launch Odyssey';
        sitec = 'Russia';
      }
      if (sat.LS === 'KWAJ') {
        site = 'Kwajalein';
        sitec = 'United States';
      }
      if (sat.LS === 'ERAS') {
        site = 'Pegasus East';
        sitec = 'United States';
      }
      if (sat.LS === 'JSC') {
        site = 'Jiuquan SLC';
        sitec = 'China';
      }
      if (sat.LS === 'SVOB') {
        site = 'Svobodny';
        sitec = 'Russia';
      }
      if (sat.LS === 'UNKN') {
        site = 'Unknown';
        sitec = 'Unknown';
      }
      if (sat.LS === 'TSC') {
        site = 'Taiyaun SC';
        sitec = 'China';
      }
      if (sat.LS === 'WRAS') {
        site = 'Pegasus West';
        sitec = 'United States';
      }
      if (sat.LS === 'XSC') {
        site = 'Xichang SC';
        sitec = 'China';
      }
      if (sat.LS === 'YAVNE') {
        site = 'Yavne';
        sitec = 'Israel';
      }
      if (sat.LS === 'OREN') {
        site = 'Orenburg';
        sitec = 'Russia';
      }
      if (sat.LS === 'SADOL') {
        site = 'Submarine Launch';
        sitec = 'Russia';
      }
      if (sat.LS === 'KODAK') {
        site = 'Kodiak Island';
        sitec = 'United States';
      }
      if (sat.LS === 'SEM') {
        site = 'Semnan';
        sitec = 'Iran';
      }
      if (sat.LS === 'YUN') {
        site = 'Yunsong';
        sitec = 'North Korea';
      }
      if (sat.LS === 'NSC') {
        site = 'Naro Space Center';
        sitec = 'South Korea';
      }
    }
    $('#sat-site').html(site);
    $('#sat-sitec').html(sitec);

    // /////////////////////////////////////////////////////////////////////////
    // RCS Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    if (sat.R === null) {
      $('#sat-rcs').html('Unknown');
    } else {
      var rcs;
      if (sat.R < 0.1) { rcs = 'Small'; }
      if (sat.R >= 0.1) { rcs = 'Medium'; }
      if (sat.R > 1) { rcs = 'Large'; }
      $('#sat-rcs').html(rcs);
      $('#sat-rcs').tooltip({delay: 50, tooltip: sat.R, position: 'left'});
    }

    // /////////////////////////////////////////////////////////////////////////
    // Launch Vehicle Correlation Table
    // /////////////////////////////////////////////////////////////////////////
    $('#sat-vehicle').html(sat.LV);
    if (sat.LV === 'U') { $('#sat-vehicle').html('Unknown'); }
    switch (sat.LV) {
      // ///////////////////////////////////////////////////////////////////////
      // UNITED STATES
      // ///////////////////////////////////////////////////////////////////////
      case 'Scout B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutb.html'>" + sat.LV + '</a>');
        break;
      case 'Scout X-1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutx-1.html'>" + sat.LV + '</a>');
        break;
      case 'Scout X-4':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutx-4.html'>" + sat.LV + '</a>');
        break;
      case 'Scout A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scouta.html'>" + sat.LV + '</a>');
        break;
      case 'Scout G-1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutg-1.html'>" + sat.LV + '</a>');
        break;
      case 'Scout S-1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scout.html'>" + sat.LV + '</a>');
        break;
      case 'Delta 0300':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/d/delta0300.html'>" + sat.LV + '</a>');
        break;
      case 'Falcon 9':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/f/falcon9.html'>" + sat.LV + '</a>');
        break;
      case 'Falcon 9 v1.1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/f/falcon9v11.html'>" + sat.LV + '</a>');
        break;
      case 'Atlas Agena B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/a/atlasagenab.html'>" + sat.LV + '</a>');
        break;
      case 'Thor Ablestar':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/t/thorablestar.html'>" + sat.LV + '</a>');
        break;

      // ///////////////////////////////////////////////////////////////////////
      // RUSSIA
      // ///////////////////////////////////////////////////////////////////////
      case 'Soyuz-ST-A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-st-a.html'>" + sat.LV + '</a>');
        break;
      case 'Soyuz-ST-B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-st-b.html'>" + sat.LV + '</a>');
        break;
      case 'Soyuz 11A511L':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz11a511l.html'>" + sat.LV + '</a>');
        break;
      case 'Soyuz-U':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-u.html'>" + sat.LV + '</a>');
        break;
      case 'Soyuz-U-PVB':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-u-pvb.html'>" + sat.LV + '</a>');
        break;
      case 'Soyuz-FG':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-fg.html'>" + sat.LV + '</a>');
        break;
      case 'Soyuz-2-1A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-2-1a.html'>" + sat.LV + '</a>');
        break;
      case 'Soyuz-2-1B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-2-1b.html'>" + sat.LV + '</a>');
        break;
      case 'Kosmos 11K65M':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/k/kosmos11k65m.html'>Kosmos 3M</a>");
        break;
      case 'Kosmos 65S3':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/k/kosmos65s3.html'>" + sat.LV + '</a>');
        break;
      case 'Tsiklon-2':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/t/tsiklon-2.html'>" + sat.LV + '</a>');
        break;
      case 'Tsiklon-3':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/t/tsiklon-3.html'>" + sat.LV + '</a>');
        break;
      case 'Vostok 8A92M':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/v/vostok8a92m.html'>" + sat.LV + '</a>');
        break;
      case 'Vostok 8K72K':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/v/vostok8k72k.html'>" + sat.LV + '</a>');
        break;
      // ///////////////////////////////////////////////////////////////////////
      // CHINA
      // ///////////////////////////////////////////////////////////////////////
      case 'Chang Zheng 1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng1.html'>" + sat.LV + '</a>');
        break;
      case 'Chang Zheng 3':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng3.html'>" + sat.LV + '</a>');
        break;
      case 'Chang Zheng 3A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng3a.html'>" + sat.LV + '</a>');
        break;
      case 'Chang Zheng 4':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng4.html'>" + sat.LV + '</a>');
        break;
      case 'Chang Zheng 4B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng4b.html'>" + sat.LV + '</a>');
        break;
      case 'Chang Zheng 2C-III/SD':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng2c-iiisd.html'>" + sat.LV + '</a>');
        break;
      case 'Chang Zheng 2C':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng2c.html'>" + sat.LV + '</a>');
        break;
      case 'Chang Zheng 6':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng6.html'>" + sat.LV + '</a>');
        break;
    }

    $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
    $('#sat-apogee').html(sat.apogee.toFixed(0) + ' km');
    $('#sat-perigee').html(sat.perigee.toFixed(0) + ' km');
    $('#sat-inclination').html((sat.inclination * R2D).toFixed(2) + '°');
    $('#sat-eccentricity').html((sat.eccentricity).toFixed(3));

    $('#sat-period').html(sat.period.toFixed(2) + ' min');
    $('#sat-period').tooltip({delay: 50, tooltip: 'Mean Motion: ' + 60 * 24 / sat.period.toFixed(2), position: 'left'});

    var now = new Date();
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    var daysold;
    if (satSet.getSat(satId).TLE1.substr(18, 2) === now) {
      daysold = jday() - satSet.getSat(satId).TLE1.substr(20, 3);
    } else {
      daysold = jday() - satSet.getSat(satId).TLE1.substr(20, 3) + (satSet.getSat(satId).TLE1.substr(17, 2) * 365);
    }
    $('#sat-elset-age').html(daysold + ' Days');
    $('#sat-elset-age').tooltip({delay: 50, tooltip: 'Epoch Year: ' + sat.TLE1.substr(18, 2).toString() + ' Day: ' + sat.TLE1.substr(20, 8).toString(), position: 'left'});

    now = new Date();
    var sunTime = SunCalc.getTimes(Date.now(), lookangles.obslat, lookangles.obslong);
    if (sunTime.dawn.getTime() - now > 0 || sunTime.dusk.getTime() - now < 0) {
      $('#sat-sun').html('No Sun');
    } else if (lookangles.obslat == null) {
      $('#sat-sun').html('Unknown');
    } else {
      $('#sat-sun').html('Sun Exclusion');
    }

    if (lookangles.sensorSelected()) {
      lookangles.getlookangles(sat, isLookanglesMenuOpen);
    }
  }

  if (satId !== -1) {
    if (sat.SCC_NUM === '25544') { // Something selected and that something is the ISS
      $('#iss-stream-menu').fadeIn();
      $('#iss-stream').html('<iframe src="http://www.ustream.tv/embed/17074538?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent;"></iframe><iframe src="http://www.ustream.tv/embed/9408562?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent;"></iframe><br />' +
                            '<iframe src="http://www.ustream.tv/embed/6540154?html5ui=1" allowfullscreen="true" webkitallowfullscreen="true" scrolling="no" frameborder="0" style="border: 0px none transparent;"></iframe><iframe src="http://cdn.livestream.com/embed/spaceflightnow?layout=4&amp;height=340&amp;width=560&amp;autoplay=false" style="border:0;outline:0" frameborder="0" scrolling="no"></iframe>');
    } else {
      $('#iss-stream').html('');
      $('#iss-stream-menu').fadeOut();
    }
  }

  updateUrl();
}

function browserUnsupported () {
  $('#canvas-holder').hide();
  $('#no-webgl').css('display', 'block');
}

function webGlInit () {
  var can = $('#canvas')[0];

  can.width = window.innerWidth;
  can.height = window.innerHeight;

  var gl = can.getContext('webgl', {alpha: false}) || can.getContext('experimental-webgl', {alpha: false});
  if (!gl) {
    browserUnsupported();
  }

  gl.viewport(0, 0, can.width, can.height);

  gl.enable(gl.DEPTH_TEST);

  // gl.enable(0x8642);
  /* enable point sprites(?!) This might get browsers with
     underlying OpenGL to behave
     although it's not technically a part of the WebGL standard
  */

  var pFragShader = gl.createShader(gl.FRAGMENT_SHADER);
  var pFragCode = shaderLoader.getShaderCode('pick-fragment.glsl');
  gl.shaderSource(pFragShader, pFragCode);
  gl.compileShader(pFragShader);

  var pVertShader = gl.createShader(gl.VERTEX_SHADER);
  var pVertCode = shaderLoader.getShaderCode('pick-vertex.glsl');
  gl.shaderSource(pVertShader, pVertCode);
  gl.compileShader(pVertShader);

  var pickShaderProgram = gl.createProgram();
  gl.attachShader(pickShaderProgram, pVertShader);
  gl.attachShader(pickShaderProgram, pFragShader);
  gl.linkProgram(pickShaderProgram);

  pickShaderProgram.aPos = gl.getAttribLocation(pickShaderProgram, 'aPos');
  pickShaderProgram.aColor = gl.getAttribLocation(pickShaderProgram, 'aColor');
  pickShaderProgram.aPickable = gl.getAttribLocation(pickShaderProgram, 'aPickable');
  pickShaderProgram.uCamMatrix = gl.getUniformLocation(pickShaderProgram, 'uCamMatrix');
  pickShaderProgram.uMvMatrix = gl.getUniformLocation(pickShaderProgram, 'uMvMatrix');
  pickShaderProgram.uPMatrix = gl.getUniformLocation(pickShaderProgram, 'uPMatrix');

  gl.pickShaderProgram = pickShaderProgram;

  pickFb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, pickFb);

  pickTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, pickTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  var rb = gl.createRenderbuffer(); // create RB to store the depth buffer
  gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pickTex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);

  gl.pickFb = pickFb;

  pickColorBuf = new Uint8Array(4);

  pMatrix = mat4.create();
  mat4.perspective(pMatrix, 1.01, gl.drawingBufferWidth / gl.drawingBufferHeight, 20.0, 600000.0);
  var eciToOpenGlMat = [
    1, 0, 0, 0,
    0, 0, -1, 0,
    0, 1, 0, 0,
    0, 0, 0, 1
  ];
  mat4.mul(pMatrix, pMatrix, eciToOpenGlMat); // pMat = pMat * ecioglMat

  window.gl = gl;
}

function unProject (mx, my) {
  var glScreenX = (mx / gl.drawingBufferWidth * 2) - 1.0;
  var glScreenY = 1.0 - (my / gl.drawingBufferHeight * 2);
  var screenVec = [glScreenX, glScreenY, -0.01, 1.0]; // gl screen coords

  var comboPMat = mat4.create();
  mat4.mul(comboPMat, pMatrix, camMatrix);
  var invMat = mat4.create();
  mat4.invert(invMat, comboPMat);
  var worldVec = vec4.create();
  vec4.transformMat4(worldVec, screenVec, invMat);

  return [worldVec[0] / worldVec[3], worldVec[1] / worldVec[3], worldVec[2] / worldVec[3]];
}

function getEarthScreenPoint (x, y) {
  var rayOrigin = getCamPos();
  var ptThru = unProject(x, y);
  //  var start = performance.now();

  var rayDir = vec3.create();
  vec3.subtract(rayDir, ptThru, rayOrigin); // rayDir = ptThru - rayOrigin
  vec3.normalize(rayDir, rayDir);

  var toCenterVec = vec3.create();
  vec3.scale(toCenterVec, rayOrigin, -1); // toCenter is just -camera pos because center is at [0,0,0]
  var dParallel = vec3.dot(rayDir, toCenterVec);

  var longDir = vec3.create();
  vec3.scale(longDir, rayDir, dParallel); // longDir = rayDir * distParallel
  vec3.add(ptThru, rayOrigin, longDir); // ptThru is now on the plane going through the center of sphere
  var dPerp = vec3.len(ptThru);

  var dSubSurf = Math.sqrt(6371 * 6371 - dPerp * dPerp);
  var dSurf = dParallel - dSubSurf;

  var ptSurf = vec3.create();
  vec3.scale(ptSurf, rayDir, dSurf);
  vec3.add(ptSurf, ptSurf, rayOrigin);

 // console.log('earthscreenpt: ' + (performance.now() - start) + ' ms');

  return ptSurf;
}
function getSatIdFromCoord (x, y) {
 // var start = performance.now();

  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
  gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickColorBuf);

  var pickR = pickColorBuf[0];
  var pickG = pickColorBuf[1];
  var pickB = pickColorBuf[2];

 // console.log('picking op: ' + (performance.now() - start) + ' ms');
  return ((pickB << 16) | (pickG << 8) | (pickR)) - 1;
}
function getCamDist () {
  return Math.pow(zoomLevel, ZOOM_EXP) * (DIST_MAX - DIST_MIN) + DIST_MIN;
}
function getCamPos () {
  var r = getCamDist();
  var z = r * Math.sin(camPitch);
  var rYaw = r * Math.cos(camPitch);
  var x = rYaw * Math.sin(camYaw);
  var y = rYaw * Math.cos(camYaw) * -1;
  return [x, y, z];
}

// Camera Functions
function camSnapToSat (satId) {
  /* this function runs every frame that a satellite is selected.
  However, the user might have broken out of the zoom snap or angle snap.
  If so, don't change those targets. */

  var sat = satSet.getSat(satId);

  if (camAngleSnappedOnSat) {
    var pos = sat.position;
    var r = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
    var yaw = Math.atan2(pos.y, pos.x) + Math.PI / 2;
    var pitch = Math.atan2(pos.z, r);
    if (!pitch) {
      console.log('Pitch Calculation Error');
      pitch = 0;
      camZoomSnappedOnSat = false;
      camAngleSnappedOnSat = false;
    }
    if (!yaw) {
      console.log('Yaw Calculation Error');
      yaw = 0;
      camZoomSnappedOnSat = false;
      camAngleSnappedOnSat = false;
    }
    camSnap(pitch, yaw);
  }

  if (camZoomSnappedOnSat) {
    lookangles.getTEARR(sat);
    if (lookangles.altitude) {
      var camDistTarget = lookangles.altitude + 6371 + 2000;
    } else {
      camDistTarget = 6371 + 2000;  // Stay out of the center of the earth. You will get stuck there.
      console.log('Zoom Calculation Error');
      camZoomSnappedOnSat = false;
      camAngleSnappedOnSat = false;
    }
    zoomTarget = Math.pow((camDistTarget - DIST_MIN) / (DIST_MAX - DIST_MIN), 1 / ZOOM_EXP);
  }
}
function camSnap (pitch, yaw) {
  camPitchTarget = pitch;
  camYawTarget = normalizeAngle(yaw);
  camSnapMode = true;
}
function normalizeAngle (angle) {
  angle %= Math.PI * 2;
  if (angle > Math.PI) angle -= Math.PI * 2;
  if (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}
function longToYaw (long) {
  var selectedDate = $('#datetime-text').text().substr(0, 19);
  var today = new Date();
  var angle = 0;

  selectedDate = selectedDate.split(' ');
  selectedDate = new Date(selectedDate[0] + 'T' + selectedDate[1] + 'Z');
  today.setUTCHours(selectedDate.getUTCHours() + ((selectedDate.getUTCMonth() + 1) * 2) - 12);  // Earth center point seems to drift throughout the year. Possibly tied to the time of year? TODO: WTF?

  today.setUTCMinutes(selectedDate.getUTCMinutes());
  today.setUTCSeconds(selectedDate.getUTCSeconds());
  selectedDate.setUTCHours(0);
  selectedDate.setUTCMinutes(0);
  selectedDate.setUTCSeconds(0);
  var longOffset = (((today - selectedDate) / 60 / 60 / 1000));
  longOffset = longOffset * 15; // 15 degress per longitude offset

  angle = (long + longOffset) / 180 * (Math.PI);
  angle = normalizeAngle(angle);
  return angle;
}
function latToPitch (lat) {
  var pitch = 0;
  lat = lat * ((Math.PI / 2) / 90);
  pitch = lat;// / (Math.PI/2);
  if (pitch > Math.PI / 2) pitch = Math.PI / 2;
  if (pitch < -Math.PI / 2) pitch = -Math.PI / 2;
  return pitch;
}
function changeZoom (zoom) {
  if (zoom === 'geo') {
    zoomTarget = 0.82;
    return;
  }
  if (zoom === 'leo') {
    zoomTarget = 0.45;
    return;
  }
  zoomTarget = zoom;
}

function drawLoop () {
  requestAnimationFrame(drawLoop);
  var now = new Date().getTime();
  var dt = now - (time || now);
  time = now;

  var dragTarget = getEarthScreenPoint(mouseX, mouseY);
  if (isDragging) {
    if (isNaN(dragTarget[0]) || isNaN(dragTarget[1]) || isNaN(dragTarget[2]) ||
    isNaN(dragPoint[0]) || isNaN(dragPoint[1]) || isNaN(dragPoint[2])) { // random screen drag
      var xDif = screenDragPoint[0] - mouseX;
      var yDif = screenDragPoint[1] - mouseY;
      var yawTarget = dragStartYaw + xDif * 0.005;
      var pitchTarget = dragStartPitch + yDif * -0.005;
      camPitchSpeed = normalizeAngle(camPitch - pitchTarget) * -0.005;
      camYawSpeed = normalizeAngle(camYaw - yawTarget) * -0.005;
    } else {  // earth surface point drag
      var dragPointR = Math.sqrt(dragPoint[0] * dragPoint[0] + dragPoint[1] * dragPoint[1]);
      var dragTargetR = Math.sqrt(dragTarget[0] * dragTarget[0] + dragTarget[1] * dragTarget[1]);

      var dragPointLon = Math.atan2(dragPoint[1], dragPoint[0]);
      var dragTargetLon = Math.atan2(dragTarget[1], dragTarget[0]);

      var dragPointLat = Math.atan2(dragPoint[2], dragPointR);
      var dragTargetLat = Math.atan2(dragTarget[2], dragTargetR);

      var pitchDif = dragPointLat - dragTargetLat;
      var yawDif = normalizeAngle(dragPointLon - dragTargetLon);
      camPitchSpeed = pitchDif * 0.015;
      camYawSpeed = yawDif * 0.015;
    }
    camSnapMode = false;
  } else {
    camPitchSpeed -= (camPitchSpeed * dt * 0.005); // decay speeds when globe is "thrown"
    camYawSpeed -= (camYawSpeed * dt * 0.005);
  }

  camPitch += camPitchSpeed * dt;
  camYaw += camYawSpeed * dt;

  if (rotateTheEarth) {
    camYaw -= rotateTheEarthSpeed * dt;
  }

  if (camSnapMode) {
    camPitch += (camPitchTarget - camPitch) * 0.003 * dt;

    var yawErr = normalizeAngle(camYawTarget - camYaw);
    camYaw += yawErr * 0.003 * dt;

  /*   if(Math.abs(camPitchTarget - camPitch) < 0.002 && Math.abs(camYawTarget - camYaw) < 0.002 && Math.abs(zoomTarget - zoomLevel) < 0.002) {
      camSnapMode = false; Stay in camSnapMode forever. Is this a good idea? dunno....
    } */
    zoomLevel = zoomLevel + (zoomTarget - zoomLevel) * dt * 0.0025;
  } else {
    zoomLevel = zoomLevel + (zoomTarget - zoomLevel) * dt * 0.0075;
  }

  if (camPitch > Math.PI / 2) camPitch = Math.PI / 2;
  if (camPitch < -Math.PI / 2) camPitch = -Math.PI / 2;
  // camYaw = (camYaw % (Math.PI*2));
  camYaw = normalizeAngle(camYaw);
  if (selectedSat !== -1) {
    // var sat = satSet.getSat(selectedSat);
    // debugLine.set(sat, [0, 0, 0]);
    camSnapToSat(selectedSat);
  }

  drawScene();
  updateHover();
  updateSelectBox();
}
function drawScene () {
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
 // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
 // gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);

  camMatrix = mat4.create();
  mat4.identity(camMatrix);
  mat4.translate(camMatrix, camMatrix, [0, getCamDist(), 0]);
  mat4.rotateX(camMatrix, camMatrix, camPitch);
  mat4.rotateZ(camMatrix, camMatrix, -camYaw);

  gl.useProgram(gl.pickShaderProgram);
  gl.uniformMatrix4fv(gl.pickShaderProgram.uPMatrix, false, pMatrix);
  gl.uniformMatrix4fv(gl.pickShaderProgram.camMatrix, false, camMatrix);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // if (debugLine) debugLine.draw();
  // if (debugLine2)debugLine2.draw();
  // if (debugLine3)debugLine3.draw();
  earth.draw(pMatrix, camMatrix);
  satSet.draw(pMatrix, camMatrix);
  orbitDisplay.draw(pMatrix, camMatrix);

  /* DEBUG - show the pickbuffer on a canvas */
 // debugImageData.data = pickColorMap;
 /* debugImageData.data.set(pickColorMap);
  debugContext.putImageData(debugImageData, 0, 0); */
}

function updateSelectBox () {
  if (selectedSat === -1) return;
  var now = Date.now();
  var satData = satSet.getSat(selectedSat);
  lookangles.getTEARR(satData);

  // TODO: Include updates when satellite edited regardless of time.

  if (now > lastBoxUpdateTime + 1000) {
    $('#sat-longitude').html((((lookangles.lon * 180 / Math.PI) + 360) % 360).toFixed(3) + '°');
    $('#sat-latitude').html((lookangles.lat * 180 / Math.PI).toFixed(3) + '°');
    $('#sat-altitude').html(lookangles.altitude.toFixed(2) + ' km');
    $('#sat-velocity').html(satData.velocity.toFixed(2) + ' km/s');
    if (lookangles.inview) {
      $('#sat-azimuth').html(lookangles.azimuth.toFixed(0) + '°'); // Convert to Degrees
      $('#sat-elevation').html(lookangles.elevation.toFixed(1) + '°');
      $('#sat-range').html(lookangles.range.toFixed(2) + ' km');
    } else {
      $('#sat-azimuth').html('Out of Bounds');
      // $('#sat-azimuth').prop('title', 'Azimuth: ' + lookangles.azimuth.toFixed(0) + '°');
      $('#sat-elevation').html('Out of Bounds');
      // $('#sat-elevation').prop('title', 'Elevation: ' + lookangles.elevation.toFixed(1) + '°');
      $('#sat-range').html('Out of Bounds');
      // $('#sat-range').prop('title', 'Range: ' + lookangles.range.toFixed(2) + ' km');
    }

    if (lookangles.sensorSelected()) {
      $('#sat-nextpass').html(lookangles.nextpass(satData));
    } else {
      $('#sat-nextpass').html('Unavailable');
    }

    lastBoxUpdateTime = now;
  }
}
function updateHover () {
  if (searchBox.isHovering()) {
    var satId = searchBox.getHoverSat();
    var satPos = satSet.getScreenCoords(satId, pMatrix, camMatrix);
    if (!earthHitTest(satPos.x, satPos.y)) {
      hoverBoxOnSat(satId, satPos.x, satPos.y);
    } else {
      hoverBoxOnSat(-1, 0, 0);
    }
  } else {
    mouseSat = getSatIdFromCoord(mouseX, mouseY);
    if (mouseSat !== -1) {
      orbitDisplay.setHoverOrbit(mouseSat);
    } else {
      orbitDisplay.clearHoverOrbit();
    }
    satSet.setHover(mouseSat);
    hoverBoxOnSat(mouseSat, mouseX, mouseY);
  }
}
function hoverBoxOnSat (satId, satX, satY) {
  if (satId === -1) {
    $('#sat-hoverbox').html('(none)');
    $('#sat-hoverbox').css({display: 'none'});
    $('#canvas').css({cursor: 'default'});
  } else {
    try {
    //    console.log(pos);
      var sat = satSet.getSat(satId);

      // FEATURE TODO: Processor intensive code that might be offered as a setting

      if (!(lookangles.obslat === undefined || lookangles.obslat === null) && isShowNextPass) {
        $('#sat-hoverbox').html(sat.ON + '<br /><center>' + sat.SCC_NUM + '<br />' + lookangles.nextpass(sat) + '</center>');
      } else {
        $('#sat-hoverbox').html(sat.ON + '<br /><center>' + sat.SCC_NUM + '</center>');
      }
      // $('#sat-hoverbox').html(sat.ON + '<br /><center>' + sat.SCC_NUM + '</center>');
      $('#sat-hoverbox').css({ // TODO: Make the centering CSS not HTML
        display: 'block',
        position: 'absolute',
        left: satX + 20,
        top: satY - 10
      });
      $('#canvas').css({cursor: 'pointer'});
    } catch (e) {}
  }
}

function earthHitTest (x, y) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
  gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickColorBuf);

  return (pickColorBuf[0] === 0 &&
          pickColorBuf[1] === 0 &&
          pickColorBuf[2] === 0);
}

var lookangles = (function () {
  var latitude, longitude, height, obsminaz, obsmaxaz, obsminel, obsmaxel, obsminrange, obsmaxrange, deg2rad;
  var tempLat, tempLon, tempHei, tempMinaz, tempMaxaz, tempMinel, tempMaxel, tempMinrange, tempMaxrange;
  this.lat = 0;
  this.lon = 0;
  this.altitude = 0;
  this.azimuth = 0;
  this.elevation = 0;
  this.range = 0;
  this.inview = false;
  var observerGd = {};

  var sensorSelected = function () {
    if (this.obslat !== null && this.obslat !== undefined) {
      return true;
    } else {
      return false;
    }
  };

  var getsensorinfo = function () {
    $('#sensor-latitude').html(this.obslat);
    $('#sensor-longitude').html(this.obslong);
    $('#sensor-minazimuth').html(this.obsminaz);
    $('#sensor-maxazimuth').html(this.obsmaxaz);
    $('#sensor-minelevation').html(this.obsminel);
    $('#sensor-maxelevation').html(this.obsmaxel);
    $('#sensor-minrange').html(this.obsminrange);
    $('#sensor-maxrange').html(this.obsmaxrange);
  };

  var setobs = function (obs) {
    // Set the Observer Location and variable to convert to RADIANS TODO: Change these to variables received in a method call.
    latitude = obs.lat;                   // Observer Lattitude - use Google Maps
    longitude = obs.long;                 // Observer Longitude - use Google Maps
    this.obslat = obs.lat;
    this.obslong = obs.long;
    height = obs.hei;                     // Observer Height in Km
    this.hei = obs.hei;
    obsminaz = obs.obsminaz;              // Observer min azimuth (satellite azimuth must be greater) left extent looking towards target
    obsmaxaz = obs.obsmaxaz;              // Observer max azimuth (satellite azimuth must be smaller) right extent looking towards target
    this.obsminaz = obs.obsminaz;
    this.obsmaxaz = obs.obsmaxaz;
    obsminel = obs.obsminel;              // Observer min elevation
    obsmaxel = obs.obsmaxel;              // Observer max elevation TODO: Determine if radars with 105deg elevation work correctly
    this.obsminel = obs.obsminel;
    this.obsmaxel = obs.obsmaxel;
    obsminrange = obs.obsminrange;        // Observer min range TODO: Determine how to calculate min range with transmit cycle information
    obsmaxrange = obs.obsmaxrange;        // Observer max range TODO: Determine how to calculate max range with transmit cycle information
    this.obsminrange = obs.obsminrange;
    this.obsmaxrange = obs.obsmaxrange;
    deg2rad = 0.017453292519943295;       // (angle / 180) * Math.PI --- Divide by deg2rad to get rad2deg
    observerGd = {                        // Array to calculate look angles in propagate()
      longitude: this.obslong * deg2rad,
      latitude: this.obslat * deg2rad,
      height: this.hei * 1                  // Converts from string to number TODO: Find correct way to convert string to integer
    };
  };

  var getTEARR = function (sat) {
    // Set default timing settings. These will be changed to find look angles at different times in future.
    var propOffset2 = getPropOffset();               // offset letting us propagate in the future (or past)
    propRealTime = Date.now();      // Set current time
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    var now = propTime(propOffset2, propRealTime);
    var j = jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 now.getUTCDate(),
                 now.getUTCHours(),
                 now.getUTCMinutes(),
                 now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
    var gmst = satellite.gstime_from_jday(j);

    var m = (j - satrec.jdsatepoch) * 1440.0; // 1440 = minutes_per_day
    var pv = satellite.sgp4(satrec, m);
    var positionEcf, lookAngles;
    var gpos;

    try {
      gpos = satellite.eci_to_geodetic(pv.position, gmst);
      this.altitude = gpos.height;
      this.lon = gpos.longitude;
      this.lat = gpos.latitude;

      positionEcf = satellite.eci_to_ecf(pv.position, gmst); // pv.position is called positionEci originally
      lookAngles = satellite.ecf_to_look_angles(observerGd, positionEcf);
      this.azimuth = lookAngles.azimuth / deg2rad;
      this.elevation = lookAngles.elevation / deg2rad;
      this.range = lookAngles.range_sat;
    } catch (e) {
      this.altitude = 0;
      this.lon = 0;
      this.lat = 0;
      positionEcf = 0;
      lookAngles = 0;
      this.azimuth = 0;
      this.elevation = 0;
      this.range = 0;
    }

    if ((this.azimuth >= obsminaz || this.azimuth <= obsmaxaz) && (this.elevation >= obsminel && this.elevation <= obsmaxel) && (this.range <= obsmaxrange && this.range >= obsminrange)) {
      this.inview = true;
    } else {
      this.inview = false;
    }
  };

  function nextpass (sat) {
    propRealTime = Date.now();
    var curPropOffset = getPropOffset();
    var propOffset2 = 0;
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    for (var i = 0; i < (7 * 24 * 60 * 60); i += 5) {         // 5second Looks
      propOffset2 = i * 1000 + curPropOffset;                 // Offset in seconds (msec * 1000)
      var now = propTime(propOffset2, propRealTime);
      var j = jday(now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
      var gmst = satellite.gstime_from_jday(j);

      var m = (j - satrec.jdsatepoch) * 1440.0; // 1440 = minutes_per_day
      var pv = satellite.sgp4(satrec, m);
      var positionEcf, lookAngles, azimuth, elevation, rangeSat;

      positionEcf = satellite.eci_to_ecf(pv.position, gmst); // pv.position is called positionEci originally
      lookAngles = satellite.ecf_to_look_angles(observerGd, positionEcf);
      azimuth = lookAngles.azimuth / deg2rad;
      elevation = lookAngles.elevation / deg2rad;
      rangeSat = lookAngles.range_sat;

      if ((azimuth >= obsminaz || azimuth <= obsmaxaz) && (elevation >= obsminel && elevation <= obsmaxel) && (rangeSat <= obsmaxrange && rangeSat >= obsminrange)) {
        return dateFormat(now, 'isoDateTime', true);
      }
    }
    return 'No Passes in 7 Days';
  }

  function getPropOffset () {
    var selectedDate = $('#datetime-text').text().substr(0, 19);
    selectedDate = selectedDate.split(' ');
    selectedDate = new Date(selectedDate[0] + 'T' + selectedDate[1] + 'Z');
    var today = new Date();
    var propOffset = selectedDate - today;// - (selectedDate.getTimezoneOffset() * 60 * 1000);
    return propOffset;
  }

  var getlookanglesMultiSite = function (sat, isLookanglesMultiSiteMenuOpen) {
    if (!isLookanglesMultiSiteMenuOpen) {
      return;
    }
    var resetWhenDone = false;
    if (latitude === null || latitude === undefined) {
      resetWhenDone = true;
    }
    // Set default timing settings. These will be changed to find look angles at different times in future.
    var propOffset2 = 0;               // offset letting us propagate in the future (or past)
    // var propRealTime = Date.now();      // Set current time

    var curPropOffset = getPropOffset();
    setTempSensor();
    setSensor(0);

    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    var tbl = document.getElementById('looksmultisite');           // Identify the table to update
    tbl.innerHTML = '';                                   // Clear the table from old object data
    var tblLength = 0;                                   // Iniially no rows to the table
    var lastTblLength = 0;                               // Tracks when to change sensors
    var sensor = 0;
    var howManyPasses = 6; // Complete 3 passes before switching sensors

    var tr = tbl.insertRow();
    var tdT = tr.insertCell();
    tdT.appendChild(document.createTextNode('Time'));
    tdT.setAttribute('style', 'text-decoration: underline');
    var tdE = tr.insertCell();
    tdE.appendChild(document.createTextNode('El'));
    tdE.setAttribute('style', 'text-decoration: underline');
    var tdA = tr.insertCell();
    tdA.appendChild(document.createTextNode('Az'));
    tdA.setAttribute('style', 'text-decoration: underline');
    var tdR = tr.insertCell();
    tdR.appendChild(document.createTextNode('Rng'));
    tdR.setAttribute('style', 'text-decoration: underline');
    var tdS = tr.insertCell();
    tdS.appendChild(document.createTextNode('Sensor'));
    tdS.setAttribute('style', 'text-decoration: underline');

    for (var i = 0; i < (7 * 24 * 60 * 60); i += 5) {         // 5second Looks
      propOffset2 = i * 1000 + curPropOffset;                 // Offset in seconds (msec * 1000)
      tblLength += propagateMultiSite(propOffset2, tbl, satrec, sensor);   // Update the table with looks for this 5 second chunk and then increase table counter by 1
      if (tblLength > lastTblLength) {                           // Maximum of 1500 lines in the look angles table
        lastTblLength++;
        if (howManyPasses === 1) { // When 3 passes have been complete - looks weird with 1 instead of 0
          sensor++;
          setSensor(sensor);
          i = 0;
          howManyPasses = 6; // Reset to 3 passes
        } else {
          howManyPasses = howManyPasses - 1;
          i = i + (60 * 60); // Jump an hour into the future to ensure its the next pass.
          // TODO: Consider Deep Space
        }
      }
      if (sensor === 9) {
        getTempSensor(resetWhenDone);
        break;
      }
      if (sensor < 9 && i === (7 * 24 * 60 * 60) - 5) { // Move to next sensor if this sensor doesn't have enough passes.
        sensor++;
        setSensor(sensor);
        i = 0;
        howManyPasses = 6;
      }
    }
    getTempSensor(resetWhenDone);
  };

  var getOrbitByLatLon = function (sat, goalLat, goalLon, upOrDown, curPropOffset) {
    // var curPropOffset = getPropOffset();
    var propRealTime = Date.now();
    var mainTLE1;
    var mainTLE2;
    var mainMeana;
    var mainRasc;
    var lastLat;
    var isUpOrDown;
    var rascOffset = false;

    // Longitude is passed in 0 to 360 instead of -180 to 180.

    if (upOrDown === undefined || upOrDown === null) {
      upOrDown = 'Up';
    }

    goalLat = goalLat * 1;
    goalLon = goalLon * 1;

    // var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);
    // console.log(sat.TLE2);

    for (var i = 0; i < (400 * 10); i += 1) {         // 400 degress in 0.1 increments. Going extra 40 degrees to be safe. TODO More precise?
      if (meanaCalc(i, rascOffset)) {
        if (isUpOrDown !== upOrDown) {
          rascOffset = true;
          i = i + 20; // Move a little ahead in the orbit to prevent being close on the next lattiude check
        } else {
          // console.log(mainTLE2);
          break; // Stop changing the Mean Anomaly
        }
      }
    }

    for (i = 0; i < (1400 * 100); i += 1) {         // 520 degress in 0.01 increments TODO More precise?
      if (rascOffset && i === 0) {
        i = (mainRasc - 10) * 100;
      }
      if (rascCalc(i)) {
        // console.log(mainTLE2);
        break;
      }
    }

    return [mainTLE1, mainTLE2];

    function pad (str, max) {
      return str.length < max ? pad('0' + str, max) : str;
    }

    function meanaCalc (meana, rascOffset) {
      var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs

      meana = meana / 10;
      meana = parseFloat(meana).toPrecision(7);
      meana = pad(meana, 8);

      var rasc = (sat.raan * R2D).toPrecision(7);
      if (rascOffset) {
        rasc = (rasc * 1) + 180; // Spin the orbit 180 degrees.
        if (rasc > 360) {
          rasc = (rasc * 1) - 360; // angle can't be bigger than 360
        }
      }
      mainRasc = rasc;
      rasc = rasc.toString().split('.');
      rasc[0] = rasc[0].substr(-3, 3);
      rasc[1] = rasc[1].substr(0, 4);
      rasc = (rasc[0] + '.' + rasc[1]).toString();
      rasc = pad(rasc, 8);

      var scc = sat.SCC_NUM;

      var intl = sat.TLE1.substr(9, 8);
      var inc = (sat.inclination * R2D).toPrecision(7);
      inc = inc.split('.');
      inc[0] = inc[0].substr(-3, 3);
      inc[1] = inc[1].substr(0, 4);
      inc = (inc[0] + '.' + inc[1]).toString();

      inc = pad(inc, 8);
      var epochyr = sat.TLE1.substr(18, 2);
      var epochday = sat.TLE1.substr(20, 12);

      var meanmo = sat.TLE2.substr(52, 11);

      var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

      var argPe = (sat.argPe * R2D).toPrecision(7);
      argPe = argPe.split('.');
      argPe[0] = argPe[0].substr(-3, 3);
      argPe[1] = argPe[1].substr(0, 4);
      argPe = (argPe[0] + '.' + argPe[1]).toString();
      argPe = pad(argPe, 8);

      var TLE1Ending = sat.TLE1.substr(32, 39);

      var TLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
      var TLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

      satrec = satellite.twoline2satrec(TLE1, TLE2);
      if (propagate(curPropOffset, satrec, 1)) {
        mainTLE1 = TLE1;
        mainTLE2 = TLE2;
        mainMeana = meana;
        return 1;
      }
      return 0;
    }

    function rascCalc (rasc) {
      var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs

      var meana = mainMeana;

      rasc = rasc / 100;
      if (rasc > 360) {
        rasc = rasc - 360; // angle can't be bigger than 360
      }
      rasc = rasc.toPrecision(7);
      rasc = rasc.split('.');
      rasc[0] = rasc[0].substr(-3, 3);
      rasc[1] = rasc[1].substr(0, 4);
      rasc = (rasc[0] + '.' + rasc[1]).toString();
      rasc = pad(rasc, 8);
      mainRasc = rasc;

      var scc = sat.SCC_NUM;

      var intl = sat.TLE1.substr(9, 8);
      var inc = (sat.inclination * R2D).toPrecision(7);
      inc = inc.split('.');
      inc[0] = inc[0].substr(-3, 3);
      inc[1] = inc[1].substr(0, 4);
      inc = (inc[0] + '.' + inc[1]).toString();

      inc = pad(inc, 8);
      var epochyr = sat.TLE1.substr(18, 2);
      var epochday = sat.TLE1.substr(20, 12);

      var meanmo = sat.TLE2.substr(52, 11);

      var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

      var argPe = (sat.argPe * R2D).toPrecision(7);
      argPe = argPe.split('.');
      argPe[0] = argPe[0].substr(-3, 3);
      argPe[1] = argPe[1].substr(0, 4);
      argPe = (argPe[0] + '.' + argPe[1]).toString();
      argPe = pad(argPe, 8);

      var TLE1Ending = sat.TLE1.substr(32, 39);

      mainTLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
      mainTLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

      satrec = satellite.twoline2satrec(mainTLE1, mainTLE2);

      if (propagate(curPropOffset, satrec, 2)) {
        return 1;
      }
      return 0;
    }

    function propagate (curPropOffset, satrec, type) {
      var now = propTime(curPropOffset, propRealTime);
      var j = jday(now.getUTCFullYear(),
                   now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                   now.getUTCDate(),
                   now.getUTCHours(),
                   now.getUTCMinutes(),
                   now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
      var gmst = satellite.gstime_from_jday(j);

      var m = (j - satrec.jdsatepoch) * 1440.0; // 1440 = minutes_per_day
      var pv = satellite.sgp4(satrec, m);

      var gpos, lat, lon;

      gpos = satellite.eci_to_geodetic(pv.position, gmst);

      lat = (gpos.latitude * 180 / Math.PI).toFixed(3);
      lon = (((gpos.longitude * 180 / Math.PI) + 360) % 360).toFixed(3);

      // if (lon < -180) {
      //   lon = ((lon * 1) + 360).toFixed(3);
      // }

      if (type === 1) {
        if (lat > lastLat) {
          isUpOrDown = 'Up';
        } else {
          isUpOrDown = 'Down';
        }
        lastLat = lat;
      }

      if (type === 2) {
      }

      if (lat > (goalLat - 0.05) && lat < (goalLat + 0.05) && type === 1) {
        return 1;
      }

      if (lon > (goalLon - 0.1) && lon < (goalLon + 0.1) && type === 2) {
        return 1;
      }
      return 0;
    }
  };

  var getlookangles = function (sat, isLookanglesMenuOpen) {
    if (!isLookanglesMenuOpen) {
      return;
    }
    if (latitude != null && longitude != null && height != null) {
      // Set default timing settings. These will be changed to find look angles at different times in future.
      var propOffset2 = 0;               // offset letting us propagate in the future (or past)
      // var propRealTime = Date.now();      // Set current time

      var curPropOffset = getPropOffset();

      var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
      var tbl = document.getElementById('looks');           // Identify the table to update
      tbl.innerHTML = '';                                   // Clear the table from old object data
      var tblLength = 0;                                   // Iniially no rows to the table

      var tr = tbl.insertRow();
      var tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode('Time'));
      tdT.setAttribute('style', 'text-decoration: underline');
      var tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode('El'));
      tdE.setAttribute('style', 'text-decoration: underline');
      var tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode('Az'));
      tdA.setAttribute('style', 'text-decoration: underline');
      var tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode('Rng'));
      tdR.setAttribute('style', 'text-decoration: underline');

      for (var i = 0; i < (7 * 24 * 60 * 60); i += 5) {         // 5second Looks
        propOffset2 = i * 1000 + curPropOffset;                 // Offset in seconds (msec * 1000)
        if (tblLength >= 1500) {                           // Maximum of 1500 lines in the look angles table
          break;                                            // No more updates to the table (Prevent GEO object slowdown)
        }
        tblLength += propagate(propOffset2, tbl, satrec);   // Update the table with looks for this 5 second chunk and then increase table counter by 1
      }
    }
  };

  function setTempSensor () {
    tempLat = latitude;
    tempLon = longitude;
    tempHei = height;
    tempMinel = obsminel;
    tempMaxel = obsmaxel;
    tempMinrange = obsminrange;
    tempMaxrange = obsmaxrange;
    tempMinaz = obsminaz;
    tempMaxaz = obsmaxaz;
  }

  function getTempSensor (resetWhenDone) {
    if (resetWhenDone) {
      lookangles.setobs({
        lat: null,
        long: 0,
        hei: 0,
        obsminaz: 0,
        obsmaxaz: 0,
        obsminel: 0,
        obsmaxel: 0,
        obsminrange: undefined,
        obsmaxrange: undefined
      });
    } else {
      this.latitude = tempLat;
      this.longitude = tempLon;
      this.height = tempHei;
      this.obsminel = tempMinel;
      this.obsmaxel = tempMaxel;
      this.obsminrange = tempMinrange;
      this.obsmaxrange = tempMaxrange;
      this.obsminaz = tempMinaz;
      this.obsmaxaz = tempMaxaz;
      this.observerGd = {                        // Array to calculate look angles in propagate()
        longitude: longitude * deg2rad,
        latitude: latitude * deg2rad,
        height: height * 1                  // Converts from string to number TODO: Find correct way to convert string to integer
      };
    }
  }

  function setSensor (sensor) {
    switch (sensor) {
      case 0:// Cod
        setobs({
          lat: 41.754785,
          long: -70.539151,
          hei: 0.060966,
          obsminaz: 347,
          obsmaxaz: 227,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 500,
          obsmaxrange: 5555
        });
        break;
      case 1:// Clear
        setobs({
          lat: 64.290556,
          long: -149.186944,
          hei: 0.060966,
          obsminaz: 184,
          obsmaxaz: 64,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 500,
          obsmaxrange: 4910
        });
        break;
      case 2:// Beale
        setobs({
          lat: 39.136064,
          long: -121.351237,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 126,
          obsmaxaz: 6,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 500,
          obsmaxrange: 5555
        });
        break;
      case 3:// Cavalier
        setobs({
          lat: 48.724567,
          long: -97.899755,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 298,
          obsmaxaz: 78,
          obsminel: 1.9,
          obsmaxel: 95,
          obsminrange: 500,
          obsmaxrange: 3300 // TODO: Double check this
        });
        break;
      case 4:// Fylingdales
        setobs({
          lat: 54.361758,
          long: -0.670051,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 500,
          obsmaxrange: 4820
        });
        break;
      case 5:// Eglin
        setobs({
          lat: 30.572411,
          long: -86.214836,
          hei: 0.060966, // TODO: Confirm Altitude
          obsminaz: 120,
          obsmaxaz: 240,
          obsminel: 3,
          obsmaxel: 105,
          obsminrange: 500,
          obsmaxrange: 50000
        });
        break;
      case 6:// Thule
        setobs({
          lat: 76.570322,
          long: -68.299211,
          hei: 0.060966, // TODO: Find correct height
          obsminaz: 297,
          obsmaxaz: 177,
          obsminel: 3,
          obsmaxel: 85,
          obsminrange: 500,
          obsmaxrange: 5555
        });
        break;
      case 7:// Millstone
        setobs({
          lat: 42.6233,
          long: -71.4882,
          hei: 0.131,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 1,
          obsmaxel: 90,
          obsminrange: 500,
          obsmaxrange: 50000
        });
        break;
      case 8:// ALTAIR
        setobs({
          lat: 8.716667,
          long: 167.733333,
          hei: 0,
          obsminaz: 0,
          obsmaxaz: 360,
          obsminel: 1,
          obsmaxel: 90,
          obsminrange: 500,
          obsmaxrange: 50000
        });
        break;
    }
    observerGd = {                        // Array to calculate look angles in propagate()
      longitude: longitude * deg2rad,
      latitude: latitude * deg2rad,
      height: height * 1                  // Converts from string to number TODO: Find correct way to convert string to integer
    };
  }

  function propagate (propOffset2, tbl, satrec) {
    propRealTime = Date.now();
    var now = propTime(propOffset2, propRealTime);
    var j = jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 now.getUTCDate(),
                 now.getUTCHours(),
                 now.getUTCMinutes(),
                 now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
    var gmst = satellite.gstime_from_jday(j);

    var m = (j - satrec.jdsatepoch) * 1440.0; // 1440 = minutes_per_day
    var pv = satellite.sgp4(satrec, m);
    var positionEcf, lookAngles, azimuth, elevation, rangeSat;

    positionEcf = satellite.eci_to_ecf(pv.position, gmst); // pv.position is called positionEci originally
    lookAngles = satellite.ecf_to_look_angles(observerGd, positionEcf);
    azimuth = lookAngles.azimuth / deg2rad;
    elevation = lookAngles.elevation / deg2rad;
    rangeSat = lookAngles.range_sat;

    if ((azimuth >= obsminaz || azimuth <= obsmaxaz) && (elevation >= obsminel && elevation <= obsmaxel) && (rangeSat <= obsmaxrange && rangeSat >= obsminrange)) {
      var tr = tbl.insertRow();
      var tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(now, 'isoDateTime', true)));
      // tdT.style.border = '1px solid black';
      var tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode(elevation.toFixed(1)));
      var tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode(azimuth.toFixed(0)));
      var tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode(rangeSat.toFixed(0)));
      return 1;
    }
    return 0;
  }

  function propagateMultiSite (propOffset2, tbl, satrec, sensor) {
    switch (sensor) {
      case 0:
        sensor = 'Cape Cod';
        break;
      case 1:
        sensor = 'Clear';
        break;
      case 2:
        sensor = 'Beale';
        break;
      case 3:
        sensor = 'Cavalier';
        break;
      case 4:
        sensor = 'Fylingdales';
        break;
      case 5:
        sensor = 'Eglin';
        break;
      case 6:
        sensor = 'Thule';
        break;
      case 7:
        sensor = 'Millstone';
        break;
      case 8:
        sensor = 'ALTAIR';
        break;
    }
    propRealTime = Date.now();
    var now = propTime(propOffset2, propRealTime);
    var j = jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 now.getUTCDate(),
                 now.getUTCHours(),
                 now.getUTCMinutes(),
                 now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
    var gmst = satellite.gstime_from_jday(j);

    var m = (j - satrec.jdsatepoch) * 1440.0; // 1440 = minutes_per_day
    var pv = satellite.sgp4(satrec, m);
    var positionEcf, lookAngles, azimuth, elevation, rangeSat;

    positionEcf = satellite.eci_to_ecf(pv.position, gmst); // pv.position is called positionEci originally
    lookAngles = satellite.ecf_to_look_angles(observerGd, positionEcf);
    azimuth = lookAngles.azimuth / deg2rad;
    elevation = lookAngles.elevation / deg2rad;
    rangeSat = lookAngles.range_sat;

    if ((azimuth >= obsminaz || azimuth <= obsmaxaz) && (elevation >= obsminel && elevation <= obsmaxel) && (rangeSat <= obsmaxrange && rangeSat >= obsminrange)) {
      var tr;
      if (tbl.rows.length > 0) {
        // console.log(tbl.rows[0].cells[0].textContent);
        for (var i = 0; i < tbl.rows.length; i++) {
          var dateString = tbl.rows[i].cells[0].textContent;

          var sYear = parseInt(dateString.substr(0, 4)); // UTC Year
          var sMon = parseInt(dateString.substr(5, 2)) - 1; // UTC Month in MMM prior to converting
          var sDay = parseInt(dateString.substr(8, 2)); // UTC Day
          var sHour = parseInt(dateString.substr(11, 2)); // UTC Hour
          var sMin = parseInt(dateString.substr(14, 2)); // UTC Min
          var sSec = parseInt(dateString.substr(17, 2)); // UTC Sec

          var topTime = new Date(sYear, sMon, sDay, sHour, sMin, sSec); // New Date object of the future collision
          // Date object defaults to local time.
          topTime.setUTCDate(sDay); // Move to UTC day.
          topTime.setUTCHours(sHour); // Move to UTC Hour

          if (now < topTime) {
            tr = tbl.insertRow(i);
            break;
          }
        }
      }

      if (tr == null) {
        tr = tbl.insertRow();
      }

      var tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(now, 'isoDateTime', true)));
      // tdT.style.border = '1px solid black';
      var tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode(elevation.toFixed(1)));
      var tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode(azimuth.toFixed(0)));
      var tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode(rangeSat.toFixed(0)));
      var tdS = tr.insertCell();
      tdS.appendChild(document.createTextNode(sensor));
      return 1;
    }
    return 0;
  }

  var jday = function (year, mon, day, hr, minute, sec) { // from satellite.js
    'use strict';
    return (367.0 * year -
          Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
          Math.floor(275 * mon / 9.0) +
          day + 1721013.5 +
          ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
          );
  };

  function propTime (propOffset2, propRealTime) {
    'use strict';                                             // May be unnescessary but doesn't hurt anything atm.
    var now = new Date();                                     // Make a time variable
    now.setTime(Number(propRealTime) + propOffset2);           // Set the time variable to the time in the future
    return now;
  }

  return {
    sensorSelected: sensorSelected,
    setobs: setobs,
    nextpass: nextpass,
    getlookangles: getlookangles,
    getlookanglesMultiSite: getlookanglesMultiSite,
    getOrbitByLatLon: getOrbitByLatLon,
    jday: jday,
    getTEARR: getTEARR,
    getsensorinfo: getsensorinfo
  };
})();

function jday () {
  var now = new Date();
  var start = new Date(now.getFullYear(), 0, 0);
  var diff = now - start;
  var oneDay = 1000 * 60 * 60 * 24;
  var day = Math.floor(diff / oneDay);
  return day;
}

/* **** start Date Format ***
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes ENHANCEMENT by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */
var dateFormat = (function () {
  var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g;
  var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g;
  var timezoneClip = /[^-+\dA-Z]/g;
  var pad = function (val, len) {
    val = String(val);
    len = len || 2;
    while (val.length < len) val = '0' + val;
    return val;
  };

  // Regexes and supporting functions are cached through closure
  return function (date, mask, utc) {
    var dF = dateFormat;

    // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
    if (arguments.length === 1 && Object.prototype.toString.call(date) === '[object String]' && !/\d/.test(date)) {
      mask = date;
      date = undefined;
    }

    // Passing date through Date applies Date.parse, if necessary
    date = date ? new Date(date) : new Date();
    if (isNaN(date)) throw SyntaxError('invalid date');

    mask = String(dF.masks[mask] || mask || dF.masks['default']);

    // Allow setting the utc argument via the mask
    if (mask.slice(0, 4) === 'UTC:') {
      mask = mask.slice(4);
      utc = true;
    }

    var _ = utc ? 'getUTC' : 'get';
    var d = date[_ + 'Date']();
    var D = date[_ + 'Day']();
    var m = date[_ + 'Month']();
    var y = date[_ + 'FullYear']();
    var H = date[_ + 'Hours']();
    var M = date[_ + 'Minutes']();
    var s = date[_ + 'Seconds']();
    var L = date[_ + 'Milliseconds']();
    var o = utc ? 0 : date.getTimezoneOffset();
    var flags = {
      d: d,
      dd: pad(d),
      ddd: dF.i18n.dayNames[D],
      dddd: dF.i18n.dayNames[D + 7],
      m: m + 1,
      mm: pad(m + 1),
      mmm: dF.i18n.monthNames[m],
      mmmm: dF.i18n.monthNames[m + 12],
      yy: String(y).slice(2),
      yyyy: y,
      h: H % 12 || 12,
      hh: pad(H % 12 || 12),
      H: H,
      HH: pad(H),
      M: M,
      MM: pad(M),
      s: s,
      ss: pad(s),
      l: pad(L, 3),
      L: pad(L > 99 ? Math.round(L / 10) : L),
      t: H < 12 ? 'a' : 'p',
      tt: H < 12 ? 'am' : 'pm',
      T: H < 12 ? 'A' : 'P',
      TT: H < 12 ? 'AM' : 'PM',
      Z: utc ? 'UTC' : (String(date).match(timezone) || ['']).pop().replace(timezoneClip, ''),
      o: (o > 0 ? '-' : '+') + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
      S: ['th', 'st', 'nd', 'rd'][d % 10 > 3 ? 0 : (d % 100 - d % 10 !== 10) * d % 10]
    };

    return mask.replace(token, function ($0) {
      return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
    });
  };
})();

// Some common format strings
dateFormat.masks = {
  'default': 'ddd mmm dd yyyy HH:MM:ss',
  shortDate: 'm/d/yy',
  mediumDate: 'mmm d, yyyy',
  longDate: 'mmmm d, yyyy',
  fullDate: 'dddd, mmmm d, yyyy',
  shortTime: 'h:MM TT',
  mediumTime: 'h:MM:ss TT',
  longTime: 'h:MM:ss TT Z',
  isoDate: 'yyyy-mm-dd',
  isoTime: 'HH:MM:ss',
  isoDateTime: "yyyy-mm-dd' 'HH:MM:ss",
  isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
  dayNames: [
    'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ],
  monthNames: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
  ]
};

// **** 2 - shader-loader ***
(function () {
  var shaderLoader = {};

  shaderLoader.getShaderCode = function (name) {
    for (var i = 0; i < window.shaderData.length; i++) {
      if (shaderData[i].name === name) {
        return shaderData[i].code;
      }
    }
    return null;
  };

  window.shaderLoader = shaderLoader;
})();

// **** 3 - color-scheme ***
(function () {
  var ColorScheme = function (colorizer) {
    this.colorizer = colorizer;
    this.colorBuf = gl.createBuffer();
    this.pickableBuf = gl.createBuffer();
  };

  ColorScheme.prototype.calculateColorBuffers = function () {
    var numSats = satSet.numSats;
    var colorData = new Float32Array(numSats * 4);
    var pickableData = new Float32Array(numSats);
    for (var i = 0; i < numSats; i++) {
      var colors = this.colorizer(i);
      colorData[i * 4] = colors.color[0];  // R
      colorData[i * 4 + 1] = colors.color[1]; // G
      colorData[i * 4 + 2] = colors.color[2]; // B
      colorData[i * 4 + 3] = colors.color[3]; // A
      pickableData[i] = colors.pickable ? 1 : 0;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf);
    gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pickableBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pickableData, gl.STATIC_DRAW);
    return {
      colorBuf: this.colorBuf,
      pickableBuf: this.pickableBuf
    };
  };

  ColorScheme.init = function () {
    ColorScheme.default = new ColorScheme(function (satId) {
      var sat = satSet.getSat(satId);
      var ap = sat.apogee;
      var pe = sat.perigee;
      var color;
      if (sat.inview) {
        color = [0.85, 0.5, 0.0, 1.0];
      } else if (sat.OT === 1) { // Payload
        color = [0.2, 1.0, 0.0, 0.5];
      } else if (sat.OT === 2) { // Rocket Body
        color = [0.2, 0.5, 1.0, 0.85];
        //  return [0.6, 0.6, 0.6];
      } else if (sat.OT === 3) { // Debris
        color = [0.5, 0.5, 0.5, 0.85];
      } else {
        color = [0.5, 0.5, 0.5, 0.85];
      }

      if ((pe > lookangles.obsmaxrange || ap < lookangles.obsminrange)) {
        return {
          color: [1.0, 1.0, 1.0, otherSatelliteTransparency],
          pickable: false
        };
      }

      return {
        color: color,
        pickable: true
      };
    });
    ColorScheme.onlyFOV = new ColorScheme(function (satId) {
      var sat = satSet.getSat(satId);
      if (sat.inview) {
        return {
          color: [0.85, 0.5, 0.0, 1.0],
          pickable: true
        };
      } else {
        return {
          color: [1.0, 1.0, 1.0, otherSatelliteTransparency],
          pickable: false
        };
      }
    });
    ColorScheme.apogee = new ColorScheme(function (satId) {
      var ap = satSet.getSat(satId).apogee;
      var gradientAmt = Math.min(ap / 45000, 1.0);
      return {
        color: [1.0 - gradientAmt, gradientAmt, 0.0, 1.0],
        pickable: true
      };
    });
    ColorScheme.smallsats = new ColorScheme(function (satId) {
      if (satSet.getSat(satId).R === 0 && satSet.getSat(satId).OT === 1) {
        return {
          color: [0.2, 1.0, 0.0, 0.65],
          pickable: true
        };
      } else {
        return {
          color: [1.0, 1.0, 1.0, otherSatelliteTransparency],
          pickable: false
        };
      }
    });
    ColorScheme.rcs = new ColorScheme(function (satId) {
      var rcs = satSet.getSat(satId).R;
      // var SCC = satSet.getSat(satId).SCC_NUM;
      if (rcs === 0) {
        return {
          color: [1.0, 0, 0, 0.6],
          pickable: true
        };
      }
      if (rcs === 1) {
        return {
          color: [1.0, 1.0, 0, 0.6],
          pickable: true
        };
      }
      if (rcs === 2) {
        return {
          color: [0, 1.0, 0, 0.6],
          pickable: true
        };
      }
      return {
        color: [0, 0, 1.0, 0.6],
        pickable: true
      };
    });
    ColorScheme.lostobjects = new ColorScheme(function (satId) {
      var pe = satSet.getSat(satId).perigee;
      var now = new Date();
      now = now.getFullYear();
      now = now.toString().substr(2, 2);
      var daysold;
      if (satSet.getSat(satId).TLE1.substr(18, 2) === now) {
        daysold = jday() - satSet.getSat(satId).TLE1.substr(20, 3);
      } else {
        daysold = jday() - satSet.getSat(satId).TLE1.substr(20, 3) + (satSet.getSat(satId).TLE1.substr(17, 2) * 365);
      }
      if (pe > lookangles.obsmaxrange || daysold < 31) {
        return {
          color: [1.0, 1.0, 1.0, otherSatelliteTransparency],
          pickable: false
        };
      } else {
        if ($('#search').val() === '') {
          $('#search').val($('#search').val() + satSet.getSat(satId).SCC_NUM);
        } else {
          $('#search').val($('#search').val() + ',' + satSet.getSat(satId).SCC_NUM);
        }
        return {
          color: [0.2, 1.0, 0.0, 0.65],
          pickable: true
        };
      }
    });
    ColorScheme.leo = new ColorScheme(function (satId) {
      var ap = satSet.getSat(satId).apogee;
      if (ap > 2000) {
        return {
          color: [1.0, 1.0, 1.0, otherSatelliteTransparency],
          pickable: false
        };
      } else {
        return {
          color: [0.2, 1.0, 0.0, 0.65],
          pickable: true
        };
      }
    });
    ColorScheme.geo = new ColorScheme(function (satId) {
      var pe = satSet.getSat(satId).perigee;
      if (pe < 35000) {
        return {
          color: [1.0, 1.0, 1.0, otherSatelliteTransparency],
          pickable: false
        };
      } else {
        return {
          color: [0.2, 1.0, 0.0, 0.65],
          pickable: true
        };
      }
    });
    ColorScheme.velocity = new ColorScheme(function (satId) {
      var vel = satSet.getSat(satId).velocity;
      var gradientAmt = Math.min(vel / 15, 1.0);
      return {
        color: [1.0 - gradientAmt, gradientAmt, 0.0, 1.0],
        pickable: true
      };
    });
    ColorScheme.group = new ColorScheme(function (satId) {
      if (groups.selectedGroup.hasSat(satId)) {
        return {
          color: [0.2, 1.0, 0.0, 0.5],
          pickable: true
        };
      } else {
        return {
          color: [1.0, 1.0, 1.0, otherSatelliteTransparency],
          pickable: false
        };
      }
    });

    $('#color-schemes-submenu').mouseover(function () {
    });
  };

  window.ColorScheme = ColorScheme;
})();

// **** 4 - groups ***

// function clearMenuCountries () {
//   groups.clearSelect();
//   $('#menu-groups .menu-title').text('Groups');
//   $('#menu-countries .menu-title').text('Countries');
//
//   searchBox.fillResultBox('');
//
//   $('#menu-countries .clear-option').css({display: 'none'}); // Hide Clear Option
//   $('#menu-countries .country-option').css({display: 'block'}); // Show Country Options
// }
(function () {
  var groups = {};
  groups.selectedGroup = null;

  function SatGroup (groupType, data) {
    this.sats = [];
    if (groupType === 'intlDes') {
      for (var i = 0; i < data.length; i++) {
        theSatId = satSet.getIdFromIntlDes(data[i]);
        if (theSatId === null) continue;
        this.sats.push({
          satId: theSatId,
          isIntlDes: true,
          isObjnum: false,
          strIndex: 0
        });
      }
    } else if (groupType === 'nameRegex') {
      var satIdList = satSet.searchNameRegex(data);
      for (i = 0; i < satIdList.length; i++) {
        this.sats.push({
          satId: satIdList[i],
          isIntlDes: false,
          isObjnum: false,
          strIndex: 0
        });
      }
    } else if (groupType === 'countryRegex') {
      satIdList = satSet.searchCountryRegex(data);
      for (i = 0; i < satIdList.length; i++) {
        this.sats.push({
          satId: satIdList[i],
          isIntlDes: false,
          isObjnum: false,
          strIndex: 0
        });
      }
    } else if (groupType === 'objNum') {
      for (i = 0; i < data.length; i++) {
        var theSatId = satSet.getIdFromObjNum(data[i]);
        if (theSatId === null) continue;
        this.sats.push({
          satId: theSatId,
          isIntlDes: false,
          isObjnum: true,
          strIndex: 0
        });
      }
    } else if (groupType === 'idList') {
      for (i = 0; i < data.length; i++) {
        this.sats.push({
          satId: data[i],
          isIntlDes: false,
          isObjnum: false,
          strIndex: 0
        });
      }
    }
  }

  SatGroup.prototype.hasSat = function (id) {
    var len = this.sats.length;
    for (var i = 0; i < len; i++) {
      if (this.sats[i].satId === id) return true;
    }
    return false;
  };

  SatGroup.prototype.updateOrbits = function () {
    // What calls the orbit buffer when selected a group from the menu.
    for (var i = 0; i < this.sats.length; i++) {
      orbitDisplay.updateOrbitBuffer(this.sats[i].satId);
    }
  };

  SatGroup.prototype.forEach = function (callback) {
    for (var i = 0; i < this.sats.length; i++) {
      callback(this.sats[i].satId);
    }
  };

  groups.SatGroup = SatGroup;

  groups.selectGroup = function (group) {
    // console.log('selectGroup with ' + group);
    if (group === null || group === undefined) {
      return;
    }
    // var start = performance.now();
    groups.selectedGroup = group;
    group.updateOrbits();
    satSet.setColorScheme(ColorScheme.group);
    // var t = performance.now() - start;
    // console.log('selectGroup: ' + t + ' ms');
  };

  groups.clearSelect = function () {
    groups.selectedGroup = null;
    if (isOnlyFOVChecked) { satSet.setColorScheme(ColorScheme.onlyFOV); }
    if (!isOnlyFOVChecked) { satSet.setColorScheme(ColorScheme.default); }
  };

  groups.init = function () {
    // var start = performance.now();

    // $('#groups-display>li').mouseover(function () {
    // NOTE:: This runs on mouseover of any li elements
    //
    // });

    $('#countries-menu>li').click(function () {
      var groupName = $(this).data('group');
      if (groupName === '<clear>') {
        // clearMenuCountries();
      } else {
        selectSat(-1); // Clear selected sat
        groups.selectGroup(groups[groupName]);
        searchBox.fillResultBox(groups[groupName].sats, '');

        $('#search').val('');

        var results = groups[groupName].sats;
        for (var i = 0; i < results.length; i++) {
          var satId = groups[groupName].sats[i].satId;
          var scc = satSet.getSat(satId).SCC_NUM;
          if (i === results.length - 1) {
            $('#search').val($('#search').val() + scc);
          } else {
            $('#search').val($('#search').val() + scc + ',');
          }
        }

        $('#menu-countries .clear-option').css({display: 'block'}); // Show Clear Option
        $('#menu-countries .country-option').css({display: 'none'}); // Hide Country Options
        // $('#menu-groups .clear-option').css({display: 'block'});
        // $('#menu-groups .menu-title').text('Groups (' + $(this).text() + ')');
        $('#menu-countries .menu-title').text('Countries (' + $(this).text() + ')');
      }

      $('#groups-display').css({
        display: 'none'
      });
    });
    $('#colors-menu>li').click(function () {
      selectSat(-1); // clear selected sat
      var colorName = $(this).data('color');
      // clearMenuCountries();
      switch (colorName) {
        case 'default':
          satSet.setColorScheme(ColorScheme.default);
          break;
        case 'velocity':
          satSet.setColorScheme(ColorScheme.velocity);
          break;
        case 'near-earth':
          satSet.setColorScheme(ColorScheme.leo);
          break;
        case 'deep-space':
          satSet.setColorScheme(ColorScheme.geo);
          break;
        case 'lost-objects':
          $('#search').val('');
          satSet.setColorScheme(ColorScheme.lostobjects);
          searchBox.doSearch($('#search').val());
          break;
        case 'rcs':
          satSet.setColorScheme(ColorScheme.rcs);
          break;
        case 'smallsats':
          satSet.setColorScheme(ColorScheme.smallsats);
          break;
      }
    });

    // COUNTRIES
    groups.Canada = new SatGroup('countryRegex', /CA/);
    groups.China = new SatGroup('countryRegex', /PRC/);
    groups.France = new SatGroup('countryRegex', /FR/);
    groups.India = new SatGroup('countryRegex', /IND/);
    groups.Israel = new SatGroup('countryRegex', /ISRA/);
    groups.Japan = new SatGroup('countryRegex', /JPN/);
    groups.Russia = new SatGroup('countryRegex', /CIS/);
    groups.UnitedKingdom = new SatGroup('countryRegex', /UK/);
    groups.UnitedStates = new SatGroup('countryRegex', /US/);

    // GROUPS
    groups.SpaceStations = new SatGroup('objNum', [25544, 41765]);
    groups.GlonassGroup = new SatGroup('nameRegex', /GLONASS/);
    groups.GalileoGroup = new SatGroup('nameRegex', /GALILEO/);
    groups.GPSGroup = new SatGroup('nameRegex', /NAVSTAR/);
    groups.AmatuerRadio = new SatGroup('objNum', [7530, 14781, 20442, 22826, 24278, 25338, 25397, 25544, 26931,
      27607, 27844, 27848, 28895, 32785, 32788, 32789, 32791, 33493, 33498, 33499, 35932, 35933, 35935, 37224,
      37839, 37841, 37855, 38760, 39090, 39134, 39136, 39161, 39417, 39430, 39436, 39439, 39440, 39444, 39469,
      39770, 40014, 40021, 40024, 40025, 40030, 40032, 40042, 40043, 40057, 40071, 40074, 40377, 40378, 40379,
      40380, 40654, 40719, 40900, 40903, 40906, 40907, 40908, 40910, 40911, 40912, 40926, 40927, 40928, 40931,
      40967, 40968, 41168, 41171, 41340, 41459, 41460, 41465, 41474, 41600, 41619, 41789, 41932, 41935, 42017]);
    // SCC#s based on Uninon of Concerned Scientists
    groups.MilitarySatellites = new SatGroup('objNum', [40420, 41394, 32783, 35943, 36582, 40353, 40555, 41032, 38010, 38008, 38007, 38009,
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
    groups.Tag42 = new SatGroup('objNum', ['25544']);

    // console.log('groups init: ' + (performance.now() - start) + ' ms');
  };
  window.groups = groups;
})();
// **** 5 - search-box ***
(function () {
  var searchBox = {};
  var SEARCH_LIMIT = 200; // Set Maximum Number of Satellites for Search
  var satData;

  var hovering = false;
  var hoverSatId = -1;

  var resultsOpen = false;
  var lastResultGroup;

  searchBox.isResultBoxOpen = function () {
    return resultsOpen;
  };

  searchBox.getLastResultGroup = function () {
    return lastResultGroup;
  };

  searchBox.getCurrentSearch = function () {
    if (resultsOpen) {
      return $('#search').val();
    } else {
      return null;
    }
  };

  searchBox.isHovering = function () {
    return hovering;
  };

  searchBox.getHoverSat = function () {
    return hoverSatId;
  };

  searchBox.hideResults = function () {
    var sr = $('#search-results');
    sr.slideUp();
    groups.clearSelect();
    resultsOpen = false;
  };

  searchBox.doSearch = function (str) {
    selectSat(-1);

    if (str.length === 0) {
      searchBox.hideResults();
      return;
    }

    // var searchStart = performance.now();

    var bigstr = str.toUpperCase();
    var arr = str.split(',');

    var bigarr = bigstr.split(',');
    var results = [];
    for (var j = 0; j < arr.length; j++) {
      bigstr = bigarr[j];
      str = arr[j];
      if (str.length <= 2) { return; }
      var len = arr[j].length;

      for (var i = 0; i < satData.length; i++) {
        if ((satData[i].ON.indexOf(str) !== -1) || (satData[i].ON.indexOf(bigstr) !== -1)) {
          results.push({
            isIntlDes: false,
            isInView: satData[i].inview,
            isObjnum: false,
            strIndex: satData[i].ON.indexOf(str),
            SCC_NUM: satData[i].SCC_NUM,
            patlen: len,
            satId: i
          });
        }

        // if (satData[i].OT.indexOf(bigstr) !== -1) {
        //   SEARCH_LIMIT = 5000;
        //   results.push({
        //     isIntlDes: false,
        //     isInView: satData[i].inview,
        //     isObjnum: false,
        //     strIndex: satData[i].OT.indexOf(bigstr),
        //     SCC_NUM: satData[i].SCC_NUM,
        //     patlen: len,
        //     satId: i
        //   });
        // }

        if ((satData[i].LV.indexOf(str) !== -1) || (satData[i].LV.indexOf(bigstr) !== -1)) {
          results.push({
            isIntlDes: false,
            isInView: satData[i].inview,
            isObjnum: false,
            strIndex: satData[i].LV.indexOf(str),
            SCC_NUM: satData[i].SCC_NUM,
            patlen: len,
            satId: i
          });
        }

        if (satData[i].intlDes.indexOf(str) !== -1) {
          if (satData[i].SCC_NUM.indexOf(str) !== -1) {
            results.push({
              isIntlDes: true,
              isInView: satData[i].inview,
              isObjnum: true,
              strIndex: satData[i].intlDes.indexOf(str),
              SCC_NUM: satData[i].SCC_NUM,
              patlen: len,
              satId: i
            });
          } else {
            results.push({
              isIntlDes: true,
              isInView: satData[i].inview,
              isObjnum: false,
              strIndex: satData[i].intlDes.indexOf(str),
              SCC_NUM: satData[i].SCC_NUM,
              patlen: len,
              satId: i
            });
          }
        } else if (satData[i].SCC_NUM.indexOf(str) !== -1) {
          if (satData[i].intlDes.indexOf(str) !== -1) {
            results.push({
              isIntlDes: true,
              isInView: satData[i].inview,
              isObjnum: true,
              strIndex: satData[i].intlDes.indexOf(str),
              SCC_NUM: satData[i].SCC_NUM,
              patlen: len,
              satId: i
            });
          } else {
            results.push({
              isIntlDes: false,
              isInView: satData[i].inview,
              isObjnum: true,
              strIndex: satData[i].SCC_NUM.indexOf(str),
              SCC_NUM: satData[i].SCC_NUM,
              patlen: len,
              satId: i
            });
          }
        }
      }
    } // end for j
    // var resultCount = results.length;

    if (results.length > SEARCH_LIMIT) {
      results.length = SEARCH_LIMIT;
    }

    // Make a group to hilight results
    var idList = [];
    for (i = 0; i < results.length; i++) {
      idList.push(results[i].satId);
    }
    var dispGroup = new groups.SatGroup('idList', idList);
    lastResultGroup = dispGroup;
    groups.selectGroup(dispGroup);

    searchBox.fillResultBox(results);
    // searchBox.filterInView(results);
    updateUrl();
  };

  searchBox.fillResultBox = function (results) {
    var resultBox = $('#search-results');
    var html = '';
    for (var i = 0; i < results.length; i++) {
      var sat = satData[results[i].satId];
      html += '<div class="search-result" data-sat-id="' + sat.id + '">';
      if (results[i].isIntlDes || results[i].isObjnum) {
        html += sat.ON;
      } else {
        html += sat.ON.substring(0, results[i].strIndex);
        html += '<span class="search-hilight">';
        html += sat.ON.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
        html += '</span>';
        html += sat.ON.substring(results[i].strIndex + results[i].patlen);
      }
      html += '<div class="search-result-scc">';
      if (results[i].isObjnum) {
        html += sat.SCC_NUM.substring(0, results[i].strIndex);
        html += '<span class="search-hilight">';
        html += sat.SCC_NUM.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
        html += '</span>';
        html += sat.SCC_NUM.substring(results[i].strIndex + results[i].patlen);
      } else {
        html += sat.SCC_NUM;
      }
      html += '</div></div>';
    }
    // var resultStart = performance.now();
    resultBox[0].innerHTML = html;
    resultBox.slideDown();
    resultsOpen = true;
  };

  searchBox.init = function (_satData) {
    satData = _satData;
    $('#search-results').on('click', '.search-result', function (evt) {
      var satId = $(this).data('sat-id');
      selectSat(satId);
    });

    $('#search-results').on('mouseover', '.search-result', function (evt) {
      var satId = $(this).data('sat-id');
      orbitDisplay.setHoverOrbit(satId);
      satSet.setHover(satId);

      hovering = true;
      hoverSatId = satId;
    });

    $('#search-results').mouseout(function () {
      orbitDisplay.clearHoverOrbit();
      satSet.setHover(-1);
      hovering = false;
    });

    $('#search').on('input', function () {
      // var initStart = performance.now();
      var searchStr = $('#search').val();

      searchBox.doSearch(searchStr);
    });

    $('#all-objects-link').click(function () {
      if (selectedSat === -1) {
        return;
      }
      var intldes = satSet.getSat(selectedSat).intlDes;
      var searchStr = intldes.slice(0, 8);
      searchBox.doSearch(searchStr);
      $('#search').val(searchStr);
    });
    $('#near-objects-link').click(function () {
      if (selectedSat === -1) {
        return;
      }
      var sat = selectedSat;
      var SCCs = [];
      var pos = satSet.getSat(sat).position;
      var posXmin = pos.x - 100;
      var posXmax = pos.x + 100;
      var posYmin = pos.y - 100;
      var posYmax = pos.y + 100;
      var posZmin = pos.z - 100;
      var posZmax = pos.z + 100;
      $('#search').val('');
      for (var i = 0; i < satSet.numSats; i++) {
        pos = satSet.getSat(i).position;
        if (pos.x < posXmax && pos.x > posXmin && pos.y < posYmax && pos.y > posYmin && pos.z < posZmax && pos.z > posZmin) {
          SCCs.push(satSet.getSat(i).SCC_NUM);
        }
      }

      for (i = 0; i < SCCs.length; i++) {
        if (i < SCCs.length - 1) {
          $('#search').val($('#search').val() + SCCs[i] + ',');
        } else {
          $('#search').val($('#search').val() + SCCs[i]);
        }
      }

      searchBox.doSearch($('#search').val());
      return;
    });
  };
  window.searchBox = searchBox;
})();
// **** 6 - orbit-display ***
(function () {
  var NUM_SEGS = 255;

  var glBuffers = [];
  var inProgress = [];

  var orbitDisplay = {};

  var pathShader;

  var selectOrbitBuf;
  var hoverOrbitBuf;

  var selectColor = [1.0, 0.0, 0.0, 1.0];
  var hoverColor = [0.5, 0.5, 1.0, 1.0];
  var groupColor = [0.3, 0.5, 1.0, 0.4];

  var currentHoverId = -1;
  var currentSelectId = -1;

  var orbitMvMat = mat4.create();

  var orbitWorker = new Worker('js/orbit-calculation-worker.js');

  var initialized = false;

  orbitDisplay.init = function () {
    // var startTime = performance.now();

    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, shaderLoader.getShaderCode('path-vertex.glsl'));
    gl.compileShader(vs);

    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, shaderLoader.getShaderCode('path-fragment.glsl'));
    gl.compileShader(fs);

    pathShader = gl.createProgram();
    gl.attachShader(pathShader, vs);
    gl.attachShader(pathShader, fs);
    gl.linkProgram(pathShader);

    pathShader.aPos = gl.getAttribLocation(pathShader, 'aPos');
    pathShader.uMvMatrix = gl.getUniformLocation(pathShader, 'uMvMatrix');
    pathShader.uCamMatrix = gl.getUniformLocation(pathShader, 'uCamMatrix');
    pathShader.uPMatrix = gl.getUniformLocation(pathShader, 'uPMatrix');
    pathShader.uColor = gl.getUniformLocation(pathShader, 'uColor');

    selectOrbitBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, selectOrbitBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((NUM_SEGS + 1) * 3), gl.STATIC_DRAW);

    hoverOrbitBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, hoverOrbitBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((NUM_SEGS + 1) * 3), gl.STATIC_DRAW);

    for (var i = 0; i < satSet.numSats; i++) {
      glBuffers.push(allocateBuffer());
    }
    orbitWorker.postMessage({
      isInit: true,
      satData: satSet.satDataString,
      numSegs: NUM_SEGS
    });
    initialized = true;

    // var time = performance.now() - startTime;
    // console.log('orbitDisplay init: ' + time + ' ms');
  };

  orbitDisplay.updateOrbitBuffer = function (satId, force, TLE1, TLE2) {
    if (!inProgress[satId]) {
      if (force) {
        orbitWorker.postMessage({
          isInit: false,
          isUpdate: true,
          satId: satId,
          realTime: propRealTime,
          offset: propOffset,
          rate: propRate,
          // NOTE: STATIC TLE
          TLE1: TLE1,
          TLE2: TLE2
        });
      } else {
        orbitWorker.postMessage({
          isInit: false,
          satId: satId,
          realTime: propRealTime,
          offset: propOffset,
          rate: propRate
        });
        inProgress[satId] = true;
      }
    } else {
    }
  };

  orbitWorker.onmessage = function (m) {
    var satId = m.data.satId;
    var pointsOut = new Float32Array(m.data.pointsOut);
    gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[satId]);
    gl.bufferData(gl.ARRAY_BUFFER, pointsOut, gl.DYNAMIC_DRAW);
    inProgress[satId] = false;
  };

  /* orbitDisplay.setOrbit = function (satId) {
    var sat = satSet.getSat(satId);
    mat4.identity(orbitMvMat);
    //apply steps in reverse order because matrix multiplication
    // (last multiplied in is first applied to vertex)

    //step 5. rotate to RAAN
    mat4.rotateZ(orbitMvMat, orbitMvMat, sat.raan + Math.PI/2);
    //step 4. incline the plane
    mat4.rotateY(orbitMvMat, orbitMvMat, -sat.inclination);
    //step 3. rotate to argument of periapsis
    mat4.rotateZ(orbitMvMat, orbitMvMat, sat.argPe - Math.PI/2);
    //step 2. put earth at the focus
    mat4.translate(orbitMvMat, orbitMvMat, [sat.semiMajorAxis - sat.apogee - 6371, 0, 0]);
    //step 1. stretch to ellipse
    mat4.scale(orbitMvMat, orbitMvMat, [sat.semiMajorAxis, sat.semiMinorAxis, 0]);

  };

  orbitDisplay.clearOrbit = function () {
    mat4.identity(orbitMvMat);
  } */

  orbitDisplay.setSelectOrbit = function (satId) {
   // var start = performance.now();
    currentSelectId = satId;
    orbitDisplay.updateOrbitBuffer(satId);
   // console.log('setOrbit(): ' + (performance.now() - start) + ' ms');
  };

  orbitDisplay.clearSelectOrbit = function () {
    currentSelectId = -1;
    gl.bindBuffer(gl.ARRAY_BUFFER, selectOrbitBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((NUM_SEGS + 1) * 3), gl.DYNAMIC_DRAW);
  };

  orbitDisplay.setHoverOrbit = function (satId) {
    if (satId === currentHoverId) return;
    currentHoverId = satId;
    orbitDisplay.updateOrbitBuffer(satId);
  };

  orbitDisplay.clearHoverOrbit = function (satId) {
    if (currentHoverId === -1) return;
    currentHoverId = -1;

    gl.bindBuffer(gl.ARRAY_BUFFER, hoverOrbitBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((NUM_SEGS + 1) * 3), gl.DYNAMIC_DRAW);
  };

  orbitDisplay.draw = function (pMatrix, camMatrix) { // lol what do I do here
    if (!initialized) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(pathShader);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
   // gl.depthMask(false);

    gl.uniformMatrix4fv(pathShader.uMvMatrix, false, orbitMvMat);
    gl.uniformMatrix4fv(pathShader.uCamMatrix, false, camMatrix);
    gl.uniformMatrix4fv(pathShader.uPMatrix, false, pMatrix);

    if (currentSelectId !== -1) {
      gl.uniform4fv(pathShader.uColor, selectColor);
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[currentSelectId]);
      gl.vertexAttribPointer(pathShader.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINE_STRIP, 0, NUM_SEGS + 1);
    }

    if (currentHoverId !== -1 && currentHoverId !== currentSelectId) { // avoid z-fighting
      gl.uniform4fv(pathShader.uColor, hoverColor);
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[currentHoverId]);
      gl.vertexAttribPointer(pathShader.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINE_STRIP, 0, NUM_SEGS + 1);
    }
    if (groups.selectedGroup !== null) {
      gl.uniform4fv(pathShader.uColor, groupColor);
      groups.selectedGroup.forEach(function (id) {
        // if (groups.selectedGroup.sats.length <= maxOrbitsDisplayed) {
        gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[id]);
        gl.vertexAttribPointer(pathShader.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_STRIP, 0, NUM_SEGS + 1);
        // }
      });
    }

    //  gl.depthMask(true);
    gl.disable(gl.BLEND);
  };

  function allocateBuffer () {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((NUM_SEGS + 1) * 3), gl.STATIC_DRAW);
    return buf;
  }

  orbitDisplay.getPathShader = function () {
    return pathShader;
  };

  window.orbitDisplay = orbitDisplay;
})();
// **** 7 - line ***
(function () {
  function Line () {
    this.vertBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(6), gl.STREAM_DRAW);
  }

  Line.prototype.set = function (pt1, pt2) {
    var buf = [];
    buf.push(pt1[0]);
    buf.push(pt1[1]);
    buf.push(pt1[2]);
    buf.push(pt2[0]);
    buf.push(pt2[1]);
    buf.push(pt2[2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buf), gl.STREAM_DRAW);
  };

  Line.prototype.draw = function () {
    var shader = orbitDisplay.getPathShader();
    gl.useProgram(shader);
    gl.uniform4fv(shader.uColor, [1.0, 0.0, 1.0, 1.0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.vertexAttribPointer(shader.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 2);
  };

  window.Line = Line;
})();
// **** propTime used by sun and earth.js
function propTime () {
  'use strict';
  var now = new Date();
  var realElapsedMsec = Number(now) - Number(propRealTime);
  var scaledMsec = realElapsedMsec * propRate;
  if (propRate === 0) {
    now.setTime(Number(propFrozen) + propOffset);
  } else {
    now.setTime(Number(propRealTime) + propOffset + scaledMsec);
  }
  // console.log('propTime: ' + now + ' elapsed=' + realElapsedMsec/1000);
  return now;
}
// **** 8 - earth ***
(function () {
  var earth = {};
  var NUM_LAT_SEGS = 64;
  var NUM_LON_SEGS = 64;

  var vertPosBuf, vertNormBuf, texCoordBuf, vertIndexBuf; // GPU mem buffers, data and stuff?
  var vertCount;

  var earthShader;

  earth.pos = [0, 0, 0];

  var texture, nightTexture;

  var texLoaded = false;
  var nightLoaded = false;
  var loaded = false;

  function onImageLoaded () {
    if (texLoaded && nightLoaded) {
      loaded = true;
      $('#loader-text').text('Drawing Dots in Space...');
    }
  }

  earth.init = function () {
    // var startTime = new Date().getTime();

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    var fragCode = shaderLoader.getShaderCode('earth-fragment.glsl');
    gl.shaderSource(fragShader, fragCode);
    gl.compileShader(fragShader);

    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    var vertCode = shaderLoader.getShaderCode('earth-vertex.glsl');
    gl.shaderSource(vertShader, vertCode);
    gl.compileShader(vertShader);

    earthShader = gl.createProgram();
    gl.attachShader(earthShader, vertShader);
    gl.attachShader(earthShader, fragShader);
    gl.linkProgram(earthShader);

    earthShader.aVertexPosition = gl.getAttribLocation(earthShader, 'aVertexPosition');
    earthShader.aTexCoord = gl.getAttribLocation(earthShader, 'aTexCoord');
    earthShader.aVertexNormal = gl.getAttribLocation(earthShader, 'aVertexNormal');
    earthShader.uPMatrix = gl.getUniformLocation(earthShader, 'uPMatrix');
    earthShader.uCamMatrix = gl.getUniformLocation(earthShader, 'uCamMatrix');
    earthShader.uMvMatrix = gl.getUniformLocation(earthShader, 'uMvMatrix');
    earthShader.uNormalMatrix = gl.getUniformLocation(earthShader, 'uNormalMatrix');
    earthShader.uLightDirection = gl.getUniformLocation(earthShader, 'uLightDirection');
    earthShader.uAmbientLightColor = gl.getUniformLocation(earthShader, 'uAmbientLightColor');
    earthShader.uDirectionalLightColor = gl.getUniformLocation(earthShader, 'uDirectionalLightColor');
    earthShader.uSampler = gl.getUniformLocation(earthShader, 'uSampler');
    earthShader.uNightSampler = gl.getUniformLocation(earthShader, 'uNightSampler');

    texture = gl.createTexture();
    var img = new Image();
    img.onload = function () {
      $('#loader-text').text('Painting the Earth...');
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      // console.log('earth.js loaded texture');
      texLoaded = true;
      onImageLoaded();
    };
    img.src = 'images/dayearth-4096.jpg';
  //  img.src = '/mercator-tex-512.jpg';

    nightTexture = gl.createTexture();
    var nightImg = new Image();
    nightImg.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, nightTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, nightImg);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      // console.log('earth.js loaded nightearth');
      nightLoaded = true;
      onImageLoaded();
    };
    nightImg.src = 'images/nightearth-4096.png';
   // nightImg.src = '/nightearth-512.jpg';

    // generate a uvsphere bottom up, CCW order
    var vertPos = [];
    var vertNorm = [];
    var texCoord = [];
    for (var lat = 0; lat <= NUM_LAT_SEGS; lat++) {
      var latAngle = (Math.PI / NUM_LAT_SEGS) * lat - (Math.PI / 2);
      var diskRadius = Math.cos(Math.abs(latAngle));
      var z = Math.sin(latAngle);
      // console.log('LAT: ' + latAngle * R2D + ' , Z: ' + z);
      // var i = 0;
      for (var lon = 0; lon <= NUM_LON_SEGS; lon++) { // add an extra vertex for texture funness
        var lonAngle = (Math.PI * 2 / NUM_LON_SEGS) * lon;
        var x = Math.cos(lonAngle) * diskRadius;
        var y = Math.sin(lonAngle) * diskRadius;
        // console.log('i: ' + i + '    LON: ' + lonAngle * R2D + ' X: ' + x + ' Y: ' + y)

        // mercator cylindrical projection (simple angle interpolation)
        var v = 1 - (lat / NUM_LAT_SEGS);
        var u = 0.5 + (lon / NUM_LON_SEGS); // may need to change to move map
        // console.log('u: ' + u + ' v: ' + v);
        // normals: should just be a vector from center to point (aka the point itself!

        vertPos.push(x * RADIUS_OF_EARTH);
        vertPos.push(y * RADIUS_OF_EARTH);
        vertPos.push(z * RADIUS_OF_EARTH);
        texCoord.push(u);
        texCoord.push(v);
        vertNorm.push(x);
        vertNorm.push(y);
        vertNorm.push(z);

        // i++;
      }
    }

    // ok let's calculate vertex draw orders.... indiv triangles
    var vertIndex = [];
    for (lat = 0; lat < NUM_LAT_SEGS; lat++) { // this is for each QUAD, not each vertex, so <
      for (lon = 0; lon < NUM_LON_SEGS; lon++) {
        var blVert = lat * (NUM_LON_SEGS + 1) + lon; // there's NUM_LON_SEGS + 1 verts in each horizontal band
        var brVert = blVert + 1;
        var tlVert = (lat + 1) * (NUM_LON_SEGS + 1) + lon;
        var trVert = tlVert + 1;
        // console.log('bl: ' + blVert + ' br: ' + brVert +  ' tl: ' + tlVert + ' tr: ' + trVert);
        vertIndex.push(blVert);
        vertIndex.push(brVert);
        vertIndex.push(tlVert);

        vertIndex.push(tlVert);
        vertIndex.push(trVert);
        vertIndex.push(brVert);
      }
    }
    vertCount = vertIndex.length;

    vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

    vertNormBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

    texCoordBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STATIC_DRAW);

    vertIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);

    // var end = new Date().getTime() - startTime;
    // console.log('earth init: ' + end + ' ms');
  };

  earth.draw = function (pMatrix, camMatrix) {
    if (!loaded) return;

    // var now = new Date();
    var now = propTime();

    $('#datetime-text').click(function () {
      if (!isEditTime) {
        $('#datetime-text').fadeOut();
        $('#datetime-input').fadeIn();
        $('#datetime-input-tb').focus();
        isEditTime = true;
      }
    });

    // wall time is not propagation time, so better print it
    var datestr = now.toJSON();
    var textstr = datestr.substring(0, 10) + ' ' + datestr.substring(11, 19);
    if (propRate > 1.01 || propRate < 0.99) {
      var digits = 1;
      if (propRate < 10) {
        digits = 2;
      }
      textstr = textstr + ' ' + propRate.toFixed(digits) + 'x';
    }
    $('#datetime-text').text(textstr);
    $('#datetime-input-tb').val(textstr);

    var j = jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 now.getUTCDate(),
                 now.getUTCHours(),
                 now.getUTCMinutes(),
                 now.getUTCSeconds());
    j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond

    var era = satellite.gstime_from_jday(j);

    var lightDirection = sun.currentDirection();
    vec3.normalize(lightDirection, lightDirection);

    var mvMatrix = mat4.create();
    mat4.identity(mvMatrix);
    mat4.rotateZ(mvMatrix, mvMatrix, era);
    mat4.translate(mvMatrix, mvMatrix, earth.pos);
    var nMatrix = mat3.create();
    mat3.normalFromMat4(nMatrix, mvMatrix);

    gl.useProgram(earthShader);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.uniformMatrix3fv(earthShader.uNormalMatrix, false, nMatrix);
    gl.uniformMatrix4fv(earthShader.uMvMatrix, false, mvMatrix);
    gl.uniformMatrix4fv(earthShader.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(earthShader.uCamMatrix, false, camMatrix);
    gl.uniform3fv(earthShader.uLightDirection, lightDirection);
    gl.uniform3fv(earthShader.uAmbientLightColor, [0.03, 0.03, 0.03]); // RGB ambient light
    gl.uniform3fv(earthShader.uDirectionalLightColor, [1, 1, 0.9]); // RGB directional light

    gl.uniform1i(earthShader.uSampler, 0); // point sampler to TEXTURE0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture); // bind texture to TEXTURE0

    gl.uniform1i(earthShader.uNightSampler, 1);  // point sampler to TEXTURE1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, nightTexture); // bind tex to TEXTURE1

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.enableVertexAttribArray(earthShader.aTexCoord);
    gl.vertexAttribPointer(earthShader.aTexCoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.enableVertexAttribArray(earthShader.aVertexPosition);
    gl.vertexAttribPointer(earthShader.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttribPointer(gl.pickShaderProgram.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
    gl.enableVertexAttribArray(earthShader.aVertexNormal);
    gl.vertexAttribPointer(earthShader.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
    gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

    gl.useProgram(gl.pickShaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.uniformMatrix4fv(gl.pickShaderProgram.uMvMatrix, false, mvMatrix); // set up picking
    gl.disableVertexAttribArray(gl.pickShaderProgram.aColor);
    gl.enableVertexAttribArray(gl.pickShaderProgram.aPos);
    gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);
  };

  function jday (year, mon, day, hr, minute, sec) { // from satellite.js
    'use strict';
    return (367.0 * year -
          Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
          Math.floor(275 * mon / 9.0) +
          day + 1721013.5 +
          ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
          // #  - 0.5*sgn(100.0*year + mon - 190002.5) + 0.5;
          );
  }

  window.earth = earth;
})();
// **** 9 - sun ***
(function () {
  var D2R = Math.PI / 180.0;

  function currentDirection () {
    var now = propTime();
    var j = jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 now.getUTCDate(),
                 now.getUTCHours(),
                 now.getUTCMinutes(),
                 now.getUTCSeconds());
    j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond

    return getDirection(j);
  }

  function getDirection (jd) {
    var n = jd - 2451545;
    var L = (280.460) + (0.9856474 * n); // mean longitude of sun
    var g = (357.528) + (0.9856003 * n); // mean anomaly
    L = L % 360.0;
    g = g % 360.0;

    var ecLon = L + 1.915 * Math.sin(g * D2R) + 0.020 * Math.sin(2 * g * D2R);
    var ob = getObliquity(jd);

    var x = Math.cos(ecLon * D2R);
    var y = Math.cos(ob * D2R) * Math.sin(ecLon * D2R);
    var z = Math.sin(ob * D2R) * Math.sin(ecLon * D2R);

    return [x, y, z];
   // return [1, 0, 0];
  }

  function getObliquity (jd) {
    var t = (jd - 2451545) / 3652500;

    var ob = 84381.448 - 4680.93 * t - 1.55 * Math.pow(t, 2) + 1999.25 *
    Math.pow(t, 3) - 51.38 * Math.pow(t, 4) - 249.67 * Math.pow(t, 5) -
    39.05 * Math.pow(t, 6) + 7.12 * Math.pow(t, 7) + 27.87 * Math.pow(t, 8) +
    5.79 * Math.pow(t, 9) + 2.45 * Math.pow(t, 10);
    /* Human Readable Version
    var ob =  // arcseconds
      84381.448
     - 4680.93  * t
     -    1.55  * Math.pow(t, 2)
     + 1999.25  * Math.pow(t, 3)
     -   51.38  * Math.pow(t, 4)
     -  249.67  * Math.pow(t, 5)
     -   39.05  * Math.pow(t, 6)
     +    7.12  * Math.pow(t, 7)
     +   27.87  * Math.pow(t, 8)
     +    5.79  * Math.pow(t, 9)
     +    2.45  * Math.pow(t, 10);
     */

    return ob / 3600.0;
  }

  function jday (year, mon, day, hr, minute, sec) { // from satellite.js
    'use strict';
    return (367.0 * year -
          Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
          Math.floor(275 * mon / 9.0) +
          day + 1721013.5 +
          ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
          // #  - 0.5*sgn(100.0*year + mon - 190002.5) + 0.5;
          );
  }

  window.sun = {
    getDirection: getDirection,
    currentDirection: currentDirection
  };
})();
// **** 10 - sat ***
(function () {
  var satSet = {};
  var dotShader;
  var satPosBuf;
  var satColorBuf;
  var pickColorBuf;
  var pickableBuf;
  var currentColorScheme;
  var shadersReady = false;

  var satPos;
  var satVel;
  var satInView;
  var satData;
  var satExtraData;
  var hoveringSat = -1;
  var selectedSat = -1;
  var hoverColor = [0.1, 1.0, 0.0, 1.0];
  var selectedColor = [0.0, 1.0, 1.0, 1.0];

  try {
    $('#loader-text').text('Locating ELSETs...');
    satCruncher = new Worker('js/sat-cruncher.js');
  } catch (E) {
    browserUnsupported();
  }

  var cruncherReady = false;
  var lastDrawTime = 0;
  var lastFOVUpdateTime = 0;
  var cruncherReadyCallback;
  var gotExtraData = false;

  satCruncher.onmessage = function (m) {
    if (!gotExtraData) { // store extra data that comes from crunching
      // Only do this once
      // var start = performance.now();

      satExtraData = JSON.parse(m.data.extraData);

      for (var i = 0; i < satSet.numSats; i++) {
        satData[i].inclination = satExtraData[i].inclination;
        satData[i].eccentricity = satExtraData[i].eccentricity;
        satData[i].raan = satExtraData[i].raan;
        satData[i].argPe = satExtraData[i].argPe;
        satData[i].meanMotion = satExtraData[i].meanMotion;

        satData[i].semiMajorAxis = satExtraData[i].semiMajorAxis;
        satData[i].semiMinorAxis = satExtraData[i].semiMinorAxis;
        satData[i].apogee = satExtraData[i].apogee;
        satData[i].perigee = satExtraData[i].perigee;
        satData[i].period = satExtraData[i].period;

        // Converts JSON File into Words NOTE: This allows shrinking the JSON file
        // if (satExtraData[i].OBJECT_TYPE) {
        //   satData[i].OBJECT_TYPE = satExtraData[i].OBJECT_TYPE;
        // }
        satData[i].SCC_NUM = satExtraData[i].SCC_NUM;
        // satData[i].RCS_SIZE = satExtraData[i].RCS_SIZE;
        // satData[i].LAUNCH_SITE = satExtraData[i].LAUNCH_SITE;
        // satData[i].LAUNCH_SITEC = satExtraData[i].LAUNCH_SITEC;
        // satData[i].LAUNCH_VEHICLE = satExtraData[i].LAUNCH_VEHICLE;
        // satData[i].COUNTRY = satExtraData[i].COUNTRY;
        // satData[i].INTLDES = satExtraData[i].INTLDES;
      }

      // console.log('sat.js copied extra data in ' + (performance.now() - start) + ' ms');
      gotExtraData = true;
      return;
    }

    if (m.data.extraUpdate) {
      satExtraData = JSON.parse(m.data.extraData);
      i = m.data.satId;

      satData[i].inclination = satExtraData[0].inclination;
      satData[i].eccentricity = satExtraData[0].eccentricity;
      satData[i].raan = satExtraData[0].raan;
      satData[i].argPe = satExtraData[0].argPe;
      satData[i].meanMotion = satExtraData[0].meanMotion;

      satData[i].semiMajorAxis = satExtraData[0].semiMajorAxis;
      satData[i].semiMinorAxis = satExtraData[0].semiMinorAxis;
      satData[i].apogee = satExtraData[0].apogee;
      satData[i].perigee = satExtraData[0].perigee;
      satData[i].period = satExtraData[0].period;
      satData[i].TLE1 = satExtraData[0].TLE1;
      satData[i].TLE2 = satExtraData[0].TLE2;
      return;
    }

    satPos = new Float32Array(m.data.satPos);
    satVel = new Float32Array(m.data.satVel);
    // satAlt = new Float32Array(m.data.satAlt);
    // satLon = new Float32Array(m.data.satLon);
    // satLat = new Float32Array(m.data.satLat);
    // satAzimuth = new Float32Array(m.data.satAzimuth);
    // satElevation = new Float32Array(m.data.satElevation);
    // satRange = new Float32Array(m.data.satRange);
    satInView = new Float32Array(m.data.satInView);

    satSet.setColorScheme(currentColorScheme); // force color recalc

    if (!cruncherReady) {
      // NOTE:: This is called right after all the objects load on the screen.
      // $('#load-cover').fadeOut();
      $('#logo-container').fadeOut();
      $('body').attr('style', 'background:black');
      $('#canvas-holder').attr('style', 'display:block');
      // $('#menu-sensor-info img').removeClass('bmenu-item-disabled');
      // $('#menu-in-coverage img').removeClass('bmenu-item-disabled');
      // $('#menu-lookangles img').removeClass('bmenu-item-disabled');
      // $('#menu-lookanglesmultisite img').removeClass('bmenu-item-disabled');
      $('#menu-find-sat img').removeClass('bmenu-item-disabled');
      $('#menu-twitter img').removeClass('bmenu-item-disabled');
      // $('#menu-weather img').removeClass('bmenu-item-disabled');
      $('#menu-space-weather img').removeClass('bmenu-item-disabled');
      $('#menu-launches img').removeClass('bmenu-item-disabled');
      $('#menu-about img').removeClass('bmenu-item-disabled');
      $('#menu-space-stations img').removeClass('bmenu-item-disabled');
      $('#menu-satellite-collision img').removeClass('bmenu-item-disabled');
      $('#menu-customSensor img').removeClass('bmenu-item-disabled');
      $('#menu-settings img').removeClass('bmenu-item-disabled');
      isBottomIconsEnabled = true;
      satSet.setColorScheme(currentColorScheme); // force color recalc
      cruncherReady = true;
      if (cruncherReadyCallback) {
        cruncherReadyCallback(satData);
      }
    }

    satExtraData = null;
  };

  satSet.init = function (satsReadyCallback) {
    dotShader = gl.createProgram();

    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex.glsl'));
    gl.compileShader(vertShader);

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, shaderLoader.getShaderCode('dot-fragment.glsl'));
    gl.compileShader(fragShader);

    gl.attachShader(dotShader, vertShader);
    gl.attachShader(dotShader, fragShader);
    gl.linkProgram(dotShader);

    dotShader.aPos = gl.getAttribLocation(dotShader, 'aPos');
    dotShader.aColor = gl.getAttribLocation(dotShader, 'aColor');
    dotShader.uMvMatrix = gl.getUniformLocation(dotShader, 'uMvMatrix');
    dotShader.uCamMatrix = gl.getUniformLocation(dotShader, 'uCamMatrix');
    dotShader.uPMatrix = gl.getUniformLocation(dotShader, 'uPMatrix');

    var tleSource = $('#tle-source').text();
    $.get('' + tleSource, function (resp) { // + '?fakeparameter=to_avoid_browser_cache'
      // var startTime = new Date().getTime();

      // console.log('sat.js downloaded data');
      satData = resp;
      satSet.satDataString = JSON.stringify(satData);

      // var postStart = performance.now();
      // send satCruncher starting_time_msec, time scale factor
      // console.log('posting offset msg');
      propRealTime = Date.now(); // assumed same as value in Worker, not passing

      // Get Lat Long Coordinates
      var obslatitude;
      var obslongitude;
      var obsheight;
      var obsminaz;
      var obsmaxaz;
      var obsminel;
      var obsmaxel;
      var obsminrange;
      var obsmaxrange;
      var queryStr = window.location.search.substring(1);
      var params = queryStr.split('&');
      for (var i = 0; i < params.length; i++) {
        var key = params[i].split('=')[0];
        var val = params[i].split('=')[1];
        switch (key) {
          // case 'maxsats':
          //   maxOrbitsDisplayed = val;
          //   break;
          case 'lat':
            obslatitude = val;
            break;
          case 'long':
            obslongitude = val;
            break;
          case 'hei':
            obsheight = val;
            break;
          case 'minaz':
            obsminaz = val;
            break;
          case 'maxaz':
            obsmaxaz = val;
            break;
          case 'minel':
            obsminel = val;
            break;
          case 'maxel':
            obsmaxel = val;
            break;
          case 'minrange':
            obsminrange = val;
            break;
          case 'maxrange':
            obsmaxrange = val;
            break;
        }
      }

      // TODO: Create logical checks to prevent 'bad' sesnors from being generated

      if (obslatitude !== undefined && obslongitude !== undefined && obsheight !== undefined && obsminaz !== undefined && obsmaxaz !== undefined && obsminel !== undefined &&
          obsmaxel !== undefined && obsminrange !== undefined && obsmaxrange !== undefined) {
        lookangles.setobs({
          lat: obslatitude,
          long: obslongitude,
          hei: obsheight,
          obsminaz: obsminaz,
          obsmaxaz: obsmaxaz,
          obsminel: obsminel,
          obsmaxel: obsmaxel,
          obsminrange: obsminrange,
          obsmaxrange: obsmaxrange
        });

        satCruncher.postMessage({
          typ: 'offset',
          dat: (propOffset).toString() + ' ' + (propRate).toString(),
          setlatlong: true,
          lat: obslatitude,
          long: obslongitude,
          hei: obsheight,
          obsminaz: obsminaz,
          obsmaxaz: obsmaxaz,
          obsminel: obsminel,
          obsmaxel: obsmaxel,
          obsminrange: obsminrange,
          obsmaxrange: obsmaxrange
        });

        $('#menu-in-coverage img').removeClass('bmenu-item-disabled');
      }

       // kick off satCruncher
       // console.log('posting satdata msg');

      satCruncher.postMessage({
        typ: 'satdata',
        dat: satSet.satDataString
      });

      // var postEnd = performance.now();
      // do some processing on our satData response

      for (i = 0; i < satData.length; i++) {
        var year = satData[i].TLE1.substr(9, 8).trim().substring(0, 2); // clean up intl des for display
        // console.log('year is',year);
        if (year === '') {
          satData[i].intlDes = 'none';
        } else {
          var prefix = (year > 50) ? '19' : '20';
          year = prefix + year;
          var rest = satData[i].TLE1.substr(9, 8).trim().substring(2);
          satData[i].intlDes = year + '-' + rest;
        }

        satData[i].id = i;
      }

      $('#loader-text').text('Drawing Satellites...');

      // populate GPU mem buffers, now that we know how many sats there are

      satPosBuf = gl.createBuffer();
      satPos = new Float32Array(satData.length * 3);

      var pickColorData = [];
      pickColorBuf = gl.createBuffer();
      for (i = 0; i < satData.length; i++) {
        var byteR = (i + 1) & 0xff;
        var byteG = ((i + 1) & 0xff00) >> 8;
        var byteB = ((i + 1) & 0xff0000) >> 16;
        pickColorData.push(byteR / 255.0);
        pickColorData.push(byteG / 255.0);
        pickColorData.push(byteB / 255.0);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, pickColorBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pickColorData), gl.STATIC_DRAW);

      satSet.numSats = satData.length;

      satSet.setColorScheme(ColorScheme.default);
      // satSet.setColorScheme(ColorScheme.apogee);
      // satSet.setColorScheme(ColorScheme.velocity);

      // var end = new Date().getTime();
      // console.log('sat.js init: ' + (end - startTime) + ' ms (incl post: ' + (postEnd - postStart) + ' ms)');

      shadersReady = true;
      if (satsReadyCallback) {
        $('#loader-text').text('Coloring Inside the Lines...');
        satsReadyCallback(satData);
      }
    });
  };

  satSet.setColorScheme = function (scheme) {
    currentColorScheme = scheme;
    var buffers = scheme.calculateColorBuffers();
    satColorBuf = buffers.colorBuf;
    pickableBuf = buffers.pickableBuf;
  };

  satSet.draw = function (pMatrix, camMatrix) {
    if (!shadersReady || !cruncherReady) return;

    var now = Date.now();
    var divisor = Math.max(propRate, 0.001);
    var dt = Math.min((now - lastDrawTime) / 1000.0, 1.0 / divisor);
    for (var i = 0; i < (satData.length * 3); i++) {
      satPos[i] += satVel[i] * dt * propRate;
    }
    // console.log('interp dt=' + dt + ' ' + now);

    gl.useProgram(dotShader);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    //  gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);

    gl.uniformMatrix4fv(dotShader.uMvMatrix, false, mat4.create());
    gl.uniformMatrix4fv(dotShader.uCamMatrix, false, camMatrix);
    gl.uniformMatrix4fv(dotShader.uPMatrix, false, pMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, satPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, satPos, gl.STREAM_DRAW);
    gl.vertexAttribPointer(dotShader.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, satColorBuf);
    gl.enableVertexAttribArray(dotShader.aColor);
    gl.vertexAttribPointer(dotShader.aColor, 4, gl.FLOAT, false, 0, 0);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.depthMask(false);

    gl.drawArrays(gl.POINTS, 0, satData.length);

    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // now pickbuffer stuff......

    gl.useProgram(gl.pickShaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
    //  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.uniformMatrix4fv(gl.pickShaderProgram.uMvMatrix, false, mat4.create());
    gl.uniformMatrix4fv(gl.pickShaderProgram.uCamMatrix, false, camMatrix);
    gl.uniformMatrix4fv(gl.pickShaderProgram.uPMatrix, false, pMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, satPosBuf);
    gl.enableVertexAttribArray(gl.pickShaderProgram.aPos);
    gl.vertexAttribPointer(gl.pickShaderProgram.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(gl.pickShaderProgram.aColor);
    gl.bindBuffer(gl.ARRAY_BUFFER, pickColorBuf);
    gl.vertexAttribPointer(gl.pickShaderProgram.aColor, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, pickableBuf);
    gl.enableVertexAttribArray(gl.pickShaderProgram.aPickable);
    gl.vertexAttribPointer(gl.pickShaderProgram.aPickable, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, satData.length); // draw pick

    lastDrawTime = now;
    // satSet.setColorScheme(ColorScheme.default);
    satSet.updateFOV(null);
  };

  satSet.updateFOV = function (curSCC) {
    var now = Date.now();
    if (now - lastFOVUpdateTime > 1 * 1000 / propRate && isBottomMenuOpen === true) { // If it has been 1 seconds since last update that the menu is open
      var curObjsHTML = document.getElementById('bottom-menu');
      var inViewObs = [];
      curObjsHTML.innerHTML = '';
      for (var i = 0; i < (satData.length); i++) {
        if ($('#search').val() === '') {
          if (satData[i].inview) {
            inViewObs.push(satData[i].SCC_NUM);
          }
        } else {
          var searchItems = $('#search').val().split(',');
          for (var s = 0; s < (searchItems.length); s++) {
            if (satData[i].inview && satData[i].SCC_NUM === searchItems[s]) {
              inViewObs.push(satData[i].SCC_NUM);
            }
          }
        }
      }
      var j;
      var curObjsHTMLText = '';
      for (i = 0, j = inViewObs.length; i < j; i++) {
        curObjsHTMLText += "<span class='FOV-object link'>" + inViewObs[i] + '</span>\n';
      }
      curObjsHTML.innerHTML = curObjsHTMLText;
      lastFOVUpdateTime = now;
    }
  };

  satSet.getSat = function (i) {
    if (!satData) return null;

    var ret = satData[i];
    if (!ret) return null;
    if (gotExtraData) {
      // ret.perigee = satData[i].perigee;
      ret.inview = satInView[i];
      ret.velocity = Math.sqrt(
        satVel[i * 3] * satVel[i * 3] +
        satVel[i * 3 + 1] * satVel[i * 3 + 1] +
        satVel[i * 3 + 2] * satVel[i * 3 + 2]
      );
      // ret.altitude = lookangles.altitude;
      // ret.longitude = lookangles.lon;
      // ret.latitude = lookangles.lat;
      // ret.azimuth = lookangles.azimuth;
      // ret.elevation = lookangles.elevation;
      // ret.range = lookangles.rangeSat;
      ret.position = {
        x: satPos[i * 3],
        y: satPos[i * 3 + 1],
        z: satPos[i * 3 + 2]
      };
    }

    return ret;
  };

  satSet.getIdFromIntlDes = function (intlDes) {
    for (var i = 0; i < satData.length; i++) {
      if (satData[i].intlDes === intlDes) {
        return i;
      }
    }
    return null;
  };

  function pad (str, max) {
    return str.length < max ? pad('0' + str, max) : str;
  }

  satSet.getIdFromObjNum = function (objNum) {
    for (var i = 0; i < satData.length; i++) {
      var scc = pad(satData[i].TLE1.substr(2, 5).trim(), 5);

      if (scc.indexOf(objNum) === 0) { // && satData[i].OBJECT_TYPE !== 'unknown') { // OPTIMIZATION: Determine if this code can be removed.
        return i;
      }
    }
    return null;
  };

  satSet.getScreenCoords = function (i, pMatrix, camMatrix) {
    var pos = satSet.getSat(i).position;
    var posVec4 = vec4.fromValues(pos.x, pos.y, pos.z, 1);
    // var transform = mat4.create();

    vec4.transformMat4(posVec4, posVec4, camMatrix);
    vec4.transformMat4(posVec4, posVec4, pMatrix);

    var glScreenPos = {
      x: (posVec4[0] / posVec4[3]),
      y: (posVec4[1] / posVec4[3]),
      z: (posVec4[2] / posVec4[3])
    };

    return {
      x: (glScreenPos.x + 1) * 0.5 * window.innerWidth,
      y: (-glScreenPos.y + 1) * 0.5 * window.innerHeight
    };
  };

  satSet.searchNameRegex = function (regex) {
    var res = [];
    for (var i = 0; i < satData.length; i++) {
      if (regex.test(satData[i].ON)) {
        res.push(i);
      }
    }
    return res;
  };

  satSet.searchCountryRegex = function (regex) {
    var res = [];
    for (var i = 0; i < satData.length; i++) {
      if (regex.test(satData[i].C)) {
        res.push(i);
      }
    }
    return res;
  };

  satSet.searchAzElRange = function (azimuth, elevation, range, inclination, azMarg, elMarg, rangeMarg, incMarg, period, periodMarg) {
    var isCheckAz = !isNaN(parseFloat(azimuth)) && isFinite(azimuth);
    var isCheckEl = !isNaN(parseFloat(elevation)) && isFinite(elevation);
    var isCheckRange = !isNaN(parseFloat(range)) && isFinite(range);
    var isCheckInclination = !isNaN(parseFloat(inclination)) && isFinite(inclination);
    var isCheckPeriod = !isNaN(parseFloat(period)) && isFinite(period);
    var isCheckAzMarg = !isNaN(parseFloat(azMarg)) && isFinite(azMarg);
    var isCheckElMarg = !isNaN(parseFloat(elMarg)) && isFinite(elMarg);
    var isCheckRangeMarg = !isNaN(parseFloat(rangeMarg)) && isFinite(rangeMarg);
    var isCheckIncMarg = !isNaN(parseFloat(incMarg)) && isFinite(incMarg);
    var isCheckPeriodMarg = !isNaN(parseFloat(periodMarg)) && isFinite(periodMarg);
    if (!isCheckEl && !isCheckRange && !isCheckAz && !isCheckInclination && !isCheckPeriod) return; // Ensure there is a number typed.

    if (!isCheckAzMarg) { azMarg = 5; }
    if (!isCheckElMarg) { elMarg = 5; }
    if (!isCheckRangeMarg) { rangeMarg = 200; }
    if (!isCheckIncMarg) { incMarg = 1; }
    if (!isCheckPeriodMarg) { periodMarg = 0.5; }
    var res = [];

    for (var i = 0; i < satData.length; i++) {
      res.push(satData[i]);
      lookangles.getTEARR(res[i]);
      res[i]['azimuth'] = lookangles.azimuth;
      res[i]['elevation'] = lookangles.elevation;
      res[i]['range'] = lookangles.range;
      res[i]['inview'] = lookangles.inview;
    }

    if (!isCheckInclination && !isCheckPeriod) {
      res = checkInview(res);
    }

    if (isCheckAz) {
      azimuth = azimuth * 1; // Convert azimuth to int
      azMarg = azMarg * 1;
      var minaz = azimuth - azMarg;
      var maxaz = azimuth + azMarg;
      res = checkAz(res, minaz, maxaz);
    }

    if (isCheckEl) {
      elevation = elevation * 1; // Convert elevation to int
      elMarg = elMarg * 1;
      var minel = elevation - elMarg;
      var maxel = elevation + elMarg;
      res = checkEl(res, minel, maxel);
    }

    if (isCheckRange) {
      range = range * 1; // Convert range to int
      rangeMarg = rangeMarg * 1;
      var minrange = range - rangeMarg;
      var maxrange = range + rangeMarg;
      res = checkRange(res, minrange, maxrange);
    }

    if (isCheckInclination) {
      inclination = inclination * 1; // Convert inclination to int
      incMarg = incMarg * 1;
      var minInc = inclination - incMarg;
      var maxInc = inclination + incMarg;
      res = checkInc(res, minInc, maxInc);
    }

    if (isCheckPeriod) {
      period = period * 1; // Convert period to int
      periodMarg = periodMarg * 1;
      var minPeriod = period - periodMarg;
      var maxPeriod = period + periodMarg;
      res = checkPeriod(res, minPeriod, maxPeriod);
    }

    function checkInview (possibles) {
      var inviewRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if (possibles[i].inview) {
          inviewRes.push(possibles[i]);
        }
      }
      return inviewRes;
    }

    function checkAz (possibles, minaz, maxaz) {
      var azRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if (possibles[i].azimuth < maxaz && possibles[i].azimuth > minaz) {
          azRes.push(possibles[i]);
        }
      }
      return azRes;
    }
    function checkEl (possibles, minel, maxel) {
      var elRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if (possibles[i].elevation < maxel && possibles[i].elevation > minel) {
          elRes.push(possibles[i]);
        }
      }
      return elRes;
    }
    function checkRange (possibles, minrange, maxrange) {
      var rangeRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if (possibles[i].range < maxrange && possibles[i].range > minrange) {
          rangeRes.push(possibles[i]);
        }
      }
      return rangeRes;
    }
    function checkInc (possibles, minInc, maxInc) {
      var IncRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if ((possibles[i].inclination * R2D).toFixed(2) < maxInc && (possibles[i].inclination * R2D).toFixed(2) > minInc) {
          IncRes.push(possibles[i]);
        }
      }
      return IncRes;
    }
    function checkPeriod (possibles, minPeriod, maxPeriod) {
      var PeriodRes = [];
      for (var i = 0; i < possibles.length; i++) {
        if (possibles[i].period < maxPeriod && possibles[i].period > minPeriod && PeriodRes.length <= 200) { // Don't display more than 200 results - this is because LEO and GEO belt have a lot of satellites
          PeriodRes.push(possibles[i]);
        }
      }
      if (PeriodRes.length >= 200) {
        $('#findByLooks-results').text('Limited to 200 Results!');
      }
      return PeriodRes;
    }
    // $('#findByLooks-results').text('');
    // TODO: Intentionally doesn't clear previous searches. Could be an option later.
    var SCCs = [];
    for (i = 0; i < res.length; i++) {
      // $('#findByLooks-results').append(res[i].SCC_NUM + '<br />');
      if (i < res.length - 1) {
        $('#search').val($('#search').val() + res[i].SCC_NUM + ',');
      } else {
        $('#search').val($('#search').val() + res[i].SCC_NUM);
      }
      SCCs.push(res[i].SCC_NUM);
    }
    searchBox.doSearch($('#search').val());
    // console.log(SCCs);
    return res;
  };

  satSet.setHover = function (i) {
    if (i === hoveringSat) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, satColorBuf);
    if (hoveringSat !== -1 && hoveringSat !== selectedSat) {
      gl.bufferSubData(gl.ARRAY_BUFFER, hoveringSat * 4 * 4, new Float32Array(currentColorScheme.colorizer(hoveringSat).color));
    }
    if (i !== -1) {
      gl.bufferSubData(gl.ARRAY_BUFFER, i * 4 * 4, new Float32Array(hoverColor));
    }
    hoveringSat = i;
  };

  satSet.selectSat = function (i) {
    if (i === selectedSat) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, satColorBuf);
    if (selectedSat !== -1) {
      gl.bufferSubData(gl.ARRAY_BUFFER, selectedSat * 4 * 4, new Float32Array(currentColorScheme.colorizer(selectedSat).color));
    }
    if (i !== -1) {
      gl.bufferSubData(gl.ARRAY_BUFFER, i * 4 * 4, new Float32Array(selectedColor));
    }
    selectedSat = i;
    if (!(lookangles.obslat === null || lookangles.obslat === undefined)) {
      $('#menu-lookangles img').removeClass('bmenu-item-disabled');
    }
    $('#menu-lookanglesmultisite img').removeClass('bmenu-item-disabled');
    $('#menu-editSat img').removeClass('bmenu-item-disabled');
    $('#menu-newLaunch img').removeClass('bmenu-item-disabled');
  };

  satSet.onCruncherReady = function (cb) {
    cruncherReadyCallback = cb;
    if (cruncherReady) cb;
  };

  window.satSet = satSet;
})();
