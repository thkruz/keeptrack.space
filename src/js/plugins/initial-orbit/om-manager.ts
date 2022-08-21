/* eslint-disable no-unused-vars */
/* /////////////////////////////////////////////////////////////////////////////
 *
 * omManager.js Orbit Math Manager handles the conversion of state vector data,
 * keplerian elements, and two line element sets as well as initial orbit fitting
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

// sv - State Vectors
// [unixTime, x, y, z, xDot, yDot, zDot]

// TODO: This library needs rewrote in TypeScript
// TODO: Reference older version of this file for possible additional features

'use strict';

import { CatalogManager } from '@app/js/satSet/satSet';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { TimeManager } from '@app/js/timeManager/timeManager';
import { searchBox } from '@app/js/uiManager/search/searchBox';

// Constants
const RADIUS_OF_EARTH = 6371000; // Radius of Earth in meters
const G = 6.6725985e-11;
const MILLISECONDS_PER_DAY = 1.15741e-8;
const MINUTES_PER_DAY = 1440;
const PI = Math.PI;
const TAU = 2 * PI;
const RAD2DEG = 360 / TAU;

// Make Orbit Math Manager
const om = {
  sat2sv: null,
  sat2kp: null,
  sat2tle: null,
  sv2kp: null,
  kp2tle: null,
  iod: null,
  svs2analyst: null,
  fitTles: null,
  testIod: null,
  svs2kps: null,
  debug: null,
};

// Public Functions
om.sat2sv = (sat: SatObject, timeManager: TimeManager) => [
  timeManager.simulationTimeObj,
  sat.position.x,
  sat.position.y,
  sat.position.z,
  sat.velocity.x,
  sat.velocity.y,
  sat.velocity.z,
];
om.sat2kp = (sat: SatObject, timeManager: TimeManager) => {
  const sv = om.sat2sv(sat, timeManager);
  return om.sv2kp(sv, timeManager);
};
om.sat2tle = (sat: SatObject, timeManager: TimeManager) => {
  const kp = om.sat2kp(sat, timeManager);
  return om.kp2tle(kp, null, timeManager);
};

type StateVector = [number, number, number, number, number, number, number];

om.sv2kp = (sv: StateVector) => {
  const kepler = _sv2kp({ massPrimary: 1, massSecondary: 1, vector: sv, massPrimaryU: 'kg', massSecondaryU: 'M_Earth', vectorU: 'km', outputU: 'km', outputU2: 'm' });
  return kepler;
};
om.kp2tle = (kp, epoch, timeManager: TimeManager) => {
  const inc = kp.inclination;
  const raan = kp.raan;
  const ecc = kp.eccentricity;
  const argpe = kp.argPe;
  const meana = kp.mo;
  const meanmo = 1440 / kp.period;
  epoch = typeof epoch == 'undefined' || epoch == null ? new Date(timeManager.calculateSimulationTime()) : epoch;
  const yy = epoch.getUTCFullYear() - 2000; // This won't work before year 2000, but that shouldn't matter
  const epochd = _dayOfYear(epoch.getUTCMonth(), epoch.getUTCDate(), epoch.getUTCHours(), epoch.getUTCMinutes(), epoch.getUTCSeconds());
  const epochd2 = parseFloat(epochd) + epoch.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  const tle1 = `1 80000U 58001A   ${yy}${_pad0(epochd2.toFixed(8), 12)} 0.00000000 +00000-0 +00000-0 0 99990`;
  const tle2 = `2 80000 ${_pad0(inc.toFixed(4), 8)} ${_pad0(raan.toFixed(4), 8)} ${ecc.toFixed(7).substr(2, 7)} ${_pad0(parseFloat(argpe).toFixed(4), 8)} ${_pad0(
    meana.toFixed(4),
    8
  )} ${_pad0(meanmo.toFixed(8), 11)}000010`;
  return { tle1: tle1, tle2: tle2 };
};
// State Vectors to Keplerian Min/Max/Avg
// prettier-ignore
om.svs2kps = (svs: StateVector[]) => { // NOSONAR
  let kpList = [];
  for (let i = 0; i < svs.length; i++) {
    if (svs[i].length < 3) continue;
    kpList.push(om.sv2kp(svs[i]));
  }

  // Results
  let r = {
    max: {
      apogee: 0,
      argPe: 0,
      eccentricity: 0,
      inclination: 0,
      mo: 0,
      perigee: 0,
      period: 0,
      raan: 0,
      semiMajorAxis: 0,
      ta: 0,
      tl: 0,
    },
    min: {
      apogee: 1000000,
      argPe: 1000000,
      eccentricity: 1000000,
      inclination: 1000000,
      mo: 1000000,
      perigee: 1000000,
      period: 1000000,
      raan: 1000000,
      semiMajorAxis: 1000000,
      ta: 1000000,
      tl: 1000000,
    },
    avg: {
      apogee: 0,
      argPe: 0,
      eccentricity: 0,
      inclination: 0,
      mo: 0,
      perigee: 0,
      period: 0,
      raan: 0,
      semiMajorAxis: 0,
      ta: 0,
      tl: 0,
    },
  };

  // deepcode ignore UnusedIterator: false positive
  for (let i = 0; i < kpList.length; i++) {
    if (kpList[i].apogee < r.min.apogee) r.min.apogee = kpList[i].apogee;
    if (kpList[i].apogee > r.max.apogee) r.max.apogee = kpList[i].apogee;
    r.avg.apogee += kpList[i].apogee;
    if (kpList[i].argPe < r.min.argPe) r.min.argPe = kpList[i].argPe;
    if (kpList[i].argPe > r.max.argPe) r.max.argPe = kpList[i].argPe;
    r.avg.argPe += kpList[i].argPe;
    if (kpList[i].eccentricity < r.min.eccentricity) r.min.eccentricity = kpList[i].eccentricity;
    if (kpList[i].eccentricity > r.max.eccentricity) r.max.eccentricity = kpList[i].eccentricity;
    r.avg.eccentricity += kpList[i].eccentricity;
    if (kpList[i].inclination < r.min.inclination) r.min.inclination = kpList[i].inclination;
    if (kpList[i].inclination > r.max.inclination) r.max.inclination = kpList[i].inclination;
    r.avg.inclination += kpList[i].inclination;
    if (kpList[i].mo < r.min.mo) r.min.mo = kpList[i].mo;
    if (kpList[i].mo > r.max.mo) r.max.mo = kpList[i].mo;
    r.avg.mo += kpList[i].mo;
    if (kpList[i].perigee < r.min.perigee) r.min.perigee = kpList[i].perigee;
    if (kpList[i].perigee > r.max.perigee) r.max.perigee = kpList[i].perigee;
    r.avg.perigee += kpList[i].perigee;
    if (kpList[i].period < r.min.period) r.min.period = kpList[i].period;
    if (kpList[i].period > r.max.period) r.max.period = kpList[i].period;
    r.avg.period += kpList[i].period;
    if (kpList[i].raan < r.min.raan) r.min.raan = kpList[i].raan;
    if (kpList[i].raan > r.max.raan) r.max.raan = kpList[i].raan;
    r.avg.raan += kpList[i].raan;
    if (kpList[i].semiMajorAxis < r.min.semiMajorAxis) r.min.semiMajorAxis = kpList[i].semiMajorAxis;
    if (kpList[i].semiMajorAxis > r.max.semiMajorAxis) r.max.semiMajorAxis = kpList[i].semiMajorAxis;
    r.avg.semiMajorAxis += kpList[i].semiMajorAxis;
    if (kpList[i].ta < r.min.ta) r.min.ta = kpList[i].ta;
    if (kpList[i].ta > r.max.ta) r.max.ta = kpList[i].ta;
    r.avg.ta += kpList[i].ta;
    if (kpList[i].tl < r.min.tl) r.min.tl = kpList[i].tl;
    if (kpList[i].tl > r.max.tl) r.max.tl = kpList[i].tl;
    r.avg.tl += kpList[i].tl;
  }

  r.avg.apogee /= kpList.length;
  r.avg.argPe /= kpList.length;
  r.avg.eccentricity /= kpList.length;
  r.avg.inclination /= kpList.length;
  r.avg.mo /= kpList.length;
  r.avg.perigee /= kpList.length;
  r.avg.period /= kpList.length;
  r.avg.raan /= kpList.length;
  r.avg.semiMajorAxis /= kpList.length;
  r.avg.ta /= kpList.length;
  r.avg.tl /= kpList.length;

  return r;
};
om.iod = async (svs: StateVector[], timeManager: TimeManager, satellite) => {
  try {
    const kps = om.svs2kps(svs);

    // Sort SVs by Time
    svs.sort(function (a, b) {
      return a[0] - b[0];
    });

    // Change Time to Relative to the First Observation
    const epoch = new Date(svs[0][0]);

    return om.fitTles(epoch, svs, kps, timeManager, satellite);
  } catch (e) {
    console.debug(e);
  }
};

// prettier-ignore
om.fitTles = async (epoch, svs: StateVector[], kps, timeManager: TimeManager, satellite) => { // NOSONAR
  try {
    om.debug.closestApproach = 0;
    const STEPS = settingsManager.fitTleSteps;
    const raanI = (kps.max.raan - kps.min.raan) / STEPS;
    const argpeI = (kps.max.argPe - kps.min.argPe) / STEPS;
    const meanaI = (kps.max.mo - kps.min.mo) / STEPS;
    // DEBUG:
    // const incI = (kps.max.inclination - kps.min.inclination) / STEPS;
    // const eccI = (kps.max.eccentricity - kps.min.eccentricity) / STEPS;
    // const periodI = (kps.max.period - kps.min.period) / STEPS;
    let bestIndicies = [10000000]; // Starts Really Large To Ensure First One is Better

    for (let r = -STEPS / 2; r < STEPS / 2; r++) {
      for (let a = -STEPS; a < STEPS; a++) {
        for (let m = -STEPS * 2; m < STEPS * 2; m++) {
          const possibleKp = {
            inclination: kps.avg.inclination,
            raan: kps.avg.raan + raanI * r,
            eccentricity: kps.avg.eccentricity,
            argPe: kps.avg.argPe + argpeI * a,
            mo: kps.avg.mo + (meanaI * m) / 2,
            period: kps.avg.period,
          };
          const tles = om.kp2tle(possibleKp, epoch, timeManager);
          let xError = 0;
          let yError = 0;
          let zError = 0;
          let posErrorAvg = 0;
          for (let svI = 0; svI < svs.length; svI++) {
            let eci;
            try {
              eci = _propagate(tles.tle1, tles.tle2, new Date(epoch + (svs[svI][0] - svs[0][0])), satellite);
              xError += Math.abs(eci.position.x - svs[svI][1]);
              yError += Math.abs(eci.position.y - svs[svI][2]);
              zError += Math.abs(eci.position.z - svs[svI][3]);
              posErrorAvg += Math.sqrt(xError ** 2 + yError ** 2 + zError ** 2);
            } catch (error) {
              // DEBUG:
              // console.warn(eci);
            }
          }
          posErrorAvg /= svs.length;

          // TODO: Better Decision on Best Indicies
          if (posErrorAvg < bestIndicies[0]) {
            bestIndicies = [posErrorAvg, r, a, m];
          }
        }
      }
    }
    // debug
    console.log(`Closest Approach: ${bestIndicies[0]}`);
    om.debug.closestApproach += bestIndicies[0];

    // Calculate Best TLE
    const kp = {
      inclination: kps.avg.inclination,
      raan: kps.avg.raan + raanI * bestIndicies[1],
      eccentricity: kps.avg.eccentricity,
      argPe: kps.avg.argPe + argpeI * bestIndicies[2],
      mo: kps.avg.mo + meanaI * bestIndicies[3],
      period: kps.avg.period,
    };
    return om.kp2tle(kp, epoch);
  } catch (e) {
    console.debug(e);
  }
};
om.svs2analyst = async (svs: StateVector[], satSet: CatalogManager, timeManager: TimeManager, satellite) => {
  om.iod(svs, timeManager, satellite)
    .then((tles) => {
      satSet.insertNewAnalystSatellite(tles.tle1, tles.tle2, satSet.getIdFromObjNum(100500), '100500'); // TODO: Calculate unused analyst satellite and use that Instead
      searchBox.doSearch('100500', true);
    })
    .catch((error) => {
      console.debug(error);
    });
};

om.testIod = (satSet: CatalogManager) => {
  fetch('/metObs.json')
    .then((response) => response.json())
    .then((metObs) => {
      for (let i = 0; i < metObs.length; i++) {
        let svs = metObs[i];
        om.svs2analyst(svs, satSet);
      }
      om.debug.closestApproach /= metObs.length;
      console.log(`Average Approach: ${om.debug.closestApproach}`);
    })
    .catch((error) => {
      console.debug(error);
    });
};

om.debug = {
  closestApproach: 0,
};

export const _propagate = async (tle1: string, tle2: string, epoch: Date, satellite) => {
  try {
    let satrec = satellite.twoline2satrec(tle1, tle2); // perform and store sat init calcs
    let j = _jday(
      epoch.getUTCFullYear(),
      epoch.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
      epoch.getUTCDate(),
      epoch.getUTCHours(),
      epoch.getUTCMinutes(),
      epoch.getUTCSeconds()
    ); // Converts time to jday (TLEs use epoch year/day)
    j += epoch.getUTCMilliseconds() * MILLISECONDS_PER_DAY;

    let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
    let eci = satellite.sgp4(satrec, m);
    return eci;
  } catch (error) {
    // intentionally left blank
  }
};
export const _jday = (year: number, mon: number, day: number, hr: number, minute: number, sec: number): number => {
  'use strict';
  return (
    367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor((275 * mon) / 9.0) + day + 1721013.5 + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0 //  ut in days
  );
};
interface KeplerianOrbit {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  raan: number;
  argPe: number;
  mo: number;
  ta: any;
  tl: any;
  perigee: number;
  apogee: number;
  period: number;
}

// Converts State Vectors to Keplerian Elements
// prettier-ignore
export const _sv2kp = ({
  massPrimary,
  massSecondary,
  vector,
  massPrimaryU,
  massSecondaryU,
  vectorU,
  outputU,
  outputU2,
}: {
  massPrimary?: number;
  massSecondary?: number;
  vector: [number, number, number, number, number, number, number];
  massPrimaryU?: string;
  massSecondaryU?: string;
  vectorU?: string;
  outputU?: string;
  outputU2?: string;
}): KeplerianOrbit => { // NOSONAR
  if (!vector) throw new Error('vector is required');
  if (massPrimary <= 0) throw new Error('massPrimary must be greater than 0');
  if (massSecondary <= 0) throw new Error('massSecondary must be greater than 0');

  vectorU ??= 'km';
  if (vectorU !== 'km' && vectorU !== 'm') throw new Error('vectorU must be either "km" or "m"');
  const vecMultiplier = vectorU === 'km' ? 1 : 1000;
  let rx = vector[1] * vecMultiplier;
  let ry = vector[2] * vecMultiplier;
  let rz = vector[3] * vecMultiplier;
  let vx = vector[4] * vecMultiplier;
  let vy = vector[5] * vecMultiplier;
  let vz = vector[6] * vecMultiplier;

  massSecondaryU ??= 'M_Earth'; // Default is Earth
  if (massSecondaryU === 'M_Earth') {
    massSecondary = massSecondary * 5.97378250603408e24;
  } else {
    throw new Error('M_Earth is the only value currently supported.');
  }

  massPrimaryU ??= 'kg'; // Default is kg
  if (massPrimaryU !== 'kg') {
    throw new Error('kg is the only value currently supported.');
  }

  // Prevent divide by 0 errors
  if (rx === 0) {
    rx = 0.000000000000001;
  }
  if (ry === 0) {
    ry = 0.000000000000001;
  }
  if (rz === 0) {
    rz = 0.000000000000001;
  }
  if (vx === 0) {
    vx = 0.000000000000001;
  }
  if (vy === 0) {
    vy = 0.000000000000001;
  }
  if (vz === 0) {
    vz = 0.000000000000001;
  }

  let mu = G * (massPrimary + massSecondary);

  let r = Math.sqrt(rx * rx + ry * ry + rz * rz);
  let v = Math.sqrt(vx * vx + vy * vy + vz * vz);
  let a = 1 / (2 / r - (v * v) / mu); //  semi-major axis

  let hx = ry * vz - rz * vy;
  let hy = rz * vx - rx * vz;
  let hz = rx * vy - ry * vx;
  let h = Math.sqrt(hx * hx + hy * hy + hz * hz);

  let p = (h * h) / mu;
  let q = rx * vx + ry * vy + rz * vz; // dot product of r*v

  let e = Math.sqrt(1 - p / a); // eccentricity

  let ex = 1 - r / a;
  let ey = q / Math.sqrt(a * mu);

  let i = Math.acos(hz / h);
  let lan = 0;
  if (i != 0) {
    lan = _arctan2(hx, -hy);
  }

  let tax = (h * h) / (r * mu) - 1;
  let tay = (h * q) / (r * mu);
  let ta = _arctan2(tay, tax);
  let cw = (rx * Math.cos(lan) + ry * Math.sin(lan)) / r;

  let sw = 0;
  if (i === 0 || i === PI) {
    sw = (ry * Math.cos(lan) - rx * Math.sin(lan)) / r;
  } else {
    sw = rz / (r * Math.sin(i));
  }

  let w = _arctan2(sw, cw) - ta;
  if (w < 0) {
    w = TAU + w;
  }

  let u = _arctan2(ey, ex); // eccentric anomoly
  let m = u - e * Math.sin(u); // Mean anomoly
  let tl = w + ta + lan; // True longitude

  while (tl >= TAU) {
    tl = tl - TAU;
  }

  const PlusMinus = a * e;
  let periapsis = a - PlusMinus - (vectorU === 'km' ? RADIUS_OF_EARTH / 1000 : RADIUS_OF_EARTH);
  let apoapsis = a + PlusMinus - (vectorU === 'km' ? RADIUS_OF_EARTH / 1000 : RADIUS_OF_EARTH);
  let period = TAU * Math.sqrt((a * a * a) / (G * (massPrimary + massSecondary)));

  outputU ??= 'm';
  // We typically use km
  a = outputU === 'km' ? a / 1000 : a;
  apoapsis = outputU === 'km' ? apoapsis / 1000 : apoapsis;
  periapsis = outputU === 'km' ? periapsis / 1000 : periapsis;

  outputU2 ??= 's';
  period = outputU2 === 'm' ? period / 60 : period;

  // toDegrees
  i = RAD2DEG * i;
  lan = RAD2DEG * lan;
  w = RAD2DEG * w;
  m = RAD2DEG * m;
  ta = RAD2DEG * ta;
  tl = RAD2DEG * tl;

  return {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: i,
    raan: lan,
    argPe: w,
    mo: m,
    ta,
    tl,
    perigee: periapsis,
    apogee: apoapsis,
    period,
  };
};

// Internal Functions
export const _arctan2 = (y: number, x: number): number => {
  let u;
  if (x != 0) {
    u = Math.atan(y / x);
    if (x < 0) u = u + PI;
    if (x > 0 && y < 0) u = u + TAU;
  } else {
    if (y < 0) u = -PI / 2;
    if (y === 0) u = 0;
    if (y > 0) u = PI / 2;
  }
  return u;
};
export const _dayOfYear = (mon: number, day: number, hr: number, minute: number, sec: number) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  (Math.floor((275 * mon) / 9.0) + day + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0) //  ut in days
    .toFixed(5);
export const _pad0 = (str: string, max: number): string => (str?.length < max ? _pad0('0' + str, max) : str);

export const omManager = om;
