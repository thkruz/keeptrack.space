import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as gamepad from '@app/js/plugins/gamepad/gamepad';
keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

Object.defineProperty(global.navigator, 'getGamepads', {
  value: () => [
    // mock gamepad
    {
      id: 'Gamepad 1',
      buttons: [{ value: 0.5, pressed: true }],
    },
  ],
});

// @ponicode
describe('gamepad.getController', () => {
  test('0', () => {
    let result: any = gamepad.getController(-100);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = gamepad.getController(-1);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = gamepad.getController(100);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = gamepad.getController(1);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = gamepad.getController(0);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = gamepad.getController(NaN);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('gamepad.gamepadConnected', () => {
  test('0', () => {
    let result: any = gamepad.gamepadConnected(<GamepadEvent>(<unknown>{
      gamepad: {
        axes: [],
        buttons: [],
        connected: true,
        hapticActuators: [],
        id: '',
        index: -Infinity,
        mapping: 'standard',
        timestamp: -Infinity,
      },
      bubbles: true,
      cancelBubble: false,
      cancelable: false,
      composed: true,
      defaultPrevented: true,
      eventPhase: -Infinity,
      isTrusted: true,
      returnValue: true,
      timeStamp: -Infinity,
      type: '',
      AT_TARGET: -Infinity,
      BUBBLING_PHASE: -Infinity,
      CAPTURING_PHASE: -Infinity,
      NONE: -Infinity,
    }));
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('gamepad.updateRightStick', () => {
  test('0', () => {
    let result: any = gamepad.updateRightStick(350, 1);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
    let result: any = gamepad.updateRightStick(50, 400);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = gamepad.updateRightStick(90, 400);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = gamepad.updateRightStick(30, 350);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Fps;
    let result: any = gamepad.updateRightStick(1, 320);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = gamepad.updateRightStick(Infinity, Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('gamepad.updateLeftStick', () => {
  test('0', () => {
    let result: any = gamepad.updateLeftStick(400, 50);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
    let result: any = gamepad.updateLeftStick(400, 320);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = gamepad.updateLeftStick(4, 30);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = gamepad.updateLeftStick(380, 320);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Fps;
    let result: any = gamepad.updateLeftStick(400, 380);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = gamepad.updateLeftStick(NaN, NaN);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('gamepad.updateZoom', () => {
  test('0', () => {
    let result: any = gamepad.updateZoom(520, 1);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
    let result: any = gamepad.updateZoom(550, -100);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = gamepad.updateZoom(1, 0.0);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = gamepad.updateZoom(70, 0);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Fps;
    let result: any = gamepad.updateZoom(320, 0);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = gamepad.updateZoom(Infinity, Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('gamepad.updateButtons', () => {
  test('0', () => {
    let result: any = gamepad.updateButtons([
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
      { pressed: true, touched: true, value: 0.5 },
    ]);
    expect(result).toMatchSnapshot();
  });
});
