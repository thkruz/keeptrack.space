/* eslint-disable max-lines */
/* eslint-disable max-classes-per-file */

import { keepTrackApi } from '@app/keepTrackApi';
import { RADIUS_OF_EARTH } from '@app/lib/constants';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { Degrees, DetailedSatellite, eci2lla, Kilometers, Milliseconds, SpaceObjectType } from 'ootk';
import { isThisNode } from '../doris/utils/isThisNode';
import { getEl, hideEl, showEl } from '../lib/get-el';

import { Doris } from '@app/doris/doris';
import { CameraSystemEvents, CoreEngineEvents, InputEvents } from '@app/doris/events/event-types';
import { GetSatType, ToastMsgType } from '@app/interfaces';
import { CameraControllerType, KeepTrackMainCamera } from '@app/keeptrack/camera/legacy-camera';
import { KeepTrackApiEvents } from '@app/keeptrack/events/event-types';
import { closeColorbox } from '@app/lib/colorbox';
import { showLoading } from '@app/lib/showLoading';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SoundNames } from '@app/plugins/sounds/SoundNames';
import { TimeMachine } from '@app/plugins/time-machine/time-machine';
import { SatMath } from '@app/static/sat-math';
import { UrlManager } from '@app/static/url-manager';
import { MissileObject } from './catalog-manager/MissileObject';
import { lineManagerInstance } from './draw-manager/line-manager';
import { LineColors } from './draw-manager/line-manager/line';
import { errorManagerInstance } from './errorManager';
import { TouchInput } from './input-manager/touch-input';
import { PersistenceManager, StorageKey } from './persistence-manager';

export type LatLon = {
  lat: Degrees;
  lon: Degrees;
};

export type KeyEvent = {
  key: string;
  code?: string;
  callback: () => void;
};

export class InputManager {
  static readonly id = 'InputManager';

  private updateHoverDelay = 0;
  private updateHoverDelayLimit = 3;
  isRmbMenuOpen = false;

  touch: TouchInput = new TouchInput();
  isAsyncWorking = true;

  // MOUSE STUFF
  private dragHasMoved = false;
  private mouseTimeout = -1;

  canvasClick: (evt: MouseEvent) => void;
  clickedSat = 0;
  dragPosition = [<Kilometers>0, <Kilometers>0, <Kilometers>0];
  isMouseMoving = false;
  isStartedOnCanvas = false;
  latLon: LatLon;
  mouseMoveTimeout = -1;
  mouseSat = -1;
  touchSat: number;

