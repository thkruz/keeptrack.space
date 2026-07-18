/* eslint-disable max-classes-per-file */
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Degrees, Kilometers, Milliseconds } from '@ootk/src/main';
import { mat4, vec3, vec4 } from 'gl-matrix';
import { PluginRegistry } from '../core/plugin-registry';
import { ServiceLocator } from '../core/service-locator';
import { Engine } from '../engine';
import { EventBus } from '../events/event-bus';
import { lineManagerInstance } from '../rendering/line-manager';
import { t7e } from '@app/locales/keys';
import { html } from '../utils/development/formatter';
import { getEl, hideEl } from '../utils/get-el';
import { errorManagerInstance } from '../utils/errorManager';
import { CpuStage, FrameProfiler } from '../utils/frame-profiler';
import { isThisNode } from '../utils/isThisNode';
import { RmbMenuContext } from '../plugins/core/plugin-capabilities';
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
   * Element ID of the sub menu container. Empty string for single-action items.
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
  /**
   * Fine-grained visibility predicate. Overrides the boolean flags when provided.
   */
  isVisible?: (ctx: RmbMenuContext) => boolean;
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
  public isPickingSupported = true;
  private hasWarnedPickingDisabled_ = false;
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

  public static getEarthScreenPoint(x: number, y: number, camera = ServiceLocator.getMainCamera()): Kilometers[] {
    if (typeof x === 'undefined' || typeof y === 'undefined') {
      throw new Error('x and y must be defined');
    }
    if (isNaN(x) || isNaN(y)) {
      throw new Error('x and y must be numbers');
    }

    // Where is the camera
    const rayOrigin = camera.getForwardVector();
    // What did we click on
    const ptThru = InputManager.unProject(x, y, camera);

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
      if (item.elementIdL2) {
        hideEl(item.elementIdL2);
      }
    });
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

  public static unProject(x: number, y: number, camera = ServiceLocator.getMainCamera()): [number, number, number] {
    const renderer = ServiceLocator.getRenderer();
    const { gl } = renderer;

    // Viewport-local NDC so panes that only cover part of the canvas unproject correctly
    const { x: glScreenX, y: glScreenY } = camera.getViewportNdc(gl, x, y);
    const screenVec = <vec4>[glScreenX, glScreenY, -0.01, 1.0]; // gl screen coords
    const comboPMat = mat4.create();
    const invMat = mat4.create();

    mat4.mul(comboPMat, camera.projectionMatrix, camera.matrixWorldInverse);
    if (!mat4.invert(invMat, comboPMat)) {
      /*
       * The render projection is deliberately depth-degenerate: per-fragment log
       * depth writes gl_FragDepth, so the matrix maps every vertex to a constant
       * NDC z and P*V is singular (mat4.invert fails, leaving invMat identity,
       * which collapses every click ray onto the camera boresight). Rebuild the
       * depth row as z_clip = w_clip - 2 (a finite ~1 km near plane) purely for
       * ray reconstruction - it does not affect rendering.
       */
      const proj = mat4.clone(camera.projectionMatrix);

      proj[2] = proj[3];
      proj[6] = proj[7];
      proj[10] = proj[11];
      proj[14] = proj[15] - 2;
      mat4.mul(comboPMat, proj, camera.matrixWorldInverse);
      mat4.invert(invMat, comboPMat);
    }
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
    // With GPU picking disabled nothing ever writes the picking buffer (and its
    // per-frame clear is skipped) — skip the sync readPixels pipeline stall too.
    if (!this.isPickingSupported || settingsManager.isDisableGpuPicking) {
      return -1;
    }
    const renderer = ServiceLocator.getRenderer();
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const { gl } = renderer;

    // NOTE: gl.readPixels is a huge bottleneck but readPixelsAsync doesn't work properly on mobile.
    // readPixelsAsync swallows its own errors and flips isAsyncWorking; safe to fire-and-forget.
    // The sync path stalls the whole GL pipeline, so it is profiled per occurrence.
    const profiler = FrameProfiler.getInstance();

    profiler.beginCpu(CpuStage.pickRead);
    try {
      gl.bindFramebuffer(gl.FRAMEBUFFER, ServiceLocator.getScene().frameBuffers.gpuPicking);
      if (!isThisNode() && this.isAsyncWorking && !settingsManager.isDisableAsyncReadPixels) {
        this.readPixelsAsync(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManagerInstance.pickReadPixelBuffer);
      }
      if (!this.isAsyncWorking) {
        try {
          gl.readPixels(x, gl.drawingBufferHeight - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dotsManagerInstance.pickReadPixelBuffer);
        } catch (e) {
          this.disablePicking_(e);

          return -1;
        }
      }
    } finally {
      profiler.endCpu(CpuStage.pickRead);
    }

    const buf = dotsManagerInstance.pickReadPixelBuffer;
    const id = ((buf[2] << 16) | (buf[1] << 8) | buf[0]) - 1;

    // Async readback can leave pickReadPixelBuffer with stale or partially-written values,
    // producing decoded ids well outside the catalog. Treat any out-of-range id as a miss.
    if (id < 0 || id >= catalogManagerInstance.numObjects) {
      return -1;
    }

    return id;
  }

  /**
   * Diagnostic: reads an NxN patch of the picking framebuffer centered on (x,y)
   * and returns the nearest valid satellite ID with its pixel offset.
   * Enable via settingsManager.debugMobilePicking = true.
   */
  public getSatIdFromCoordNeighborhood(x: number, y: number, patchSize = 21): { id: number; offsetX: number; offsetY: number; hitCount: number; patchData: string } {
    if (!this.isPickingSupported || settingsManager.isDisableGpuPicking) {
      return { id: -1, offsetX: 0, offsetY: 0, hitCount: 0, patchData: '(picking disabled)' };
    }
    const renderer = ServiceLocator.getRenderer();
    const { gl } = renderer;

    const half = Math.floor(patchSize / 2);
    const startX = Math.max(0, Math.floor(x) - half);
    const startY = Math.max(0, gl.drawingBufferHeight - Math.floor(y) - half);
    const clampedW = Math.min(patchSize, gl.drawingBufferWidth - startX);
    const clampedH = Math.min(patchSize, gl.drawingBufferHeight - startY);
    const buf = new Uint8Array(4 * clampedW * clampedH);

    gl.bindFramebuffer(gl.FRAMEBUFFER, ServiceLocator.getScene().frameBuffers.gpuPicking);
    try {
      gl.readPixels(startX, startY, clampedW, clampedH, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    } catch (e) {
      this.disablePicking_(e);

      return { id: -1, offsetX: 0, offsetY: 0, hitCount: 0, patchData: '(picking disabled)' };
    }

    let closestId = -1;
    let closestDist = Infinity;
    let closestOffX = 0;
    let closestOffY = 0;
    const hits: string[] = [];

    for (let row = 0; row < clampedH; row++) {
      for (let col = 0; col < clampedW; col++) {
        const idx = (row * clampedW + col) * 4;
        const id = ((buf[idx + 2] << 16) | (buf[idx + 1] << 8) | buf[idx]) - 1;

        if (id >= 0) {
          const offX = col - half;
          // readPixels row 0 is bottom, so flip Y offset
          const offY = -(row - half);
          const dist = Math.sqrt(offX * offX + offY * offY);

          if (hits.length < 20) {
            hits.push(`id=${id} @(${offX},${offY}) d=${dist.toFixed(1)}`);
          }
          if (dist < closestDist) {
            closestDist = dist;
            closestId = id;
            closestOffX = offX;
            closestOffY = offY;
          }
        }
      }
    }

    return {
      id: closestId,
      offsetX: closestOffX,
      offsetY: closestOffY,
      hitCount: hits.length,
      patchData: hits.length > 0 ? hits.join('\n') : '(no valid IDs in patch)',
    };
  }

  private disablePicking_(e: unknown): void {
    this.isPickingSupported = false;
    this.isAsyncWorking = false;
    if (!this.hasWarnedPickingDisabled_) {
      this.hasWarnedPickingDisabled_ = true;
      const msg = e instanceof Error ? e.message : String(e);

      errorManagerInstance.warn(`Satellite hover-pick disabled: WebGL readPixels not supported in this browser (${msg}). Click-to-select still works.`);
    }
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
          <li id="toggle-time-rmb"><a href="#">${t7e('rightClickMenu.pauseClock')}</a></li>
          <li id="reset-camera-rmb"><a href="#">${t7e('rightClickMenu.resetCamera')}</a></li>
          ${settingsManager.isDisableClearLinesRmb ? '' : html`<li id="clear-lines-rmb"><a href="#">${t7e('rightClickMenu.clearLines')}</a></li>`}
          <li id="clear-screen-rmb"><a href="#">${t7e('rightClickMenu.clearScreen')}</a></li>
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

  /**
   * Builds the context object describing what was right-clicked. Shared with
   * every menu item's visibility predicate and the rightBtnMenuOpen event.
   */
  buildRmbContext(clickedSatId: number = -1): RmbMenuContext {
    const latLon = this.mouse.latLon;
    const isEarth = latLon !== undefined && !Number.isNaN(latLon.lat) && !Number.isNaN(latLon.lon);
    const target = clickedSatId !== -1 ? (ServiceLocator.getCatalogManager().getObject(clickedSatId) ?? null) : null;
    const hasPrimarySelection = (PluginRegistry.getPlugin(SelectSatManager)?.selectedSat ?? -1) !== -1;

    return {
      surface: isEarth ? 'earth' : 'space',
      targetId: target ? clickedSatId : -1,
      target,
      hasPrimarySelection,
    };
  }

  /**
   * Legacy flag-based visibility: earth/space flags, plus the on-satellite flag
   * whenever an object was clicked regardless of surface.
   */
  private static isItemVisibleLegacy_(item: rmbMenuItem, ctx: RmbMenuContext): boolean {
    if (item.isRmbOnSat && ctx.target) {
      return true;
    }

    return ctx.surface === 'earth' ? item.isRmbOnEarth : item.isRmbOffEarth;
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

    const ctx = this.buildRmbContext(clickedSatId);

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

    this.rmbMenuItems
      .filter((item) => (item.isVisible ? item.isVisible(ctx) : InputManager.isItemVisibleLegacy_(item, ctx)))
      .forEach((item) => {
        const dom = getEl(item.elementIdL1);

        if (dom) {
          dom.style.display = 'block';
        }
      });

    rightBtnMenuDOM.style.display = 'block';
    satHoverBoxDOM.style.display = 'none';

    EventBus.getInstance().emit(EventBusEvent.rightBtnMenuOpen, ctx);

    // Count every visible row (plugin items AND built-ins) to estimate menu height
    const menuUl = getEl('right-btn-menu-ul', true);
    const numMenuItems = menuUl
      ? Array.from(menuUl.children).filter((child) => (<HTMLElement>child).style.display !== 'none').length
      : this.rmbMenuItems.length;

    /*
     * Offset size is based on size in style.css
     * TODO: Make this dynamic
     */
    const inputCamera = ServiceLocator.getViewportManager()?.getInputCamera() ?? ServiceLocator.getMainCamera();
    const offsetX = inputCamera.state.mouseX < canvasDOM.clientWidth / 2 ? 0 : -1 * 180;
    const offsetY = inputCamera.state.mouseY < canvasDOM.clientHeight / 2 ? 0 : numMenuItems * -25;

    rightBtnMenuDOM.style.textAlign = 'center';
    rightBtnMenuDOM.style.position = 'absolute';
    rightBtnMenuDOM.style.left = `${inputCamera.state.mouseX + offsetX}px`;
    rightBtnMenuDOM.style.top = `${inputCamera.state.mouseY + offsetY}px`;
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

    // Hover picking follows the pane under the cursor in multi-view
    const inputCamera = ServiceLocator.getViewportManager()?.getInputCamera() ?? ServiceLocator.getMainCamera();

    if (inputCamera.state.isDragging) {
      return;
    }

    if (settingsManager.isMobileModeEnabled) {
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
          this.mouse.mouseSat = this.getSatIdFromCoord(inputCamera.state.mouseX, inputCamera.state.mouseY);
          this.lastUpdateTime = Date.now();
        }
      }
    }
  }
}
