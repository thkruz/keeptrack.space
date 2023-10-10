/* eslint-disable class-methods-use-this */
import { keepTrackApi } from '@app/js/keepTrackApi';
import { CameraType } from '@app/js/singletons/camera';
import { Radians } from 'ootk';

export class GamepadPlugin {
  currentController: Gamepad;
  deadzone = 0.55;
  buttonsPressedHistory: number[] = [];
  buttonsPressed: boolean[] = [];

  init(): void {
    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      if (settingsManager.cruncherReady) {
        this.initializeGamepad(e.gamepad);
      } else {
        keepTrackApi.register({
          method: 'uiManagerInit',
          cbName: 'gamepad',
          cb: () => this.initializeGamepad(e.gamepad),
        });
      }
    });
    window.addEventListener('gamepaddisconnected', () => {
      keepTrackApi.getUiManager().toast('Gamepad disconnected', 'critical');
      this.currentController = null;
    });
  }

  initializeGamepad(gamepad: Gamepad): void {
    keepTrackApi.getUiManager().toast('Gamepad connected', 'normal');

    // Only initialize once
    if (!this.currentController) {
      keepTrackApi.register({
        method: 'updateLoop',
        cbName: 'gamepad',
        cb: this.updateGamepad.bind(this),
      });
    }

    this.currentController = gamepad;
  }

  updateGamepad(index?: number): void {
    index ??= 0; // Assume first gamepad if not specified
    const controller = GamepadPlugin.getController(index);
    if (controller === null) return; // No controller anymore - give up

    this.currentController = controller;
    this.updateZoom_();
    this.updateLeftStick_();
    this.updateRightStick_();
    this.updateButtons_();
  }

  private updateButtons_(): void {
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
            // DEBUG:
            // console.debug(`Button ${index}`);
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
    if (settingsManager.isLimitedGamepadControls) return;
    console.log('A');
    keepTrackApi.getCatalogManager().selectSat(keepTrackApi.getHoverManager().hoveringSat);
  }

  private btnB_() {
    if (settingsManager.isLimitedGamepadControls) return;
    console.log('B');
    keepTrackApi.getCatalogManager().selectSat(-1);
    keepTrackApi.getMainCamera().zoomTarget = 0.8;
  }

  private btnX_() {
    if (settingsManager.isLimitedGamepadControls) return;
    console.log('X');
    keepTrackApi.getMainCamera().autoRotate();
  }

  private btnY_() {
    console.log('Y');
    // if (settingsManager.colors.transparent[3] === 0.2) {
    //   settingsManager.colors.transparent = [1, 1, 1, 0];
    //   settingsManager.dotsPerColor = null;
    // } else {
    //   settingsManager.colors.transparent = [1, 1, 1, 0.2];
    //   settingsManager.dotsPerColor = 100;
    // }
    // uiManager?.keyHandler({ key: 'C' });
  }

  private btnLeftBumper() {
    if (settingsManager.isLimitedGamepadControls) return;
    console.log('Left Bumper');

    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const satId = catalogManagerInstance.selectedSat - 1;
    if (satId >= 0) {
      catalogManagerInstance.selectSat(satId);
    } else {
      catalogManagerInstance.selectSat(catalogManagerInstance.satData.length - 1);
    }
  }

  private btnRightBumper_() {
    if (settingsManager.isLimitedGamepadControls) return;
    console.log('Right Bumper');

    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const satId = catalogManagerInstance.selectedSat + 1;
    if (satId <= catalogManagerInstance.satData.length - 1) {
      catalogManagerInstance.selectSat(satId);
    } else {
      catalogManagerInstance.selectSat(0);
    }
  }

  private btnHome_() {
    if (settingsManager.isLimitedGamepadControls) return;
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
    const zoomOut = this.currentController.buttons[6].value;
    const zoomIn = this.currentController.buttons[7].value;

    if (zoomOut === 0 && zoomIn === 0) return; // Not Zooming
    const drawManagerInstance = keepTrackApi.getDrawManager();

    let zoomTarget = keepTrackApi.getMainCamera().zoomLevel();
    switch (keepTrackApi.getMainCamera().cameraType) {
      case CameraType.DEFAULT:
      case CameraType.OFFSET:
      case CameraType.FIXED_TO_SAT:
        zoomTarget += (zoomOut / 500) * drawManagerInstance.dt;
        zoomTarget -= (zoomIn / 500) * drawManagerInstance.dt;
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
          keepTrackApi.getMainCamera().fpsVertSpeed += (zoomOut * 2) ** 3 * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
        }
        if (zoomIn !== 0) {
          keepTrackApi.getMainCamera().fpsVertSpeed -= (zoomIn * 2) ** 3 * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
        }
        break;
    }
  }

  private updateLeftStick_(): void {
    const x = this.currentController.axes[0];
    const y = this.currentController.axes[1];

    if (x > this.deadzone || x < -this.deadzone || y > this.deadzone || y < -this.deadzone) {
      keepTrackApi.getMainCamera().autoRotate(false);
      const drawManagerInstance = keepTrackApi.getDrawManager();
      settingsManager.lastGamepadMovement = Date.now();

      switch (keepTrackApi.getMainCamera().cameraType) {
        case CameraType.DEFAULT:
        case CameraType.OFFSET:
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
      }
    }
  }

  private updateRightStick_(): void {
    if (settingsManager.isLimitedGamepadControls) return;

    const x = this.currentController.axes[2];
    const y = this.currentController.axes[3];
    const drawManagerInstance = keepTrackApi.getDrawManager();

    keepTrackApi.getMainCamera().isLocalRotateOverride = false;
    if (y > this.deadzone || y < -this.deadzone || x > this.deadzone || x < -this.deadzone) {
      keepTrackApi.getMainCamera().autoRotate(false);
      switch (keepTrackApi.getMainCamera().cameraType) {
        case CameraType.DEFAULT:
        case CameraType.OFFSET:
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
      }
    }
  }

  vibrate(vibrateTime?: number): void {
    if (!this.currentController) return;

    this.currentController.vibrationActuator.playEffect('dual-rumble', {
      duration: vibrateTime || 300,
      strongMagnitude: 1.0,
      weakMagnitude: 1.0,
      startDelay: 0,
    });
  }

  static getController(index = 0): Gamepad | null {
    // If gamepad not specified then try the first one
    const gamepads = navigator.getGamepads();
    if (gamepads.length > index && gamepads[index] !== null) {
      return gamepads[index];
    }
    // Get the gamepad or return null if not connected
    return null;
  }
}

export const gamepadPluginInstance = new GamepadPlugin();
