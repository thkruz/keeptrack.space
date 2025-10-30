import { ToastMsgType } from '@app/engine/core/interfaces';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { errorManagerInstance } from '../utils/errorManager';
import { Camera, CameraType } from './camera';
import { CameraState } from './state/camera-state';
import { ServiceLocator } from '../core/service-locator';

export class CameraInputHandler {
  private readonly camera: Camera;
  private readonly state: CameraState;

  /**
   * 1 = off
   *
   * 5 = on
   */
  isHoldingDownAKey: number = 1;

  constructor(camera: Camera) {
    this.camera = camera;
    this.state = camera.state;
  }

  init() {
    this.registerKeyboardEvents();

    EventBus.getInstance().on(EventBusEvent.canvasMouseDown, this.canvasMouseDown_.bind(this));
    EventBus.getInstance().on(EventBusEvent.touchStart, this.touchStart_.bind(this));
    EventBus.getInstance().on(EventBusEvent.KeyUp, (key: string, _code, _isRepeat: boolean, isShift: boolean) => {
      if (key === 'Shift' && !isShift) {
        this.state.fpsRun = 1;
        settingsManager.cameraMovementSpeed = 0.003;
        settingsManager.cameraMovementSpeedMin = 0.005;
        this.state.speedModifier = 1;
      }
    });
  }

  canvasMouseDown_(evt: MouseEvent) {
    if (this.state.speedModifier === 1) {
      settingsManager.cameraMovementSpeed = 0.003;
      settingsManager.cameraMovementSpeedMin = 0.005;
    }

    this.state.screenDragPoint = [this.state.mouseX, this.state.mouseY];
    this.state.dragStartPitch = this.state.camPitch;
    this.state.dragStartYaw = this.state.camYaw;

    if (evt.button === 0) {
      this.state.isDragging = true;
    }

    this.state.isAutoPitchYawToTarget = false;
    if (!settingsManager.disableUI) {
      this.camera.autoRotate(false);
    }
  }

  touchStart_() {
    settingsManager.cameraMovementSpeed = Math.max(0.005 * this.state.zoomLevel, settingsManager.cameraMovementSpeedMin);
    this.state.screenDragPoint = [this.state.mouseX, this.state.mouseY];
    this.state.dragStartPitch = this.state.camPitch;
    this.state.dragStartYaw = this.state.camYaw;
    this.state.isDragging = true;

    this.state.isAutoPitchYawToTarget = false;
    if (!settingsManager.disableUI) {
      this.camera.autoRotate(false);
    }
  }

