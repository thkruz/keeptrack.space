/* eslint-disable no-undefined */
/*globals
  test
  expect
*/

import '@app/js/settingsManager/settingsManager.ts';
import { Camera } from '@app/js/cameraManager/camera.js';

let cameraManager = new Camera();

test(`isZoomIn`, () => {
  expect((cameraManager.isZoomIn = true)).toStrictEqual(true);
  expect(() => {
    cameraManager.isZoomIn = 'a';
  }).toThrow(TypeError);
});

test(`rotateEarth`, () => {
  expect(cameraManager.rotateEarth(false)).toBe(undefined);
  expect(cameraManager.rotateEarth(undefined)).toBe(undefined);
  expect(() => {
    cameraManager.rotateEarth('yes');
  }).toThrow(TypeError);
});

test(`mouseX`, () => {
  expect((cameraManager.mouseX = -250)).toStrictEqual(-250);
  expect(() => {
    cameraManager.mouseX = true;
  }).toThrow(TypeError);

  cameraManager.mouseX = 200;
  expect(cameraManager.mouseX).toStrictEqual(200);
});

test(`mouseY`, () => {
  expect((cameraManager.mouseY = 500)).toStrictEqual(500);
  expect(() => {
    cameraManager.mouseY = true;
  }).toThrow(TypeError);

  cameraManager.mouseY = 200;
  expect(cameraManager.mouseY).toStrictEqual(200);
});

test(`zoomLevel`, () => {
  cameraManager.zoomLevel = 0.4;
  expect(cameraManager.zoomLevel).toStrictEqual(0.4);

  // Clamp between 0.0 and 1.0
  cameraManager.zoomLevel = 1.4;
  expect(cameraManager.zoomLevel).toStrictEqual(1.0);
  cameraManager.zoomLevel = -1.4;
  expect(cameraManager.zoomLevel).toStrictEqual(0.0);

  expect(() => {
    cameraManager.zoomLevel = 'a';
  }).toThrow(TypeError);
});

test(`setCtrlPressed`, () => {
  expect((cameraManager.isCtrlPressed = false)).toStrictEqual(false);
  expect(() => {
    cameraManager.isCtrlPressed = 1;
  }).toThrow(TypeError);

  cameraManager.isCtrlPressed = true;
  expect(cameraManager.isCtrlPressed).toStrictEqual(true);
});

test(`setShiftPressed`, () => {
  expect((cameraManager.isShiftPressed = true)).toStrictEqual(true);
  expect(() => {
    cameraManager.isShiftPressed = 0;
  }).toThrow(TypeError);

  cameraManager.isShiftPressed = true;
  expect(cameraManager.isShiftPressed).toStrictEqual(true);
});

test(`cameraManager.cameraType.set`, () => {
  expect(cameraManager.cameraType.set(1)).toBe(undefined);
  cameraManager.cameraType.set(3);
  expect(cameraManager.cameraType.current).toBe(3);
  expect(() => {
    cameraManager.cameraType.set(-1);
  }).toThrow(RangeError);
  expect(() => {
    cameraManager.cameraType.set(true);
  }).toThrow(TypeError);
});

test(`screenDragPoint`, () => {
  expect((cameraManager.screenDragPoint = [-400, 100])).toStrictEqual([-400, 100]);
  expect(() => {
    cameraManager.screenDragPoint = [-400, 100];
  }).not.toThrow(TypeError);
  expect(() => {
    cameraManager.screenDragPoint = true;
  }).toThrow(TypeError);
  expect(() => {
    cameraManager.screenDragPoint = [200, -100, 5];
  }).toThrow(TypeError);
  expect(() => {
    cameraManager.screenDragPoint = { x: 200, y: -100 };
  }).toThrow(TypeError);

  cameraManager.screenDragPoint = [-100, 250];
  expect(cameraManager.screenDragPoint).toStrictEqual([-100, 250]);
});

test(`cameraManager calculation shouldn't fail.`, () => {
  expect(cameraManager.calculate(-1, 0.1)).toBe(undefined);
});

test(`changeZoom`, () => {
  expect(cameraManager.changeZoom('geo')).toBe(undefined);
  cameraManager.changeZoom('geo');
  expect(cameraManager.zoomTarget).toStrictEqual(0.82);

  expect(cameraManager.changeZoom('leo')).toBe(undefined);
  cameraManager.changeZoom('leo');
  expect(cameraManager.zoomTarget).toStrictEqual(0.45);

  expect(cameraManager.changeZoom(0.82)).toBe(undefined);
  cameraManager.changeZoom(0.82);
  expect(cameraManager.zoomTarget).toStrictEqual(0.82);
  cameraManager.changeZoom(1.42);
  expect(cameraManager.zoomTarget).toStrictEqual(1.0);

  expect(() => {
    cameraManager.changeZoom('meo');
  }).toThrow('Invalid Zoom Value');
});

test(`normalizeAngle`, () => {
  expect(Camera.normalizeAngle(0.89)).toStrictEqual(0.89);
  expect(Camera.normalizeAngle(20)).toStrictEqual(1.1504440784612413);
  expect(Camera.normalizeAngle(-5)).toStrictEqual(1.2831853071795862);
  expect(Camera.normalizeAngle(-3.16)).toStrictEqual(3.123185307179586);
  expect(Camera.normalizeAngle(6.2)).toStrictEqual(-0.08318530717958605);
});

test(`panning/rotate`, () => {
  cameraManager.isPanning = true;
  cameraManager.panReset = true;
  cameraManager.isLocalRotate = true;
  cameraManager.isLocalRotateRoll = true;
  cameraManager.isLocalRotateYaw = true;
  settingsManager.isMobileModeEnabled = false;
  settingsManager.ftsRotateReset = true;
  cameraManager.calculate(1, 1);

  cameraManager.update();
});
