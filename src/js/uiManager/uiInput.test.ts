import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import * as uiInput from './uiInput';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
document.body.innerHTML = global.docBody;

// Let TypeScript know that settingsManager is a global variable
declare const settingsManager: any;

const keyEvt = (evt, param) => {
  const event = new window.KeyboardEvent(evt, param);
  window.dispatchEvent(event);
};

const mouseEvt = (evt, param, el) => {
  const event = new window.MouseEvent(evt, param);
  el = el || window;
  el.dispatchEvent(event);
};

describe('uiInput Base Tests', () => {
  test('UI Input Validation Test', () => {
    keyEvt('keydown', { which: '61', ctrlKey: true });

    settingsManager.disableWindowScroll = true;

    uiInput.init();
    window.dispatchEvent(new CustomEvent('scroll'));
    settingsManager.disableWindowScroll = false;
    settingsManager.disableNormalEvents = true;
    uiInput.init();
    settingsManager.disableUI = true;
    uiInput.init();
    settingsManager.disableUI = false;
    settingsManager.disableWindowScroll = false;
    settingsManager.disableNormalEvents = false;
    uiInput.init();
    keyEvt('keydown', { ctrlKey: true });
    keyEvt('keydown', { metaKey: true });
    keyEvt('keydown', {});
    keyEvt('keyup', { ctrlKey: false });
    keyEvt('keyup', { ctrlKey: true, metaKey: false });
    keyEvt('keyup', { ctrlKey: true, metaKey: true });
    keyEvt('keydown', { ctrlKey: true, which: 61 });
    keyEvt('keydown', { ctrlKey: true, which: 107 });
    keyEvt('keydown', { ctrlKey: true, which: 173 });
    keyEvt('keydown', { ctrlKey: true, which: 109 });
    keyEvt('keydown', { ctrlKey: true, which: 187 });
    keyEvt('keydown', { ctrlKey: true, which: 189 });

    mouseEvt('mousedown', { button: 1 }, null);
    mouseEvt('mouseup', { button: 1 }, null);
    mouseEvt('mousedown', { button: 2 }, null);
    mouseEvt('mouseup', { button: 2 }, null);
    keepTrackApi.programs.mainCamera.isShiftPressed = true;
    uiInput.init();
    mouseEvt('mousedown', { button: 1 }, null);
    mouseEvt('mouseup', { button: 1 }, null);
    mouseEvt('mousedown', { button: 2 }, null);
    mouseEvt('mouseup', { button: 2 }, null);
    settingsManager.disableCameraControls = true;
    mouseEvt('mousedown', { button: 1 }, null);
    mouseEvt('mouseup', { button: 1 }, null);

    const evObj = new Event('touchmove', { bubbles: true, cancelable: false });
    uiInput.canvasMouseDown(evObj);
    (<any>evObj).originalEvent = {
      touches: [
        { pageX: 100, pageY: 100 },
        { pageX: 100, pageY: 100 },
      ],
    };
    uiInput.canvasTouchStart(evObj);
    uiInput.canvasMouseUp(evObj);
    uiInput.openRmbMenu();
    uiInput.openRmbMenu(1);

    (<any>evObj).originalEvent = {
      touches: [{ pageX: 100, pageY: 100 }],
    };
    uiInput.canvasTouchStart(evObj);
  });
});

