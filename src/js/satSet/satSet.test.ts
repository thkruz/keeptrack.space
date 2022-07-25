import { defaultSat, keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms, SatCruncherMessage, SatObject } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import * as satSet from '../satSet/satSet';
import { cruncherDotsManagerInteraction, cruncherExtraUpdate, onCruncherReady, parseGetVariables, satCruncherOnMessage } from './catalogSupport/cruncherInteractions';
import {
  getIdFromEci,
  getIdFromIntlDes,
  getIdFromObjNum,
  getIdFromStarName,
  getSat,
  getSatExtraOnly,
  getSatInSun,
  getSatInView,
  getSatPosOnly,
  getSatVel,
  getScreenCoords,
  getSensorFromSensorName,
} from './catalogSupport/getters';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

const defaultSatCruncherMessage: SatCruncherMessage = {
  data: {
    satPos: [0, 0, 0],
    satVel: [0, 0, 0],
    satInSun: [1],
    satInView: [1],
    sensorMarkerArray: [1],
    satId: 0,
    extraData: JSON.stringify([
      {
        inclination: 0,
        eccentricity: 0,
        raan: 0,
        argPe: 0,
        meanMotion: 0,
        semiMajorAxis: 0,
        semiMinorAxis: 0,
        apogee: 0,
        perigee: 0,
        period: 0,
        TLE1: '1234567890',
        TLE2: '1234567890',
      },
    ]),
    extraUpdate: true,
  },
};

describe('satSet.init', () => {
  test('0', async () => {
    await satSet.init(keepTrackApi.programs.satSet.satCruncher);
  });

  test('1', async () => {
    await satSet.init(keepTrackApi.programs.satSet.satCruncher);
  });
});

