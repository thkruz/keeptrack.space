import { keepTrackContainer } from '@app/js/container';
import { CatalogManager, GamepadPlugin, Singletons, UiManager } from '@app/js/interfaces';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { CameraType, mainCameraInstance } from '@app/js/singletons/camera';
import { DrawManager } from '@app/js/singletons/draw-manager';

import { hoverManagerInstance } from '@app/js/singletons/hover-manager';
import { Radians } from 'ootk';

const gamepadSettings = {
  deadzone: 0.15,
};

export const init = (): void => {
  keepTrackApi.programs.gamepad = <GamepadPlugin>{
    currentState: null,
  };
  // NOTE: This is note a message event and sonarqube should ignore it
  // prettier-ignore
  window.addEventListener('gamepadconnected', (evt: any) => { // NOSONAR
    if (settingsManager.cruncherReady) {
      gamepadConnected(<GamepadEvent>event);
    } else {
      keepTrackApi.register({
        method: 'uiManagerInit',
        cbName: 'gamepad',
        cb: () => gamepadConnected(evt),
      });
    }
  });
  window.addEventListener('gamepaddisconnected', () => {
    const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
    uiManagerInstance.toast('Gamepad disconnected', 'critical');
    keepTrackApi.programs.gamepad = <GamepadPlugin>{
      currentState: null,
    };
  });
};

export const initializeGamepad = (gamepad: Gamepad): void => {
  const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
  uiManagerInstance.toast('Gamepad connected', 'normal');
  keepTrackApi.register({
    method: 'updateLoop',
    cbName: 'gamepad',
    cb: updateGamepad,
  });
  keepTrackApi.programs.gamepad = {
    settings: gamepadSettings,
    index: gamepad.index,
    currentState: null,
    getController: (index: number) => getController(index),
    vibrate: vibrate,
    buttonsPressedHistory: [],
  };
};

export const updateGamepad = (index?: number): void => {
  index ??= 0;
  const controller = getController(index);

  keepTrackApi.programs.gamepad.currentState = controller;

  updateZoom(controller.buttons[6].value, controller.buttons[7].value);
  updateLeftStick(controller.axes[0], controller.axes[1]);
  updateRightStick(controller.axes[2], controller.axes[3]);
  updateButtons(controller.buttons);
};

const buttonsPressed: boolean[] = [];
export const updateButtons = (buttons: readonly GamepadButton[]): void => {
  const { gamepad } = keepTrackApi.programs;
  const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);

  buttons.forEach((button, index) => {
    // if the button is pressed and wasnt pressed before
    if (button.pressed && !buttonsPressed[index]) {
      // button state is now pressed
      buttonsPressed[index] = true;
      gamepad.buttonsPressedHistory.push(index);
      // Maximum of 20 in the history
      if (gamepad.buttonsPressedHistory.length > 8) {
        gamepad.buttonsPressedHistory.shift();
      }

      // Perform action
      let satId;
      switch (index) {
        case 0:
          if (settingsManager.isLimitedGamepadControls) break;
          console.log('A');
          catalogManagerInstance.selectSat(hoverManagerInstance.hoveringSat);
          break;
        case 1:
          if (settingsManager.isLimitedGamepadControls) break;
          console.log('B');
          catalogManagerInstance.selectSat(-1);
          mainCameraInstance.zoomTarget = 0.8;
          break;
        case 2:
          if (settingsManager.isLimitedGamepadControls) break;
          console.log('X');
          mainCameraInstance.autoRotate();
          break;
        case 3:
          console.log('Y');
          // uiManager?.keyHandler({ key: 'C' });
          break;
        case 4:
          if (settingsManager.isLimitedGamepadControls) break;
          console.log('Left Bumper');
          // eslint-disable-next-line no-case-declarations
          satId = catalogManagerInstance.selectedSat - 1;
          if (satId >= 0) {
            catalogManagerInstance.selectSat(satId);
          } else {
            catalogManagerInstance.selectSat(catalogManagerInstance.satData.length - 1);
          }
          break;
        case 5:
          if (settingsManager.isLimitedGamepadControls) break;
          console.log('Right Bumper');
          // eslint-disable-next-line no-case-declarations
          satId = catalogManagerInstance.selectedSat + 1;
          if (satId <= catalogManagerInstance.satData.length - 1) {
            catalogManagerInstance.selectSat(satId);
          } else {
            catalogManagerInstance.selectSat(0);
          }
          break;
        case 8:
          if (settingsManager.isLimitedGamepadControls) break;
          console.log('Home');
          mainCameraInstance.isPanReset = true;
          mainCameraInstance.isLocalRotateReset = true;
          mainCameraInstance.ftsRotateReset = true;
          break;
        case 9:
          console.log('Start');
          break;
        case 10:
          console.log('Left Stick');
          break;
        case 11:
          console.log('Right Stick');
          break;
        case 12:
          console.log('D-Pad Up');
          break;
        case 13:
          console.log('D-Pad Down');
          break;
        case 14:
          console.log('D-Pad Left');
          break;
        case 15:
          console.log('Right');
          break;
        case 16:
          console.log('Xbox Button');
          break;
        default:
          // DEBUG:
          // console.debug(`Button ${index}`);
          break;
      }
      // if the button is not pressed and was pressed before
    } else if (!button.pressed && buttonsPressed[index]) {
      // button state is now not pressed
      buttonsPressed[index] = false;
    }
  });
};