// @ponicode
describe('uiInput.init', () => {
  test('0', () => {
    let result: any = uiInput.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiInput.unProject', () => {
  test('0', () => {
    let result: any = uiInput.unProject(350, 4);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = uiInput.unProject(50, 350);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = uiInput.unProject(1, 320);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = uiInput.unProject(1, 380);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = uiInput.unProject(350, 100);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = uiInput.unProject(NaN, NaN);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiInput.getSatIdFromCoordAlt', () => {
  test('0', () => {
    let result: any = uiInput.getSatIdFromCoordAlt(410, 410);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = uiInput.getSatIdFromCoordAlt(70, 1);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = uiInput.getSatIdFromCoordAlt(100, 1);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = uiInput.getSatIdFromCoordAlt(400, 520);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = uiInput.getSatIdFromCoordAlt(1, 4);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = uiInput.getSatIdFromCoordAlt(NaN, NaN);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiInput.getSatIdFromCoord', () => {
  test('0', () => {
    let result: any = uiInput.getSatIdFromCoord(350, 4);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = uiInput.getSatIdFromCoord(520, 90);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = uiInput.getSatIdFromCoord(320, 1);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = uiInput.getSatIdFromCoord(1, 50);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = uiInput.getSatIdFromCoord(30, 100);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = uiInput.getSatIdFromCoord(Infinity, Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiInput.getEarthScreenPoint', () => {
  test('0', () => {
    let result: any = uiInput.getEarthScreenPoint(400, 100);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = uiInput.getEarthScreenPoint(100, 400);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = uiInput.getEarthScreenPoint(50, 550);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = uiInput.getEarthScreenPoint(350, 400);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = uiInput.getEarthScreenPoint(520, 50);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = uiInput.getEarthScreenPoint(NaN, NaN);
    expect(result).toMatchSnapshot();
  });
});

describe('uiInput.rmbMenuActions', () => {
  beforeAll(() => {
    window.M = {
      toast: jest.fn(),
    };
    keepTrackApi.programs.mainCamera.screenDragPoint = [0, 0, 0];
  });
  test('0', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'view-info-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'view-sat-info-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'view-sensor-info-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'view-related-sats-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'view-curdops-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'view-24dops-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'create-sensor-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'reset-camera-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'clear-lines-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'line-eci-axis-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'line-earth-sat-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'line-sensor-sat-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('12', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'line-sat-sat-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'line-sat-sun-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('15', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'create-observer-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('16', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'colors-default-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('17', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'colors-default-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('18', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'colors-sunlight-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('19', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'colors-country-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('20', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'colors-velocity-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('21', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'colors-ageOfElset-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('22', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'earth-blue-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('23', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'earth-nasa-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('24', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'earth-trusat-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('25', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'earth-low-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('26', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'earth-high-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('27', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'earth-high-no-clouds-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('28', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'earth-vec-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('29', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'earth-political-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('30', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'clear-screen-rmb' } });
    expect(result).toMatchSnapshot();
  });

  test('30', () => {
    let result: any = uiInput.rmbMenuActions(<any>{ target: { id: 'FAKE' } });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiInput.hidePopUps', () => {
  test('0', () => {
    let result: any = uiInput.hidePopUps();
    expect(result).toMatchSnapshot();
  });
});

describe('uiInput.canvasMouseMove', () => {
  test('canvasMouseMove', () => {
    const canvasDom = document.createElement('canvas');
    keepTrackApi.programs.uiManager.uiInput.mouseMoveTimeout = -1;
    let result: any = uiInput.canvasMouseMove(<any>{ clientX: 100, clientY: 100 }, keepTrackApi.programs.mainCamera, canvasDom);
    expect(result).toMatchSnapshot();
  });
  test('canvasMouseMoveFire', () => {
    const canvasDom = {
      position: () => ({
        left: 100,
        top: 100,
      }),
    };
    keepTrackApi.programs.uiManager.uiInput.mouseMoveTimeout = -1;
    let result: any = uiInput.canvasMouseMoveFire(<any>{ clientX: 100, clientY: 100 }, keepTrackApi.programs.mainCamera, canvasDom);
    expect(result).toMatchSnapshot();
  });
});

describe('uiInput.canvasTouchMove', () => {
  test('0', () => {
    let result: any = uiInput.canvasTouchMove(<any>{ clientX: 100, clientY: 100 }, keepTrackApi.programs.mainCamera);
    expect(result).toMatchSnapshot();
  });
});

describe('uiInput.canvasTouchEnd', () => {
  test('0', () => {
    let result: any = uiInput.canvasTouchEnd(keepTrackApi.programs.mainCamera);
    expect(result).toMatchSnapshot();
  });
});
