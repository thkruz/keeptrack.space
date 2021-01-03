import * as $ from 'jquery';
import * as glm from '@app/js/lib/gl-matrix.js';
import { RADIUS_OF_EARTH } from '@app/js/constants.js';
import { mobile } from '@app/js/mobile.js';
import { sMM } from '@app/js/sideMenuManager.js';
let M = window.M;

const bodyDOM = $('#bodyDOM');
const canvasDOM = $('#keeptrack-canvas');
const rightBtnMenuDOM = $('#right-btn-menu');
const rightBtnSaveDOM = $('#save-rmb');
const rightBtnViewDOM = $('#view-rmb');
const rightBtnEditDOM = $('#edit-rmb');
const rightBtnCreateDOM = $('#create-rmb');
const rightBtnDrawDOM = $('#draw-rmb');
const rightBtnColorsDOM = $('#colors-rmb');
const rightBtnEarthDOM = $('#earth-rmb');
const rightBtnSaveMenuDOM = $('#save-rmb-menu');
const rightBtnViewMenuDOM = $('#view-rmb-menu');
const rightBtnEditMenuDOM = $('#edit-rmb-menu');
const rightBtnCreateMenuDOM = $('#create-rmb-menu');
const rightBtnDrawMenuDOM = $('#draw-rmb-menu');
const rightBtnColorsMenuDOM = $('#colors-rmb-menu');
const rightBtnEarthMenuDOM = $('#earth-rmb-menu');
const satHoverBoxDOM = $('#sat-hoverbox');

var clickedSat = 0;
var maxPinchSize = Math.hypot(window.innerWidth, $(document).height());
var isDOPMenuOpen = false;
var mouseTimeout = null;
var dragPoint = [0, 0, 0];
var dragHasMoved = false;
var isPinching = false;
var deltaPinchDistance = 0;
var startPinchDistance = 0;
var touchStartTime;

var uiInput = {};
uiInput.isMouseMoving = false;
uiInput.mouseSat = -1;

