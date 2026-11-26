/* eslint-disable max-classes-per-file */
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { t7e } from '@app/locales/keys';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Degrees, Kilometers, Milliseconds, rayEllipsoidIntersection } from '@ootk/src/main';
import { mat4, vec4 } from 'gl-matrix';
import { CameraType } from '../camera/camera-type';
import { PluginRegistry } from '../core/plugin-registry';
import { ServiceLocator } from '../core/service-locator';
import { Engine } from '../engine';
import { EventBus } from '../events/event-bus';
import {
  addContextMenuGroupLevel1,
  applyContextMenuGroupVisibility,
  isContextMenuGroupMember,
  registerContextMenuGroup,
} from '../plugins/components/context-menu/context-menu-groups';
import { ContextMenuGroupId, RmbMenuContext } from '../plugins/core/plugin-capabilities';
import type { PickBox } from '../rendering/dots-manager';
import { lineManagerInstance } from '../rendering/line-manager';
import { html } from '../utils/development/formatter';
import { errorManagerInstance } from '../utils/errorManager';
import { CpuStage, FrameProfiler } from '../utils/frame-profiler';
import { getEl, hideEl } from '../utils/get-el';
import { isThisNode } from '../utils/isThisNode';
import { KeyboardInput } from './input-manager/keyboard-input';
import { MouseInput } from './input-manager/mouse-input';
import { TouchInput } from './input-manager/touch-input';
import { type PickCandidate, resolvePickCandidate } from './pick-resolve';

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
  /**
   * Shared group submenu this item lives in (members) or represents (when isGroup is true).
   */
  group?: ContextMenuGroupId;
  /**
   * True for a group's own top-level entry; its visibility follows its members.
   */
  isGroup?: boolean;
};

