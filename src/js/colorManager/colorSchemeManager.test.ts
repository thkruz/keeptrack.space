// @ts-nocheck

import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/externalApi';
import { getDayOfYear } from '../timeManager/transforms';
import * as ColorSchemeManager from './colorSchemeManager';
keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('ColorSchemeManager.init', () => {
  test('0', () => {
    let result: any = ColorSchemeManager.ColorSchemeManager.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('ColorSchemeManager.resetObjectTypeFlags', () => {
  test('0', () => {
    let result: any = ColorSchemeManager.ColorSchemeManager.resetObjectTypeFlags();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('ColorSchemeManager.reloadColors', () => {
  test('0', () => {
    let result: any = ColorSchemeManager.ColorSchemeManager.reloadColors();
    expect(result).toMatchSnapshot();
  });
});

describe('Test ColorRules', () => {
  beforeEach(() => {
    ColorSchemeManager.ColorSchemeManager.init();
    settingsManager.isFOVBubbleModeOn = true;
    keepTrackApi.programs.satSet.numSats = 2;
  });
  test('0', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.default.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('1', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.onlyFOV.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('2', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.sunlight.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('3', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.apogee.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('4', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.smallsats.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('5', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.rcs.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('6', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.countries.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('7', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.ageOfElset.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('8', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.lostobjects.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('9', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.leo.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('10', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.geo.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('11', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.velocity.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
  test('12', async () => {
    let result: any = await ColorSchemeManager.ColorSchemeManager.group.calculateColorBuffers(true);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('ColorSchemeManager.defaultRules', () => {
  beforeAll(() => {
    ColorSchemeManager.ColorSchemeManager.init();
  });

  test('0', () => {
    let result: any = ColorSchemeManager.defaultRules({
      static: true,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = ColorSchemeManager.defaultRules({
      static: true,
      vmag: 5,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = ColorSchemeManager.defaultRules({
      static: true,
      vmag: 3.6,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = ColorSchemeManager.defaultRules({
      static: true,
      vmag: 1,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Astronomy;
    let result: any = ColorSchemeManager.defaultRules({});
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  test('5', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.facility = false;
    let result: any = ColorSchemeManager.defaultRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.facility = true;
  });

  test('6', () => {
    let result: any = ColorSchemeManager.defaultRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = ColorSchemeManager.defaultRules({
      marker: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = ColorSchemeManager.defaultRules({
      isRadarData: true,
      missileComplex: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = ColorSchemeManager.defaultRules({
      isRadarData: true,
      satId: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    let result: any = ColorSchemeManager.defaultRules({
      isRadarData: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.sensor = false;
    let result: any = ColorSchemeManager.defaultRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.sensor = true;
  });

  test('12', () => {
    let result: any = ColorSchemeManager.defaultRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    let result: any = ColorSchemeManager.defaultRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();

    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.missile = false;
    result = ColorSchemeManager.defaultRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.missile = true;
  });

  test('14', () => {
    let result: any = ColorSchemeManager.defaultRules({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();

    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.missile = false;
    result = ColorSchemeManager.defaultRules({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.missile = true;
  });

  test('15', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.payload = false;
    let result: any = ColorSchemeManager.defaultRules({
      OT: 1,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.payload = true;
  });

  test('16', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.rocketBody = false;
    let result: any = ColorSchemeManager.defaultRules({
      OT: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.rocketBody = true;
  });

  test('17', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.debris = false;
    let result: any = ColorSchemeManager.defaultRules({
      OT: 3,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.debris = true;
  });

  test('18', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.trusat = false;
    let result: any = ColorSchemeManager.defaultRules({
      OT: 4,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.trusat = true;
  });

  test('19', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = ColorSchemeManager.defaultRules({
      inView: true,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.inFOV = true;
  });

  test('20', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Planetarium;
    let result: any = ColorSchemeManager.defaultRules({
      inView: true,
    });
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  test('21', () => {
    let result: any = ColorSchemeManager.defaultRules({
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('22', () => {
    let result: any = ColorSchemeManager.defaultRules({
      C: 'ANALSAT',
    });
    expect(result).toMatchSnapshot();
  });

  test('23', () => {
    let result: any = ColorSchemeManager.defaultRules({
      OT: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('24', () => {
    let result: any = ColorSchemeManager.defaultRules({
      OT: 2,
    });
    expect(result).toMatchSnapshot();
  });

  test('25', () => {
    let result: any = ColorSchemeManager.defaultRules({
      OT: 3,
    });
    expect(result).toMatchSnapshot();
  });

  test('26', () => {
    let result: any = ColorSchemeManager.defaultRules({
      OT: 4,
    });
    expect(result).toMatchSnapshot();
  });

  test('27', () => {
    let result: any = ColorSchemeManager.defaultRules({
      OT: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('28', () => {
    keepTrackApi.programs.satellite.obsmaxrange = 100;
    let result: any = ColorSchemeManager.defaultRules({
      perigee: 10000,
    });
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.satellite.obsmaxrange = 10000;
  });

  test('29', () => {
    let result: any = ColorSchemeManager.defaultRules({});
    expect(result).toMatchSnapshot();
  });
});

describe('ColorSchemeManager.sunlightRules', () => {
  beforeAll(() => {
    ColorSchemeManager.ColorSchemeManager.init();
  });

  test('0', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.facility = false;
    let result: any = ColorSchemeManager.sunlightRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.facility = true;
  });

  test('1', () => {
    let result: any = ColorSchemeManager.sunlightRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = ColorSchemeManager.sunlightRules({
      static: true,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = ColorSchemeManager.sunlightRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = ColorSchemeManager.sunlightRules({
      static: true,
      type: 'Star',
      vmag: 3.6,
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = ColorSchemeManager.sunlightRules({
      static: true,
      type: 'Star',
      vmag: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = ColorSchemeManager.sunlightRules({
      marker: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.sensor = false;
    let result: any = ColorSchemeManager.sunlightRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.sensor = true;
  });

  test('8', () => {
    let result: any = ColorSchemeManager.sunlightRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = ColorSchemeManager.sunlightRules({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = ColorSchemeManager.sunlightRules({
      missile: true,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = ColorSchemeManager.sunlightRules({
      inSun: 2,
      inView: true,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.inFOV = true;
  });

  test('11', () => {
    let result: any = ColorSchemeManager.sunlightRules({
      inSun: 2,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('12', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.satHi = true;
    let result: any = ColorSchemeManager.sunlightRules({
      vmag: 0,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.satHi = true;
    let result: any = ColorSchemeManager.sunlightRules({
      vmag: 3.1,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('14', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.satHi = true;
    let result: any = ColorSchemeManager.sunlightRules({
      vmag: 5,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('15', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.satMed = true;
    let result: any = ColorSchemeManager.sunlightRules({
      vmag: 5,
      inSun: 1,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('16', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.satLow = true;
    let result: any = ColorSchemeManager.sunlightRules({
      vmag: 5,
      inSun: 0,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('ColorSchemeManager.smallsatsRules', () => {
  beforeAll(() => {
    ColorSchemeManager.ColorSchemeManager.init();
  });

  test('0', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.satSmall = false;
    let result: any = ColorSchemeManager.smallsatsRules({
      OT: 1,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.satSmall = true;
  });

  test('1', () => {
    let result: any = ColorSchemeManager.smallsatsRules({
      OT: 1,
      R: 0.01,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('ColorSchemeManager.rcsRules', () => {
  beforeAll(() => {
    ColorSchemeManager.ColorSchemeManager.init();
  });

  test('0', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.rcsSmall = false;
    let result: any = ColorSchemeManager.rcsRules({
      R: 0.01,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.rcsSmall = true;
  });

  test('1', () => {
    let result: any = ColorSchemeManager.rcsRules({
      R: 0.01,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.rcsMed = false;
    let result: any = ColorSchemeManager.rcsRules({
      R: 0.5,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.rcsMed = true;
  });

  test('3', () => {
    let result: any = ColorSchemeManager.rcsRules({
      R: 0.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.rcsLarge = false;
    let result: any = ColorSchemeManager.rcsRules({
      R: 1.5,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.rcsLarge = true;
  });

  test('5', () => {
    let result: any = ColorSchemeManager.rcsRules({
      R: 1.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.rcsUnknown = false;
    let result: any = ColorSchemeManager.rcsRules({});
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.rcsUnknown = true;
  });

  test('7', () => {
    let result: any = ColorSchemeManager.rcsRules({});
    expect(result).toMatchSnapshot();
  });
});

describe('ColorSchemeManager.countriesRules', () => {
  beforeAll(() => {
    ColorSchemeManager.ColorSchemeManager.init();
  });

  test('0', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.countryUS = false;
    let result: any = ColorSchemeManager.countriesRules({
      C: 'US',
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.countryUS = true;
  });

  test('1', () => {
    let result: any = ColorSchemeManager.countriesRules({
      C: 'US',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.countryPRC = false;
    let result: any = ColorSchemeManager.countriesRules({
      C: 'PRC',
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.countryPRC = true;
  });

  test('3', () => {
    let result: any = ColorSchemeManager.countriesRules({
      C: 'PRC',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.countryCIS = false;
    let result: any = ColorSchemeManager.countriesRules({
      C: 'CIS',
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.countryCIS = true;
  });

  test('5', () => {
    let result: any = ColorSchemeManager.countriesRules({
      C: 'CIS',
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.countryOther = false;
    let result: any = ColorSchemeManager.countriesRules({});
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.countryOther = true;
  });
});

describe('ColorSchemeManager.ageOfElsetRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    ColorSchemeManager.ColorSchemeManager.init();
  });

  test('0', () => {
    let result: any = ColorSchemeManager.ageOfElsetRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = ColorSchemeManager.ageOfElsetRules({
      static: true,
      type: 'Star',
      vmag: 3.6,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = ColorSchemeManager.ageOfElsetRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = ColorSchemeManager.ageOfElsetRules({
      static: true,
      type: 'Star',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = ColorSchemeManager.ageOfElsetRules({
      static: true,
      type: 'Control Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = ColorSchemeManager.ageOfElsetRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = ColorSchemeManager.ageOfElsetRules({
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
    let result: any = ColorSchemeManager.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.ageMed = true;
    let now = new Date();
    now.setDate(now.getDate() - 3);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = ColorSchemeManager.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.ageOld = true;
    let now = new Date();
    now.setDate(now.getDate() - 15);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = ColorSchemeManager.ageOfElsetRules({
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
    let result: any = ColorSchemeManager.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.ageLost = false;
    let now = new Date();
    now.setDate(now.getDate() - 80);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = ColorSchemeManager.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.ageLost = true;
  });

  test('12', () => {
    let now = new Date();
    now.setDate(now.getDate() - 600);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    ColorSchemeManager.ageOfElsetRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
  });
});

describe('ColorSchemeManager.lostobjectsRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    ColorSchemeManager.ColorSchemeManager.init();
  });

  test('0', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = ColorSchemeManager.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = ColorSchemeManager.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = ColorSchemeManager.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = ColorSchemeManager.lostobjectsRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = ColorSchemeManager.lostobjectsRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = ColorSchemeManager.lostobjectsRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = ColorSchemeManager.lostobjectsRules({
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
    let result: any = ColorSchemeManager.lostobjectsRules({
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
    let result: any = ColorSchemeManager.lostobjectsRules({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('ColorSchemeManager.leoRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    ColorSchemeManager.ColorSchemeManager.init();
  });

  test('0', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = ColorSchemeManager.leoRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = ColorSchemeManager.leoRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = ColorSchemeManager.leoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = ColorSchemeManager.leoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = ColorSchemeManager.leoRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = ColorSchemeManager.leoRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = ColorSchemeManager.leoRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = ColorSchemeManager.leoRules({
      apogee: 500000,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = ColorSchemeManager.leoRules({
      apogee: 1000,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = ColorSchemeManager.leoRules({
      apogee: 1000,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.inFOV = true;
  });
});

describe('ColorSchemeManager.geoRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    ColorSchemeManager.ColorSchemeManager.init();
  });

  test('0', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = ColorSchemeManager.geoRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = ColorSchemeManager.geoRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = ColorSchemeManager.geoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = ColorSchemeManager.geoRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = ColorSchemeManager.geoRules({
      static: true,
      type: 'Launch Facility',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = ColorSchemeManager.geoRules({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = ColorSchemeManager.geoRules({
      missile: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = ColorSchemeManager.geoRules({
      inView: true,
      perigee: 500000,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = ColorSchemeManager.geoRules({
      perigee: 1000,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = ColorSchemeManager.geoRules({
      perigee: 500000,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.inFOV = true;
  });
});

describe('ColorSchemeManager.velocityRules', () => {
  beforeAll(() => {
    ColorSchemeManager.ColorSchemeManager.init();
  });

  test('0', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = ColorSchemeManager.velocityRules({
      static: true,
      type: 'Star',
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = ColorSchemeManager.velocityRules({
      static: true,
      type: 'Star',
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = ColorSchemeManager.velocityRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = ColorSchemeManager.velocityRules({
      static: true,
      type: 'Star',
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    ColorSchemeManager.ColorSchemeManager.objectTypeFlags.starHi = true;
  });
});

// Causes a Jest crash??
// describe.skip('ColorSchemeManager.velocityRules', () => {
//   beforeAll(() => {
//     ColorSchemeManager.ColorSchemeManager.init();
//   });

//   test('4', () => {
//     let result: any = ColorSchemeManager.velocityRules({
//       static: true,
//       type: 'Launch Facility',
//     });
//     expect(result).toMatchSnapshot();
//   });

//   test('5', () => {
//     let result: any = ColorSchemeManager.velocityRules({
//       static: true,
//     });
//     expect(result).toMatchSnapshot();
//   });
// });
