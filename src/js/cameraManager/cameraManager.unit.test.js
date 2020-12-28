/* eslint-disable no-undefined */
/*globals
  test
  expect
*/

import '@app/js/keeptrack-head.js';
import { Camera } from '@app/js/cameraManager/camera.js';

let cameraManager = new Camera();

test(`isZoomIn`, () => {  
  expect(cameraManager.isZoomIn = true).toStrictEqual(true);
  expect(() => {
    cameraManager.isZoomIn = 'a'
  }).toThrow(TypeError);
});

test(`rotateEarth`, () => {  
  expect(cameraManager.rotateEarth(false)).toBe(undefined);
  expect(cameraManager.rotateEarth(undefined)).toBe(undefined);
  expect(() => {
    cameraManager.rotateEarth('yes')
  }).toThrow(TypeError);
});

test(`mouseX`, () => {  
  expect(cameraManager.mouseX = -250).toStrictEqual(-250);
  expect(() => {
    cameraManager.mouseX = true
  }).toThrow(TypeError);
});

test(`mouseY`, () => {  
  expect(cameraManager.mouseY = 500).toStrictEqual(500);
  expect(() => {
    cameraManager.mouseY = true
  }).toThrow(TypeError);
});

test(`zoomLevel`, () => {  
  cameraManager.zoomLevel = 0.4
  expect(cameraManager.zoomLevel).toStrictEqual(0.4);

  // Clamp between 0.0 and 1.0
  cameraManager.zoomLevel = 1.4
  expect(cameraManager.zoomLevel).toStrictEqual(1.0);

  expect(() => {
    cameraManager.zoomLevel='a'
  }).toThrow(TypeError);
});

test(`setCtrlPressed`, () => {  
  expect(cameraManager.isCtrlPressed = false).toStrictEqual(false);
  expect(() => {
    cameraManager.isCtrlPressed = 1
  }).toThrow(TypeError);
});

test(`setShiftPressed`, () => {  
  expect(cameraManager.isShiftPressed = true).toStrictEqual(true);
  expect(() => {
    cameraManager.isShiftPressed = 0
  }).toThrow(TypeError);
});

test(`cameraManager.cameraType.set`, () => {  
  expect(cameraManager.cameraType.set(1)).toBe(undefined);
  cameraManager.cameraType.set(3)
  expect(cameraManager.cameraType.current).toBe(3);
  expect(() => {
    cameraManager.cameraType.set(-1)
  }).toThrow(RangeError);
  expect(() => {
    cameraManager.cameraType.set(true)
  }).toThrow(TypeError);
});

test(`screenDragPoint`, () => {  
  expect(cameraManager.screenDragPoint = [-400,100]).toStrictEqual([-400,100]);
  expect(() => {
    cameraManager.screenDragPoint = [-400,100]
  }).not.toThrow(TypeError);
  expect(() => {
    cameraManager.screenDragPoint = true
  }).toThrow(TypeError);
  expect(() => {
    cameraManager.screenDragPoint = [200,-100,5]
  }).toThrow(TypeError);
  expect(() => {
    cameraManager.screenDragPoint = {x: 200,y: -100}
  }).toThrow(TypeError);
});

test(`cameraManager calculation shouldn't fail.`, () => {
  expect(cameraManager.calculate(-1,0.1)).toBe(undefined);
});