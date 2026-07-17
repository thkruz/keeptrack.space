import { Camera } from '@app/engine/camera/camera';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { normalizeAngle } from '@app/engine/utils/transforms';
import { KeepTrack } from '@app/keeptrack';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Radians } from '@ootk/src/main';
import { MouseInput } from './mouse-input';

export interface TapTouchEvent {
  x: number;
  y: number;
}

export interface PanTouchEvent {
  x: number;
  y: number;
}

export interface PinchTouchEvent {
  /**
   * The distance between the two fingers
   */
  pinchDistance: number;
  /**
   * The angle in radians of the line between the two fingers (screen coordinates, y down)
   */
  pinchAngle: number;
}

interface CachedTouch {
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  identifier: number;
}

export class TouchInput {
  mouse: MouseInput;
  canvasDOM: HTMLCanvasElement;
  lastEvent: TouchEvent | TapTouchEvent | PanTouchEvent | PinchTouchEvent;
  /**
   * Is a pinch gesture currently happening
   */
  isPinching = false;
  /**
   * The distance between the two fingers at the start of the pinch
   */
  startPinchDistance = 0;
  /**
   * The angle between the two fingers at the start of the pinch, then re-anchored as the
   * twist gesture progresses (see pinchMove)
   */
  startPinchAngle = 0;
  /**
   * Has the current two-finger gesture crossed the twist activation threshold
   */
  isTwisting = false;
  /**
   * Radians of twist required before two-finger rotation engages.
   * Keeps straight pinch-zooms from wobbling the camera roll.
   */
  twistActivationThreshold = 0.15;
  touchSat: number;
  mouseSat: number;
  touchStartTime: number;
  deltaPinchDistance: number;
  /**
   * The maximum distance in pixels that a pinch can be
   */
  maxPinchSize = Math.hypot(window.innerWidth, window.innerHeight);
  dragHasMoved: boolean;
  isPanning: boolean;
  touchX: number;
  touchY: number;
  touchStartX: number;
  touchStartY: number;
  /**
   * The distance in pixels that a tap must move to be considered a pan
   */
  tapMovementThreshold: number = 15;
  /**
   * The time in ms that a tap must be held for to be considered a press
   */
  pressMinTime = 150;

  private touchMoveRafId_ = -1;
  private cachedTouches_: CachedTouch[] = [];
  private debugOverlay_: HTMLDivElement | null = null;
  private tapMarker_: HTMLDivElement | null = null;

  private ensureDebugOverlay_(): HTMLDivElement {
    if (!this.debugOverlay_) {
      this.debugOverlay_ = document.createElement('div');
      this.debugOverlay_.id = 'touch-debug-overlay';
      this.debugOverlay_.style.cssText =
        'position:fixed;top:0;left:0;z-index:99999;background:rgba(0,0,0,0.85);' +
        'color:#0f0;font:11px monospace;padding:8px;pointer-events:none;white-space:pre;max-width:100vw;overflow:auto;max-height:60vh;';
      document.body.appendChild(this.debugOverlay_);
    }

    return this.debugOverlay_;
  }

  private showTapMarker_(rawX: number, rawY: number, corrX: number, corrY: number): void {
    if (!this.tapMarker_) {
      this.tapMarker_ = document.createElement('div');
      this.tapMarker_.style.cssText = 'position:fixed;z-index:99998;pointer-events:none;';
      document.body.appendChild(this.tapMarker_);
    }

    this.tapMarker_.innerHTML =
      // Red crosshair at raw clientX/Y
      `<div style="position:fixed;left:${rawX - 10}px;top:${rawY - 10}px;width:20px;height:20px;border:2px solid red;border-radius:50%;"></div>` +
      `<div style="position:fixed;left:${rawX}px;top:${rawY - 15}px;width:1px;height:30px;background:red;"></div>` +
      `<div style="position:fixed;left:${rawX - 15}px;top:${rawY}px;width:30px;height:1px;background:red;"></div>` +
      // Green crosshair at corrected coordinates
      `<div style="position:fixed;left:${corrX - 8}px;top:${corrY - 8}px;width:16px;height:16px;border:2px solid lime;border-radius:50%;"></div>` +
      `<div style="position:fixed;left:${corrX}px;top:${corrY - 12}px;width:1px;height:24px;background:lime;"></div>` +
      `<div style="position:fixed;left:${corrX - 12}px;top:${corrY}px;width:24px;height:1px;background:lime;"></div>` +
      // Labels
      `<div style="position:fixed;left:${rawX + 15}px;top:${rawY - 25}px;color:red;font:10px monospace;background:rgba(0,0,0,0.7);padding:2px;">` +
      `RAW (${rawX.toFixed(0)},${rawY.toFixed(0)})</div>` +
      `<div style="position:fixed;left:${corrX + 15}px;top:${corrY + 10}px;color:lime;font:10px monospace;background:rgba(0,0,0,0.7);padding:2px;">` +
      `CORR (${corrX.toFixed(0)},${corrY.toFixed(0)})</div>`;

    setTimeout(() => {
      if (this.tapMarker_) {
        this.tapMarker_.innerHTML = '';
      }
    }, 3000);
  }

