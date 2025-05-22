/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
import { KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { CameraType } from '@app/singletons/camera';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { Radians } from 'ootk';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

export class GamepadPlugin {
  readonly id = 'GamepadPlugin';
  dependencies_: string[] = [];
  currentController: Gamepad | null = null;
  deadzone = 0.55;
  buttonsPressedHistory: number[] = [];
  buttonsPressed: boolean[] = [];
  previouslyReportedGamepads = [] as string[];

  init(): void {
    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      if (settingsManager.cruncherReady) {
        this.initializeGamepad(e.gamepad);
      } else {
        keepTrackApi.once(KeepTrackApiEvents.uiManagerInit, () => this.initializeGamepad(e.gamepad));
      }
    });
    window.addEventListener('gamepaddisconnected', () => {
      keepTrackApi.getUiManager().toast('Gamepad disconnected', ToastMsgType.critical);
      this.currentController = null;
    });
  }

  initializeGamepad(gamepad: Gamepad): void {
    keepTrackApi.getUiManager().toast('Gamepad connected', ToastMsgType.normal);

    // Only initialize once
    if (!this.currentController) {
      keepTrackApi.on(KeepTrackApiEvents.updateLoop, this.updateGamepad.bind(this));
    }

    this.currentController = gamepad;
  }

  updateGamepad(index?: number): void {
    index ??= 0; // Assume first gamepad if not specified
    const controller = GamepadPlugin.getController(index);

    if (controller === null) {
      return;
    } // No controller anymore - give up

    if (!this.validateController(controller)) {
      return;
    }

    this.currentController = controller;
    this.updateZoom_();
    this.updateLeftStick_();
    this.updateRightStick_();
    this.updateButtons_();
  }

  private validateController(controller: Gamepad): boolean {
    if (controller.buttons.length < 17) {
      // Check if this gamepad has already been reported
      if (!this.previouslyReportedGamepads.includes(controller.id)) {
        errorManagerInstance.warn('This gamepad is not supported. Please open an issue on GitHub with the gamepad model to get it added.');
        this.previouslyReportedGamepads.push(controller.id);
      }

      return false;
    }
    if (controller.axes.length < 4) {
      if (!this.previouslyReportedGamepads.includes(controller.id)) {
        errorManagerInstance.warn('This gamepad is not supported. Please open an issue on GitHub with the gamepad model to get it added.');
        this.previouslyReportedGamepads.push(controller.id);
      }

      return false;
    }

    return true;
  }


  private updateButtons_(): void {
    if (!this.currentController) {
      return;
    }

    const buttons = this.currentController.buttons;

    buttons.forEach((button, index) => {
      // if the button is pressed and wasnt pressed before
      if (button.pressed && !this.buttonsPressed[index]) {
        // button state is now pressed
        this.buttonsPressed[index] = true;
        this.buttonsPressedHistory.push(index);
        // Maximum of 20 in the history
        if (this.buttonsPressedHistory.length > 8) {
          this.buttonsPressedHistory.shift();
        }

        // Perform action
        switch (index) {
          case 0:
            this.btnA_();
            break;
          case 1:
            this.btnB_();
            break;
          case 2:
            this.btnX_();
            break;
          case 3:
            this.btnY_();
            break;
          case 4:
            this.btnLeftBumper();
            break;
          case 5:
            this.btnRightBumper_();
            break;
          case 8:
            this.btnHome_();
            break;
          case 9:
            this.btnStart_();
            break;
          case 10:
            this.btnLeftStick_();
            break;
          case 11:
            this.btnRightStick_();
            break;
          case 12:
            this.btnDpadUp_();
            break;
          case 13:
            this.btnDpadDown_();
            break;
          case 14:
            this.btnDpadLeft_();
            break;
          case 15:
            this.btnDpadRight_();
            break;
          case 16:
            this.btnXbox();
            break;
          default:
            /*
             * DEBUG:
             * console.debug(`Button ${index}`);
             */
            break;
        }
        // if the button is not pressed and was pressed before
      } else if (!button.pressed && this.buttonsPressed[index]) {
        // button state is now not pressed
        this.buttonsPressed[index] = false;
      }
    });
  }

  private btnA_() {
    if (settingsManager.isLimitedGamepadControls) {
      return;
    }
    console.log('A');
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(keepTrackApi.getHoverManager().hoveringSat);
  }

  private btnB_() {
    if (settingsManager.isLimitedGamepadControls) {
      return;
    }
    console.log('B');
    keepTrackApi.getPlugin(SelectSatManager)?.selectSat(-1);
    keepTrackApi.getMainCamera().zoomTarget = 0.8;
  }

  private btnX_() {
    if (settingsManager.isLimitedGamepadControls) {
      return;
    }
    console.log('X');
    keepTrackApi.getMainCamera().autoRotate();
  }

  private btnY_() {
    console.log('Y');
    /*
     * if (settingsManager.colors.transparent[3] === 0.2) {
     *   settingsManager.colors.transparent = [1, 1, 1, 0];
     *   settingsManager.dotsPerColor = null;
     * } else {
     *   settingsManager.colors.transparent = [1, 1, 1, 0.2];
     *   settingsManager.dotsPerColor = 100;
     * }
     * uiManager?.keyHandler({ key: 'C' });
     */
  }

  private btnLeftBumper() {
    if (settingsManager.isLimitedGamepadControls) {
      return;
    }
    console.log('Left Bumper');

    keepTrackApi.getPlugin(SelectSatManager)?.selectPrevSat();
  }

  private btnRightBumper_() {
    if (settingsManager.isLimitedGamepadControls) {
      return;
    }
    console.log('Right Bumper');

    keepTrackApi.getPlugin(SelectSatManager)?.selectNextSat();
  }

  private btnHome_() {
    if (settingsManager.isLimitedGamepadControls) {
      return;
    }
    console.log('Home');
    keepTrackApi.getMainCamera().isPanReset = true;
    keepTrackApi.getMainCamera().isLocalRotateReset = true;
    keepTrackApi.getMainCamera().ftsRotateReset = true;
  }

  private btnXbox() {
    console.log('Xbox Button');
  }

  private btnStart_() {
    console.log('Start');
  }

  private btnLeftStick_() {
    console.log('Left Stick');
  }

  private btnRightStick_() {
    console.log('Right Stick');
  }

  private btnDpadUp_() {
    console.log('D-Pad Up');
    settingsManager.isAutoRotateD = false;
    settingsManager.isAutoRotateU = !settingsManager.isAutoRotateU;
    keepTrackApi.getMainCamera().autoRotate(true);
  }

  private btnDpadDown_() {
    console.log('D-Pad Down');
    settingsManager.isAutoRotateU = false;
    settingsManager.isAutoRotateD = !settingsManager.isAutoRotateD;
    keepTrackApi.getMainCamera().autoRotate(true);
  }

  private btnDpadLeft_() {
    console.log('D-Pad Left');
    settingsManager.isAutoRotateR = false;
    settingsManager.isAutoRotateL = !settingsManager.isAutoRotateL;
    keepTrackApi.getMainCamera().autoRotate(true);
  }

  private btnDpadRight_() {
    console.log('Right');
    settingsManager.isAutoRotateL = false;
    settingsManager.isAutoRotateR = !settingsManager.isAutoRotateR;
    keepTrackApi.getMainCamera().autoRotate(true);
  }

  private updateZoom_(): void {
    if (!this.currentController) {
      return;
    }

    const zoomOut = this.currentController.buttons[6].value;
    const zoomIn = this.currentController.buttons[7].value;

    if (zoomOut === 0 && zoomIn === 0) {
      return;
    } // Not Zooming
    const renderer = keepTrackApi.getRenderer();

    let zoomTarget = keepTrackApi.getMainCamera().zoomLevel();

    switch (keepTrackApi.getMainCamera().cameraType) {
      case CameraType.DEFAULT:
      case CameraType.FIXED_TO_SAT:
        zoomTarget += (zoomOut / 500) * renderer.dt;
        zoomTarget -= (zoomIn / 500) * renderer.dt;
        keepTrackApi.getMainCamera().zoomTarget = zoomTarget;
        keepTrackApi.getMainCamera().camZoomSnappedOnSat = false;
        keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false;

        if (zoomTarget < keepTrackApi.getMainCamera().zoomLevel()) {
          keepTrackApi.getMainCamera().isZoomIn = true;
        } else {
          keepTrackApi.getMainCamera().isZoomIn = false;
        }
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE:
      case CameraType.PLANETARIUM:
      case CameraType.ASTRONOMY:
        if (zoomOut !== 0) {
          keepTrackApi.getMainCamera().fpsVertSpeed += (zoomOut * 2) ** 3 * renderer.dt * settingsManager.cameraMovementSpeed;
        }
        if (zoomIn !== 0) {
          keepTrackApi.getMainCamera().fpsVertSpeed -= (zoomIn * 2) ** 3 * renderer.dt * settingsManager.cameraMovementSpeed;
        }
        break;
      default:
        // Do nothing
        break;
    }
  }

  private updateLeftStick_(): void {
    if (!this.currentController) {
      return;
    }

    const x = this.currentController.axes[0];
    const y = this.currentController.axes[1];

    if (x > this.deadzone || x < -this.deadzone || y > this.deadzone || y < -this.deadzone) {
      keepTrackApi.getMainCamera().autoRotate(false);
      const drawManagerInstance = keepTrackApi.getRenderer();

      settingsManager.lastGamepadMovement = Date.now();

      switch (keepTrackApi.getMainCamera().cameraType) {
        case CameraType.DEFAULT:
        case CameraType.FIXED_TO_SAT:
          keepTrackApi.getMainCamera().camAngleSnappedOnSat = false;
          keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false;
          keepTrackApi.getMainCamera().camPitchSpeed -= (y ** 3 / 200) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
          keepTrackApi.getMainCamera().camYawSpeed += (x ** 3 / 200) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
          break;
        case CameraType.FPS:
        case CameraType.SATELLITE:
        case CameraType.PLANETARIUM:
        case CameraType.ASTRONOMY:
          if (y > this.deadzone || y < -this.deadzone) {
            keepTrackApi.getMainCamera().fpsForwardSpeed = -(y ** 3) * drawManagerInstance.dt;
          }
          if (x > this.deadzone || x < -this.deadzone) {
            keepTrackApi.getMainCamera().fpsSideSpeed = x ** 3 * drawManagerInstance.dt;
          }
          break;
        default:
          // Do nothing
          break;
      }
    }
  }

  private updateRightStick_(): void {
    if (settingsManager.isLimitedGamepadControls || !this.currentController) {
      return;
    }

    const x = this.currentController.axes[2];
    const y = this.currentController.axes[3];
    const drawManagerInstance = keepTrackApi.getRenderer();

    keepTrackApi.getMainCamera().isLocalRotateOverride = false;
    if (y > this.deadzone || y < -this.deadzone || x > this.deadzone || x < -this.deadzone) {
      keepTrackApi.getMainCamera().autoRotate(false);
      switch (keepTrackApi.getMainCamera().cameraType) {
        case CameraType.DEFAULT:
        case CameraType.FIXED_TO_SAT:
          keepTrackApi.getMainCamera().isLocalRotateOverride = true;
          keepTrackApi.getMainCamera().localRotateDif.pitch = <Radians>(-y * 200);
          keepTrackApi.getMainCamera().localRotateDif.yaw = <Radians>(-x * 200);
          break;
        case CameraType.FPS:
        case CameraType.SATELLITE:
        case CameraType.PLANETARIUM:
        case CameraType.ASTRONOMY:
          keepTrackApi.getMainCamera().camPitchSpeed += (y / 100) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
          keepTrackApi.getMainCamera().camYawSpeed -= (x / 100) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
          break;
        default:
          // Do nothing
          break;
      }
    }
  }

  vibrate(vibrateTime?: number): void {
    if (!this.currentController) {
      return;
    }

    this.currentController.vibrationActuator.playEffect('dual-rumble', {
      duration: vibrateTime ?? 300,
      strongMagnitude: 1.0,
      weakMagnitude: 1.0,
      startDelay: 0,
    });
  }

  static getController(index = 0): Gamepad | null {
    // If gamepad not specified then try the first one
    const gamepads = navigator.getGamepads().filter((gamepad) => gamepad !== null);

    if (gamepads.length > index && gamepads[index] !== null) {
      return gamepads[index];
    }
    // Get the gamepad or return null if not connected

    return null;
  }
}