describe('satSet.parseGetVariables', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });
  test('0', () => {
    let result: any = parseGetVariables();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSat', () => {
  it('should return extra info if gotExtraData is true', () => {
    satSet.init(keepTrackApi.programs.satSet.satCruncher);
    keepTrackApi.programs.satSet.gotExtraData = true;
    let result: any = getSat(0);
    expect(result.velocity).not.toBe(false);
  });
  test('0', () => {
    let result: any = getSat(-5.48);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = getSat(-100);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = getSat(0);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = getSat(100);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = getSat(1);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = getSat(-Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.selectSat', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
    keepTrackApi.programs.colorSchemeManager.currentColorScheme = keepTrackApi.programs.colorSchemeManager.default;
    keepTrackApi.programs.colorSchemeManager.colorBufferOneTime = true;
  });
  test('0', () => {
    let result: any = satSet.selectSat(-1);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.selectSat(1);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satSet.selectSat(0);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satSet.selectSat(100);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satSet.selectSat(150);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satSet.selectSat(Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSatPosOnly', () => {
  test('0', () => {
    let result: any = getSatPosOnly(100);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = getSatPosOnly(-5.48);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = getSatPosOnly(1);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = getSatPosOnly(0);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = getSatPosOnly(-100);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = getSatPosOnly(NaN);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getIdFromEci', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });
  test('0', () => {
    let result: any = getIdFromEci({ x: 1, y: 520, z: 350 });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = getIdFromEci({ x: 350, y: 550, z: 90 });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = getIdFromEci({ x: 4, y: 30, z: 400 });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = getIdFromEci({ x: 90, y: 350, z: 70 });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = getIdFromEci({ x: 520, y: 550, z: 4 });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = getIdFromEci({ x: -Infinity, y: -Infinity, z: -Infinity });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getIdFromObjNum', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });
  test('0', () => {
    let result: any = getIdFromObjNum(25544);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = getIdFromObjNum(-1);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSatInView', () => {
  test('0', () => {
    let result: any = getSatInView();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSatInSun', () => {
  test('0', () => {
    let result: any = getSatInSun();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSatVel', () => {
  test('0', () => {
    let result: any = getSatVel();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.resetSatInView', () => {
  test('0', () => {
    let result: any = satSet.resetSatInView();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.resetSatInSun', () => {
  test('0', () => {
    let result: any = satSet.resetSatInSun();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSatExtraOnly', () => {
  beforeEach(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });
  test('0', () => {
    let result: any = getSatExtraOnly(0);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = getSatExtraOnly(-100);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = getSatExtraOnly(1);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = getSatExtraOnly(-5.48);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = getSatExtraOnly(100);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = getSatExtraOnly(Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.setSat', () => {
  test('0', () => {
    let result: any = satSet.setSat(10, defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.setSat(0, defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satSet.setSat(48, defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satSet.setSat(-100, defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satSet.setSat(-1100, defaultSat);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satSet.setSat(Infinity, defaultSat);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.onCruncherReady', () => {
  test('0', () => {
    let result: any = onCruncherReady();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getScreenCoords', () => {
  test('0', () => {
    let param2: any = new Float32Array([10.23, 0.5, -1.0, -1.0, 0.0, -1.0, 1.0, -1.0, -29.45, 1.0]);
    let param3: any = new Float32Array([1.0, 1.0, 0.0]);
    let result: any = getScreenCoords(-100, param2, param3, { x: 320, y: 4, z: 320 });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let param3: any = new Float32Array([-1.0, -0.5, 10.23]);
    let result: any = getScreenCoords(1, [1.0, 0.0, 0.5, 0.5, 10.0, -29.45, 0.5, 10.0, 0.5, -0.5, -29.45, 10.23, 10.23, -1.0, 10.0, -29.45], param3, { x: 70, y: 520, z: 400 });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let param3: any = new Float32Array([-1.0, 10.23, 0.5]);
    let result: any = getScreenCoords(-100, [10.23, 10.0, 1.0, 0.5, 0.5, 1.0, 0.0, 10.0, -0.5, 10.0, 1.0, -29.45, -29.45, -1.0, 10.23, 0.5], param3, { x: 70, y: 350, z: 400 });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let param3: any = new Float32Array([10.0, -0.5, 0.0]);
    let result: any = getScreenCoords(-5.48, [-0.5, 1.0, 1.0, -1.0, 1.0, -1.0, -29.45, -29.45, -29.45, -0.5, -29.45, -0.5, -0.5, -0.5, 1.0, -1.0], param3, {
      x: 30,
      y: 410,
      z: 400,
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = getScreenCoords(
      100,
      [10.23, 0.0, 10.23, 0.5, 1.0, 0.0, -0.5, 0.0, 10.23, 10.0, 0.0, -1.0, 0.5, -29.45, 0.0, -1.0],
      [-1.0, -1.0, -1.0, -0.5, -0.5, 1.0, -1.0, -1.0, 1.0, -0.5, 10.0, 10.23, -1.0, -1.0, -29.45, -0.5],
      {
        x: 50,
        y: 4,
        z: 4,
      }
    );
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let param2: any = new Float32Array([]);
    let result: any = getScreenCoords(NaN, param2, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { x: NaN, y: NaN, z: NaN });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.convertIdArrayToSatnumArray', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });
  test('0', () => {
    let result: any = satSet.convertIdArrayToSatnumArray([10, 10, 64]);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.convertIdArrayToSatnumArray([32, 256, 16]);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satSet.convertIdArrayToSatnumArray([64, 16, 16]);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satSet.convertIdArrayToSatnumArray([10, 10, 0]);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satSet.convertIdArrayToSatnumArray([0, 256, 0]);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satSet.convertIdArrayToSatnumArray([]);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.convertSatnumArrayToIdArray', () => {
  test('0', () => {
    let result: any = satSet.convertSatnumArrayToIdArray([-5.48, -100, 100, 1, -5.48]);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.convertSatnumArrayToIdArray([100, -5.48, 1, 0]);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satSet.convertSatnumArrayToIdArray([100, -5.48, 0, 100, -100]);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satSet.convertSatnumArrayToIdArray([-100, 100, 1, 100]);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satSet.convertSatnumArrayToIdArray([100, -5.48, -5.48, -5.48]);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satSet.convertSatnumArrayToIdArray([]);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getIdFromIntlDes', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });

  test('0', () => {
    let result: any = getIdFromIntlDes('1998-AB');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = getIdFromIntlDes('2020-A');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getIdFromStarName', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });

  test('0', () => {
    let result: any = getIdFromStarName('test');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = getIdFromStarName('2020-A');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSensorFromSensorName', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });

  test('0', () => {
    let result: any = getSensorFromSensorName('test');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = getSensorFromSensorName('2020-A');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.mergeSat', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.mergeSat(<SatObject>(<unknown>{ sccNum: '25544', type: SpaceObjectType.PAYLOAD }));
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.addSatExtraFunctions', () => {
  test('0', () => {
    const fakeSatSet = <any>keepTrackApiStubs.programs.satSet;
    delete fakeSatSet.satData[0].isInSun;
    satSet.replaceSatSet(fakeSatSet);
    let result: any = satSet.addSatExtraFunctions(0);
    expect(result).toMatchSnapshot();
    expect(() => satSet.satSet.satData[0].isInSun()).not.toThrow();
  });
});

describe('satSet.satCruncherOnMessage', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });

  test('0', () => {
    let result: any = satCruncherOnMessage(defaultSatCruncherMessage);
    expect(result).toMatchSnapshot();
  });
});

describe('satSet.cruncherExtraUpdate', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });

  test('0', () => {
    let result: any = cruncherExtraUpdate(defaultSatCruncherMessage);
    expect(result).toMatchSnapshot();
  });
});

describe('satSet.cruncherDotsManagerInteraction', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });

  test('0', () => {
    let result: any = cruncherDotsManagerInteraction(defaultSatCruncherMessage);
    expect(result).toMatchSnapshot();
  });
});

describe('satSet.satCruncherOnMessage', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });

  test('0', () => {
    let result: any = satCruncherOnMessage(defaultSatCruncherMessage);
    expect(result).toMatchSnapshot();
  });
});

describe('satSet.insertNewAnalystSatellite', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });

  test('0', () => {
    satSet.insertNewAnalystSatellite('1234567890', '1234567890', 0);
  });
});

describe('satSet.setHover', () => {
  beforeAll(() => {
    keepTrackApi.programs.colorSchemeManager.currentColorScheme = keepTrackApi.programs.colorSchemeManager.default;
    satSet.replaceSatSet(keepTrackApiStubs.programs.satSet);
  });

  test('0', () => {
    keepTrackApi.programs.colorSchemeManager.currentColorScheme = keepTrackApi.programs.colorSchemeManager.default;
    let result: any = satSet.setHover(0);
    expect(result).toMatchSnapshot();
  });
});
