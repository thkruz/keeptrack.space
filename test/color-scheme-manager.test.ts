import { SatObject } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { StandardColorSchemeManager } from '@app/singletons/color-scheme-manager';
import { SpaceObjectType, TleLine1 } from 'ootk';
import { defaultSat } from './environment/apiMocks';

const listOfSatsToTest = [
  defaultSat,
  { ...defaultSat, ...{ inclination: 175 } },
  { ...defaultSat, ...{ inclination: 100 } },
  { ...defaultSat, ...{ inclination: 75 } },
  { ...defaultSat, ...{ type: SpaceObjectType.DEBRIS, inclination: 175 } },
  { ...defaultSat, ...{ type: SpaceObjectType.DEBRIS, inclination: 100 } },
  { ...defaultSat, ...{ type: SpaceObjectType.DEBRIS, inclination: 75 } },
  { ...defaultSat, ...{ missile: true } },
  { ...defaultSat, ...{ id: 0, missile: true } },
  { ...defaultSat, ...{ static: true } },
  { ...defaultSat, ...{ static: true, type: SpaceObjectType.STAR } },
  { ...defaultSat, ...{ static: true, type: SpaceObjectType.STAR, vmag: 5 } },
  { ...defaultSat, ...{ static: true, type: SpaceObjectType.STAR, vmag: 4 } },
  { ...defaultSat, ...{ static: true, type: SpaceObjectType.STAR, vmag: 3 } },
  { ...defaultSat, ...{ static: true, type: SpaceObjectType.LAUNCH_FACILITY } },
  { ...defaultSat, ...{ marker: true } },
  { ...defaultSat, ...{ isRadarData: true } },
  { ...defaultSat, ...{ missileComplex: 1 } },
  { ...defaultSat, ...{ sccNum: '1' } },
  { ...defaultSat, ...{ country: 'ANALSAT' } },
  { ...defaultSat, ...{ country: 'US' } },
  { ...defaultSat, ...{ country: 'PRC' } },
  { ...defaultSat, ...{ country: 'RU' } },
  { ...defaultSat, ...{ country: 'FR' } },
  { ...defaultSat, ...{ id: 0 } },
  { ...defaultSat, ...{ id: 1 } },
  { ...defaultSat, ...{ id: 2 } },
  { ...defaultSat, ...{ id: 0, vmag: 0 } },
  { ...defaultSat, ...{ id: 0, vmag: 3 } },
  { ...defaultSat, ...{ id: 0, vmag: 4 } },
  { ...defaultSat, ...{ id: 0, vmag: 6 } },
  { ...defaultSat, ...{ id: 1, vmag: 0 } },
  { ...defaultSat, ...{ id: 1, vmag: 3 } },
  { ...defaultSat, ...{ id: 1, vmag: 4 } },
  { ...defaultSat, ...{ id: 1, vmag: 6 } },
  { ...defaultSat, ...{ id: 2, vmag: 0 } },
  { ...defaultSat, ...{ id: 2, vmag: 3 } },
  { ...defaultSat, ...{ id: 2, vmag: 4 } },
  { ...defaultSat, ...{ id: 2, vmag: 6 } },
  { ...defaultSat, ...{ rcs: 0.005 } },
  { ...defaultSat, ...{ rcs: 0.01 } },
  { ...defaultSat, ...{ rcs: 0.05 } },
  { ...defaultSat, ...{ rcs: 0.1 } },
  { ...defaultSat, ...{ rcs: 0.5 } },
  { ...defaultSat, ...{ rcs: 1 } },
  { ...defaultSat, ...{ rcs: 5 } },
  { ...defaultSat, ...{ rcs: null } },
  { ...defaultSat, ...{ type: SpaceObjectType.PAYLOAD } },
  { ...defaultSat, ...{ type: SpaceObjectType.ROCKET_BODY } },
  { ...defaultSat, ...{ type: SpaceObjectType.DEBRIS } },
  { ...defaultSat, ...{ type: SpaceObjectType.SPECIAL } },
  { ...defaultSat, ...{ type: SpaceObjectType.UNKNOWN } },
  { ...defaultSat, ...{ type: SpaceObjectType.PAYLOAD_MANUFACTURER } },
  { ...defaultSat, ...{ type: SpaceObjectType.PAYLOAD, isInGroup: true } },
  { ...defaultSat, ...{ type: SpaceObjectType.ROCKET_BODY, isInGroup: true } },
  { ...defaultSat, ...{ type: SpaceObjectType.DEBRIS, isInGroup: true } },
  { ...defaultSat, ...{ type: SpaceObjectType.SPECIAL, isInGroup: true } },
  { ...defaultSat, ...{ type: SpaceObjectType.UNKNOWN, isInGroup: true } },
  { ...defaultSat, ...{ type: SpaceObjectType.PAYLOAD_MANUFACTURER } },
  { ...defaultSat, ...{ type: null, isInGroup: true } },
  { ...defaultSat, ...{ TLE1: '1 25544U 58067A   60265.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1 } },
  { ...defaultSat, ...{ TLE1: '1 25544U 58067A   90265.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1 } },
  { ...defaultSat, ...{ TLE1: '1 25544U 58067A   20265.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1 } },
  { ...defaultSat, ...{ TLE1: '1 25544U 58067A   22180.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1 } },
  { ...defaultSat, ...{ TLE1: '1 25544U 58067A   22330.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1 } },
  { ...defaultSat, ...{ TLE1: '1 25544U 58067A   22360.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1 } },
  { ...defaultSat, ...{ TLE1: '1 25544U 58067A   22365.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1 } },
  { ...defaultSat, ...{ TLE1: '1 25544U 58067A   23001.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1 } },
] as SatObject[];

const disableAllColorThemes = (colorSchemeManager: StandardColorSchemeManager) => {
  for (const flag in colorSchemeManager.objectTypeFlags) {
    colorSchemeManager.objectTypeFlags[flag] = false;
  }
};

// Test ColorSchemeManager class
describe('StandardColorSchemeManager', () => {
  let colorSchemeManager: StandardColorSchemeManager;
  beforeEach(() => {
    colorSchemeManager = new StandardColorSchemeManager();
    colorSchemeManager.init();

    const dotsManagerInstance = keepTrackApi.getDotsManager();
    dotsManagerInstance.inViewData = new Int8Array([0, 1, 1]);
    dotsManagerInstance.inSunData = new Int8Array([2, 1, 1]);

    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    catalogManagerInstance.sensorMarkerArray = [1];
  });

  it('should be able to create a new instance', () => {
    expect(colorSchemeManager).toBeDefined();
  });

  // Test apogee color scheme
  it('should be able to get apogee color scheme', () => {
    const test = (sat: SatObject) => StandardColorSchemeManager.apogee(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test age of elset color scheme
  it('should be able to get age of elset color scheme', () => {
    const test = (sat: SatObject) =>
      colorSchemeManager.ageOfElset(sat, {
        jday: 1,
        year: '23',
      });

    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test countries color scheme
  it('should be able to get countries color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.countries(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test default color scheme
  it('should be able to get default color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.default(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);

    const dotsManagerInstance = keepTrackApi.getDotsManager();
    dotsManagerInstance.inViewData = new Int8Array([0, 0, 0]);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test geo color scheme
  it('should be able to get geo color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.geo(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test group color scheme
  it('should be able to get group color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.group(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test isDebrisOff color scheme
  it('should be able to get isDebrisOff color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.isDebrisOff(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test isInViewOff color scheme
  it('should be able to get isInViewOff color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.isInViewOff(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test isPayloadOff color scheme
  it('should be able to get isPayloadOff color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.isPayloadOff(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test isRocketBodyOff color scheme
  it('should be able to get isRocketBodyOff color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.isRocketBodyOff(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test leo color scheme
  it('should be able to get leo color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.leo(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test lostobjects color scheme
  it('should be able to get lostobjects color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.lostobjects(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test groupCountries color scheme
  it('should be able to get lostobjects color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.groupCountries(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test rcs color scheme
  it('should be able to get rcs color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.rcs(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test smallsats color scheme
  it('should be able to get smallsats color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.smallsats(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test velocity color scheme
  it('should be able to get velocity color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.velocity(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test sunlight color scheme
  it('should be able to get sunlight color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.sunlight(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test onlyFov color scheme
  it('should be able to get onlyfov color scheme', () => {
    const test = (sat: SatObject) => colorSchemeManager.onlyFOV(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test reloadColors
  it('should be able to reload colors', () => {
    const test = () => colorSchemeManager.reloadColors();
    expect(test()).not.toThrow;
  });

  // Test neighbors color scheme
  it('should be able to get neighbors color scheme', () => {
    const orbitDensityMatrix = [];
    for (let i = 0; i < 180; i++) {
      const innerMatrix = [];
      for (let j = 0; j < 500; j++) {
        innerMatrix.push(i);
      }
      orbitDensityMatrix.push(innerMatrix);
    }

    const test = (sat: SatObject) =>
      colorSchemeManager.neighbors(sat, {
        orbitDensity: orbitDensityMatrix,
        orbitDensityMax: 180,
      });
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });
});

const testMultipleSats = (colorSchemeManager: StandardColorSchemeManager, listOfSatsToTest: SatObject[], test) => {
  listOfSatsToTest.forEach((sat) => {
    expect(test(sat)).not.toThrow;
  });

  disableAllColorThemes(colorSchemeManager);
  listOfSatsToTest.forEach((sat) => {
    expect(test(sat)).not.toThrow;
  });
};
