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

import { searchBox } from '@app/js/uiManager/searchBox';

// Constants
const RADIUS_OF_EARTH = 6371000; // Radius of Earth in meters
const G = 6.6725985e-11;
const MILLISECONDS_PER_DAY = 1.15741e-8;
const MINUTES_PER_DAY = 1440;
const PI = Math.PI;
const TAU = 2 * PI;
const RAD2DEG = 360 / TAU;

// Make Orbit Math Manager
let om = {};

// Public Functions
om.sat2sv = (sat, timeManager) => [timeManager.simulationTimeObj, sat.position.x, sat.position.y, sat.position.z, sat.velocity.x, sat.velocity.y, sat.velocity.z];
om.sat2kp = (sat, timeManager) => {
  const sv = om.sat2sv(sat, timeManager);
  return om.sv2kp(sv, timeManager);
};
om.sat2tle = (sat, timeManager) => {
  const kp = om.sat2kp(sat, timeManager);
  return om.kp2tle(kp, null, timeManager);
};
om.sv2kp = (sv) => {
  const kepler = _sv2kp({ massPrimary: 1, massSecondary: 1, vector: sv, massPrimaryU: 'kg', massSecondaryU: 'M_Earth', vectorU: [0, 0, 0, 0, 0, 0], outputU: 'km', outputU2: 'm' });
  return kepler;
};
om.kp2tle = (kp, epoch, timeManager) => {
  const inc = kp.inclination;
  const raan = kp.raan;
  const ecc = kp.eccentricity;
  const argpe = kp.argPe;
  const meana = kp.mo;
  const meanmo = 1440 / kp.period;
  epoch = typeof epoch == 'undefined' || epoch == null ? new Date(timeManager.calculateSimulationTime()) : epoch;
  const yy = epoch.getUTCFullYear() - 2000; // This won't work before year 2000, but that shouldn't matter
  let epochd = _dayOfYear(epoch.getUTCMonth(), epoch.getUTCDate(), epoch.getUTCHours(), epoch.getUTCMinutes(), epoch.getUTCSeconds());
  epochd = epochd * 1 + epoch.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  const tle1 = `1 80000U 58001A   ${yy}${_pad0(parseFloat(epochd).toFixed(8), 12)} 0.00000000 +00000-0 +00000-0 0 99990`;
  const tle2 = `2 80000 ${_pad0(inc.toFixed(4), 8)} ${_pad0(raan.toFixed(4), 8)} ${ecc.toPrecision(7).substr(2, 7)} ${_pad0(parseFloat(argpe).toFixed(4), 8)} ${_pad0(
    meana.toFixed(4),
    8
  )} ${_pad0(meanmo.toFixed(8), 11)}000010`;
  return { tle1: tle1, tle2: tle2 };
};
// State Vectors to Keplerian Min/Max/Avg
om.svs2kps = (svs) => { // NOSONAR
  let kpList = [];
  for (let i = 0; i < svs.length; i++) {
    kpList.push(om.sv2kp(svs[i]));
  }

  // Results
  let r = {};
  {
    r.max = {};
    r.max.apogee = 0;
    r.max.argPe = 0;
    r.max.eccentricity = 0;
    r.max.inclination = 0;
    r.max.mo = 0;
    r.max.perigee = 0;
    r.max.period = 0;
    r.max.raan = 0;
    r.max.semiMajorAxis = 0;
    r.max.ta = 0;
    r.max.tl = 0;
    r.min = {};
    r.min.apogee = 1000000;
    r.min.argPe = 1000000;
    r.min.eccentricity = 1000000;
    r.min.inclination = 1000000;
    r.min.mo = 1000000;
    r.min.perigee = 1000000;
    r.min.period = 1000000;
    r.min.raan = 1000000;
    r.min.semiMajorAxis = 1000000;
    r.min.ta = 1000000;
    r.min.tl = 1000000;
    r.avg = {};
    r.avg.apogee = 0;
    r.avg.argPe = 0;
    r.avg.eccentricity = 0;
    r.avg.inclination = 0;
    r.avg.mo = 0;
    r.avg.perigee = 0;
    r.avg.period = 0;
    r.avg.raan = 0;
    r.avg.semiMajorAxis = 0;
    r.avg.ta = 0;
    r.avg.tl = 0;
  }

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
om.iod = async (svs, timeManager, satellite) => {
  try {
    const kps = om.svs2kps(svs);

    // Sort SVs by Time
    svs.sort(function (a, b) {
      return a[0].value - b[0].value;
    });

    // Change Time to Relative to the First Observation
    const epoch = new Date(svs[0][0]);

    return om.fitTles(epoch, svs, kps, timeManager, satellite);
  } catch (e) {
    console.debug(e);
  }
};

om.fitTles = async (epoch, svs, kps, timeManager, satellite) => { // NOSONAR
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
          const possibleKp = {};
          possibleKp.inclination = kps.avg.inclination;
          possibleKp.raan = kps.avg.raan + raanI * r;
          possibleKp.eccentricity = kps.avg.eccentricity;
          possibleKp.argPe = kps.avg.argPe + argpeI * a;
          possibleKp.mo = kps.avg.mo + (meanaI * m) / 2;
          possibleKp.period = kps.avg.period;
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
    let kp = {};
    kp.inclination = kps.avg.inclination;
    kp.raan = kps.avg.raan + raanI * bestIndicies[1];
    kp.eccentricity = kps.avg.eccentricity;
    kp.argPe = kps.avg.argPe + argpeI * bestIndicies[2];
    kp.mo = kps.avg.mo + meanaI * bestIndicies[3];
    kp.period = kps.avg.period;
    return om.kp2tle(kp, epoch);
  } catch (e) {
    console.debug(e);
  }
};
om.svs2analyst = async (svs, satSet, timeManager, satellite) => {
  om.iod(svs, timeManager, satellite)
    .then((tles) => {
      satSet.insertNewAnalystSatellite(tles.tle1, tles.tle2, satSet.getIdFromObjNum(100500), '100500'); // TODO: Calculate unused analyst satellite and use that Instead
      searchBox.doSearch('100500', true);
    })
    .catch((error) => {
      console.debug(error);
    });
};

om.testIod = (satSet) => {
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

om.debug = {};
om.debug.closestApproach = 0;

export const _propagate = async (tle1, tle2, epoch, satellite) => {
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
export const _jday = (year, mon, day, hr, minute, sec) => {
  'use strict';
  return (
    367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor((275 * mon) / 9.0) + day + 1721013.5 + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0 //  ut in days
  );
};
// Converts State Vectors to Keplerian Elements
export const _sv2kp = ({ massPrimary, massSecondary, vector, massPrimaryU, massSecondaryU, vectorU, outputU, outputU2 }) => { // NOSONAR
  let rx = vector[1] * 1000;
  let ry = vector[2] * 1000;
  let rz = vector[3] * 1000;
  let vx = vector[4] * 1000;
  let vy = vector[5] * 1000;
  let vz = vector[6] * 1000;

  if (massSecondaryU === 'M_Earth') {
    massSecondary = massSecondary * 5.97378250603408e24;
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
  let periapsis = a - PlusMinus - RADIUS_OF_EARTH;
  let apoapsis = a + PlusMinus - RADIUS_OF_EARTH;
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
export const _arctan2 = (y, x) => {
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
export const _dayOfYear = (mon, day, hr, minute, sec) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  (Math.floor((275 * mon) / 9.0) + day + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0) //  ut in days
    .toFixed(5);
export const _pad0 = (str, max) => (str?.length < max ? _pad0('0' + str, max) : str);

export const omManager = om;