  registerKeyboardEvents() {
    const keysDown = ['Shift', 'ShiftRight', 'W', 'A', 'S', 'D', 'Q', 'E', 'r', 'v', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const keysUp = ['Shift', 'ShiftRight', 'W', 'A', 'S', 'D', 'Q', 'E', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

    keysDown.forEach((keyForFunc) => {
      EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string) => {
        if (key === keyForFunc) {
          this[`keyDown${key}_`].bind(this)();
        } else if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
          this[`keyDown${key.toUpperCase()}_`].bind(this)();
        }
      });
    });
    keysUp.forEach((keyForFunc) => {
      EventBus.getInstance().on(EventBusEvent.KeyUp, (key: string) => {
        if (key === keyForFunc) {
          this[`keyUp${key}_`].bind(this)();
        } else if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
          this[`keyUp${key.toUpperCase()}_`].bind(this)();
        }
      });
    });

    ['Numpad8', 'Numpad2', 'Numpad4', 'Numpad6', 'NumpadAdd', 'NumpadSubtract'].forEach((codeForFunc) => {
      EventBus.getInstance().on(EventBusEvent.KeyDown, (_key: string, code: string) => {
        if (code === codeForFunc) {
          this[`keyDown${code}_`].bind(this)();
        }
      });
    });
    ['Numpad8', 'Numpad2', 'Numpad4', 'Numpad6'].forEach((codeForFunc) => {
      EventBus.getInstance().on(EventBusEvent.KeyUp, (_key: string, code: string) => {
        if (code === codeForFunc) {
          this[`keyUp${code}_`].bind(this)();
        }
      });
    });

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string, _code: string, isRepeat: boolean) => {
      if (key === '`' && !isRepeat) {
        this.camera.resetRotation();
      }
    });
  }

  keyDownArrowDown_() {
    if (!settingsManager.isAutoPanD) {
      this.camera.panDown();
    }
  }

  keyDownArrowLeft_() {
    if (!settingsManager.isAutoPanL) {
      this.camera.panLeft();
    }
  }

  keyDownArrowRight_() {
    if (!settingsManager.isAutoPanR) {
      this.camera.panRight();
    }
  }

  keyDownArrowUp_() {
    if (!settingsManager.isAutoPanU) {
      this.camera.panUp();
    }
  }

  keyUpArrowDown_() {
    if (settingsManager.isAutoPanD) {
      this.camera.panDown();
    }
  }

  keyUpArrowLeft_() {
    if (settingsManager.isAutoPanL) {
      this.camera.panLeft();
    }
  }

  keyUpArrowRight_() {
    if (settingsManager.isAutoPanR) {
      this.camera.panRight();
    }
  }

  keyUpArrowUp_() {
    if (settingsManager.isAutoPanU) {
      this.camera.panUp();
    }
  }

  keyDownv_() {
    const uiManagerInstance = ServiceLocator.getUiManager();
    const orbitManagerInstance = ServiceLocator.getOrbitManager();

    this.camera.changeCameraType(orbitManagerInstance);

    switch (this.camera.cameraType) {
      case CameraType.FIXED_TO_EARTH:
        uiManagerInstance.toast('Earth Centered Camera Mode', ToastMsgType.standby);
        this.camera.state.zoomTarget = 0.5;
        break;
      case CameraType.OFFSET:
        uiManagerInstance.toast('Offset Camera Mode', ToastMsgType.standby);
        break;
      case CameraType.FIXED_TO_SAT:
        uiManagerInstance.toast('Fixed to Satellite Camera Mode', ToastMsgType.standby);
        break;
      case CameraType.FPS:
        uiManagerInstance.toast('Free Camera Mode', ToastMsgType.standby);
        break;
      case CameraType.PLANETARIUM:
        uiManagerInstance.toast('Planetarium Camera Mode', ToastMsgType.standby);
        break;
      case CameraType.SATELLITE:
        uiManagerInstance.toast('Satellite Camera Mode', ToastMsgType.standby);
        break;
      case CameraType.ASTRONOMY:
        uiManagerInstance.toast('Astronomy Camera Mode', ToastMsgType.standby);
        break;
      default:
        errorManagerInstance.log(`Invalid Camera Type: ${this.camera.cameraType}`);
        break;
    }
  }

  keyDownA_() {
    if (this.camera.cameraType === CameraType.FPS) {
      this.state.fpsSideSpeed = -settingsManager.fpsSideSpeed;
      this.state.isFPSSideSpeedLock = true;
    }
  }

  keyDownD_() {
    if (this.camera.cameraType === CameraType.FPS) {
      this.state.fpsSideSpeed = settingsManager.fpsSideSpeed;
      this.state.isFPSSideSpeedLock = true;
    }
  }

  keyDownE_() {
    if (this.camera.cameraType === CameraType.FPS) {
      this.state.fpsVertSpeed = settingsManager.fpsVertSpeed;
      this.state.isFPSVertSpeedLock = true;
    }
    if (this.camera.cameraType === CameraType.SATELLITE || this.camera.cameraType === CameraType.ASTRONOMY) {
      this.state.fpsRotateRate = -settingsManager.fpsRotateRate / this.state.speedModifier;
    }
  }

  keyDownNumpad8_() {
    switch (this.camera.cameraType) {
      case CameraType.FIXED_TO_EARTH:
      case CameraType.FIXED_TO_SAT:
        settingsManager.isAutoRotateU = true;
        this.state.isAutoRotate = true;
        this.isHoldingDownAKey = 5;
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE:
      case CameraType.PLANETARIUM:
      case CameraType.ASTRONOMY:
        this.state.fpsPitchRate = settingsManager.fpsPitchRate / this.state.speedModifier;
        break;
      default:
        break;
    }
  }

  keyDownNumpad2_() {
    switch (this.camera.cameraType) {
      case CameraType.FIXED_TO_EARTH:
      case CameraType.FIXED_TO_SAT:
        settingsManager.isAutoRotateD = true;
        this.isHoldingDownAKey = 5;
        this.state.isAutoRotate = true;
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE:
      case CameraType.PLANETARIUM:
      case CameraType.ASTRONOMY:
        this.state.fpsPitchRate = settingsManager.fpsPitchRate / this.state.speedModifier;
        break;
      default:
        break;
    }
  }

  keyDownNumpad4_() {
    switch (this.camera.cameraType) {
      case CameraType.FIXED_TO_EARTH:
      case CameraType.FIXED_TO_SAT:
        settingsManager.isAutoRotateL = true;
        this.isHoldingDownAKey = 5;
        this.state.isAutoRotate = true;
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE:
        this.state.fpsYawRate = -settingsManager.fpsYawRate / this.state.speedModifier;
        break;
      case CameraType.PLANETARIUM:
      case CameraType.ASTRONOMY:
        this.state.fpsRotateRate = settingsManager.fpsRotateRate / this.state.speedModifier;
        break;
      default:
        break;
    }
  }

  keyDownNumpad6_() {
    switch (this.camera.cameraType) {
      case CameraType.FIXED_TO_EARTH:
      case CameraType.FIXED_TO_SAT:
        settingsManager.isAutoRotateR = true;
        this.isHoldingDownAKey = 5;
        this.state.isAutoRotate = true;
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE:
        this.state.fpsYawRate = settingsManager.fpsYawRate / this.state.speedModifier;
        break;
      case CameraType.PLANETARIUM:
      case CameraType.ASTRONOMY:
        this.state.fpsRotateRate = settingsManager.fpsRotateRate / this.state.speedModifier;
        break;
      default:
        break;
    }
  }

  keyDownNumpadAdd_() {
    this.camera.zoomIn();
  }

  keyDownNumpadSubtract_() {
    this.camera.zoomOut();
  }

  keyDownQ_() {
    if (this.camera.cameraType === CameraType.FPS) {
      this.state.fpsVertSpeed = -settingsManager.fpsVertSpeed;
      this.state.isFPSVertSpeedLock = true;
    }
    if (this.camera.cameraType === CameraType.SATELLITE || this.camera.cameraType === CameraType.ASTRONOMY) {
      this.state.fpsRotateRate = settingsManager.fpsRotateRate / this.state.speedModifier;
    }
  }

  keyDownr_() {
    this.camera.autoRotate();
  }

  keyDownS_() {
    if (this.camera.cameraType === CameraType.FPS) {
      this.state.fpsForwardSpeed = -settingsManager.fpsForwardSpeed;
      this.state.isFPSForwardSpeedLock = true;
    }
  }

  keyDownShiftRight_() {
    if (this.camera.cameraType === CameraType.FPS) {
      this.state.fpsRun = 3;
    }
  }

  keyDownShift_() {
    if (this.camera.cameraType === CameraType.FPS) {
      this.state.fpsRun = 0.05;
    }
    this.state.speedModifier = 8;
    settingsManager.cameraMovementSpeed = 0.003 / 8;
    settingsManager.cameraMovementSpeedMin = 0.005 / 8;
  }

  keyDownW_() {
    if (this.camera.cameraType === CameraType.FPS) {
      this.state.fpsForwardSpeed = settingsManager.fpsForwardSpeed;
      this.state.isFPSForwardSpeedLock = true;
    }
  }

  keyUpA_() {
    if (this.state.fpsSideSpeed === -settingsManager.fpsSideSpeed) {
      this.state.isFPSSideSpeedLock = false;
    }
  }

  keyUpD_() {
    if (this.state.fpsSideSpeed === settingsManager.fpsSideSpeed) {
      this.state.isFPSSideSpeedLock = false;
    }
  }

  keyUpE_() {
    if (this.state.fpsVertSpeed === settingsManager.fpsVertSpeed) {
      this.state.isFPSVertSpeedLock = false;
    }
    this.state.fpsRotateRate = 0;
  }

  keyUpNumpad8_() {
    settingsManager.isAutoRotateU = false;
    this.state.fpsPitchRate = 0;
    if (!settingsManager.isAutoRotateD && !settingsManager.isAutoRotateU && !settingsManager.isAutoRotateL && !settingsManager.isAutoRotateR) {
      this.isHoldingDownAKey = 1;
      this.camera.autoRotate(false);
    }
  }

  // Intentionally the same as keyUpI_
  keyUpNumpad2_() {
    settingsManager.isAutoRotateD = false;
    this.state.fpsPitchRate = 0;
    if (!settingsManager.isAutoRotateD && !settingsManager.isAutoRotateU && !settingsManager.isAutoRotateL && !settingsManager.isAutoRotateR) {
      this.isHoldingDownAKey = 1;
      this.camera.autoRotate(false);
    }
  }

  keyUpNumpad4_() {
    if (this.camera.cameraType === CameraType.ASTRONOMY) {
      this.state.fpsRotateRate = 0;
    } else {
      this.state.fpsYawRate = 0;
    }
    settingsManager.isAutoRotateL = false;
    if (!settingsManager.isAutoRotateD && !settingsManager.isAutoRotateU && !settingsManager.isAutoRotateL && !settingsManager.isAutoRotateR) {
      this.isHoldingDownAKey = 1;
      this.camera.autoRotate(false);
    }
  }

  // Intentionally the same as keyUpJ_
  keyUpNumpad6_() {
    if (this.camera.cameraType === CameraType.ASTRONOMY) {
      this.state.fpsRotateRate = 0;
    } else {
      this.state.fpsYawRate = 0;
    }
    settingsManager.isAutoRotateR = false;
    if (!settingsManager.isAutoRotateD && !settingsManager.isAutoRotateU && !settingsManager.isAutoRotateL && !settingsManager.isAutoRotateR) {
      this.isHoldingDownAKey = 1;
      this.camera.autoRotate(false);
    }
  }

  keyUpQ_() {
    if (this.state.fpsVertSpeed === -settingsManager.fpsVertSpeed) {
      this.state.isFPSVertSpeedLock = false;
    }
    this.state.fpsRotateRate = 0;
  }

  keyUpS_() {
    if (this.state.fpsForwardSpeed === -settingsManager.fpsForwardSpeed) {
      this.state.isFPSForwardSpeedLock = false;
    }
  }

  keyUpShiftRight_() {
    this.state.fpsRun = 1;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    this.state.speedModifier = 1;
  }

  keyUpShift_() {
    this.state.fpsRun = 1;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    this.state.speedModifier = 1;
    if (!this.state.isFPSForwardSpeedLock) {
      this.state.fpsForwardSpeed = 0;
    }
    if (!this.state.isFPSSideSpeedLock) {
      this.state.fpsSideSpeed = 0;
    }
    if (!this.state.isFPSVertSpeedLock) {
      this.state.fpsVertSpeed = 0;
    }
  }

  keyUpW_() {
    if (this.state.fpsForwardSpeed === settingsManager.fpsForwardSpeed) {
      this.state.isFPSForwardSpeedLock = false;
    }
  }
}
