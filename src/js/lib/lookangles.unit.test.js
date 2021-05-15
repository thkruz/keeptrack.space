/* eslint-disable no-undefined */
/*globals
  test
*/

import { satellite } from '@app/js/lib/lookangles.js';

test('lookangles Unit Tests', () => {
  const sat1 = {
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
    raan: 0.2039103071690015,
    semiMajorAxis: 8622.494665143116,
    semiMinorAxis: 8473.945136538932,
    velocity: {},
  };

  // satellite.satSensorFOV(sat1, sat2);

  satellite.lookAnglesToEcf(0, 20, 5000, 41, -71, 0);

  satellite.radarMinSignal(1000, 1, 10, 2000, 420000);
  satellite.radarMaxrng(1000, 1, 10, -30, 420000);

  satellite.getEci(sat1, new Date());
});
