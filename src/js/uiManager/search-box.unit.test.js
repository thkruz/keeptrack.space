/* eslint-disable no-undefined */
/*globals
  test
  expect
*/

import '@app/js/settingsManager/settingsManager.ts';
import 'jsdom-worker';
import { keepTrackApi } from '@app/js/api/externalApi';
import { searchBox } from '@app/js/uiManager/search-box.js';

test(`Basic Functions of Search Box`, () => {
  // Setup a unit test enviornment that doesn't worry about other modules
  let satSet = {};
  let satData = [];
  satData[0] = {
    static: true,
  };
  satData[1] = {
    marker: true,
  };
  satData[2] = {
    missile: true,
    active: false,
  };
  satData[3] = {
    C: 'ANALSAT',
    active: false,
  };
  satData[4] = {
    active: false,
  };
  satData[5] = {
    C: 'US',
    LS: 'AFETR',
    LV: 'U',
    ON: 'VANGUARD 1',
    OT: 1,
    R: '0.1220',
    SCC_NUM: '00005',
    TLE1: '1     5U 58002B   21107.45725112 -.00000113  00000-0 -16194-3 0  9999',
    TLE2: '2     5  34.2637  11.6832 1848228 280.4329  59.4145 10.84843191238363',
    active: true,
    apogee: 3845.1282721399293,
    argPe: 4.894477435916007,
    eccentricity: 0.1848228,
    id: 0,
    inclination: 0.5980143789155811,
    intlDes: '1958-002B',
    meanMotion: 10.843102290386977,
    perigee: 657.8610581463026,
    period: 132.80332154356245,
    raan: 0.2039103071690015,
    semiMajorAxis: 8622.494665143116,
    semiMinorAxis: 8473.945136538932,
    velocity: {},
  };
  satSet.getSatData = () => satData;
  satSet.missileSats = 100;
  satSet.setColorScheme = () => true;
  document.body.innerHTML += '<div id="search-results"></div>';
  document.body.innerHTML += '<div id="search"></div>';
  let groupsManager = {};
  groupsManager.clearSelect = () => true;
  groupsManager.createGroup = () => true;
  groupsManager.selectGroup = () => true;
  let orbitManager = {};
  let dotsManager = {};
  dotsManager.updateSizeBuffer = () => true;

  keepTrackApi.programs.satSet = satSet;
  keepTrackApi.programs.groupsManager = groupsManager;
  keepTrackApi.programs.orbitManager = orbitManager;
  keepTrackApi.programs.dotsManager = dotsManager;

  searchBox.init();

  // Run Tests
  expect(searchBox.isResultBoxOpen()).toBe(false);
  expect(searchBox.getLastResultGroup()).toBe(undefined);
  expect(searchBox.getCurrentSearch()).toBe(null);
  expect(searchBox.isHovering()).toBe(false);
  expect(searchBox.isHovering(true)).toBe(undefined);

  expect(searchBox.fillResultBox(0, satSet)).toBe(undefined);

  expect(searchBox.doSearch('', false, satSet)).toBe();
  expect(searchBox.doSearch('25', false, satSet)).toBe();
  expect(searchBox.doSearch('39208', false, satSet)).toStrictEqual([]);
  expect(searchBox.doSearch('39208', true, satSet)).toStrictEqual([]);
  expect(searchBox.doSearch('VANGUARD', true, satSet)).toStrictEqual([5]);
  expect(searchBox.getCurrentSearch()).toBe('VANGUARD');

  expect(searchBox.setHoverSat(39208)).toBe(undefined);
  expect(searchBox.getHoverSat()).toBe(39208);

  expect(searchBox.doArraySearch([5, 5])).toBe('00005,00005');

  let resultsA = satSet.getSatData();
  let resultsB = [];
  resultsB[0] = resultsA[5];
  resultsB[0].satId = 5;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);

  resultsB[0] = resultsA[5];
  satData[5].missile = true;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);
  satData[5].missile = false;

  resultsB[0] = resultsA[5];
  resultsB[0].isON = true;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);

  resultsB[0] = resultsA[5];
  resultsB[0].isON = true;
  satData[5].missile = true;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);
  satData[5].missile = false;

  resultsB[0] = resultsA[5];
  // eslint-disable-next-line camelcase
  resultsB[0].isSCC_NUM = true;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);
  // eslint-disable-next-line camelcase
  resultsB[0].isSCC_NUM = false;

  resultsB[0] = resultsA[5];
  resultsB[0].isIntlDes = true;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);

  resultsB[0].patlen = false;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);
});
