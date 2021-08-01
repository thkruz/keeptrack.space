/* eslint-disable no-undefined */
/*globals
  global
  test
  expect
*/

import { keepTrackApi } from '@app/js/api/externalApi';
import { sun } from '@app/js/drawManager/sceneManager/sun.js';
import { timeManager } from '@app/js/timeManager/timeManager.ts';

const glMock = global.mocks.glMock;
document.body.innerHTML = global.docBody;

keepTrackApi.programs.settingsManager = {
  plugins: {
    datetime: {},
  },
};
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
