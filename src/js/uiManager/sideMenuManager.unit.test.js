/*globals
  global
  test
  expect
  $
  jest
*/

import { sMM } from '@app/js/uiManager/sideMenuManager.js';
import { settingsManager } from '@app/js/settingsManager/settingsManager.js';

document.body.innerHTML = global.docBody;

test(`sMM Unit Testing`, () => {
  window.settingsManager = settingsManager;
  const satSet = {
    searchAzElRange: jest.fn(),
    setColorScheme: jest.fn(),
  };
  const uiManager = {
    toast: jest.fn(),
  };

  const sensorManager = {
    currentSensor: {
      shortName: 'COD',
    },
    sensorList: {
      COD: [],
    },
  };

  const satellite = {
    findBestPasses: jest.fn(() => []),
    twoline2satrec: jest.fn(() => []),
    gstime: jest.fn(() => 0),
    sgp4: jest.fn(() => 0),
  };

  const omManager = {
    svs2analyst: jest.fn(),
  };

  const ColorScheme = {
    reloadColors: jest.fn(),
  };

  $.colorbox = jest.fn();

  sMM.init(satSet, uiManager, sensorManager, satellite, ColorScheme, omManager);

  $('#findByLooks').trigger('submit');
  satSet.searchAzElRange = jest.fn(() => []);
  $('#findByLooks').trigger('submit');
  satSet.searchAzElRange = jest.fn(() => [1]);
  $('#findByLooks').trigger('submit');

  $('#analysis-form').trigger('submit');
  sensorManager.currentSensor = [];
  $('#analysis-form').trigger('submit');

  sensorManager.checkSensorSelected = jest.fn(() => false);
  $('#analysis-bpt').trigger('submit');
  sensorManager.checkSensorSelected = jest.fn(() => true);
  $('#analysis-bpt').trigger('submit');

  $('#settings-form').trigger('change');

  $('#settings-riseset').trigger('change');

  $('#lookanglesLength').trigger('change');
  $('#lookanglesInterval').trigger('change');

  $('#settings-form').trigger('submit');

  $('#obfit-form').trigger('submit');

  expect(true).toBe(true);
});
