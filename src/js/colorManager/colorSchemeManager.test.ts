// @ts-nocheck

import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { getDayOfYear } from '../timeManager/transforms';
import * as colorSchemeManager from './colorSchemeManager';
keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('colorSchemeManager.init', () => {
  test('0', () => {
    let result: any = colorSchemeManager.colorSchemeManager.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('colorSchemeManager.resetObjectTypeFlags', () => {
  test('0', () => {
    let result: any = colorSchemeManager.colorSchemeManager.resetObjectTypeFlags();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('colorSchemeManager.reloadColors', () => {
  test('0', () => {
    let result: any = colorSchemeManager.colorSchemeManager.reloadColors();
    expect(result).toMatchSnapshot();
  });
});

describe('Test ColorRules', () => {
  beforeEach(() => {
    colorSchemeManager.colorSchemeManager.init();
    settingsManager.isFOVBubbleModeOn = true;
    keepTrackApi.programs.satSet.numSats = 2;
  });
  test('0', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.default.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('1', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.onlyFOV.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('2', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.sunlight.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('3', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.apogee.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('4', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.smallsats.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('5', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.rcs.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('6', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.countries.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('7', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.ageOfElset.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('8', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.lostobjects.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('9', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.leo.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('10', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.geo.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('11', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.velocity.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('12', async () => {
    let result: any = await colorSchemeManager.colorSchemeManager.group.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('colorSchemeManager.defaultRules', () => {
  beforeAll(() => {
    colorSchemeManager.colorSchemeManager.init();
  });

  test('0', () => {
    let result: any = colorSchemeManager.defaultRules({
      static: true,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = colorSchemeManager.defaultRules({
      static: true,
      vmag: 5,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = colorSchemeManager.defaultRules({
      static: true,
      vmag: 3.6,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = colorSchemeManager.defaultRules({
      static: true,
      vmag: 1,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Astronomy;
    let result: any = colorSchemeManager.defaultRules({});
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  test('5', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.facility = false;
    let result: any = colorSchemeManager.defaultRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.facility = true;
  });

  test('6', () => {
    let result: any = colorSchemeManager.defaultRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = colorSchemeManager.defaultRules({
      marker: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = colorSchemeManager.defaultRules({
      isRadarData: true,
      missileComplex: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = colorSchemeManager.defaultRules({
      isRadarData: true,
      satId: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    let result: any = colorSchemeManager.defaultRules({
      isRadarData: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.sensor = false;
    let result: any = colorSchemeManager.defaultRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.sensor = true;
  });

  test('12', () => {
    let result: any = colorSchemeManager.defaultRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    let result: any = colorSchemeManager.defaultRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();

    colorSchemeManager.colorSchemeManager.objectTypeFlags.missile = false;
    result = colorSchemeManager.defaultRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.missile = true;
  });

  test('14', () => {
    let result: any = colorSchemeManager.defaultRules({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();

    colorSchemeManager.colorSchemeManager.objectTypeFlags.missile = false;
    result = colorSchemeManager.defaultRules({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.missile = true;
  });

  test('15', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.payload = false;
    let result: any = colorSchemeManager.defaultRules({
      OT: 1,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.payload = true;
  });

  test('16', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.rocketBody = false;
    let result: any = colorSchemeManager.defaultRules({
      OT: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.rocketBody = true;
  });

  test('17', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.debris = false;
    let result: any = colorSchemeManager.defaultRules({
      OT: 3,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.debris = true;
  });

  test('18', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.trusat = false;
    let result: any = colorSchemeManager.defaultRules({
      OT: 4,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.trusat = true;
  });

  test('19', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeManager.defaultRules({
      inView: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.inFOV = true;
  });

  test('20', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Planetarium;
    let result: any = colorSchemeManager.defaultRules({
      inView: true,
    });
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  test('21', () => {
    let result: any = colorSchemeManager.defaultRules({
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('22', () => {
    let result: any = colorSchemeManager.defaultRules({
      C: 'ANALSAT',
    });
    expect(result).toMatchSnapshot();
  });

  test('23', () => {
    let result: any = colorSchemeManager.defaultRules({
      OT: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('24', () => {
    let result: any = colorSchemeManager.defaultRules({
      OT: 2,
    });
    expect(result).toMatchSnapshot();
  });

  test('25', () => {
    let result: any = colorSchemeManager.defaultRules({
      OT: 3,
    });
    expect(result).toMatchSnapshot();
  });

  test('26', () => {
    let result: any = colorSchemeManager.defaultRules({
      OT: 4,
    });
    expect(result).toMatchSnapshot();
  });

  test('27', () => {
    let result: any = colorSchemeManager.defaultRules({
      OT: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('28', () => {
    keepTrackApi.programs.satellite.obsmaxrange = 100;
    let result: any = colorSchemeManager.defaultRules({
      perigee: 10000,
    });
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.satellite.obsmaxrange = 10000;
  });

  test('29', () => {
    let result: any = colorSchemeManager.defaultRules({});
    expect(result).toMatchSnapshot();
  });
});

describe('colorSchemeManager.sunlightRules', () => {
  beforeAll(() => {
    colorSchemeManager.colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.facility = false;
    let result: any = colorSchemeManager.sunlightRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.facility = true;
  });

  test('1', () => {
    let result: any = colorSchemeManager.sunlightRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = colorSchemeManager.sunlightRules({
      static: true,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = colorSchemeManager.sunlightRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = colorSchemeManager.sunlightRules({
      static: true,
      type: 'Star',
      vmag: 3.6,
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.sunlightRules({
      static: true,
      type: 'Star',
      vmag: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeManager.sunlightRules({
      marker: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.sensor = false;
    let result: any = colorSchemeManager.sunlightRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.sensor = true;
  });

  test('8', () => {
    let result: any = colorSchemeManager.sunlightRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = colorSchemeManager.sunlightRules({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = colorSchemeManager.sunlightRules({
      missile: true,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeManager.sunlightRules({
      inSun: 2,
      inView: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.inFOV = true;
  });

  test('11', () => {
    let result: any = colorSchemeManager.sunlightRules({
      inSun: 2,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('12', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.satHi = true;
    let result: any = colorSchemeManager.sunlightRules({
      vmag: 0,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.satHi = true;
    let result: any = colorSchemeManager.sunlightRules({
      vmag: 3.1,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('14', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.satHi = true;
    let result: any = colorSchemeManager.sunlightRules({
      vmag: 5,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('15', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.satMed = true;
    let result: any = colorSchemeManager.sunlightRules({
      vmag: 5,
      inSun: 1,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('16', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.satLow = true;
    let result: any = colorSchemeManager.sunlightRules({
      vmag: 5,
      inSun: 0,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('colorSchemeManager.smallsatsRules', () => {
  beforeAll(() => {
    colorSchemeManager.colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.satSmall = false;
    let result: any = colorSchemeManager.smallsatsRules({
      OT: 1,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.satSmall = true;
  });

  test('1', () => {
    let result: any = colorSchemeManager.smallsatsRules({
      OT: 1,
      R: 0.01,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('colorSchemeManager.rcsRules', () => {
  beforeAll(() => {
    colorSchemeManager.colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.rcsSmall = false;
    let result: any = colorSchemeManager.rcsRules({
      R: 0.01,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.rcsSmall = true;
  });

  test('1', () => {
    let result: any = colorSchemeManager.rcsRules({
      R: 0.01,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.rcsMed = false;
    let result: any = colorSchemeManager.rcsRules({
      R: 0.5,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.rcsMed = true;
  });

  test('3', () => {
    let result: any = colorSchemeManager.rcsRules({
      R: 0.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.rcsLarge = false;
    let result: any = colorSchemeManager.rcsRules({
      R: 1.5,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.rcsLarge = true;
  });

  test('5', () => {
    let result: any = colorSchemeManager.rcsRules({
      R: 1.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.rcsUnknown = false;
    let result: any = colorSchemeManager.rcsRules({});
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.rcsUnknown = true;
  });

  test('7', () => {
    let result: any = colorSchemeManager.rcsRules({});
    expect(result).toMatchSnapshot();
  });
});

describe('colorSchemeManager.countriesRules', () => {
  beforeAll(() => {
    colorSchemeManager.colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.countryUS = false;
    let result: any = colorSchemeManager.countriesRules({
      C: 'US',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.countryUS = true;
  });

  test('1', () => {
    let result: any = colorSchemeManager.countriesRules({
      C: 'US',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.countryPRC = false;
    let result: any = colorSchemeManager.countriesRules({
      C: 'PRC',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.countryPRC = true;
  });

  test('3', () => {
    let result: any = colorSchemeManager.countriesRules({
      C: 'PRC',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.countryCIS = false;
    let result: any = colorSchemeManager.countriesRules({
      C: 'CIS',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.countryCIS = true;
  });

  test('5', () => {
    let result: any = colorSchemeManager.countriesRules({
      C: 'CIS',
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.countryOther = false;
    let result: any = colorSchemeManager.countriesRules({});
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.countryOther = true;
  });
});

describe('colorSchemeManager.ageOfElsetRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    colorSchemeManager.colorSchemeManager.init();
  });

  test('0', () => {
    let result: any = colorSchemeManager.ageOfElsetRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = colorSchemeManager.ageOfElsetRules({
      static: true,
      type: 'Star',
      vmag: 3.6,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = colorSchemeManager.ageOfElsetRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = colorSchemeManager.ageOfElsetRules({
      static: true,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = colorSchemeManager.ageOfElsetRules({
      static: true,
      type: 'Control Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.ageOfElsetRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeManager.ageOfElsetRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let now = new Date();
    now.setDate(now.getDate());
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.ageMed = true;
    let now = new Date();
    now.setDate(now.getDate() - 3);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.ageOld = true;
    let now = new Date();
    now.setDate(now.getDate() - 15);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    let now = new Date();
    now.setDate(now.getDate() - 80);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.ageLost = false;
    let now = new Date();
    now.setDate(now.getDate() - 80);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.ageLost = true;
  });

  test('12', () => {
    let now = new Date();
    now.setDate(now.getDate() - 600);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    colorSchemeManager.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
  });
});

describe('colorSchemeManager.lostobjectsRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    colorSchemeManager.colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = colorSchemeManager.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = colorSchemeManager.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = colorSchemeManager.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = colorSchemeManager.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = colorSchemeManager.lostobjectsRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.lostobjectsRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeManager.lostobjectsRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let now = new Date();
    now.setDate(now.getDate());
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.lostobjectsRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let now = new Date();
    now.setDate(now.getDate() - 600);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.lostobjectsRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('colorSchemeManager.leoRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    colorSchemeManager.colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = colorSchemeManager.leoRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = colorSchemeManager.leoRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = colorSchemeManager.leoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = colorSchemeManager.leoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = colorSchemeManager.leoRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.leoRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeManager.leoRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = colorSchemeManager.leoRules({
      apogee: 500000,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = colorSchemeManager.leoRules({
      apogee: 1000,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeManager.leoRules({
      apogee: 1000,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.inFOV = true;
  });
});

describe('colorSchemeManager.geoRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    colorSchemeManager.colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = colorSchemeManager.geoRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = colorSchemeManager.geoRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = colorSchemeManager.geoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = colorSchemeManager.geoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = colorSchemeManager.geoRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.geoRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeManager.geoRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = colorSchemeManager.geoRules({
      inView: true,
      perigee: 500000,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = colorSchemeManager.geoRules({
      perigee: 1000,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeManager.geoRules({
      perigee: 500000,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.inFOV = true;
  });
});

describe('colorSchemeManager.velocityRules', () => {
  beforeAll(() => {
    colorSchemeManager.colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = colorSchemeManager.velocityRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = colorSchemeManager.velocityRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = colorSchemeManager.velocityRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = colorSchemeManager.velocityRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.colorSchemeManager.objectTypeFlags.starHi = true;
  });
});

// Causes a Jest crash??
// describe.skip('colorSchemeManager.velocityRules', () => {
//   beforeAll(() => {
//     colorSchemeManager.colorSchemeManager.init();
//   });

//   test('4', () => {
//     let result: any = colorSchemeManager.velocityRules({
//       static: true,
//       type: 'Launch Facility',
//     });
//     expect(result).toMatchSnapshot();
//   });

//   test('5', () => {
//     let result: any = colorSchemeManager.velocityRules({
//       static: true,
//     });
//     expect(result).toMatchSnapshot();
//   });
// });
