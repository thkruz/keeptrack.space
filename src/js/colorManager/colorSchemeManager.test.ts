// @ts-nocheck

import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { getDayOfYear } from '../timeManager/transforms';
import { colorSchemeManager } from './colorSchemeManager';
keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('colorSchemeManager.init', () => {
  test('0', () => {
    let result: any = colorSchemeManager.init();
    expect(result).toMatchSnapshot();
  });
});

describe('calculateColorBuffers', () => {
  beforeEach(() => {
    colorSchemeManager.init();
    settingsManager.dotsOnScreen = 4;
    colorSchemeManager.pickableData = [0, 0, 0, 1];
    colorSchemeManager.colorData = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  });

  test('0', () => {
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });

  test('1', () => {
    colorSchemeManager.calculateColorBuffers(false).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });

  test('2', () => {
    settingsManager.isFOVBubbleModeOn = true;
    keepTrackApi.programs.satSet.numSats = 2;
    // inst.satData = [0, 0, 0];
    // inst.selectSat = 0;
    // inst.hoverSat = 0;
    // inst.isVelocityColorScheme = true;
    // inst.isSunlightColorScheme = true;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
});

// @ponicode
describe('colorSchemeManager.resetObjectTypeFlags', () => {
  test('0', () => {
    let result: any = colorSchemeManager.resetObjectTypeFlags();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('colorSchemeManager.reloadColors', () => {
  test('0', () => {
    let result: any = colorSchemeManager.reloadColors();
    expect(result).toMatchSnapshot();
  });
});

describe('Test ColorRules', () => {
  beforeEach(() => {
    colorSchemeManager.init();
    settingsManager.isFOVBubbleModeOn = true;
    keepTrackApi.programs.satSet.numSats = 2;
    settingsManager.dotsOnScreen = 4;
    colorSchemeManager.pickableData = [0, 0, 0, 1];
    colorSchemeManager.colorData = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  });
  test('0', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.default;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('1', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.onlyFOV;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('2', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.sunlight;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('3', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.apogee;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('4', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.smallsats;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('5', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.rcs;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('6', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.countries;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('7', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.ageOfElset;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('8', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.lostobjects;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('9', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.leo;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('10', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.geo;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('11', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.velocity;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
  test('12', async () => {
    colorSchemeManager.currentColorScheme = colorSchemeManager.group;
    colorSchemeManager.calculateColorBuffers(true).then(() => {
      expect(colorSchemeManager.colorData).toMatchSnapshot();
    });
  });
});

// @ponicode
describe('colorSchemeManager.defaultRules', () => {
  beforeAll(() => {
    colorSchemeManager.init();
  });

  test('0', () => {
    let result: any = colorSchemeManager.default({
      static: true,
      type: SpaceObjectType.STAR,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = colorSchemeManager.default({
      static: true,
      vmag: 5,
      type: SpaceObjectType.STAR,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = colorSchemeManager.default({
      static: true,
      vmag: 3.6,
      type: SpaceObjectType.STAR,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = colorSchemeManager.default({
      static: true,
      vmag: 1,
      type: SpaceObjectType.STAR,
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Astronomy;
    let result: any = colorSchemeManager.default({});
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  test('5', () => {
    colorSchemeManager.objectTypeFlags.facility = false;
    let result: any = colorSchemeManager.default({
      static: true,
      type: SpaceObjectType.LAUNCH_FACILITY,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.facility = true;
  });

  test('6', () => {
    let result: any = colorSchemeManager.default({
      static: true,
      type: SpaceObjectType.LAUNCH_FACILITY,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = colorSchemeManager.default({
      marker: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = colorSchemeManager.default({
      isRadarData: true,
      missileComplex: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = colorSchemeManager.default({
      isRadarData: true,
      satId: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    let result: any = colorSchemeManager.default({
      isRadarData: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    colorSchemeManager.objectTypeFlags.sensor = false;
    let result: any = colorSchemeManager.default({
      static: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.sensor = true;
  });

  test('12', () => {
    let result: any = colorSchemeManager.default({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    let result: any = colorSchemeManager.default({
      missile: true,
    });
    expect(result).toMatchSnapshot();

    colorSchemeManager.objectTypeFlags.missile = false;
    result = colorSchemeManager.default({
      missile: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.missile = true;
  });

  test('14', () => {
    let result: any = colorSchemeManager.default({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();

    colorSchemeManager.objectTypeFlags.missile = false;
    result = colorSchemeManager.default({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.missile = true;
  });

  test('15', () => {
    colorSchemeManager.objectTypeFlags.payload = false;
    let result: any = colorSchemeManager.default({
      type: 1,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.payload = true;
  });

  test('16', () => {
    colorSchemeManager.objectTypeFlags.rocketBody = false;
    let result: any = colorSchemeManager.default({
      type: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.rocketBody = true;
  });

  test('17', () => {
    colorSchemeManager.objectTypeFlags.debris = false;
    let result: any = colorSchemeManager.default({
      type: 3,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.debris = true;
  });

  test('18', () => {
    colorSchemeManager.objectTypeFlags.trusat = false;
    let result: any = colorSchemeManager.default({
      type: 4,
      inView: false,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.trusat = true;
  });

  test('19', () => {
    colorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeManager.default({
      inView: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.inFOV = true;
  });

  test('20', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Planetarium;
    let result: any = colorSchemeManager.default({
      inView: true,
    });
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  test('21', () => {
    let result: any = colorSchemeManager.default({
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('22', () => {
    let result: any = colorSchemeManager.default({
      country: 'ANALSAT',
    });
    expect(result).toMatchSnapshot();
  });

  test('23', () => {
    let result: any = colorSchemeManager.default({
      type: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('24', () => {
    let result: any = colorSchemeManager.default({
      type: 2,
    });
    expect(result).toMatchSnapshot();
  });

  test('25', () => {
    let result: any = colorSchemeManager.default({
      type: 3,
    });
    expect(result).toMatchSnapshot();
  });

  test('26', () => {
    let result: any = colorSchemeManager.default({
      type: 4,
    });
    expect(result).toMatchSnapshot();
  });

  test('27', () => {
    let result: any = colorSchemeManager.default({
      type: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('28', () => {
    keepTrackApi.programs.satellite.obsmaxrange = 100;
    let result: any = colorSchemeManager.default({
      perigee: 10000,
    });
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.satellite.obsmaxrange = 10000;
  });

  test('29', () => {
    let result: any = colorSchemeManager.default({});
    expect(result).toMatchSnapshot();
  });
});

describe('colorSchemeManager.sunlightRules', () => {
  beforeAll(() => {
    colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.objectTypeFlags.facility = false;
    let result: any = colorSchemeManager.sunlight({
      static: true,
      type: SpaceObjectType.LAUNCH_FACILITY,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.facility = true;
  });

  test('1', () => {
    let result: any = colorSchemeManager.sunlight({
      static: true,
      type: SpaceObjectType.LAUNCH_FACILITY,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = colorSchemeManager.sunlight({
      static: true,
      type: SpaceObjectType.STAR,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = colorSchemeManager.sunlight({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = colorSchemeManager.sunlight({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 3.6,
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.sunlight({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 1,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeManager.sunlight({
      marker: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    colorSchemeManager.objectTypeFlags.sensor = false;
    let result: any = colorSchemeManager.sunlight({
      static: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.sensor = true;
  });

  test('8', () => {
    let result: any = colorSchemeManager.sunlight({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = colorSchemeManager.sunlight({
      missile: true,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = colorSchemeManager.sunlight({
      missile: true,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    colorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeManager.sunlight({
      inSun: 2,
      inView: true,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.inFOV = true;
  });

  test('11', () => {
    let result: any = colorSchemeManager.sunlight({
      inSun: 2,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('12', () => {
    colorSchemeManager.objectTypeFlags.satHi = true;
    let result: any = colorSchemeManager.sunlight({
      vmag: 0,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    colorSchemeManager.objectTypeFlags.satHi = true;
    let result: any = colorSchemeManager.sunlight({
      vmag: 3.1,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('14', () => {
    colorSchemeManager.objectTypeFlags.satHi = true;
    let result: any = colorSchemeManager.sunlight({
      vmag: 5,
      inSun: 2,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('15', () => {
    colorSchemeManager.objectTypeFlags.satMed = true;
    let result: any = colorSchemeManager.sunlight({
      vmag: 5,
      inSun: 1,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });

  test('16', () => {
    colorSchemeManager.objectTypeFlags.satLow = true;
    let result: any = colorSchemeManager.sunlight({
      vmag: 5,
      inSun: 0,
      inView: false,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('colorSchemeManager.smallsatsRules', () => {
  beforeAll(() => {
    colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.objectTypeFlags.satSmall = false;
    let result: any = colorSchemeManager.smallsats({
      type: 1,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.satSmall = true;
  });

  test('1', () => {
    let result: any = colorSchemeManager.smallsats({
      type: 1,
      rcs: '0.01',
    });
    expect(result).toMatchSnapshot();
  });
});

describe('colorSchemeManager.rcsRules', () => {
  beforeAll(() => {
    colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.objectTypeFlags.rcsSmall = false;
    let result: any = colorSchemeManager.rcs({
      rcs: '0.01',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.rcsSmall = true;
  });

  test('1', () => {
    let result: any = colorSchemeManager.rcs({
      rcs: '0.01',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.objectTypeFlags.rcsMed = false;
    let result: any = colorSchemeManager.rcs({
      rcs: '0.5',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.rcsMed = true;
  });

  test('3', () => {
    let result: any = colorSchemeManager.rcs({
      rcs: '0.5',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    colorSchemeManager.objectTypeFlags.rcsLarge = false;
    let result: any = colorSchemeManager.rcs({
      rcs: '1.5',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.rcsLarge = true;
  });

  test('5', () => {
    let result: any = colorSchemeManager.rcs({
      rcs: '1.5',
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    colorSchemeManager.objectTypeFlags.rcsUnknown = false;
    let result: any = colorSchemeManager.rcs({});
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.rcsUnknown = true;
  });

  test('7', () => {
    let result: any = colorSchemeManager.rcs({});
    expect(result).toMatchSnapshot();
  });
});

describe('colorSchemeManager.countriesRules', () => {
  beforeAll(() => {
    colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.objectTypeFlags.countryUS = false;
    let result: any = colorSchemeManager.countries({
      C: 'United States of America',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.countryUS = true;
  });

  test('1', () => {
    let result: any = colorSchemeManager.countries({
      C: 'United States of America',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.objectTypeFlags.countryPRC = false;
    let result: any = colorSchemeManager.countries({
      C: 'PRC',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.countryPRC = true;
  });

  test('3', () => {
    let result: any = colorSchemeManager.countries({
      C: 'PRC',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    colorSchemeManager.objectTypeFlags.countryCIS = false;
    let result: any = colorSchemeManager.countries({
      C: 'CIS',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.countryCIS = true;
  });

  test('5', () => {
    let result: any = colorSchemeManager.countries({
      C: 'CIS',
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    colorSchemeManager.objectTypeFlags.countryOther = false;
    let result: any = colorSchemeManager.countries({});
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.countryOther = true;
  });
});

describe('colorSchemeManager.ageOfElsetRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    colorSchemeManager.init();
  });

  test('0', () => {
    let result: any = colorSchemeManager.ageOfElset({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = colorSchemeManager.ageOfElset({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 3.6,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = colorSchemeManager.ageOfElset({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = colorSchemeManager.ageOfElset({
      static: true,
      type: SpaceObjectType.STAR,
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = colorSchemeManager.ageOfElset({
      static: true,
      type: SpaceObjectType.CONTORL_FACILITY,
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.ageOfElset({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeManager.ageOfElset({
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
    let result: any = colorSchemeManager.ageOfElset({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    colorSchemeManager.objectTypeFlags.ageMed = true;
    let now = new Date();
    now.setDate(now.getDate() - 3);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElset({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    colorSchemeManager.objectTypeFlags.ageOld = true;
    let now = new Date();
    now.setDate(now.getDate() - 15);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElset({
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
    let result: any = colorSchemeManager.ageOfElset({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    colorSchemeManager.objectTypeFlags.ageLost = false;
    let now = new Date();
    now.setDate(now.getDate() - 80);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElset({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.ageLost = true;
  });

  test('12', () => {
    let now = new Date();
    now.setDate(now.getDate() - 600);
    const jday = getDayOfYear(now);
    now = now.getFullYear();
    now = now.toString().substr(2, 2);
    colorSchemeManager.ageOfElset({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
  });
});

describe('colorSchemeManager.lostobjectsRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = colorSchemeManager.lostobjects({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = colorSchemeManager.lostobjects({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = colorSchemeManager.lostobjects({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = colorSchemeManager.lostobjects({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = colorSchemeManager.lostobjects({
      static: true,
      type: SpaceObjectType.LAUNCH_FACILITY,
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.lostobjects({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeManager.lostobjects({
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
    let result: any = colorSchemeManager.lostobjects({
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
    let result: any = colorSchemeManager.lostobjects({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    expect(result).toMatchSnapshot();
  });
});

describe('colorSchemeManager.leoRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = colorSchemeManager.leo({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = colorSchemeManager.leo({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = colorSchemeManager.leo({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = colorSchemeManager.leo({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = colorSchemeManager.leo({
      static: true,
      type: SpaceObjectType.LAUNCH_FACILITY,
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.leo({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeManager.leo({
      missile: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = colorSchemeManager.leo({
      apogee: 500000,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = colorSchemeManager.leo({
      apogee: 1000,
      inView: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    colorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeManager.leo({
      apogee: 1000,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.inFOV = true;
  });
});

describe('colorSchemeManager.geoRules', () => {
  beforeAll(() => {
    keepTrackApi.programs.timeManager.getDayOfYear = getDayOfYear;
    settingsManager.daysUntilObjectLost = 50;
    colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = colorSchemeManager.geo({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = colorSchemeManager.geo({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = colorSchemeManager.geo({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = colorSchemeManager.geo({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.starHi = true;
  });

  test('4', () => {
    let result: any = colorSchemeManager.geo({
      static: true,
      type: SpaceObjectType.LAUNCH_FACILITY,
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.geo({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = colorSchemeManager.geo({
      missile: true,
    });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = colorSchemeManager.geo({
      inView: true,
      perigee: 500000,
    });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = colorSchemeManager.geo({
      perigee: 1000,
    });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    colorSchemeManager.objectTypeFlags.inFOV = false;
    let result: any = colorSchemeManager.geo({
      perigee: 500000,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.inFOV = true;
  });
});

// Causes a Jest crash??
// NOTE: EVEN IF YOU SET TO SKIP!!
/*
describe.skip('colorSchemeManager.velocityRules', () => {
  beforeAll(() => {
    colorSchemeManager.init();
  });

  test('0', () => {
    colorSchemeManager.objectTypeFlags.starLow = true;
    let result: any = colorSchemeManager.velocity({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 5,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    colorSchemeManager.objectTypeFlags.starMed = true;
    let result: any = colorSchemeManager.velocity({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 3.5,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.objectTypeFlags.starHi = true;
    let result: any = colorSchemeManager.velocity({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    colorSchemeManager.objectTypeFlags.starHi = false;
    let result: any = colorSchemeManager.velocity({
      static: true,
      type: SpaceObjectType.STAR,
      vmag: 0,
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.starHi = true;
  });
  test('4', () => {
    let result: any = colorSchemeManager.velocity({
      static: true,
      type: SpaceObjectType.LAUNCH_FACILITY,
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.velocity({
      static: true,
    });
    expect(result).toMatchSnapshot();
  });
});
*/
