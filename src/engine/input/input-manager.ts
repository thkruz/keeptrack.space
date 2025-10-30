/* eslint-disable max-classes-per-file */
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { Degrees, Kilometers, Milliseconds } from '@ootk/src/main';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { ServiceLocator } from '../core/service-locator';
import { Engine } from '../engine';
import { EventBus } from '../events/event-bus';
import { lineManagerInstance } from '../rendering/line-manager';
import { html } from '../utils/development/formatter';
import { getEl, hideEl } from '../utils/get-el';
import { isThisNode } from '../utils/isThisNode';
import { KeyboardInput } from './input-manager/keyboard-input';
import { MouseInput } from './input-manager/mouse-input';
import { TouchInput } from './input-manager/touch-input';

export type LatLon = {
  lat: Degrees;
  lon: Degrees;
};

export type KeyEvent = {
  key: string;
  code?: string;
  callback: () => void;
};

type rmbMenuItem = {
  /**
   * Element ID of the main menu item
   */
  elementIdL1: string;
  /**
   * Element ID of the sub menu container
   */
  elementIdL2: string;
  /**
   * The sorting order for the menus
   */
  order: number;
  /**
   * Determines if the menu item is visible when right clicking on the earth
   */
  isRmbOnEarth: boolean;
  /**
   * Determines if the menu item is visible when right clicking off the earth
   */
  isRmbOffEarth: boolean;
  /**
   * Determines if the menu item is visible when right clicking on a satellite
   */
  isRmbOnSat: boolean;
};

export class InputManager {
  private updateHoverDelay = 0;
  private updateHoverDelayLimit = 3;
  isRmbMenuOpen = false;
  rmbMenuItems = <rmbMenuItem[]>[];

  public keyboard: KeyboardInput;
  public mouse: MouseInput;
  public touch: TouchInput;
  public isAsyncWorking = true;
  lastUpdateTime: number = 0;

  constructor() {
    this.keyboard = new KeyboardInput();
    this.mouse = new MouseInput(this.keyboard);
    this.touch = new TouchInput();
  }

  /*
   * *********************************************************************************************************************
   * WebGL Functions that we can't unit test for yet
   * *********************************************************************************************************************
   */
  /* istanbul ignore next */
  public static clientWaitAsync(gl: WebGL2RenderingContext, sync: WebGLSync, flags: number, intervalMs: Milliseconds): Promise<string> {
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
  public static async getBufferSubDataAsync(
    gl: WebGL2RenderingContext,
    target: WebGL2RenderingContextBase['PIXEL_PACK_BUFFER'] | WebGLRenderingContextBase['ARRAY_BUFFER'],
    buffer: WebGLBuffer,
    srcByteOffset: number,
    outputArray: Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array,
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
      gl.getBufferSubData(target, srcByteOffset, outputArray, dstOffset, length);
    } else if (dstOffset) {
      gl.getBufferSubData(target, srcByteOffset, outputArray, dstOffset);
    } else {
      gl.getBufferSubData(target, srcByteOffset, outputArray);
    }

    gl.bindBuffer(target, null);

    return outputArray;
  }

