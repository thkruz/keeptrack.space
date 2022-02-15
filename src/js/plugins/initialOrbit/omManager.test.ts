/* eslint-disable no-undefined */
import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import { omManager } from '../../plugins/initialOrbit/omManager';
import { _arctan2, _dayOfYear, _jday, _pad0, _propagate, _sv2kp } from './omManager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('omManager._jday', () => {
  test('0', () => {
    let callFunction = () => {
      _jday(0.0, 90, 1, 0.0, -10, 1.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      _jday(10, 0.0, 0, 10, 'December', -10);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      _jday(1, 1, 29, 0, 'December', 0.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      _jday(10, 1, 10, 0.0, 0, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      _jday(-1, -1, 0, -10, 0, -0.5);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      _jday(NaN, undefined, undefined, undefined, undefined, undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._arctan2', () => {
  test('0', () => {
    let callFunction = () => {
      _arctan2(0, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      _arctan2(0, 0.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      _arctan2(0, 10);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      _arctan2(1, 90);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      _arctan2(0, 410);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      _arctan2(-Infinity, -Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._dayOfYear', () => {
  test('0', () => {
    let callFunction = () => {
      _dayOfYear(-5.48, 0.0, 56784, 10, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      _dayOfYear(-1, 28, 0, 'December', 10.0);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      _dayOfYear(0, 0.0, 10, 0.0, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      _dayOfYear(0, 0, 0.0, 'July', 10);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      _dayOfYear(-1, 1, 12345, 1, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      _dayOfYear(-Infinity, -Infinity, -Infinity, -Infinity, undefined);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._pad0', () => {
  test('0', () => {
    let callFunction = () => {
      _pad0({ length: 10 }, -1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      _pad0({ length: 0 }, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      _pad0({ length: 64 }, 100);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      _pad0({ length: 256 }, 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      _pad0({ length: 64 }, 0);
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      _pad0(undefined, Infinity);
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._sv2kp', () => {
  test('0', () => {
    let param3 = [
      -1,
      ['41.1994', '-115.9206'],
      1,
      10,
      0,
      1,
      ['-19.3366', '-46.1477'],
      1,
      -1,
      1,
      -10,
      -10,
      0,
      1,
      0,
      ['41.1994', '-115.9206'],
      -1,
      0.0,
      0.0,
      ['-19.3366', '-46.1477'],
    ];
    let callFunction = () => {
      _sv2kp(
        1,
        'Apt. 716',
        param3,
        'kg',
        'M_Earth',
        [
          'Edmond',
          'George',
          'George',
          'Jean-Philippe',
          'Edmond',
          'Anas',
          'Edmond',
          'Michael',
          'Pierre Edouard',
          'Edmond',
          'Anas',
          'Edmond',
          'George',
          'Edmond',
          'Pierre Edouard',
          'Pierre Edouard',
          'Jean-Philippe',
          'Michael',
          'Jean-Philippe',
          'Jean-Philippe',
        ],
        'bed-free@tutanota.de',
        undefined
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let param3 = [-10, 0.0, 0.0, 0, 0.0, -10, 0, 0.0, 0.0, 10, 0, 1, 10, -10, 10, ['39.2233', '-78.8613'], 10, -10, -1, -10];
    let callFunction = () => {
      _sv2kp(
        1,
        -1,
        param3,
        'Masai Lion',
        'Asiatic Lion',
        [
          'Edmond',
          'Michael',
          'George',
          'Pierre Edouard',
          'Anas',
          'Jean-Philippe',
          'George',
          'Pierre Edouard',
          'Jean-Philippe',
          'Anas',
          'Edmond',
          'Anas',
          'Pierre Edouard',
          'Edmond',
          'George',
          'Pierre Edouard',
          'Michael',
          'George',
          'Michael',
          'Jean-Philippe',
        ],
        'user@host:300',
        'm'
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let param3 = [0, 0.0, 1, 1, -1, 10, 10, -10, -1, -10, -10, 1, 0, -10, 1, 1, 1, 1, 0, ['-84.8577', '134.8560']];
    let callFunction = () => {
      _sv2kp(
        "Boston's most advanced compression wear technology increases muscle oxygenation, stabilizes active muscles",
        -1,
        param3,
        'Asiatic Lion',
        'Masai Lion',
        [
          'Michael',
          'Pierre Edouard',
          'Pierre Edouard',
          'Edmond',
          'Jean-Philippe',
          'George',
          'Jean-Philippe',
          'Edmond',
          'Edmond',
          'George',
          'Michael',
          'Anas',
          'Pierre Edouard',
          'Anas',
          'Pierre Edouard',
          'Anas',
          'Pierre Edouard',
          'Pierre Edouard',
          'Michael',
          'Michael',
        ],
        'km',
        'm'
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let param3 = [1, -10, 0.0, 0.0, ['41.1994', '-115.9206'], -1, 0.0, -10, -1, 0.0, 1, 10, 0, -1, 10, -1, 0, 0.0, 1, ['39.2233', '-78.8613']];
    let callFunction = () => {
      _sv2kp(
        'The Apollotech B340 is an affordable wireless mouse with reliable connectivity, 12 months battery life and modern design',
        10,
        param3,
        'Transvaal lion',
        'Asiatic Lion',
        [
          'Jean-Philippe',
          'Michael',
          'Edmond',
          'Anas',
          'Edmond',
          'Pierre Edouard',
          'Edmond',
          'Pierre Edouard',
          'Anas',
          'Pierre Edouard',
          'Jean-Philippe',
          'Michael',
          'Jean-Philippe',
          'Pierre Edouard',
          'Michael',
          'Jean-Philippe',
          'Jean-Philippe',
          'George',
          'Pierre Edouard',
          'Edmond',
        ],
        'km',
        'Foo bar'
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let param3 = [['41.1994', '-115.9206'], -10, 1, 0, 0, 0, ['-84.8577', '134.8560'], -10, 0, 1, 1, 1, 10, 10, 1, 0.0, 10, -10, -1, -1];
    let callFunction = () => {
      _sv2kp(
        0,
        0.0,
        param3,
        undefined,
        'M_Earth',
        [
          'Pierre Edouard',
          'Anas',
          'Pierre Edouard',
          'Anas',
          'Jean-Philippe',
          'Anas',
          'Edmond',
          'George',
          'Pierre Edouard',
          'Pierre Edouard',
          'George',
          'Anas',
          'Jean-Philippe',
          'George',
          'Edmond',
          'Pierre Edouard',
          'Edmond',
          'George',
          'Michael',
          'Anas',
        ],
        'something.example.com',
        'm'
      );
    };

    expect(callFunction).not.toThrow();
  });

  test('5', () => {
    let callFunction = () => {
      _sv2kp(Infinity, undefined, [], '', undefined, [], '', '');
    };

    expect(callFunction).not.toThrow();
  });
});

// @ponicode
describe('omManager._propagate', () => {
  test('0', async () => {
    await _propagate(
      410,
      100,
      {
        getUTCMonth: () => 1,
        getUTCMilliseconds: () => 520,
        getUTCFullYear: () => true,
        getUTCDate: () => '01-13-2020',
        getUTCHours: () => 56784,
        getUTCMinutes: () => 75,
        getUTCSeconds: () => 243,
      },
      { twoline2satrec: () => 'Nile Crocodile', sgp4: () => 100 }
    );
  });

  test('1', async () => {
    await _propagate(
      380,
      1,
      {
        getUTCMonth: () => 28,
        getUTCMilliseconds: () => 380,
        getUTCFullYear: () => false,
        getUTCDate: () => '32-01-2020',
        getUTCHours: () => 'fakeData',
        getUTCMinutes: () => 75,
        getUTCSeconds: () => 161,
      },
      { twoline2satrec: () => 'Spectacled Caiman', sgp4: () => -100 }
    );
  });

  test('2', async () => {
    await _propagate(
      100,
      -5.48,
      {
        getUTCMonth: () => 0,
        getUTCMilliseconds: () => 410,
        getUTCFullYear: () => false,
        getUTCDate: () => '01-13-2020',
        getUTCHours: () => 987650,
        getUTCMinutes: () => 5,
        getUTCSeconds: () => 161,
      },
      { twoline2satrec: () => 'Saltwater Crocodile', sgp4: () => 0 }
    );
  });

  test('3', async () => {
    await _propagate(
      320,
      -5.48,
      {
        getUTCMonth: () => 3,
        getUTCMilliseconds: () => 30,
        getUTCFullYear: () => true,
        getUTCDate: () => '01-01-2030',
        getUTCHours: () => 'fakeData',
        getUTCMinutes: () => 25,
        getUTCSeconds: () => 241,
      },
      { twoline2satrec: () => 'Nile Crocodile', sgp4: () => -5.48 }
    );
  });

  test('4', async () => {
    await _propagate(
      100,
      -100,
      {
        getUTCMonth: () => 0,
        getUTCMilliseconds: () => 320,
        getUTCFullYear: () => false,
        getUTCDate: () => '32-01-2020',
        getUTCHours: () => 'fakeData',
        getUTCMinutes: () => 75,
        getUTCSeconds: () => 127,
      },
      { twoline2satrec: () => 'Saltwater Crocodile', sgp4: () => -100 }
    );
  });

  test('5', async () => {
    await _propagate(-Infinity, -Infinity, {}, undefined);
  });
});

const exampleSat = {
  C: 'US',
  LS: 'AFETR',
  LV: 'U',
  ON: 'VANGUARD 1',
  OT: 1,
  R: '0.1220',
  sccNum: '00005',
  TLE1: '1     5U 58002B   21107.45725112 -.00000113  00000-0 -16194-3 0  9999',
  TLE2: '2     5  34.2637  11.6832 1848228 280.4329  59.4145 10.84843191238363',
  active: true,
  apogee: 3845.1282721399293,
  argPe: 4.894477435916007,
  eccentricity: 0.1848228,
  id: 0,
  inclination: 0.5980143789155811,
  intlDes: '1958-002B',
  meanMotion: 10.843102290386977,
  perigee: 657.8610581463026,
  period: 132.80332154356245,
  position: {
    x: 4000,
    y: 4000,
    z: 4000,
  },
  velocity: {
    x: 7,
    y: 7,
    z: 7,
    total: 14,
  },
  raan: 0.2039103071690015,
  semiMajorAxis: 8622.494665143116,
  semiMinorAxis: 8473.945136538932,
  getAltitude: () => 100,
  getDirection: () => 'N',
  getTEARR: () => ({
    lat: 0.1,
    lon: 0.1,
    alt: 50000,
  }),
};
const exampleSat2 = {
  C: 'US',
  LS: 'AFETR',
  LV: 'U',
  ON: 'VANGUARD 1',
  OT: 1,
  R: '0.1220',
  sccNum: '00005',
  TLE1: '1     5U 58002B   21107.45725112 -.00000113  00000-0 -16194-3 0  9999',
  TLE2: '2     5  34.2637  11.6832 1848228 280.4329  59.4145 10.84843191238363',
  active: true,
  apogee: 3846.1282721399293,
  argPe: 4.994477435916007,
  eccentricity: 0.1948228,
  id: 0,
  inclination: 0.6980143789155811,
  intlDes: '1958-002B',
  meanMotion: 10.943102290386977,
  perigee: 657.9610581463026,
  period: 132.81332154356245,
  position: {
    x: 5001,
    y: 5001,
    z: 5001,
  },
  velocity: {
    x: 6.1,
    y: 6.1,
    z: 6.1,
    total: 13.1,
  },
  raan: 0.2049103071690015,
  semiMajorAxis: 8622.594665143116,
  semiMinorAxis: 8473.955136538932,
  getAltitude: () => 100,
  getDirection: () => 'N',
  getTEARR: () => ({
    lat: 0.1,
    lon: 0.1,
    alt: 50000,
  }),
};

test('Orbit Math Manager Test', () => {
  const { timeManager } = keepTrackApi.programs;
  omManager.sat2sv(exampleSat, timeManager);
  omManager.sat2kp(exampleSat, timeManager);
  omManager.sat2tle(exampleSat, timeManager);
  omManager.sat2tle(exampleSat, timeManager);

  const sv = omManager.sat2sv(exampleSat, timeManager);
  const sv2 = omManager.sat2sv(exampleSat2, timeManager);
  omManager.svs2kps([sv, sv2]);
});
