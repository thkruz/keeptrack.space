/*globals
  global
  test
  expect
  jest
*/

import { ColorScheme } from '@app/js/colorManager/color-scheme.js';
import { settingsManager } from '@app/js/settingsManager/settingsManager.ts';

const glMock = global.mocks.glMock;
document.body.innerHTML = global.docBody;

test(`ColorScheme Unit Testing`, () => {
  window.settingsManager = settingsManager;
  const satSet = {
    getSatData: jest.fn(() => [
      {
        velocity: {
          total: 0,
        },
      },
      {
        velocity: {
          total: 0,
        },
      },
    ]),
    getSatInView: jest.fn(() => [1, 2, 3, 4, 5, 6]),
    getSatVel: jest.fn(() => [1, 2, 3, 4, 5, 6, 7, 8, 9]),
    getSatInSun: jest.fn(() => [1, 2, 3, 4, 5, 6]),
    numSats: 2,
  };

  let _colorRuleSet = jest.fn(() => ({ color: [0, 0.1, 0.2, 0.3], pickable: 0 }));
  const colorRuleSet = jest.fn(() => _colorRuleSet());

  const colorManager = new ColorScheme(glMock, satSet, {}, colorRuleSet);

  colorManager.calculateColorBuffers();

  colorManager.isVelocityColorScheme = true;
  colorManager.isSunlightColorScheme = true;
  settingsManager.isFOVBubbleModeOn = true;

  colorManager.calculateColorBuffers();

  colorManager.lastCalculation = 0;
  colorManager.calculateColorBuffers();

  colorManager.selectSat = 0;
  colorManager.hoverSat = 1;
  _colorRuleSet = jest.fn(() => ({ color: [0, 0.1, 0.2, 0.3], pickable: 1 }));
  satSet.getSatInView = jest.fn(() => false);
  colorManager.isVelocityColorScheme = false;
  satSet.getSatInSun = jest.fn(() => false);

  colorManager.lastCalculation = 0;
  colorManager.calculateColorBuffers();

  expect(true).toBe(true);
});
