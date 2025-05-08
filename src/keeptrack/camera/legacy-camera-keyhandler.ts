import { CameraControllerType, KeepTrackMainCamera } from '@app/keeptrack/camera/legacy-camera';
import { keepTrackApi } from '@app/keepTrackApi';
import { FirstPersonCameraController } from './controllers/first-person-camera-controller';

export class LegacyCameraKeyHandler {
  private isInitialized_ = false;

  constructor(private readonly camera_: KeepTrackMainCamera) {
    // Constructor logic
  }

  initialize() {
    if (this.isInitialized_) {
      return;
    }

    this.registerKeyboardEvents_();
    this.isInitialized_ = true;
  }

  private registerKeyboardEvents_() {
    const keyboardManager = keepTrackApi.getInputManager().keyboard;
    const keysDown = ['Shift', 'ShiftRight', 'W', 'A', 'S', 'D', 'Q', 'E', 'R', 'V', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const keysUp = ['Shift', 'ShiftRight', 'W', 'A', 'S', 'D', 'Q', 'E', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

    keysDown.forEach((key) => {
      keyboardManager.registerKeyDownEvent({
        key,
        callback: this[`keyDown${key}_`].bind(this),
      });
    });
    keysUp.forEach((key) => {
      keyboardManager.registerKeyUpEvent({
        key,
        callback: this[`keyUp${key}_`].bind(this),
      });
    });

    ['Numpad8', 'Numpad2', 'Numpad4', 'Numpad6'].forEach((code) => {
      keyboardManager.registerKeyDownEvent({
        key: code.replace('Numpad', ''),
        code,
        callback: this[`keyDown${code}_`].bind(this),
      });
    });
    ['Numpad8', 'Numpad2', 'Numpad4', 'Numpad6'].forEach((code) => {
      keyboardManager.registerKeyUpEvent({
        key: code.replace('Numpad', ''),
        code,
        callback: this[`keyUp${code}_`].bind(this),
      });
    });

    keyboardManager.registerKeyEvent({
      key: '`',
      callback: this.camera_.resetRotation.bind(this.camera_),
    });
  }

  keyDownArrowDown_() {
    if (!settingsManager.isAutoPanD) {
      this.panDown();
    }
  }

  keyDownArrowLeft_() {
    if (!settingsManager.isAutoPanL) {
      this.panLeft();
    }
  }

  keyDownArrowRight_() {
    if (!settingsManager.isAutoPanR) {
      this.panRight();
    }
  }

  keyDownArrowUp_() {
    if (!settingsManager.isAutoPanU) {
      this.panUp();
    }
  }

  keyUpArrowDown_() {
    if (settingsManager.isAutoPanD) {
      this.panDown();
    }
  }

  keyUpArrowLeft_() {
    if (settingsManager.isAutoPanL) {
      this.panLeft();
    }
  }

  keyUpArrowRight_() {
    if (settingsManager.isAutoPanR) {
      this.panRight();
    }
  }

  keyUpArrowUp_() {
    if (settingsManager.isAutoPanU) {
      this.panUp();
    }
  }

  panUp() {
    settingsManager.isAutoPanU = !settingsManager.isAutoPanU;
  }

  panDown() {
    settingsManager.isAutoPanD = !settingsManager.isAutoPanD;
  }

  panLeft() {
    settingsManager.isAutoPanL = !settingsManager.isAutoPanL;
  }

  panRight() {
    settingsManager.isAutoPanR = !settingsManager.isAutoPanR;
  }

  keyDownV_() {
    this.camera_.switchCameraController();
  }

  keyDownA_() {
    if (this.camera_.activeCameraType === CameraControllerType.FIRST_PERSON) {
      this.camera_.fpsSideSpeed = -settingsManager.fpsSideSpeed;
      this.camera_.isFPSSideSpeedLock = true;
    }
  }

  keyDownD_() {
    if (this.camera_.activeCameraType === CameraControllerType.FIRST_PERSON) {
      this.camera_.fpsSideSpeed = settingsManager.fpsSideSpeed;
      this.camera_.isFPSSideSpeedLock = true;
    }
  }

  keyDownE_() {
    if (this.camera_.activeCameraType === CameraControllerType.FIRST_PERSON) {
      this.camera_.fpsVertSpeed = settingsManager.fpsVertSpeed;
      this.camera_.isFPSVertSpeedLock = true;
    }
    if (this.camera_.activeCameraType === CameraControllerType.SATELLITE_FIRST_PERSON || this.camera_.activeCameraType === CameraControllerType.ASTRONOMY) {
      this.camera_.fpsRotateRate = -settingsManager.fpsRotateRate / this.camera_.speedModifier;
    }
  }

  keyDownNumpad8_() {
    if (this.camera_.activeCameraController instanceof FirstPersonCameraController) {
      this.camera_.fpsPitchRate = settingsManager.fpsPitchRate / this.camera_.speedModifier;
    }
  }

  keyDownNumpad4_() {
    if (this.camera_.activeCameraController instanceof FirstPersonCameraController) {
      this.camera_.fpsYawRate = -settingsManager.fpsYawRate / this.camera_.speedModifier;
    }
  }

  keyDownNumpad2_() {
    if (this.camera_.activeCameraController instanceof FirstPersonCameraController) {
      this.camera_.fpsPitchRate = -settingsManager.fpsPitchRate / this.camera_.speedModifier;
    }
  }

  keyDownNumpad6_() {
    if (this.camera_.activeCameraController instanceof FirstPersonCameraController) {
      this.camera_.fpsYawRate = settingsManager.fpsYawRate / this.camera_.speedModifier;
    }
  }

  keyDownQ_() {
    if (this.camera_.activeCameraType === CameraControllerType.FIRST_PERSON) {
      this.camera_.fpsVertSpeed = -settingsManager.fpsVertSpeed;
      this.camera_.isFPSVertSpeedLock = true;
    }
    if (this.camera_.activeCameraType === CameraControllerType.SATELLITE_FIRST_PERSON || this.camera_.activeCameraType === CameraControllerType.ASTRONOMY) {
      this.camera_.fpsRotateRate = settingsManager.fpsRotateRate / this.camera_.speedModifier;
    }
  }

  keyDownR_() {
    this.camera_.autoRotate();
  }

  keyDownS_() {
    if (this.camera_.activeCameraType === CameraControllerType.FIRST_PERSON) {
      this.camera_.fpsForwardSpeed = -settingsManager.fpsForwardSpeed;
      this.camera_.isFPSForwardSpeedLock = true;
    }
  }

  keyDownShiftRight_() {
    if (this.camera_.activeCameraType === CameraControllerType.FIRST_PERSON) {
      this.camera_.fpsRun = 3;
    }
  }

  keyDownShift_() {
    if (this.camera_.activeCameraType === CameraControllerType.FIRST_PERSON) {
      this.camera_.fpsRun = 0.05;
    }
    this.camera_.speedModifier = 8;
    settingsManager.cameraMovementSpeed = 0.003 / 8;
    settingsManager.cameraMovementSpeedMin = 0.005 / 8;
  }

  keyDownW_() {
    if (this.camera_.activeCameraType === CameraControllerType.FIRST_PERSON) {
      this.camera_.fpsForwardSpeed = settingsManager.fpsForwardSpeed;
      this.camera_.isFPSForwardSpeedLock = true;
    }
  }

  keyUpA_() {
    if (this.camera_.fpsSideSpeed === -settingsManager.fpsSideSpeed) {
      this.camera_.isFPSSideSpeedLock = false;
    }
  }

  keyUpD_() {
    if (this.camera_.fpsSideSpeed === settingsManager.fpsSideSpeed) {
      this.camera_.isFPSSideSpeedLock = false;
    }
  }

  keyUpE_() {
    if (this.camera_.fpsVertSpeed === settingsManager.fpsVertSpeed) {
      this.camera_.isFPSVertSpeedLock = false;
    }
    this.camera_.fpsRotateRate = 0;
  }

  keyUpNumpad8_() {
    this.camera_.fpsPitchRate = 0;
  }

  // Intentionally the same as keyUpI_
  keyUpNumpad2_() {
    this.camera_.fpsPitchRate = 0;
  }

  keyUpNumpad4_() {
    if (this.camera_.activeCameraType === CameraControllerType.ASTRONOMY) {
      this.camera_.fpsRotateRate = 0;
    } else {
      this.camera_.fpsYawRate = 0;
    }
  }

  // Intentionally the same as keyUpJ_
  keyUpNumpad6_() {
    if (this.camera_.activeCameraType === CameraControllerType.ASTRONOMY) {
      this.camera_.fpsRotateRate = 0;
    } else {
      this.camera_.fpsYawRate = 0;
    }
  }

  keyUpQ_() {
    if (this.camera_.fpsVertSpeed === -settingsManager.fpsVertSpeed) {
      this.camera_.isFPSVertSpeedLock = false;
    }
    this.camera_.fpsRotateRate = 0;
  }

  keyUpS_() {
    if (this.camera_.fpsForwardSpeed === -settingsManager.fpsForwardSpeed) {
      this.camera_.isFPSForwardSpeedLock = false;
    }
  }

  keyUpShiftRight_() {
    this.camera_.fpsRun = 1;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    this.camera_.speedModifier = 1;
  }

  keyUpShift_() {
    this.camera_.fpsRun = 1;
    settingsManager.cameraMovementSpeed = 0.003;
    settingsManager.cameraMovementSpeedMin = 0.005;
    this.camera_.speedModifier = 1;
    if (!this.camera_.isFPSForwardSpeedLock) {
      this.camera_.fpsForwardSpeed = 0;
    }
    if (!this.camera_.isFPSSideSpeedLock) {
      this.camera_.fpsSideSpeed = 0;
    }
    if (!this.camera_.isFPSVertSpeedLock) {
      this.camera_.fpsVertSpeed = 0;
    }
  }

  keyUpW_() {
    if (this.camera_.fpsForwardSpeed === settingsManager.fpsForwardSpeed) {
      this.camera_.isFPSForwardSpeedLock = false;
    }
  }
}
