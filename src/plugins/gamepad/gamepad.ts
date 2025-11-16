/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
import { CameraType } from '@app/engine/camera/camera';
import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { Radians } from '@ootk/src/main';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { PluginRegistry } from '@app/engine/core/plugin-registry';

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
        EventBus.getInstance().once(EventBusEvent.uiManagerInit, () => this.initializeGamepad(e.gamepad));
      }
    });
    window.addEventListener('gamepaddisconnected', () => {
      ServiceLocator.getUiManager().toast('Gamepad disconnected', ToastMsgType.critical);
      this.currentController = null;
    });
  }

  initializeGamepad(gamepad: Gamepad): void {
    ServiceLocator.getUiManager().toast('Gamepad connected', ToastMsgType.normal);

    // Only initialize once
    if (!this.currentController) {
      EventBus.getInstance().on(EventBusEvent.updateLoop, this.updateGamepad.bind(this));
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
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(ServiceLocator.getHoverManager().hoveringSat);
  }

  private btnB_() {
    if (settingsManager.isLimitedGamepadControls) {
      return;
    }
    console.log('B');
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);
    ServiceLocator.getMainCamera().state.zoomTarget = 0.8;
  }

  private btnX_() {
    if (settingsManager.isLimitedGamepadControls) {
      return;
    }
    console.log('X');
    ServiceLocator.getMainCamera().autoRotate();
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

    PluginRegistry.getPlugin(SelectSatManager)?.selectPrevSat();
  }

  private btnRightBumper_() {
    if (settingsManager.isLimitedGamepadControls) {
      return;
    }
    console.log('Right Bumper');

    PluginRegistry.getPlugin(SelectSatManager)?.selectNextSat();
  }

  private btnHome_() {
    if (settingsManager.isLimitedGamepadControls) {
      return;
    }
    console.log('Home');
    ServiceLocator.getMainCamera().state.isPanReset = true;
    ServiceLocator.getMainCamera().state.isLocalRotateReset = true;
    ServiceLocator.getMainCamera().state.ftsRotateReset = true;
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
    ServiceLocator.getMainCamera().autoRotate(true);
  }

  private btnDpadDown_() {
    console.log('D-Pad Down');
    settingsManager.isAutoRotateU = false;
    settingsManager.isAutoRotateD = !settingsManager.isAutoRotateD;
    ServiceLocator.getMainCamera().autoRotate(true);
  }

  private btnDpadLeft_() {
    console.log('D-Pad Left');
    settingsManager.isAutoRotateR = false;
    settingsManager.isAutoRotateL = !settingsManager.isAutoRotateL;
    ServiceLocator.getMainCamera().autoRotate(true);
  }

  private btnDpadRight_() {
    console.log('Right');
    settingsManager.isAutoRotateL = false;
    settingsManager.isAutoRotateR = !settingsManager.isAutoRotateR;
    ServiceLocator.getMainCamera().autoRotate(true);
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
    const renderer = ServiceLocator.getRenderer();

    let zoomTarget = ServiceLocator.getMainCamera().zoomLevel();

    switch (ServiceLocator.getMainCamera().cameraType) {
      case CameraType.FIXED_TO_EARTH:
      case CameraType.FIXED_TO_SAT:
        zoomTarget += (zoomOut / 500) * renderer.dt;
        zoomTarget -= (zoomIn / 500) * renderer.dt;
        ServiceLocator.getMainCamera().state.zoomTarget = zoomTarget;
        ServiceLocator.getMainCamera().state.camZoomSnappedOnSat = false;
        ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

        if (zoomTarget < ServiceLocator.getMainCamera().zoomLevel()) {
          ServiceLocator.getMainCamera().state.isZoomIn = true;
        } else {
          ServiceLocator.getMainCamera().state.isZoomIn = false;
        }
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE:
      case CameraType.PLANETARIUM:
      case CameraType.ASTRONOMY:
        if (zoomOut !== 0) {
          ServiceLocator.getMainCamera().state.fpsVertSpeed += (zoomOut * 2) ** 3 * renderer.dt * settingsManager.cameraMovementSpeed;
        }
        if (zoomIn !== 0) {
          ServiceLocator.getMainCamera().state.fpsVertSpeed -= (zoomIn * 2) ** 3 * renderer.dt * settingsManager.cameraMovementSpeed;
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
      ServiceLocator.getMainCamera().autoRotate(false);
      const drawManagerInstance = ServiceLocator.getRenderer();

      settingsManager.lastGamepadMovement = Date.now();

      switch (ServiceLocator.getMainCamera().cameraType) {
        case CameraType.FIXED_TO_EARTH:
        case CameraType.FIXED_TO_SAT:
          ServiceLocator.getMainCamera().state.camAngleSnappedOnSat = false;
          ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;
          ServiceLocator.getMainCamera().state.camPitchSpeed -= (y ** 3 / 200) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
          ServiceLocator.getMainCamera().state.camYawSpeed += (x ** 3 / 200) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
          break;
        case CameraType.FPS:
        case CameraType.SATELLITE:
        case CameraType.PLANETARIUM:
        case CameraType.ASTRONOMY:
          if (y > this.deadzone || y < -this.deadzone) {
            ServiceLocator.getMainCamera().state.fpsForwardSpeed = -(y ** 3) * drawManagerInstance.dt;
          }
          if (x > this.deadzone || x < -this.deadzone) {
            ServiceLocator.getMainCamera().state.fpsSideSpeed = x ** 3 * drawManagerInstance.dt;
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
    const drawManagerInstance = ServiceLocator.getRenderer();

    ServiceLocator.getMainCamera().state.isLocalRotateOverride = false;
    if (y > this.deadzone || y < -this.deadzone || x > this.deadzone || x < -this.deadzone) {
      ServiceLocator.getMainCamera().autoRotate(false);
      switch (ServiceLocator.getMainCamera().cameraType) {
        case CameraType.FIXED_TO_EARTH:
        case CameraType.FIXED_TO_SAT:
          ServiceLocator.getMainCamera().state.isLocalRotateOverride = true;
          ServiceLocator.getMainCamera().state.localRotateDif.pitch = <Radians>(-y * 200);
          ServiceLocator.getMainCamera().state.localRotateDif.yaw = <Radians>(-x * 200);
          break;
        case CameraType.FPS:
        case CameraType.SATELLITE:
        case CameraType.PLANETARIUM:
        case CameraType.ASTRONOMY:
          ServiceLocator.getMainCamera().state.camPitchSpeed += (y / 100) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
          ServiceLocator.getMainCamera().state.camYawSpeed -= (x / 100) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
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

