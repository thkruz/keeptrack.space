import { keepTrackApi } from '@app/keepTrackApi';
import { ColorSchemeManager } from '@app/singletons/color-scheme-manager';
import { GroupType } from '@app/singletons/object-group';
import { BaseObject, Degrees, DetailedSatellite, SpaceObjectType, TleLine1 } from 'ootk';
import { defaultSat } from './environment/apiMocks';

const obj1 = defaultSat.clone();
obj1.type = SpaceObjectType.DEBRIS;
obj1.inclination = 175 as Degrees;
const obj2 = defaultSat.clone();
obj2.type = SpaceObjectType.DEBRIS;
obj2.inclination = 100 as Degrees;
const obj3 = defaultSat.clone();
obj3.type = SpaceObjectType.DEBRIS;
obj3.inclination = 75 as Degrees;
const obj4 = defaultSat.clone();
obj4.id = 0;
obj4.isMissile = () => true;
const obj5 = defaultSat.clone();
obj5.isStatic = () => true;
obj5.type = SpaceObjectType.STAR;
const obj6 = obj5.clone();
obj6.vmag = 5;
const obj7 = obj5.clone();
obj7.vmag = 4;
const obj8 = obj5.clone();
obj8.vmag = 3;
const obj9 = defaultSat.clone();
obj9.isStatic = () => true;
obj9.type = SpaceObjectType.LAUNCH_FACILITY;
const obj10 = defaultSat.clone();
obj10.id = 0;
obj10.vmag = 0;
const obj11 = defaultSat.clone();
obj11.id = 0;
obj11.vmag = 3;
const obj12 = defaultSat.clone();
obj12.id = 0;
obj12.vmag = 4;
const obj13 = defaultSat.clone();
obj13.id = 0;
obj13.vmag = 6;
const obj14 = defaultSat.clone();
obj14.id = 1;
obj14.vmag = 0;
const obj15 = defaultSat.clone();
obj15.id = 1;
obj15.vmag = 3;
const obj16 = defaultSat.clone();
obj16.id = 1;
obj16.vmag = 4;
const obj17 = defaultSat.clone();
obj17.id = 1;
obj17.vmag = 6;
const obj18 = defaultSat.clone();
obj18.id = 2;
obj18.vmag = 0;
const obj19 = defaultSat.clone();
obj19.id = 2;
obj19.vmag = 3;
const obj20 = defaultSat.clone();
obj20.id = 2;
obj20.vmag = 4;
const obj21 = defaultSat.clone();
obj21.id = 2;
obj21.vmag = 6;
const obj22 = defaultSat.clone();
obj22.type = SpaceObjectType.PAYLOAD;
const obj23 = defaultSat.clone();
obj23.type = SpaceObjectType.ROCKET_BODY;
const obj24 = defaultSat.clone();
obj24.type = SpaceObjectType.DEBRIS;
const obj25 = defaultSat.clone();
obj25.type = SpaceObjectType.SPECIAL;
const obj26 = defaultSat.clone();
obj26.type = SpaceObjectType.UNKNOWN;
const obj27 = defaultSat.clone();
obj27.type = null;
const obj28 = defaultSat.clone();
obj28.inclination = 175 as Degrees;
const obj29 = defaultSat.clone();
obj29.inclination = 100 as Degrees;
const obj30 = defaultSat.clone();
obj30.inclination = 75 as Degrees;
const obj31 = defaultSat.clone();
obj31.isMissile = () => true;
const obj32 = defaultSat.clone();
obj32.isStatic = () => true;
const obj33 = defaultSat.clone();
obj33.isMarker = () => true;
const obj34 = defaultSat.clone();
obj34.sccNum = '1';
const obj35 = defaultSat.clone();
obj35.country = 'ANALSAT';
const obj36 = defaultSat.clone();
obj36.country = 'US';
const obj37 = defaultSat.clone();
obj37.country = 'PRC';
const obj38 = defaultSat.clone();
obj38.country = 'RU';
const obj39 = defaultSat.clone();
obj39.country = 'FR';
const obj40 = defaultSat.clone();
obj40.id = 0;
const obj41 = defaultSat.clone();
obj41.id = 1;
const obj42 = defaultSat.clone();
obj42.id = 2;
const obj43 = defaultSat.clone();
obj43.rcs = 0.005;
const obj44 = defaultSat.clone();
obj44.rcs = 0.01;
const obj45 = defaultSat.clone();
obj45.rcs = 0.05;
const obj46 = defaultSat.clone();
obj46.rcs = 0.1;
const obj47 = defaultSat.clone();
obj47.rcs = 0.5;
const obj48 = defaultSat.clone();
obj48.rcs = 1;
const obj49 = defaultSat.clone();
obj49.rcs = 5;
const obj50 = defaultSat.clone();
obj50.rcs = null;
const obj51 = defaultSat.clone();
obj51.type = SpaceObjectType.PAYLOAD;
const obj52 = defaultSat.clone();
obj52.type = SpaceObjectType.ROCKET_BODY;
const obj53 = defaultSat.clone();
obj53.type = SpaceObjectType.DEBRIS;
const obj54 = defaultSat.clone();
obj54.type = SpaceObjectType.SPECIAL;
const obj55 = defaultSat.clone();
obj55.type = SpaceObjectType.UNKNOWN;
const obj56 = defaultSat.clone();
obj56.type = SpaceObjectType.PAYLOAD_MANUFACTURER;
const obj57_ = defaultSat.clone();
obj57_.tle1 = '1 25544U 58067A   60265.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1;
const obj57 = obj57_.clone();
const obj58_ = defaultSat.clone();
obj58_.tle1 = '1 25544U 58067A   90265.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1;
const obj58 = obj58_.clone();
const obj59_ = defaultSat.clone();
obj59_.tle1 = '1 25544U 58067A   20265.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1;
const obj59 = obj59_.clone();
const obj60_ = defaultSat.clone();
obj60_.tle1 = '1 25544U 58067A   22180.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1;
const obj60 = obj60_.clone();
const obj61_ = defaultSat.clone();
obj61_.tle1 = '1 25544U 58067A   22330.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1;
const obj61 = obj61_.clone();
const obj62_ = defaultSat.clone();
obj62_.tle1 = '1 25544U 58067A   22360.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1;
const obj62 = obj62_.clone();
const obj63_ = defaultSat.clone();
obj63_.tle1 = '1 25544U 58067A   22365.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1;
const obj63 = obj63_.clone();
const obj64_ = defaultSat.clone();
obj64_.tle1 = '1 25544U 58067A   23001.51736111  .00000000  00000-0  00000-0 0  9999' as TleLine1;
const obj64 = obj64_.clone();

