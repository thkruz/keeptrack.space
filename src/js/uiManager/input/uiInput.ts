import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { Camera, UiInputInterface } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import { RADIUS_OF_EARTH } from '@app/js/lib/constants';
import * as glm from '@app/js/lib/external/gl-matrix.js';
import { closeColorbox, getEl, showLoading, slideInRight, triggerSubmit, waitForCruncher } from '@app/js/lib/helpers';
import $ from 'jquery';

type LatLon = {
  lat: number;
  lon: number;
};

let clickedSat = 0;
const maxPinchSize = Math.hypot(window.innerWidth, window.innerHeight);
let isDOPMenuOpen = false;
let mouseTimeout = -1;
let dragPoint = [0, 0, 0];
let dragHasMoved = false;
let isPinching = false;
let deltaPinchDistance = 0;
let startPinchDistance = 0;
let touchStartTime: number;
let latLon: LatLon;

// prettier-ignore
export const init = (): void => { // NOSONAR
  const { uiManager, mainCamera } = keepTrackApi.programs;

  getEl('rmb-wrapper').insertAdjacentHTML('beforeend', (keepTrackApi.html`    
      <div id="right-btn-menu" class="right-btn-menu">
        <ul id="right-btn-menu-ul" class='dropdown-contents'>          
          <li class="rmb-menu-item" id="view-rmb"><a href="#">View &#x27A4;</a></li>
          <li class="rmb-menu-item" id="edit-rmb"><a href="#">Edit &#x27A4;</a></li>
          <li class="rmb-menu-item" id="draw-rmb"><a href="#">Draw &#x27A4;</a></li>
          <li class="rmb-menu-item" id="create-rmb"><a href="#">Create &#x27A4;</a></li>
          <li class="rmb-menu-item" id="earth-rmb"><a href="#">Earth &#x27A4;</a></li>          
        </ul>
      </div> 
      `));

  // Append any other menus before putting the reset/clear options
  keepTrackApi.methods.rightBtnMenuAdd();

  // Now add the reset/clear options
  getEl('right-btn-menu-ul').insertAdjacentHTML('beforeend', (keepTrackApi.html`
      <li id="reset-camera-rmb"><a href="#">Reset Camera</a></li>
      <li id="clear-lines-rmb"><a href="#">Clear Lines</a></li>
      <li id="clear-screen-rmb"><a href="#">Clear Screen</a></li>
      `));

  getEl('rmb-wrapper').insertAdjacentHTML('beforeend', (keepTrackApi.html`    
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
          <li id="set-sec-sat-rmb"><a href="#">Set as Secondary Sat</a></li>
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
    `));

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
  // prettier-ignore
  window.addEventListener('keydown', (e: KeyboardEvent) => { // NOSONAR
    if (e.ctrlKey === true || e.metaKey === true) mainCamera.isCtrlPressed = true;
  });
  // prettier-ignore
  window.addEventListener('keyup', (e: KeyboardEvent) => { // NOSONAR
    if (e.ctrlKey === false || e.metaKey === false) mainCamera.isCtrlPressed = false;
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
    // var preventDefault = (e: Event) => {
    //   e.preventDefault();
    // };
    // var preventDefaultForScrollKeys = (e: Event) => {
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
    // } catch (e: Event) {
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
      if (event.ctrlKey && (event.code == 'Equal' || event.code == 'NumpadAdd' || event.code == 'NumpadSubtract' || event.code == 'NumpadSubtract' || event.code == 'Minus')) {
        event.preventDefault();
      }
    };

    const stopWheelZoom = (event: Event) => {
      if (mainCamera.isCtrlPressed) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', stopKeyZoom, { passive: false });
    window.addEventListener('mousewheel', stopWheelZoom, { passive: false });
    window.addEventListener('DOMMouseScroll', stopWheelZoom, { passive: false });
  }

  // Needed?
  if (settingsManager.disableWindowTouchMove) {
    // prettier-ignore
    window.addEventListener( // NOSONAR
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
    // prettier-ignore
    window.addEventListener('mousedown', (evt) => { // NOSONAR
      // Camera Manager Events
      // Middle Mouse Button MMB
      if (evt.button === 1) {
        mainCamera.localRotateStartPosition = mainCamera.localRotateCurrent;
        if (mainCamera.isShiftPressed) {
          mainCamera.isLocalRotateRoll = true;
          mainCamera.isLocalRotateYaw = false;
        } else {
          mainCamera.isLocalRotateRoll = false;
          mainCamera.isLocalRotateYaw = true;
        }
        evt.preventDefault();
      }

      // Right Mouse Button RMB
      if (evt.button === 2 && (mainCamera.isShiftPressed || mainCamera.isCtrlPressed)) {
        mainCamera.panStartPosition = mainCamera.panCurrent;
        if (mainCamera.isShiftPressed) {
          mainCamera.isScreenPan = false;
          mainCamera.isWorldPan = true;
        } else {
          mainCamera.isScreenPan = true;
          mainCamera.isWorldPan = false;
        }
      }
    });
  }

  if (!settingsManager.disableCameraControls) {
    // prettier-ignore
    window.addEventListener('mouseup', function (evt: any) { // NOSONAR
      // Camera Manager Events
      if (evt.button === 1) {
        mainCamera.isLocalRotateRoll = false;
        mainCamera.isLocalRotateYaw = false;
      }
      if (evt.button === 2) {
        mainCamera.isScreenPan = false;
        mainCamera.isWorldPan = false;
      }
    });
  }

  (function _canvasController() {
    canvasDOM.on('touchmove', function (e) {
      canvasTouchMove(e, mainCamera);
    });

    uiInput.mouseMoveTimeout = -1;
    canvasDOM.on('mousemove', function(e) {
      canvasMouseMove(e, mainCamera, canvasDOM);
      settingsManager.lastInteractionTime = Date.now();
    });

    if (settingsManager.disableUI) {
      canvasDOM.on('wheel', function () {
        satHoverBoxDOM.css({
          display: 'none',
        });
      });
    }
    if (!settingsManager.disableUI) {
      canvasDOM.on('wheel', function (evt: any) {
        uiInput.canvasWheel(evt);
        settingsManager.lastInteractionTime = Date.now();
      });

      uiInput.canvasClick = (evt: any) => {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }
        rightBtnMenuDOM.hide();
        uiManager.clearRMBSubMenu();
        closeColorbox();
      };
      canvasDOM.on('click', function (evt: any) {
        uiInput.canvasClick(evt);
      });
      canvasDOM.on('mousedown', function (evt: any) {
        uiInput.canvasMouseDown(evt);
      });
      canvasDOM.on('touchstart', function (evt: any) {
        uiInput.canvasTouchStart(evt);
      });
      canvasDOM.on('mouseup', function (evt: any) {
        uiInput.canvasMouseUp(evt);
      });
    }

    canvasDOM.on('touchend', function () {
      canvasTouchEnd(mainCamera);
    });

    getEl('nav-wrapper')?.addEventListener('click', function () {
      hidePopUps();
    });
    getEl('nav-footer')?.addEventListener('click', function () {
      hidePopUps();
    });
    getEl('ui-wrapper')?.addEventListener('click', function () {
      hidePopUps();
    });

    if (settingsManager.startWithFocus) {
      canvasDOM.attr('tabIndex', 0);
      canvasDOM.trigger('focus');
    }

    if (!settingsManager.disableUI) {
      bodyDOM.on('keypress', (e: Event) => {
        uiManager.keyHandler(e);
      }); // On Key Press Event Run _keyHandler Function
      bodyDOM.on('keydown', (e: Event) => {
        if (uiManager.isCurrentlyTyping) return;
        mainCamera.keyDownHandler(e);
      }); // On Key Press Event Run _keyHandler Function
      bodyDOM.on('keyup', (e: Event) => {
        if (uiManager.isCurrentlyTyping) return;
        mainCamera.keyUpHandler(e);
      }); // On Key Press Event Run _keyHandler Function

      rightBtnSaveMenuDOM.on('click', function (e: Event) {
        uiInput.rmbMenuActions(e);
      });
      rightBtnViewMenuDOM.on('click', function (e: Event) {
        uiInput.rmbMenuActions(e);
      });
      rightBtnEditMenuDOM.on('click', function (e: Event) {
        uiInput.rmbMenuActions(e);
      });
      rightBtnCreateMenuDOM.on('click', function (e: Event) {
        uiInput.rmbMenuActions(e);
      });
      rightBtnDrawMenuDOM.on('click', function (e: Event) {
        uiInput.rmbMenuActions(e);
      });
      rightBtnColorsMenuDOM.on('click', function (e: Event) {
        uiInput.rmbMenuActions(e);
      });
      rightBtnEarthMenuDOM.on('click', function (e: Event) {
        uiInput.rmbMenuActions(e);
      });
      $('#reset-camera-rmb').on('click', function (e: Event) {
        uiInput.rmbMenuActions(e);
      });
      $('#clear-screen-rmb').on('click', function (e: Event) {
        uiInput.rmbMenuActions(e);
      });
      $('#clear-lines-rmb').on('click', function (e: Event) {
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
      rightBtnColorsMenuDOM.on('mouseleave', () => {
        // Lost Focus
        rightBtnColorsMenuDOM.hide();
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
    const rightBtnSaveDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      const offsetX = rightBtnSaveDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
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
    const rightBtnViewDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      const offsetX = rightBtnViewDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
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
    const rightBtnEditDOMDropdown = () => {
      uiManager.clearRMBSubMenu();

      const offsetX = rightBtnEditDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
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
    const rightBtnCreateDOMDropdown = () => {
      uiManager.clearRMBSubMenu();

      const offsetX = rightBtnCreateDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
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
    const rightBtnDrawDOMDropdown = () => {
      const canvasWidth = canvasDOM.innerWidth();
      if (!canvasDOM || canvasDOM.length === 0) {
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
    const rightBtnColorsDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      const offsetX = rightBtnColorsDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
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
    const rightBtnEarthDOMDropdown = () => {
      uiManager.clearRMBSubMenu();
      const offsetX = rightBtnEarthDOM.offset().left < canvasDOM.innerWidth() / 2 ? 165 : -165;
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
    uiInput.rmbMenuActions = rmbMenuActions;
  })();
};

// prettier-ignore
export const rmbMenuActions = (e: MouseEvent) => { // NOSONAR
  // No Right Click Without UI
  if (settingsManager.disableUI) return;

  const { uiManager, colorSchemeManager, starManager, sensorManager, lineManager, satSet, satellite, mainCamera, objectManager, drawManager, groupsManager } = keepTrackApi.programs;
  const gl = drawManager.gl;
  const M = window.M;

  let target = <HTMLElement>e.target;
  let targetId = target.id;
  if (target.tagName == 'A') {
    targetId = (<HTMLElement>target.parentNode).id;
  }
  if (target.tagName == 'UL') {
    targetId = (<HTMLElement>target.firstChild).id;
  }
  switch (targetId) {
    case 'view-info-rmb':
      if (typeof latLon == 'undefined' || isNaN(latLon.lat) || isNaN(latLon.lon)) {
        console.debug('latLon undefined!');
        latLon = satellite.eci2ll(dragPoint[0], dragPoint[1], dragPoint[2]);
      }
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
      if (typeof intldes == 'undefined') uiManager.toast(`Time 1 is Invalid!`, 'serious');
      var searchStr = intldes.slice(0, 8);
      uiManager.doSearch(searchStr);
      break;
    case 'view-curdops-rmb':
      if (typeof latLon == 'undefined' || isNaN(latLon.lat) || isNaN(latLon.lon)) {
        console.debug('latLon undefined!');
        latLon = satellite.eci2ll(dragPoint[0], dragPoint[1], dragPoint[2]);
      }
      var gpsDOP = satellite.getDops(latLon.lat, latLon.lon, 0);
      M.toast({
        html: 'HDOP: ' + gpsDOP.hdop + '<br/>VDOP: ' + gpsDOP.vdop + '<br/>PDOP: ' + gpsDOP.pdop + '<br/>GDOP: ' + gpsDOP.gdop + '<br/>TDOP: ' + gpsDOP.tdop,
      });
      break;
    case 'view-24dops-rmb':
      if (!isDOPMenuOpen) {
        (<HTMLInputElement>getEl('dops-lat')).value = latLon.lat.toFixed(3);
        (<HTMLInputElement>getEl('dops-lon')).value = latLon.lon.toFixed(3);
        (<HTMLInputElement>getEl('dops-alt')).value = '0';
        (<HTMLInputElement>getEl('dops-el')).value = settingsManager.gpsElevationMask.toString();
        uiManager.bottomIconPress({
          currentTarget: { id: 'menu-dops' },
        });
        isDOPMenuOpen = true;
      } else {
        showLoading(() => {        
          (<HTMLInputElement>getEl('dops-lat')).value = latLon.lat.toFixed(3);
          (<HTMLInputElement>getEl('dops-lon')).value = latLon.lon.toFixed(3);
          (<HTMLInputElement>getEl('dops-alt')).value = '0';
          (<HTMLInputElement>getEl('dops-el')).value = settingsManager.gpsElevationMask.toString();
          const lat: number = parseFloat(<string>(<HTMLInputElement>getEl('dops-lat')).value);
          const lon: number = parseFloat(<string>(<HTMLInputElement>getEl('dops-lon')).value);
          const alt: number = parseFloat(<string>(<HTMLInputElement>getEl('dops-alt')).value);
          satellite.updateDopsTable(lat, lon, alt);
          getEl('menu-dops').classList.add('bmenu-item-selected');          
          (<any>$('#dops-menu')).effect('slide', { direction: 'left', mode: 'show' }, 1000);        
        });
      }
      break;
    case 'create-sensor-rmb':      
      slideInRight(getEl('customSensor-menu'), 1000);
      getEl('menu-customSensor').classList.add('bmenu-item-selected');
      keepTrackApi.programs.sensorManager.isCustomSensorMenuOpen = true;
      if ($('#cs-telescope').prop('checked')) {
        $('#cs-telescope').trigger('click');
      }
      (<HTMLInputElement>getEl('cs-lat')).value = latLon.lat.toString();
      (<HTMLInputElement>getEl('cs-lon')).value = latLon.lon.toString();
      (<HTMLInputElement>getEl('cs-hei')).value = '0';
      (<HTMLInputElement>getEl('cs-type')).value = 'Phased Array Radar';
      (<HTMLInputElement>getEl('cs-minaz')).value = '0';
      (<HTMLInputElement>getEl('cs-maxaz')).value = '360';
      (<HTMLInputElement>getEl('cs-minel')).value = '10';
      (<HTMLInputElement>getEl('cs-maxel')).value = '90';
      (<HTMLInputElement>getEl('cs-minrange')).value = '0';
      (<HTMLInputElement>getEl('cs-maxrange')).value = "5556";
      triggerSubmit(<HTMLFormElement>getEl('customSensor'));
      uiManager.legendMenuChange('default');
      satSet.setColorScheme(colorSchemeManager.default, true);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      satSet.satCruncher.postMessage({
        isSunlightView: false,
      });
      break;
    case 'set-sec-sat-rmb':
      objectManager.setSecondarySat(clickedSat);
      break;
    case 'reset-camera-rmb':
      mainCamera.isPanReset = true;
      mainCamera.isLocalRotateReset = true;
      mainCamera.ftsRotateReset = true;
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
      lineManager.create('sat5', [clickedSat, satSet.getSensorFromSensorName(sensorManager.currentSensor[0].name)], 'p');
      break;
    case 'line-sat-sat-rmb':
      lineManager.create('sat5', [clickedSat, objectManager.selectedSat], 'b');
      break;
    case 'line-sat-sun-rmb':
      lineManager.create('sat2', [clickedSat, drawManager.sceneManager.sun.pos[0], drawManager.sceneManager.sun.pos[1], drawManager.sceneManager.sun.pos[2]], 'o');
      break;
    case 'create-observer-rmb':
      slideInRight(getEl('customSensor-menu'), 1000);
      getEl('menu-customSensor').classList.add('bmenu-item-selected');
      keepTrackApi.programs.sensorManager.isCustomSensorMenuOpen = true;
      if (!$('#cs-telescope').prop('checked')) {
        $('#cs-telescope').trigger('click');
      }
      (<HTMLInputElement>getEl('cs-lat')).value = latLon.lat.toString();
      (<HTMLInputElement>getEl('cs-lon')).value = latLon.lon.toString();
      (<HTMLInputElement>getEl('cs-hei')).value = '0';
      (<HTMLInputElement>getEl('cs-type')).value = 'Observer';
      triggerSubmit(<HTMLFormElement>getEl('customSensor'));
      satSet.satCruncher.postMessage({
        isSunlightView: true,
      });      
      uiManager.legendMenuChange('sunlight');      
      uiManager.colorSchemeChangeAlert(colorSchemeManager.sunlight);
      waitForCruncher(satSet.satCruncher, () => {
        satSet.setColorScheme(colorSchemeManager.sunlight, true);
      }, (data: any) => data.satInSun);
      break;
    case 'colors-default-rmb':
      uiManager.legendMenuChange('default');
      if (groupsManager.selectedGroup !== null) {
        satSet.setColorScheme(colorSchemeManager.group, true);
      } else {
        satSet.setColorScheme(colorSchemeManager.default, true);
      }
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'colors-sunlight-rmb':
      satSet.satCruncher.postMessage({
        isSunlightView: true,
      });      
      uiManager.legendMenuChange('sunlight');      
      uiManager.colorSchemeChangeAlert(colorSchemeManager.sunlight);
      waitForCruncher(satSet.satCruncher, () => {
        satSet.setColorScheme(colorSchemeManager.sunlight, true);
      }, (data: any) => data.satInSun);
      break;
    case 'colors-country-rmb':
      uiManager.legendMenuChange('countries');
      if (groupsManager.selectedGroup !== null) {
        satSet.setColorScheme(colorSchemeManager.groupCountries, true);
      } else {
        satSet.setColorScheme(colorSchemeManager.countries, true);
      }
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'colors-velocity-rmb':
      uiManager.legendMenuChange('velocity');
      satSet.setColorScheme(colorSchemeManager.velocity, true);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
      break;
    case 'colors-ageOfElset-rmb':
      uiManager.legendMenuChange('ageOfElset');
      satSet.setColorScheme(colorSchemeManager.ageOfElset, true);
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
      showLoading(() => {
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
      });
      break;
    case 'earth-high-no-clouds-rmb':
      showLoading(() => {
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
        uiManager.doSearch('');
        uiManager.searchToggle(false);
        uiManager.hideSideMenus();

        if (
          (!objectManager.isSensorManagerLoaded || sensorManager.currentSensor[0].lat != null) &&
          mainCamera.cameraType.current !== mainCamera.cameraType.Planetarium &&
          mainCamera.cameraType.current !== mainCamera.cameraType.Astronomy
        ) {
          uiManager.legendMenuChange('default');
        }

        // Revert any group color scheme back to a non group scheme
        if (colorSchemeManager.currentColorScheme === colorSchemeManager.group) {
          satSet.setColorScheme(colorSchemeManager.default, true);
        }
        if (colorSchemeManager.currentColorScheme === colorSchemeManager.groupCountries) {
          satSet.setColorScheme(colorSchemeManager.countries, true);
        }

        objectManager.setSelectedSat(-1);
      break;
    default:
      keepTrackApi.methods.rmbMenuActions(targetId, clickedSat);
      break;
  }

  getEl('right-btn-menu').style.display = 'none';
  uiManager.clearRMBSubMenu();
};

export const unProject = (x: number, y: number): [number, number, number] => {
  const { mainCamera, drawManager } = keepTrackApi.programs;
  const { gl } = drawManager;

  const glScreenX = (x / gl.drawingBufferWidth) * 2 - 1.0;
  const glScreenY = 1.0 - (y / gl.drawingBufferHeight) * 2;
  const screenVec = [glScreenX, glScreenY, -0.01, 1.0]; // gl screen coords

  const comboPMat = glm.mat4.create();
  glm.mat4.mul(comboPMat, drawManager.pMatrix, mainCamera.camMatrix);
  const invMat = glm.mat4.create();
  glm.mat4.invert(invMat, comboPMat);
  const worldVec = <[number, number, number, number]>(<unknown>glm.vec4.create());
  glm.vec4.transformMat4(<any>worldVec, screenVec, invMat);

  return [worldVec[0] / worldVec[3], worldVec[1] / worldVec[3], worldVec[2] / worldVec[3]];
};

export const getSatIdFromCoordAlt = (x: number, y: number): number => {
  const eci = uiInput.unProject(x, y);
  const eciArray = {
    x: eci[0],
    y: eci[1],
    z: eci[2],
  };
  return keepTrackApi.programs.satSet.getIdFromEci(eciArray);
};
export const getSatIdFromCoord = (x: number, y: number): number => {
  const { dotsManager } = keepTrackApi.programs;
  const { gl } = keepTrackApi.programs.drawManager;

  // NOTE: gl.readPixels is a huge bottleneck
  gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManager.pickingFrameBuffer);
  if (typeof process === 'undefined' && uiInput.isAsyncWorking) {
    uiInput.readPixelsAsync(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManager.pickReadPixelBuffer);
  }
  if (!uiInput.isAsyncWorking) {
    gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManager.pickReadPixelBuffer);
  }
  // NOTE: const id = ((dotsManager.pickReadPixelBuffer[2] << 16) | (dotsManager.pickReadPixelBuffer[1] << 8) | dotsManager.pickReadPixelBuffer[0]) - 1;
  return ((dotsManager.pickReadPixelBuffer[2] << 16) | (dotsManager.pickReadPixelBuffer[1] << 8) | dotsManager.pickReadPixelBuffer[0]) - 1;
};
export const getEarthScreenPoint = (x: number, y: number) => {
  const { mainCamera } = keepTrackApi.programs;
  if (typeof x === 'undefined' || typeof y === 'undefined') throw new Error('x and y must be defined');
  if (isNaN(x) || isNaN(y)) throw new Error('x and y must be numbers');

  // Where is the camera
  const rayOrigin = mainCamera.getForwardVector();
  // What did we click on
  const ptThru = uiInput.unProject(x, y);

  // Clicked on minus starting point is our direction vector
  const rayDir = glm.vec3.create();
  glm.vec3.subtract(rayDir, ptThru, rayOrigin); // rayDir = ptThru - rayOrigin
  glm.vec3.normalize(rayDir, rayDir);

  const toCenterVec = glm.vec3.create();
  glm.vec3.scale(toCenterVec, rayOrigin, -1); // toCenter is just -camera pos because center is at [0,0,0]
  const dParallel = glm.vec3.dot(rayDir, toCenterVec);

  const longDir = glm.vec3.create();
  glm.vec3.scale(longDir, rayDir, dParallel); // longDir = rayDir * distParallel
  glm.vec3.add(ptThru, rayOrigin, longDir); // ptThru is now on the plane going through the center of sphere
  const dPerp = glm.vec3.len(ptThru);

  const dSubSurf = Math.sqrt(RADIUS_OF_EARTH * RADIUS_OF_EARTH - dPerp * dPerp);
  const dSurf = dParallel - dSubSurf;

  const ptSurf = glm.vec3.create();
  glm.vec3.scale(ptSurf, rayDir, dSurf);
  glm.vec3.add(ptSurf, ptSurf, rayOrigin);

  return ptSurf;
};

// prettier-ignore
export const canvasWheel = (evt: any): void => { // NOSONAR
  const { mainCamera, objectManager, drawManager } = keepTrackApi.programs;

  if (!settingsManager.disableUI && settingsManager.disableNormalEvents) {
    evt.preventDefault();
  }

  let delta = evt.originalEvent.deltaY;
  if (evt.originalEvent.deltaMode === 1) {
    delta *= 33.3333333;
  }

  if (delta < 0) {
    mainCamera.isZoomIn = true;
  } else {
    mainCamera.isZoomIn = false;
  }

  if (settingsManager.isZoomStopsRotation) {
    mainCamera.autoRotate(false);
  }

  if (settingsManager.isZoomStopsSnappedOnSat || objectManager.selectedSat == -1) {
    let zoomTarget = mainCamera.zoomTarget();
    zoomTarget += delta / 100 / 50 / mainCamera.speedModifier; // delta is +/- 100
    zoomTarget = Math.min(Math.max(zoomTarget, 0.001), 1); // Force between 0 and 1
    mainCamera.zoomTarget(zoomTarget);
    mainCamera.ecLastZoom = zoomTarget;
    mainCamera.camZoomSnappedOnSat = false;
  } else {
    if (settingsManager.camDistBuffer < 300 || settingsManager.nearZoomLevel == -1) {
      settingsManager.camDistBuffer += delta / 7.5; // delta is +/- 100
      settingsManager.camDistBuffer = Math.min(Math.max(settingsManager.camDistBuffer, 30), 300);
      settingsManager.nearZoomLevel = mainCamera.zoomLevel();
    }
    if (settingsManager.camDistBuffer >= 300) {
      let zoomTarget = mainCamera.zoomTarget();
      zoomTarget += delta / 100 / 50 / mainCamera.speedModifier; // delta is +/- 100
      zoomTarget = Math.min(Math.max(zoomTarget, 0.001), 1); // Force between 0 and 1
      mainCamera.zoomTarget(zoomTarget);
      mainCamera.ecLastZoom = zoomTarget;
      mainCamera.camZoomSnappedOnSat = false;
      if (zoomTarget < settingsManager.nearZoomLevel) {
        mainCamera.camZoomSnappedOnSat = true;
        settingsManager.camDistBuffer = 200;
      }
    }
  }

  if (
    mainCamera.cameraType.current === mainCamera.cameraType.Planetarium ||
    mainCamera.cameraType.current === mainCamera.cameraType.Fps ||
    mainCamera.cameraType.current === mainCamera.cameraType.Satellite ||
    mainCamera.cameraType.current === mainCamera.cameraType.Astronomy
  ) {
    settingsManager.fieldOfView += delta * 0.0002;
    $('#fov-text').html('FOV: ' + (settingsManager.fieldOfView * 100).toFixed(2) + ' deg');
    if (settingsManager.fieldOfView > settingsManager.fieldOfViewMax) settingsManager.fieldOfView = settingsManager.fieldOfViewMax;
    if (settingsManager.fieldOfView < settingsManager.fieldOfViewMin) settingsManager.fieldOfView = settingsManager.fieldOfViewMin;
    drawManager.glInit();
  }
};
export const canvasMouseDown = (evt: any) => {
  if (settingsManager.disableNormalEvents) {
    evt.preventDefault();
  }
  const { mainCamera, uiManager, satellite } = keepTrackApi.programs;
  const rightBtnMenuDOM = $('#right-btn-menu');

  uiInput.isStartedOnCanvas = true;

  if (mainCamera.speedModifier === 1) {
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
  }

  if (evt.button === 2) {
    dragPoint = uiInput.getEarthScreenPoint(mainCamera.mouseX, mainCamera.mouseY);
    latLon = satellite.eci2ll(dragPoint[0], dragPoint[1], dragPoint[2]);
  }
  mainCamera.screenDragPoint = [mainCamera.mouseX, mainCamera.mouseY];
  mainCamera.dragStartPitch = mainCamera.camPitch;
  mainCamera.dragStartYaw = mainCamera.camYaw;
  if (evt.button === 0) {
    mainCamera.isDragging = true;
  }
  mainCamera.isCamSnapMode = false;
  if (!settingsManager.disableUI) {
    mainCamera.autoRotate(false);
  }
  rightBtnMenuDOM.hide();
  uiManager.clearRMBSubMenu();

  // TODO: Make uiManager.updateURL() a setting that is disabled by default
  uiManager.updateURL();
};

// prettier-ignore
export const canvasMouseUp = (evt: any) => { // NOSONAR
  if (settingsManager.disableNormalEvents) {
    evt.preventDefault();
  }
  const { mainCamera, satSet, objectManager } = keepTrackApi.programs;

  if (!uiInput.isStartedOnCanvas) {
    return;
  }
  uiInput.isStartedOnCanvas = false;

  if (!dragHasMoved) {
    if (settingsManager.isMobileModeEnabled) {
      mainCamera.mouseX = isNaN(mainCamera.mouseX) ? 0 : mainCamera.mouseX;
      mainCamera.mouseY = isNaN(mainCamera.mouseY) ? 0 : mainCamera.mouseY;
      uiInput.mouseSat = uiInput.getSatIdFromCoord(mainCamera.mouseX, mainCamera.mouseY);
    }
    clickedSat = uiInput.mouseSat;
    if (evt.button === 0) {
      // Left Mouse Button Clicked
      if (mainCamera.cameraType.current === mainCamera.cameraType.Satellite) {
        if (clickedSat !== -1 && !satSet.getSatExtraOnly(clickedSat).static) {
          objectManager.setSelectedSat(clickedSat);
        }
      } else {
        objectManager.setSelectedSat(clickedSat);
      }
    }
    if (evt.button === 2) {
      // Right Mouse Button Clicked
      if (!mainCamera.isCtrlPressed && !mainCamera.isShiftPressed) {
        uiInput.openRmbMenu();
      }
    }
  }
  // Force the serach bar to get repainted because it gets overwrote a lot
  dragHasMoved = false;
  mainCamera.isDragging = false;
  if (!settingsManager.disableUI) {
    mainCamera.autoRotate(false);
  }
};
export const canvasTouchStart = (evt: any) => {
  const { mainCamera, uiManager } = keepTrackApi.programs;

  settingsManager.cameraMovementSpeed = 0.0001;
  settingsManager.cameraMovementSpeedMin = 0.0001;
  if (evt.originalEvent.touches.length > 1) {
    // Two Finger Touch
    isPinching = true;
    startPinchDistance = Math.hypot(
      evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX,
      evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY
    );
    // _pinchStart(evt)
  } else {
    // Single Finger Touch
    mainCamera.startMouseX = evt.originalEvent.touches[0].clientX;
    mainCamera.startMouseY = evt.originalEvent.touches[0].clientY;
    mainCamera.mouseX = evt.originalEvent.touches[0].clientX;
    mainCamera.mouseY = evt.originalEvent.touches[0].clientY;
    uiInput.mouseSat = uiInput.getSatIdFromCoord(mainCamera.mouseX, mainCamera.mouseY);
    settingsManager.cameraMovementSpeed = Math.max(0.005 * mainCamera.zoomLevel(), settingsManager.cameraMovementSpeedMin);
    mainCamera.screenDragPoint = [mainCamera.mouseX, mainCamera.mouseY];
    // dragPoint = getEarthScreenPoint(x, y)
    dragPoint = mainCamera.screenDragPoint; // Ignore the earth on mobile
    mainCamera.dragStartPitch = mainCamera.camPitch;
    mainCamera.dragStartYaw = mainCamera.camYaw;
    mainCamera.isDragging = true;
    touchStartTime = Date.now();
    // If you hit the canvas hide any popups
    hidePopUps();
    mainCamera.isCamSnapMode = false;
    if (!settingsManager.disableUI) {
      mainCamera.autoRotate(false);
    }

    // TODO: Make updateUrl() a setting that is disabled by default
    uiManager.updateURL();
  }
};

// prettier-ignore
export const openRmbMenu = (testmouseSat: number = -1) => { // NOSONAR
  if (!settingsManager.isAllowRightClick) return;
  const { uiManager, sensorManager, lineManager, satSet, mainCamera, objectManager } = keepTrackApi.programs;
  const canvasDOM = $('#keeptrack-canvas');
  const rightBtnMenuDOM = $('#right-btn-menu');
  const rightBtnSaveDOM = $('#save-rmb');
  const rightBtnViewDOM = $('#view-rmb');
  const rightBtnEditDOM = $('#edit-rmb');
  const rightBtnCreateDOM = $('#create-rmb');
  const rightBtnDrawDOM = $('#draw-rmb');
  const rightBtnEarthDOM = $('#earth-rmb');
  const satHoverBoxDOM = $('#sat-hoverbox');

  let numMenuItems = 0;
  getEl('clear-lines-rmb').style.display = 'none';

  // View
  getEl('view-info-rmb').style.display = 'none';
  getEl('view-sensor-info-rmb').style.display = 'none';
  getEl('view-sat-info-rmb').style.display = 'none';
  getEl('view-related-sats-rmb').style.display = 'none';
  getEl('view-curdops-rmb').style.display = 'none';
  getEl('view-24dops-rmb').style.display = 'none';

  // Edit
  getEl('edit-sat-rmb').style.display = 'none';
  getEl('set-sec-sat-rmb').style.display = 'none';

  // Create
  getEl('create-observer-rmb').style.display = 'none';
  getEl('create-sensor-rmb').style.display = 'none';

  // Draw
  getEl('line-eci-axis-rmb').style.display = 'none';
  getEl('line-sensor-sat-rmb').style.display = 'none';
  getEl('line-earth-sat-rmb').style.display = 'none';
  getEl('line-sat-sat-rmb').style.display = 'none';
  getEl('line-sat-sun-rmb').style.display = 'none';

  // Earth
  const earthLowRmb = getEl('earth-low-rmb')
  if (earthLowRmb) earthLowRmb.style.display = 'none';
  const earthHighRmb = getEl('earth-high-rmb')
  if (earthHighRmb) earthHighRmb.style.display = 'none';
  const earthVecRmb = getEl('earth-vec-rmb')
  if (earthVecRmb) earthVecRmb.style.display = 'none';
  const earthPoliticalRmb = getEl('earth-political-rmb')
  if (earthPoliticalRmb) earthPoliticalRmb.style.display = 'none';

  // Reset Camera
  // getEl('reset-camera-rmb').style.display = 'none';
  // Colors Always Present
  let isViewDOM = false;
  const isCreateDOM = false;
  let isDrawDOM = false;
  const isEarthDOM = false;

  rightBtnSaveDOM.show();
  rightBtnViewDOM.hide();
  rightBtnEditDOM.hide();
  rightBtnCreateDOM.hide();
  rightBtnDrawDOM.hide();
  rightBtnEarthDOM.hide();

  if (lineManager.getLineListLen() > 0) {
    getEl('clear-lines-rmb').style.display = 'block';
  }

  if (uiInput.mouseSat !== -1 || testmouseSat !== -1) {
    if (typeof clickedSat == 'undefined') return;
    const sat = satSet.getSat(clickedSat);
    if (typeof sat == 'undefined' || sat == null) return;
    if (typeof sat.type == 'undefined' || sat.type !== SpaceObjectType.STAR) {
      rightBtnViewDOM.show();
      isViewDOM = true;
      numMenuItems++;
    }

    if (sat.type === SpaceObjectType.PAYLOAD || sat.type === SpaceObjectType.ROCKET_BODY || sat.type === SpaceObjectType.DEBRIS || sat.type === SpaceObjectType.SPECIAL) {
      getEl('set-sec-sat-rmb').style.display = 'block';
      rightBtnEditDOM.show();
      numMenuItems++;
    } else if (!sat.static) {
      numMenuItems++;
    }

    if (!sat.static) {
      getEl('edit-sat-rmb').style.display = 'block';
      rightBtnEditDOM.show();

      getEl('view-sat-info-rmb').style.display = 'block';
      getEl('view-related-sats-rmb').style.display = 'block';

      if (objectManager.isSensorManagerLoaded && sensorManager.currentSensor[0].lat != null && sensorManager.whichRadar !== 'CUSTOM') {
        getEl('line-sensor-sat-rmb').style.display = 'block';
      }
      getEl('line-earth-sat-rmb').style.display = 'block';
      getEl('line-sat-sat-rmb').style.display = 'block';
      getEl('line-sat-sun-rmb').style.display = 'block';
      rightBtnDrawDOM.show();
      isDrawDOM = true;
      numMenuItems++;
    } else {
      switch (sat.type) {
        case SpaceObjectType.PHASED_ARRAY_RADAR:
        case SpaceObjectType.OPTICAL:
        case SpaceObjectType.MECHANICAL:
        case SpaceObjectType.GROUND_SENSOR_STATION:
          getEl('view-sensor-info-rmb').style.display = 'block';
          break;
        default:
      }
    }
  } else {
    // Intentional
  }

  // Is this the Earth?
  //
  // This not the Earth
  uiManager.earthClicked = () => {
    numMenuItems = earthClicked({ isViewDOM, rightBtnViewDOM, numMenuItems, isCreateDOM, rightBtnCreateDOM, isDrawDOM, rightBtnDrawDOM, isEarthDOM, rightBtnEarthDOM, rightBtnSaveDOM });
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
  const offsetX = mainCamera.mouseX < canvasDOM.innerWidth() / 2 ? 0 : -100;
  const offsetY = mainCamera.mouseY < canvasDOM.innerHeight() / 2 ? 0 : numMenuItems * -50;
  rightBtnMenuDOM.css({
    'display': 'block',
    'text-align': 'center',
    'position': 'absolute',
    'left': mainCamera.mouseX + offsetX,
    'top': mainCamera.mouseY + offsetY,
  });
};
export const hidePopUps = () => {
  if (settingsManager.isPreventColorboxClose) return;
  const { uiManager } = keepTrackApi.programs;
  const rightBtnMenuDOM = $('#right-btn-menu');
  rightBtnMenuDOM.hide();
  uiManager.clearRMBSubMenu();
};

// *********************************************************************************************************************
// WebGL Functions that we can't unit test for yet
// *********************************************************************************************************************
/* istanbul ignore next */
export const clientWaitAsync = (gl: any, sync: any, flags: any, intervalMs: any) =>
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
  });
/* istanbul ignore next */
export const getBufferSubDataAsync = async (gl: any, target: any, buffer: any, srcByteOffset: any, dstBuffer: any, dstOffset?: any, length?: any) => {
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
};
/* istanbul ignore next */
export const readPixelsAsync = async (x: number, y: number, w: number, h: number, format: any, type: any, dstBuffer: any) => {
  try {
    const { gl } = keepTrackApi.programs.drawManager;
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
};

export const canvasMouseMove = (evt: any, mainCamera: Camera, canvasDOM: any): any => {
  if (uiInput.mouseMoveTimeout === -1) {
    uiInput.mouseMoveTimeout = window.setTimeout(() => {
      canvasMouseMoveFire(mainCamera, evt, canvasDOM);
    }, 16);
  }
};
export const canvasMouseMoveFire = (mainCamera: Camera, evt: any, canvasDOM: any) => {
  mainCamera.mouseX = evt.clientX - (canvasDOM.position().left - window.scrollX);
  mainCamera.mouseY = evt.clientY - (canvasDOM.position().top - window.scrollY);
  if (mainCamera.isDragging && mainCamera.screenDragPoint[0] !== mainCamera.mouseX && mainCamera.screenDragPoint[1] !== mainCamera.mouseY) {
    dragHasMoved = true;
    mainCamera.camAngleSnappedOnSat = false;
    mainCamera.camZoomSnappedOnSat = false;
  }
  uiInput.isMouseMoving = true;

  // This is so you have to keep moving the mouse or the ui says it has stopped (why?)
  clearTimeout(mouseTimeout);
  mouseTimeout = window.setTimeout(function () {
    uiInput.isMouseMoving = false;
  }, 150);

  // This is to prevent mousemove being called between drawframes (who cares if it has moved at that point)
  window.clearTimeout(uiInput.mouseMoveTimeout);
  uiInput.mouseMoveTimeout = -1;
};

export const canvasTouchMove = (evt: any, mainCamera: Camera): any => {
  if (settingsManager.disableNormalEvents) {
    evt.preventDefault();
  }
  if (typeof evt.originalEvent == 'undefined') return;

  if (isPinching && typeof evt.originalEvent.touches[0] != 'undefined' && typeof evt.originalEvent.touches[1] != 'undefined') {
    const currentPinchDistance = Math.hypot(
      evt.originalEvent.touches[0].pageX - evt.originalEvent.touches[1].pageX,
      evt.originalEvent.touches[0].pageY - evt.originalEvent.touches[1].pageY
    );
    if (isNaN(currentPinchDistance)) return;

    deltaPinchDistance = (startPinchDistance - currentPinchDistance) / maxPinchSize;
    let zoomTarget = mainCamera.zoomTarget();
    zoomTarget += deltaPinchDistance * (settingsManager.cameraMovementSpeed * 20);
    zoomTarget = Math.min(Math.max(zoomTarget, 0.0001), 1); // Force between 0 and 1
    mainCamera.zoomTarget(zoomTarget);
  } else {
    // Dont Move While Zooming
    mainCamera.mouseX = evt.originalEvent.touches[0].clientX;
    mainCamera.mouseY = evt.originalEvent.touches[0].clientY;
    if (mainCamera.isDragging && mainCamera.screenDragPoint[0] !== mainCamera.mouseX && mainCamera.screenDragPoint[1] !== mainCamera.mouseY) {
      dragHasMoved = true;
      mainCamera.camAngleSnappedOnSat = false;
      mainCamera.camZoomSnappedOnSat = false;
    }
    uiInput.isMouseMoving = true;
    clearTimeout(mouseTimeout);
    mouseTimeout = window.setTimeout(function () {
      uiInput.isMouseMoving = false;
    }, 250);
  }
};

export const canvasTouchEnd = (mainCamera: Camera) => {
  const touchTime = Date.now() - touchStartTime;

  if (touchTime > 150 && !isPinching && Math.abs(mainCamera.startMouseX - mainCamera.mouseX) < 50 && Math.abs(mainCamera.startMouseY - mainCamera.mouseY) < 50) {
    uiInput.openRmbMenu();
    uiInput.mouseSat = -1;
  }

  if (isPinching) {
    // pinchEnd(e)
    isPinching = false;
  }
  mainCamera.mouseX = 0;
  mainCamera.mouseY = 0;
  dragHasMoved = false;
  mainCamera.isDragging = false;
  if (!settingsManager.disableUI) {
    mainCamera.autoRotate(false);
  }
};

// *********************************************************************************************************************
// Main Declration
// *********************************************************************************************************************
export const uiInput: UiInputInterface = {
  isMouseMoving: false,
  isStartedOnCanvas: false,
  mouseSat: -1,
  mouseMoveTimeout: -1,
  canvasMouseDown: canvasMouseDown,
  canvasClick: null,
  canvasTouchStart: canvasTouchStart,
  canvasMouseUp: canvasMouseUp,
  canvasMouseMove,
  canvasTouchMove,
  canvasTouchEnd,
  openRmbMenu: openRmbMenu,
  rmbMenuActions: null,
  canvasWheel: canvasWheel,
  init: init,
  unProject: unProject, // Convert Screen X,Y back to ECI
  getSatIdFromCoordAlt: getSatIdFromCoordAlt,
  clientWaitAsync: clientWaitAsync,
  getBufferSubDataAsync: getBufferSubDataAsync,
  readPixelsAsync: readPixelsAsync,
  isAsyncWorking: true,
  getSatIdFromCoord: getSatIdFromCoord,
  getEarthScreenPoint: getEarthScreenPoint, // Raycasting in getEarthScreenPoint would provide a lot of powerful (but slow) options later
};

export const earthClicked = ({
  isViewDOM,
  rightBtnViewDOM,
  numMenuItems,
  isCreateDOM,
  rightBtnCreateDOM,
  isDrawDOM,
  rightBtnDrawDOM,
  isEarthDOM,
  rightBtnEarthDOM,
  rightBtnSaveDOM,
}: {
  isViewDOM: boolean;
  rightBtnViewDOM: any;
  numMenuItems: number;
  isCreateDOM: boolean;
  rightBtnCreateDOM: any;
  isDrawDOM: boolean;
  rightBtnDrawDOM: any;
  isEarthDOM: boolean;
  rightBtnEarthDOM: any;
  rightBtnSaveDOM: any;
}) => {
  if (!isViewDOM) {
    rightBtnViewDOM.show();
    ++numMenuItems;
  }
  getEl('view-info-rmb').style.display = 'block';
  getEl('view-curdops-rmb').style.display = 'block';
  getEl('view-24dops-rmb').style.display = 'block';

  if (!isCreateDOM) {
    rightBtnCreateDOM.show();
    ++numMenuItems;
  }
  getEl('create-observer-rmb').style.display = 'block';
  getEl('create-sensor-rmb').style.display = 'block';

  if (!isDrawDOM) {
    rightBtnDrawDOM.show();
    ++numMenuItems;
  }
  getEl('line-eci-axis-rmb').style.display = 'block';

  if (!isEarthDOM) {
    rightBtnEarthDOM.show();
    ++numMenuItems;
  }

  getEl('earth-nasa-rmb').style.display = 'block';
  getEl('earth-blue-rmb').style.display = 'block';
  getEl('earth-low-rmb').style.display = 'block';
  getEl('earth-high-no-clouds-rmb').style.display = 'block';
  getEl('earth-vec-rmb').style.display = 'block';
  getEl('earth-political-rmb').style.display = 'block';
  if (settingsManager.nasaImages) getEl('earth-nasa-rmb').style.display = 'none';
  if (settingsManager.trusatImages) getEl('earth-trusat-rmb').style.display = 'none';
  if (settingsManager.blueImages) getEl('earth-blue-rmb').style.display = 'none';
  if (settingsManager.lowresImages) getEl('earth-low-rmb').style.display = 'none';
  if (settingsManager.hiresNoCloudsImages) getEl('earth-high-no-clouds-rmb').style.display = 'none';
  if (settingsManager.vectorImages) getEl('earth-vec-rmb').style.display = 'none';
  if (settingsManager.politicalImages) getEl('earth-political-rmb').style.display = 'none';

  rightBtnSaveDOM.hide();
  return numMenuItems;
};
