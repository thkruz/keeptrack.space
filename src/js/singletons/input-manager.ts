/* eslint-disable max-classes-per-file */
import { CatalogManager, SensorManager, Singletons, UiManager } from '@app/js/interfaces';
import { isThisNode, keepTrackApi } from '@app/js/keepTrackApi';
import { RADIUS_OF_EARTH } from '@app/js/lib/constants';
import { SpaceObjectType } from '@app/js/lib/space-object-type';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { Degrees, Kilometers, Milliseconds } from 'ootk';
import { keepTrackContainer } from '../container';
import { KeepTrack } from '../keeptrack';
import { getEl } from '../lib/get-el';

import { DotsManager } from './dots-manager';
import { DrawManager } from './draw-manager';
import { lineManagerInstance } from './draw-manager/line-manager';
import { KeyboardInput } from './input-manager/keyboard-input';
import { MouseInput } from './input-manager/mouse-input';

export type LatLon = {
  lat: Degrees;
  lon: Degrees;
};

export type KeyEvent = {
  key: string;
  callback: () => void;
};

export class InputManager {
  private updateHoverDelay = 0;
  private updateHoverDelayLimit = 3;
  isRmbMenuOpen = false;

  public Keyboard: KeyboardInput;
  public Mouse: MouseInput;
  public isAsyncWorking = true;

  constructor() {
    this.Keyboard = new KeyboardInput();
    this.Mouse = new MouseInput(this.Keyboard);
  }