var cameraManager, objectManager, satellite, satSet, lineManager, sensorManager, starManager, ColorScheme, satCruncher, earth, gl, uiManager, dlManager, dotsManager;
uiInput.init = (cameraManagerRef, objectManagerRef, satelliteRef, satSetRef, lineManagerRef, sensorManagerRef, starManagerRef, ColorSchemeRef, satCruncherRef, earthRef, glRef, uiManagerRef, dlManagerRef, dotsManagerRef) => {
  cameraManager = cameraManagerRef;
  dotsManager = dotsManagerRef;
  objectManager = objectManagerRef;
  satellite = satelliteRef;
  satSet = satSetRef;
  lineManager = lineManagerRef;
  sensorManager = sensorManagerRef;
  starManager = starManagerRef;
  ColorScheme = ColorSchemeRef;
  satCruncher = satCruncherRef;
  earth = earthRef;
  gl = glRef;
  uiManager = uiManagerRef;
  dlManager = dlManagerRef;

  // 2020 Key listener
  // TODO: Migrate most things from UI to Here
  $(window).on({
    keydown: function (e) {
      if (e.ctrlKey === true || e.metaKey === true) cameraManager.isCtrlPressed = true;
    },
  });
  $(window).on({
    keyup: function (e) {
      if (e.ctrlKey === false && e.metaKey === false) cameraManager.isCtrlPressed = false;
    },
  });

  if (settingsManager.disableWindowScroll || settingsManager.disableNormalEvents) {
    window.addEventListener(
      'scroll',
      function () {
        window.scrollTo(0, 0);
        return false;
      },
      { passive: false }
    );

    // left: 37, up: 38, right: 39, down: 40,
    // spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
    var keys = { 37: 1, 38: 1, 39: 1, 40: 1 };

    var preventDefault = (e) => {
      e.preventDefault();
    };

    var preventDefaultForScrollKeys = (e) => {
      if (keys[e.keyCode]) {
        preventDefault(e);
        return false;
      }
    };

    // modern Chrome requires { passive: false } when adding event
    var supportsPassive = false;
    try {
      window.addEventListener(
        'test',
        null,
        Object.defineProperty({}, 'passive', {
          // eslint-disable-next-line getter-return
          get: function () {
            supportsPassive = true;
          },
        })
      );
    } catch (e) {
      // Intentional
    }

    var wheelOpt = supportsPassive ? { passive: false } : false;
    var wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';

    // call this to Disable
    // eslint-disable-next-line no-unused-vars
    var disableScroll = () => {
      window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
      window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
      window.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
      window.addEventListener('keydown', preventDefaultForScrollKeys, false);
    };

    // call this to Enable
    // eslint-disable-next-line no-unused-vars
    var enableScroll = () => {
      window.removeEventListener('DOMMouseScroll', preventDefault, false);
      window.removeEventListener(wheelEvent, preventDefault, wheelOpt);
      window.removeEventListener('touchmove', preventDefault, wheelOpt);
      window.removeEventListener('keydown', preventDefaultForScrollKeys, false);
    };
  }

  if (settingsManager.disableZoomControls || settingsManager.disableNormalEvents) {
    var stopKeyZoom = (event) => {
      if (event.ctrlKey == true && (event.which == '61' || event.which == '107' || event.which == '173' || event.which == '109' || event.which == '187' || event.which == '189')) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', stopKeyZoom, { passive: false });
    window.addEventListener('mousewheel', stopWheelZoom, { passive: false });
    window.addEventListener('DOMMouseScroll', stopWheelZoom, { passive: false });

    var stopWheelZoom = (event) => {
      if (event.ctrlKey == true) {
        event.preventDefault();
      }
    };
  }

  // Needed?
  if (settingsManager.disableWindowTouchMove) {
    window.addEventListener(
      'touchmove',
      function (event) {
        event.preventDefault();
      },
      { passive: false }
    );
  }

  // Resizing Listener
  $(window).on('resize', function () {
    if (!settingsManager.disableUI) {
      uiManager.resize2DMap();
    }
    mobile.checkMobileMode();
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

  $(window).mousedown(function (evt) {
    // Camera Manager Events
    {
      if (!settingsManager.disableCameraControls) {
        // Middle Mouse Button MMB
        if (evt.button === 1) {
          cameraManager.isLocalRotate = true;
          cameraManager.localRotateStartPosition = cameraManager.localRotateCurrent;
          if (cameraManager.isShiftPressed) {
            cameraManager.isLocalRotateRoll = true;
            cameraManager.isLocalRotateYaw = false;
          } else {
            cameraManager.isLocalRotateRoll = false;
            cameraManager.isLocalRotateYaw = true;
          }
          evt.preventDefault();
        }

        // Right Mouse Button RMB
        if (evt.button === 2 && (cameraManager.isShiftPressed || cameraManager.isCtrlPressed)) {
          cameraManager.isPanning = true;
          cameraManager.panStartPosition = cameraManager.panCurrent;
          if (cameraManager.isShiftPressed) {
            cameraManager.isScreenPan = false;
            cameraManager.isWorldPan = true;
          } else {
            cameraManager.isScreenPan = true;
            cameraManager.isWorldPan = false;
          }
        }
      }
    }
  });

  $(window).mouseup(function (evt) {
    // Camera Manager Events
    {
      if (!settingsManager.disableCameraControls) {
        if (evt.button === 1) {
          cameraManager.isLocalRotate = false;
          cameraManager.localRotateRoll = false;
          cameraManager.localRotateYaw = false;
        }
        if (evt.button === 2) {
          cameraManager.isPanning = false;
          cameraManager.isScreenPan = false;
          cameraManager.isWorldPan = false;
        }
      }
    }
  });
  (function _canvasController() {
    var latLon;
    canvasDOM.on('touchmove', function (evt) {
      if (settingsManager.disableNormalEvents) {
        evt.preventDefault();
      }
      if (isPinching && typeof evt.originalEvent.touches[0] != 'undefined' && typeof evt.originalEvent.touches[1] != 'undefined') {
        var currentPinchDistance = Math.hypot(evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX, evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY);
        if (isNaN(currentPinchDistance)) return;

        deltaPinchDistance = (startPinchDistance - currentPinchDistance) / maxPinchSize;
        let zoomTarget = cameraManager.zoomTarget;
        zoomTarget += deltaPinchDistance * (settingsManager.cameraMovementSpeed / 10);
        zoomTarget = Math.min(Math.max(zoomTarget, 0.0001), 1); // Force between 0 and 1
        cameraManager.zoomTarget = zoomTarget;
      } else {
        // Dont Move While Zooming
        cameraManager.mouseX = evt.originalEvent.touches[0].clientX;
        cameraManager.mouseY = evt.originalEvent.touches[0].clientY;
        if (cameraManager.isDragging && cameraManager.screenDragPoint[0] !== cameraManager.mouseX && cameraManager.screenDragPoint[1] !== cameraManager.mouseY) {
          dragHasMoved = true;
          cameraManager.camAngleSnappedOnSat = false;
          cameraManager.camZoomSnappedOnSat = false;
        }
        uiInput.isMouseMoving = true;
        clearTimeout(mouseTimeout);
        mouseTimeout = setTimeout(function () {
          uiInput.isMouseMoving = false;
        }, 250);
      }
    });
    canvasDOM.on('mousemove', function (evt) {
      cameraManager.mouseX = evt.clientX - (canvasDOM.position().left - window.scrollX);
      cameraManager.mouseY = evt.clientY - (canvasDOM.position().top - window.scrollY);
      if (cameraManager.isDragging && cameraManager.screenDragPoint[0] !== cameraManager.mouseX && cameraManager.screenDragPoint[1] !== cameraManager.mouseY) {
        dragHasMoved = true;
        cameraManager.camAngleSnappedOnSat = false;
        cameraManager.camZoomSnappedOnSat = false;
      }
      uiInput.isMouseMoving = true;
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(function () {
        uiInput.isMouseMoving = false;
      }, 150);
    });

    if (settingsManager.disableUI) {
      canvasDOM.on('wheel', function () {
        satHoverBoxDOM.css({
          display: 'none',
        });
      });
    }
    if (!settingsManager.disableUI) {
      canvasDOM.on('wheel', function (evt) {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }

        var delta = evt.originalEvent.deltaY;
        if (evt.originalEvent.deltaMode === 1) {
          delta *= 33.3333333;
        }

        if (delta < 0) {
          cameraManager.isZoomIn = true;
        } else {
          cameraManager.isZoomIn = false;
        }

        cameraManager.rotateEarth(false);

        if (settingsManager.isZoomStopsSnappedOnSat || objectManager.selectedSat == -1) {
          let zoomTarget = cameraManager.zoomTarget;
          zoomTarget += delta / 100 / 50 / cameraManager.speedModifier; // delta is +/- 100
          zoomTarget = Math.min(Math.max(zoomTarget, 0.001), 1); // Force between 0 and 1
          cameraManager.zoomTarget = zoomTarget;
          cameraManager.ecLastZoom = zoomTarget;
          cameraManager.camZoomSnappedOnSat = false;
        } else {
          if (settingsManager.camDistBuffer < 300 || settingsManager.nearZoomLevel == -1) {
            settingsManager.camDistBuffer += delta / 7.5; // delta is +/- 100
            settingsManager.camDistBuffer = Math.min(Math.max(settingsManager.camDistBuffer, 30), 300);
            settingsManager.nearZoomLevel = cameraManager.zoomLevel;
          }
          if (settingsManager.camDistBuffer >= 300) {
            let zoomTarget = cameraManager.zoomTarget;
            zoomTarget += delta / 100 / 50 / cameraManager.speedModifier; // delta is +/- 100
            zoomTarget = Math.min(Math.max(zoomTarget, 0.001), 1); // Force between 0 and 1
            cameraManager.zoomTarget = zoomTarget;
            cameraManager.ecLastZoom = zoomTarget;
            cameraManager.camZoomSnappedOnSat = false;
            if (zoomTarget < settingsManager.nearZoomLevel) {
              cameraManager.camZoomSnappedOnSat = true;
              settingsManager.camDistBuffer = 200;
            }
          }
        }

        if (
          cameraManager.cameraType.current === cameraManager.cameraType.planetarium ||
          cameraManager.cameraType.current === cameraManager.cameraType.fps ||
          cameraManager.cameraType.current === cameraManager.cameraType.satellite ||
          cameraManager.cameraType.current === cameraManager.cameraType.astronomy
        ) {
          settingsManager.fieldOfView += delta * 0.0002;
          $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
          if (settingsManager.fieldOfView > settingsManager.fieldOfViewMax) settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
          if (settingsManager.fieldOfView < settingsManager.fieldOfViewMin) settingsManager.fieldOfView = settingsManager.fieldOfViewMin;
          dlManager.glInit();
        }
      });
      canvasDOM.on('click', function (evt) {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }
        rightBtnMenuDOM.hide();
        uiManager.clearRMBSubMenu();
        if ($('#colorbox').css('display') === 'block') {
          $.colorbox.close(); // Close colorbox if it was open
        }
      });
      canvasDOM.on('mousedown', function (evt) {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }

        if (cameraManager.speedModifier === 1) {
          settingsManager.cameraMovementSpeed = 0.003;
          settingsManager.cameraMovementSpeedMin = 0.005;
        }

        if (evt.button === 2) {
          dragPoint = getEarthScreenPoint(cameraManager.mouseX, cameraManager.mouseY);
          latLon = satellite.eci2ll(dragPoint[0], dragPoint[1], dragPoint[2]);
        }
        cameraManager.screenDragPoint = [cameraManager.mouseX, cameraManager.mouseY];
        cameraManager.dragStartPitch = cameraManager.camPitch;
        cameraManager.dragStartYaw = cameraManager.camYaw;
        if (evt.button === 0) {
          cameraManager.isDragging = true;
        }
        // debugLine.set(dragPoint, getCamPos())
        cameraManager.camSnapMode = false;
        if (!settingsManager.disableUI) {
          cameraManager.rotateEarth(false);
        }
        rightBtnMenuDOM.hide();
        uiManager.clearRMBSubMenu();

        // TODO: Make uiManager.updateURL() a setting that is disabled by default
        uiManager.updateURL();
      });
      canvasDOM.on('touchstart', function (evt) {
        settingsManager.cameraMovementSpeed = 0.0001;
        settingsManager.cameraMovementSpeedMin = 0.0001;
        if (evt.originalEvent.touches.length > 1) {
          // Two Finger Touch
          isPinching = true;
          startPinchDistance = Math.hypot(evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX, evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY);
          // _pinchStart(evt)
        } else {
          // Single Finger Touch
          mobile.startMouseX = evt.originalEvent.touches[0].clientX;
          mobile.startMouseY = evt.originalEvent.touches[0].clientY;
          cameraManager.mouseX = evt.originalEvent.touches[0].clientX;
          cameraManager.mouseY = evt.originalEvent.touches[0].clientY;
          uiInput.mouseSat = uiInput.getSatIdFromCoord(cameraManager.mouseX, cameraManager.mouseY);
          settingsManager.cameraMovementSpeed = Math.max(0.005 * cameraManager.zoomLevel, settingsManager.cameraMovementSpeedMin);
          cameraManager.screenDragPoint = [cameraManager.mouseX, cameraManager.mouseY];
          // dragPoint = getEarthScreenPoint(x, y)
          dragPoint = cameraManager.screenDragPoint; // Ignore the earth on mobile
          cameraManager.dragStartPitch = cameraManager.camPitch;
          cameraManager.dragStartYaw = cameraManager.camYaw;
          // debugLine.set(dragPoint, getCamPos())
          cameraManager.isDragging = true;
          touchStartTime = Date.now();
          // If you hit the canvas hide any popups
          _hidePopUps();
          cameraManager.camSnapMode = false;
          if (!settingsManager.disableUI) {
            cameraManager.rotateEarth(false);
          }

          // TODO: Make updateUrl() a setting that is disabled by default
          uiManager.updateURL();
        }
      });
      canvasDOM.on('mouseup', function (evt) {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }
        if (!dragHasMoved) {
          if (settingsManager.isMobileModeEnabled) {
            uiInput.mouseSat = uiInput.getSatIdFromCoord(cameraManager.mouseX, cameraManager.mouseY);
          }
          clickedSat = uiInput.mouseSat;
          if (evt.button === 0) {
            // Left Mouse Button Clicked
            if (cameraManager.cameraType.current === cameraManager.cameraType.satellite) {
              if (clickedSat !== -1 && !satSet.getSatExtraOnly(clickedSat).static) {
                objectManager.setSelectedSat(clickedSat);
              }
            } else {
              objectManager.setSelectedSat(clickedSat);
            }
          }
          if (evt.button === 2) {
            // Right Mouse Button Clicked
            if (!cameraManager.isCtrlPressed && !cameraManager.isShiftPressed) {
              _openRmbMenu();
            }
          }
        }
        // Repaint the theme to ensure it is the right color
        settingsManager.themes.retheme();
        // Force the serach bar to get repainted because it gets overwrote a lot
        settingsManager.themes.redThemeSearch();
        dragHasMoved = false;
        cameraManager.isDragging = false;
        if (!settingsManager.disableUI) {
          cameraManager.rotateEarth(false);
        }
      });
    }

    var _openRmbMenu = () => {
      let numMenuItems = 0;
      $('#clear-lines-rmb').hide();

      // View
      $('#view-info-rmb').hide();
      $('#view-sensor-info-rmb').hide();
      $('#view-sat-info-rmb').hide();
      $('#view-related-sats-rmb').hide();
      $('#view-curdops-rmb').hide();
      $('#view-24dops-rmb').hide();

      // Edit
      $('#edit-sat-rmb').hide();

      // Create
      $('#create-observer-rmb ').hide();
      $('#create-sensor-rmb').hide();

      // Draw
      $('#line-eci-axis-rmb').hide();
      $('#line-sensor-sat-rmb').hide();
      $('#line-earth-sat-rmb').hide();
      $('#line-sat-sat-rmb').hide();

      // Earth
      $('#earth-low-rmb').hide();
      $('#earth-high-rmb').hide();
      $('#earth-vec-rmb').hide();

      // Reset Camera
      // $('#reset-camera-rmb').hide();

      // Colors Always Present

      var isViewDOM = false;
      var isCreateDOM = false;
      var isDrawDOM = false;
      var isEarthDOM = false;

      rightBtnSaveDOM.show();
      rightBtnViewDOM.hide();
      rightBtnEditDOM.hide();
      rightBtnCreateDOM.hide();
      rightBtnDrawDOM.hide();
      rightBtnEarthDOM.hide();

      if (lineManager.getLineListLen() > 0) {
        $('#clear-lines-rmb').show();
      }

      if (uiInput.mouseSat !== -1) {
        if (typeof clickedSat == 'undefined') return;
        let sat = satSet.getSat(clickedSat);
        if (typeof sat == 'undefined' || sat == null) return;
        if (typeof satSet.getSat(clickedSat).type == 'undefined' || satSet.getSat(clickedSat).type !== 'Star') {
          rightBtnViewDOM.show();
          isViewDOM = true;
          numMenuItems++;
        }
        if (!satSet.getSat(clickedSat).static) {
          $('#edit-sat-rmb').show();
          rightBtnEditDOM.show();
          numMenuItems++;

          $('#view-sat-info-rmb').show();
          $('#view-related-sats-rmb').show();

          if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null && sensorManager.whichRadar !== 'CUSTOM') {
            $('#line-sensor-sat-rmb').show();
          }
          $('#line-earth-sat-rmb').show();
          $('#line-sat-sat-rmb').show();
          rightBtnDrawDOM.show();
          isDrawDOM = true;
          numMenuItems++;
        } else {
          if (satSet.getSat(clickedSat).type === 'Optical' || satSet.getSat(clickedSat).type === 'Mechanical' || satSet.getSat(clickedSat).type === 'Ground Sensor Station' || satSet.getSat(clickedSat).type === 'Phased Array Radar') {
            $('#view-sensor-info-rmb').show();
          }
        }
      } else {
        // Intentional
      }

      // Is this the Earth?
      //
      // This not the Earth

      if (typeof latLon == 'undefined' || isNaN(latLon.latitude) || isNaN(latLon.longitude)) {
        // Intentional
      } else {
        // This is the Earth
        if (!isViewDOM) {
          rightBtnViewDOM.show();
          ++numMenuItems;
        }
        $('#view-info-rmb').show();
        $('#view-curdops-rmb').show();
        $('#view-24dops-rmb').show();

        if (!isCreateDOM) {
          rightBtnCreateDOM.show();
          ++numMenuItems;
        }
        $('#create-observer-rmb ').show();
        $('#create-sensor-rmb').show();

        if (!isDrawDOM) {
          rightBtnDrawDOM.show();
          ++numMenuItems;
        }
        $('#line-eci-axis-rmb').show();

        if (!isEarthDOM) {
          rightBtnEarthDOM.show();
          ++numMenuItems;
        }

        $('#earth-nasa-rmb').show();
        $('#earth-blue-rmb').show();
        $('#earth-low-rmb').show();
        $('#earth-high-no-clouds-rmb').show();
        $('#earth-vec-rmb').show();
        if (settingsManager.nasaImages == true) $('#earth-nasa-rmb').hide();
        if (settingsManager.trusatImages == true) $('#earth-trusat-rmb').hide();
        if (settingsManager.blueImages == true) $('#earth-blue-rmb').hide();
        if (settingsManager.lowresImages == true) $('#earth-low-rmb').hide();
        if (settingsManager.hiresNoCloudsImages == true) $('#earth-high-no-clouds-rmb').hide();
        if (settingsManager.vectorImages == true) $('#earth-vec-rmb').hide();
      }

      rightBtnMenuDOM.show();
      satHoverBoxDOM.hide();
      // Might need to be adjusted if number of menus change
      var offsetX = cameraManager.mouseX < canvasDOM.innerWidth() / 2 ? 0 : -100;
      var offsetY = cameraManager.mouseY < canvasDOM.innerHeight() / 2 ? 0 : numMenuItems * -50;
      rightBtnMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': cameraManager.mouseX + offsetX,
        'top': cameraManager.mouseY + offsetY,
      });
    };

    canvasDOM.on('touchend', function () {
      let touchTime = Date.now() - touchStartTime;

      if (touchTime > 150 && !isPinching && Math.abs(mobile.startMouseX - cameraManager.mouseX) < 50 && Math.abs(mobile.startMouseY - cameraManager.mouseY) < 50) {
        _openRmbMenu();
        uiInput.mouseSat = -1;
      }

      if (isPinching) {
        // pinchEnd(e)
        isPinching = false;
      }
      cameraManager.mouseX = 0;
      cameraManager.mouseY = 0;
      dragHasMoved = false;
      cameraManager.isDragging = false;
      if (!settingsManager.disableUI) {
        cameraManager.rotateEarth(false);
      }
    });

    $('#nav-wrapper *').on('click', function () {
      _hidePopUps();
    });
    $('#nav-wrapper').on('click', function () {
      _hidePopUps();
    });
    $('#nav-footer *').on('click', function () {
      _hidePopUps();
    });
    $('#nav-footer').on('click', function () {
      _hidePopUps();
    });
    $('#ui-wrapper *').on('click', function () {
      _hidePopUps();
    });
    var _hidePopUps = () => {
      if (settingsManager.isPreventColorboxClose == true) return;
      rightBtnMenuDOM.hide();
      uiManager.clearRMBSubMenu();
      if ($('#colorbox').css('display') === 'block') {
        $.colorbox.close(); // Close colorbox if it was open
      }
    };

    if (settingsManager.startWithFocus) {
      canvasDOM.attr('tabIndex', 0);
      canvasDOM.trigger('focus');
    }

    if (!settingsManager.disableUI) {
      bodyDOM.on('keypress', (e) => {
        uiManager.keyHandler(e);
      }); // On Key Press Event Run _keyHandler Function
      bodyDOM.on('keydown', (e) => {
        if (uiManager.isCurrentlyTyping) return;
        cameraManager.keyDownHandler(e);
      }); // On Key Press Event Run _keyHandler Function
      bodyDOM.on('keyup', (e) => {
        if (uiManager.isCurrentlyTyping) return;
        cameraManager.keyUpHandler(e);
      }); // On Key Press Event Run _keyHandler Function

      rightBtnSaveMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnViewMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnEditMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnCreateMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnDrawMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnColorsMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      rightBtnEarthMenuDOM.on('click', function (e) {
        _rmbMenuActions(e);
      });
      $('#reset-camera-rmb').on('click', function (e) {
        _rmbMenuActions(e);
      });
      $('#clear-screen-rmb').on('click', function (e) {
        _rmbMenuActions(e);
      });
      $('#clear-lines-rmb').on('click', function (e) {
        _rmbMenuActions(e);
      });

      rightBtnSaveDOM.hover(() => {
        rightBtnSaveDOMDropdown();
      });
      rightBtnSaveDOM.click(() => {
        rightBtnSaveDOMDropdown();
      });
      rightBtnSaveMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnSaveMenuDOM.hide();
      });

      rightBtnViewDOM.hover(() => {
        rightBtnViewDOMDropdown();
      });
      rightBtnViewDOM.click(() => {
        rightBtnViewDOMDropdown();
      });
      rightBtnViewMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnViewMenuDOM.hide();
      });

      rightBtnEditDOM.hover(() => {
        rightBtnEditDOMDropdown();
      });
      rightBtnEditDOM.click(() => {
        rightBtnEditDOMDropdown();
      });
      rightBtnEditMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnEditMenuDOM.hide();
      });

      rightBtnCreateDOM.hover(() => {
        rightBtnCreateDOMDropdown();
      });
      rightBtnCreateDOM.click(() => {
        rightBtnCreateDOMDropdown();
      });
      rightBtnCreateMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnCreateMenuDOM.hide();
      });

      rightBtnDrawDOM.hover(() => {
        rightBtnDrawDOMDropdown();
      });
      rightBtnDrawDOM.click(() => {
        rightBtnDrawDOMDropdown();
      });
      rightBtnDrawMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnDrawMenuDOM.hide();
      });

      rightBtnColorsDOM.hover(() => {
        rightBtnColorsDOMDropdown();
      });
      rightBtnColorsDOM.click(() => {
        rightBtnColorsDOMDropdown();
      });
      rightBtnEarthMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnEarthMenuDOM.hide();
      });

      rightBtnEarthDOM.hover(() => {
        rightBtnEarthDOMDropdown();
      });
      rightBtnEarthDOM.click(() => {
        rightBtnEarthDOMDropdown();
      });
      rightBtnEarthMenuDOM.hover(null, function () {
        // Lost Focus
        rightBtnEarthMenuDOM.hide();
      });
    }
    var rightBtnSaveDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      var offsetX = rightBtnSaveDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnSaveMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnSaveDOM.offset().left + offsetX,
        'top': rightBtnSaveDOM.offset().top,
      });
      if (rightBtnSaveDOM.offset().top !== 0) {
        rightBtnSaveMenuDOM.show();
      } else {
        rightBtnSaveMenuDOM.hide();
      }
    };
    var rightBtnViewDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      var offsetX = rightBtnViewDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnViewMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnViewDOM.offset().left + offsetX,
        'top': rightBtnViewDOM.offset().top,
      });
      if (rightBtnViewDOM.offset().top !== 0) {
        rightBtnViewMenuDOM.show();
      } else {
        rightBtnViewMenuDOM.hide();
      }
    };
    var rightBtnEditDOMDropdown = () => {
      uiManager.clearRMBSubMenu();

      var offsetX = rightBtnEditDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnEditMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnEditDOM.offset().left + offsetX,
        'top': rightBtnEditDOM.offset().top,
      });
      if (rightBtnEditMenuDOM.offset().top !== 0) {
        rightBtnEditMenuDOM.show();
      } else {
        rightBtnEditMenuDOM.hide();
      }
    };
    var rightBtnCreateDOMDropdown = () => {
      uiManager.clearRMBSubMenu();

      var offsetX = rightBtnCreateDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnCreateMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnCreateDOM.offset().left + offsetX,
        'top': rightBtnCreateDOM.offset().top,
      });
      if (rightBtnCreateMenuDOM.offset().top !== 0) {
        rightBtnCreateMenuDOM.show();
      } else {
        rightBtnCreateMenuDOM.hide();
      }
    };
    var rightBtnDrawDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      var offsetX = rightBtnDrawDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnDrawMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnDrawDOM.offset().left + offsetX,
        'top': rightBtnDrawDOM.offset().top,
      });
      if (rightBtnDrawDOM.offset().top !== 0) {
        rightBtnDrawMenuDOM.show();
      } else {
        rightBtnDrawMenuDOM.hide();
      }
    };
    var rightBtnColorsDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      var offsetX = rightBtnColorsDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnColorsMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnColorsDOM.offset().left + offsetX,
        'top': rightBtnColorsDOM.offset().top,
      });
      if (rightBtnColorsDOM.offset().top !== 0) {
        rightBtnColorsMenuDOM.show();
      } else {
        rightBtnColorsMenuDOM.hide();
      }
    };
    var rightBtnEarthDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      var offsetX = rightBtnEarthDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
      rightBtnEarthMenuDOM.css({
        'display': 'block',
        'text-align': 'center',
        'position': 'absolute',
        'left': rightBtnEarthDOM.offset().left + offsetX,
        'top': rightBtnEarthDOM.offset().top,
      });
      if (rightBtnEarthDOM.offset().top !== 0) {
        rightBtnEarthMenuDOM.show();
      } else {
        rightBtnEarthMenuDOM.hide();
      }
    };
    var _rmbMenuActions = (e) => {
      // No Right Click Without UI
      if (settingsManager.disableUI) return;

      var targetId = e.target.id;
      if (e.target.tagName == 'A') {
        targetId = e.target.parentNode.id;
      }
      if (e.target.tagName == 'UL') {
        targetId = e.target.firstChild.id;
      }
      switch (targetId) {
        case 'save-hd-rmb':
          uiManager.saveHiResPhoto('hd');
          break;
        case 'save-4k-rmb':
          uiManager.saveHiResPhoto('4k');
          break;
        case 'save-8k-rmb':
          uiManager.saveHiResPhoto('8k');
          break;
        case 'view-info-rmb':
          M.toast({
            html: 'Lat: ' + latLon.latitude.toFixed(3) + '<br/>Lon: ' + latLon.longitude.toFixed(3),
          });
          break;
        case 'view-sat-info-rmb':
          objectManager.setSelectedSat(clickedSat);
          break;
        case 'view-sensor-info-rmb':
          objectManager.setSelectedSat(clickedSat);
          $('#menu-sensor-info').on('click', () => {});
          break;
        case 'view-related-sats-rmb':
          var intldes = satSet.getSatExtraOnly(clickedSat).intlDes;
          var searchStr = intldes.slice(0, 8);
          uiManager.doSearch(searchStr);
          break;
        case 'view-curdops-rmb':
          var gpsDOP = satellite.getDOPs(latLon.latitude, latLon.longitude, 0);
          M.toast({
            html: 'HDOP: ' + gpsDOP.HDOP + '<br/>VDOP: ' + gpsDOP.VDOP + '<br/>PDOP: ' + gpsDOP.PDOP + '<br/>GDOP: ' + gpsDOP.GDOP + '<br/>TDOP: ' + gpsDOP.TDOP,
          });
          break;
        case 'view-24dops-rmb':
          if (!isDOPMenuOpen) {
            $('#dops-lat').val(latLon.latitude.toFixed(3));
            $('#dops-lon').val(latLon.longitude.toFixed(3));
            $('#dops-alt').val(0);
            $('#dops-el').val(settingsManager.gpsElevationMask);
            uiManager.bottomIconPress({
              currentTarget: { id: 'menu-dops' },
            });
          } else {
            uiManager.hideSideMenus();
            isDOPMenuOpen = true;
            $('#loading-screen').fadeIn(1000, function () {
              $('#dops-lat').val(latLon.latitude.toFixed(3));
              $('#dops-lon').val(latLon.longitude.toFixed(3));
              $('#dops-alt').val(0);
              $('#dops-el').val(settingsManager.gpsElevationMask);
              var lat = $('#dops-lat').val() * 1;
              var lon = $('#dops-lon').val() * 1;
              var alt = $('#dops-alt').val() * 1;
              // var el = $('#dops-el').val() * 1;
              satellite.getDOPsTable(lat, lon, alt);
              $('#menu-dops').addClass('bmenu-item-selected');
              $('#loading-screen').fadeOut('slow');
              $('#dops-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            });
          }
          break;
        case 'edit-sat-rmb':
          objectManager.setSelectedSat(clickedSat);
          if (!sMM.isEditSatMenuOpen()) {
            uiManager.bottomIconPress({
              currentTarget: { id: 'menu-editSat' },
            });
          }
          break;
        case 'create-sensor-rmb':
          $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-customSensor').addClass('bmenu-item-selected');
          sMM.isCustomSensorMenuOpen(true);
          $('#cs-telescope').on('click', () => {});
          $('#cs-lat').val(latLon.latitude);
          $('#cs-lon').val(latLon.longitude);
          $('#cs-hei').val(0);
          $('#cs-type').val('Optical');
          // $('#cs-telescope').prop('checked', false)
          $('#cs-minaz').val(0);
          $('#cs-maxaz').val(360);
          $('#cs-minel').val(10);
          $('#cs-maxel').val(90);
          $('#cs-minrange').val(0);
          $('#cs-maxrange').val(1000000);
          $('#customSensor').on('submit', () => {});
          break;
        case 'reset-camera-rmb':
          // if (cameraManager.cameraType.current == cameraManager.cameraType.fixedToSat) {
          //   // NOTE: Maybe a reset flag to move back to original position over time?
          //   cameraManager.camPitch = 0;
          //   cameraManager.camYaw = 0;
          // }
          cameraManager.panReset = true;
          cameraManager.localRotateReset = true;
          cameraManager.ftsRotateReset = true;
          break;
        case 'clear-lines-rmb':
          lineManager.clear();
          if (objectManager.isStarManagerLoaded) {
            starManager.isAllConstellationVisible = false;
          }
          break;
        case 'line-eci-axis-rmb':
          lineManager.create('ref', [10000, 0, 0], 'r');
          lineManager.create('ref', [0, 10000, 0], 'g');
          lineManager.create('ref', [0, 0, 10000], 'b');
          break;
        case 'line-earth-sat-rmb':
          lineManager.create('sat', clickedSat, 'p');
          break;
        case 'line-sensor-sat-rmb':
          // Sensor always has to be #2
          lineManager.create('sat5', [clickedSat, satSet.getIdFromSensorName(sensorManager.currentSensor.name)], 'p');
          break;
        case 'line-sat-sat-rmb':
          lineManager.create('sat3', [clickedSat, objectManager.selectedSat], 'p');
          break;
        case 'create-observer-rmb':
          $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-customSensor').addClass('bmenu-item-selected');
          sMM.setCustomSensorMenuOpen(true);
          $('#cs-lat').val(latLon.latitude);
          $('#cs-lon').val(latLon.longitude);
          $('#cs-hei').val(0);
          $('#cs-type').val('Observer');
          $('#customSensor').on('submit', () => {});
          uiManager.legendMenuChange('sunlight');
          satSet.setColorScheme(ColorScheme.sunlight, true);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          settingsManager.isForceColorScheme = true;
          satCruncher.postMessage({
            isSunlightView: true,
          });
          break;
        case 'colors-default-rmb':
          if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor.lat != null) {
            uiManager.legendMenuChange('default');
          } else {
            uiManager.legendMenuChange('default');
          }
          satSet.setColorScheme(ColorScheme.default, true);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          break;
        case 'colors-sunlight-rmb':
          uiManager.legendMenuChange('sunlight');
          satSet.setColorScheme(ColorScheme.sunlight, true);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          settingsManager.isForceColorScheme = true;
          satCruncher.postMessage({
            isSunlightView: true,
          });
          break;
        case 'colors-country-rmb':
          uiManager.legendMenuChange('countries');
          satSet.setColorScheme(ColorScheme.countries);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          break;
        case 'colors-velocity-rmb':
          uiManager.legendMenuChange('velocity');
          satSet.setColorScheme(ColorScheme.velocity);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          break;
        case 'colors-ageOfElset-rmb':
          uiManager.legendMenuChange('ageOfElset');
          satSet.setColorScheme(ColorScheme.ageOfElset);
          uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
          break;
        case 'earth-blue-rmb':
          settingsManager.blueImages = true;
          settingsManager.nasaImages = false;
          settingsManager.trusatImages = false;
          settingsManager.lowresImages = false;
          settingsManager.hiresImages = false;
          settingsManager.hiresNoCloudsImages = false;
          settingsManager.vectorImages = false;
          localStorage.setItem('lastMap', 'blue');
          earth.init(gl);
          earth.loadHiRes();
          earth.loadHiResNight();
          break;
        case 'earth-nasa-rmb':
          settingsManager.blueImages = false;
          settingsManager.nasaImages = true;
          settingsManager.trusatImages = false;
          settingsManager.lowresImages = false;
          settingsManager.hiresImages = false;
          settingsManager.hiresNoCloudsImages = false;
          settingsManager.vectorImages = false;
          localStorage.setItem('lastMap', 'nasa');
          earth.init(gl);
          earth.loadHiRes();
          earth.loadHiResNight();
          break;
        case 'earth-trusat-rmb':
          settingsManager.blueImages = false;
          settingsManager.nasaImages = false;
          settingsManager.trusatImages = true;
          settingsManager.lowresImages = false;
          settingsManager.hiresImages = false;
          settingsManager.hiresNoCloudsImages = false;
          settingsManager.vectorImages = false;
          localStorage.setItem('lastMap', 'trusat');
          earth.init(gl);
          earth.loadHiRes();
          earth.loadHiResNight();
          break;
        case 'earth-low-rmb':
          settingsManager.blueImages = false;
          settingsManager.nasaImages = false;
          settingsManager.trusatImages = false;
          settingsManager.lowresImages = true;
          settingsManager.hiresImages = false;
          settingsManager.hiresNoCloudsImages = false;
          settingsManager.vectorImages = false;
          localStorage.setItem('lastMap', 'low');
          earth.init(gl);
          earth.loadHiRes();
          earth.loadHiResNight();
          break;
        case 'earth-high-rmb':
          $('#loading-screen').fadeIn(1000, function () {
            settingsManager.blueImages = false;
            settingsManager.nasaImages = false;
            settingsManager.trusatImages = false;
            settingsManager.lowresImages = false;
            settingsManager.hiresImages = true;
            settingsManager.hiresNoCloudsImages = false;
            settingsManager.vectorImages = false;
            localStorage.setItem('lastMap', 'high');
            earth.init(gl);
            earth.loadHiRes();
            earth.loadHiResNight();
            $('#loading-screen').fadeOut('slow');
          });
          break;
        case 'earth-high-no-clouds-rmb':
          $('#loading-screen').fadeIn(1000, function () {
            settingsManager.blueImages = false;
            settingsManager.nasaImages = false;
            settingsManager.trusatImages = false;
            settingsManager.lowresImages = false;
            settingsManager.hiresImages = false;
            settingsManager.hiresNoCloudsImages = true;
            settingsManager.vectorImages = false;
            localStorage.setItem('lastMap', 'high-nc');
            earth.init(gl);
            earth.loadHiRes();
            earth.loadHiResNight();
            $('#loading-screen').fadeOut('slow');
          });
          break;
        case 'earth-vec-rmb':
          settingsManager.blueImages = false;
          settingsManager.nasaImages = false;
          settingsManager.trusatImages = false;
          settingsManager.lowresImages = false;
          settingsManager.hiresImages = false;
          settingsManager.hiresNoCloudsImages = false;
          settingsManager.vectorImages = true;
          localStorage.setItem('lastMap', 'vec');
          earth.init(gl);
          earth.loadHiRes();
          earth.loadHiResNight();
          break;
        case 'clear-screen-rmb':
          (function clearScreenRMB() {
            // Clear Lines first
            lineManager.clear();
            if (objectManager.isStarManagerLoaded) {
              starManager.isAllConstellationVisible = false;
            }

            // Now clear everything else
            uiManager.doSearch('');
            uiManager.searchToggle(false);
            uiManager.hideSideMenus();
            $('#menu-space-stations').removeClass('bmenu-item-selected');

            if (
              (!objectManager.isSensorManagerLoaded || sensorManager.currentSensor.lat != null) &&
              cameraManager.cameraType.current !== cameraManager.cameraType.planetarium &&
              cameraManager.cameraType.current !== cameraManager.cameraType.astronomy
            ) {
              uiManager.legendMenuChange('default');
            }

            objectManager.setSelectedSat(-1);
          })();
          break;
      }
      rightBtnMenuDOM.hide();
      uiManager.clearRMBSubMenu();
    };
  })();
};

