import { Camera } from '@app/engine/camera/camera';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
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

  init(canvasDOM: HTMLCanvasElement) {
    this.canvasDOM = canvasDOM;

    if (settingsManager.isMobileModeEnabled) {
      canvasDOM.addEventListener('touchstart', (e) => {
        this.canvasTouchStart(e);
      });
      canvasDOM.addEventListener('touchend', (e) => {
        this.canvasTouchEnd(e, ServiceLocator.getMainCamera());
      });
      canvasDOM.addEventListener('touchmove', (e) => {
        this.canvasTouchMove(e);
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

    // Reset if last finger
    if (evt.touches?.length === 0) {
      this.isPinching = false;
      this.isPanning = false;
      mainCameraInstance.state.mouseX = 0;
      mainCameraInstance.state.mouseY = 0;
      this.dragHasMoved = false;
      mainCameraInstance.state.isDragging = false;
    }
  }

  public canvasTouchMove(evt: TouchEvent): void {
    if (settingsManager.disableNormalEvents) {
      evt.preventDefault();
    }

    // Can't move if there is no touch
    if (!evt.touches || evt.touches.length < 1) {
      return;
    }

    this.touchX = evt.touches[0].clientX;
    this.touchY = evt.touches[0].clientY;

    if (this.isPinching && evt.touches?.[0] && evt.touches?.[1]) {
      const currentPinchDistance = Math.hypot(evt.touches[0].pageX - evt.touches[1].pageX, evt.touches[0].pageY - evt.touches[1].pageY);

      if (isNaN(currentPinchDistance)) {
        return;
      }

      if (currentPinchDistance > this.tapMovementThreshold) {
        this.pinchMove({
          pinchDistance: currentPinchDistance,
        });
      }
    } else if (!this.isPinching) {
      if (Math.abs(this.touchStartX - this.touchX) > this.tapMovementThreshold || Math.abs(this.touchStartY - this.touchY) > this.tapMovementThreshold) {
        this.isPanning = true;
        this.pan({
          x: this.touchX,
          y: this.touchY,
        });
      }
    }
  }

  public canvasTouchStart(evt: TouchEvent): void {
    this.touchStartTime = Date.now();

    if (evt.touches.length > 1) {
      this.isPinching = true;
      this.pinchStart({
        pinchDistance: Math.hypot(evt.touches[0].pageX - evt.touches[1].pageX, evt.touches[0].pageY - evt.touches[1].pageY),
      });
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
    ServiceLocator.getMainCamera().state.mouseX = this.touchStartX; // Move this
    ServiceLocator.getMainCamera().state.mouseY = this.touchStartY; // Move this

    // If you hit the canvas hide any popups
    ServiceLocator.getInputManager().hidePopUps();

    EventBus.getInstance().emit(EventBusEvent.touchStart, evt);
  }

  tap(evt: TapTouchEvent) {
    this.lastEvent = evt;

    // Stop auto movement
    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;
    ServiceLocator.getMainCamera().autoRotate(false);

    // Try to select satellite
    const satId = ServiceLocator.getInputManager().getSatIdFromCoord(evt.x, evt.y);

    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(satId);
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
  }

  pinchMove(evt: PinchTouchEvent) {
    this.lastEvent = evt;

    const mainCameraInstance = ServiceLocator.getMainCamera();

    this.deltaPinchDistance = (this.startPinchDistance - evt.pinchDistance) / this.maxPinchSize;
    let zoomTarget = mainCameraInstance.state.zoomTarget;

    zoomTarget += this.deltaPinchDistance * settingsManager.zoomSpeed;
    zoomTarget = Math.min(Math.max(zoomTarget, 0.0001), 1); // Force between 0 and 1
    mainCameraInstance.state.zoomTarget = zoomTarget;
  }

  rotate(evt: TouchEvent) {
    // TODO: Implement
    this.lastEvent = evt;
  }
}
