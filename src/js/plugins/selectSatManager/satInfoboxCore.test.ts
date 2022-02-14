import 'jquery-ui-bundle';
import { defaultSat, defaultSensor, keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
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
    let result: any = satInfoboxCore.satMissionData({ LM: '1', DM: '2', Pw: '3', vmag: '4', S2: '1', S4: '1', S5: '1', S6: '1', S7: '1' });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satInfoboxCore.satMissionData({ missile: true });
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
    let result: any = satInfoboxCore.intelData({ TTP: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satInfoboxCore.intelData({ NOTES: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satInfoboxCore.intelData({ FMISSED: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = satInfoboxCore.intelData({ ORPO: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = satInfoboxCore.intelData({ constellation: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = satInfoboxCore.intelData({ maneuver: 'test' }, 1);
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = satInfoboxCore.intelData({ associates: 'test' }, 1);
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
    let result: any = satInfoboxCore.objectData({ OT: 0 });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satInfoboxCore.objectData({ OT: 2 });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satInfoboxCore.objectData({ OT: 3 });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satInfoboxCore.objectData({ OT: 4 });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satInfoboxCore.objectData({ OT: 5, TLE2: '1234556767' });
    expect(result).toMatchSnapshot();
  });

  test('6', () => {
    let result: any = satInfoboxCore.objectData({ OT: 6, TLE2: '1234556767' });
    expect(result).toMatchSnapshot();
  });

  test('7', () => {
    let result: any = satInfoboxCore.objectData({ OT: 7, TLE2: '1234556767' });
    expect(result).toMatchSnapshot();
  });

  test('8', () => {
    let result: any = satInfoboxCore.objectData({ missile: true });
    expect(result).toMatchSnapshot();
  });

  test('9', () => {
    let result: any = satInfoboxCore.objectData({ OT: 'unknown', TLE2: '1234556767' });
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
    let result: any = satInfoboxCore.nearObjectsLinkClick();
    expect(result).toMatchSnapshot();
  });
});
