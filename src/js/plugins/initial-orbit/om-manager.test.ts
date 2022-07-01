/* eslint-disable no-undefined */
import { defaultSat, keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import { omManager, _arctan2, _dayOfYear, _jday, _pad0, _propagate, _sv2kp } from './om-manager';

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
      _jday(10, 0.0, 0, 10, 10, -10);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      _jday(1, 1, 29, 0, 10, 0.0);
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
      _dayOfYear(-1, 28, 0, 10, 10.0);
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
      _dayOfYear(0, 0, 0.0, 10, 10);
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
      _pad0('5', 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('1', () => {
    let callFunction = () => {
      _pad0('6', 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('2', () => {
    let callFunction = () => {
      _pad0('8', 100);
    };

    expect(callFunction).not.toThrow();
  });

  test('3', () => {
    let callFunction = () => {
      _pad0('25', 1);
    };

    expect(callFunction).not.toThrow();
  });

  test('4', () => {
    let callFunction = () => {
      _pad0('12', 0);
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
  test('if a bad state vector returns an answer', () => {
    let callFunction = () => {
      _sv2kp({
        massPrimary: 1,
        massSecondary: 1,
        vector: [new Date(2022, 0, 1).getTime(), 0, 0, 0, 0, 0, 0],
        massPrimaryU: 'kg',
        massSecondaryU: 'M_Earth',
        vectorU: 'm',
        outputU: 'm',
        outputU2: 'm',
      });
    };
    expect(callFunction).not.toThrow();
  });

  test('if a good state vector returns an answer', () => {
    let callFunction = () => {
      _sv2kp({
        massPrimary: 1,
        massSecondary: 1,
        vector: [new Date(2022, 0, 1).getTime(), 100, -5000, 8300, 3, -2, 6],
        massPrimaryU: 'kg',
        massSecondaryU: 'M_Earth',
        vectorU: 'km',
        outputU: 'km',
        outputU2: 'km',
      });
    };

    expect(callFunction).not.toThrow();
  });

  test('if negative mass throws an error', () => {
    let callFunction = () => {
      _sv2kp({
        massPrimary: -1,
        massSecondary: -1,
        vector: [new Date(2022, 0, 1).getTime(), 100, -5000, 8300, 3, -2, 6],
      });
    };

    expect(callFunction).toThrow();
  });
  test('if non-earth units throw an error', () => {
    let callFunction = () => {
      _sv2kp({
        massPrimary: -1,
        massSecondary: -1,
        vector: [new Date(2022, 0, 1).getTime(), 100, -5000, 8300, 3, -2, 6],
        massPrimaryU: 'kg',
        massSecondaryU: 'M_Moon',
        vectorU: 'km',
        outputU: 'km',
        outputU2: 'km',
      });
    };

    expect(callFunction).toThrow();
  });
});

// @ponicode
describe('omManager._propagate', () => {
  test('0', async () => {
    await _propagate(defaultSat.TLE1, defaultSat.TLE2, new Date(2022, 0, 1), { twoline2satrec: () => 'Nile Crocodile', sgp4: () => 100 });
  });

  test('1', async () => {
    await _propagate(defaultSat.TLE1, defaultSat.TLE2, new Date(2022, 0, 1), { twoline2satrec: () => 'Spectacled Caiman', sgp4: () => -100 });
  });

  test('2', async () => {
    await _propagate(defaultSat.TLE1, defaultSat.TLE2, new Date(2022, 0, 1), { twoline2satrec: () => 'Saltwater Crocodile', sgp4: () => 0 });
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