  initialize(): void {
    const rmbWrapperDom = getEl('rmb-wrapper');

    if (rmbWrapperDom) {
      rmbWrapperDom.insertAdjacentHTML(
        'beforeend',
        keepTrackApi.html`
      <div id="right-btn-menu" class="right-btn-menu">
        <ul id="right-btn-menu-ul" class='dropdown-contents'>
          <li class="rmb-menu-item" id="view-rmb"><a href="#">View &#x27A4;</a></li>
          <li class="rmb-menu-item" id="draw-rmb"><a href="#">Draw &#x27A4;</a></li>
          <li class="rmb-menu-item" id="earth-rmb"><a href="#">Earth &#x27A4;</a></li>
        </ul>
      </div>
      `,
      );
      // Append any other menus before putting the reset/clear options
      Doris.getInstance().emit(KeepTrackApiEvents.rightBtnMenuAdd);

      // Now add the reset/clear options
      getEl('right-btn-menu-ul')!.insertAdjacentHTML(
        'beforeend',
        keepTrackApi.html`
        <li id="toggle-time-rmb"><a href="#">Pause Clock</a></li>
        <li id="reset-camera-rmb"><a href="#">Reset Camera</a></li>
        <li id="clear-lines-rmb"><a href="#">Clear Lines</a></li>
        <li id="clear-screen-rmb"><a href="#">Clear Screen</a></li>
        `,
      );

      getEl('rmb-wrapper')!.insertAdjacentHTML(
        'beforeend',
        keepTrackApi.html`
        <div id="view-rmb-menu" class="right-btn-menu">
          <ul class='dropdown-contents'>
            <li id="view-info-rmb"><a href="#">Earth Info</a></li>
            <li id="view-sensor-info-rmb"><a href="#">Sensor Info</a></li>
            <li id="view-sat-info-rmb"><a href="#">Satellite Info</a></li>
            <li id="view-related-sats-rmb"><a href="#">Related Satellites</a></li>
          </ul>
        </div>
        <div id="draw-rmb-menu" class="right-btn-menu">
          <ul class='dropdown-contents'>
            <li id="line-eci-axis-rmb"><a href="#">ECI Axes</a></li>
            <li id="line-eci-xgrid-rmb"><a href="#">X Axes Grid</a></li>
            <li id="line-eci-ygrid-rmb"><a href="#">Y Axes Grid</a></li>
            <li id="line-eci-zgrid-rmb"><a href="#">Z Axes Grid</a></li>
            <li id="line-earth-sat-rmb"><a href="#">Earth to Satellite</a></li>
            <li id="line-sensor-sat-rmb"><a href="#">Sensor to Satellite</a></li>
            <li id="line-sat-sat-rmb"><a href="#">Satellite to Satellite</a></li>
            <li id="line-sat-sun-rmb"><a href="#">Satellite to Sun</a></li>
          </ul>
        </div>
        <div id="earth-rmb-menu" class="right-btn-menu">
          <ul class='dropdown-contents'>
            <li id="earth-blue-rmb"><a href="#">Blue Map</a></li>
            <li id="earth-nasa-rmb"><a href="#">NASA Map</a></li>
            <li id="earth-brown-rmb"><a href="#">Brown Earth Map</a></li>
            <li id="earth-low-rmb"><a href="#">Low Resolution Map</a></li>
            <li id="earth-high-no-clouds-rmb"><a href="#">High Resoultion Map</a></li>
            <li id="earth-vec-rmb"><a href="#">Vector Image Map</a></li>
            <li id="earth-political-rmb"><a href="#">Political Map</a></li>
          </ul>
        </div>
      `,
      );

      keepTrackApi.rmbMenuItems.push({
        elementIdL1: 'view-rmb',
        elementIdL2: 'view-rmb-menu',
        order: 1,
        isRmbOnEarth: false,
        isRmbOffEarth: false,
        isRmbOnSat: true,
      });

      keepTrackApi.rmbMenuItems.push({
        elementIdL1: 'draw-rmb',
        elementIdL2: 'draw-rmb-menu',
        order: 5,
        isRmbOnEarth: true,
        isRmbOffEarth: true,
        isRmbOnSat: false,
      });

      keepTrackApi.rmbMenuItems.push({
        elementIdL1: 'earth-rmb',
        elementIdL2: 'earth-rmb-menu',
        order: 15,
        isRmbOnEarth: true,
        isRmbOffEarth: false,
        isRmbOnSat: false,
      });

      // sort getEl('rmb-wrapper').children by order in rmbMenuItems
      const rmbWrapper = getEl('right-btn-menu-ul');
      const rmbWrapperChildren = rmbWrapper!.children;
      const rmbWrapperChildrenArray = Array.from(rmbWrapperChildren);

      rmbWrapperChildrenArray.sort((a, b) => {
        const aOrder = keepTrackApi.rmbMenuItems.find((item) => item.elementIdL1 === a.id)?.order || 9999;
        const bOrder = keepTrackApi.rmbMenuItems.find((item) => item.elementIdL1 === b.id)?.order || 9999;


        return aOrder - bOrder;
      });
      rmbWrapper!.innerHTML = '';
      rmbWrapperChildrenArray.forEach((child) => rmbWrapper!.appendChild(child));
    }

    const canvasDOM = <HTMLCanvasElement>getEl('keeptrack-canvas');

    // Needed?
    if (settingsManager.disableWindowTouchMove) {
      window.addEventListener(
        'touchmove',
        (event) => {
          event.preventDefault();
        },
        { passive: false },
      );
    }

    if (settingsManager.disableNormalEvents || settingsManager.disableDefaultContextMenu) {
      window.oncontextmenu = (event) => {
        event.preventDefault();
        event.stopPropagation();

        return false;
      };
    }

    if (settingsManager.startWithFocus) {
      canvasDOM.tabIndex = 0;
      canvasDOM.focus();
    }

    if (settingsManager.isDisableAsyncReadPixels) {
      this.isAsyncWorking = false;
    }

    this.mouseInitialize_(canvasDOM);
    this.touch.init(canvasDOM);

    Doris.getInstance().on(CoreEngineEvents.Update, () => {
      // TODO: Reevaluate these conditions
      if (Doris.getInstance().getTimeManager().getFramesPerSecond() > 5 && !settingsManager.lowPerf && !settingsManager.isDragging && !settingsManager.isDemoModeOn) {
        this.update();
      }
    });
  }

