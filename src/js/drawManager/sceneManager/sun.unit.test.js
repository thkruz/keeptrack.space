/* eslint-disable no-undefined */
/*globals
  global
  test
  expect
*/

import { sun } from '@app/js/drawManager/sceneManager/sun.js';

const glMock = global.mocks.glMock;

test(`Sun Unit Testing`, () => {
  sun.getScreenCoords({}, {});
  sun.sunScreenPosition = {};
  sun.sunScreenPosition.x = 100;
  sun.sunScreenPosition.y = 100;

  sun.godraysPostProcessing(glMock, {});

  expect(true).toBe(true);
});
