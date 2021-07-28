/* eslint-disable no-undefined */
/*globals
  global
  test
  expect
*/

import { sun } from '@app/js/drawManager/sceneManager/sun.js';
import { timeManager } from '@app/js/timeManager/timeManager.ts';

const glMock = global.mocks.glMock;
document.body.innerHTML = global.docBody;

timeManager.init();

test(`Sun Functional Testing`, () => {
  sun.draw({}, {}, {});
  sun.init(glMock, {}, timeManager);

  sun.update();
  timeManager.propRate = 0;
  sun.update();

  sun.draw({}, {}, {});
  expect(true).toBe(true);
});
