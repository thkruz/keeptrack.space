import { ToastMsgType } from '@app/engine/core/interfaces';
import { KeyboardShortcutRegistry } from '@app/engine/core/keyboard-shortcut-registry';
import { IKeyboardShortcut } from '@app/engine/plugins/core/plugin-capabilities';
import { ServiceLocator } from '../core/service-locator';
import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { errorManagerInstance } from '../utils/errorManager';
import { Camera } from './camera';
import { CameraType } from './camera-type';
import { CameraState } from './state/camera-state';

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
    // Only the main camera's handler is subscribed; it dispatches the drag
    // start to whichever pane captured the pointer (multi-view input routing)
    const camera = ServiceLocator.getViewportManager()?.getInputCamera() ?? this.camera;
    const state = camera.state;

    if (state.speedModifier === 1) {
      settingsManager.cameraMovementSpeed = 0.003;
      settingsManager.cameraMovementSpeedMin = 0.005;
    }

    state.screenDragPoint = [state.mouseX, state.mouseY];
    state.dragStartPitch = state.camPitch;
    state.dragStartYaw = state.camYaw;

    if (evt.button === 0) {
      state.isDragging = true;
    }

    camera.transition.cancel();
    state.isAutoPitchYawToTarget = false;
    if (!settingsManager.disableUI) {
      camera.autoRotate(false);
    }
  }

  touchStart_() {
    settingsManager.cameraMovementSpeed = Math.max(settingsManager.touchCameraMovementSpeed * this.state.zoomLevel, settingsManager.cameraMovementSpeedMin);
    this.state.screenDragPoint = [this.state.mouseX, this.state.mouseY];
    this.state.dragStartPitch = this.state.camPitch;
    this.state.dragStartYaw = this.state.camYaw;
    this.state.isDragging = true;

    this.camera.transition.cancel();
    this.state.isAutoPitchYawToTarget = false;
    if (!settingsManager.disableUI) {
      this.camera.autoRotate(false);
    }
  }

  registerKeyboardEvents() {
    // Register camera keys in the shortcut registry for conflict detection.
    // Camera inits before plugins, so these registrations win on conflict.
    const noop = () => {
      /* handled via EventBus */
    };
    const cameraShortcuts: IKeyboardShortcut[] = [
      { key: 'ArrowUp', callback: noop },
      { key: 'ArrowDown', callback: noop },
      { key: 'ArrowLeft', callback: noop },
      { key: 'ArrowRight', callback: noop },
      // WASD+QE omitted — camera handles them via EventBus and they are
      // only active in FPS / special camera modes.  Keeping them out of the
      // registry lets plugins claim those keys for menu toggles.
      { key: 'r', callback: noop },
      { key: 'v', callback: noop },
      { key: '`', callback: noop },
      { key: 'Shift', callback: noop },
    ];

    KeyboardShortcutRegistry.register('CameraInputHandler', cameraShortcuts);

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

    this.camera.changeCameraType();

    switch (this.camera.cameraType) {
      case CameraType.FIXED_TO_EARTH:
        uiManagerInstance.toast('Earth Centered Camera Mode', ToastMsgType.standby);
        this.camera.state.zoomTarget = 0.5;
        break;
      case CameraType.FIXED_TO_SAT_LVLH:
        uiManagerInstance.toast('Fixed to Satellite (LVLH) Camera Mode', ToastMsgType.standby);
        break;
      case CameraType.FIXED_TO_SAT_ECI:
        uiManagerInstance.toast('Fixed to Satellite (ECI) Camera Mode', ToastMsgType.standby);
        break;
      case CameraType.FPS:
        uiManagerInstance.toast('Free Camera Mode', ToastMsgType.standby);
        break;
      case CameraType.PLANETARIUM:
        uiManagerInstance.toast('Planetarium Camera Mode', ToastMsgType.standby);
        break;
      case CameraType.SATELLITE_FIRST_PERSON:
        uiManagerInstance.toast('Satellite First Person Camera Mode', ToastMsgType.standby);
        break;
      case CameraType.ASTRONOMY:
        uiManagerInstance.toast('Astronomy Camera Mode', ToastMsgType.standby);
        break;
      case CameraType.FLAT_MAP:
        uiManagerInstance.toast('Flat Map Camera Mode', ToastMsgType.standby);
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
    if (this.camera.cameraType === CameraType.SATELLITE_FIRST_PERSON || this.camera.cameraType === CameraType.ASTRONOMY) {
      this.state.fpsRotateRate = -settingsManager.fpsRotateRate / this.state.speedModifier;
    }
  }

  keyDownNumpad8_() {
    switch (this.camera.cameraType) {
      case CameraType.FIXED_TO_EARTH:
      case CameraType.FIXED_TO_SAT_LVLH:
      case CameraType.FIXED_TO_SAT_ECI:
        settingsManager.isAutoRotateU = true;
        this.state.isAutoRotate = true;
        this.isHoldingDownAKey = 5;
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE_FIRST_PERSON:
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
      case CameraType.FIXED_TO_SAT_LVLH:
      case CameraType.FIXED_TO_SAT_ECI:
        settingsManager.isAutoRotateD = true;
        this.isHoldingDownAKey = 5;
        this.state.isAutoRotate = true;
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE_FIRST_PERSON:
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
      case CameraType.FIXED_TO_SAT_LVLH:
      case CameraType.FIXED_TO_SAT_ECI:
        settingsManager.isAutoRotateL = true;
        this.isHoldingDownAKey = 5;
        this.state.isAutoRotate = true;
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE_FIRST_PERSON:
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
      case CameraType.FIXED_TO_SAT_LVLH:
      case CameraType.FIXED_TO_SAT_ECI:
        settingsManager.isAutoRotateR = true;
        this.isHoldingDownAKey = 5;
        this.state.isAutoRotate = true;
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE_FIRST_PERSON:
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
    if (this.camera.cameraType === CameraType.SATELLITE_FIRST_PERSON || this.camera.cameraType === CameraType.ASTRONOMY) {
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