  init(canvasDOM: HTMLCanvasElement) {
    this.canvasDOM = canvasDOM;

    if (settingsManager.isMobileModeEnabled) {
      // Prevent browser gesture interpretation (scroll, bounce, back-swipe)
      canvasDOM.style.touchAction = 'none';

      canvasDOM.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.canvasTouchStart(e);
      }, { passive: false });

      canvasDOM.addEventListener('touchend', (e) => {
        this.canvasTouchEnd(e, ServiceLocator.getMainCamera());
      }, { passive: false });

      canvasDOM.addEventListener('touchmove', (e) => {
        e.preventDefault();
        this.canvasTouchMove(e);
      }, { passive: false });

      // Recalculate max pinch size on orientation change or resize
      window.addEventListener('resize', () => {
        this.maxPinchSize = Math.hypot(window.innerWidth, window.innerHeight);
      });
    }
  }

  public canvasTouchEnd(evt: TouchEvent, mainCameraInstance: Camera) {
    const touchTime = Date.now() - this.touchStartTime;

    if (!this.isPanning && !this.isPinching) {
      if (touchTime > this.pressMinTime) {
        this.press(evt);
      } else {
        this.tap({
          x: this.touchStartX,
          y: this.touchStartY,
        });
      }
    }

    // A finger lifted but two or more remain: re-anchor the pinch to the surviving pair
    // so zoom and roll don't jump when the pair geometry changes
    if (evt.touches?.length >= 2) {
      this.pinchStart(this.measurePinch_(Array.from(evt.touches)));
    }

    // Transition from 2 fingers to 1: stop rotation to prevent jerk
    if (evt.touches?.length === 1) {
      this.isPinching = false;
      this.isPanning = false;
      mainCameraInstance.state.isDragging = false;
      mainCameraInstance.state.camPitchSpeed = 0;
      mainCameraInstance.state.camYawSpeed = 0;

      // Record remaining finger position so a new single-finger drag
      // can start cleanly from the next touchmove threshold check
      const remaining = evt.touches[0];

      this.touchStartX = remaining.clientX;
      this.touchStartY = remaining.clientY;
    }

    // Reset if last finger — do NOT zero mouseX/mouseY so momentum uses last known position
    if (evt.touches?.length === 0) {
      this.isPinching = false;
      this.isPanning = false;
      this.dragHasMoved = false;
      mainCameraInstance.state.isDragging = false;
    }
  }

  public canvasTouchMove(evt: TouchEvent): void {
    // Can't move if there is no touch
    if (!evt.touches || evt.touches.length < 1) {
      return;
    }

    // Cache touch data synchronously (browser may recycle TouchEvent after handler returns)
    this.touchX = evt.touches[0].clientX;
    this.touchY = evt.touches[0].clientY;
    this.cachedTouches_ = Array.from(evt.touches).map((t) => ({
      clientX: t.clientX,
      clientY: t.clientY,
      pageX: t.pageX,
      pageY: t.pageY,
      identifier: t.identifier,
    }));

    // Throttle processing to once per animation frame (matches mouse-input pattern)
    if (this.touchMoveRafId_ === -1) {
      this.touchMoveRafId_ = requestAnimationFrame(() => {
        this.processTouchMove_();
        this.touchMoveRafId_ = -1;
      });
    }
  }

  private processTouchMove_(): void {
    const touches = this.cachedTouches_;

    if (this.isPinching && touches.length >= 2) {
      // Two-finger gesture: pinch zoom + twist roll (no pitch/yaw to prevent jerk on finger release)
      const pinch = this.measurePinch_(touches);

      if (!isNaN(pinch.pinchDistance) && pinch.pinchDistance > this.tapMovementThreshold) {
        this.pinchMove(pinch);
      }
    } else if (!this.isPinching) {
      // Single-finger pan
      if (
        Math.abs(this.touchStartX - this.touchX) > this.tapMovementThreshold ||
        Math.abs(this.touchStartY - this.touchY) > this.tapMovementThreshold
      ) {
        this.isPanning = true;
        this.pan({ x: this.touchX, y: this.touchY });
      }
    }
  }

  /**
   * Measures the distance and angle between the two lowest-identifier touches. Sorting by
   * identifier keeps the finger pairing stable across frames — TouchList order is not guaranteed,
   * and an unstable pair would flip the measured angle by PI mid-gesture.
   */
  private measurePinch_(touches: readonly CachedTouch[]): PinchTouchEvent {
    const [a, b] = [...touches].sort((t1, t2) => t1.identifier - t2.identifier);

    return {
      pinchDistance: Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY),
      pinchAngle: Math.atan2(a.pageY - b.pageY, a.pageX - b.pageX),
    };
  }

  public canvasTouchStart(evt: TouchEvent): void {
    this.touchStartTime = Date.now();

    if (evt.touches.length > 1) {
      this.isPinching = true;
      this.isPanning = false;
      this.pinchStart(this.measurePinch_(Array.from(evt.touches)));

      // Stop rotation drag — pinch is zoom-only
      const cam = ServiceLocator.getMainCamera();

      cam.state.isDragging = false;
      cam.state.camPitchSpeed = 0;
      cam.state.camYawSpeed = 0;
    } else {
      this.touchStart({
        x: evt.touches[0].clientX,
        y: evt.touches[0].clientY,
      });
    }
  }

  /**
   * Start of a single finger touch event
   */
  touchStart(evt: TapTouchEvent | PanTouchEvent) {
    this.lastEvent = evt;

    this.touchStartX = evt.x;
    this.touchStartY = evt.y;
    ServiceLocator.getMainCamera().state.mouseX = evt.x;
    ServiceLocator.getMainCamera().state.mouseY = evt.y;

    // If you hit the canvas hide any popups
    ServiceLocator.getInputManager().hidePopUps();

    EventBus.getInstance().emit(EventBusEvent.touchStart, evt);
  }

  tap(evt: TapTouchEvent) {
    this.lastEvent = evt;

    // Stop auto movement
    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;
    ServiceLocator.getMainCamera().autoRotate(false);

    const inputManager = ServiceLocator.getInputManager();

    if (settingsManager.debugMobilePicking) {
      this.tapDebug_(evt, inputManager);

      return;
    }

    // Try to select satellite
    const satId = inputManager.getSatIdFromCoord(evt.x, evt.y);

    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(satId);
  }

  private tapDebug_(evt: TapTouchEvent, inputManager: ReturnType<typeof ServiceLocator.getInputManager>): void {
    const gl = ServiceLocator.getRenderer().gl;
    const canvas = this.canvasDOM;
    const rect = canvas.getBoundingClientRect();
    const container = KeepTrack.getInstance().containerRoot;

    // Compute corrected coordinates (matching mouse-input.ts offset logic)
    const rectCorrX = evt.x - rect.left;
    const rectCorrY = evt.y - rect.top;
    const containerOffX = container.scrollLeft - window.scrollX + container.offsetLeft;
    const containerOffY = container.scrollTop - window.scrollY + container.offsetTop;
    const containerCorrX = evt.x - containerOffX;
    const containerCorrY = evt.y - containerOffY;

    // Read with raw coordinates (current behavior)
    const rawId = inputManager.getSatIdFromCoord(evt.x, evt.y);
    // Read with rect-corrected coordinates
    const rectId = inputManager.getSatIdFromCoord(rectCorrX, rectCorrY);
    // Read with container-corrected coordinates (desktop mouse-input style)
    const containerId = inputManager.getSatIdFromCoord(containerCorrX, containerCorrY);

    // Neighborhood scan around raw coordinates
    const scan = inputManager.getSatIdFromCoordNeighborhood(evt.x, evt.y, 21);
    // Neighborhood scan around rect-corrected coordinates
    const scanCorr = inputManager.getSatIdFromCoordNeighborhood(rectCorrX, rectCorrY, 21);

    const overlay = this.ensureDebugOverlay_();

    overlay.textContent =
      '=== MOBILE PICKING DEBUG ===\n' +
      `raw clientXY:      (${evt.x.toFixed(1)}, ${evt.y.toFixed(1)})\n` +
      `rect-corrected:    (${rectCorrX.toFixed(1)}, ${rectCorrY.toFixed(1)})\n` +
      `container-corrected: (${containerCorrX.toFixed(1)}, ${containerCorrY.toFixed(1)})\n` +
      '---\n' +
      `canvas rect: L=${rect.left.toFixed(1)} T=${rect.top.toFixed(1)} W=${rect.width.toFixed(1)} H=${rect.height.toFixed(1)}\n` +
      `container offset: (${container.offsetLeft}, ${container.offsetTop})\n` +
      `drawingBuffer: ${gl.drawingBufferWidth}x${gl.drawingBufferHeight}\n` +
      `canvas elem: ${canvas.width}x${canvas.height}\n` +
      `canvas CSS: ${canvas.clientWidth}x${canvas.clientHeight}\n` +
      `devicePixelRatio: ${window.devicePixelRatio}\n` +
      '---\n' +
      `raw ID:       ${rawId}\n` +
      `rect ID:      ${rectId}\n` +
      `container ID: ${containerId}\n` +
      '---\n' +
      `21x21 scan (raw): nearest=${scan.id} offset=(${scan.offsetX},${scan.offsetY}) hits=${scan.hitCount}\n` +
      `21x21 scan (rect): nearest=${scanCorr.id} offset=(${scanCorr.offsetX},${scanCorr.offsetY}) hits=${scanCorr.hitCount}\n${
      scan.hitCount > 0 ? `raw hits:\n${scan.patchData}\n` : ''
      }${scanCorr.hitCount > 0 && scanCorr.patchData !== scan.patchData ? `rect hits:\n${scanCorr.patchData}\n` : ''}`;

    // Show visual crosshairs
    this.showTapMarker_(evt.x, evt.y, rectCorrX, rectCorrY);

    // Use rect-corrected ID for selection (fix probe)
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(rectId);
  }

  pan(evt: PanTouchEvent) {
    this.lastEvent = evt;

    const mainCameraInstance = ServiceLocator.getMainCamera();

    mainCameraInstance.state.mouseX = evt.x;
    mainCameraInstance.state.mouseY = evt.y;
    mainCameraInstance.state.camAngleSnappedOnSat = false;
  }

  swipe(evt: TouchEvent) {
    // TODO: Implement
    this.lastEvent = evt;
  }

  press(evt: TouchEvent) {
    this.lastEvent = evt;

    // Stop auto movement
    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;
    ServiceLocator.getMainCamera().autoRotate(false);

    ServiceLocator.getInputManager().openRmbMenu();
  }

  pinchStart(evt: PinchTouchEvent) {
    this.startPinchDistance = evt.pinchDistance;
    this.startPinchAngle = evt.pinchAngle;
    this.isTwisting = false;
  }

  pinchMove(evt: PinchTouchEvent) {
    this.lastEvent = evt;

    const mainCameraInstance = ServiceLocator.getMainCamera();

    // Ratio-based zoom: spread fingers (ratio > 1) = zoom in, pinch (ratio < 1) = zoom out
    const pinchRatio = evt.pinchDistance / this.startPinchDistance;

    // Reset for next frame's incremental calculation (prevents quadratic accumulation)
    this.startPinchDistance = evt.pinchDistance;

    // Zoom in distance-from-satellite space when a satellite is focused so the feel stays smooth
    // and consistent at any altitude, instead of scaling the exponential normalized zoom level.
    mainCameraInstance.zoomTouchPinch(pinchRatio);

    // Twist-to-roll: angle is cumulative from the gesture start until the activation threshold is
    // crossed, then re-anchored every frame so incremental deltas keep the view glued to the fingers.
    const twistDelta = normalizeAngle(<Radians>(evt.pinchAngle - this.startPinchAngle));

    if (this.isTwisting) {
      this.startPinchAngle = evt.pinchAngle;
      // Screen y points down, so a visually clockwise twist increases the touch angle, while a
      // clockwise image rotation needs a negative camera roll — hence the sign flip.
      mainCameraInstance.rollTouchTwist(<Radians>-twistDelta);
    } else if (Math.abs(twistDelta) > this.twistActivationThreshold) {
      // Latch rotation, discarding the pre-threshold twist so the view doesn't jump
      this.isTwisting = true;
      this.startPinchAngle = evt.pinchAngle;
    }
  }

  rotate(evt: TouchEvent) {
    // TODO: Implement
    this.lastEvent = evt;
  }
}
