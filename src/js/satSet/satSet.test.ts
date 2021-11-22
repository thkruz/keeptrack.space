import { SatCruncherMessage } from '../../types/types';
import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/externalApi';
import * as satSet from '../satSet/satSet';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

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
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });
  test('0', () => {
    let result: any = satSet.parseGetVariables();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.initGsData', () => {
  test('0', () => {
    let result: any = satSet.initGsData();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSat', () => {
  test('0', () => {
    let result: any = satSet.getSat(-5.48);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.getSat(-100);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satSet.getSat(0);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satSet.getSat(100);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satSet.getSat(1);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satSet.getSat(-Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.selectSat', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
    (<any>window).settingsManager.currentColorScheme = {
      colorRuleSet: () => ({
        color: [0, 0, 0, 0],
      }),
    };
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
describe('satSet.getSatInViewOnly', () => {
  test('0', () => {
    let result: any = satSet.getSatInViewOnly(-5.48);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.getSatInViewOnly(-100);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satSet.getSatInViewOnly(1);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satSet.getSatInViewOnly(0);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satSet.getSatInViewOnly(100);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satSet.getSatInViewOnly(-Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSatPosOnly', () => {
  test('0', () => {
    let result: any = satSet.getSatPosOnly(100);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.getSatPosOnly(-5.48);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satSet.getSatPosOnly(1);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satSet.getSatPosOnly(0);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satSet.getSatPosOnly(-100);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satSet.getSatPosOnly(NaN);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getIdFromEci', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });
  test('0', () => {
    let result: any = satSet.getIdFromEci({ x: 1, y: 520, z: 350 });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.getIdFromEci({ x: 350, y: 550, z: 90 });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satSet.getIdFromEci({ x: 4, y: 30, z: 400 });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satSet.getIdFromEci({ x: 90, y: 350, z: 70 });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satSet.getIdFromEci({ x: 520, y: 550, z: 4 });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satSet.getIdFromEci({ x: -Infinity, y: -Infinity, z: -Infinity });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getIdFromObjNum', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });
  test('0', () => {
    let result: any = satSet.getIdFromObjNum(25544);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.getIdFromObjNum(-1);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSatInView', () => {
  test('0', () => {
    let result: any = satSet.getSatInView();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSatInSun', () => {
  test('0', () => {
    let result: any = satSet.getSatInSun();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSatVel', () => {
  test('0', () => {
    let result: any = satSet.getSatVel();
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
  test('0', () => {
    let result: any = satSet.getSatExtraOnly(0);
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.getSatExtraOnly(-100);
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satSet.getSatExtraOnly(1);
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satSet.getSatExtraOnly(-5.48);
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satSet.getSatExtraOnly(100);
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satSet.getSatExtraOnly(Infinity);
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.setSat', () => {
  test('0', () => {
    let result: any = satSet.setSat(-5.48, {
      position: { x: 410, y: 520, z: 50 },
      static: true,
      TLE1: 'This is a Text',
      TLE2: 'foo bar',
      SCC_NUM: 'MT',
      active: true,
      C: 'rgb(0,100,200)',
      LS: 'B/.',
      LV: 'Saltwater Crocodile',
      ON: '2021-07-30T00:05:36.818Z',
      OT: 12345,
      R: 'ponicode.com',
      URL: 'https://croplands.org/app/a/confirm?t=',
      O: 'something.example.com',
      U: 'something.example.com',
      P: '#F00',
      LM: 'Dwarf Crocodile',
      DM: 'Spectacled Caiman',
      Pw: '4.0.0-beta1\t',
      Li: 56784,
      Con: 'bc23a9d531064583ace8f67dad60f6bb',
      M: 'rgb(0.1,0.2,0.3)',
      S1: 'TestUpperCase@Example.com',
      S2: 'TestUpperCase@Example.com',
      S3: 'email@Google.com',
      S4: 'user@host:300',
      S5: 'TestUpperCase@Example.com',
      S6: 'bed-free@tutanota.de',
      S7: 'something.example.com',
      inclination: 0,
      lon: 0,
      perigee: 56784,
      apogee: 987650,
      period: 10,
      meanMotion: 0.01,
      semimajorAxis: 5,
      eccentricity: 0.0,
      raan: 0,
      argPe: 56784,
      inView: 100,
      velocity: { total: 10000, x: 30, y: 410, z: 90 },
      getTEARR: 100,
      getAltitude: 90,
      getDirection: 1,
      vmag: -5.48,
      id: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.setSat(0, {
      position: { x: 320, y: 70, z: 1 },
      static: true,
      TLE1: 'Foo bar',
      TLE2: 'Foo bar',
      SCC_NUM: '₹',
      active: true,
      C: 'hsl(10%,20%,40%)',
      LS: 'B/.',
      LV: 'Spectacled Caiman',
      ON: '2021-07-29T17:54:41.653Z',
      OT: 10,
      R: 'something@example.com',
      URL: 'http://www.example.com/route/123?foo=bar',
      O: 'bed-free@tutanota.de',
      U: 'ponicode.com',
      P: 'black',
      LM: 'Spectacled Caiman',
      DM: 'Dwarf Crocodile',
      Pw: 'v4.0.0-rc.4',
      Li: 987650,
      Con: '12345',
      M: 'black',
      S1: 'bed-free@tutanota.de',
      S2: 'something@example.com',
      S3: 'something.example.com',
      S4: 'TestUpperCase@Example.com',
      S5: 'something@example.com',
      S6: 'ponicode.com',
      S7: 'email@Google.com',
      inclination: 5,
      lon: 10,
      perigee: 10,
      apogee: 12345,
      period: 0,
      meanMotion: 3500.0,
      semimajorAxis: 1,
      eccentricity: -29.45,
      raan: 12345,
      argPe: 56784,
      inView: 0,
      velocity: { total: 0.0, x: 100, y: 30, z: 1 },
      getTEARR: -5.48,
      getAltitude: 4,
      getDirection: 100,
      vmag: -100,
      id: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let result: any = satSet.setSat(-5.48, {
      position: { x: 520, y: 50, z: 520 },
      static: true,
      TLE1: 'Foo bar',
      TLE2: 'Foo bar',
      SCC_NUM: 'MT',
      active: false,
      C: 'rgb(0,100,200)',
      LS: '£',
      LV: 'Spectacled Caiman',
      ON: '2021-07-29T15:31:46.922Z',
      OT: 12,
      R: 'user@host:300',
      URL: 'http://base.com',
      O: 'something@example.com',
      U: 'bed-free@tutanota.de',
      P: 'black',
      LM: 'Australian Freshwater Crocodile',
      DM: 'Australian Freshwater Crocodile',
      Pw: '1.0.0',
      Li: 'a',
      Con: 'bc23a9d531064583ace8f67dad60f6bb',
      M: '#F00',
      S1: 'email@Google.com',
      S2: 'TestUpperCase@Example.com',
      S3: 'TestUpperCase@Example.com',
      S4: 'bed-free@tutanota.de',
      S5: 'bed-free@tutanota.de',
      S6: 'something.example.com',
      S7: 'something@example.com',
      inclination: 3.0,
      lon: 12,
      perigee: 12345,
      apogee: 0,
      period: 10,
      meanMotion: 0.01,
      semimajorAxis: 2,
      eccentricity: 10.23,
      raan: 10,
      argPe: 12345,
      inView: 100,
      velocity: { total: 0, x: 320, y: 1, z: 30 },
      getTEARR: 100,
      getAltitude: ['-19.3366', '-46.1477'],
      getDirection: true,
      vmag: 0,
      id: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let result: any = satSet.setSat(-100, {
      position: { x: 350, y: 4, z: 1 },
      static: true,
      TLE1: 'Foo bar',
      TLE2: 'Hello, world!',
      SCC_NUM: 'лв',
      active: true,
      C: '#FF00FF',
      LS: 'лв',
      LV: 'Spectacled Caiman',
      ON: '2021-07-29T20:12:53.196Z',
      OT: 10,
      R: 'user1+user2@mycompany.com',
      URL: 'https://api.telegram.org/bot',
      O: 'email@Google.com',
      U: 'email@Google.com',
      P: 'green',
      LM: 'Saltwater Crocodile',
      DM: 'Spectacled Caiman',
      Pw: '1.0.0',
      Li: 12345,
      Con: 'c466a48309794261b64a4f02cfcc3d64',
      M: 'black',
      S1: 'email@Google.com',
      S2: 'user@host:300',
      S3: 'user@host:300',
      S4: 'user@host:300',
      S5: 'user@host:300',
      S6: 'ponicode.com',
      S7: 'something.example.com',
      inclination: 3.0,
      lon: 56784,
      perigee: 12,
      apogee: 12345,
      period: 10,
      meanMotion: 1,
      semimajorAxis: 64,
      eccentricity: 10.0,
      raan: 987650,
      argPe: 12,
      inView: 100,
      velocity: { total: 0.0, x: 350, y: 410, z: 320 },
      getTEARR: -5.48,
      getAltitude: 30,
      getDirection: 'Southwest',
      vmag: 1,
      id: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satSet.setSat(-100, {
      position: { x: 100, y: 320, z: 400 },
      static: false,
      TLE1: 'This is a Text',
      TLE2: 'Hello, world!',
      SCC_NUM: 'лв',
      active: false,
      C: 'red',
      LS: 'MT',
      LV: 'Nile Crocodile',
      ON: '2021-07-29T17:54:41.653Z',
      OT: 10,
      R: 'bed-free@tutanota.de',
      URL: 'http://www.croplands.org/account/confirm?t=',
      O: 'user1+user2@mycompany.com',
      U: 'user1+user2@mycompany.com',
      P: 'red',
      LM: 'Dwarf Crocodile',
      DM: 'Australian Freshwater Crocodile',
      Pw: '^5.0.0',
      Li: 'bc23a9d531064583ace8f67dad60f6bb',
      Con: 'c466a48309794261b64a4f02cfcc3d64',
      M: '#FF00FF',
      S1: 'user1+user2@mycompany.com',
      S2: 'TestUpperCase@Example.com',
      S3: 'email@Google.com',
      S4: 'user1+user2@mycompany.com',
      S5: 'user@host:300',
      S6: 'something.example.com',
      S7: 'email@Google.com',
      inclination: 4,
      lon: 12345,
      perigee: 987650,
      apogee: 987650,
      period: 10,
      meanMotion: 100.0,
      semimajorAxis: 2,
      eccentricity: -29.45,
      raan: 12345,
      argPe: 12,
      inView: 100,
      velocity: { total: 6.0, x: 520, y: 410, z: 100 },
      getTEARR: 1,
      getAltitude: 70,
      getDirection: 'South',
      vmag: -5.48,
      id: 0,
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let result: any = satSet.setSat(Infinity, {
      position: { x: Infinity, y: Infinity, z: Infinity },
      static: true,
      TLE1: '',
      TLE2: '',
      SCC_NUM: '',
      active: true,
      C: '',
      LS: '',
      LV: '',
      ON: '',
      OT: Infinity,
      R: '',
      URL: '',
      O: '',
      U: '',
      P: '',
      LM: '',
      DM: '',
      Pw: '',
      Li: '',
      Con: '',
      M: '',
      S1: '',
      S2: '',
      S3: '',
      S4: '',
      S5: '',
      S6: '',
      S7: '',
      inclination: Infinity,
      lon: Infinity,
      perigee: Infinity,
      apogee: Infinity,
      period: Infinity,
      meanMotion: Infinity,
      semimajorAxis: Infinity,
      eccentricity: Infinity,
      raan: Infinity,
      argPe: Infinity,
      inView: Infinity,
      velocity: { total: Infinity, x: Infinity, y: Infinity, z: Infinity },
      getTEARR: Infinity,
      getAltitude: '',
      getDirection: false,
      vmag: Infinity,
      id: 0,
    });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.onCruncherReady', () => {
  test('0', () => {
    let result: any = satSet.onCruncherReady();
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getScreenCoords', () => {
  test('0', () => {
    let param2: any = new Float32Array([10.23, 0.5, -1.0, -1.0, 0.0, -1.0, 1.0, -1.0, -29.45, 1.0]);
    let param3: any = new Float32Array([1.0, 1.0, 0.0]);
    let result: any = satSet.getScreenCoords(-100, param2, param3, { x: 320, y: 4, z: 320 });
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let param3: any = new Float32Array([-1.0, -0.5, 10.23]);
    let result: any = satSet.getScreenCoords(1, [1.0, 0.0, 0.5, 0.5, 10.0, -29.45, 0.5, 10.0, 0.5, -0.5, -29.45, 10.23, 10.23, -1.0, 10.0, -29.45], param3, { x: 70, y: 520, z: 400 });
    expect(result).toMatchSnapshot();
  });

  test('2', () => {
    let param3: any = new Float32Array([-1.0, 10.23, 0.5]);
    let result: any = satSet.getScreenCoords(-100, [10.23, 10.0, 1.0, 0.5, 0.5, 1.0, 0.0, 10.0, -0.5, 10.0, 1.0, -29.45, -29.45, -1.0, 10.23, 0.5], param3, { x: 70, y: 350, z: 400 });
    expect(result).toMatchSnapshot();
  });

  test('3', () => {
    let param3: any = new Float32Array([10.0, -0.5, 0.0]);
    let result: any = satSet.getScreenCoords(-5.48, [-0.5, 1.0, 1.0, -1.0, 1.0, -1.0, -29.45, -29.45, -29.45, -0.5, -29.45, -0.5, -0.5, -0.5, 1.0, -1.0], param3, { x: 30, y: 410, z: 400 });
    expect(result).toMatchSnapshot();
  });

  test('4', () => {
    let result: any = satSet.getScreenCoords(100, [10.23, 0.0, 10.23, 0.5, 1.0, 0.0, -0.5, 0.0, 10.23, 10.0, 0.0, -1.0, 0.5, -29.45, 0.0, -1.0], [-1.0, -1.0, -1.0, -0.5, -0.5, 1.0, -1.0, -1.0, 1.0, -0.5, 10.0, 10.23, -1.0, -1.0, -29.45, -0.5], {
      x: 50,
      y: 4,
      z: 4,
    });
    expect(result).toMatchSnapshot();
  });

  test('5', () => {
    let param2: any = new Float32Array([]);
    let result: any = satSet.getScreenCoords(NaN, param2, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { x: NaN, y: NaN, z: NaN });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.convertIdArrayToSatnumArray', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
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
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.getIdFromIntlDes('1998-AB');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.getIdFromIntlDes('2020-A');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getIdFromStarName', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.getIdFromStarName('test');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.getIdFromStarName('2020-A');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.getSensorFromSensorName', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.getSensorFromSensorName('test');
    expect(result).toMatchSnapshot();
  });

  test('1', () => {
    let result: any = satSet.getSensorFromSensorName('2020-A');
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.mergeSat', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.mergeSat({ SCC_NUM: 25544, OT: 1 });
    expect(result).toMatchSnapshot();
  });
});

// @ponicode
describe('satSet.addSatExtraFunctions', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.addSatExtraFunctions(0);
    expect(result).toMatchSnapshot();
  });
});

describe('satSet.satCruncherOnMessage', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.satCruncherOnMessage(defaultSatCruncherMessage);
    expect(result).toMatchSnapshot();
  });
});

describe('satSet.cruncherExtraUpdate', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.cruncherExtraUpdate(defaultSatCruncherMessage);
    expect(result).toMatchSnapshot();
  });
});

describe('satSet.cruncherDotsManagerInteraction', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.cruncherDotsManagerInteraction(defaultSatCruncherMessage);
    expect(result).toMatchSnapshot();
  });
});

describe('satSet.satCruncherOnMessage', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.satCruncherOnMessage(defaultSatCruncherMessage);
    expect(result).toMatchSnapshot();
  });
});

describe('satSet.insertNewAnalystSatellite', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.insertNewAnalystSatellite('1234567890', '1234567890', 0);
    expect(result).toMatchSnapshot();
  });
});

describe('satSet.setHover', () => {
  beforeAll(() => {
    satSet.replaceSatSet(keepTrackApi.programs.satSet);
  });

  test('0', () => {
    let result: any = satSet.setHover(0);
    expect(result).toMatchSnapshot();
  });
});
