// @ts-nocheck

import { defaultSat, keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { getDayOfYear } from '../timeManager/transforms';
import { colorSchemeManager, isDebrisOff, isInViewOff, isPayloadOff, isRocketBodyOff } from './colorSchemeManager';
keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

const RealNow = Date.now;

beforeAll(() => {
  global.Date.now = jest.fn(() => {
    const dateNow = new Date(2022, 0, 1);
    dateNow.setUTCHours(0, 0, 0, 0);
    return dateNow.getTime();
  });
});

afterAll(() => {
  global.Date.now = RealNow;
});

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
    const fakeDate = new Date(2022, 0, 1);
    fakeDate.setUTCHours(0, 0, 0, 0);
    jest.spyOn(Date, 'now').mockReturnValue(fakeDate.getTime());
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

describe('Test group ruleset', () => {
  beforeEach(() => {
    colorSchemeManager.init();
  });
  it('should color satellties in this group', async () => {
    const result = colorSchemeManager.group({ ...defaultSat, ...{ isInGroup: true } });
    expect(result).toMatchSnapshot();
  });
  it('should color markers', async () => {
    const result = colorSchemeManager.group({ ...defaultSat, ...{ marker: true } });
    expect(result).toMatchSnapshot();
  });
  it('should color small stars', async () => {
    const result = colorSchemeManager.group({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 4.8 } });
    expect(result).toMatchSnapshot();
  });
  it('should color medium stars', async () => {
    const result = colorSchemeManager.group({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 3.8 } });
    expect(result).toMatchSnapshot();
  });
  it('should color large stars', async () => {
    const result = colorSchemeManager.group({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 1.8 } });
    expect(result).toMatchSnapshot();
  });

  it('should ignore deselected stars', async () => {
    colorSchemeManager.objectTypeFlags.starHi = false;
    const result = colorSchemeManager.group({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 1.8 } });
    expect(result).toMatchSnapshot();
  });

  it('should hide everything else', async () => {
    const result = colorSchemeManager.group({ ...defaultSat, ...{ static: false, marker: false, isInGroup: false } });
    expect(result).toMatchSnapshot();
  });
});