  private mouseInitialize_(canvasDOM: HTMLCanvasElement) {
    const rightBtnMenuDOM = getEl('right-btn-menu');
    const satHoverBoxDOM = getEl('sat-hoverbox');
    const rightBtnDrawMenuDOM = getEl('draw-rmb-menu');
    const rightBtnEarthMenuDOM = getEl('earth-rmb-menu');
    const resetCameraDOM = getEl('reset-camera-rmb');
    const clearScreenDOM = getEl('clear-screen-rmb');
    const clearLinesDOM = getEl('clear-lines-rmb');
    const toggleTimeDOM = getEl('toggle-time-rmb');
    const rightBtnDrawDOM = getEl('draw-rmb');
    const rightBtnEarthDOM = getEl('earth-rmb');

    Doris.getInstance().on(InputEvents.MouseDown, (evt: MouseEvent) => {
      if (evt.target === canvasDOM) {
        Doris.getInstance().emit(KeepTrackApiEvents.canvasMouseDown, evt);
      }
    });
    Doris.getInstance().on(InputEvents.MouseUp, (evt: MouseEvent) => {
      if (evt.target === canvasDOM) {
        Doris.getInstance().emit(KeepTrackApiEvents.canvasMouseUp, evt);
      }
    });

    if (settingsManager.disableWindowScroll || settingsManager.disableNormalEvents) {
      /*
       * window.addEventListener(
       *   'scroll',
       *   function () {
       *     window.scrollTo(0, 0);
       *     return false;
       *   },
       *   { passive: false }
       * );
       */
    }

    this.mouseMoveTimeout = -1;
    canvasDOM.addEventListener('mousemove', (e) => {
      this.canvasMouseMove_(e, keepTrackApi.getMainCamera());
      settingsManager.lastInteractionTime = Date.now();
    });

    if (!settingsManager.disableUI) {
      this.canvasClick = (evt: MouseEvent) => {
        if (settingsManager.disableNormalEvents) {
          evt.preventDefault();
        }
        keepTrackApi.getInputManager().hidePopUps();
        closeColorbox();
      };

      if (!settingsManager.isMobileModeEnabled) {
        canvasDOM.addEventListener('click', (e: MouseEvent) => {
          this.canvasClick(e);
        });
        canvasDOM.addEventListener('mousedown', (e: MouseEvent) => {
          this.canvasMouseDown_(e);
        });
        canvasDOM.addEventListener('mouseup', (e: MouseEvent) => {
          this.canvasMouseUp_(e);
        });
      }

      const rightBtnDrawDOMDropdown = () => {
        InputManager.clearRMBSubMenu();
        InputManager.showDropdownSubMenu(rightBtnMenuDOM, rightBtnDrawMenuDOM, canvasDOM);
      };
      const rightBtnEarthDOMDropdown = () => {
        InputManager.clearRMBSubMenu();
        InputManager.showDropdownSubMenu(rightBtnMenuDOM, rightBtnEarthMenuDOM, canvasDOM);
      };

      // Create Event Listeners for Right Menu Buttons
      keepTrackApi.rmbMenuItems
        .map(({ elementIdL2 }) => getEl(elementIdL2))
        .concat([toggleTimeDOM, rightBtnDrawMenuDOM, rightBtnEarthMenuDOM, resetCameraDOM, clearScreenDOM, clearLinesDOM])
        .forEach((el) => {
          el?.addEventListener('click', (e: MouseEvent) => {
            // If the element is hiddeen ignore the click
            if (el.style.display === 'none') {
              return;
            }
            this.rmbMenuActions_(e);
          });
        });

      keepTrackApi.rmbMenuItems.forEach(({ elementIdL1, elementIdL2 }) => {
        const el1 = getEl(elementIdL1);
        const el2 = getEl(elementIdL2);

        el1?.addEventListener('mouseenter', () => {
          InputManager.clearRMBSubMenu();
          InputManager.showDropdownSubMenu(rightBtnMenuDOM, el2, canvasDOM, el1);
        });
        el2?.addEventListener('mouseleave', () => {
          el2.style.display = 'none';
        });
      });

      rightBtnDrawDOM?.addEventListener('mouseenter', () => {
        rightBtnDrawDOMDropdown();
      });
      rightBtnDrawDOM?.addEventListener('click', () => {
        rightBtnDrawDOMDropdown();
      });
      rightBtnDrawMenuDOM?.addEventListener('mouseleave', () => {
        rightBtnDrawMenuDOM.style.display = 'none';
      });

      rightBtnEarthDOM?.addEventListener('mouseenter', () => {
        rightBtnEarthDOMDropdown();
      });
      rightBtnEarthDOM?.addEventListener('click', () => {
        rightBtnEarthDOMDropdown();
      });
      rightBtnEarthMenuDOM?.addEventListener('mouseleave', () => {
        rightBtnEarthMenuDOM.style.display = 'none';
      });
    }

    if (!settingsManager.disableCameraControls) {
      // prettier-ignore
      window.addEventListener('mousedown', (evt) => {
        /*
         * Camera Manager Events
         * Middle Mouse Button MMB
         */
        if (evt.button === 1) {
          keepTrackApi.getMainCamera().localRotateStartPosition = keepTrackApi.getMainCamera().localRotateCurrent;
          keepTrackApi.getMainCamera().isLocalRotateRoll = false;
          keepTrackApi.getMainCamera().isLocalRotateYaw = true;
          evt.preventDefault();
        }
      });
    }

    if (!settingsManager.disableCameraControls) {
      window.addEventListener('mouseup', (evt: MouseEvent) => {
        // Camera Manager Events
        if (evt.button === 1) {
          keepTrackApi.getMainCamera().isLocalRotateRoll = false;
          keepTrackApi.getMainCamera().isLocalRotateYaw = false;
        }
        if (evt.button === 2) {
          keepTrackApi.getMainCamera().isScreenPan = false;
          keepTrackApi.getMainCamera().isWorldPan = false;
        }
      });
    }

    if (settingsManager.disableUI) {
      canvasDOM.addEventListener('wheel', () => {
        satHoverBoxDOM.style.display = 'none';
      });
    }

    getEl('nav-wrapper', true)?.addEventListener('click', () => {
      keepTrackApi.getInputManager().hidePopUps();
    });
    getEl('nav-footer', true)?.addEventListener('click', () => {
      keepTrackApi.getInputManager().hidePopUps();
    });
    getEl('ui-wrapper', true)?.addEventListener('click', () => {
      keepTrackApi.getInputManager().hidePopUps();
    });
  }