export const updateZoom = (zoomOut: number, zoomIn: number): void => {
  if (zoomOut === 0 && zoomIn === 0) return; // Not Zooming
  const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);

  let zoomTarget = mainCameraInstance.zoomLevel();
  switch (mainCameraInstance.cameraType) {
    case CameraType.DEFAULT:
    case CameraType.OFFSET:
    case CameraType.FIXED_TO_SAT:
      zoomTarget += (zoomOut / 500) * drawManagerInstance.dt;
      zoomTarget -= (zoomIn / 500) * drawManagerInstance.dt;
      mainCameraInstance.zoomTarget = zoomTarget;
      mainCameraInstance.camZoomSnappedOnSat = false;
      mainCameraInstance.isCamSnapMode = false;

      if (zoomTarget < mainCameraInstance.zoomLevel()) {
        mainCameraInstance.isZoomIn = true;
      } else {
        mainCameraInstance.isZoomIn = false;
      }
      break;
    case CameraType.FPS:
    case CameraType.SATELLITE:
    case CameraType.PLANETARIUM:
    case CameraType.ASTRONOMY:
      if (zoomOut !== 0) {
        mainCameraInstance.fpsVertSpeed += (zoomOut * 2) ** 3 * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
      }
      if (zoomIn !== 0) {
        mainCameraInstance.fpsVertSpeed -= (zoomIn * 2) ** 3 * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
      }
      break;
  }
};

export const updateLeftStick = (x: number, y: number): void => {
  if (x > gamepadSettings.deadzone || x < -gamepadSettings.deadzone || y > gamepadSettings.deadzone || y < -gamepadSettings.deadzone) {
    mainCameraInstance.autoRotate(false);
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    settingsManager.lastGamepadMovement = Date.now();

    switch (mainCameraInstance.cameraType) {
      case CameraType.DEFAULT:
      case CameraType.OFFSET:
      case CameraType.FIXED_TO_SAT:
        mainCameraInstance.camAngleSnappedOnSat = false;
        mainCameraInstance.isCamSnapMode = false;
        mainCameraInstance.camPitchSpeed -= (y ** 3 / 200) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
        mainCameraInstance.camYawSpeed += (x ** 3 / 200) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE:
      case CameraType.PLANETARIUM:
      case CameraType.ASTRONOMY:
        if (y > gamepadSettings.deadzone || y < -gamepadSettings.deadzone) {
          mainCameraInstance.fpsForwardSpeed = -(y ** 3) * drawManagerInstance.dt;
        }
        if (x > gamepadSettings.deadzone || x < -gamepadSettings.deadzone) {
          mainCameraInstance.fpsSideSpeed = x ** 3 * drawManagerInstance.dt;
        }
        break;
    }
  }
};

export const updateRightStick = (x: number, y: number): void => {
  if (settingsManager.isLimitedGamepadControls) return;
  const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);

  mainCameraInstance.isLocalRotateOverride = false;
  if (y > gamepadSettings.deadzone || y < -gamepadSettings.deadzone || x > gamepadSettings.deadzone || x < -gamepadSettings.deadzone) {
    mainCameraInstance.autoRotate(false);
    switch (mainCameraInstance.cameraType) {
      case CameraType.DEFAULT:
      case CameraType.OFFSET:
      case CameraType.FIXED_TO_SAT:
        mainCameraInstance.isLocalRotateOverride = true;
        mainCameraInstance.localRotateDif.pitch = <Radians>(-y * 200);
        mainCameraInstance.localRotateDif.yaw = <Radians>(-x * 200);
        break;
      case CameraType.FPS:
      case CameraType.SATELLITE:
      case CameraType.PLANETARIUM:
      case CameraType.ASTRONOMY:
        mainCameraInstance.camPitchSpeed += (y / 100) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
        mainCameraInstance.camYawSpeed -= (x / 100) * drawManagerInstance.dt * settingsManager.cameraMovementSpeed;
        break;
    }
  }
};

export const vibrate = (vibrateTime?: number, gamepad?: any): void => {
  // If gamepad is not explicit then get the current one
  gamepad ??= getController();
  if (!gamepad) return; // No controller - give up

  gamepad.vibrationActuator.playEffect('dual-rumble', {
    duration: vibrateTime || 300,
    strongMagnitude: 1.0,
    weakMagnitude: 1.0,
    startDelay: 0,
  });
};

export const gamepadConnected = (e: GamepadEvent) => {
  const uiManagerInstance = keepTrackContainer.get<UiManager>(Singletons.UiManager);
  uiManagerInstance.toast('Gamepad connected', 'normal');
  initializeGamepad(e.gamepad);
};
export const getController = (index?: number): Gamepad => {
  // If gamepad not specified then try the first one
  index ??= 0;
  // Get the gamepad or return null if not connected
  return navigator.getGamepads()[index];
};
