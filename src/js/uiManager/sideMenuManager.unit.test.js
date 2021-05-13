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
  console.log = jest.fn();

  window.settingsManager = settingsManager;
  const satSet = {
    searchAzElRange: jest.fn(),
    setColorScheme: jest.fn(),
    searchN2yo: jest.fn(),
    searchCelestrak: jest.fn(),
    getIdFromObjNum: jest.fn(() => null),
    getSatExtraOnly: () => ({
      SCC_NUM: 25544,
      eccentricity: 0.01,
      inclination: 50.0,
      raan: 50.0,
      argPe: 50.0,
      TLE1: '11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
      TLE2: '11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
    }),
    satCruncher: {
      postMessage: jest.fn(),
    },
    getSat: jest.fn(() => ({
      getTEARR: () => ({ lon: 0, lat: 0 }),
      getDirection: () => 'N',
      TLE1: '11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
      TLE2: '11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
    })),
  };
  const uiManager = {
    toast: jest.fn(),
    hideSideMenus: jest.fn(),
    doSearch: jest.fn(),
  };

  const sensorManager = {
    currentSensor: {
      shortName: 'COD',
    },
    sensorList: {
      COD: [],
    },
    checkSensorSelected: jest.fn(() => false),
    selectedSensor: {
      obsminaz: 347,
      obsmaxaz: 227,
      obsminel: 3,
      obsmaxel: 90,
      obsminrange: 100,
      obsmaxrange: 5500,
    },
  };

  const timeManager = {
    propOffset: 1,
    propRate: 1,
    selectedDate: 0,
    propTime: () => 0,
  };

  const cameraManager = {
    changeZoom: jest.fn(),
    latToPitch: jest.fn(),
    longToYaw: jest.fn(),
    camSnap: jest.fn(),
  };

  const satellite = {
    findBestPasses: jest.fn(() => []),
    twoline2satrec: jest.fn(() => []),
    gstime: jest.fn(() => 0),
    sgp4: jest.fn(() => 0),
    getDOPsTable: jest.fn(),
    setobs: jest.fn(),
    degreesLong: jest.fn(),
    degreesLat: jest.fn(),
    currentEpoch: () => [0, 0],
    getOrbitByLatLon: () => ['11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111', '11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111'],
    altitudeCheck: () => 10,
  };

  const omManager = {
    svs2analyst: jest.fn(),
  };

  const ColorScheme = {
    reloadColors: jest.fn(),
  };

  const orbitManager = {
    updateOrbitBuffer: jest.fn(),
  };

  const objectManager = {
    selectedSat: 0,
  };

  const missileManager = {
    missilesInUse: 500,
    Missile: jest.fn(),
    UsaICBM: [1, 1, 1, 1],
    globalBMTargets: [1, 1, 1, 1],
  };

  $.colorbox = jest.fn();

  sMM.init(satSet, uiManager, sensorManager, satellite, ColorScheme, omManager, timeManager, cameraManager, orbitManager, objectManager, missileManager);

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

  $('#n2yo-form').trigger('submit');
  $('#celestrak-form').trigger('submit');

  $('#editSat-newTLE').trigger('click');

  $('#editSat').trigger('submit');

  $('#editSat-save').trigger('click');

  $('#editSat-open').trigger('click');
  $('#editSat-file').trigger('change');

  $('#es-error').trigger('click');

  $('#map-menu').trigger('click');
  $('#socrates-menu').trigger('click');
  $('#satChng-menu').trigger('click');
  $('#watchlist-list').trigger('click');

  $('#newLaunch').trigger('submit');

  $('#breakup').trigger('submit');

  $('#missile').trigger('submit');

  $('#ms-attacker').trigger('change');
  $('#ms-target').trigger('change');

  $('#cs-telescope').trigger('click');

  $('#customSensor').trigger('submit');

  $('#dops-form').trigger('submit');

  sMM.hideSideMenus();

  expect(true).toBe(true);
});