  /** readpixels used to determine which satellite is hovered is the biggest performance hit and we should throttle that */
  update() {
    /*
     * gl.readPixels in uiInput.getSatIdFromCoord creates a lot of jank
     * Earlier in the loop we decided how much to throttle updateHover
     * if we skip it this loop, we want to still draw the last thing
     * it was looking at
     */

    const tessaEngine = Doris.getInstance();

    if (tessaEngine.getTimeManager().getRealTimeDelta() > 30) {
      if (this.updateHoverDelayLimit > 0) {
        --this.updateHoverDelayLimit;
      }
    } else if (tessaEngine.getTimeManager().getRealTimeDelta() > 15) {
      this.updateHoverDelayLimit = settingsManager.updateHoverDelayLimitSmall;
    } else {
      this.updateHoverDelayLimit = settingsManager.updateHoverDelayLimitBig;
    }

    if (keepTrackApi.getMainCamera().isDragging) {
      return;
    }

    const mainCameraInstance = keepTrackApi.getMainCamera();

    if (settingsManager.isMobileModeEnabled) {
      // this.mouseSat = this.getSatIdFromCoord(mainCameraInstance.mouseX, mainCameraInstance.mouseY);
      return;
    }

    if (++this.updateHoverDelay >= this.updateHoverDelayLimit) {
      this.updateHoverDelay = 0;
      const uiManagerInstance = keepTrackApi.getUiManager();

      // If we are hovering over a satellite on a menu we don't want to change the mouseSat
      if (uiManagerInstance.searchHoverSatId >= 0) {
        this.mouseSat = uiManagerInstance.searchHoverSatId;
      } else if (!settingsManager.isMobileModeEnabled) {
        this.mouseSat = this.getSatIdFromCoord(mainCameraInstance.mouseX, mainCameraInstance.mouseY);
      }
    }
  }

  hidePopUps() {
    if (settingsManager.isPreventColorboxClose) {
      return;
    }
    hideEl('right-btn-menu');
    InputManager.clearRMBSubMenu();
    this.isRmbMenuOpen = false;
  }

  /**
   * Returns the ID of the satellite at the given screen coordinates.
   * @param x The x-coordinate of the screen position.
   * @param y The y-coordinate of the screen position.
   * @returns The ID of the satellite at the given screen coordinates.
   */
  getSatIdFromCoord(x: number, y: number): number {
    const renderer = keepTrackApi.getRenderer();
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    const { gl } = renderer;

    // NOTE: gl.readPixels is a huge bottleneck but readPixelsAsync doesn't work properly on mobile
    gl.bindFramebuffer(gl.FRAMEBUFFER, keepTrackApi.getDotsManager().gpuPickingFramebuffer);
    if (!isThisNode() && this.isAsyncWorking && !settingsManager.isDisableAsyncReadPixels) {
      this.readPixelsAsync_(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManagerInstance.pickReadPixelBuffer);
    }
    if (!this.isAsyncWorking) {
      gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManagerInstance.pickReadPixelBuffer);
    }
    // NOTE: const id = ((dotsManagerInstance.pickReadPixelBuffer[2] << 16) | (dotsManagerInstance.pickReadPixelBuffer[1] << 8) | dotsManagerInstance.pickReadPixelBuffer[0]) - 1;

