import 'jquery-ui-bundle';
import { defaultSat, defaultSensor, keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms, SatObject } from '../../api/keepTrackTypes';
import { SpaceObjectType } from '../../api/SpaceObjectType';
import * as satInfoboxCore from './satInfoboxCore';

declare const settingsManager;

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('satInfoboxCore.sensorInfo', () => {
  beforeAll(() => {
    settingsManager.plugins = {
      sensor: true,
    };
  });

  test('0', () => {
    let result: any = satInfoboxCore.sensorInfo(defaultSat);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satInfoboxCore.launchData', () => {
  test('0', () => {
    let result: any = satInfoboxCore.launchData(defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satInfoboxCore.launchData({
      ...defaultSat,
      ...{ missile: true, desc: 'mis(s)ile' },
    });
    expect(result).toMatchSnapshot();
  });
  test('2', () => {
    let result: any = satInfoboxCore.launchData({
      ...defaultSat,
      ...{ launchVehcile: 'U' },
    });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satInfoboxCore.orbitalData', () => {
  test('0', () => {
    window.document.body.innerHTML = '<div id="sat-infobox"></div>';
    let result: any = satInfoboxCore.orbitalData(defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    window.document.body.innerHTML = '<div id="sat-infobox"></div>';
    keepTrackApi.programs.objectManager.isSensorManagerLoaded = true;
    let sat = defaultSat;
    sat.TLE1 = 'fakeData';
    let result: any = satInfoboxCore.orbitalData(sat);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    window.document.body.innerHTML = '<div id="sat-infobox"></div>';
    keepTrackApi.programs.objectManager.isSensorManagerLoaded = true;
    keepTrackApi.programs.sensorManager.currentSensor[0] = {
      ...defaultSensor,
      ...{
        lat: null,
        type: SpaceObjectType.MECHANICAL,
      },
    };
    let result: any = satInfoboxCore.orbitalData({ isInSun: () => true, ...defaultSat });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    window.document.body.innerHTML = '<div id="sat-infobox"></div>';
    keepTrackApi.programs.objectManager.isSensorManagerLoaded = true;
    keepTrackApi.programs.sensorManager.currentSensor[0] = {
      ...defaultSensor,
      ...{
        lat: null,
        type: SpaceObjectType.OPTICAL,
      },
    };
    let result: any = satInfoboxCore.orbitalData({ isInSun: () => true, ...defaultSat });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satInfoboxCore.satMissionData', () => {
  test('0', () => {
    let result: any = satInfoboxCore.satMissionData(defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satInfoboxCore.satMissionData({ ...defaultSat, ...{ vmag: 1 } });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satInfoboxCore.satMissionData(<SatObject>{ missile: true });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satInfoboxCore.intelData', () => {
  test('0', () => {
    let result: any = satInfoboxCore.intelData(defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satInfoboxCore.intelData(defaultSat, 1);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satInfoboxCore.intelData(defaultSat, -1);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satInfoboxCore.intelData(<SatObject>{ TTP: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satInfoboxCore.intelData(<SatObject>{ NOTES: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satInfoboxCore.intelData(<SatObject>{ FMISSED: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = satInfoboxCore.intelData(<SatObject>{ ORPO: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = satInfoboxCore.intelData(<SatObject>{ constellation: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = satInfoboxCore.intelData(<SatObject>{ maneuver: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = satInfoboxCore.intelData(<SatObject>{ associates: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satInfoboxCore.objectData', () => {
  test('0', () => {
    let result: any = satInfoboxCore.objectData(defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satInfoboxCore.objectData(<SatObject>(<unknown>{ OT: 0 }));
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satInfoboxCore.objectData(<SatObject>(<unknown>{ OT: 2 }));
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satInfoboxCore.objectData(<SatObject>(<unknown>{ OT: 3 }));
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satInfoboxCore.objectData(<SatObject>(<unknown>{ OT: 4 }));
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satInfoboxCore.objectData(<SatObject>(<unknown>{ OT: 5, TLE2: '1234556767' }));
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = satInfoboxCore.objectData(<SatObject>(<unknown>{ OT: 6, TLE2: '1234556767' }));
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = satInfoboxCore.objectData(<SatObject>(<unknown>{ OT: 7, TLE2: '1234556767' }));
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = satInfoboxCore.objectData(<SatObject>{ missile: true });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = satInfoboxCore.objectData(<SatObject>(<unknown>{ OT: 'unknown', TLE2: '1234556767' }));
    expect(result).toMatchSnapshot();
  });

  it('should handle all sat-types', () => {
    let result: any = satInfoboxCore.objectData(<SatObject>{ type: SpaceObjectType.UNKNOWN });
    expect(result).toMatchSnapshot();
    result = satInfoboxCore.objectData(<SatObject>{ type: SpaceObjectType.PAYLOAD });
    expect(result).toMatchSnapshot();
    result = satInfoboxCore.objectData(<SatObject>{ type: SpaceObjectType.ROCKET_BODY });
    expect(result).toMatchSnapshot();
    result = satInfoboxCore.objectData(<SatObject>{ type: SpaceObjectType.DEBRIS });
    expect(result).toMatchSnapshot();
    result = satInfoboxCore.objectData(<SatObject>{ type: SpaceObjectType.SPECIAL });
    expect(result).toMatchSnapshot();
    result = satInfoboxCore.objectData(<SatObject>{ type: SpaceObjectType.RADAR_MEASUREMENT, TLE2: '1234556767' });
    expect(result).toMatchSnapshot();
    result = satInfoboxCore.objectData(<SatObject>{ type: SpaceObjectType.RADAR_TRACK, TLE2: '1234556767' });
    expect(result).toMatchSnapshot();
    result = satInfoboxCore.objectData(<SatObject>{ type: SpaceObjectType.RADAR_OBJECT, TLE2: '1234556767' });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satInfoboxCore.init', () => {
  test('0', () => {
    let result: any = satInfoboxCore.init();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satInfoboxCore.nearOrbitsLink', () => {
  test('0', () => {
    keepTrackApi.programs.objectManager.selectedSat = -1;
    let result: any = satInfoboxCore.nearOrbitsLink();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    keepTrackApi.programs.objectManager.selectedSat = 1;
    let result: any = satInfoboxCore.nearOrbitsLink();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satInfoboxCore.allObjectsLink', () => {
  test('0', () => {
    keepTrackApi.programs.objectManager.selectedSat = -1;
    let result: any = satInfoboxCore.allObjectsLink();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    keepTrackApi.programs.objectManager.selectedSat = 1;
    keepTrackApi.programs.satSet.getSatExtraOnly = () => ({ ...defaultSat, ...{ intlDes: '1234512345' } });
    let result: any = satInfoboxCore.allObjectsLink();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satInfoboxCore.nearObjectsLinkClick', () => {
  test('0', () => {
    keepTrackApi.programs.objectManager.selectedSat = -1;
    let result: any = satInfoboxCore.nearObjectsLinkClick();
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    document.body.innerHTML = '<input id="search" value="39208" />';
    keepTrackApi.programs.objectManager.selectedSat = 1;
    keepTrackApi.programs.satSet.numSats = 3;
    let result: any = satInfoboxCore.nearObjectsLinkClick();
    expect(result).toMatchSnapshot();
  });
});
