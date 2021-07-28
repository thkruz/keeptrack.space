/* eslint-disable no-undefined */
/*globals
  test
  global
*/

import '@app/js/settingsManager/settingsManager.ts';
import { keepTrackApi } from '@app/js/api/externalApi';
import { uiInput } from './ui-input';

document.body.innerHTML = global.docBody;

const keyEvt = (evt, param) => {
  const event = new window.KeyboardEvent(evt, param);
  window.dispatchEvent(event);
};

const mouseEvt = (evt, param, el) => {
  const event = new window.MouseEvent(evt, param);
  el = el || window;
  el.dispatchEvent(event);
};

test('UI Input Validation Test', () => {
  keyEvt('keydown', { which: '61', ctrlKey: true });

  settingsManager.disableWindowScroll = true;
  const cameraManager = {
    rotateEarth: () => true,
  };
  keepTrackApi.programs.cameraManager = cameraManager;

  const uiManager = {
    clearRMBSubMenu: () => true,
    updateURL: () => true,
  };
  keepTrackApi.programs.uiManager = uiManager;

  const lineManager = {
    getLineListLen: () => 0,
  };
  keepTrackApi.programs.lineManager = lineManager;

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

  mouseEvt('mousedown', { button: 1 });
  mouseEvt('mouseup', { button: 1 });
  mouseEvt('mousedown', { button: 2 });
  mouseEvt('mouseup', { button: 2 });
  cameraManager.isShiftPressed = true;
  uiInput.init();
  mouseEvt('mousedown', { button: 1 });
  mouseEvt('mouseup', { button: 1 });
  mouseEvt('mousedown', { button: 2 });
  mouseEvt('mouseup', { button: 2 });
  settingsManager.disableCameraControls = true;
  mouseEvt('mousedown', { button: 1 });
  mouseEvt('mouseup', { button: 1 });

  const evObj = new Event('touchmove', { bubbles: true, cancelable: false });
  uiInput.canvasMouseDown(evObj);
  evObj.originalEvent = {
    touches: [
      { pageX: 100, pageY: 100 },
      { pageX: 100, pageY: 100 },
    ],
  };
  uiInput.canvasTouchStart(evObj);
  uiInput.canvasMouseUp(evObj);
  uiInput.openRmbMenu();
});
