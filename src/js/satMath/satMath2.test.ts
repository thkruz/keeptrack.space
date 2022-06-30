// TODO: Jest snapshots are currently dependent on local computer time. They
// should be updated to use the same time on all computers.

import { defaultSat, defaultSensor, keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import * as calculateLookAngles from './calc/calculateLookAngles';
import * as getEci from './calc/getEci';
import { getOrbitByLatLon } from './calc/getOrbitByLatLon';
import * as findBestPass from './find/findBestPass';
import { findBestPasses } from './find/findBestPasses';
import { findCloseObjects } from './find/findCloseObjects';
import { findNearbyObjectsByOrbit } from './find/findNearbyObjectsByOrbit';
import { eci2ll, eci2rae } from './transforms';
import * as lookAngles2Ecf from './transforms/lookAngles2Ecf';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
const dateNow = new Date(2022, 0, 1);
dateNow.setUTCHours(0, 0, 0, 0);

// @ponicode
describe.skip('satMath.findCloseObjects', () => {
  test('0', () => {
    let result: any = findCloseObjects();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.getOrbitByLatLon', () => {
  test('0', () => {
    let result: any = getOrbitByLatLon(defaultSat, 0, 0, 'N', dateNow, 1000, 0);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.calculateLookAngles', () => {
  test('0', () => {
    calculateLookAngles.calculateLookAngles(defaultSat, [defaultSensor]);
  });
});

// @ponicode
describe('satMath.findBestPasses', () => {
  test('0', () => {
    let result: any = findBestPasses('25544', defaultSensor);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.findBestPass', () => {
  test('0', () => {
    findBestPass.findBestPass(defaultSat, [defaultSensor]);
  });
});

// @ponicode
describe('satMath.eci2Rae', () => {
  test('0', () => {
    eci2rae(dateNow, [10000, 10000, 10000], defaultSensor);
  });
});

// @ponicode
describe('satMath.getEci', () => {
  test('0', () => {
    getEci.getEci(defaultSat, dateNow);
  });
});

// @ponicode
describe.skip('satMath.findNearbyObjectsByOrbit', () => {
  test('0', () => {
    let result: any = findNearbyObjectsByOrbit(defaultSat);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.lookAngles2Ecf', () => {
  test('0', () => {
    let result: any = lookAngles2Ecf.lookAngles2ecf(47, 20, 2000, 41, -71, 0);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = lookAngles2Ecf.lookAngles2ecf(167, 20, 5000, 41, -71, 0);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.eci2ll', () => {
  test('0', () => {
    eci2ll(1000, 2000, 4000);
  });

  test('1', () => {
    eci2ll(-1000, 5000, 0);
  });
});
