/* eslint-disable no-undefined */
/*globals
  test
*/

import { omManager } from '@app/js/plugins/initialOrbit/omManager';

const exampleSat = {
  C: 'US',
  LS: 'AFETR',
  LV: 'U',
  ON: 'VANGUARD 1',
  OT: 1,
  R: '0.1220',
  SCC_NUM: '00005',
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
  SCC_NUM: '00005',
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

const timeManager = {
  propTime: () => {
    //
  },
};

test('Orbit Math Manager Test', () => {
  omManager.sat2sv(exampleSat, timeManager);
  omManager.sat2kp(exampleSat, timeManager);
  omManager.sat2tle(exampleSat, timeManager);
  omManager.sat2tle(exampleSat, timeManager);

  const sv = omManager.sat2sv(exampleSat, timeManager);
  const sv2 = omManager.sat2sv(exampleSat2, timeManager);
  omManager.svs2kps([sv, sv2]);
});
