import * as glm from '../lib/external/gl-matrix.js';
import $ from 'jquery';
import { RADIUS_OF_EARTH } from '../lib/constants.js';

let M = window.M;
const keepTrackApi = (<any>window).keepTrackApi;

let clickedSat = 0;
let maxPinchSize = Math.hypot(window.innerWidth, window.innerHeight);
let isDOPMenuOpen = false;
let mouseTimeout = -1;
let dragPoint = [0, 0, 0];
let dragHasMoved = false;
let isPinching = false;
let deltaPinchDistance = 0;
let startPinchDistance = 0;
let touchStartTime: number;

interface uiInputInterface {
  isMouseMoving: boolean;
  isStartedOnCanvas: boolean;
  isAsyncWorking: boolean;
  unProject: any;
  clientWaitAsync: any;
  getBufferSubDataAsync: any;
  readPixelsAsync: any;
  init: any;
  canvasWheel: any;
  canvasClick: any;
  canvasMouseDown: any;
  canvasTouchStart: any;
  canvasMouseUp: any;
  mouseMoveTimeout: any;
  getEarthScreenPoint: any;
  mouseSat: any;
  getSatIdFromCoord: any;
  getSatIdFromCoordAlt: any;
  openRmbMenu: any;
  rmbMenuActions: any;
}

