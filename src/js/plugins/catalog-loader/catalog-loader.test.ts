import '@app/js/settingsManager/settings';
import { expect } from '@jest/globals';
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms, SatObject, SettingsManager } from '../../api/keepTrackTypes';
import * as catalogLoader from './catalog-loader';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
const settingsManager = <SettingsManager>(<any>window).settingsManager;
settingsManager.installDirectory = '/';

// eslint-disable-next-line no-undef
$.get = jest.fn();

const respMock = [
  {
    C: 'US',
    LS: 'AFETR',
    LV: 'U',
    ON: 'VANGUARD 1',
    OT: 1,
    R: '0.1220',
    TLE1: '1 25544U 58002B   21202.94224798 -.00000127  00000-0 -15445-3 0  9996',
    TLE2: '2 25544  34.2499  77.5285 1845213 350.0840   6.7604 10.84826633248745',
  },
  {
    C: 'US',
    LS: 'AFETR',
    LV: 'U',
    ON: 'VANGUARD 1',
    OT: 1,
    R: '0.1220',
    TLE1: '1     5U 58002B   21202.94224798 -.00000127  00000-0 -15445-3 0  9996',
    TLE2: '2     5  34.2499  77.5285 1845213 350.0840   6.7604 10.84826633248745',
  },
];

const extraSats = [
  {
    SCC: 25544,
    TLE1: '1     5U 58002B   21202.94224798 -.00000127  00000-0 -15445-3 0  9996',
    TLE2: '2     5  34.2499  77.5285 1845213 350.0840   6.7604 10.84826633248745',
    ON: 'VANGUARD 1',
    OT: 1,
  },
  {
    SCC: 55555,
    TLE1: '1     5U 58002B   21202.94224798 -.00000127  00000-0 -15445-3 0  9996',
    TLE2: '2     5  34.2499  77.5285 1845213 350.0840   6.7604 10.84826633248745',
    ON: 'VANGUARD 1',
    OT: 1,
  },
];

const asciiSats = [
  {
    SCC: 25544,
    TLE1: '1     5U 58002B   21202.94224798 -.00000127  00000-0 -15445-3 0  9996',
    TLE2: '2     5  34.2499  77.5285 1845213 350.0840   6.7604 10.84826633248745',
  },
  {
    SCC: 12345,
    TLE1: '1     5U 58002B   21202.94224798 -.00000127  00000-0 -15445-3 0  9996',
    TLE2: '2     5  34.2499  77.5285 1845213 350.0840   6.7604 10.84826633248745',
  },
];

// @ponicode
describe('catalogLoader.parseCatalog', () => {
  test('0', () => {
    const callFunction: any = () => {
      catalogLoader.parseCatalog(respMock);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('catalogLoader.setupGetVariables', () => {
  test('0', () => {
    const callFunction: any = () => {
      catalogLoader.setupGetVariables();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('catalogLoader.filterTLEDatabase', () => {
  test('0', () => {
    const callFunction: any = () => {
      catalogLoader.filterTLEDatabase(<SatObject[]>(<unknown>respMock));
      catalogLoader.filterTLEDatabase(<SatObject[]>(<unknown>respMock), respMock);
      settingsManager.offline = true;
      settingsManager.limitSats = '25544';
      catalogLoader.filterTLEDatabase(<SatObject[]>(<unknown>respMock), respMock);
      settingsManager.limitSats = '';
      settingsManager.isExtraSatellitesAdded = true;
      document.body.innerHTML += '<div><div class="legend-trusat-box"></div></div>';
      document.body.innerHTML += '<div><div class="legend-trusat-box"></div></div>';
      document.body.innerHTML += '<div><div class="legend-trusat-box"></div></div>';
      document.body.innerHTML += '<div><div class="legend-trusat-box"></div></div>';
      catalogLoader.filterTLEDatabase(<SatObject[]>(<unknown>respMock), respMock, extraSats, asciiSats);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('catalogLoader.init', () => {
  test('0', () => {
    const callFunction: any = () => {
      catalogLoader.init();
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('catalogLoader.catalogLoader', () => {
  test('0', async () => {
    await catalogLoader.catalogLoader();
  });
});