uiInput.getSatIdFromCoord = (x, y) => {
  // NOTE: gl.readPixels is a huge bottleneck
  gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManager.pickingFrameBuffer);
  gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManager.pickReadPixelBuffer);
  // const id = ((dotsManager.pickReadPixelBuffer[2] << 16) | (dotsManager.pickReadPixelBuffer[1] << 8) | dotsManager.pickReadPixelBuffer[0]) - 1;
  return ((dotsManager.pickReadPixelBuffer[2] << 16) | (dotsManager.pickReadPixelBuffer[1] << 8) | dotsManager.pickReadPixelBuffer[0]) - 1;
};

// Raycasting in getEarthScreenPoint would provide a lot of powerful (but slow) options later
var getEarthScreenPoint = (x, y) => {
  // getEarthScreenPoint
  var rayOrigin, ptThru, rayDir, toCenterVec, dParallel, longDir, dPerp, dSubSurf, dSurf, ptSurf;

  rayOrigin = cameraManager.getCamPos();
  ptThru = _unProject(x, y);

  rayDir = glm.vec3.create();
  glm.vec3.subtract(rayDir, ptThru, rayOrigin); // rayDir = ptThru - rayOrigin
  glm.vec3.normalize(rayDir, rayDir);

  toCenterVec = glm.vec3.create();
  glm.vec3.scale(toCenterVec, rayOrigin, -1); // toCenter is just -camera pos because center is at [0,0,0]
  dParallel = glm.vec3.dot(rayDir, toCenterVec);

  longDir = glm.vec3.create();
  glm.vec3.scale(longDir, rayDir, dParallel); // longDir = rayDir * distParallel
  glm.vec3.add(ptThru, rayOrigin, longDir); // ptThru is now on the plane going through the center of sphere
  dPerp = glm.vec3.len(ptThru);

  dSubSurf = Math.sqrt(RADIUS_OF_EARTH * RADIUS_OF_EARTH - dPerp * dPerp);
  dSurf = dParallel - dSubSurf;

  ptSurf = glm.vec3.create();
  glm.vec3.scale(ptSurf, rayDir, dSurf);
  glm.vec3.add(ptSurf, ptSurf, rayOrigin);

  return ptSurf;
};

// _unProject variables
var _unProject = (mx, my) => {
  var glScreenX, glScreenY, screenVec, comboPMat, invMat, worldVec;

  glScreenX = (mx / gl.drawingBufferWidth) * 2 - 1.0;
  glScreenY = 1.0 - (my / gl.drawingBufferHeight) * 2;
  screenVec = [glScreenX, glScreenY, -0.01, 1.0]; // gl screen coords

  comboPMat = glm.mat4.create();
  glm.mat4.mul(comboPMat, dlManager.pMatrix, cameraManager.camMatrix);
  invMat = glm.mat4.create();
  glm.mat4.invert(invMat, comboPMat);
  worldVec = glm.vec4.create();
  glm.vec4.transformMat4(worldVec, screenVec, invMat);

  return [worldVec[0] / worldVec[3], worldVec[1] / worldVec[3], worldVec[2] / worldVec[3]];
};

export { uiInput };