export const uiInput: uiInputInterface = {
  isMouseMoving: false,
  isStartedOnCanvas: false,
  mouseSat: -1,
  mouseMoveTimeout: -1,
  canvasMouseDown: null,
  canvasClick: null,
  canvasTouchStart: null,
  canvasMouseUp: null,
  openRmbMenu: null,
  rmbMenuActions: null,
  canvasWheel: (evt: any): void => {
    const { cameraManager, objectManager, drawManager } = keepTrackApi.programs;

    if (!settingsManager.disableUI && settingsManager.disableNormalEvents) {
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

    if (settingsManager.isZoomStopsRotation) {
      cameraManager.autoRotate(false);
    }

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
      drawManager.glInit();
    }
  },
  init: (): void => {
    const { uiManager, satCruncher, ColorScheme, starManager, sensorManager, lineManager, satSet, satellite, cameraManager, objectManager, drawManager } = keepTrackApi.programs;
    const gl = drawManager.gl;

    $('#rmb-wrapper').append(keepTrackApi.html`    
      <div id="right-btn-menu" class="right-btn-menu">
        <ul id="right-btn-menu-ul" class='dropdown-contents'>          
          <li class="rmb-menu-item" id="view-rmb"><a href="#">View &#x27A4;</a></li>
          <li class="rmb-menu-item" id="edit-rmb"><a href="#">Edit &#x27A4;</a></li>
          <li class="rmb-menu-item" id="draw-rmb"><a href="#">Draw &#x27A4;</a></li>
          <li class="rmb-menu-item" id="create-rmb"><a href="#">Create &#x27A4;</a></li>
          <li class="rmb-menu-item" id="earth-rmb"><a href="#">Earth &#x27A4;</a></li>          
        </ul>
      </div> 
    `);

    // Append any other menus before putting the reset/clear options
    keepTrackApi.methods.rightBtnMenuAdd();

    // Now add the reset/clear options
    $('#right-btn-menu-ul').append(keepTrackApi.html`
      <li id="reset-camera-rmb"><a href="#">Reset Camera</a></li>
      <li id="clear-lines-rmb"><a href="#">Clear Lines</a></li>
      <li id="clear-screen-rmb"><a href="#">Clear Screen</a></li>
    `);

    $('#rmb-wrapper').append(keepTrackApi.html`    
      <div id="view-rmb-menu" class="right-btn-menu">
        <ul class='dropdown-contents'>
          <li id="view-info-rmb"><a href="#">Earth Info</a></li>
          <li id="view-sensor-info-rmb"><a href="#">Sensor Info</a></li>
          <li id="view-sat-info-rmb"><a href="#">Satellite Info</a></li>
          <li id="view-related-sats-rmb"><a href="#">Related Satellites</a></li>
          <li id="view-curdops-rmb"><a href="#">Current GPS DOPs</a></li>
          <li id="view-24dops-rmb"><a href="#">24 Hour GPS DOPs</a></li>
        </ul>
      </div>
      <div id="edit-rmb-menu" class="right-btn-menu">
        <ul class='dropdown-contents'>
          <li id="edit-sat-rmb"><a href="#">Edit Satellite</a></li>
        </ul>
      </div>
      <div id="draw-rmb-menu" class="right-btn-menu">
        <ul class='dropdown-contents'>
          <li id="line-eci-axis-rmb"><a href="#">Earth Centered Inertial Axes</a></li>
          <li id="line-earth-sat-rmb"><a href="#">Earth to Satellite</a></li>
          <li id="line-sensor-sat-rmb"><a href="#">Sensor to Satellite</a></li>
          <li id="line-sat-sat-rmb"><a href="#">Satellite to Satellite</a></li>
          <li id="line-sat-sun-rmb"><a href="#">Satellite to Sun</a></li>
        </ul>
      </div>
      <div id="create-rmb-menu" class="right-btn-menu">
        <ul class='dropdown-contents'>
          <li id="create-observer-rmb"><a href="#">Create Observer Here</a></li>
          <li id="create-sensor-rmb"><a href="#">Create Sensor Here</a></li>
        </ul>
      </div>      
      <div id="earth-rmb-menu" class="right-btn-menu">
        <ul class='dropdown-contents'>
          <li id="earth-blue-rmb"><a href="#">Blue Map</a></li>
          <li id="earth-nasa-rmb"><a href="#">NASA Map</a></li>
          <li id="earth-trusat-rmb"><a href="#">TruSat Map</a></li>
          <li id="earth-low-rmb"><a href="#">Low Resolution Map</a></li>
          <li id="earth-high-no-clouds-rmb"><a href="#">High Resoultion Map</a></li>
          <li id="earth-vec-rmb"><a href="#">Vector Image Map</a></li>
          <li id="earth-political-rmb"><a href="#">Political Map</a></li>
        </ul>
      </div>
    `);

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

    // 2020 Key listener
    // TODO: Migrate most things from UI to Here
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey === true || e.metaKey === true) cameraManager.isCtrlPressed = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.ctrlKey === false || e.metaKey === false) cameraManager.isCtrlPressed = false;
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
      // var keys = { 37: 1, 38: 1, 39: 1, 40: 1 };

      // var preventDefault = (e) => {
      //   e.preventDefault();
      // };

      // var preventDefaultForScrollKeys = (e) => {
      //   if (keys[e.keyCode]) {
      //     preventDefault(e);
      //     return false;
      //   }
      // };

      // modern Chrome requires { passive: false } when adding event
      // var supportsPassive = false;
      // try {
      //   window.addEventListener(
      //     'test',
      //     null,
      //     Object.defineProperty({}, 'passive', {
      //       // eslint-disable-next-line getter-return
      //       get: function () {
      //         supportsPassive = true;
      //       },
      //     })
      //   );
      // } catch (e) {
      //   // Intentional
      // }

      // var wheelOpt = supportsPassive ? { passive: false } : false;
      // var wheelEvent;
      // try {
      //   wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel' : 'mousewheel';
      // } catch (error) {
      //   wheelEvent = 'mousewheel';
      // }

      // call this to Disable
      // eslint-disable-next-line no-unused-vars
      // var disableScroll = () => {
      //   window.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
      //   window.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
      //   window.addEventListener('touchmove', preventDefault, wheelOpt); // mobile
      //   window.addEventListener('keydown', preventDefaultForScrollKeys, false);
      // };

      // call this to Enable
      // eslint-disable-next-line no-unused-vars
      // var enableScroll = () => {
      //   window.removeEventListener('DOMMouseScroll', preventDefault, false);
      //   window.removeEventListener(wheelEvent, preventDefault, wheelOpt);
      //   window.removeEventListener('touchmove', preventDefault, wheelOpt);
      //   window.removeEventListener('keydown', preventDefaultForScrollKeys, false);
      // };
    }

    if (settingsManager.disableZoomControls || settingsManager.disableNormalEvents) {
      const stopKeyZoom = (event: KeyboardEvent) => {
        if (event.ctrlKey == true && (event.code == 'Equal' || event.code == 'NumpadAdd' || event.code == 'NumpadSubtract' || event.code == 'NumpadSubtract' || event.code == 'Minus')) {
          event.preventDefault();
        }
      };

      const stopWheelZoom = (event: Event) => {
        if (cameraManager.isCtrlPressed == true) {
          event.preventDefault();
        }
      };

      window.addEventListener('keydown', stopKeyZoom, { passive: false });
      window.addEventListener('mousewheel', stopWheelZoom, { passive: false });
      window.addEventListener('DOMMouseScroll', stopWheelZoom, { passive: false });
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

    if (settingsManager.disableNormalEvents || settingsManager.disableDefaultContextMenu) {
      window.oncontextmenu = function (event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      };
    }

    if (!settingsManager.disableCameraControls) {
      window.addEventListener('mousedown', (evt) => {
        // Camera Manager Events
        // Middle Mouse Button MMB
        if (evt.button === 1) {
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
          cameraManager.panStartPosition = cameraManager.panCurrent;
          if (cameraManager.isShiftPressed) {
            cameraManager.isScreenPan = false;
            cameraManager.isWorldPan = true;
          } else {
            cameraManager.isScreenPan = true;
            cameraManager.isWorldPan = false;
          }
        }
      });
    }

    if (!settingsManager.disableCameraControls) {
      window.addEventListener('mouseup', function (evt) {
        // Camera Manager Events
        if (evt.button === 1) {
          cameraManager.isLocalRotateRoll = false;
          cameraManager.isLocalRotateYaw = false;
        }
        if (evt.button === 2) {
          cameraManager.isScreenPan = false;
          cameraManager.isWorldPan = false;
        }
      });
    }

    (function _canvasController() {
      let latLon: any;
      canvasDOM.on('touchmove', function (evt) {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }
        if (typeof evt.originalEvent == 'undefined') return;

        if (isPinching && typeof evt.originalEvent.touches[0] != 'undefined' && typeof evt.originalEvent.touches[1] != 'undefined') {
          var currentPinchDistance = Math.hypot(evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX, evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY);
          if (isNaN(currentPinchDistance)) return;

          deltaPinchDistance = (startPinchDistance - currentPinchDistance) / maxPinchSize;
          let zoomTarget = cameraManager.zoomTarget;
          zoomTarget += deltaPinchDistance * (settingsManager.cameraMovementSpeed * 20);
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
          clearTimeout(<number>mouseTimeout);
          mouseTimeout = window.setTimeout(function () {
            uiInput.isMouseMoving = false;
          }, 250);
        }
      });

      uiInput.mouseMoveTimeout = -1;
      canvasDOM.on('mousemove', function (evt) {
        if (uiInput.mouseMoveTimeout == -1) {
          uiInput.mouseMoveTimeout = window.setTimeout(() => {
            cameraManager.mouseX = evt.clientX - (canvasDOM.position().left - window.scrollX);
            cameraManager.mouseY = evt.clientY - (canvasDOM.position().top - window.scrollY);
            if (cameraManager.isDragging && cameraManager.screenDragPoint[0] !== cameraManager.mouseX && cameraManager.screenDragPoint[1] !== cameraManager.mouseY) {
              dragHasMoved = true;
              cameraManager.camAngleSnappedOnSat = false;
              cameraManager.camZoomSnappedOnSat = false;
            }
            uiInput.isMouseMoving = true;

            // This is so you have to keep moving the mouse or the ui says it has stopped (why?)
            clearTimeout(<number>mouseTimeout);
            mouseTimeout = window.setTimeout(function () {
              uiInput.isMouseMoving = false;
            }, 150);

            // This is to prevent mousemove being called between drawframes (who cares if it has moved at that point)
            window.clearTimeout(uiInput.mouseMoveTimeout);
            uiInput.mouseMoveTimeout = -1;
          }, 16);
        }
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
          uiInput.canvasWheel(evt);
        });

        uiInput.canvasClick = (evt: any) => {
          if (settingsManager.disableNormalEvents) {
            evt.preventDefault();
          }
          rightBtnMenuDOM.hide();
          uiManager.clearRMBSubMenu();
          if ($('#colorbox').css('display') === 'block') {
            $.colorbox.close(); // Close colorbox if it was open
          }
        };
        canvasDOM.on('click', function (evt) {
          uiInput.canvasClick(evt);
        });

        uiInput.canvasMouseDown = (evt: any) => {
          if (settingsManager.disableNormalEvents) {
            evt.preventDefault();
          }

          uiInput.isStartedOnCanvas = true;

          if (cameraManager.speedModifier === 1) {
            settingsManager.cameraMovementSpeed = 0.003;
            settingsManager.cameraMovementSpeedMin = 0.005;
          }

          if (evt.button === 2) {
            dragPoint = uiInput.getEarthScreenPoint(cameraManager.mouseX, cameraManager.mouseY);
            latLon = satellite.eci2ll(dragPoint[0], dragPoint[1], dragPoint[2]);
          }
          cameraManager.screenDragPoint = [cameraManager.mouseX, cameraManager.mouseY];
          cameraManager.dragStartPitch = cameraManager.camPitch;
          cameraManager.dragStartYaw = cameraManager.camYaw;
          if (evt.button === 0) {
            cameraManager.isDragging = true;
          }
          cameraManager.isCamSnapMode = false;
          if (!settingsManager.disableUI) {
            cameraManager.autoRotate(false);
          }
          rightBtnMenuDOM.hide();
          uiManager.clearRMBSubMenu();

          // TODO: Make uiManager.updateURL() a setting that is disabled by default
          uiManager.updateURL();
        };
        canvasDOM.on('mousedown', function (evt) {
          uiInput.canvasMouseDown(evt);
        });

        uiInput.canvasTouchStart = (evt: any) => {
          settingsManager.cameraMovementSpeed = 0.0001;
          settingsManager.cameraMovementSpeedMin = 0.0001;
          if (evt.originalEvent.touches.length > 1) {
            // Two Finger Touch
            isPinching = true;
            startPinchDistance = Math.hypot(evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX, evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY);
            // _pinchStart(evt)
          } else {
            // Single Finger Touch
            cameraManager.startMouseX = evt.originalEvent.touches[0].clientX;
            cameraManager.startMouseY = evt.originalEvent.touches[0].clientY;
            cameraManager.mouseX = evt.originalEvent.touches[0].clientX;
            cameraManager.mouseY = evt.originalEvent.touches[0].clientY;
            uiInput.mouseSat = uiInput.getSatIdFromCoord(cameraManager.mouseX, cameraManager.mouseY);
            settingsManager.cameraMovementSpeed = Math.max(0.005 * cameraManager.zoomLevel, settingsManager.cameraMovementSpeedMin);
            cameraManager.screenDragPoint = [cameraManager.mouseX, cameraManager.mouseY];
            // dragPoint = getEarthScreenPoint(x, y)
            dragPoint = cameraManager.screenDragPoint; // Ignore the earth on mobile
            cameraManager.dragStartPitch = cameraManager.camPitch;
            cameraManager.dragStartYaw = cameraManager.camYaw;
            cameraManager.isDragging = true;
            touchStartTime = Date.now();
            // If you hit the canvas hide any popups
            _hidePopUps();
            cameraManager.isCamSnapMode = false;
            if (!settingsManager.disableUI) {
              cameraManager.autoRotate(false);
            }

            // TODO: Make updateUrl() a setting that is disabled by default
            uiManager.updateURL();
          }
        };
        canvasDOM.on('touchstart', function (evt) {
          uiInput.canvasTouchStart(evt);
        });

        uiInput.canvasMouseUp = (evt: any) => {
          if (settingsManager.disableNormalEvents) {
            evt.preventDefault();
          }

          if (!uiInput.isStartedOnCanvas) {
            return;
          }
          uiInput.isStartedOnCanvas = false;

          if (!dragHasMoved) {
            if (settingsManager.isMobileModeEnabled) {
              cameraManager.mouseX = isNaN(cameraManager.mouseX) ? 0 : cameraManager.mouseX;
              cameraManager.mouseY = isNaN(cameraManager.mouseY) ? 0 : cameraManager.mouseY;
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
                uiInput.openRmbMenu();
              }
            }
          }
          // Force the serach bar to get repainted because it gets overwrote a lot
          dragHasMoved = false;
          cameraManager.isDragging = false;
          if (!settingsManager.disableUI) {
            cameraManager.autoRotate(false);
          }
        };
        canvasDOM.on('mouseup', function (evt) {
          uiInput.canvasMouseUp(evt);
        });
      }

      uiInput.openRmbMenu = () => {
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
        $('#line-sat-sun-rmb').hide();

        // Earth
        $('#earth-low-rmb').hide();
        $('#earth-high-rmb').hide();
        $('#earth-vec-rmb').hide();
        $('#earth-political-rmb').hide();

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
            $('#line-sat-sun-rmb').show();
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
        uiManager.earthClicked = () => {
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
          $('#earth-political-rmb').show();
          if (settingsManager.nasaImages == true) $('#earth-nasa-rmb').hide();
          if (settingsManager.trusatImages == true) $('#earth-trusat-rmb').hide();
          if (settingsManager.blueImages == true) $('#earth-blue-rmb').hide();
          if (settingsManager.lowresImages == true) $('#earth-low-rmb').hide();
          if (settingsManager.hiresNoCloudsImages == true) $('#earth-high-no-clouds-rmb').hide();
          if (settingsManager.vectorImages == true) $('#earth-vec-rmb').hide();
          if (settingsManager.politicalImages == true) $('#earth-political-rmb').hide();

          rightBtnSaveDOM.hide();
        };

        if (typeof latLon == 'undefined' || isNaN(latLon.lat) || isNaN(latLon.lon)) {
          // Intentional
        } else {
          // This is the Earth
          uiManager.earthClicked();
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

        if (touchTime > 150 && !isPinching && Math.abs(cameraManager.startMouseX - cameraManager.mouseX) < 50 && Math.abs(cameraManager.startMouseY - cameraManager.mouseY) < 50) {
          uiInput.openRmbMenu();
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
          cameraManager.autoRotate(false);
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
          uiInput.rmbMenuActions(e);
        });
        rightBtnViewMenuDOM.on('click', function (e) {
          uiInput.rmbMenuActions(e);
        });
        rightBtnEditMenuDOM.on('click', function (e) {
          uiInput.rmbMenuActions(e);
        });
        rightBtnCreateMenuDOM.on('click', function (e) {
          uiInput.rmbMenuActions(e);
        });
        rightBtnDrawMenuDOM.on('click', function (e) {
          uiInput.rmbMenuActions(e);
        });
        rightBtnColorsMenuDOM.on('click', function (e) {
          uiInput.rmbMenuActions(e);
        });
        rightBtnEarthMenuDOM.on('click', function (e) {
          uiInput.rmbMenuActions(e);
        });
        $('#reset-camera-rmb').on('click', function (e) {
          uiInput.rmbMenuActions(e);
        });
        $('#clear-screen-rmb').on('click', function (e) {
          uiInput.rmbMenuActions(e);
        });
        $('#clear-lines-rmb').on('click', function (e) {
          uiInput.rmbMenuActions(e);
        });

        rightBtnSaveDOM.on('mouseenter', () => {
          rightBtnSaveDOMDropdown();
        });
        rightBtnSaveDOM.on('click', () => {
          rightBtnSaveDOMDropdown();
        });
        rightBtnSaveMenuDOM.on('mouseleave', () => {
          // Lost Focus
          rightBtnSaveMenuDOM.hide();
        });

        rightBtnViewDOM.on('mouseenter', () => {
          rightBtnViewDOMDropdown();
        });
        rightBtnViewDOM.on('click', () => {
          rightBtnViewDOMDropdown();
        });
        rightBtnViewMenuDOM.on('mouseleave', () => {
          // Lost Focus
          rightBtnViewMenuDOM.hide();
        });

        rightBtnEditDOM.on('mouseenter', () => {
          rightBtnEditDOMDropdown();
        });
        rightBtnEditDOM.on('click', () => {
          rightBtnEditDOMDropdown();
        });
        rightBtnEditMenuDOM.on('mouseleave', () => {
          // Lost Focus
          rightBtnEditMenuDOM.hide();
        });

        rightBtnCreateDOM.on('mouseenter', () => {
          rightBtnCreateDOMDropdown();
        });
        rightBtnCreateDOM.on('click', () => {
          rightBtnCreateDOMDropdown();
        });
        rightBtnCreateMenuDOM.on('mouseleave', () => {
          // Lost Focus
          rightBtnCreateMenuDOM.hide();
        });

        rightBtnDrawDOM.on('mouseenter', () => {
          rightBtnDrawDOMDropdown();
        });
        rightBtnDrawDOM.on('click', () => {
          rightBtnDrawDOMDropdown();
        });
        rightBtnDrawMenuDOM.on('mouseleave', () => {
          // Lost Focus
          rightBtnDrawMenuDOM.hide();
        });

        rightBtnColorsDOM.on('mouseenter', () => {
          rightBtnColorsDOMDropdown();
        });
        rightBtnColorsDOM.on('click', () => {
          rightBtnColorsDOMDropdown();
        });
        rightBtnEarthMenuDOM.on('mouseleave', () => {
          // Lost Focus
          rightBtnEarthMenuDOM.hide();
        });

        rightBtnEarthDOM.on('mouseenter', () => {
          rightBtnEarthDOMDropdown();
        });
        rightBtnEarthDOM.on('click', () => {
          rightBtnEarthDOMDropdown();
        });
        rightBtnEarthMenuDOM.on('mouseleave', () => {
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
        const canvasWidth = canvasDOM.innerWidth();
        if (!canvasWidth) {
          console.warn('canvasDOM undefined!');
          return;
        }
        const offset = rightBtnDrawDOM.offset();
        if (!offset) {
          console.warn('rightBtnDrawDOM.offset() undefined!');
          return;
        }

        uiManager.clearRMBSubMenu();
        const offsetX = offset.left < canvasWidth / 2 ? 165 : -165;
        rightBtnDrawMenuDOM.css({
          'display': 'block',
          'text-align': 'center',
          'position': 'absolute',
          'left': offset.left + offsetX,
          'top': offset.top,
        });
        if (offset.top !== 0) {
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
      uiInput.rmbMenuActions = (e: any) => {
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
          case 'view-info-rmb':
            M.toast({
              html: 'Lat: ' + latLon.lat.toFixed(3) + '<br/>Lon: ' + latLon.lon.toFixed(3),
            });
            break;
          case 'view-sat-info-rmb':
            objectManager.setSelectedSat(clickedSat);
            break;
          case 'view-sensor-info-rmb':
            objectManager.setSelectedSat(clickedSat);
            $('#menu-sensor-info').trigger('click');
            break;
          case 'view-related-sats-rmb':
            var intldes = satSet.getSatExtraOnly(clickedSat).intlDes;
            var searchStr = intldes.slice(0, 8);
            uiManager.doSearch(searchStr);
            break;
          case 'view-curdops-rmb':
            var gpsDOP = satellite.getDOPs(latLon.lat, latLon.lon, 0);
            M.toast({
              html: 'HDOP: ' + gpsDOP.HDOP + '<br/>VDOP: ' + gpsDOP.VDOP + '<br/>PDOP: ' + gpsDOP.PDOP + '<br/>GDOP: ' + gpsDOP.GDOP + '<br/>TDOP: ' + gpsDOP.TDOP,
            });
            break;
          case 'view-24dops-rmb':
            if (!isDOPMenuOpen) {
              $('#dops-lat').val(latLon.lat.toFixed(3));
              $('#dops-lon').val(latLon.lon.toFixed(3));
              $('#dops-alt').val(0);
              $('#dops-el').val(settingsManager.gpsElevationMask);
              uiManager.bottomIconPress({
                currentTarget: { id: 'menu-dops' },
              });
              isDOPMenuOpen = true;
            } else {
              $('#loading-screen').fadeIn(1000, function () {
                $('#dops-lat').val(latLon.lat.toFixed(3));
                $('#dops-lon').val(latLon.lon.toFixed(3));
                $('#dops-alt').val(0);
                $('#dops-el').val(settingsManager.gpsElevationMask);
                const lat: number = parseFloat(<string>$('#dops-lat').val());
                const lon: number = parseFloat(<string>$('#dops-lon').val());
                const alt: number = parseFloat(<string>$('#dops-alt').val());
                // var el = $('#dops-el').val() * 1;
                satellite.getDOPsTable(lat, lon, alt);
                $('#menu-dops').addClass('bmenu-item-selected');
                $('#loading-screen').fadeOut('slow');
                $('#dops-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
              });
            }
            break;
          case 'create-sensor-rmb':
            $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            $('#menu-customSensor').addClass('bmenu-item-selected');
            keepTrackApi.programs.sensorManager.isCustomSensorMenuOpen = true;
            if ($('#cs-telescope').prop('checked')) {
              $('#cs-telescope').trigger('click');
            }
            $('#cs-lat').val(latLon.lat);
            $('#cs-lon').val(latLon.lon);
            $('#cs-hei').val(0);
            $('#cs-type').val('Phased Array Radar');
            $('#cs-minaz').val(0);
            $('#cs-maxaz').val(360);
            $('#cs-minel').val(10);
            $('#cs-maxel').val(90);
            $('#cs-minrange').val(0);
            $('#cs-maxrange').val(5556);
            $('#customSensor').trigger('submit');

            uiManager.legendMenuChange('default');
            satSet.setColorScheme(ColorScheme.default, true);
            uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
            settingsManager.isForceColorScheme = true;
            satCruncher.postMessage({
              isSunlightView: false,
            });
            break;
          case 'reset-camera-rmb':
            // if (cameraManager.cameraType.current == cameraManager.cameraType.fixedToSat) {
            //   // NOTE: Maybe a reset flag to move back to original position over time?
            //   cameraManager.camPitch = 0;
            //   cameraManager.camYaw = 0;
            // }
            cameraManager.isPanReset = true;
            cameraManager.isLocalRotateReset = true;
            cameraManager.ftsRotateReset = true;
            break;
          case 'clear-lines-rmb':
            lineManager.clear();
            keepTrackApi.programs.sensorManager.showAllWithFovList = [];
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
          case 'line-sat-sun-rmb':
            lineManager.create('sat2', [clickedSat, drawManager.sceneManager.sun.pos[0], drawManager.sceneManager.sun.pos[1], drawManager.sceneManager.sun.pos[2]], 'o');
            break;
          case 'create-observer-rmb':
            $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
            $('#menu-customSensor').addClass('bmenu-item-selected');
            keepTrackApi.programs.sensorManager.isCustomSensorMenuOpen = true;
            if (!$('#cs-telescope').prop('checked')) {
              $('#cs-telescope').trigger('click');
            }
            $('#cs-lat').val(latLon.lat);
            $('#cs-lon').val(latLon.lon);
            $('#cs-hei').val(0);
            $('#cs-type').val('Observer');
            $('#customSensor').trigger('submit');
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
            settingsManager.politicalImages = false;
            try {
              localStorage.setItem('lastMap', 'blue');
            } catch {
              // do nothing
            }
            drawManager.sceneManager.earth.init(gl);
            drawManager.sceneManager.earth.loadHiRes();
            drawManager.sceneManager.earth.loadHiResNight();
            break;
          case 'earth-nasa-rmb':
            settingsManager.blueImages = false;
            settingsManager.nasaImages = true;
            settingsManager.trusatImages = false;
            settingsManager.lowresImages = false;
            settingsManager.hiresImages = false;
            settingsManager.hiresNoCloudsImages = false;
            settingsManager.vectorImages = false;
            settingsManager.politicalImages = false;
            try {
              localStorage.setItem('lastMap', 'nasa');
            } catch {
              // do nothing
            }
            drawManager.sceneManager.earth.init(gl);
            drawManager.sceneManager.earth.loadHiRes();
            drawManager.sceneManager.earth.loadHiResNight();
            break;
          case 'earth-trusat-rmb':
            settingsManager.blueImages = false;
            settingsManager.nasaImages = false;
            settingsManager.trusatImages = true;
            settingsManager.lowresImages = false;
            settingsManager.hiresImages = false;
            settingsManager.hiresNoCloudsImages = false;
            settingsManager.vectorImages = false;
            settingsManager.politicalImages = false;
            try {
              localStorage.setItem('lastMap', 'trusat');
            } catch {
              // do nothing
            }
            drawManager.sceneManager.earth.init(gl);
            drawManager.sceneManager.earth.loadHiRes();
            drawManager.sceneManager.earth.loadHiResNight();
            break;
          case 'earth-low-rmb':
            settingsManager.blueImages = false;
            settingsManager.nasaImages = false;
            settingsManager.trusatImages = false;
            settingsManager.lowresImages = true;
            settingsManager.hiresImages = false;
            settingsManager.hiresNoCloudsImages = false;
            settingsManager.vectorImages = false;
            settingsManager.politicalImages = false;
            try {
              localStorage.setItem('lastMap', 'low');
            } catch {
              // do nothing
            }
            drawManager.sceneManager.earth.init(gl);
            drawManager.sceneManager.earth.loadHiRes();
            drawManager.sceneManager.earth.loadHiResNight();
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
              settingsManager.politicalImages = false;
              try {
                localStorage.setItem('lastMap', 'high');
              } catch {
                // do nothing
              }
              drawManager.sceneManager.earth.init(gl);
              drawManager.sceneManager.earth.loadHiRes();
              drawManager.sceneManager.earth.loadHiResNight();
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
              settingsManager.politicalImages = false;
              try {
                localStorage.setItem('lastMap', 'high-nc');
              } catch {
                // do nothing
              }
              drawManager.sceneManager.earth.init(gl);
              drawManager.sceneManager.earth.loadHiRes();
              drawManager.sceneManager.earth.loadHiResNight();
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
            settingsManager.politicalImages = false;
            try {
              localStorage.setItem('lastMap', 'vec');
            } catch {
              // do nothing
            }
            drawManager.sceneManager.earth.init(gl);
            drawManager.sceneManager.earth.loadHiRes();
            drawManager.sceneManager.earth.loadHiResNight();
            break;
          case 'earth-political-rmb':
            settingsManager.blueImages = false;
            settingsManager.nasaImages = false;
            settingsManager.trusatImages = false;
            settingsManager.lowresImages = false;
            settingsManager.hiresImages = false;
            settingsManager.hiresNoCloudsImages = false;
            settingsManager.vectorImages = false;
            settingsManager.politicalImages = true;
            try {
              localStorage.setItem('lastMap', 'vec');
            } catch {
              // do nothing
            }
            drawManager.sceneManager.earth.init(gl);
            drawManager.sceneManager.earth.loadHiRes();
            drawManager.sceneManager.earth.loadHiResNight();
            break;
          case 'clear-screen-rmb':
            (function clearScreenRMB() {
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
          default:
            keepTrackApi.methods.rmbMenuActions(targetId, clickedSat);
            break;
        }
        rightBtnMenuDOM.hide();
        uiManager.clearRMBSubMenu();
      };
    })();
  },

  // Convert Screen X,Y back to ECI
  unProject: (x: number, y: number): [number, number, number] => {
    const { cameraManager, drawManager } = keepTrackApi.programs;
    const { gl } = drawManager;

    const glScreenX = (x / gl.drawingBufferWidth) * 2 - 1.0;
    const glScreenY = 1.0 - (y / gl.drawingBufferHeight) * 2;
    const screenVec = [glScreenX, glScreenY, -0.01, 1.0]; // gl screen coords

    let comboPMat = glm.mat4.create();
    glm.mat4.mul(comboPMat, drawManager.pMatrix, cameraManager.camMatrix);
    let invMat = glm.mat4.create();
    glm.mat4.invert(invMat, comboPMat);
    let worldVec = glm.vec4.create();
    glm.vec4.transformMat4(worldVec, screenVec, invMat);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return [worldVec[0] / worldVec[3], worldVec[1] / worldVec[3], worldVec[2] / worldVec[3]];
  },

  getSatIdFromCoordAlt: (x: number, y: number): number => {
    const eci = uiInput.unProject(x, y);
    const eciArray = {
      x: eci[0],
      y: eci[1],
      z: eci[2],
    };
    return <number>keepTrackApi.programs.satSet.getIdFromEci(eciArray);
  },

  /* istanbul ignore next */
  clientWaitAsync: (gl: any, sync: any, flags: any, intervalMs: any) =>
    // eslint-disable-next-line implicit-arrow-linebreak
    new Promise((resolve, reject) => {
      const test = () => {
        // eslint-disable-next-line no-sync
        const res = gl.clientWaitSync(sync, flags, 0);
        if (res == gl.WAIT_FAILED) {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject();
          return;
        }
        if (res == gl.TIMEOUT_EXPIRED) {
          setTimeout(test, intervalMs);
          return;
        }
        resolve('Async Resolved!');
      };

      test();
    }),

  /* istanbul ignore next */
  getBufferSubDataAsync: async (gl: any, target: any, buffer: any, srcByteOffset: any, dstBuffer: any, dstOffset?: any, length?: any) => {
    // eslint-disable-next-line no-sync
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();

    await uiInput.clientWaitAsync(gl, sync, 0, 10);
    // eslint-disable-next-line no-sync
    gl.deleteSync(sync);

    gl.bindBuffer(target, buffer);
    gl.getBufferSubData(target, srcByteOffset, dstBuffer, dstOffset, length);
    gl.bindBuffer(target, null);

    return dstBuffer;
  },

  /* istanbul ignore next */
  readPixelsAsync: async (gl: any, x: number, y: number, w: number, h: number, format: any, type: any, dstBuffer: any) => {
    try {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, dstBuffer.byteLength, gl.STREAM_READ);
      gl.readPixels(x, y, w, h, format, type, 0);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

      await uiInput.getBufferSubDataAsync(gl, gl.PIXEL_PACK_BUFFER, buf, 0, dstBuffer);

      gl.deleteBuffer(buf);
      // eslint-disable-next-line require-atomic-updates
      uiInput.isAsyncWorking = true;
    } catch (error) {
      // eslint-disable-next-line require-atomic-updates
      uiInput.isAsyncWorking = false;
    }
  },

  isAsyncWorking: true,
  getSatIdFromCoord: (x: number, y: number): number => {
    const { dotsManager } = keepTrackApi.programs;
    const { gl } = keepTrackApi.programs.drawManager;

    // NOTE: gl.readPixels is a huge bottleneck
    gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManager.pickingFrameBuffer);
    if (typeof process === 'undefined' && uiInput.isAsyncWorking) {
      uiInput.readPixelsAsync(gl, x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManager.pickReadPixelBuffer);
    }
    if (!uiInput.isAsyncWorking) {
      gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManager.pickReadPixelBuffer);
    }
    // const id = ((dotsManager.pickReadPixelBuffer[2] << 16) | (dotsManager.pickReadPixelBuffer[1] << 8) | dotsManager.pickReadPixelBuffer[0]) - 1;
    return ((dotsManager.pickReadPixelBuffer[2] << 16) | (dotsManager.pickReadPixelBuffer[1] << 8) | dotsManager.pickReadPixelBuffer[0]) - 1;
  },

  // Raycasting in getEarthScreenPoint would provide a lot of powerful (but slow) options later
  getEarthScreenPoint: (x: number, y: number) => {
    const { cameraManager } = keepTrackApi.programs;

    // getEarthScreenPoint
    let rayOrigin, ptThru, rayDir, toCenterVec, dParallel, longDir, dPerp, dSubSurf, dSurf, ptSurf;

    rayOrigin = cameraManager.getCamPos();
    ptThru = uiInput.unProject(x, y);

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
  },
};
