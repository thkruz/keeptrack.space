import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import { uiManager } from './uiManager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('uiManager.legendHoverMenuClick', () => {
  beforeEach(() => {
    keepTrackApi.programs.satSet.setColorScheme = () => {};
  });
  test('1', () => {
    let result = uiManager.legendHoverMenuClick('legend-payload-box');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result = uiManager.legendHoverMenuClick('legend-rocketBody-box');
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result = uiManager.legendHoverMenuClick('legend-debris-box');
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result = uiManager.legendHoverMenuClick('legend-starHi-box');
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result = uiManager.legendHoverMenuClick('legend-starMed-box');
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result = uiManager.legendHoverMenuClick('legend-starLow-box');
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result = uiManager.legendHoverMenuClick('legend-satHi-box');
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result = uiManager.legendHoverMenuClick('legend-satMed-box');
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result = uiManager.legendHoverMenuClick('legend-satLow-box');
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    let result = uiManager.legendHoverMenuClick('legend-inFOV-box');
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    let result = uiManager.legendHoverMenuClick('legend-velocityFast-box');
    expect(result).toMatchSnapshot();
  });

  test('12', () => {
    let result = uiManager.legendHoverMenuClick('legend-velocityMed-box');
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    let result = uiManager.legendHoverMenuClick('legend-velocitySlow-box');
    expect(result).toMatchSnapshot();
  });

  test('14', () => {
    let result = uiManager.legendHoverMenuClick('legend-inFOVAlt-box');
    expect(result).toMatchSnapshot();
  });

  test('15', () => {
    let result = uiManager.legendHoverMenuClick('legend-ageNew-box');
    expect(result).toMatchSnapshot();
  });

  test('16', () => {
    let result = uiManager.legendHoverMenuClick('legend-ageMed-box');
    expect(result).toMatchSnapshot();
  });

  test('17', () => {
    let result = uiManager.legendHoverMenuClick('legend-ageOld-box');
    expect(result).toMatchSnapshot();
  });

  test('18', () => {
    let result = uiManager.legendHoverMenuClick('legend-ageLost-box');
    expect(result).toMatchSnapshot();
  });

  test('19', () => {
    let result = uiManager.legendHoverMenuClick('legend-rcsSmall-box');
    expect(result).toMatchSnapshot();
  });

  test('20', () => {
    let result = uiManager.legendHoverMenuClick('legend-rcsMed-box');
    expect(result).toMatchSnapshot();
  });

  test('21', () => {
    let result = uiManager.legendHoverMenuClick('legend-rcsLarge-box');
    expect(result).toMatchSnapshot();
  });

  test('22', () => {
    let result = uiManager.legendHoverMenuClick('legend-rcsUnknown-box');
    expect(result).toMatchSnapshot();
  });

  test('23', () => {
    let result = uiManager.legendHoverMenuClick('legend-missile-box');
    expect(result).toMatchSnapshot();
  });

  test('24', () => {
    let result = uiManager.legendHoverMenuClick('legend-missileInview-box');
    expect(result).toMatchSnapshot();
  });

  test('25', () => {
    let result = uiManager.legendHoverMenuClick('legend-sensor-box');
    expect(result).toMatchSnapshot();
  });

  test('26', () => {
    let result = uiManager.legendHoverMenuClick('legend-facility-box');
    expect(result).toMatchSnapshot();
  });

  test('27', () => {
    let result = uiManager.legendHoverMenuClick('legend-trusat-box');
    expect(result).toMatchSnapshot();
  });

  test('28', () => {
    let result = uiManager.legendHoverMenuClick('legend-countryUS-box');
    expect(result).toMatchSnapshot();
  });

  test('29', () => {
    let result = uiManager.legendHoverMenuClick('legend-countryCIS-box');
    expect(result).toMatchSnapshot();
  });

  test('30', () => {
    let result = uiManager.legendHoverMenuClick('legend-countryPRC-box');
    expect(result).toMatchSnapshot();
  });

  test('31', () => {
    let result = uiManager.legendHoverMenuClick('legend-countryOther-box');
    expect(result).toMatchSnapshot();
  });
});

