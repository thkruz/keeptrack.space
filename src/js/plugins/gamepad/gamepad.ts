import { keepTrackApi } from '@app/js/api/externalApi';

const gamepadSettings = {
  deadzone: 0.15,
};

export const init = (): void => {
  keepTrackApi.programs.gamepad = {
    currentState: null,
  };
  window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
    if (settingsManager.cruncherReady) {
      gamepadConnected(e);
    } else {
      keepTrackApi.register({
        method: 'uiManagerInit',
        cbName: 'gamepad',
        cb: () => gamepadConnected(e),
      });
    }
  });
  window.addEventListener('gamepaddisconnected', () => {
    const { uiManager } = keepTrackApi.programs;
    uiManager.toast('Gamepad disconnected', 'critical');
    keepTrackApi.programs.gamepad = {
      currentState: null,
    };
  });
};

export const initializeGamepad = (gamepad: Gamepad): void => {
  keepTrackApi.register({
    method: 'updateLoop',
    cbName: 'gamepad',
    cb: updateGamepad,
  });
  keepTrackApi.programs.gamepad = {
    settings: gamepadSettings,
    index: gamepad.index,
    currentState: null,
    getController: () => getController(gamepad.index),
    vibrate: vibrate,
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

const buttonsPressed = [];
export const updateButtons = (buttons: readonly GamepadButton[]): void => {
  buttons.forEach((button, index) => {
    // if the button is pressed and wasnt pressed before
    if (button.pressed && !buttonsPressed[index]) {
      // button state is now pressed
      buttonsPressed[index] = true;

      // Perform action
      switch (index) {
        case 0:
          console.log('A');
          break;
        case 1:
          console.log('B');
          break;
        case 2:
          console.log('X');
          break;
        case 3:
          console.log('Y');
          keepTrackApi.programs.uiManager.keyHandler({ key: 'C' });
          break;
        case 4:
          console.log('Left Bumper');
          break;
        case 5:
          console.log('Right Bumper');
          break;
        case 8:
          console.log('Home');
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

  const { cameraManager, drawManager } = keepTrackApi.programs;
  switch (cameraManager.cameraType.current) {
    case cameraManager.cameraType.Default:
    case cameraManager.cameraType.Offset:    
    case cameraManager.cameraType.FixedToSat:
      let zoomTarget = cameraManager.zoomLevel;
      zoomTarget += (zoomOut / 500) * drawManager.dt;
      zoomTarget -= (zoomIn / 500) * drawManager.dt;
      cameraManager.zoomTarget = zoomTarget;
      cameraManager.camZoomSnappedOnSat = false;
      cameraManager.isCamSnapMode = false;

      if (zoomTarget < cameraManager.zoomLevel) {
        cameraManager.isZoomIn = true;
      } else {
        cameraManager.isZoomIn = false;
      }
      break;
    case cameraManager.cameraType.Fps:
    case cameraManager.cameraType.Satellite:
    case cameraManager.cameraType.Planetarium:
    case cameraManager.cameraType.Astronomy:
      if (zoomOut !== 0) {
        cameraManager.fpsVertSpeed += (zoomOut * 2) ** 3 * drawManager.dt * settingsManager.cameraMovementSpeed;
      }
      if (zoomIn !== 0) {
        cameraManager.fpsVertSpeed -= (zoomIn * 2) ** 3 * drawManager.dt * settingsManager.cameraMovementSpeed;
      }
      break;
  }
};

export const updateLeftStick = (x: number, y: number): void => {
  const { cameraManager, drawManager } = keepTrackApi.programs;
  if (x > gamepadSettings.deadzone || x < -gamepadSettings.deadzone || y > gamepadSettings.deadzone || y < -gamepadSettings.deadzone) {
    cameraManager.autoRotate(false);
    switch (cameraManager.cameraType.current) {
      case cameraManager.cameraType.Default:
      case cameraManager.cameraType.Offset:
      case cameraManager.cameraType.FixedToSat:
        cameraManager.camAngleSnappedOnSat = false;
        cameraManager.isCamSnapMode = false;
        cameraManager.camPitchSpeed -= (y ** 3 / 100) * drawManager.dt * settingsManager.cameraMovementSpeed;
        cameraManager.camYawSpeed += (x ** 3 / 100) * drawManager.dt * settingsManager.cameraMovementSpeed;
        break;
      case cameraManager.cameraType.Fps:
      case cameraManager.cameraType.Satellite:
      case cameraManager.cameraType.Planetarium:
      case cameraManager.cameraType.Astronomy:
        if (y > gamepadSettings.deadzone || y < -gamepadSettings.deadzone) {
          cameraManager.fpsForwardSpeed = -(y ** 3) * drawManager.dt;
        }
        if (x > gamepadSettings.deadzone || x < -gamepadSettings.deadzone) {
          cameraManager.fpsSideSpeed = x ** 3 * drawManager.dt;
        }
        break;
    }
  }
};

export const updateRightStick = (x: number, y: number): void => {
  const { cameraManager, drawManager } = keepTrackApi.programs;
  cameraManager.isLocalRotateOverride = false;
  if (y > gamepadSettings.deadzone || y < -gamepadSettings.deadzone || x > gamepadSettings.deadzone || x < -gamepadSettings.deadzone) {
    cameraManager.autoRotate(false);
    switch (cameraManager.cameraType.current) {
      case cameraManager.cameraType.Default:
      case cameraManager.cameraType.Offset:
      case cameraManager.cameraType.FixedToSat:
        cameraManager.isLocalRotateOverride = true;
        cameraManager.localRotateDif.pitch = -y * 200;
        cameraManager.localRotateDif.yaw = -x * 200;
        break;
      case cameraManager.cameraType.Fps:
      case cameraManager.cameraType.Satellite:
      case cameraManager.cameraType.Planetarium:
      case cameraManager.cameraType.Astronomy:
        cameraManager.camPitchSpeed += (y / 50) * drawManager.dt * settingsManager.cameraMovementSpeed;
        cameraManager.camYawSpeed -= (x / 50) * drawManager.dt * settingsManager.cameraMovementSpeed;
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
  const { uiManager } = keepTrackApi.programs;
  uiManager.toast('Gamepad connected', 'normal');
  initializeGamepad(e.gamepad);
};
export const getController = (index?: number): Gamepad => {
  // If gamepad not specified then try the first one
  index ??= 0;
  // Get the gamepad or return null if not connected
  return navigator.getGamepads()[index];
};