    return ((dotsManagerInstance.pickReadPixelBuffer[2] << 16) | (dotsManagerInstance.pickReadPixelBuffer[1] << 8) | dotsManagerInstance.pickReadPixelBuffer[0]) - 1;
  }

  openRmbMenu(clickedSatId: number = -1) {
    if (!settingsManager.isAllowRightClick) {
      return;
    }

    this.isRmbMenuOpen = true;

    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    const canvasDOM = getEl('keeptrack-canvas');
    const rightBtnMenuDOM = getEl('right-btn-menu');
    const satHoverBoxDOM = getEl('sat-hoverbox');

    // Reset and Clear are always visible
    let numMenuItems = 2;

    keepTrackApi.rmbMenuItems.forEach((item) => {
      hideEl(item.elementIdL1);
    });

    hideEl('clear-lines-rmb');

    // View
    hideEl('view-info-rmb');
    hideEl('view-sensor-info-rmb');
    hideEl('view-sat-info-rmb');
    hideEl('view-related-sats-rmb');

    // Draw
    hideEl('line-eci-axis-rmb');
    hideEl('line-sensor-sat-rmb');
    hideEl('line-earth-sat-rmb');
    hideEl('line-sat-sat-rmb');
    hideEl('line-sat-sun-rmb');

    // Earth
    hideEl('earth-low-rmb');
    hideEl('earth-high-rmb');
    hideEl('earth-vec-rmb');
    hideEl('earth-political-rmb');

    if (lineManagerInstance.lines.length > 0) {
      getEl('clear-lines-rmb')!.style.display = 'block';
      numMenuItems++;
    }

    if (this.mouseSat !== -1 || clickedSatId !== -1) {
      if (typeof this.clickedSat === 'undefined') {
        return;
      }
      const sat = catalogManagerInstance.getObject(this.clickedSat);

      if (typeof sat === 'undefined' || sat === null) {
        return;
      }

      if (!sat.isStatic()) {
        showEl('view-sat-info-rmb');
        showEl('view-related-sats-rmb');

        if (sensorManagerInstance.isSensorSelected() && sensorManagerInstance.whichRadar !== 'CUSTOM') {
          getEl('line-sensor-sat-rmb')!.style.display = 'block';
        }

        if (!settingsManager.isMobileModeEnabled) {
          getEl('line-earth-sat-rmb')!.style.display = 'block';
        }
        if (!settingsManager.isMobileModeEnabled) {
          getEl('line-sat-sat-rmb')!.style.display = 'block';
        }
        if (!settingsManager.isMobileModeEnabled) {
          getEl('line-sat-sun-rmb')!.style.display = 'block';
        }
      } else {
        switch (sat.type) {
          case SpaceObjectType.PHASED_ARRAY_RADAR:
          case SpaceObjectType.OPTICAL:
          case SpaceObjectType.MECHANICAL:
          case SpaceObjectType.GROUND_SENSOR_STATION:
            getEl('view-sensor-info-rmb')!.style.display = 'block';
            break;
          default:
        }
      }
    } else {
      // Intentional
    }

    if (typeof this.latLon === 'undefined' || isNaN(this.latLon.lat) || isNaN(this.latLon.lon)) {
      // Not Earth
      keepTrackApi.rmbMenuItems
        .filter((item) => item.isRmbOffEarth || (item.isRmbOnSat && clickedSatId !== -1))
        .forEach((item) => {
          const dom = getEl(item.elementIdL1);

          if (dom) {
            dom.style.display = 'block';
            numMenuItems++;
          }
        });
    } else {
      // This is the Earth
      numMenuItems = InputManager.earthClicked({
        numMenuItems,
        clickedSatId,
      });
    }

    rightBtnMenuDOM!.style.display = 'block';
    satHoverBoxDOM!.style.display = 'none';

    /*
     * Offset size is based on size in style.css
     * TODO: Make this dynamic
     */
    const mainCameraInstance = keepTrackApi.getMainCamera();
    const offsetX = mainCameraInstance.mouseX < canvasDOM!.clientWidth / 2 ? 0 : -1 * 165;
    const offsetY = mainCameraInstance.mouseY < canvasDOM!.clientHeight / 2 ? 0 : numMenuItems * -25;

    rightBtnMenuDOM!.style.display = 'block';
    rightBtnMenuDOM!.style.textAlign = 'center';
    rightBtnMenuDOM!.style.position = 'absolute';
    rightBtnMenuDOM!.style.left = `${mainCameraInstance.mouseX + offsetX}px`;
    rightBtnMenuDOM!.style.top = `${mainCameraInstance.mouseY + offsetY}px`;
  }

  private canvasMouseDown_(evt: MouseEvent) {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    const timeManagerInstance = keepTrackApi.getTimeManager();

    this.isStartedOnCanvas = true;

    if (evt.button === 2) {
      this.dragPosition = InputManager.getEarthScreenPoint(keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY);

      const gmst = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj).gmst;

      this.latLon = eci2lla({ x: this.dragPosition[0], y: this.dragPosition[1], z: this.dragPosition[2] }, gmst);
    }

    if (evt.button === 0) {
      if (settingsManager.isFreezePropRateOnDrag) {
        timeManagerInstance.calculateSimulationTime();
        timeManagerInstance.lastPropRate = Doris.getInstance().getTimeManager().getTimeScale();
        timeManagerInstance.changePropRate(0);
      }
    }

    keepTrackApi.getInputManager().hidePopUps();

    UrlManager.updateURL();
  }

  private canvasMouseUp_(evt: MouseEvent) {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }
    const timeManagerInstance = keepTrackApi.getTimeManager();

    if (!this.isStartedOnCanvas) {
      return;
    }
    this.isStartedOnCanvas = false;

    if (!this.dragHasMoved) {
      /*
       * if (settingsManager.isMobileModeEnabled) {
       *   keepTrackApi.getMainCamera().mouseX = isNaN(keepTrackApi.getMainCamera().mouseX) ? 0 : keepTrackApi.getMainCamera().mouseX;
       *   keepTrackApi.getMainCamera().mouseY = isNaN(keepTrackApi.getMainCamera().mouseY) ? 0 : keepTrackApi.getMainCamera().mouseY;
       *   this.mouseSat = keepTrackApi.getInputManager().getSatIdFromCoord(keepTrackApi.getMainCamera().mouseX, keepTrackApi.getMainCamera().mouseY);
       * }
       */
      this.clickedSat = this.mouseSat;
      if (evt.button === 0) {
        const catalogManagerInstance = keepTrackApi.getCatalogManager();

        // Left Mouse Button Clicked
        if (keepTrackApi.getMainCamera().activeCameraType === CameraControllerType.SATELLITE_FIRST_PERSON) {
          if (this.clickedSat !== -1 && !catalogManagerInstance.getObject(this.clickedSat, GetSatType.EXTRA_ONLY).isStatic()) {
            keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
          }
        } else {
          keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
        }
      }
      if (evt.button === 2) {
        // Right Mouse Button Clicked
        keepTrackApi.getInputManager().openRmbMenu(this.clickedSat);
      }
    }
    // Force the search bar to get repainted because it gets overwrote a lot
    this.dragHasMoved = false;
    keepTrackApi.getMainCamera().isDragging = false;

    if (settingsManager.isFreezePropRateOnDrag) {
      timeManagerInstance.calculateSimulationTime();
      timeManagerInstance.changePropRate(timeManagerInstance.lastPropRate);
    }
  }

  private canvasMouseMove_(evt: MouseEvent, mainCameraInstance: KeepTrackMainCamera): void {
    if (this.mouseMoveTimeout === -1) {
      this.mouseMoveTimeout = window.setTimeout(() => {
        this.canvasMouseMoveFire_(mainCameraInstance, evt);
      }, 16);
    }
  }

  private canvasMouseMoveFire_(mainCameraInstance: KeepTrackMainCamera, evt: MouseEvent) {
    mainCameraInstance.mouseX = evt.clientX - (keepTrackApi.containerRoot.scrollLeft - window.scrollX) - keepTrackApi.containerRoot.offsetLeft;
    mainCameraInstance.mouseY = evt.clientY - (keepTrackApi.containerRoot.scrollTop - window.scrollY) - keepTrackApi.containerRoot.offsetTop;
    if (
      mainCameraInstance.isDragging &&
      mainCameraInstance.screenDragPoint[0] !== mainCameraInstance.mouseX &&
      mainCameraInstance.screenDragPoint[1] !== mainCameraInstance.mouseY
    ) {
      this.dragHasMoved = true;
      mainCameraInstance.camAngleSnappedOnSat = false;
    }
    this.isMouseMoving = true;

    // This is so you have to keep moving the mouse or the ui says it has stopped (why?)
    clearTimeout(this.mouseTimeout);
    this.mouseTimeout = window.setTimeout(() => {
      this.isMouseMoving = false;
    }, 150);

    // This is to prevent mousemove being called between drawframes (who cares if it has moved at that point)
    window.clearTimeout(this.mouseMoveTimeout);
    this.mouseMoveTimeout = -1;
  }

  private rmbMenuActions_(e: MouseEvent) {
    // No Right Click Without UI
    if (settingsManager.disableUI) {
      return;
    }

    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const uiManagerInstance = keepTrackApi.getUiManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    const target = <HTMLElement>e.target;
    let targetId = target.id;

    if (target.tagName === 'A') {
      targetId = (<HTMLElement>target.parentNode).id;
    }
    if (target.tagName === 'UL') {
      targetId = (<HTMLElement>target.firstChild).id;
    }

    let clickSatObj: DetailedSatellite | MissileObject | null = null;

    if (this.clickedSat !== -1) {
      const obj = catalogManagerInstance.getObject(this.mouseSat);

      if ((obj instanceof DetailedSatellite) || (obj instanceof MissileObject)) {
        clickSatObj = obj;
      }
    }

    switch (targetId) {
      case 'view-info-rmb':
        if (typeof this.latLon === 'undefined' || isNaN(this.latLon.lat) || isNaN(this.latLon.lon)) {
          errorManagerInstance.debug('latLon undefined!');
          const gmst = SatMath.calculateTimeVariables(timeManagerInstance.simulationTimeObj).gmst;

          this.latLon = eci2lla({ x: this.dragPosition[0], y: this.dragPosition[1], z: this.dragPosition[2] }, gmst);
        }
        uiManagerInstance.toast(`Lat: ${this.latLon.lat.toFixed(3)}<br>Lon: ${this.latLon.lon.toFixed(3)}`, ToastMsgType.normal, true);
        break;
      case 'view-sat-info-rmb':
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
        break;
      case 'view-sensor-info-rmb':
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(this.clickedSat);
        getEl('menu-sensor-info').click();
        break;
      case 'view-related-sats-rmb':
        {
          const intldes = catalogManagerInstance.getSat(this.clickedSat, GetSatType.EXTRA_ONLY)?.intlDes;

          if (!intldes) {
            uiManagerInstance.toast('Time 1 is Invalid!', ToastMsgType.serious);
          }
          const searchStr = intldes.slice(0, 8);

          uiManagerInstance.doSearch(searchStr);
        }
        break;
      case 'set-sec-sat-rmb':
        keepTrackApi.getPlugin(SelectSatManager)?.setSecondarySat(this.clickedSat);
        break;
      case 'reset-camera-rmb':
        Doris.getInstance().emit(CameraSystemEvents.Reset);
        break;
      case 'clear-lines-rmb':
        lineManagerInstance.clear();
        break;
      case 'line-eci-axis-rmb':
        lineManagerInstance.createRef2Ref([0, 0, 0], [25000, 0, 0], LineColors.RED);
        lineManagerInstance.createRef2Ref([0, 0, 0], [0, 25000, 0], LineColors.GREEN);
        lineManagerInstance.createRef2Ref([0, 0, 0], [0, 0, 25000], LineColors.BLUE);
        break;
      case 'line-eci-xgrid-rmb':
        lineManagerInstance.createGrid('x', [0.6, 0.2, 0.2, 1], 1);
        break;
      case 'line-eci-ygrid-rmb':
        lineManagerInstance.createGrid('y', [0.2, 0.6, 0.2, 1], 1);
        break;
      case 'line-eci-zgrid-rmb':
        lineManagerInstance.createGrid('z', [0.2, 0.2, 0.6, 1], 1);
        break;
      case 'line-earth-sat-rmb':
        lineManagerInstance.createSatToRef(keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj, [0, 0, 0], LineColors.PURPLE);
        break;
      case 'line-sensor-sat-rmb':
        lineManagerInstance.createSensorToSat(keepTrackApi.getSensorManager().getSensor(), clickSatObj, LineColors.GREEN);
        break;
      case 'line-sat-sat-rmb':
        lineManagerInstance.createObjToObj(clickSatObj, keepTrackApi.getPlugin(SelectSatManager)?.primarySatObj, LineColors.BLUE);
        break;
      case 'line-sat-sun-rmb':
        lineManagerInstance.createSat2Sun(clickSatObj);
        break;
      case 'earth-blue-rmb':
        this.resetCurrentEarthTexture_();
        settingsManager.blueImages = true;
        this.saveMapToLocalStorage_('blue');
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'earth-nasa-rmb':
        this.resetCurrentEarthTexture_();
        settingsManager.nasaImages = true;
        this.saveMapToLocalStorage_('nasa');
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'earth-brown-rmb':
        this.resetCurrentEarthTexture_();
        settingsManager.brownEarthImages = true;
        this.saveMapToLocalStorage_('brown');
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'earth-low-rmb':
        this.resetCurrentEarthTexture_();
        settingsManager.lowresImages = true;
        this.saveMapToLocalStorage_('low');
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'earth-high-rmb':
        showLoading(() => {
          this.resetCurrentEarthTexture_();
          settingsManager.hiresImages = true;
          this.saveMapToLocalStorage_('high');
          keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        });
        break;
      case 'earth-high-no-clouds-rmb':
        showLoading(() => {
          this.resetCurrentEarthTexture_();
          settingsManager.hiresNoCloudsImages = true;
          this.saveMapToLocalStorage_('high-nc');
          keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        });
        break;
      case 'earth-vec-rmb':
        this.resetCurrentEarthTexture_();
        settingsManager.vectorImages = true;
        this.saveMapToLocalStorage_('vec');
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'earth-political-rmb':
        this.resetCurrentEarthTexture_();
        settingsManager.politicalImages = true;
        this.saveMapToLocalStorage_('political'); // TODO: Verify this
        keepTrackApi.getScene().earth.reloadEarthHiResTextures();
        break;
      case 'toggle-time-rmb':
        timeManagerInstance.toggleTime();
        break;
      case 'clear-screen-rmb':
        if (keepTrackApi.getPlugin(TimeMachine)) {
          keepTrackApi.getPlugin(TimeMachine).isTimeMachineRunning = false;
        }
        uiManagerInstance.doSearch('');
        uiManagerInstance.searchManager.closeSearch();
        uiManagerInstance.hideSideMenus();

        // Revert any group color scheme back to a non group scheme
        colorSchemeManagerInstance.isUseGroupColorScheme = false;

        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(-1);
        break;
      default:
        Doris.getInstance().emit(KeepTrackApiEvents.rmbMenuActions, targetId, this.clickedSat);
        break;
    }
    keepTrackApi.getSoundManager().play(SoundNames.CLICK);

    getEl('right-btn-menu')!.style.display = 'none';
    InputManager.clearRMBSubMenu();
  }

  private resetCurrentEarthTexture_() {
    settingsManager.blueImages = false;
    settingsManager.nasaImages = false;
    settingsManager.brownEarthImages = false;
    settingsManager.lowresImages = false;
    settingsManager.hiresImages = false;
    settingsManager.hiresNoCloudsImages = false;
    settingsManager.vectorImages = false;
    settingsManager.politicalImages = false;
  }

  private saveMapToLocalStorage_(name: string) {
    PersistenceManager.getInstance().saveItem(StorageKey.LAST_MAP, name);
  }

  static earthClicked({ numMenuItems, clickedSatId }: { numMenuItems: number; clickedSatId: number }): number {
    getEl('line-eci-axis-rmb')!.style.display = 'block';
    keepTrackApi.rmbMenuItems
      .filter((item) => item.isRmbOnEarth || (item.isRmbOnSat && clickedSatId !== -1))
      .sort((a, b) => a.order - b.order)
      .forEach((item) => {
        const dom = getEl(item.elementIdL1);

        if (dom) {
          dom.style.display = 'block';
          ++numMenuItems;
        }
      });

    getEl('earth-nasa-rmb')!.style.display = 'block';
    getEl('earth-blue-rmb')!.style.display = 'block';
    getEl('earth-low-rmb')!.style.display = 'block';
    getEl('earth-high-no-clouds-rmb')!.style.display = 'block';
    getEl('earth-vec-rmb')!.style.display = 'block';
    getEl('earth-political-rmb')!.style.display = 'block';
    if (settingsManager.nasaImages) {
      getEl('earth-nasa-rmb')!.style.display = 'none';
    }
    if (settingsManager.brownEarthImages) {
      getEl('earth-brown-rmb')!.style.display = 'none';
    }
    if (settingsManager.blueImages) {
      getEl('earth-blue-rmb')!.style.display = 'none';
    }
    if (settingsManager.lowresImages) {
      getEl('earth-low-rmb')!.style.display = 'none';
    }
    if (settingsManager.hiresNoCloudsImages) {
      getEl('earth-high-no-clouds-rmb')!.style.display = 'none';
    }
    if (settingsManager.vectorImages) {
      getEl('earth-vec-rmb')!.style.display = 'none';
    }
    if (settingsManager.politicalImages) {
      getEl('earth-political-rmb')!.style.display = 'none';
    }

    return numMenuItems;
  }

  /* istanbul ignore next */
  private async readPixelsAsync_(x: number, y: number, w: number, h: number, format: number, type: number, dstBuffer: Uint8Array) {
    const gl = keepTrackApi.getRenderer().gl;

    try {
      const buf = gl.createBuffer();

      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, dstBuffer.byteLength, gl.STREAM_READ);
      gl.readPixels(x, y, w, h, format, type, 0);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

      await InputManager.getBufferSubDataAsync(gl, gl.PIXEL_PACK_BUFFER, buf, 0, dstBuffer);

      gl.deleteBuffer(buf);
      this.isAsyncWorking = true;
    } catch (error) {
      this.isAsyncWorking = false;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    }
  }

  /*
   * *********************************************************************************************************************
   * WebGL Functions that we can't unit test for yet
   * *********************************************************************************************************************
   */
  /* istanbul ignore next */
  static clientWaitAsync(gl: WebGL2RenderingContext, sync: WebGLSync, flags: number, intervalMs: Milliseconds): Promise<string> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-sync
      const res = gl.clientWaitSync(sync, flags, 0);

      if (res === gl.WAIT_FAILED) {
        reject(new Error('Async Rejected!'));

        return;
      }
      if (res === gl.TIMEOUT_EXPIRED) {
        setTimeout(() => {
          InputManager.clientWaitAsync(gl, sync, flags, intervalMs).then(resolve).catch(reject);
        }, intervalMs);

        return;
      }
      resolve('Async Resolved!');
    });
  }

  /* istanbul ignore next */
  static async getBufferSubDataAsync(
    gl: WebGL2RenderingContext,
    target: number,
    buffer: WebGLBuffer,
    srcByteOffset: number,
    dstBuffer: Uint8Array,
    dstOffset?: number,
    length?: number,
  ) {
    // eslint-disable-next-line no-sync
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

    if (!sync) {
      throw new Error('Failed to create sync object');
    }

    gl.flush();

    await InputManager.clientWaitAsync(gl, sync, 0, <Milliseconds>10);
    // eslint-disable-next-line no-sync
    gl.deleteSync(sync);

    gl.bindBuffer(target, buffer);

    if (dstOffset && length) {
      gl.getBufferSubData(target, srcByteOffset, dstBuffer, dstOffset, length);
    } else if (dstOffset) {
      gl.getBufferSubData(target, srcByteOffset, dstBuffer, dstOffset);
    } else {
      gl.getBufferSubData(target, srcByteOffset, dstBuffer);
    }

    gl.bindBuffer(target, null);

    return dstBuffer;
  }

  static getEarthScreenPoint(x: number, y: number): Kilometers[] {
    if (typeof x === 'undefined' || typeof y === 'undefined') {
      throw new Error('x and y must be defined');
    }
    if (isNaN(x) || isNaN(y)) {
      throw new Error('x and y must be numbers');
    }

    // Where is the camera
    const rayOrigin = keepTrackApi.getMainCamera().getForwardVector();
    // What did we click on
    const ptThru = InputManager.unProject(x, y);

    // Clicked on minus starting point is our direction vector
    const rayDir = vec3.create();

    vec3.subtract(rayDir, ptThru, rayOrigin); // rayDir = ptThru - rayOrigin
    vec3.normalize(rayDir, rayDir);

    const toCenterVec = vec3.create();

    vec3.scale(toCenterVec, rayOrigin, -1); // toCenter is just -camera pos because center is at [0,0,0]
    const dParallel = vec3.dot(rayDir, toCenterVec);

    const longDir = vec3.create();

    vec3.scale(longDir, rayDir, dParallel); // longDir = rayDir * distParallel
    vec3.add(ptThru, rayOrigin, longDir); // ptThru is now on the plane going through the center of sphere
    const dPerp = vec3.len(ptThru);

    const dSubSurf = Math.sqrt(RADIUS_OF_EARTH * RADIUS_OF_EARTH - dPerp * dPerp);
    const dSurf = dParallel - dSubSurf;

    const ptSurf = vec3.create();

    vec3.scale(ptSurf, rayDir, dSurf);
    vec3.add(ptSurf, ptSurf, rayOrigin);

    return <Kilometers[]>(<unknown>ptSurf);
  }

  static getSatIdFromCoordAlt(x: number, y: number): number | null {
    const eci = InputManager.unProject(x, y);
    const eciArray = {
      x: eci[0],
      y: eci[1],
      z: eci[2],
    };

    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const dotsManagerInstance = keepTrackApi.getDotsManager();


    return dotsManagerInstance.getIdFromEci(eciArray, catalogManagerInstance.orbitalSats);
  }

  static clearRMBSubMenu = () => {
    keepTrackApi.rmbMenuItems.forEach((item) => {
      hideEl(item.elementIdL2);
    });
    hideEl('colors-rmb-menu');
  };

  static showDropdownSubMenu(rightBtnMenuDOM: HTMLElement, rightBtnDOM: HTMLElement, canvasDOM: HTMLCanvasElement, element1?: HTMLElement) {
    const offsetX = rightBtnMenuDOM.offsetLeft < canvasDOM.clientWidth / 2 ? 160 : -160;

    rightBtnDOM.style.display = 'block';
    rightBtnDOM.style.textAlign = 'center';
    rightBtnDOM.style.position = 'absolute';
    rightBtnDOM.style.left = `${rightBtnMenuDOM.offsetLeft + offsetX}px`;
    rightBtnDOM.style.top = element1 ? `${rightBtnMenuDOM.offsetTop + element1.offsetTop}px` : `${rightBtnMenuDOM.offsetTop}px`;
    if (rightBtnDOM.offsetTop !== 0) {
      rightBtnDOM.style.display = 'block';
    } else {
      rightBtnDOM.style.display = 'none';
    }
  }

  static unProject(x: number, y: number): [number, number, number] {
    const renderer = keepTrackApi.getRenderer();
    const { gl } = renderer;

    const glScreenX = (x / gl.drawingBufferWidth) * 2 - 1.0;
    const glScreenY = 1.0 - (y / gl.drawingBufferHeight) * 2;
    const screenVec = <vec4>[glScreenX, glScreenY, -0.01, 1.0]; // gl screen coords
    const comboPMat = mat4.create();

    mat4.mul(comboPMat, keepTrackApi.getMainCamera().getProjectionMatrix(), keepTrackApi.getMainCamera().getViewMatrix());
    const invMat = mat4.create();

    mat4.invert(invMat, comboPMat);
    const worldVec = <[number, number, number, number]>(<unknown>vec4.create());

    vec4.transformMat4(worldVec, screenVec, invMat);

    return [worldVec[0] / worldVec[3], worldVec[1] / worldVec[3], worldVec[2] / worldVec[3]];
  }
}
