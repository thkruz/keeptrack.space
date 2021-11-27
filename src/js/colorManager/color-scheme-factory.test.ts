// @ts-nocheck

import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/externalApi';
import { getDayOfYear } from '../timeManager/transforms';
import * as colorSchemeFactory from './color-scheme-factory';
keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('ColorSchemeFactory.init', () => {
  test('0', () => {
    let result: any = colorSchemeFactory.ColorSchemeFactory.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('ColorSchemeFactory.resetObjectTypeFlags', () => {
  test('0', () => {
    let result: any = colorSchemeFactory.ColorSchemeFactory.resetObjectTypeFlags();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('ColorSchemeFactory.reloadColors', () => {
  test('0', () => {
    let result: any = colorSchemeFactory.ColorSchemeFactory.reloadColors();
    expect(result).toMatchSnapshot();
  });
});

describe('Test ColorRules', () => {
  beforeEach(() => {
    colorSchemeFactory.ColorSchemeFactory.init();
    settingsManager.isFOVBubbleModeOn = true;
    keepTrackApi.programs.satSet.numSats = 2;
  });
  test('0', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.default.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('1', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.onlyFOV.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('2', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.sunlight.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('3', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.apogee.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('4', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.smallsats.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('5', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.rcs.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('6', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.countries.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('7', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.ageOfElset.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('8', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.lostobjects.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('9', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.leo.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('10', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.geo.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('11', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.velocity.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('12', async () => {
    let result: any = await colorSchemeFactory.ColorSchemeFactory.group.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('ColorSchemeFactory.defaultRules', () => {
  beforeAll(() => {
    colorSchemeFactory.ColorSchemeFactory.init();
  });

  test('0', () => {
    let result: any = colorSchemeFactory.defaultRules({
      static: true,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = colorSchemeFactory.defaultRules({
      static: true,
      vmag: 5,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = colorSchemeFactory.defaultRules({
      static: true,
      vmag: 3.6,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = colorSchemeFactory.defaultRules({
      static: true,
      vmag: 1,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Astronomy;
    let result: any = colorSchemeFactory.defaultRules({});
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  test('5', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.facility = false;
    let result: any = colorSchemeFactory.defaultRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.facility = true;
  });

  test('6', () => {
    let result: any = colorSchemeFactory.defaultRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = colorSchemeFactory.defaultRules({
      marker: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = colorSchemeFactory.defaultRules({
      isRadarData: true,
      missileComplex: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = colorSchemeFactory.defaultRules({
      isRadarData: true,
      satId: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    let result: any = colorSchemeFactory.defaultRules({
      isRadarData: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.sensor = false;
    let result: any = colorSchemeFactory.defaultRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.sensor = true;
  });

  test('12', () => {
    let result: any = colorSchemeFactory.defaultRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    let result: any = colorSchemeFactory.defaultRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();

    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.missile = false;
    result = colorSchemeFactory.defaultRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.missile = true;
  });

  test('14', () => {
    let result: any = colorSchemeFactory.defaultRules({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();

    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.missile = false;
    result = colorSchemeFactory.defaultRules({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.missile = true;
  });

  test('15', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.payload = false;
    let result: any = colorSchemeFactory.defaultRules({
      OT: 1,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.payload = true;
  });

  test('16', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.rocketBody = false;
    let result: any = colorSchemeFactory.defaultRules({
      OT: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.rocketBody = true;
  });

  test('17', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.debris = false;
    let result: any = colorSchemeFactory.defaultRules({
      OT: 3,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.debris = true;
  });

  test('18', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.trusat = false;
    let result: any = colorSchemeFactory.defaultRules({
      OT: 4,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.trusat = true;
  });

  test('19', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeFactory.defaultRules({
      inView: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.inFOV = true;
  });

  test('20', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Planetarium;
    let result: any = colorSchemeFactory.defaultRules({
      inView: true,
    });
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  test('21', () => {
    let result: any = colorSchemeFactory.defaultRules({
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('22', () => {
    let result: any = colorSchemeFactory.defaultRules({
      C: 'ANALSAT',
    });
    expect(result).toMatchSnapshot();
  });

  test('23', () => {
    let result: any = colorSchemeFactory.defaultRules({
      OT: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('24', () => {
    let result: any = colorSchemeFactory.defaultRules({
      OT: 2,
    });
    expect(result).toMatchSnapshot();
  });

  test('25', () => {
    let result: any = colorSchemeFactory.defaultRules({
      OT: 3,
    });
    expect(result).toMatchSnapshot();
  });

  test('26', () => {
    let result: any = colorSchemeFactory.defaultRules({
      OT: 4,
    });
    expect(result).toMatchSnapshot();
  });

  test('27', () => {
    let result: any = colorSchemeFactory.defaultRules({
      OT: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('28', () => {
    keepTrackApi.programs.satellite.obsmaxrange = 100;
    let result: any = colorSchemeFactory.defaultRules({
      perigee: 10000,
    });
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.satellite.obsmaxrange = 10000;
  });

  test('29', () => {
    let result: any = colorSchemeFactory.defaultRules({});
    expect(result).toMatchSnapshot();
  });
});

describe('ColorSchemeFactory.sunlightRules', () => {
  beforeAll(() => {
    colorSchemeFactory.ColorSchemeFactory.init();
  });

  test('0', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.facility = false;
    let result: any = colorSchemeFactory.sunlightRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.facility = true;
  });

  test('1', () => {
    let result: any = colorSchemeFactory.sunlightRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = colorSchemeFactory.sunlightRules({
      static: true,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = colorSchemeFactory.sunlightRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = colorSchemeFactory.sunlightRules({
      static: true,
      type: 'Star',
      vmag: 3.6,
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeFactory.sunlightRules({
      static: true,
      type: 'Star',
      vmag: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeFactory.sunlightRules({
      marker: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.sensor = false;
    let result: any = colorSchemeFactory.sunlightRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.sensor = true;
  });

  test('8', () => {
    let result: any = colorSchemeFactory.sunlightRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = colorSchemeFactory.sunlightRules({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = colorSchemeFactory.sunlightRules({
      missile: true,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeFactory.sunlightRules({
      inSun: 2,
      inView: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.inFOV = true;
  });

  test('11', () => {
    let result: any = colorSchemeFactory.sunlightRules({
      inSun: 2,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('12', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.satHi = true;
    let result: any = colorSchemeFactory.sunlightRules({
      vmag: 0,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.satHi = true;
    let result: any = colorSchemeFactory.sunlightRules({
      vmag: 3.1,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('14', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.satHi = true;
    let result: any = colorSchemeFactory.sunlightRules({
      vmag: 5,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('15', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.satMed = true;
    let result: any = colorSchemeFactory.sunlightRules({
      vmag: 5,
      inSun: 1,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('16', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.satLow = true;
    let result: any = colorSchemeFactory.sunlightRules({
      vmag: 5,
      inSun: 0,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('ColorSchemeFactory.smallsatsRules', () => {
  beforeAll(() => {
    colorSchemeFactory.ColorSchemeFactory.init();
  });

  test('0', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.satSmall = false;
    let result: any = colorSchemeFactory.smallsatsRules({
      OT: 1,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.satSmall = true;
  });

  test('1', () => {
    let result: any = colorSchemeFactory.smallsatsRules({
      OT: 1,
      R: 0.01,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('ColorSchemeFactory.rcsRules', () => {
  beforeAll(() => {
    colorSchemeFactory.ColorSchemeFactory.init();
  });

  test('0', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.rcsSmall = false;
    let result: any = colorSchemeFactory.rcsRules({
      R: 0.01,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.rcsSmall = true;
  });

  test('1', () => {
    let result: any = colorSchemeFactory.rcsRules({
      R: 0.01,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.rcsMed = false;
    let result: any = colorSchemeFactory.rcsRules({
      R: 0.5,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.rcsMed = true;
  });

  test('3', () => {
    let result: any = colorSchemeFactory.rcsRules({
      R: 0.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.rcsLarge = false;
    let result: any = colorSchemeFactory.rcsRules({
      R: 1.5,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.rcsLarge = true;
  });

  test('5', () => {
    let result: any = colorSchemeFactory.rcsRules({
      R: 1.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.rcsUnknown = false;
    let result: any = colorSchemeFactory.rcsRules({});
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.rcsUnknown = true;
  });

  test('7', () => {
    let result: any = colorSchemeFactory.rcsRules({});
    expect(result).toMatchSnapshot();
  });
});

describe('ColorSchemeFactory.countriesRules', () => {
  beforeAll(() => {
    colorSchemeFactory.ColorSchemeFactory.init();
  });

  test('0', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.countryUS = false;
    let result: any = colorSchemeFactory.countriesRules({
      C: 'US',
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.countryUS = true;
  });

  test('1', () => {
    let result: any = colorSchemeFactory.countriesRules({
      C: 'US',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.countryPRC = false;
    let result: any = colorSchemeFactory.countriesRules({
      C: 'PRC',
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.countryPRC = true;
  });

  test('3', () => {
    let result: any = colorSchemeFactory.countriesRules({
      C: 'PRC',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.countryCIS = false;
    let result: any = colorSchemeFactory.countriesRules({
      C: 'CIS',
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.countryCIS = true;
  });

  test('5', () => {
    let result: any = colorSchemeFactory.countriesRules({
      C: 'CIS',
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.countryOther = false;
    let result: any = colorSchemeFactory.countriesRules({});
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.countryOther = true;
  });
});

describe('ColorSchemeFactory.ageOfElsetRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    colorSchemeFactory.ColorSchemeFactory.init();
  });

  test('0', () => {
    let result: any = colorSchemeFactory.ageOfElsetRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = colorSchemeFactory.ageOfElsetRules({
      static: true,
      type: 'Star',
      vmag: 3.6,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = colorSchemeFactory.ageOfElsetRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = colorSchemeFactory.ageOfElsetRules({
      static: true,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = colorSchemeFactory.ageOfElsetRules({
      static: true,
      type: 'Control Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeFactory.ageOfElsetRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeFactory.ageOfElsetRules({
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
    let result: any = colorSchemeFactory.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.ageMed = true;
    let now = new Date();
    now.setDate(now.getDate() - 3);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeFactory.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.ageOld = true;
    let now = new Date();
    now.setDate(now.getDate() - 15);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeFactory.ageOfElsetRules({
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
    let result: any = colorSchemeFactory.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.ageLost = false;
    let now = new Date();
    now.setDate(now.getDate() - 80);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeFactory.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.ageLost = true;
  });

  test('12', () => {
    let now = new Date();
    now.setDate(now.getDate() - 600);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeFactory.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(() => result).not.toThrow();
  });
});

describe('ColorSchemeFactory.lostobjectsRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    colorSchemeFactory.ColorSchemeFactory.init();
  });

  test('0', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starLow = true;
    let result: any = colorSchemeFactory.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starMed = true;
    let result: any = colorSchemeFactory.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = true;
    let result: any = colorSchemeFactory.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = false;
    let result: any = colorSchemeFactory.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = colorSchemeFactory.lostobjectsRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeFactory.lostobjectsRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeFactory.lostobjectsRules({
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
    let result: any = colorSchemeFactory.lostobjectsRules({
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
    let result: any = colorSchemeFactory.lostobjectsRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('ColorSchemeFactory.leoRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    colorSchemeFactory.ColorSchemeFactory.init();
  });

  test('0', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starLow = true;
    let result: any = colorSchemeFactory.leoRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starMed = true;
    let result: any = colorSchemeFactory.leoRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = true;
    let result: any = colorSchemeFactory.leoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = false;
    let result: any = colorSchemeFactory.leoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = colorSchemeFactory.leoRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeFactory.leoRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeFactory.leoRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = colorSchemeFactory.leoRules({
      apogee: 500000,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = colorSchemeFactory.leoRules({
      apogee: 1000,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeFactory.leoRules({
      apogee: 1000,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.inFOV = true;
  });
});

describe('ColorSchemeFactory.geoRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    colorSchemeFactory.ColorSchemeFactory.init();
  });

  test('0', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starLow = true;
    let result: any = colorSchemeFactory.geoRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starMed = true;
    let result: any = colorSchemeFactory.geoRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = true;
    let result: any = colorSchemeFactory.geoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = false;
    let result: any = colorSchemeFactory.geoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = colorSchemeFactory.geoRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeFactory.geoRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeFactory.geoRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = colorSchemeFactory.geoRules({
      inView: true,
      perigee: 500000,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = colorSchemeFactory.geoRules({
      perigee: 1000,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeFactory.geoRules({
      perigee: 500000,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.inFOV = true;
  });
});

describe('ColorSchemeFactory.velocityRules', () => {
  beforeAll(() => {
    colorSchemeFactory.ColorSchemeFactory.init();
  });

  test('0', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starLow = true;
    let result: any = colorSchemeFactory.velocityRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starMed = true;
    let result: any = colorSchemeFactory.velocityRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = true;
    let result: any = colorSchemeFactory.velocityRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = false;
    let result: any = colorSchemeFactory.velocityRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeFactory.ColorSchemeFactory.objectTypeFlags.starHi = true;
  });
});

// Causes a Jest crash??
// describe.skip('ColorSchemeFactory.velocityRules', () => {
//   beforeAll(() => {
//     colorSchemeFactory.ColorSchemeFactory.init();
//   });

//   test('4', () => {
//     let result: any = colorSchemeFactory.velocityRules({
//       static: true,
//       type: 'Launch Facility',
//     });
//     expect(result).toMatchSnapshot();
//   });

//   test('5', () => {
//     let result: any = colorSchemeFactory.velocityRules({
//       static: true,
//     });
//     expect(result).toMatchSnapshot();
//   });
// });