/** Built-in entry that moves into the "More" group when that group exists. */
const RMB_TOGGLE_TIME_ID = 'toggle-time-rmb';
const RMB_TOGGLE_TIME_GROUP: ContextMenuGroupId = 'more';
const RMB_TOGGLE_TIME_ORDER = 1000;

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
  /** False once the pointer left the canvas; hover picking must not reuse the stale coordinates. */
  isPointerOverCanvas = true;

  // ─── On-demand GPU picking gate (WP4) ───────────────────────────────
  /** How long after the last pointer/read activity to keep rendering the picking buffer. */
  private static readonly PICK_ACTIVE_MS_ = 300;
  /** Timestamp (Date.now) of the last pointer/touch/read activity. */
  private lastPickActivityMs_ = 0;
  /** One-shot: force the picking buffer to render next frame (guard for coord reads). */
  private forcePickRender_ = false;
  /** Previous frame's view-projection matrix, to detect camera motion. */
  private lastPickCamMatrix_: Float32Array | null = null;
  /**
   * The picking box the staging buffer actually holds, or null when nothing has landed
   * in it yet. Set only once a read has completed (the async one resolves a frame or
   * more after it is issued), so a decode can tell whether the bytes it is about to read
   * describe the pixel being asked about.
   */
  private pickBufferBox_: PickBox | null = null;
  /**
   * The picking pass's draw box as of the moment the buffered read was taken. Outside it
   * the framebuffer had not been rendered yet, so those bytes are an older frame's
   * leftovers no matter which box the read covered.
   */
  private pickBufferDrawBox_: PickBox | null = null;

  /**
   * Mark that something happened that needs a fresh picking buffer soon: a
   * pointer move / press, a touch, or a picking read. Keeps the picking buffer
   * rendering for {@link PICK_ACTIVE_MS_} so the next readback is current.
   */
  markPickActivity(): void {
    this.lastPickActivityMs_ = Date.now();
  }

  /**
   * Decides whether the GPU picking buffer needs to be (re)rendered this frame.
   * Called ONCE per frame by the renderer (it advances the camera-motion cache),
   * and the result is read by the clear/earth/dots picking draws. Returns true on
   * recent pointer/read activity, camera motion, or a forced refresh; false when
   * idle so the two full-catalog picking passes can be skipped.
   */
  isPickingRenderNeeded(): boolean {
    if (!this.isPickingSupported || settingsManager.isDisableGpuPicking) {
      return false;
    }
    if (this.forcePickRender_) {
      this.forcePickRender_ = false;

      return true;
    }
    if (Date.now() - this.lastPickActivityMs_ < InputManager.PICK_ACTIVE_MS_) {
      return true;
    }

    return this.hasCameraMoved_();
  }

  /** True when the view-projection matrix changed since the previous frame. */
  private hasCameraMoved_(): boolean {
    const m = ServiceLocator.getRenderer().projectionCameraMatrix;

    if (!this.lastPickCamMatrix_) {
      this.lastPickCamMatrix_ = new Float32Array(m);

      return true;
    }
    let moved = false;

    for (let i = 0; i < 16; i++) {
      if (m[i] !== this.lastPickCamMatrix_[i]) {
        moved = true;
        break;
      }
    }
    this.lastPickCamMatrix_.set(m);

    return moved;
  }

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
    length?: number
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
    if (Number.isNaN(x) || Number.isNaN(y)) {
      throw new Error('x and y must be numbers');
    }

    // Where is the camera
    const rayOrigin = camera.getForwardVector();
    // What did we click on
    const ptThru = InputManager.unProject(x, y, camera);

    return <Kilometers[]>(<unknown>InputManager.intersectEarthEllipsoid(rayOrigin, ptThru));
  }

  /**
   * First point where the ray from `rayOrigin` through `ptThru` meets the WGS84 ellipsoid
   * (the drawn globe), in the same Earth-centred frame as the inputs. Latitude does not depend
   * on the GMST rotation about Z, so `eci2lla` of the result is the geodetic lat/lon under the cursor.
   * @param rayOrigin - Camera position, km
   * @param ptThru - Any point on the pick ray past the origin, km
   * @returns The near intersection, or [NaN, NaN, NaN] when the ray misses the Earth
   */
  static intersectEarthEllipsoid(rayOrigin: ArrayLike<number>, ptThru: ArrayLike<number>): [number, number, number] {
    // Plain doubles, not Float32 vec3: a float32 ulp at 6378 km is about 0.5 m (4e-6 deg)
    const dx = ptThru[0] - rayOrigin[0];
    const dy = ptThru[1] - rayOrigin[1];
    const dz = ptThru[2] - rayOrigin[2];
    const len = Math.hypot(dx, dy, dz);
    const dir = { x: dx / len, y: dy / len, z: dz / len };
    const hit = len > 0 ? rayEllipsoidIntersection({ x: rayOrigin[0], y: rayOrigin[1], z: rayOrigin[2] }, dir) : null;

    if (!hit) {
      return [Number.NaN, Number.NaN, Number.NaN];
    }

    return [rayOrigin[0] + dir.x * hit.near, rayOrigin[1] + dir.y * hit.near, rayOrigin[2] + dir.z * hit.near];
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
      // A group member's submenu is a section inside its group's submenu, not a popup.
      if (item.elementIdL2 && !isContextMenuGroupMember(item)) {
        hideEl(item.elementIdL2);
      }
    });
  };

  static showDropdownSubMenu(rightBtnMenuDOM: HTMLElement, rightBtnDOM: HTMLElement, canvasDOM: HTMLCanvasElement, element1?: HTMLElement) {
    const isOpeningRight = rightBtnMenuDOM.offsetLeft < canvasDOM.clientWidth / 2;

    rightBtnDOM.style.display = 'block';
    rightBtnDOM.style.textAlign = 'center';
    rightBtnDOM.style.position = 'absolute';
    // Sit flush against the parent menu so a wide submenu never covers it. Without layout
    // (jsdom) the widths read 0 and the old fixed 160 px step applies.
    const parentW = rightBtnMenuDOM.offsetWidth || 160;
    const subW = rightBtnDOM.offsetWidth || 160;

    rightBtnDOM.style.left = `${isOpeningRight ? rightBtnMenuDOM.offsetLeft + parentW : rightBtnMenuDOM.offsetLeft - subW}px`;
    rightBtnDOM.style.top = element1 ? `${rightBtnMenuDOM.offsetTop + element1.offsetTop}px` : `${rightBtnMenuDOM.offsetTop}px`;
    if (rightBtnDOM.offsetTop !== 0) {
      rightBtnDOM.style.display = 'block';
    } else {
      rightBtnDOM.style.display = 'none';

      return;
    }

    // Keep a tall submenu on screen: slide it up instead of running past the canvas bottom.
    const boundsH = canvasDOM.clientHeight;
    const subH = rightBtnDOM.offsetHeight;

    if (boundsH > 0 && subH > 0 && rightBtnDOM.offsetTop + subH > boundsH) {
      rightBtnDOM.style.top = `${Math.max(0, boundsH - subH)}px`;
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

    // A coord read needs a fresh buffer next frame. Use the one-shot force flag,
    // NOT the 300 ms activity window: the hover system polls this ~10/s even with
    // a stationary cursor, so the window would keep picking rendering every frame
    // and erase the idle win. The one-shot means each poll refreshes picking for
    // exactly one frame (~10 picking renders/s idle vs 60), and it doubles as the
    // guard for programmatic coordinate-pick APIs.
    this.forcePickRender_ = true;
    const renderer = ServiceLocator.getRenderer();
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const { gl } = renderer;
    const pickBox = dotsManagerInstance.getPickBox(gl, x, y);

    // NOTE: gl.readPixels is a huge bottleneck but readPixelsAsync doesn't work properly on mobile.
    // readPixelsAsync swallows its own errors and flips isAsyncWorking; safe to fire-and-forget.
    // The sync path stalls the whole GL pipeline, so it is profiled per occurrence.
    const profiler = FrameProfiler.getInstance();

    profiler.beginCpu(CpuStage.pickRead);
    try {
      gl.bindFramebuffer(gl.FRAMEBUFFER, ServiceLocator.getScene().frameBuffers.gpuPicking);
      // isDisableAsyncReadPixels must fall back to the sync read, not skip reading
      // altogether: with async still flagged as working, both branches were skipped
      // and every pick returned the stale buffer (id -1 forever).
      const isAsyncRead = !isThisNode() && this.isAsyncWorking && !settingsManager.isDisableAsyncReadPixels;

      /*
       * The bytes in the staging buffer only describe this pixel if BOTH are true:
       * the read covered it, and the picking pass had already rendered it when that
       * read was taken. Track the draw box alongside the read box - the read happens
       * before this frame's picking pass, so it always reflects an earlier draw.
       */
      const drawBoxAtRead = dotsManagerInstance.lastPickDrawBox;

      if (isAsyncRead) {
        /*
         * readPixelsAsync fills the staging buffer when its fence resolves, which is
         * always AFTER this call returns - so what is in the buffer right now belongs to
         * an earlier read. Keep the async read (no pipeline stall) for the parked-cursor
         * case, and fall back to a sync read whenever the buffered bytes cannot answer
         * for this pixel. Decoding them unconditionally is what made lone dots
         * unhoverable: over empty sky somebody else's pixel decodes to -1.
         */
        this.readPixelsAsync(pickBox.x0, pickBox.y0, pickBox.size, pickBox.size, gl.RGBA, gl.UNSIGNED_BYTE, dotsManagerInstance.pickReadPixelBuffer).then((didLand) => {
          this.pickBufferBox_ = didLand ? pickBox : null;
          this.pickBufferDrawBox_ = didLand ? drawBoxAtRead : null;
        });
      }
      if (!isAsyncRead || !this.isPixelBuffered_(pickBox)) {
        try {
          gl.readPixels(pickBox.x0, pickBox.y0, pickBox.size, pickBox.size, gl.RGBA, gl.UNSIGNED_BYTE, dotsManagerInstance.pickReadPixelBuffer);
          this.pickBufferBox_ = pickBox;
          this.pickBufferDrawBox_ = drawBoxAtRead;
        } catch (e) {
          this.disablePicking_(e);

          return -1;
        }
      }
    } finally {
      profiler.endCpu(CpuStage.pickRead);
    }

    /*
     * Decode against the box the buffer actually holds - on the cached-async path that is
     * the earlier read's box, offset by however far the cursor has drifted since - but
     * measure distance from where the cursor is NOW.
     */
    const bufferedBox = this.pickBufferBox_ ?? pickBox;

    return this.decodePickBox_({ ...bufferedBox, cx: pickBox.cx, cy: pickBox.cy });
  }

  /** True when a box contains a drawing-buffer pixel. */
  private static boxContains_(box: PickBox | null, px: number, py: number): boolean {
    return !!box && px >= box.x0 && px < box.x0 + box.size && py >= box.y0 && py < box.y0 + box.size;
  }

  /**
   * True when the staging buffer already holds usable bytes for this pixel: a completed
   * read that covered it, taken after a picking pass that had rendered it.
   */
  private isPixelBuffered_(pickBox: PickBox): boolean {
    return InputManager.boxContains_(this.pickBufferBox_, pickBox.cx, pickBox.cy) && InputManager.boxContains_(this.pickBufferDrawBox_, pickBox.cx, pickBox.cy);
  }

  /**
   * Decodes the picking box in the staging buffer and returns the in-catalog id nearest
   * the cursor. The box is read (and rendered) around the cursor rather than at exactly
   * one pixel so a cursor that moved between the picking draw and this read still lands
   * on its target - see DotsManager.PICKING_READ_PIXEL_BUFFER_SIZE.
   */
  private decodePickBox_(pickBox: PickBox): number {
    const dotsManagerInstance = ServiceLocator.getDotsManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const buf = dotsManagerInstance.pickReadPixelBuffer;
    const { x0, y0, size, cx, cy } = pickBox;
    const found = new Map<number, number>();

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const offset = (row * size + col) * 4;
        const id = ((buf[offset + 2] << 16) | (buf[offset + 1] << 8) | buf[offset]) - 1;

        /*
         * Async readback can leave pickReadPixelBuffer with stale or partially-written
         * values, producing decoded ids well outside the catalog. Treat any out-of-range
         * id as a miss.
         */
        if (id < 0 || id >= catalogManagerInstance.numObjects) {
          continue;
        }

        const dx = x0 + col - cx;
        const dy = y0 + row - cy;
        const distance = dx * dx + dy * dy;
        const prev = found.get(id);

        if (prev === undefined || distance < prev) {
          found.set(id, distance);
        }
      }
    }

    const candidates: PickCandidate[] = Array.from(found, ([id, pixelDistance2]) => ({ id, pixelDistance2 }));

    /*
     * Pick squares are much larger than the visible dot, so in a dense belt the id under the
     * cursor pixel is whichever square won the depth test. Resolve overlaps by dot centre.
     */
    return resolvePickCandidate(candidates, { x: cx, y: cy }, (id) => this.getPickCentre_(id));
  }

  /** Dot centre of a catalog id in drawing-buffer pixels (y from the bottom), or null when it cannot be projected. */
  private getPickCentre_(id: number): { x: number; y: number } | null {
    // Polar and flat-map shaders reproject in the GPU; the CPU projection only matches the 3D view
    const camType = ServiceLocator.getMainCamera().cameraType;

    if (camType === CameraType.POLAR_VIEW) {
      return null;
    }

    const obj = ServiceLocator.getCatalogManager().getObject(id);

    if (!obj) {
      return null;
    }

    const { gl } = ServiceLocator.getRenderer();
    const screen = ServiceLocator.getRenderer().getScreenCoords(obj);

    if (screen.error || !window.innerWidth || !window.innerHeight) {
      return null;
    }

    return {
      x: (screen.x * gl.drawingBufferWidth) / window.innerWidth,
      y: gl.drawingBufferHeight - (screen.y * gl.drawingBufferHeight) / window.innerHeight,
    };
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

      errorManagerInstance.warn(t7e('errorMsgs.Rendering.hoverPickDisabled').replace('{error}', msg));
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
      `
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
          `
        );

        this.groupToggleTimeItem_();

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
          rmbWrapperChildrenArray.forEach((child) => {
            rmbWrapper.appendChild(child);
          });
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
        { passive: false }
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
   * Moves the built-in Pause Clock entry into the "More" group when a plugin created that group,
   * keeping the top level for the frequent actions. Without the group it stays at the top level.
   */
  private groupToggleTimeItem_(): void {
    if (!this.rmbMenuItems.some((item) => item.isGroup && item.group === RMB_TOGGLE_TIME_GROUP)) {
      return;
    }

    const toggleTimeEl = getEl(RMB_TOGGLE_TIME_ID, true);

    if (!toggleTimeEl) {
      return;
    }

    addContextMenuGroupLevel1(RMB_TOGGLE_TIME_GROUP, RMB_TOGGLE_TIME_ID, RMB_TOGGLE_TIME_ORDER, toggleTimeEl, false);
    this.rmbMenuItems.push({
      elementIdL1: RMB_TOGGLE_TIME_ID,
      elementIdL2: '',
      order: RMB_TOGGLE_TIME_ORDER,
      isRmbOnEarth: true,
      isRmbOffEarth: true,
      isRmbOnSat: true,
      isVisible: () => true,
      group: RMB_TOGGLE_TIME_GROUP,
    });
    registerContextMenuGroup(this.rmbMenuItems, RMB_TOGGLE_TIME_GROUP);
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

  /**
   * Opens the right-click menu.
   *
   * @param clickedSatId object under the cursor (-1 for none)
   * @param canvasPoint canvas-relative click point. When omitted the input camera's last known
   * mouse position is used.
   */
  public openRmbMenu(clickedSatId: number = -1, canvasPoint?: { x: number; y: number }) {
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

    const isItemVisible = (item: rmbMenuItem) => (item.isVisible ? item.isVisible(ctx) : InputManager.isItemVisibleLegacy_(item, ctx));

    if (lineManagerInstance.lines.length > 0) {
      const clearLinesEl = getEl('clear-lines-rmb', true);

      if (clearLinesEl) {
        clearLinesEl.style.display = 'block';
      }
    }

    this.rmbMenuItems
      .filter((item) => !item.group)
      .filter(isItemVisible)
      .forEach((item) => {
        const dom = getEl(item.elementIdL1);

        if (dom) {
          dom.style.display = 'block';
        }
      });

    applyContextMenuGroupVisibility(this.rmbMenuItems, isItemVisible);

    rightBtnMenuDOM.style.display = 'block';
    satHoverBoxDOM.style.display = 'none';

    EventBus.getInstance().emit(EventBusEvent.rightBtnMenuOpen, ctx);

    const inputCamera = ServiceLocator.getViewportManager()?.getInputCamera() ?? ServiceLocator.getMainCamera();
    const clickX = canvasPoint?.x ?? inputCamera.state.mouseX;
    const clickY = canvasPoint?.y ?? inputCamera.state.mouseY;

    this.positionRmbMenu_(rightBtnMenuDOM, canvasDOM, clickX, clickY);
  }

  /**
   * Places the (already visible) right-click menu at the click point, flipping it left/up when it
   * would overflow the canvas, clamping it inside the canvas, and pushing it clear of any open
   * left-docked side menu.
   *
   * The menu is measured only after it is displayed and populated: a display:none element reports
   * a 0x0 size, which is what made the old fixed-offset math unreliable.
   */
  private positionRmbMenu_(menuEl: HTMLElement, canvasEl: HTMLElement, clickX: number, clickY: number): void {
    const menuUl = getEl('right-btn-menu-ul', true);
    const numMenuItems = menuUl ? Array.from(menuUl.children).filter((child) => (<HTMLElement>child).style.display !== 'none').length : this.rmbMenuItems.length;

    menuEl.style.textAlign = 'center';
    menuEl.style.position = 'absolute';

    const x = Number.isFinite(clickX) ? clickX : 0;
    const y = Number.isFinite(clickY) ? clickY : 0;

    // Provisional placement so the measured rect reflects the real offset parent.
    menuEl.style.left = `${x}px`;
    menuEl.style.top = `${y}px`;

    const menuRect = menuEl.getBoundingClientRect();
    // Fallbacks match the sizes in style.css for environments without layout (jsdom).
    const menuW = menuRect.width || menuEl.offsetWidth || 180;
    const menuH = menuRect.height || menuEl.offsetHeight || numMenuItems * 25;
    const boundsW = canvasEl.clientWidth || window.innerWidth;
    const boundsH = canvasEl.clientHeight || window.innerHeight;

    let left = x + menuW > boundsW ? x - menuW : x;
    let top = y + menuH > boundsH ? y - menuH : y;

    left = Math.max(0, Math.min(left, boundsW - menuW));
    top = Math.max(0, Math.min(top, boundsH - menuH));

    // Client-space origin of the menu's offset parent, derived from the provisional placement.
    const originX = menuRect.width > 0 ? menuRect.left - x : 0;
    const originY = menuRect.height > 0 ? menuRect.top - y : 0;
    const sideMenuRight = InputManager.getOpenSideMenuRightEdge_(originY + top, originY + top + menuH);

    if (sideMenuRight !== null && originX + left < sideMenuRight) {
      left = Math.min(sideMenuRight - originX, Math.max(0, boundsW - menuW));
    }

    menuEl.style.left = `${left}px`;
    menuEl.style.top = `${top}px`;
  }

  /**
   * Right edge (client px) of the widest open left-docked side menu that vertically overlaps the
   * given client-space band, or null when none does.
   */
  private static getOpenSideMenuRightEdge_(bandTop: number, bandBottom: number): number | null {
    let rightEdge: number | null = null;

    document.querySelectorAll<HTMLElement>('.side-menu-parent').forEach((sideMenu) => {
      if (sideMenu.style.display === 'none') {
        return;
      }

      const rect = sideMenu.getBoundingClientRect();

      // Only left-docked menus (starting in the left half of the window) push the context menu right.
      if (rect.width <= 0 || rect.height <= 0 || rect.left > window.innerWidth / 2) {
        return;
      }
      if (rect.bottom <= bandTop || rect.top >= bandBottom) {
        return;
      }

      rightEdge = Math.max(rightEdge ?? -Infinity, rect.right);
    });

    return rightEdge;
  }

  /* istanbul ignore next */
  /** @returns true when the readback actually landed in `dstBuffer`. */
  public async readPixelsAsync(x: number, y: number, w: number, h: number, format: number, type: number, dstBuffer: Uint8Array): Promise<boolean> {
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

      return true;
    } catch {
      this.isAsyncWorking = false;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

      return false;
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
        if (!this.isPointerOverCanvas) {
          this.mouse.mouseSat = -1;
        } else if (Date.now() - this.lastUpdateTime > 100) {
          this.mouse.mouseSat = this.getSatIdFromCoord(inputCamera.state.mouseX, inputCamera.state.mouseY);
          this.lastUpdateTime = Date.now();
        }
      }
    }
  }
}