const listOfSatsToTest = [
  defaultSat,
  obj1,
  obj2,
  obj3,
  obj4,
  obj5,
  obj6,
  obj7,
  obj8,
  obj9,
  obj10,
  obj11,
  obj12,
  obj13,
  obj14,
  obj15,
  obj16,
  obj17,
  obj18,
  obj19,
  obj20,
  obj21,
  obj22,
  obj23,
  obj24,
  obj25,
  obj26,
  obj27,
  obj28,
  obj29,
  obj30,
  obj31,
  obj32,
  obj33,
  obj34,
  obj35,
  obj36,
  obj37,
  obj38,
  obj39,
  obj40,
  obj41,
  obj42,
  obj43,
  obj44,
  obj45,
  obj46,
  obj47,
  obj48,
  obj49,
  obj50,
  obj51,
  obj52,
  obj53,
  obj54,
  obj55,
  obj56,
  obj57,
  obj58,
  obj59,
  obj60,
  obj61,
  obj62,
  obj63,
  obj64,
] as DetailedSatellite[];

const disableAllColorThemes = (colorSchemeManager: ColorSchemeManager) => {
  for (const flag in colorSchemeManager.objectTypeFlags) {
    colorSchemeManager.objectTypeFlags[flag] = false;
  }
};

// Test ColorSchemeManager class
describe('ColorSchemeManager', () => {
  let colorSchemeManager: ColorSchemeManager;
  beforeEach(() => {
    colorSchemeManager = new ColorSchemeManager();
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
    const test = (sat: BaseObject) => ColorSchemeManager.apogee(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test age of elset color scheme
  it('should be able to get age of elset color scheme', () => {
    const test = (sat: BaseObject) =>
      colorSchemeManager.ageOfElset(sat, {
        jday: 1,
        year: '23',
      });

    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test countries color scheme
  it('should be able to get countries color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.countries(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test default color scheme
  it('should be able to get default color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.default(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);

    const dotsManagerInstance = keepTrackApi.getDotsManager();
    dotsManagerInstance.inViewData = new Int8Array([0, 0, 0]);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test geo color scheme
  it('should be able to get geo color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.geo(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test group color scheme
  it('should be able to get group color scheme', () => {
    const group = keepTrackApi.getGroupsManager().createGroup(GroupType.SCC_NUM, [1]);
    keepTrackApi.getGroupsManager().selectGroup(group);
    const test = (sat: BaseObject) => colorSchemeManager.group(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test isDebrisOff color scheme
  it('should be able to get isDebrisOff color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.isDebrisOff(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test isInViewOff color scheme
  it('should be able to get isInViewOff color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.isInViewOff(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test isPayloadOff color scheme
  it('should be able to get isPayloadOff color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.isPayloadOff(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test isRocketBodyOff color scheme
  it('should be able to get isRocketBodyOff color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.isRocketBodyOff(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test leo color scheme
  it('should be able to get leo color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.leo(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test lostobjects color scheme
  it('should be able to get lostobjects color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.lostobjects(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test groupCountries color scheme
  it('should be able to get lostobjects color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.groupCountries(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test rcs color scheme
  it('should be able to get rcs color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.rcs(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test smallsats color scheme
  it('should be able to get smallsats color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.smallsats(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test velocity color scheme
  it('should be able to get velocity color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.velocity(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test sunlight color scheme
  it('should be able to get sunlight color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.sunlight(sat);
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });

  // Test onlyFov color scheme
  it('should be able to get onlyfov color scheme', () => {
    const test = (sat: BaseObject) => colorSchemeManager.onlyFOV(sat);
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

    const test = (sat: BaseObject) =>
      colorSchemeManager.neighbors(sat, {
        orbitDensity: orbitDensityMatrix,
        orbitDensityMax: 180,
      });
    testMultipleSats(colorSchemeManager, listOfSatsToTest, test);
  });
});

const testMultipleSats = (colorSchemeManager: ColorSchemeManager, listOfSatsToTest: BaseObject[], test) => {
  listOfSatsToTest.forEach((sat) => {
    expect(test(sat)).not.toThrow;
  });

  disableAllColorThemes(colorSchemeManager);
  listOfSatsToTest.forEach((sat) => {
    expect(test(sat)).not.toThrow;
  });
};
