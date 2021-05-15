/* eslint-disable no-undefined */
/*globals
  test
  global
*/

import '@app/js/settingsManager/settingsManager.js';
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
  const cameraManager = {};

  uiInput.init(cameraManager, {}, {}, {}, {}, {}, {}, {}, {}, {}, { gl: {} }, {});
  window.dispatchEvent(new CustomEvent('scroll'));
  settingsManager.disableWindowScroll = false;
  settingsManager.disableNormalEvents = true;
  uiInput.init({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { gl: {} }, {});
  settingsManager.disableUI = true;
  uiInput.init({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { gl: {} }, {});
  settingsManager.disableUI = false;
  settingsManager.disableWindowScroll = false;
  settingsManager.disableNormalEvents = false;
  uiInput.init({}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { gl: {} }, {});
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
  uiInput.init(cameraManager, {}, {}, {}, {}, {}, {}, {}, {}, {}, { gl: {} }, {});
  mouseEvt('mousedown', { button: 1 });
  mouseEvt('mouseup', { button: 1 });
  mouseEvt('mousedown', { button: 2 });
  mouseEvt('mouseup', { button: 2 });
  settingsManager.disableCameraControls = true;
  mouseEvt('mousedown', { button: 1 });
  mouseEvt('mouseup', { button: 1 });
});