  // *********************************************************************************************************************
  // WebGL Functions that we can't unit test for yet
  // *********************************************************************************************************************
  /* istanbul ignore next */
  public static clientWaitAsync(gl: WebGL2RenderingContext, sync: WebGLSync, flags: number, intervalMs: Milliseconds): Promise<string> {
    return new Promise((resolve, reject) => {
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
  }

  /* istanbul ignore next */
  public static async getBufferSubDataAsync(
    gl: WebGL2RenderingContext,
    target: number,
    buffer: WebGLBuffer,
    srcByteOffset: number,
    dstBuffer: Uint8Array,
    dstOffset?: number,
    length?: number
  ) {
    // eslint-disable-next-line no-sync
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();

    await InputManager.clientWaitAsync(gl, sync, 0, <Milliseconds>10);
    // eslint-disable-next-line no-sync
    gl.deleteSync(sync);

    gl.bindBuffer(target, buffer);
    gl.getBufferSubData(target, srcByteOffset, dstBuffer, dstOffset, length);
    gl.bindBuffer(target, null);

    return dstBuffer;
  }

  public static getEarthScreenPoint(x: number, y: number): Kilometers[] {
    if (typeof x === 'undefined' || typeof y === 'undefined') throw new Error('x and y must be defined');
    if (isNaN(x) || isNaN(y)) throw new Error('x and y must be numbers');

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

  public static getSatIdFromCoordAlt(x: number, y: number): number {
    const eci = InputManager.unProject(x, y);
    const eciArray = {
      x: eci[0],
      y: eci[1],
      z: eci[2],
    };

    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
    return dotsManagerInstance.getIdFromEci(eciArray, catalogManagerInstance.orbitalSats);
  }

  hidePopUps() {
    if (settingsManager.isPreventColorboxClose) return;
    const rightBtnMenuDOM = getEl('right-btn-menu');
    rightBtnMenuDOM.style.display = 'none';
    InputManager.clearRMBSubMenu();
    this.isRmbMenuOpen = false;
  }

  static clearRMBSubMenu = () => {
    keepTrackApi.rmbMenuItems.forEach((item) => {
      getEl(item.elementIdL2).style.display = 'none';
    });
    getEl('view-rmb-menu').style.display = 'none';
    getEl('create-rmb-menu').style.display = 'none';
    const colorsDom = getEl('colors-rmb-menu');
    if (colorsDom) colorsDom.style.display = 'none';
    getEl('draw-rmb-menu').style.display = 'none';
    getEl('earth-rmb-menu').style.display = 'none';
  };

  static showDropdownSubMenu(rightBtnMenuDOM: HTMLElement, rightBtnDOM: HTMLElement, canvasDOM: HTMLCanvasElement, element1?: HTMLElement) {
    const offsetX = rightBtnMenuDOM.offsetLeft < canvasDOM.clientWidth / 2 ? 160 : -160;
    rightBtnDOM.style.display = 'block';
    rightBtnDOM.style.textAlign = 'center';
    rightBtnDOM.style.position = 'absolute';
    rightBtnDOM.style.left = rightBtnMenuDOM.offsetLeft + offsetX + 'px';
    rightBtnDOM.style.top = element1 ? rightBtnMenuDOM.offsetTop + element1.offsetTop + 'px' : rightBtnMenuDOM.offsetTop + 'px';
    if (rightBtnDOM.offsetTop !== 0) {
      rightBtnDOM.style.display = 'block';
    } else {
      rightBtnDOM.style.display = 'none';
    }
  }

  public static unProject(x: number, y: number): [number, number, number] {
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    const { gl } = drawManagerInstance;

    const glScreenX = (x / gl.drawingBufferWidth) * 2 - 1.0;
    const glScreenY = 1.0 - (y / gl.drawingBufferHeight) * 2;
    const screenVec = <vec4>[glScreenX, glScreenY, -0.01, 1.0]; // gl screen coords

    const comboPMat = mat4.create();
    mat4.mul(comboPMat, drawManagerInstance.pMatrix, keepTrackApi.getMainCamera().camMatrix);
    const invMat = mat4.create();
    mat4.invert(invMat, comboPMat);
    const worldVec = <[number, number, number, number]>(<unknown>vec4.create());
    vec4.transformMat4(worldVec, screenVec, invMat);

    return [worldVec[0] / worldVec[3], worldVec[1] / worldVec[3], worldVec[2] / worldVec[3]];
  }

  /**
   * Returns the ID of the satellite at the given screen coordinates.
   * @param x The x-coordinate of the screen position.
   * @param y The y-coordinate of the screen position.
   * @returns The ID of the satellite at the given screen coordinates.
   */
  public getSatIdFromCoord(x: number, y: number): number {
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    const dotsManagerInstance = keepTrackContainer.get<DotsManager>(Singletons.DotsManager);
    const { gl } = drawManagerInstance;

    // NOTE: gl.readPixels is a huge bottleneck
    gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManagerInstance.pickingFrameBuffer);
    if (!isThisNode() && this.isAsyncWorking) {
      this.readPixelsAsync(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManagerInstance.pickReadPixelBuffer);
    }
    if (!this.isAsyncWorking) {
      gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManagerInstance.pickReadPixelBuffer);
    }
    // NOTE: const id = ((dotsManagerInstance.pickReadPixelBuffer[2] << 16) | (dotsManagerInstance.pickReadPixelBuffer[1] << 8) | dotsManagerInstance.pickReadPixelBuffer[0]) - 1;
    return ((dotsManagerInstance.pickReadPixelBuffer[2] << 16) | (dotsManagerInstance.pickReadPixelBuffer[1] << 8) | dotsManagerInstance.pickReadPixelBuffer[0]) - 1;
  }

  public init(): void {
    getEl('rmb-wrapper').insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
      <div id="right-btn-menu" class="right-btn-menu">
        <ul id="right-btn-menu-ul" class='dropdown-contents'>
          <li class="rmb-menu-item" id="view-rmb"><a href="#">View &#x27A4;</a></li>
          <li class="rmb-menu-item" id="draw-rmb"><a href="#">Draw &#x27A4;</a></li>
          <li class="rmb-menu-item" id="create-rmb"><a href="#">Create &#x27A4;</a></li>
          <li class="rmb-menu-item" id="earth-rmb"><a href="#">Earth &#x27A4;</a></li>
        </ul>
      </div>
      `
    );

    // Append any other menus before putting the reset/clear options
    keepTrackApi.methods.rightBtnMenuAdd();

    // Now add the reset/clear options
    getEl('right-btn-menu-ul').insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
      <li id="reset-camera-rmb"><a href="#">Reset Camera</a></li>
      <li id="clear-lines-rmb"><a href="#">Clear Lines</a></li>
      <li id="clear-screen-rmb"><a href="#">Clear Screen</a></li>
      `
    );

    getEl('rmb-wrapper').insertAdjacentHTML(
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
    `
    );

    const canvasDOM = <HTMLCanvasElement>getEl('keeptrack-canvas');

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

    if (settingsManager.startWithFocus) {
      canvasDOM.tabIndex = 0;
      canvasDOM.focus();
    }

    this.Mouse.init(canvasDOM);
    this.Keyboard.init();
  }

  public openRmbMenu(clickedSatId: number = -1) {
    if (!settingsManager.isAllowRightClick) return;

    this.isRmbMenuOpen = true;

    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const sensorManagerInstance = keepTrackContainer.get<SensorManager>(Singletons.SensorManager);

    const canvasDOM = getEl('keeptrack-canvas');
    const rightBtnMenuDOM = getEl('right-btn-menu');
    const rightBtnViewDOM = getEl('view-rmb');
    const rightBtnCreateDOM = getEl('create-rmb');
    const rightBtnDrawDOM = getEl('draw-rmb');
    const rightBtnEarthDOM = getEl('earth-rmb');
    const satHoverBoxDOM = getEl('sat-hoverbox');

    // Reset and Clear are always visible
    let numMenuItems = 2;

    keepTrackApi.rmbMenuItems.forEach((item) => {
      getEl(item.elementIdL1).style.display = 'none';
    });

    getEl('clear-lines-rmb').style.display = 'none';

    // View
    getEl('view-info-rmb').style.display = 'none';
    getEl('view-sensor-info-rmb').style.display = 'none';
    getEl('view-sat-info-rmb').style.display = 'none';
    getEl('view-related-sats-rmb').style.display = 'none';

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
    const earthLowRmb = getEl('earth-low-rmb');
    if (earthLowRmb) earthLowRmb.style.display = 'none';
    const earthHighRmb = getEl('earth-high-rmb');
    if (earthHighRmb) earthHighRmb.style.display = 'none';
    const earthVecRmb = getEl('earth-vec-rmb');
    if (earthVecRmb) earthVecRmb.style.display = 'none';
    const earthPoliticalRmb = getEl('earth-political-rmb');
    if (earthPoliticalRmb) earthPoliticalRmb.style.display = 'none';

    // Reset Camera
    // getEl('reset-camera-rmb').style.display = 'none';
    // Colors Always Present
    let isViewDOM = false;
    const isCreateDOM = false;
    let isDrawDOM = false;
    const isEarthDOM = false;

    rightBtnViewDOM.style.display = 'none';
    rightBtnCreateDOM.style.display = 'none';
    rightBtnDrawDOM.style.display = 'none';
    rightBtnEarthDOM.style.display = 'none';

    if (lineManagerInstance.getLineListLen() > 0) {
      getEl('clear-lines-rmb').style.display = 'block';
      numMenuItems++;
    }

    if (this.Mouse.mouseSat !== -1 || clickedSatId !== -1) {
      if (typeof this.Mouse.clickedSat == 'undefined') return;
      const sat = catalogManagerInstance.getSat(this.Mouse.clickedSat);
      if (typeof sat == 'undefined' || sat == null) return;
      if (typeof sat.type == 'undefined' || sat.type !== SpaceObjectType.STAR) {
        rightBtnViewDOM.style.display = 'block';
        isViewDOM = true;
        numMenuItems++;
      }

      if (!sat.static) {
        getEl('view-sat-info-rmb').style.display = 'block';
        getEl('view-related-sats-rmb').style.display = 'block';

        if (catalogManagerInstance.isSensorManagerLoaded && sensorManagerInstance.currentSensors[0].lat != null && sensorManagerInstance.whichRadar !== 'CUSTOM') {
          getEl('line-sensor-sat-rmb').style.display = 'block';
        }
        getEl('line-earth-sat-rmb').style.display = 'block';
        getEl('line-sat-sat-rmb').style.display = 'block';
        getEl('line-sat-sun-rmb').style.display = 'block';
        rightBtnDrawDOM.style.display = 'block';
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

    if (typeof this.Mouse.latLon == 'undefined' || isNaN(this.Mouse.latLon.lat) || isNaN(this.Mouse.latLon.lon)) {
      // Not Earth
      keepTrackApi.rmbMenuItems
        .filter((item) => item.isRmbOffEarth || (item.isRmbOnSat && clickedSatId !== -1))
        .forEach((item) => {
          getEl(item.elementIdL1).style.display = 'block';
          numMenuItems++;
        });
    } else {
      // This is the Earth
      numMenuItems = MouseInput.earthClicked({
        isViewDOM,
        rightBtnViewDOM,
        numMenuItems,
        isCreateDOM,
        rightBtnCreateDOM,
        isDrawDOM,
        rightBtnDrawDOM,
        isEarthDOM,
        rightBtnEarthDOM,
        clickedSatId,
      });
    }

    rightBtnMenuDOM.style.display = 'block';
    satHoverBoxDOM.style.display = 'none';

    // Offset size is based on size in style.css
    // TODO: Make this dynamic
    const mainCameraInstance = keepTrackApi.getMainCamera();
    const offsetX = mainCameraInstance.mouseX < canvasDOM.clientWidth / 2 ? 0 : -1 * 165;
    const offsetY = mainCameraInstance.mouseY < canvasDOM.clientHeight / 2 ? 0 : numMenuItems * -25;
    rightBtnMenuDOM.style.display = 'block';
    rightBtnMenuDOM.style.textAlign = 'center';
    rightBtnMenuDOM.style.position = 'absolute';
    rightBtnMenuDOM.style.left = `${mainCameraInstance.mouseX + offsetX}px`;
    rightBtnMenuDOM.style.top = `${mainCameraInstance.mouseY + offsetY}px`;
  }

  /* istanbul ignore next */
  public async readPixelsAsync(x: number, y: number, w: number, h: number, format: number, type: number, dstBuffer: Uint8Array) {
    try {
      const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);

      const { gl } = drawManagerInstance;
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, dstBuffer.byteLength, gl.STREAM_READ);
      gl.readPixels(x, y, w, h, format, type, 0);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

      await InputManager.getBufferSubDataAsync(gl, gl.PIXEL_PACK_BUFFER, buf, 0, dstBuffer);

      gl.deleteBuffer(buf);
      // eslint-disable-next-line require-atomic-updates
      this.isAsyncWorking = true;
    } catch (error) {
      // eslint-disable-next-line require-atomic-updates
      this.isAsyncWorking = false;
    }
  }

  /** readpixels used to determine which satellite is hovered is the biggest performance hit and we should throttle that */
  public update(dt?: Milliseconds) {
    // gl.readPixels in uiInput.getSatIdFromCoord creates a lot of jank
    // Earlier in the loop we decided how much to throttle updateHover
    // if we skip it this loop, we want to still draw the last thing
    // it was looking at

    if (KeepTrack.isFpsAboveLimit(dt, 30)) {
      if (this.updateHoverDelayLimit > 0) --this.updateHoverDelayLimit;
    } else if (KeepTrack.isFpsAboveLimit(dt, 15)) {
      this.updateHoverDelayLimit = settingsManager.updateHoverDelayLimitSmall;
    } else {
      this.updateHoverDelayLimit = settingsManager.updateHoverDelayLimitBig;
    }

    if (keepTrackApi.getMainCamera().isDragging || settingsManager.isMobileModeEnabled) return;

    if (++this.updateHoverDelay >= this.updateHoverDelayLimit) {
      this.updateHoverDelay = 0;
      const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);

      // If we are hovering over a satellite on a menu we don't want to change the mouseSat
      if (uiManagerInstance.hoverSatId > 0) {
        this.Mouse.mouseSat = uiManagerInstance.hoverSatId;
      } else {
        const mainCameraInstance = keepTrackApi.getMainCamera();
        this.Mouse.mouseSat = this.getSatIdFromCoord(mainCameraInstance.mouseX, mainCameraInstance.mouseY);
      }
    }
  }
}