describe('uiManager.legendHoverMenuClick-flagsOff', () => {
  beforeEach(() => {
    keepTrackApi.programs.satSet.setColorScheme = () => {};
    keepTrackApi.programs.colorSchemeManager.objectTypeFlags = {
      payload: false,
      radarData: false,
      rocketBody: false,
      debris: false,
      facility: false,
      sensor: false,
      missile: false,
      missileInview: false,
      trusat: false,
      inFOV: false,
      inViewAlt: false,
      starLow: false,
      starMed: false,
      starHi: false,
      satLEO: false,
      satGEO: false,
      satLow: false,
      satMed: false,
      satHi: false,
      satSmall: false,
      rcsSmall: false,
      rcsMed: false,
      rcsLarge: false,
      rcsUnknown: false,
      velocitySlow: false,
      velocityMed: false,
      velocityFast: false,
      ageNew: false,
      ageMed: false,
      ageOld: false,
      ageLost: false,
      countryUS: false,
      countryCIS: false,
      countryPRC: false,
      countryOther: false,
    };
  });

  afterAll(() => {
    keepTrackApi.programs.colorSchemeManager.objectTypeFlags = {
      payload: true,
      radarData: true,
      rocketBody: true,
      debris: true,
      facility: true,
      sensor: true,
      missile: true,
      missileInview: true,
      trusat: true,
      inFOV: true,
      inViewAlt: true,
      starLow: true,
      starMed: true,
      starHi: true,
      satLEO: true,
      satGEO: true,
      satLow: true,
      satMed: true,
      satHi: true,
      satSmall: true,
      rcsSmall: true,
      rcsMed: true,
      rcsLarge: true,
      rcsUnknown: true,
      velocitySlow: true,
      velocityMed: true,
      velocityFast: true,
      ageNew: true,
      ageMed: true,
      ageOld: true,
      ageLost: true,
      countryUS: true,
      countryCIS: true,
      countryPRC: true,
      countryOther: true,
    };
  });

  test('1', () => {
    let result = uiManager.legendHoverMenuClick('legend-payload-box');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result = uiManager.legendHoverMenuClick('legend-rocketBody-box');
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result = uiManager.legendHoverMenuClick('legend-debris-box');
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result = uiManager.legendHoverMenuClick('legend-starHi-box');
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result = uiManager.legendHoverMenuClick('legend-starMed-box');
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result = uiManager.legendHoverMenuClick('legend-starLow-box');
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result = uiManager.legendHoverMenuClick('legend-satHi-box');
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result = uiManager.legendHoverMenuClick('legend-satMed-box');
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result = uiManager.legendHoverMenuClick('legend-satLow-box');
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    let result = uiManager.legendHoverMenuClick('legend-inFOV-box');
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    let result = uiManager.legendHoverMenuClick('legend-velocityFast-box');
    expect(result).toMatchSnapshot();
  });

  test('12', () => {
    let result = uiManager.legendHoverMenuClick('legend-velocityMed-box');
    expect(result).toMatchSnapshot();
  });

  test('13', () => {
    let result = uiManager.legendHoverMenuClick('legend-velocitySlow-box');
    expect(result).toMatchSnapshot();
  });

  test('14', () => {
    let result = uiManager.legendHoverMenuClick('legend-inFOVAlt-box');
    expect(result).toMatchSnapshot();
  });

  test('15', () => {
    let result = uiManager.legendHoverMenuClick('legend-ageNew-box');
    expect(result).toMatchSnapshot();
  });

  test('16', () => {
    let result = uiManager.legendHoverMenuClick('legend-ageMed-box');
    expect(result).toMatchSnapshot();
  });

  test('17', () => {
    let result = uiManager.legendHoverMenuClick('legend-ageOld-box');
    expect(result).toMatchSnapshot();
  });

  test('18', () => {
    let result = uiManager.legendHoverMenuClick('legend-ageLost-box');
    expect(result).toMatchSnapshot();
  });

  test('19', () => {
    let result = uiManager.legendHoverMenuClick('legend-rcsSmall-box');
    expect(result).toMatchSnapshot();
  });

  test('20', () => {
    let result = uiManager.legendHoverMenuClick('legend-rcsMed-box');
    expect(result).toMatchSnapshot();
  });

  test('21', () => {
    let result = uiManager.legendHoverMenuClick('legend-rcsLarge-box');
    expect(result).toMatchSnapshot();
  });

  test('22', () => {
    let result = uiManager.legendHoverMenuClick('legend-rcsUnknown-box');
    expect(result).toMatchSnapshot();
  });

  test('23', () => {
    let result = uiManager.legendHoverMenuClick('legend-missile-box');
    expect(result).toMatchSnapshot();
  });

  test('24', () => {
    let result = uiManager.legendHoverMenuClick('legend-missileInview-box');
    expect(result).toMatchSnapshot();
  });

  test('25', () => {
    let result = uiManager.legendHoverMenuClick('legend-sensor-box');
    expect(result).toMatchSnapshot();
  });

  test('26', () => {
    let result = uiManager.legendHoverMenuClick('legend-facility-box');
    expect(result).toMatchSnapshot();
  });

  test('27', () => {
    let result = uiManager.legendHoverMenuClick('legend-trusat-box');
    expect(result).toMatchSnapshot();
  });

  test('28', () => {
    let result = uiManager.legendHoverMenuClick('legend-countryUS-box');
    expect(result).toMatchSnapshot();
  });

  test('29', () => {
    let result = uiManager.legendHoverMenuClick('legend-countryCIS-box');
    expect(result).toMatchSnapshot();
  });

  test('30', () => {
    let result = uiManager.legendHoverMenuClick('legend-countryPRC-box');
    expect(result).toMatchSnapshot();
  });

  test('31', () => {
    let result = uiManager.legendHoverMenuClick('legend-countryOther-box');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiManager.onReady', () => {
  test('0', () => {
    let result = uiManager.onReady();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiManager.legendMenuChange', () => {
  test('0', () => {
    let result = uiManager.legendMenuChange('default');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result = uiManager.legendMenuChange('rcs');
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result = uiManager.legendMenuChange('small');
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result = uiManager.legendMenuChange('near');
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result = uiManager.legendMenuChange('deep');
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result = uiManager.legendMenuChange('velocity');
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result = uiManager.legendMenuChange('sunlight');
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result = uiManager.legendMenuChange('ageOfElset');
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result = uiManager.legendMenuChange('countries');
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result = uiManager.legendMenuChange('planetarium');
    expect(result).toMatchSnapshot();
  });

  test('10', () => {
    let result = uiManager.legendMenuChange('astronomy');
    expect(result).toMatchSnapshot();
  });

  test('11', () => {
    let result = uiManager.legendMenuChange('clear');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiManager.init', () => {
  test('0', () => {
    let result = uiManager.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiManager.init', () => {
  test('0', () => {
    let result = uiManager.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiManager.getsensorinfo', () => {
  test('0', () => {
    let result = uiManager.getsensorinfo();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('uiManager.footerToggle', () => {
  test('0', () => {
    let result = uiManager.footerToggle();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    uiManager.footerToggle();
    uiManager.footerToggle();
    let result = uiManager.footerToggle();
    expect(result).toMatchSnapshot();
  });
});
