/* global satSet,
          searchBox,
          shaderData,
          $,
          satellite,
          Image,
          ColorScheme,
          orbitDisplay,
          shaderLoader,
          sun,
          SunCalc,
          earth,
          Line,
          Spinner,
          groups,
          mat3,
          mat4,
          vec3,
          vec4,
          Worker,
          requestAnimationFrame */

// **** main.js ***
var maxOrbitsDisplayed = 100000; // Used in sat.js and orbit-display.js
var satCruncher;
var gl;

// Time Variables
var propRealTime = Date.now(); // actual time we're running it
var propOffset = 0.0; // offset we're propagating to, msec
var propRate = 1.0; // time rate multiplier for propagation
var oldT = new Date(); // Only used in drawLoop function

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

var ZOOM_EXP = 3;
var DIST_MIN = 6400;
var DIST_MAX = 200000;

var whichRadar = '';
var isLookanglesMenuOpen = false;
var isTwitterMenuOpen = false;
var isWeatherMenuOpen = false;
var isSpaceWeatherMenuOpen = false;
var isFindByLooksMenuOpen = false;
var isSensorInfoMenuOpen = false;
var isLaunchMenuOpen = false;
var isBottomMenuOpen = false;
var isAstronautsSelected = false;
var isMilSatSelected = false;
var isSatCollisionSelected = false; // TODO: Use this for the collision menu
var socratesNum = -1;
var isEditTime = false;

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

var initialRotation = true;
var initialRotSpeed = 0.000075;

// var debugContext, debugImageData;
var debugLine, debugLine2, debugLine3;
// var spinner;