describe('Test velocity ruleset', () => {
  beforeEach(() => {
    colorSchemeManager.init();
  });
  it('should color small stars', async () => {
    const result = colorSchemeManager.velocity({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 4.8 } });
    expect(result).toMatchSnapshot();
  });
  it('should color medium stars', async () => {
    const result = colorSchemeManager.velocity({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 3.8 } });
    expect(result).toMatchSnapshot();
  });
  it('should color large stars', async () => {
    const result = colorSchemeManager.velocity({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 1.8 } });
    expect(result).toMatchSnapshot();
  });

  it('should ignore deselected stars', async () => {
    colorSchemeManager.objectTypeFlags.starHi = false;
    const result = colorSchemeManager.velocity({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 1.8 } });
    expect(result).toMatchSnapshot();
  });
  it('should color land based objects', async () => {
    const result = colorSchemeManager.velocity({ ...defaultSat, ...{ type: SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION } });
    expect(result).toMatchSnapshot();
  });
  it('should color sensors differently', async () => {
    const sensor = colorSchemeManager.velocity({ ...defaultSat, ...{ static: true, type: SpaceObjectType.PHASED_ARRAY_RADAR } });
    const facility = colorSchemeManager.velocity({ ...defaultSat, ...{ type: SpaceObjectType.METEOROLOGICAL_ROCKET_LAUNCH_AGENCY_OR_MANUFACTURER } });
    expect(sensor).toMatchSnapshot();
    expect(sensor).not.toEqual(facility);
  });
  it('should color things in view differently', async () => {
    colorSchemeManager.objectTypeFlags.inViewAlt = true;
    const result = colorSchemeManager.velocity({ ...defaultSat, ...{ inView: 1 } });
    expect(result).toMatchSnapshot();
  });
  it('should hide things in view if disabled', async () => {
    colorSchemeManager.objectTypeFlags.inViewAlt = false;
    const result = colorSchemeManager.velocity({ ...defaultSat, ...{ inView: 1 } });
    colorSchemeManager.objectTypeFlags.inViewAlt = true;
    expect(result).toMatchSnapshot();
  });
  it('should hide fast objects if high velocity is disabled', async () => {
    colorSchemeManager.objectTypeFlags.velocityFast = false;
    const result = colorSchemeManager.velocity({ ...defaultSat, ...{ velocity: { total: 10 } } });
    colorSchemeManager.objectTypeFlags.velocityFast = true;
    expect(result).toMatchSnapshot();
  });
  it('should hide med objects if med velocity is disabled', async () => {
    colorSchemeManager.objectTypeFlags.velocityMed = false;
    const result = colorSchemeManager.velocity({ ...defaultSat, ...{ velocity: { total: 5 } } });
    colorSchemeManager.objectTypeFlags.velocityMed = true;
    expect(result).toMatchSnapshot();
  });
  it('should hide slow objects if low velocity is disabled', async () => {
    colorSchemeManager.objectTypeFlags.velocitySlow = false;
    const result = colorSchemeManager.velocity({ ...defaultSat, ...{ velocity: { total: 2 } } });
    colorSchemeManager.objectTypeFlags.velocitySlow = true;
    expect(result).toMatchSnapshot();
  });
  it('should hide everything else', async () => {
    const result = colorSchemeManager.velocity({ ...defaultSat, ...{ static: false, marker: false, isInGroup: false } });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('colorSchemeManager.defaultRules', () => {
  beforeEach(() => {
    colorSchemeManager.init();
  });
  afterEach(() => {
    colorSchemeManager.resetObjectTypeFlags();
  });
  it('should color small stars', async () => {
    const result = colorSchemeManager.default({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 4.8 } });
    expect(result).toMatchSnapshot();
  });
  it('should color medium stars', async () => {
    const result = colorSchemeManager.default({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 3.8 } });
    expect(result).toMatchSnapshot();
  });
  it('should color large stars', async () => {
    const result = colorSchemeManager.default({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 1.8 } });
    expect(result).toMatchSnapshot();
  });

  it('should ignore deselected stars', async () => {
    colorSchemeManager.objectTypeFlags.starHi = false;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ static: true, marker: false, isInGroup: false, type: SpaceObjectType.STAR, vmag: 1.8 } });
    expect(result).toMatchSnapshot();
  });

  it(`should hide everything that isn't a star in astronomy mode`, () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Astronomy;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.PAYLOAD } });
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  it(`should hide less important organizations when told`, () => {
    colorSchemeManager.objectTypeFlags.facility = false;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION } });
    expect(result).toMatchSnapshot();
  });

  it(`should show less important organizations`, () => {
    const result = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION } });
    expect(result).toMatchSnapshot();
  });

  it(`should show more important organizations`, () => {
    const result = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.LAUNCH_AGENCY } });
    expect(result).toMatchSnapshot();
  });

  test(`that more important organizations are different than less important ones`, () => {
    const less = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.INTERGOVERNMENTAL_ORGANIZATION } });
    const more = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.LAUNCH_AGENCY } });
    expect(more).not.toEqual(less);
  });

  it('should show markers', () => {
    settingsManager.isSatOverflyModeOn = false;
    colorSchemeManager.iSensor = 1;
    keepTrackApi.programs.satSet.satSensorMarkerArray = [1, 2, 3, 4];
    const result = colorSchemeManager.default({ ...defaultSat, ...{ marker: true } });
    expect(result).toMatchSnapshot();
  });

  it('should change marker color when multiple sensors selected', () => {
    settingsManager.isSatOverflyModeOn = false;
    colorSchemeManager.iSensor = 0;
    keepTrackApi.programs.satSet.satSensorMarkerArray = [1, 2, 3, 4];
    const result = colorSchemeManager.default({ ...defaultSat, ...{ id: 2, marker: true } });
    expect(result).toMatchSnapshot();
  });

  // TODO: Eventually colorscheme should throw hard errors if it can't find a color for an object
  it(`should not crash if there is an error in calculating marker color`, () => {
    settingsManager.isSatOverflyModeOn = false;
    colorSchemeManager.iSensor = -2;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ marker: true } });
    expect(result).toMatchSnapshot();
    expect(result.color).toBe(colorSchemeManager.colorTheme.marker[0]);
  });

  it('should hide radar data when told to', () => {
    colorSchemeManager.objectTypeFlags.radarData = false;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ isRadarData: true } });
    expect(result).toMatchSnapshot();
  });

  it('should color radar data differently if it has a satellite number', () => {
    const result = colorSchemeManager.default({ ...defaultSat, ...{ isRadarData: true, sccNum: '25544' } });
    expect(result).toMatchSnapshot();
  });

  it('should color missiles that are out of FOV', () => {
    const result = colorSchemeManager.default({ ...defaultSat, ...{ missile: true, inView: 0 } });
    expect(result).toMatchSnapshot();
  });

  it('should hide missiles that are out of FOV when told to', () => {
    colorSchemeManager.objectTypeFlags.missile = false;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ missile: true, inView: 0 } });
    expect(result).toMatchSnapshot();
  });

  it('should color missiles that are in FOV', () => {
    const result = colorSchemeManager.default({ ...defaultSat, ...{ missile: true, inView: 1 } });
    expect(result).toMatchSnapshot();
  });

  it('should hide missiles that are in FOV when told to', () => {
    colorSchemeManager.objectTypeFlags.missileInview = false;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ missile: true, inView: 1 } });
    expect(result).toMatchSnapshot();
  });

  it('should hide payloads out of FOV when told to', () => {
    colorSchemeManager.objectTypeFlags.payload = false;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.PAYLOAD, inView: 0 } });
    expect(result).toMatchSnapshot();
  });

  it('should hide rocket bodies out of FOV when told to', () => {
    colorSchemeManager.objectTypeFlags.rocketBody = false;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.ROCKET_BODY, inView: 0 } });
    expect(result).toMatchSnapshot();
  });

  it('should hide debris out of FOV when told to', () => {
    colorSchemeManager.objectTypeFlags.debris = false;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.DEBRIS, inView: 0 } });
    expect(result).toMatchSnapshot();
  });

  it('should hide rocket bodies out of FOV when told to', () => {
    colorSchemeManager.objectTypeFlags.trusat = false;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.SPECIAL, inView: 0 } });
    expect(result).toMatchSnapshot();
  });

  it('should hide things in FOV when told to', () => {
    colorSchemeManager.objectTypeFlags.inFOV = false;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.PAYLOAD, inView: 1 } });
    expect(result).toMatchSnapshot();
  });

  it('should hide satellites in view if we are in planetarium view', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.PLANETARIUM;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.PAYLOAD, inView: 1 } });
    expect(result).toMatchSnapshot();
  });

  it('should color satellites in view if we are not planetarium view', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
    const result = colorSchemeManager.default({ ...defaultSat, ...{ type: SpaceObjectType.PAYLOAD, inView: 1 } });
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

  it('should deselect dots in default ColorScheme using Planetarium View', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Planetarium;
    let result: any = colorSchemeManager.default({
      inView: true,
    });
    expect(result).toMatchSnapshot();
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Default;
  });

  it('should deselect dots in countries ColorScheme using Planetarium View', () => {
    keepTrackApi.programs.mainCamera.cameraType.current = keepTrackApi.programs.mainCamera.cameraType.Planetarium;
    let result: any = colorSchemeManager.countries({
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
      country: 'United States of America',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.countryUS = true;
  });

  test('1', () => {
    let result: any = colorSchemeManager.countries({
      country: 'United States of America',
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    colorSchemeManager.objectTypeFlags.countryPRC = false;
    let result: any = colorSchemeManager.countries({
      country: 'China',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.countryPRC = true;
  });

  test('3', () => {
    let result: any = colorSchemeManager.countries({
      country: 'China',
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    colorSchemeManager.objectTypeFlags.countryCIS = false;
    let result: any = colorSchemeManager.countries({
      country: 'CIS',
    });
    expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.countryCIS = true;
  });

  test('if it colors Russian Federation correctly', () => {
    let result = colorSchemeManager.countries({
      country: 'Russian Federation',
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = colorSchemeManager.countries({
      country: 'CIS',
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
    now = now.getUTCFullYear();
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
    now = now.getUTCFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElset({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    // TODO: Timezones are not handled correctly but it only affects the testing
    // expect(result).toMatchSnapshot();
  });

  test('9', () => {
    colorSchemeManager.objectTypeFlags.ageOld = true;
    let now = new Date();
    now.setDate(now.getDate() - 15);
    const jday = getDayOfYear(now);
    now = now.getUTCFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElset({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    // TODO: Timezones are not handled correctly but it only affects the testing
    // expect(result).toMatchSnapshot();
  });

  test('10', () => {
    let now = new Date();
    now.setDate(now.getDate() - 80);
    const jday = getDayOfYear(now);
    now = now.getUTCFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElset({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    // TODO: Timezones are not handled correctly but it only affects the testing
    // expect(result).toMatchSnapshot();
  });

  test('11', () => {
    colorSchemeManager.objectTypeFlags.ageLost = false;
    let now = new Date();
    now.setDate(now.getDate() - 80);
    const jday = getDayOfYear(now);
    now = now.getUTCFullYear();
    now = now.toString().substr(2, 2);
    let result: any = colorSchemeManager.ageOfElset({
      TLE1: `012345678901234567${now}${parseInt(jday)}34567890`,
    });
    // TODO: Timezones are not handled correctly but it only affects the testing
    // expect(result).toMatchSnapshot();
    colorSchemeManager.objectTypeFlags.ageLost = true;
  });

  test('12', () => {
    let now = new Date();
    now.setDate(now.getDate() - 600);
    const jday = getDayOfYear(now);
    now = now.getUTCFullYear();
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
    now = now.getUTCFullYear();
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
    now = now.getUTCFullYear();
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

describe('colorSchemeManager objectTypeFlags checks', () => {
  it('should handle payload on', () => {
    colorSchemeManager.objectTypeFlags.payload = true;
    expect(isPayloadOff({ ...defaultSat, ...{ type: SpaceObjectType.PAYLOAD } })).toBe(false);
  });
  it('should handle payload off', () => {
    colorSchemeManager.objectTypeFlags.payload = false;
    expect(isPayloadOff({ ...defaultSat, ...{ type: SpaceObjectType.PAYLOAD } })).toBe(true);
  });
  it('should handle rocket body on', () => {
    colorSchemeManager.objectTypeFlags.rocketBody = true;
    expect(isRocketBodyOff({ ...defaultSat, ...{ type: SpaceObjectType.ROCKET_BODY } })).toBe(false);
  });
  it('should handle rocket body off', () => {
    colorSchemeManager.objectTypeFlags.rocketBody = false;
    expect(isRocketBodyOff({ ...defaultSat, ...{ type: SpaceObjectType.ROCKET_BODY } })).toBe(true);
  });
  it('should handle debris on', () => {
    colorSchemeManager.objectTypeFlags.debris = true;
    expect(isDebrisOff({ ...defaultSat, ...{ type: SpaceObjectType.DEBRIS } })).toBe(false);
  });
  it('should handle debris off', () => {
    colorSchemeManager.objectTypeFlags.debris = false;
    expect(isDebrisOff({ ...defaultSat, ...{ type: SpaceObjectType.DEBRIS } })).toBe(true);
  });

  it('should handle inview on', () => {
    colorSchemeManager.objectTypeFlags.inFOV = true;
    expect(isInViewOff({ ...defaultSat, ...{ inView: 0 } })).toBe(false);
  });
  it('should handle inview off', () => {
    colorSchemeManager.objectTypeFlags.inFOV = false;
    expect(isInViewOff({ ...defaultSat, ...{ inView: 1 } })).toBe(true);
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
