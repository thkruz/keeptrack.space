/* eslint-disable */

import '@app/js/keeptrack-head.js';
import { cameraManager } from '@app/js/cameraManager.js';

test(`setZoomIn`, () => {  
  expect(cameraManager.setZoomIn(true)).toBe(undefined);
  expect(() => {cameraManager.setZoomIn('a')}).toThrow(TypeError);
});

test(`rotateEarth`, () => {  
  expect(cameraManager.rotateEarth(false)).toBe(undefined);
  expect(cameraManager.rotateEarth(undefined)).toBe(undefined);
  expect(() => {cameraManager.rotateEarth('yes')}).toThrow(TypeError);
});

test(`setMouseX`, () => {  
  expect(cameraManager.setMouseX(-250)).toBe(undefined);
  expect(() => {cameraManager.setMouseX(true)}).toThrow(TypeError);
});

test(`setMouseY`, () => {  
  expect(cameraManager.setMouseY(500)).toBe(undefined);
  expect(() => {cameraManager.setMouseY(true)}).toThrow(TypeError);
});

test(`setZoomLevel`, () => {  
  expect(cameraManager.setZoomLevel(0.4)).toBe(undefined);
  expect(() => {cameraManager.setZoomLevel(1.2)}).toThrow(RangeError);
  expect(() => {cameraManager.setZoomLevel('a')}).toThrow(TypeError);
});

test(`setCtrlPressed`, () => {  
  expect(cameraManager.setCtrlPressed(false)).toBe(undefined);
  expect(() => {cameraManager.setCtrlPressed(1)}).toThrow(TypeError);
});

test(`setShiftPressed`, () => {  
  expect(cameraManager.setShiftPressed(true)).toBe(undefined);
  expect(() => {cameraManager.setShiftPressed(0)}).toThrow(TypeError);
  expect(() => {cameraManager.setShiftPressed()}).toThrow(TypeError);
});

test(`cameraManager.cameraType.set`, () => {  
  expect(cameraManager.cameraType.set(1)).toBe(undefined);
  cameraManager.cameraType.set(3)
  expect(cameraManager.cameraType.current).toBe(3);
  expect(() => {cameraManager.cameraType.set(-1)}).toThrow(RangeError);
  expect(() => {cameraManager.cameraType.set(true)}).toThrow(TypeError);
});

test(`screenDragPoint`, () => {  
  expect(cameraManager.screenDragPoint([-400,100])).toBe(undefined);
  expect(() => {cameraManager.screenDragPoint([-400,100])}).not.toThrow(TypeError);
  expect(() => {cameraManager.screenDragPoint(true)}).toThrow(TypeError);
  expect(() => {cameraManager.screenDragPoint([200,-100,5])}).toThrow(TypeError);
  expect(() => {cameraManager.screenDragPoint({x: 200,y: -100})}).toThrow(TypeError);
});

test(`cameraManager calculation shouldn't fail.`, () => {
  expect(cameraManager.calculate(-1,0.1)).toBe(undefined);
});