$(document).ready(function () { // Code Once index.php is loaded
  var opts = {
    lines: 11, // The number of lines to draw
    length: 8, // The length of each line
    width: 5, // The line thickness
    radius: 8, // The radius of the inner circle
    corners: 1, // Corner roundness (0..1)
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    color: '#fff', // #rgb or #rrggbb or array of colors
    speed: 1, // Rounds per second
    trail: 50, // Afterglow percentage
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    className: 'spinner', // The CSS class to assign to the spinner
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    top: '50%', // Top position relative to parent
    left: '50%' // Left position relative to parent
  };
  var target = document.getElementById('spinner');
  new Spinner(opts).spin(target);

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

    debugLine = new Line();
    debugLine2 = new Line();
    debugLine3 = new Line();
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
  });

  $('#canvas').on('touchmove', function (evt) {
    evt.preventDefault();
    if (isDragging) {
      dragHasMoved = true;
      camAngleSnappedOnSat = false;
      camZoomSnappedOnSat = false;
    }
    mouseX = evt.originalEvent.touches[0].clientX;
    mouseY = evt.originalEvent.touches[0].clientY;
  });

  $('#canvas').mousemove(function (evt) {
    if (isDragging) {
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
    initialRotation = false;
    camZoomSnappedOnSat = false;
  });

  $('#canvas').click(function (evt) {
    $('#sat-vehicle').colorbox.close();
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
    camSnapMode = false;
    initialRotation = false;
    // }
  });

  $('#canvas').on('touchstart', function (evt) {
    var x = evt.originalEvent.touches[0].clientX;
    var y = evt.originalEvent.touches[0].clientY;
    dragPoint = getEarthScreenPoint(x, y);
    screenDragPoint = [x, y];
    dragStartPitch = camPitch;
    dragStartYaw = camYaw;
     //   debugLine.set(dragPoint, getCamPos());
    isDragging = true;
    camSnapMode = false;
    initialRotation = false;
  });

  $('#canvas').mouseup(function (evt) {
    // if(evt.which === 3) {//RMB
    if (!dragHasMoved) {
      var clickedSat = getSatIdFromCoord(evt.clientX, evt.clientY);
      if (clickedSat === -1 && evt.button === 2) {
        $('#search').val('');
        searchBox.hideResults();
        isAstronautsSelected = false;
        $('#menu-astronauts img').removeClass('bmenu-item-selected');
        isMilSatSelected = false;
        $('#menu-space-stations img').removeClass('bmenu-item-selected');
      }
      selectSat(clickedSat);
    }
    dragHasMoved = false;
    isDragging = false;
    initialRotation = false;
    // }
  });

  $('#canvas').on('touchend', function (evt) {
    dragHasMoved = false;
    isDragging = false;
    initialRotation = false;
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

  $('#zoom-in').click(function () {
    zoomTarget -= 0.04;
    if (zoomTarget < 0) zoomTarget = 0;
    initialRotation = false;
    camZoomSnappedOnSat = false;
  });

  $('#zoom-out').click(function () {
    zoomTarget += 0.04;
    if (zoomTarget > 1) zoomTarget = 1;
    initialRotation = false;
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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#sensor-info-title').html('Clear AFS');
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#sensor-info-title').html('Eglin AFB');
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#sensor-info-title').html('RAF Fylingdales');
    $('#sensor-country').html('United Kingdom');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#sensor-info-title').html('Cavalier AFS');
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#sensor-info-title').html('Thule Air Base');
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Phased Array');
    // No Weather
    $('#menu-weather img').addClass('bmenu-item-disabled');
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#sensor-info-title').html('ARPA Long-Range Tracking and Instrumentation Radar');
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Mechanical');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#sensor-info-title').html('Millstone Hill Steerable Antenna');
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');
    $('#sensor-type').html('Mechanical');
    $('#menu-weather img').removeClass('bmenu-item-disabled');
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#sensor-info-title').html('Diego Garcia GEODSS');
    $('#sensor-country').html('United States');
    $('#sensor-sun').html('No Impact');

    $('#menu-weather img').removeClass('bmenu-item-disabled');
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

    camSnap(latToPitch(33.817233), longToYaw(-106.659961));
    changeZoom('geo');
    lookangles.getsensorinfo();
  });
  $('#optical-spain').click(function () { // Select Spain's Optical Coverage
    satCruncher.postMessage({
      typ: 'offset',
      dat: (propOffset).toString() + ' ' + (propRate).toString(),
      setlatlong: true,
      lat: 37.166962, // TODO: Check this.
      long: -5.600839, // TODO: Check this.
      hei: 0.5, // TODO: Check this.
      obsminaz: 0,
      obsmaxaz: 360,
      obsminel: 20,
      obsmaxel: 90,
      obsminrange: 20000,
      obsmaxrange: 500000
    });

    lookangles.setobs({
      lat: 37.166962, // TODO: Check this.
      long: -5.600839, // TODO: Check this.
      hei: 0.5, // TODO: Check this.
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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');
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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');
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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');

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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');
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
    $('#menu-sensor-info img').removeClass('bmenu-item-disabled');
    camSnap(latToPitch(40.446944), longToYaw(115.116389));
    changeZoom('leo');
    lookangles.getsensorinfo();
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
  $('#launch-menu').load('launch-schedule.htm #chronlist');
  $('#findByLooks').submit(function (e) {
    var fblAzimuth = $('#fbl-azimuth').val();
    var fblElevation = $('#fbl-elevation').val();
    var fblRange = $('#fbl-range').val();
    var fblInc = $('#fbl-inc').val();
    var fblAzimuthM = $('#fbl-azimuth-margin').val();
    var fblElevationM = $('#fbl-elevation-margin').val();
    var fblRangeM = $('#fbl-range-margin').val();
    var fblIncM = $('#fbl-inc-margin').val();
    satSet.searchAzElRange(fblAzimuth, fblElevation, fblRange, fblInc, fblAzimuthM, fblElevationM, fblRangeM, fblIncM);
    e.preventDefault();
  });

  $('#canvas').on('keypress', keyHandler); // On Key Press Event Run keyHandler Function
  $('#bottom-icons').on('click', '.bmenu-item', bottomIconPress); // Bottom Button Pressed
  $('#canvas').attr('tabIndex', 0);
  $('#canvas').focus();

  drawLoop(); // kick off the animationFrame()s
});

function socrates (row) {
  // SOCRATES.htm is a 20 row .pl script pulled from celestrak.com/cgi-bin/searchSOCRATES.pl
  // If it ever becomes unavailable a similar, but less accurate (maybe?) cron job could be
  // created using satCruncer.

  // The variable row determines which set of objects on SOCRATES.htm we are using. First
  // row is 0 and last one is 19.

  $.get('/SOCRATES.htm', function (socratesHTM) { // Load SOCRATES.htm so we can use it instead of index.htm
    var socratesObjOne = []; // Array for tr containing CATNR1
    var socratesObjTwo = []; // Array for tr containing CATNR2
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

    // Use these to figure out SOCRATES values
    // console.log(socratesObjOne);
    // console.log(socratesObjTwo);

    if (row !== -1) {
      findFutureDate(socratesObjTwo); // Jump to the date/time of the collision
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

      $('#search').val(socratesObjOne[row][1] + ',' + socratesObjTwo[row][0]); // Fill in the serach box with the two objects
      searchBox.doSearch(socratesObjOne[row][1] + ',' + socratesObjTwo[row][0]); // Actually perform the search of the two objects
      setTimeout(socratesSelectSat, 1000); // Wait 1 second before selecting the sat because satcruncher updates on 1 second intervals
                                           // and will cause the camera to rotate twice
      function socratesSelectSat () {
        selectSat(satSet.getIdFromObjNum(socratesObjOne[row][1])); // Select the first object listed in SOCRATES
      }
    }

    if (row === -1) { // Only generate the table if receiving the -1 argument
      // SOCRATES Menu
      var tbl = document.getElementById('socrates-table'); // Identify the table to update
      tbl.innerHTML = '';                                  // Clear the table from old object data
      var tblLength = 0;                                   // Iniially no rows to the table

      function pad (str, max) {
        return str.length < max ? pad("0" + str, max) : str;
      }

      for (var i = 0; i < 20; i++) {                       // 20 rows
        var tr = tbl.insertRow();
        tr.setAttribute("class", "socrates-object");
        tr.setAttribute("hiddenrow", i);
        var tdT = tr.insertCell();
        var socratesDate = socratesObjTwo[i][4].split(' '); // Date/time is on the second line 5th column
        var socratesTime = socratesDate[3].split(':'); // Split time from date for easier management
        var socratesTimeS = socratesTime[2].split('.'); // Split time from date for easier management
        tdT.appendChild(document.createTextNode(socratesDate[2] + ' ' + socratesDate[1] + ' ' + socratesDate[0] + ' - ' + pad(socratesTime[0], 2) + ':' +
                        pad(socratesTime[1], 2) + ':' + pad(socratesTimeS[0], 2) + 'Z'));
        var tdS1 = tr.insertCell();
        tdS1.appendChild(document.createTextNode(socratesObjOne[i][1]));
        var tdS2 = tr.insertCell();
        tdS2.appendChild(document.createTextNode(socratesObjTwo[i][0]));
      }
    }
  });
}

$('#socrates-menu').on('click', '.socrates-object', function (evt) {
  var hiddenRow = $(this)['context']['attributes']['hiddenrow']['value']; // TODO: Find correct code for this.
  console.log(hiddenRow);
  if (hiddenRow !== null) {
    socrates(hiddenRow);
  }
});

function keyHandler (evt) {
  var ratechange = false;
  console.log(evt);
  switch (Number(evt.charCode)) {
    case 114: // r
      initialRotation = !initialRotation;
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
        $('#launch-menu').fadeOut();
        isLaunchMenuOpen = false;
        break;
      } else {
        hideSideMenus();
        $('#launch-menu').fadeIn();
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
          lookangles.getlookangles(sat, isLookanglesMenuOpen);
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

  function hideSideMenus () {
    $('#lookangles-menu').fadeOut();
    $('#findByLooks-menu').fadeOut();
    $('#launch-menu').fadeOut();
    $('#twitter-menu').fadeOut();
    $('#weather-menu').fadeOut();
    $('#space-weather-menu').fadeOut();
    isLaunchMenuOpen = false;
    isTwitterMenuOpen = false;
    isFindByLooksMenuOpen = false;
    isWeatherMenuOpen = false;
    isSpaceWeatherMenuOpen = false;
    isLookanglesMenuOpen = false;
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
function bottomIconPress (evt) {
  function hideSideMenus () {
    $('#sensor-info-menu').fadeOut();
    $('#lookangles-menu').fadeOut();
    $('#findByLooks-menu').fadeOut();
    $('#launch-menu').fadeOut();
    $('#twitter-menu').fadeOut();
    $('#weather-menu').fadeOut();
    $('#space-weather-menu').fadeOut();
    $('#menu-sensor-info img').removeClass('bmenu-item-selected');
    $('#menu-lookangles img').removeClass('bmenu-item-selected');
    $('#menu-launches img').removeClass('bmenu-item-selected');
    $('#menu-find-sat img').removeClass('bmenu-item-selected');
    $('#menu-twitter img').removeClass('bmenu-item-selected');
    $('#menu-weather img').removeClass('bmenu-item-selected');
    $('#menu-space-weather img').removeClass('bmenu-item-selected');
    isSensorInfoMenuOpen = false;
    isLaunchMenuOpen = false;
    isTwitterMenuOpen = false;
    isFindByLooksMenuOpen = false;
    isWeatherMenuOpen = false;
    isSpaceWeatherMenuOpen = false;
    isLookanglesMenuOpen = false;
  }
  function deselectColor () {
    $('#menu-sensor-info img').removeClass('bmenu-item-selected');
    $('#menu-lookangles img').removeClass('bmenu-item-selected');
    $('#menu-launches img').removeClass('bmenu-item-selected');
    $('#menu-find-sat img').removeClass('bmenu-item-selected');
    $('#menu-twitter img').removeClass('bmenu-item-selected');
    $('#menu-weather img').removeClass('bmenu-item-selected');
    $('#menu-space-weather img').removeClass('bmenu-item-selected');
  }
  switch ($(this)['context']['id']) {
    case 'menu-in-coverage': // B
      if (isBottomMenuOpen) {
        $('#bottom-menu').fadeOut();
        $('#menu-in-coverage img').removeClass('bmenu-item-selected');
        isBottomMenuOpen = false;
        break;
      } else {
        $('#bottom-menu').fadeIn();
        isBottomMenuOpen = true;
        $('#menu-in-coverage img').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-sensor-info': // No Keyboard Commands
      if (lookangles.obslat == null) { // No Sensor Selected
        break;
      }
      if (isSensorInfoMenuOpen) {
        $('#sensor-info-menu').fadeOut();
        isSensorInfoMenuOpen = false;
        deselectColor();
        break;
      } else {
        hideSideMenus();
        lookangles.getsensorinfo();
        $('#sensor-info-menu').fadeIn();
        isSensorInfoMenuOpen = true;
        $('#menu-sensor-info img').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-launches': // L
      if (isLaunchMenuOpen) {
        $('#launch-menu').fadeOut();
        isLaunchMenuOpen = false;
        deselectColor();
        break;
      } else {
        hideSideMenus();
        $('#launch-menu').fadeIn();
        isLaunchMenuOpen = true;
        $('#menu-launches img').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-find-sat': // F
      if (isFindByLooksMenuOpen) {
        $('#findByLooks-menu').fadeOut();
        isFindByLooksMenuOpen = false;
        deselectColor();
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
        $('#twitter-menu').fadeOut();
        isTwitterMenuOpen = false;
        deselectColor();
        break;
      } else {
        hideSideMenus();
        $('#twitter-menu').fadeIn();
        isTwitterMenuOpen = true;
        $('#menu-twitter img').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-weather': // W
      if (isWeatherMenuOpen) {
        $('#weather-menu').fadeOut();
        isWeatherMenuOpen = false;
        deselectColor();
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
      }
      break;
    case 'menu-space-weather': // Q
      if (isSpaceWeatherMenuOpen) {
        $('#space-weather-menu').fadeOut();
        isSpaceWeatherMenuOpen = false;
        deselectColor();
        break;
      }
      $('#space-weather-image').attr('src', 'http://services.swpc.noaa.gov/images/animations/ovation-north/latest.png');
      hideSideMenus();
      $('#space-weather-menu').fadeIn();
      isSpaceWeatherMenuOpen = true;
      $('#menu-space-weather img').addClass('bmenu-item-selected');
      break;
    case 'menu-lookangles': // S
      if (isLookanglesMenuOpen) {
        $('#lookangles-menu').fadeOut();
        isLookanglesMenuOpen = false;
        deselectColor();
        break;
      } else {
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
    case 'menu-astronauts': // No Keyboard Shortcut
      if (isAstronautsSelected) {
        $('#search').val('');
        searchBox.hideResults();
        isAstronautsSelected = false;
        $('#menu-astronauts img').removeClass('bmenu-item-selected');
        break;
      } else {
        $('#search').val('25544,41765');
        searchBox.doSearch('25544,41765');
        isAstronautsSelected = true;
        $('#menu-space-stations img').removeClass('bmenu-item-selected');
        $('#menu-astronauts img').addClass('bmenu-item-selected');
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
        $('#menu-astronauts img').removeClass('bmenu-item-selected');
        $('#menu-space-stations img').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-satellite-collision': // No Keyboard Shortcut
      if (isSatCollisionSelected) { // TODO: Add actual menu for satellite collisions.
        isSatCollisionSelected = false;
        $('#socrates-menu').fadeOut();
        $('#menu-satellite-collision img').removeClass('bmenu-item-selected');
        break;
      } else {
        $('#socrates-menu').fadeIn();
        isSatCollisionSelected = true;
        socrates(-1);
        $('#menu-satellite-collision img').addClass('bmenu-item-selected');
        break;
      }
  }
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

  if (paramSlices.length > 0) {
    url += '?' + paramSlices.join('&');
  }

  window.history.replaceState(null, 'Stuff in Space', url);
}

function selectSat (satId) {
  selectedSat = satId;
  if (satId === -1) {
    $('#sat-infobox').fadeOut();
    orbitDisplay.clearSelectOrbit();
  } else {
    camZoomSnappedOnSat = true;
    camAngleSnappedOnSat = true;

    satSet.selectSat(satId);
    camSnapToSat(satId);
    var sat = satSet.getSat(satId);
    if (!sat) return;
    orbitDisplay.setSelectOrbit(satId);
    $('#sat-infobox').fadeIn();
    $('#sat-info-title').html(sat.OBJECT_NAME);

    if (sat.OBJECT_URL) {
      $('#sat-info-title').html("<a class='iframe' href='" + sat.OBJECT_URL + "'>" + sat.OBJECT_NAME + '</a>');
    }

    $('#sat-intl-des').html(sat.intlDes);
    if (sat.OBJECT_TYPE === 'unknown') {
      $('#sat-objnum').html(1 + sat.TLE_LINE2.substr(2, 7).toString());
    } else {
      //      $('#sat-objnum').html(sat.TLE_LINE2.substr(2,7));
      $('#sat-objnum').html(sat.SCC_NUM);
    }
    $('#sat-type').html(sat.OBJECT_TYPE);
    $('#sat-country').html(sat.COUNTRY);
    $('#sat-site').html(sat.LAUNCH_SITE);
    $('#sat-sitec').html(sat.LAUNCH_SITEC);
    $('#sat-vehicle').html(sat.LAUNCH_VEHICLE);
    if (sat.RCS_SIZE == null) {
      $('#sat-rcs').html('Unknown');
    } else {
      $('#sat-rcs').html(sat.RCS_SIZE);
    }
    switch (sat.LAUNCH_VEHICLE) {
      // UNITED STATES
      case 'Scout B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutb.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Scout X-1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutx-1.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Scout X-4':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutx-4.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Scout A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scouta.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Scout G-1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scoutg-1.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Scout S-1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/scout.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Delta 0300':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/d/delta0300.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Falcon 9':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/f/falcon9.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Falcon 9 v1.1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/f/falcon9v11.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      // RUSSIA
      case 'Soyuz-ST-A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-st-a.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Soyuz-ST-B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-st-b.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Soyuz 11A511L':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz11a511l.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Soyuz-U':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-u.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Soyuz-U-PVB':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-u-pvb.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Soyuz-FG':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-fg.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Soyuz-2-1A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-2-1a.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Soyuz-2-1B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/s/soyuz-2-1b.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Kosmos 11K65M':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/k/kosmos11k65m.html'>Kosmos 3M</a>");
        break;
      case 'Kosmos 65S3':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/k/kosmos65s3.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Tsiklon-2':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/t/tsiklon-2.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Tsiklon-3':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/t/tsiklon-3.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Vostok 8A92M':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/v/vostok8a92m.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Vostok 8K72K':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/v/vostok8k72k.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      // CHINA
      case 'Chang Zheng 1':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng1.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Chang Zheng 3':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng3.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Chang Zheng 3A':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng3a.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Chang Zheng 4':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng4.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Chang Zheng 4B':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng4b.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Chang Zheng 2C-III/SD':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng2c-iiisd.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Chang Zheng 2C':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng2c.html'>" + sat.LAUNCH_VEHICLE + '</a>');
        break;
      case 'Long March 6':
        $('#sat-vehicle').html("<a class='iframe' href='http://www.astronautix.com/c/changzheng6.html'> Chang Zheng 6</a>");
        break;
    }

    $('a.iframe').colorbox({iframe: true, width: '80%', height: '80%', fastIframe: false, closeButton: false});
    $('#sat-apogee').html(sat.apogee.toFixed(0) + ' km');
    $('#sat-perigee').html(sat.perigee.toFixed(0) + ' km');
    $('#sat-inclination').html((sat.inclination * R2D).toFixed(2) + '°');
    $('#sat-eccentricity').html((sat.eccentricity).toFixed(3));
    $('#sat-period').html(sat.period.toFixed(2) + ' min');
    $('#sat-period').prop('title', 'Mean Motion: ' + 60 * 24 / sat.period.toFixed(2));

    var now = new Date();
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    var daysold;
    if (satSet.getSat(satId).TLE_LINE1.substr(18, 2) === now) {
      daysold = jday() - satSet.getSat(satId).TLE_LINE1.substr(20, 3);
    } else {
      daysold = jday() - satSet.getSat(satId).TLE_LINE1.substr(20, 3) + (satSet.getSat(satId).TLE_LINE1.substr(17, 2) * 365);
    }

    $('#sat-elset-age').html(daysold + ' Days');
    $('#sat-elset-age').prop('title', 'Epoch Year: ' + sat.TLE_LINE1.substr(18, 2).toString() + ' Epoch Day: ' + sat.TLE_LINE1.substr(20, 8).toString());
    if (jday() !== sat.TLE_LINE1.substr(20, 3).toString()) {
    }

    now = new Date();
    var sunTime = SunCalc.getTimes(Date.now(), lookangles.obslat, lookangles.obslong);
    if (sunTime.dawn.getTime() - now > 0 || sunTime.dusk.getTime() - now < 0) {
      $('#sat-sun').html('No Sun');
    } else if (lookangles.obslat == null) {
      $('#sat-sun').html('Unknown');
    } else {
      $('#sat-sun').html('Sun Exclusion');
    }

    lookangles.getlookangles(sat, isLookanglesMenuOpen);
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
    camSnap(pitch, yaw);
  }

  if (camZoomSnappedOnSat) {
    lookangles.getTEARR(sat);
    var camDistTarget = lookangles.altitude + 6371 + 2000;
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
  today.setUTCHours(selectedDate.getUTCHours() + 12); // Used to be 9.5.
                                                      // 12 Seems to be the offset from the earth draw script, but this is guesswork.
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
  var newT = new Date();
  var dt = Math.min(newT - oldT, 1000);
  oldT = newT;
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

  if (initialRotation) {
    camYaw -= initialRotSpeed * dt;
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
    var sat = satSet.getSat(selectedSat);
    debugLine.set(sat, [0, 0, 0]);
    camSnapToSat(selectedSat);
  }

  drawScene();
  updateHover();
  updateSelectBox();
  requestAnimationFrame(drawLoop);
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

  if (debugLine) debugLine.draw();
  if (debugLine2)debugLine2.draw();
  if (debugLine3)debugLine3.draw();
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
      $('#sat-azimuth').prop('title', 'Azimuth: ' + lookangles.azimuth.toFixed(0) + '°');
      $('#sat-elevation').html('Out of Bounds');
      $('#sat-elevation').prop('title', 'Elevation: ' + lookangles.elevation.toFixed(1) + '°');
      $('#sat-range').html('Out of Bounds');
      $('#sat-range').prop('title', 'Range: ' + lookangles.range.toFixed(2) + ' km');
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
      $('#sat-hoverbox').html(satSet.getSat(satId).OBJECT_NAME + '<br /><center>' + satSet.getSat(satId).SCC_NUM + '</center>');
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
  this.lat = 0;
  this.lon = 0;
  this.altitude = 0;
  this.azimuth = 0;
  this.elevation = 0;
  this.range = 0;
  this.inview = false;
  var observerGd = {};

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
      longitude: longitude * deg2rad,
      latitude: latitude * deg2rad,
      height: height * 1                  // Converts from string to number TODO: Find correct way to convert string to integer
    };
  };

  var getTEARR = function (sat) {
    // Set default timing settings. These will be changed to find look angles at different times in future.
    var propOffset2 = getPropOffset();               // offset letting us propagate in the future (or past)
    var propRealTime = Date.now();      // Set current time
    var satrec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);// perform and store sat init calcs
    var now = propTime(propOffset2, propRealTime);
    var j = jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
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

  function getPropOffset () {
    var selectedDate = $('#datetime-text').text().substr(0, 19);
    selectedDate = selectedDate.split(' ');
    selectedDate = new Date(selectedDate[0] + 'T' + selectedDate[1] + 'Z');
    var today = new Date();
    var propOffset = selectedDate - today;// - (selectedDate.getTimezoneOffset() * 60 * 1000);
    return propOffset;
  }

  var getlookangles = function (sat, isLookanglesMenuOpen) {
    if (!isLookanglesMenuOpen) {
      return;
    }
    if (latitude != null && longitude != null && height != null) {
      // Set default timing settings. These will be changed to find look angles at different times in future.
      var propOffset2 = 0;               // offset letting us propagate in the future (or past)
      // var propRealTime = Date.now();      // Set current time

      var curPropOffset = getPropOffset();

      var satrec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);// perform and store sat init calcs
      var tbl = document.getElementById('looks');           // Identify the table to update
      tbl.innerHTML = '';                                   // Clear the table from old object data
      var tblLength = 0;                                   // Iniially no rows to the table

      for (var i = 0; i < (7 * 24 * 60 * 60); i += 5) {         // 5second Looks
        propOffset2 = i * 1000 + curPropOffset;                 // Offset in seconds (msec * 1000)
        if (tblLength >= 1500) {                           // Maximum of 1500 lines in the look angles table
          break;                                            // No more updates to the table (Prevent GEO object slowdown)
        }
        tblLength += propagate(propOffset2, tbl, satrec);   // Update the table with looks for this 5 second chunk and then increase table counter by 1
      }
    }
  };

  function propagate (propOffset2, tbl, satrec) {
    var propRealTime = Date.now();
    var now = propTime(propOffset2, propRealTime);
    var j = jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
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
      tdE.appendChild(document.createTextNode('El: ' + elevation.toFixed(1)));
      var tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode('Az: ' + azimuth.toFixed(0)));
      var tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode('Rng: ' + rangeSat.toFixed(0)));
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
    setobs: setobs,
    getlookangles: getlookangles,
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
 * Includes enhancements by Scott Trenda <scott.trenda.net>
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

// **** shader-loader.js ***
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
// **** color-scheme.js ***
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
      var ap = satSet.getSat(satId).apogee;
      var pe = satSet.getSat(satId).perigee;
      var color;
      if (sat.inview) {
        color = [0.85, 0.5, 0.0, 1.0];
      } else if (sat.OBJECT_TYPE === 'PAYLOAD') {
        color = [0.2, 1.0, 0.0, 0.5];
      } else if (sat.OBJECT_TYPE === 'ROCKET BODY') {
        color = [0.2, 0.5, 1.0, 0.85];
        //  return [0.6, 0.6, 0.6];
      } else if (sat.OBJECT_TYPE === 'DEBRIS') {
        color = [0.5, 0.5, 0.5, 0.85];
      } else {
        color = [0.5, 0.5, 0.5, 0.85];
      }

      if ((pe > lookangles.obsmaxrange || ap < lookangles.obsminrange)) {
        return {
          color: [1.0, 1.0, 1.0, 0.2],
          pickable: false
        };
      }

      return {
        color: color,
        pickable: true
      };
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
      if (satSet.getSat(satId).RCS_SIZE === 'SMALL' && satSet.getSat(satId).OBJECT_TYPE === 'PAYLOAD') {
        return {
          color: [0.2, 1.0, 0.0, 0.65],
          pickable: true
        };
      } else {
        return {
          color: [1.0, 1.0, 1.0, 0.1],
          pickable: false
        };
      }
    });
    ColorScheme.rcs = new ColorScheme(function (satId) {
      var rcs = satSet.getSat(satId).RCS_SIZE;
      if (rcs === 'SMALL') {
        return {
          color: [1.0, 0, 0, 0.6],
          pickable: true
        };
      }
      if (rcs === 'MEDIUM') {
        return {
          color: [1.0, 1.0, 0, 0.6],
          pickable: true
        };
      }
      if (rcs === 'LARGE') {
        return {
          color: [0, 1.0, 0, 0.6],
          pickable: true
        };
      } else {
        return {
          color: [0.5, 0.5, 0.5, 0.6],
          pickable: true
        };
      }
    });
    ColorScheme.lostobjects = new ColorScheme(function (satId) {
      var pe = satSet.getSat(satId).perigee;
      var now = new Date();
      now = now.getFullYear();
      now = now.toString().substr(2, 2);
      var daysold;
      if (satSet.getSat(satId).TLE_LINE1.substr(18, 2) === now) {
        daysold = jday() - satSet.getSat(satId).TLE_LINE1.substr(20, 3);
      } else {
        daysold = jday() - satSet.getSat(satId).TLE_LINE1.substr(20, 3) + (satSet.getSat(satId).TLE_LINE1.substr(17, 2) * 365);
      }
      if (pe > lookangles.obsmaxrange || daysold < 100) {
        return {
          color: [1.0, 1.0, 1.0, 0.1],
          pickable: false
        };
      } else {
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
          color: [1.0, 1.0, 1.0, 0.1],
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
          color: [1.0, 1.0, 1.0, 0.1],
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
          color: [1.0, 1.0, 1.0, 0.1],
          pickable: false
        };
      }
    });

    $('#color-schemes-submenu').mouseover(function () {
    });
  };

  window.ColorScheme = ColorScheme;
})();
// **** groups.js ***
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
    satSet.setColorScheme(ColorScheme.default);
  };

  groups.init = function () {
    // var start = performance.now();

    var clicked = false;
    $('#groups-display').mouseout(function () {
      if (!clicked) {
        if (searchBox.isResultBoxOpen()) {
          groups.selectGroup(searchBox.getLastResultGroup());
        } else {
          groups.clearSelect();
        }
      }
    });

    $('#groups-display>li').mouseover(function () {
      clicked = false;
      var groupName = $(this).data('group');
      if (groupName === '<clear>') {
        groups.clearSelect();
      } else {
       // console.log('calling selectGroup with group ' + groupName);
       // groups.selectGroup(groups[groupName]); TODO: Play with this!
      }
    });

    $('#groups-display>li').click(function () {
      clicked = true;
      var groupName = $(this).data('group');
      if (groupName === '<clear>') {
        groups.clearSelect();
        $('#menu-groups .menu-title').text('Groups');
        $('#menu-countries .menu-title').text('Countries');
        $(this).css('display', 'none');
      } else {
        selectSat(-1); // clear selected sat
        groups.selectGroup(groups[groupName]);

        searchBox.fillResultBox(groups[groupName].sats, '');

        $('#menu-groups .clear-option').css({
          display: 'block'
        });
        $('#menu-countries .clear-option').css({
          display: 'block'
        });
        $('#menu-groups .menu-title').text('Groups (' + $(this).text() + ')');
        $('#menu-countries .menu-title').text('Countries (' + $(this).text() + ')');
      }

      $('#groups-display').css({
        display: 'none'
      });
    });

    $('#color-schemes-submenu>li').click(function () {
      clicked = true;
      selectSat(-1); // clear selected sat
      var colorName = $(this).data('color');
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
          satSet.setColorScheme(ColorScheme.lostobjects);
          break;
        case 'rcs':
          satSet.setColorScheme(ColorScheme.rcs);
          break;
        case 'smallsats':
          satSet.setColorScheme(ColorScheme.smallsats);
          break;
      }
    });

    groups.GPSGroup = new SatGroup('intlDes', [
      '90103A',
      '93068A'
    ]);

    // COUNTRIES
    groups.UnitedStates = new SatGroup('countryRegex', /United States/);
    groups.Russia = new SatGroup('countryRegex', /Russia/);
    groups.Canada = new SatGroup('countryRegex', /Canada/);
    groups.Japan = new SatGroup('countryRegex', /Japan/);
    groups.China = new SatGroup('countryRegex', /China/);
    groups.France = new SatGroup('countryRegex', /France/);
    groups.Israel = new SatGroup('countryRegex', /Israel/);
    groups.UnitedKingdom = new SatGroup('countryRegex', /United Kingdom/);
    groups.India = new SatGroup('countryRegex', /India/);

    // GROUPS
    groups.Iridium33DebrisGroup = new SatGroup('nameRegex', /(COSMOS 2251|IRIDIUM 33) DB/);
    groups.GlonassGroup = new SatGroup('nameRegex', /GLONASS/);
    groups.GalileoGroup = new SatGroup('nameRegex', /GALILEO/);
    groups.FunGroup = new SatGroup('nameRegex', /SYLDA/);
    groups.WestfordNeedlesGroup = new SatGroup('nameRegex', /WESTFORD NEEDLES/);
    groups.SpaceXGroup = new SatGroup('nameRegex', /FALCON [19]/);

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
// **** search-box.js ***
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
        if ((satData[i].OBJECT_NAME.indexOf(str) !== -1) || (satData[i].OBJECT_NAME.indexOf(bigstr) !== -1)) {
          results.push({
            isIntlDes: false,
            isInView: satData[i].inview,
            isObjnum: false,
            strIndex: satData[i].OBJECT_NAME.indexOf(str),
            SCC_NUM: satData[i].SCC_NUM,
            patlen: len,
            satId: i
          });
        }

        if (satData[i].OBJECT_TYPE.indexOf(bigstr) !== -1) {
          SEARCH_LIMIT = 5000;
          results.push({
            isIntlDes: false,
            isInView: satData[i].inview,
            isObjnum: false,
            strIndex: satData[i].OBJECT_TYPE.indexOf(bigstr),
            SCC_NUM: satData[i].SCC_NUM,
            patlen: len,
            satId: i
          });
        }

        if ((satData[i].LAUNCH_VEHICLE.indexOf(str) !== -1) || (satData[i].LAUNCH_VEHICLE.indexOf(bigstr) !== -1)) {
          results.push({
            isIntlDes: false,
            isInView: satData[i].inview,
            isObjnum: false,
            strIndex: satData[i].LAUNCH_VEHICLE.indexOf(str),
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

    // make a group to hilight results
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
    // results:
    // [
    //   { sat: { id: <id>, } }
    // ]

    var resultBox = $('#search-results');
    var html = '';
    for (var i = 0; i < results.length; i++) {
      var sat = satData[results[i].satId];
      html += '<div class="search-result" data-sat-id="' + sat.id + '">';
      if (results[i].isIntlDes || results[i].isObjnum) {
        html += sat.OBJECT_NAME;
      } else {
        html += sat.OBJECT_NAME.substring(0, results[i].strIndex);
        html += '<span class="search-hilight">';
        html += sat.OBJECT_NAME.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
        html += '</span>';
        html += sat.OBJECT_NAME.substring(results[i].strIndex + results[i].patlen);
      }
      html += '<div class="search-result-intldes">';
      if (results[i].isIntlDes) {
        html += sat.intlDes.substring(0, results[i].strIndex);
        html += '<span class="search-hilight">';
        html += sat.intlDes.substring(results[i].strIndex, results[i].strIndex + results[i].patlen);
        html += '</span>';
        html += sat.intlDes.substring(results[i].strIndex + results[i].patlen);
      } else {
        html += sat.intlDes;
      }
      html += '</div></div>';
    }
    // var resultStart = performance.now();
    //  resultBox.append(html);
    resultBox[0].innerHTML = html;
    resultBox.slideDown();
    resultsOpen = true;
  };

  searchBox.init = function (_satData) {
    satData = _satData;
    $('#search-results').on('click', '.search-result', function (evt) {
      var satId = $(this).data('sat-id');
      selectSat(satId);
     // hideResults();
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
  //    hoverBoxOnSat(-1);
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
      // console.log(pos.x);
      // console.log(pos.y);
      // console.log(pos.z);
      $('#search').val('');
      for (var i = 0; i < satSet.numSats; i++) {
        var posXmin = satSet.getSat(i).position.x - 100;
        var posXmax = satSet.getSat(i).position.x + 100;
        var posYmin = satSet.getSat(i).position.y - 100;
        var posYmax = satSet.getSat(i).position.y + 100;
        var posZmin = satSet.getSat(i).position.z - 100;
        var posZmax = satSet.getSat(i).position.z + 100;
        // if (pos.x < posXmax && pos.x > posXmin)
        //   console.log(i + ": X");
        // if (pos.y < posYmax && pos.y > posYmin)
        //   console.log(i + ": Y");
        // if (pos.z < posZmax && pos.z > posZmin)
        //   console.log(i + ": Z");
        if (pos.x < posXmax && pos.x > posXmin && pos.y < posYmax && pos.y > posYmin && pos.z < posZmax && pos.z > posZmin) {
          SCCs.push(satSet.getSat(i).SCC_NUM);
          // console.log("X: " + satSet.getSat(i).position.x + " - Y: " + satSet.getSat(i).position.y + " - Z: " + satSet.getSat(i).position.z);
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
// **** orbit-display.js ***
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

  var orbitWorker = new Worker('/js/orbit-calculation-worker.js');

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

  orbitDisplay.updateOrbitBuffer = function (satId) {
    if (!inProgress[satId]) {
      orbitWorker.postMessage({
        isInit: false,
        satId: satId,
        realTime: propRealTime,
        offset: propOffset,
        rate: propRate
      });
      inProgress[satId] = true;
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
        if (groups.selectedGroup.sats.length <= maxOrbitsDisplayed) {
          gl.bindBuffer(gl.ARRAY_BUFFER, glBuffers[id]);
          gl.vertexAttribPointer(pathShader.aPos, 3, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.LINE_STRIP, 0, NUM_SEGS + 1);
        }
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
// **** line.js ***
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
  now.setTime(Number(propRealTime) + propOffset + scaledMsec);
  // console.log('propTime: ' + now + ' elapsed=' + realElapsedMsec/1000);
  return now;
}
// **** earth.js ***
(function () {
  var earth = {};

  // var R2D = 180 / Math.PI;
  // var D2R = Math.PI / 180;

  var NUM_LAT_SEGS = 64;
  var NUM_LON_SEGS = 64;
  // var pos = [3.0, 0.0, 1.0];
  var radius = 6371.0;

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
    img.src = 'images/mercator-tex.jpg';
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

        vertPos.push(x * radius);
        vertPos.push(y * radius);
        vertPos.push(z * radius);
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
                 now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
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
// **** sun.js ***
(function () {
  var D2R = Math.PI / 180.0;

  function currentDirection () {
    var now = propTime();
    var j = jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
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
// **** sat.js ***
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
    satCruncher = new Worker('/js/sat-cruncher.js');
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
      }

      // console.log('sat.js copied extra data in ' + (performance.now() - start) + ' ms');
      gotExtraData = true;
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
      $('#load-cover').fadeOut();
      satSet.setColorScheme(currentColorScheme); // force color recalc
      cruncherReady = true;
      if (cruncherReadyCallback) {
        cruncherReadyCallback(satData);
      }
    }
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
    $.get('/' + tleSource + '?fakeparameter=to_avoid_browser_cache2', function (resp) {
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
          case 'maxsats':
            maxOrbitsDisplayed = val;
            break;
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

       // kick off satCruncher
       // console.log('posting satdata msg');

      satCruncher.postMessage({
        typ: 'satdata',
        dat: satSet.satDataString
      });

      // var postEnd = performance.now();
      // do some processing on our satData response

      for (i = 0; i < satData.length; i++) {
        var year = satData[i].INTLDES.substring(0, 2); // clean up intl des for display
        // console.log('year is',year);
        if (year === '') {
          satData[i].intlDes = 'none';
        } else {
          var prefix = (year > 50) ? '19' : '20';
          year = prefix + year;
          var rest = satData[i].INTLDES.substring(2);
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
      var j; // NOTE: temparray was defined here but seems unneeded and i was already declared.
      var curObjsHTMLText = '';
      for (i = 0, j = inViewObs.length; i < j; i++) {
      /* TODO: Add color to selected SCC_NUM
      if (curSCC !== null) {
          if (inViewObs[i] === curSCC){
            console.log("Cant overide class.");
            curObjsHTMLText += "<span style='color: blue;' class='FOV-object'>" + inViewObs[i] + '</span>\n';
          }
          else{
            curObjsHTMLText += "<span class='FOV-object'>" + inViewObs[i] + '</span>\n';
          }
        }
        else{
          curObjsHTMLText += "<span class='FOV-object'>" + inViewObs[i] + '</span>\n';
        }
      } */
        curObjsHTMLText += "<span class='FOV-object'>" + inViewObs[i] + '</span>\n';
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
      ret.perigee = satExtraData[i].perigee;
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
      if (satData[i].INTLDES === intlDes || satData[i].intlDes === intlDes) {
        return i;
      }
    }
    return null;
  };

  // TODO: if OBS UCT #s > 100K are to be handled, need to add code for that
  satSet.getIdFromObjNum = function (objNum) {
    for (var i = 0; i < satData.length; i++) {
      if (satData[i].SCC_NUM.toString().indexOf(objNum) === 0 && satData[i].OBJECT_TYPE !== 'unknown') {
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
      if (regex.test(satData[i].OBJECT_NAME)) {
        res.push(i);
      }
    }
    return res;
  };

  satSet.searchCountryRegex = function (regex) {
    var res = [];
    for (var i = 0; i < satData.length; i++) {
      if (regex.test(satData[i].COUNTRY)) {
        res.push(i);
      }
    }
    return res;
  };

  satSet.searchAzElRange = function (azimuth, elevation, range, inclination, azMarg, elMarg, rangeMarg, incMarg) {
    var isCheckAz = !isNaN(parseFloat(azimuth)) && isFinite(azimuth);
    var isCheckEl = !isNaN(parseFloat(elevation)) && isFinite(elevation);
    var isCheckRange = !isNaN(parseFloat(range)) && isFinite(range);
    var isCheckInclination = !isNaN(parseFloat(inclination)) && isFinite(inclination);
    var isCheckAzMarg = !isNaN(parseFloat(azMarg)) && isFinite(azMarg);
    var isCheckElMarg = !isNaN(parseFloat(elMarg)) && isFinite(elMarg);
    var isCheckRangeMarg = !isNaN(parseFloat(rangeMarg)) && isFinite(rangeMarg);
    var isCheckIncMarg = !isNaN(parseFloat(incMarg)) && isFinite(incMarg);
    if (!isCheckEl && !isCheckRange && !isCheckAz && !isCheckInclination) return; // Ensure there is a number typed.

    if (!isCheckAzMarg) { azMarg = 5; }
    if (!isCheckElMarg) { elMarg = 5; }
    if (!isCheckRangeMarg) { rangeMarg = 200; }
    if (!isCheckIncMarg) { incMarg = 1; }
    var res = [];

    for (var i = 0; i < satData.length; i++) {
      res.push(satData[i]);
      lookangles.getTEARR(res[i]);
      res[i]['azimuth'] = lookangles.azimuth;
      res[i]['elevation'] = lookangles.elevation;
      res[i]['range'] = lookangles.range;
      res[i]['inview'] = lookangles.inview;
    }

    if (!isCheckInclination) {
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
      inclination = inclination * 1; // Convert range to int
      incMarg = incMarg * 1;
      var minInc = inclination - incMarg;
      var maxInc = inclination + incMarg;
      res = checkInc(res, minInc, maxInc);
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
    $('#findByLooks-results').text('');
    var SCCs = [];
    for (i = 0; i < res.length; i++) {
      $('#findByLooks-results').append(res[i].SCC_NUM + '<br />');
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
  };

  satSet.onCruncherReady = function (cb) {
    cruncherReadyCallback = cb;
    if (cruncherReady) cb;
  };

  window.satSet = satSet;
})();
