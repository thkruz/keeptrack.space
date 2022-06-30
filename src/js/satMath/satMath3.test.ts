// TODO: Jest snapshots are currently dependent on local computer time. They
// should be updated to use the same time on all computers.

import { defaultSat, defaultSensor, keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import * as getTearData from './calc/getTearData';
import { findClosestApproachTime } from './find/findClosestApproachTime';
import * as getlookangles from './lookangles/getlookangles';
import * as satMath from './satMath';
import { satellite } from './satMath';
import * as createTle from './tle/createTle';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });
const dateNow = new Date(2022, 0, 1);
dateNow.setUTCHours(0, 0, 0, 0);

// @ponicode
describe('satMath.getlookangles', () => {
  test('0', () => {
    let result: any = getlookangles.getlookangles(defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    document.body.innerHTML = `<table id="looks"></table>`;
    keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
    let result: any = getlookangles.getlookangles(defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    document.body.innerHTML = `<table id="looks"></table>`;
    keepTrackApi.programs.sensorManager.checkSensorSelected = () => true;
    console.warn(satellite);
    jest.spyOn(getTearData, 'getTearData').mockImplementationOnce(() => ({
      time: dateNow.toISOString(),
      rng: 1000,
      az: 50,
      el: 30,
      name: 'COD',
    }));
    let result: any = getlookangles.getlookangles(defaultSat);
    expect(result).toMatchSnapshot();
  });
});

describe('satMath.findClosestApproachTime', () => {
  test('0', () => {
    let result: any = () => findClosestApproachTime(defaultSat, defaultSat, 5);
    expect(() => result()).not.toThrow;
  });
});

describe('satMath.createTle', () => {
  test('0', () => {
    let result: any = createTle.createTle({
      sat: defaultSat,
      inc: '10.01',
      meanmo: '15.15',
      rasc: '10.5',
      argPe: '1.0',
      meana: '10.5',
      ecen: '0.001',
      epochyr: '20',
      epochday: '123',
      intl: '1998-01A',
      scc: '25544',
    });
    expect(result).toMatchSnapshot();
  });
});

describe('satMath.populateMultiSiteTable', () => {
  test('0', () => {
    document.body.innerHTML = `<table id="looksmultisite"></table>`;
    const mSiteArray = [
      {
        time: dateNow.toISOString(),
        rng: 1000,
        az: 50,
        el: 30,
        name: 'COD',
      },
      {
        time: dateNow.toISOString(),
        rng: 1000,
        az: 50,
        el: 30,
        name: 'COD',
      },
    ];
    let result: any = getlookangles.populateMultiSiteTable(mSiteArray, defaultSat);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satMath.propagate', () => {
  test('0', () => {
    getTearData.getTearData(dateNow, satMath.satellite.twoline2satrec(defaultSat.TLE1, defaultSat.TLE2), [defaultSensor], false);
  });

  test('1', () => {
    getTearData.getTearData(dateNow, satMath.satellite.twoline2satrec(defaultSat.TLE1, defaultSat.TLE2), [defaultSensor], true);
  });
});

// @ponicode
describe('satMath.getlookanglesMultiSite', () => {
  test('0', () => {
    document.body.innerHTML = `<table id="looksmultisite"></table>`;
    let result: any = getlookangles.getlookanglesMultiSite(defaultSat);
    expect(result).toMatchSnapshot();
  });
});
