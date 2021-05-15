/* eslint-disable no-undefined */
/*globals
  test
  global
*/

import { earth } from '@app/js/drawManager/sceneManager/earth.js';

test(`Earth Unit Testing`, () => {
  earth.init(global.mocks.glMock);
  earth.loadHiRes();
  earth.imgHiRes.onload();
  earth.loadHiResNight();
  earth.nightImg.onload();
  earth.bumpMap.img.onload();
  earth.specularMap.img.onload();
});