  public static getEarthScreenPoint(x: number, y: number): Kilometers[] {
    if (typeof x === 'undefined' || typeof y === 'undefined') {
      throw new Error('x and y must be defined');
    }
    if (isNaN(x) || isNaN(y)) {
      throw new Error('x and y must be numbers');
    }

    // Where is the camera
    const rayOrigin = ServiceLocator.getMainCamera().getForwardVector();
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

  public static getSatIdFromCoordAlt(x: number, y: number): number | null {
    const eci = InputManager.unProject(x, y);
    const eciArray = {
      x: eci[0],
      y: eci[1],
      z: eci[2],
    };

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const dotsManagerInstance = ServiceLocator.getDotsManager();


    return dotsManagerInstance.getIdFromEci(eciArray, catalogManagerInstance.orbitalSats);
  }

  hidePopUps() {
    if (settingsManager.isPreventColorboxClose) {
      return;
    }
    hideEl('right-btn-menu');
    this.clearRMBSubMenu();
    this.isRmbMenuOpen = false;
  }

  clearRMBSubMenu = () => {
    this.rmbMenuItems.forEach((item) => {
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

  public static unProject(x: number, y: number): [number, number, number] {
    const renderer = ServiceLocator.getRenderer();
    const { gl } = renderer;

    const glScreenX = (x / gl.drawingBufferWidth) * 2 - 1.0;
    const glScreenY = 1.0 - (y / gl.drawingBufferHeight) * 2;
    const screenVec = <vec4>[glScreenX, glScreenY, -0.01, 1.0]; // gl screen coords
    const comboPMat = mat4.create();
    const invMat = mat4.create();

    mat4.mul(comboPMat, ServiceLocator.getMainCamera().projectionMatrix, ServiceLocator.getMainCamera().matrixWorldInverse);
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
    const renderer = ServiceLocator.getRenderer();
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const { gl } = renderer;

    // NOTE: gl.readPixels is a huge bottleneck but readPixelsAsync doesn't work properly on mobile
    gl.bindFramebuffer(gl.FRAMEBUFFER, ServiceLocator.getScene().frameBuffers.gpuPicking);
    if (!isThisNode() && this.isAsyncWorking && !settingsManager.isDisableAsyncReadPixels) {
      this.readPixelsAsync(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManagerInstance.pickReadPixelBuffer);
    }
    if (!this.isAsyncWorking) {
      gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManagerInstance.pickReadPixelBuffer);
    }
    // NOTE: const id = ((dotsManagerInstance.pickReadPixelBuffer[2] << 16) | (dotsManagerInstance.pickReadPixelBuffer[1] << 8) | dotsManagerInstance.pickReadPixelBuffer[0]) - 1;

    return ((dotsManagerInstance.pickReadPixelBuffer[2] << 16) | (dotsManagerInstance.pickReadPixelBuffer[1] << 8) | dotsManagerInstance.pickReadPixelBuffer[0]) - 1;
  }

  public init(): void {
    const rmbWrapperDom = getEl('rmb-wrapper');

    if (rmbWrapperDom) {
      rmbWrapperDom.insertAdjacentHTML(
        'beforeend',
        html`
      <div id="right-btn-menu" class="right-btn-menu">
        <ul id="right-btn-menu-ul" class='dropdown-contents'></ul>
      </div>
      `,
      );
      // Append any other menus before putting the reset/clear options
      EventBus.getInstance().emit(EventBusEvent.rightBtnMenuAdd);

      // Now add the reset/clear options
      const menuUl = getEl('right-btn-menu-ul', true);

      if (menuUl) {
        menuUl.insertAdjacentHTML(
          'beforeend',
          html`
          <li id="toggle-time-rmb"><a href="#">Pause Clock</a></li>
          <li id="reset-camera-rmb"><a href="#">Reset Camera</a></li>
          <li id="clear-lines-rmb"><a href="#">Clear Lines</a></li>
          <li id="clear-screen-rmb"><a href="#">Clear Screen</a></li>
          `,
        );

        // sort getEl('rmb-wrapper').children by order in rmbMenuItems
        const rmbWrapper = getEl('right-btn-menu-ul', true);

        if (rmbWrapper) {
          const rmbWrapperChildren = rmbWrapper.children;
          const rmbWrapperChildrenArray = Array.from(rmbWrapperChildren);

          rmbWrapperChildrenArray.sort((a, b) => {
            const aOrder = this.rmbMenuItems.find((item) => item.elementIdL1 === a.id)?.order || 9999;
            const bOrder = this.rmbMenuItems.find((item) => item.elementIdL1 === b.id)?.order || 9999;

            return aOrder - bOrder;
          });
          rmbWrapper.innerHTML = '';
          rmbWrapperChildrenArray.forEach((child) => rmbWrapper.appendChild(child));
        }
      }
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

    this.mouse.init(canvasDOM);
    this.touch.init(canvasDOM);
    this.keyboard.init();

    EventBus.getInstance().on(EventBusEvent.highPerformanceRender, (dt: Milliseconds) => {
      this.update(dt);
    });
  }

  public openRmbMenu(clickedSatId: number = -1) {
    if (!settingsManager.isAllowRightClick) {
      return;
    }

    this.isRmbMenuOpen = true;

    const canvasDOM = getEl('keeptrack-canvas');
    const rightBtnMenuDOM = getEl('right-btn-menu');
    const satHoverBoxDOM = getEl('sat-hoverbox');

    if (!canvasDOM || !rightBtnMenuDOM || !satHoverBoxDOM) {
      return;
    }

    this.rmbMenuItems.forEach((item) => {
      hideEl(item.elementIdL1);
    });

    hideEl('clear-lines-rmb');

    if (lineManagerInstance.lines.length > 0) {
      const clearLinesEl = getEl('clear-lines-rmb', true);

      if (clearLinesEl) {
        clearLinesEl.style.display = 'block';
      }
    }

    if (this.mouse.mouseSat !== -1 || clickedSatId !== -1) {
      // Empty on purpose
    } else {
      // Intentional
    }
    let isEarth = false;

    if (typeof this.mouse.latLon === 'undefined' || isNaN(this.mouse.latLon.lat) || isNaN(this.mouse.latLon.lon)) {
      // Not Earth
      this.rmbMenuItems
        .filter((item) => item.isRmbOffEarth || (item.isRmbOnSat && clickedSatId !== -1))
        .forEach((item) => {
          const dom = getEl(item.elementIdL1);

          if (dom) {
            dom.style.display = 'block';
          }
        });
    } else {
      // This is the Earth
      isEarth = true;
      this.earthClicked({
        clickedSatId,
      });
    }

    rightBtnMenuDOM!.style.display = 'block';
    satHoverBoxDOM!.style.display = 'none';

    EventBus.getInstance().emit(EventBusEvent.rightBtnMenuOpen, isEarth, clickedSatId);

    // Loop through all the menu items and determine how many are visible
    let numMenuItems = 0;

    this.rmbMenuItems.forEach((item) => {
      const dom = getEl(item.elementIdL1);

      if (dom && dom.style.display !== 'none') {
        numMenuItems++;
      }
    });

    /*
     * Offset size is based on size in style.css
     * TODO: Make this dynamic
     */
    const mainCameraInstance = ServiceLocator.getMainCamera();
    const offsetX = mainCameraInstance.state.mouseX < canvasDOM!.clientWidth / 2 ? 0 : -1 * 165;
    const offsetY = mainCameraInstance.state.mouseY < canvasDOM!.clientHeight / 2 ? 0 : numMenuItems * -25;

    rightBtnMenuDOM!.style.display = 'block';
    rightBtnMenuDOM!.style.textAlign = 'center';
    rightBtnMenuDOM!.style.position = 'absolute';
    rightBtnMenuDOM!.style.left = `${mainCameraInstance.state.mouseX + offsetX}px`;
    rightBtnMenuDOM!.style.top = `${mainCameraInstance.state.mouseY + offsetY}px`;
  }

  earthClicked({ clickedSatId }: { clickedSatId: number }) {
    this.rmbMenuItems
      .filter((item) => item.isRmbOnEarth || (item.isRmbOnSat && clickedSatId !== -1))
      .sort((a, b) => a.order - b.order)
      .forEach((item) => {
        const dom = getEl(item.elementIdL1);

        if (dom) {
          dom.style.display = 'block';
        }
      });
  }

  /* istanbul ignore next */
  public async readPixelsAsync(x: number, y: number, w: number, h: number, format: number, type: number, dstBuffer: Uint8Array) {
    const gl = ServiceLocator.getRenderer().gl;

    try {
      const buf = gl.createBuffer();

      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, dstBuffer.byteLength, gl.STREAM_READ);
      gl.readPixels(x, y, w, h, format, type, 0);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

      await InputManager.getBufferSubDataAsync(gl, gl.PIXEL_PACK_BUFFER, buf, 0, dstBuffer);

      gl.deleteBuffer(buf);
      this.isAsyncWorking = true;
    } catch {
      this.isAsyncWorking = false;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    }
  }

  /** readpixels used to determine which satellite is hovered is the biggest performance hit and we should throttle that */
  public update(dt = 0 as Milliseconds) {
    /*
     * gl.readPixels in uiInput.getSatIdFromCoord creates a lot of jank
     * Earlier in the loop we decided how much to throttle updateHover
     * if we skip it this loop, we want to still draw the last thing
     * it was looking at
     */

    if (Engine.isFpsAboveLimit(dt, 30)) {
      if (this.updateHoverDelayLimit > 0) {
        --this.updateHoverDelayLimit;
      }
    } else if (Engine.isFpsAboveLimit(dt, 15)) {
      this.updateHoverDelayLimit = settingsManager.updateHoverDelayLimitSmall;
    } else {
      this.updateHoverDelayLimit = settingsManager.updateHoverDelayLimitBig;
    }

    if (ServiceLocator.getMainCamera().state.isDragging) {
      return;
    }

    const mainCameraInstance = ServiceLocator.getMainCamera();

    if (settingsManager.isMobileModeEnabled) {
      // this.mouse.mouseSat = this.getSatIdFromCoord(mainCameraInstance.mouseX, mainCameraInstance.mouseY);
      return;
    }

    if (++this.updateHoverDelay >= this.updateHoverDelayLimit) {
      this.updateHoverDelay = 0;
      const uiManagerInstance = ServiceLocator.getUiManager();

      // If we are hovering over a satellite on a menu we don't want to change the mouseSat
      if (uiManagerInstance.searchHoverSatId >= 0) {
        this.mouse.mouseSat = uiManagerInstance.searchHoverSatId;
      } else if (!settingsManager.isMobileModeEnabled) {
        if (Date.now() - this.lastUpdateTime > 100) {
          this.mouse.mouseSat = this.getSatIdFromCoord(mainCameraInstance.state.mouseX, mainCameraInstance.state.mouseY);
          this.lastUpdateTime = Date.now();
        }
      }
    }
  }
}
