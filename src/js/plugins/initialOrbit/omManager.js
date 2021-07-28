/* eslint-disable no-unused-vars */
/* /////////////////////////////////////////////////////////////////////////////

omManager.js Orbit Math Manager handles the conversion of state vector data,
keplerian elements, and two line element sets as well as initial orbit fitting
http://keeptrack.space

Copyright (C) 2016-2021 Theodore Kruczek
Copyright (C) 2020 Heather Kruczek

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

///////////////////////////////////////////////////////////////////////////// */

// sv - State Vectors
// [unixTime, x, y, z, xDot, yDot, zDot]

'use strict';
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
om.sat2sv = (sat, timeManager) => [timeManager.propTime(), sat.position.x, sat.position.y, sat.position.z, sat.velocity.x, sat.velocity.y, sat.velocity.z];
om.sat2kp = (sat, timeManager) => {
  const sv = om.sat2sv(sat, timeManager);
  return om.sv2kp(sv, timeManager);
};
om.sat2tle = (sat, timeManager) => {
  const kp = om.sat2kp(sat, timeManager);
  return om.kp2tle(kp, null, timeManager);
};
om.sv2kp = (sv) => {
  const kepler = _sv2kp(1, 1, sv, 'kg', 'M_Earth', [0, 0, 0, 0, 0, 0], 'km', 'm');
  return kepler;
};
om.kp2tle = (kp, epoch, timeManager) => {
  const inc = kp.inclination;
  const raan = kp.raan;
  const ecc = kp.eccentricity;
  const argpe = kp.argPe;
  const meana = kp.mo;
  const meanmo = 1440 / kp.period;
  epoch = typeof epoch == 'undefined' || epoch == null ? new Date(timeManager.propTime()) : epoch;
  const yy = epoch.getUTCFullYear() - 2000; // This won't work before year 2000, but that shouldn't matter
  let epochd = _dayOfYear(epoch.getUTCMonth(), epoch.getUTCDate(), epoch.getUTCHours(), epoch.getUTCMinutes(), epoch.getUTCSeconds());
  epochd = epochd * 1 + epoch.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  const tle1 = `1 80000U 58001A   ${yy}${_pad0(parseFloat(epochd).toFixed(8), 12)} 0.00000000 +00000-0 +00000-0 0 99990`;
  const tle2 = `2 80000 ${_pad0(inc.toFixed(4), 8)} ${_pad0(raan.toFixed(4), 8)} ${ecc.toPrecision(7).substr(2, 7)} ${_pad0(parseFloat(argpe).toFixed(4), 8)} ${_pad0(meana.toFixed(4), 8)} ${_pad0(meanmo.toFixed(8), 11)}000010`;
  return { tle1: tle1, tle2: tle2 };
};
// State Vectors to Keplerian Min/Max/Avg
om.svs2kps = (svs) => {
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
  const kps = om.svs2kps(svs);

  // Sort SVs by Time
  svs.sort(function (a, b) {
    return a[0].value - b[0].value;
  });

  // Change Time to Relative to the First Observation
  const epoch = new Date(svs[0][0]);

  return om.fitTles(epoch, svs, kps, timeManager, satellite);
};

om.fitTles = async (epoch, svs, kps, timeManager, satellite) => {
  om.debug.closestApproach = 0;
  const STEPS = settingsManager.fitTleSteps;
  // const incI = (kps.max.inclination - kps.min.inclination) / STEPS;
  const raanI = (kps.max.raan - kps.min.raan) / STEPS;
  // const eccI = (kps.max.eccentricity - kps.min.eccentricity) / STEPS;
  const argpeI = (kps.max.argPe - kps.min.argPe) / STEPS;
  const meanaI = (kps.max.mo - kps.min.mo) / STEPS;
  // const periodI = (kps.max.period - kps.min.period) / STEPS;
  let bestIndicies = [10000000]; // Starts Really Large To Ensure First One is Better

  for (let r = -STEPS / 2; r < STEPS / 2; r++) {
    for (let a = -STEPS; a < STEPS; a++) {
      for (let m = -STEPS * 2; m < STEPS * 2; m++) {
        let kp = {};
        kp.inclination = kps.avg.inclination;
        kp.raan = kps.avg.raan + raanI * r;
        kp.eccentricity = kps.avg.eccentricity;
        kp.argPe = kps.avg.argPe + argpeI * a;
        kp.mo = kps.avg.mo + (meanaI * m) / 2;
        kp.period = kps.avg.period;
        const tles = om.kp2tle(kp, epoch, timeManager);
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
            // console.warn(eci);
          }
        }
        posErrorAvg /= svs.length;
        // console.log(posErrorAvg);

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
};
om.svs2analyst = async (svs, satSet, timeManager, satellite) => {
  om.iod(svs, timeManager, satellite).then((tles) => {
    satSet.insertNewAnalystSatellite(tles.tle1, tles.tle2, satSet.getIdFromObjNum(80000));
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
    });
};

om.debug = {};
om.debug.closestApproach = 0;

const _propagate = async (tle1, tle2, epoch, satellite) => {
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
  // let gmst = satellite.gstime(j);

  let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
  let eci = satellite.sgp4(satrec, m);
  return eci;
};
const _jday = (year, mon, day, hr, minute, sec) => {
  'use strict';
  return (
    367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor((275 * mon) / 9.0) + day + 1721013.5 + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0 //  ut in days
  );
};
// Converts State Vectors to Keplerian Elements
const _sv2kp = (massPrimary, massSecondary, vector, massPrimaryU, massSecondaryU, vectorU, outputU, outputU2) => {
  let rx = vector[1] * 1000;
  let ry = vector[2] * 1000;
  let rz = vector[3] * 1000;
  let vx = vector[4] * 1000;
  let vy = vector[5] * 1000;
  let vz = vector[6] * 1000;
  // let rxu,
  //   ryu,
  //   rzu = 'm';
  // let vxu,
  //   vyu,
  //   vzu = 'm/s';

  if (!(massPrimaryU == 'kg' || typeof massPrimaryU == 'undefined')) {
    // if (massPrimaryU == 'g') {
    //   massPrimary = massPrimary / 1000;
    // }
    // if (massPrimaryU == 'M_Sun') {
    //   massPrimary = massPrimary * 1.98894729428839e30;
    // }
    // if (massPrimaryU == 'M_Mercury') {
    //   massPrimary = massPrimary * 3.30192458710471e23;
    // }
    // if (massPrimaryU == 'M_Venus') {
    //   massPrimary = massPrimary * 4.86862144253118e24;
    // }
    // if (massPrimaryU == 'M_Earth') {
    //   massPrimary = massPrimary * 5.97378250603408e24;
    // }
    // if (massPrimaryU == 'M_Mars') {
    //   massPrimary = massPrimary * 6.41863349674674e23;
    // }
    // if (massPrimaryU == 'M_Jupiter') {
    //   massPrimary = massPrimary * 1.89863768365072e27;
    // }
    // if (massPrimaryU == 'M_Saturn') {
    //   massPrimary = massPrimary * 5.68470940139966e26;
    // }
    // if (massPrimaryU == 'M_Uranus') {
    //   massPrimary = massPrimary * 8.68333186484441e25;
    // }
    // if (massPrimaryU == 'M_Neptune') {
    //   massPrimary = massPrimary * 1.02431564713932e26;
    // }
    // if (massPrimaryU == 'M_Pluto') {
    //   massPrimary = massPrimary * 1.30861680530754e22;
    // }
    // if (massPrimaryU == 'M_Moon') {
    //   massPrimary = massPrimary * 7.34777534869879e22;
    // }
    // if (massPrimaryU == 'M_Phobos') {
    //   massPrimary = massPrimary * 1.03409569809204e16;
    // }
    // if (massPrimaryU == 'M_Deimos') {
    //   massPrimary = massPrimary * 1.79842730102965e15;
    // }
    // if (massPrimaryU == 'M_Io') {
    //   massPrimary = massPrimary * 8.9320629865446e22;
    // }
    // if (massPrimaryU == 'M_Europa') {
    //   massPrimary = massPrimary * 4.79990319196655e22;
    // }
    // if (massPrimaryU == 'M_Ganymede') {
    //   massPrimary = massPrimary * 1.48187846087315e23;
    // }
    // if (massPrimaryU == 'M_Callisto') {
    //   massPrimary = massPrimary * 1.07595283170753e23;
    // }
    // if (massPrimaryU == 'M_Amalthea') {
    //   massPrimary = massPrimary * 7.49344708762353e18;
    // }
    // if (massPrimaryU == 'M_Himalia') {
    //   massPrimary = massPrimary * 9.55630662185067e18;
    // }
    // if (massPrimaryU == 'M_Elara') {
    //   massPrimary = massPrimary * 7.76699816441212e17;
    // }
    // if (massPrimaryU == 'M_Pasiphae') {
    //   massPrimary = massPrimary * 1.90926209704339e17;
    // }
    // if (massPrimaryU == 'M_Sinope') {
    //   massPrimary = massPrimary * 7.76699816441212e16;
    // }
    // if (massPrimaryU == 'M_Lysithea') {
    //   massPrimary = massPrimary * 7.76699816441212e16;
    // }
    // if (massPrimaryU == 'M_Carme') {
    //   massPrimary = massPrimary * 9.55630662185067e16;
    // }
    // if (massPrimaryU == 'M_Ananke') {
    //   massPrimary = massPrimary * 3.81852419408679e16;
    // }
    // if (massPrimaryU == 'M_Leda') {
    //   massPrimary = massPrimary * 5.6778056079615e15;
    // }
    // if (massPrimaryU == 'M_Thebe') {
    //   massPrimary = massPrimary * 7.76699816441212e17;
    // }
    // if (massPrimaryU == 'M_Adrastea') {
    //   massPrimary = massPrimary * 1.90926209704339e16;
    // }
    // if (massPrimaryU == 'M_Metis') {
    //   massPrimary = massPrimary * 9.55630662185067e16;
    // }
    // if (massPrimaryU == 'M_Mimas') {
    //   massPrimary = massPrimary * 3.81429321227243e19;
    // }
    // if (massPrimaryU == 'M_Enceladus') {
    //   massPrimary = massPrimary * 1.17050220435577e20;
    // }
    // if (massPrimaryU == 'M_Tethys') {
    //   massPrimary = massPrimary * 6.17639232970985e20;
    // }
    // if (massPrimaryU == 'M_Dione') {
    //   massPrimary = massPrimary * 1.09569832670221e21;
    // }
    // if (massPrimaryU == 'M_Rhea') {
    //   massPrimary = massPrimary * 2.31572188769539e21;
    // }
    // if (massPrimaryU == 'M_Titan') {
    //   massPrimary = massPrimary * 1.34555202850711e23;
    // }
    // if (massPrimaryU == 'M_Hyperion') {
    //   massPrimary = massPrimary * 5.54593618108186e18;
    // }
    // if (massPrimaryU == 'M_Iapetus') {
    //   massPrimary = massPrimary * 1.80652899243564e21;
    // }
    // if (massPrimaryU == 'M_Phoebe') {
    //   massPrimary = massPrimary * 8.28855423929348e18;
    // }
    // if (massPrimaryU == 'M_Janus') {
    //   massPrimary = massPrimary * 1.8972946850153e18;
    // }
    // if (massPrimaryU == 'M_Epimetheus') {
    //   massPrimary = massPrimary * 5.26205381601159e17;
    // }
    // if (massPrimaryU == 'M_Atlas') {
    //   massPrimary = massPrimary * 1.13924780048507e15;
    // }
    // if (massPrimaryU == 'M_Prometheus') {
    //   massPrimary = massPrimary * 1.87289854971031e17;
    // }
    // if (massPrimaryU == 'M_Pandora') {
    //   massPrimary = massPrimary * 1.48445610732647e17;
    // }
    // if (massPrimaryU == 'M_Ariel') {
    //   massPrimary = massPrimary * 1.29013922898875e21;
    // }
    // if (massPrimaryU == 'M_Umbriel') {
    //   massPrimary = massPrimary * 1.25880780428295e21;
    // }
    // if (massPrimaryU == 'M_Titania') {
    //   massPrimary = massPrimary * 3.4460391356142e21;
    // }
    // if (massPrimaryU == 'M_Oberon') {
    //   massPrimary = massPrimary * 2.99680258484984e21;
    // }
    // if (massPrimaryU == 'M_Miranda') {
    //   massPrimary = massPrimary * 6.51349484606072e19;
    // }
    // if (massPrimaryU == 'M_Triton') {
    //   massPrimary = massPrimary * 2.13993058500051e22;
    // }
    // if (massPrimaryU == 'M_Charon') {
    //   massPrimary = massPrimary * 1.62268483858135e21;
    // }
    // if (massPrimaryU == 'M_Ceres') {
    //   massPrimary = massPrimary * 8.70013290062687e20;
    // }
    // if (massPrimaryU == 'M_Pallas') {
    //   massPrimary = massPrimary * 3.1800485774705e20;
    // }
    // if (massPrimaryU == 'M_Vesta') {
    //   massPrimary = massPrimary * 3.00004582780236e20;
    // }
  }
  if (!(massSecondaryU == 'kg' || typeof massSecondaryU == 'undefined')) {
    // if (massSecondaryU == 'g') {
    //   massSecondary = massSecondary / 1000;
    // }
    // if (massSecondaryU == 'M_Sun') {
    //   massSecondary = massSecondary * 1.98894729428839e30;
    // }
    // if (massSecondaryU == 'M_Mercury') {
    //   massSecondary = massSecondary * 3.30192458710471e23;
    // }
    // if (massSecondaryU == 'M_Venus') {
    //   massSecondary = massSecondary * 4.86862144253118e24;
    // }
    if (massSecondaryU == 'M_Earth') {
      massSecondary = massSecondary * 5.97378250603408e24;
    }
    // if (massSecondaryU == 'M_Mars') {
    //   massSecondary = massSecondary * 6.41863349674674e23;
    // }
    // if (massSecondaryU == 'M_Jupiter') {
    //   massSecondary = massSecondary * 1.89863768365072e27;
    // }
    // if (massSecondaryU == 'M_Saturn') {
    //   massSecondary = massSecondary * 5.68470940139966e26;
    // }
    // if (massSecondaryU == 'M_Uranus') {
    //   massSecondary = massSecondary * 8.68333186484441e25;
    // }
    // if (massSecondaryU == 'M_Neptune') {
    //   massSecondary = massSecondary * 1.02431564713932e26;
    // }
    // if (massSecondaryU == 'M_Pluto') {
    //   massSecondary = massSecondary * 1.30861680530754e22;
    // }
    // if (massSecondaryU == 'M_Moon') {
    //   massSecondary = massSecondary * 7.34777534869879e22;
    // }
    // if (massSecondaryU == 'M_Phobos') {
    //   massSecondary = massSecondary * 1.03409569809204e16;
    // }
    // if (massSecondaryU == 'M_Deimos') {
    //   massSecondary = massSecondary * 1.79842730102965e15;
    // }
    // if (massSecondaryU == 'M_Io') {
    //   massSecondary = massSecondary * 8.9320629865446e22;
    // }
    // if (massSecondaryU == 'M_Europa') {
    //   massSecondary = massSecondary * 4.79990319196655e22;
    // }
    // if (massSecondaryU == 'M_Ganymede') {
    //   massSecondary = massSecondary * 1.48187846087315e23;
    // }
    // if (massSecondaryU == 'M_Callisto') {
    //   massSecondary = massSecondary * 1.07595283170753e23;
    // }
    // if (massSecondaryU == 'M_Amalthea') {
    //   massSecondary = massSecondary * 7.49344708762353e18;
    // }
    // if (massSecondaryU == 'M_Himalia') {
    //   massSecondary = massSecondary * 9.55630662185067e18;
    // }
    // if (massSecondaryU == 'M_Elara') {
    //   massSecondary = massSecondary * 7.76699816441212e17;
    // }
    // if (massSecondaryU == 'M_Pasiphae') {
    //   massSecondary = massSecondary * 1.90926209704339e17;
    // }
    // if (massSecondaryU == 'M_Sinope') {
    //   massSecondary = massSecondary * 7.76699816441212e16;
    // }
    // if (massSecondaryU == 'M_Lysithea') {
    //   massSecondary = massSecondary * 7.76699816441212e16;
    // }
    // if (massSecondaryU == 'M_Carme') {
    //   massSecondary = massSecondary * 9.55630662185067e16;
    // }
    // if (massSecondaryU == 'M_Ananke') {
    //   massSecondary = massSecondary * 3.81852419408679e16;
    // }
    // if (massSecondaryU == 'M_Leda') {
    //   massSecondary = massSecondary * 5.6778056079615e15;
    // }
    // if (massSecondaryU == 'M_Thebe') {
    //   massSecondary = massSecondary * 7.76699816441212e17;
    // }
    // if (massSecondaryU == 'M_Adrastea') {
    //   massSecondary = massSecondary * 1.90926209704339e16;
    // }
    // if (massSecondaryU == 'M_Metis') {
    //   massSecondary = massSecondary * 9.55630662185067e16;
    // }
    // if (massSecondaryU == 'M_Mimas') {
    //   massSecondary = massSecondary * 3.81429321227243e19;
    // }
    // if (massSecondaryU == 'M_Enceladus') {
    //   massSecondary = massSecondary * 1.17050220435577e20;
    // }
    // if (massSecondaryU == 'M_Tethys') {
    //   massSecondary = massSecondary * 6.17639232970985e20;
    // }
    // if (massSecondaryU == 'M_Dione') {
    //   massSecondary = massSecondary * 1.09569832670221e21;
    // }
    // if (massSecondaryU == 'M_Rhea') {
    //   massSecondary = massSecondary * 2.31572188769539e21;
    // }
    // if (massSecondaryU == 'M_Titan') {
    //   massSecondary = massSecondary * 1.34555202850711e23;
    // }
    // if (massSecondaryU == 'M_Hyperion') {
    //   massSecondary = massSecondary * 5.54593618108186e18;
    // }
    // if (massSecondaryU == 'M_Iapetus') {
    //   massSecondary = massSecondary * 1.80652899243564e21;
    // }
    // if (massSecondaryU == 'M_Phoebe') {
    //   massSecondary = massSecondary * 8.28855423929348e18;
    // }
    // if (massSecondaryU == 'M_Janus') {
    //   massSecondary = massSecondary * 1.8972946850153e18;
    // }
    // if (massSecondaryU == 'M_Epimetheus') {
    //   massSecondary = massSecondary * 5.26205381601159e17;
    // }
    // if (massSecondaryU == 'M_Atlas') {
    //   massSecondary = massSecondary * 1.13924780048507e15;
    // }
    // if (massSecondaryU == 'M_Prometheus') {
    //   massSecondary = massSecondary * 1.87289854971031e17;
    // }
    // if (massSecondaryU == 'M_Pandora') {
    //   massSecondary = massSecondary * 1.48445610732647e17;
    // }
    // if (massSecondaryU == 'M_Ariel') {
    //   massSecondary = massSecondary * 1.29013922898875e21;
    // }
    // if (massSecondaryU == 'M_Umbriel') {
    //   massSecondary = massSecondary * 1.25880780428295e21;
    // }
    // if (massSecondaryU == 'M_Titania') {
    //   massSecondary = massSecondary * 3.4460391356142e21;
    // }
    // if (massSecondaryU == 'M_Oberon') {
    //   massSecondary = massSecondary * 2.99680258484984e21;
    // }
    // if (massSecondaryU == 'M_Miranda') {
    //   massSecondary = massSecondary * 6.51349484606072e19;
    // }
    // if (massSecondaryU == 'M_Triton') {
    //   massSecondary = massSecondary * 2.13993058500051e22;
    // }
    // if (massSecondaryU == 'M_Charon') {
    //   massSecondary = massSecondary * 1.62268483858135e21;
    // }
    // if (massSecondaryU == 'M_Ceres') {
    //   massSecondary = massSecondary * 8.70013290062687e20;
    // }
    // if (massSecondaryU == 'M_Pallas') {
    //   massSecondary = massSecondary * 3.1800485774705e20;
    // }
    // if (massSecondaryU == 'M_Vesta') {
    //   massSecondary = massSecondary * 3.00004582780236e20;
    // }
  }

  if (typeof vectorU != 'undefined') {
    // rxu = vectorU[0];
    // ryu = vectorU[1];
    // rzu = vectorU[2];
    // vxu = vectorU[3];
    // vyu = vectorU[4];
    // vzu = vectorU[5];
    // if (rxu == 'cm') {
    //   rx = rx / 100;
    // }
    // if (rxu == 'km') {
    //   rx = rx * 1000;
    // }
    // if (rxu == 'AU') {
    //   rx = rx * 149597870691;
    // }
    // if (rxu == 'LY') {
    //   rx = rx * 9.4605e15;
    // }
    // if (rxu == 'PC') {
    //   rx = rx * 3.0857e16;
    // }
    // if (rxu == 'mi') {
    //   rx = rx * 1609.344;
    // }
    // if (rxu == 'ft') {
    //   rx = rx * 0.3048;
    // }
    // if (ryu == 'cm') {
    //   ry = ry / 100;
    // }
    // if (ryu == 'km') {
    //   ry = ry * 1000;
    // }
    // if (ryu == 'AU') {
    //   ry = ry * 149597870691;
    // }
    // if (ryu == 'LY') {
    //   ry = ry * 9.4605e15;
    // }
    // if (ryu == 'PC') {
    //   ry = ry * 3.0857e16;
    // }
    // if (ryu == 'mi') {
    //   ry = ry * 1609.344;
    // }
    // if (ryu == 'ft') {
    //   ry = ry * 0.3048;
    // }
    // if (rzu == 'cm') {
    //   rz = rz / 100;
    // }
    // if (rzu == 'km') {
    //   rz = rz * 1000;
    // }
    // if (rzu == 'AU') {
    //   rz = rz * 149597870691;
    // }
    // if (rzu == 'LY') {
    //   rz = rz * 9.4605e15;
    // }
    // if (rzu == 'PC') {
    //   rz = rz * 3.0857e16;
    // }
    // if (rzu == 'mi') {
    //   rz = rz * 1609.344;
    // }
    // if (rzu == 'ft') {
    //   rz = rz * 0.3048;
    // }
    // if (vxu == 'km/s') {
    //   vx = vx * 1000;
    // }
    // if (vyu == 'km/s') {
    //   vy = vy * 1000;
    // }
    // if (vzu == 'km/s') {
    //   vz = vz * 1000;
    // }
  }

  // Prevent divide by 0 errors
  if (rx == 0) {
    rx = 0.000000000000001;
  }
  if (ry == 0) {
    ry = 0.000000000000001;
  }
  if (rz == 0) {
    rz = 0.000000000000001;
  }
  if (vx == 0) {
    vx = 0.000000000000001;
  }
  if (vy == 0) {
    vy = 0.000000000000001;
  }
  if (vz == 0) {
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
  if (i == 0 || i == PI) {
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

  if (typeof outputU == 'undefined') {
    outputU = 'm';
  } else {
    // if (outputU == 'cm') {
    //   a = a * 100;
    // }
    if (outputU == 'km') {
      a = a / 1000;
    }
    // if (outputU == 'AU') {
    //   a = a / 149597870691;
    // }
    // if (outputU == 'LY') {
    //   a = a / 9.4605e15;
    // }
    // if (outputU == 'PC') {
    //   a = a / 3.0857e16;
    // }
    // if (outputU == 'mi') {
    //   a = a / 1609.344;
    // }
    // if (outputU == 'ft') {
    //   a = a / 0.3048;
    // }

    // if (outputU == 'cm') {
    //   periapsis = periapsis * 100;
    // }
    // if (outputU == 'km') {
    //   periapsis = periapsis / 1000;
    // }
    // if (outputU == 'AU') {
    //   periapsis = periapsis / 149597870691;
    // }
    // if (outputU == 'LY') {
    //   periapsis = periapsis / 9.4605e15;
    // }
    // if (outputU == 'PC') {
    //   periapsis = periapsis / 3.0857e16;
    // }
    // if (outputU == 'mi') {
    //   periapsis = periapsis / 1609.344;
    // }
    // if (outputU == 'ft') {
    //   periapsis = periapsis / 0.3048;
    // }

    // if (outputU == 'cm') {
    //   apoapsis = apoapsis * 100;
    // }
    if (outputU == 'km') {
      apoapsis = apoapsis / 1000;
    }
    // if (outputU == 'AU') {
    //   apoapsis = apoapsis / 149597870691;
    // }
    // if (outputU == 'LY') {
    //   apoapsis = apoapsis / 9.4605e15;
    // }
    // if (outputU == 'PC') {
    //   apoapsis = apoapsis / 3.0857e16;
    // }
    // if (outputU == 'mi') {
    //   apoapsis = apoapsis / 1609.344;
    // }
    // if (outputU == 'ft') {
    //   apoapsis = apoapsis / 0.3048;
    // }
  }

  if (typeof outputU2 == 'undefined') {
    outputU2 = 's';
  } else {
    if (outputU2 == 'm') {
      period = period / 60;
    }
    // if (outputU2 == 'h') {
    //   period = period / 3600;
    // }
    // if (outputU2 == 'd') {
    //   period = period / 86400;
    // }
    // if (outputU2 == 'yr') {
    //   period = period / 3.15581e7;
    // }
    // if (outputU2 == 'Ky') {
    //   period = period / 3.15581e10;
    // }
    // if (outputU2 == 'My') {
    //   period = period / 3.15581e13;
    // }
    // if (outputU2 == 'By') {
    //   period = period / 3.15581e16;
    // }
  }

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
    ta: ta,
    tl: tl,
    perigee: periapsis,
    apogee: apoapsis,
    period: period,
  };
};
// Converts Keplerian Elements to State Vectors
/*
  const _kp2sv = (a, ec, i, w0, o0, m0, massPrimary, massSecondary, massPrimaryU, massSecondaryU, aU, vectorU) => {
    let rxu,
      ryu,
      rzu = 'm';
    let vxu,
      vyu,
      vzu = 'm/s';

    i = DEG2RAD * i;
    w0 = DEG2RAD * w0;
    o0 = DEG2RAD * o0;
    m0 = DEG2RAD * m0;

    if (typeof aU == 'undefined') {
      aU = 'm';
    } else {
      if (aU == 'cm') {
        a = a / 100;
      }
      if (aU == 'km') {
        a = a * 1000;
      }
      if (aU == 'AU') {
        a = a * 149597870691;
      }
      if (aU == 'LY') {
        a = a * 9.4605e15;
      }
      if (aU == 'PC') {
        a = a * 3.0857e16;
      }
      if (aU == 'mi') {
        a = a * 1609.344;
      }
      if (aU == 'ft') {
        a = a * 0.3048;
      }
    }

    if (!(massPrimaryU == 'kg' || typeof massPrimaryU == 'undefined')) {
      if (massPrimaryU == 'g') {
        massPrimary = massPrimary / 1000;
      }
      if (massPrimaryU == 'M_Sun') {
        massPrimary = massPrimary * 1.98894729428839e30;
      }
      if (massPrimaryU == 'M_Mercury') {
        massPrimary = massPrimary * 3.30192458710471e23;
      }
      if (massPrimaryU == 'M_Venus') {
        massPrimary = massPrimary * 4.86862144253118e24;
      }
      if (massPrimaryU == 'M_Earth') {
        massPrimary = massPrimary * 5.97378250603408e24;
      }
      if (massPrimaryU == 'M_Mars') {
        massPrimary = massPrimary * 6.41863349674674e23;
      }
      if (massPrimaryU == 'M_Jupiter') {
        massPrimary = massPrimary * 1.89863768365072e27;
      }
      if (massPrimaryU == 'M_Saturn') {
        massPrimary = massPrimary * 5.68470940139966e26;
      }
      if (massPrimaryU == 'M_Uranus') {
        massPrimary = massPrimary * 8.68333186484441e25;
      }
      if (massPrimaryU == 'M_Neptune') {
        massPrimary = massPrimary * 1.02431564713932e26;
      }
      if (massPrimaryU == 'M_Pluto') {
        massPrimary = massPrimary * 1.30861680530754e22;
      }
      if (massPrimaryU == 'M_Moon') {
        massPrimary = massPrimary * 7.34777534869879e22;
      }
      if (massPrimaryU == 'M_Phobos') {
        massPrimary = massPrimary * 1.03409569809204e16;
      }
      if (massPrimaryU == 'M_Deimos') {
        massPrimary = massPrimary * 1.79842730102965e15;
      }
      if (massPrimaryU == 'M_Io') {
        massPrimary = massPrimary * 8.9320629865446e22;
      }
      if (massPrimaryU == 'M_Europa') {
        massPrimary = massPrimary * 4.79990319196655e22;
      }
      if (massPrimaryU == 'M_Ganymede') {
        massPrimary = massPrimary * 1.48187846087315e23;
      }
      if (massPrimaryU == 'M_Callisto') {
        massPrimary = massPrimary * 1.07595283170753e23;
      }
      if (massPrimaryU == 'M_Amalthea') {
        massPrimary = massPrimary * 7.49344708762353e18;
      }
      if (massPrimaryU == 'M_Himalia') {
        massPrimary = massPrimary * 9.55630662185067e18;
      }
      if (massPrimaryU == 'M_Elara') {
        massPrimary = massPrimary * 7.76699816441212e17;
      }
      if (massPrimaryU == 'M_Pasiphae') {
        massPrimary = massPrimary * 1.90926209704339e17;
      }
      if (massPrimaryU == 'M_Sinope') {
        massPrimary = massPrimary * 7.76699816441212e16;
      }
      if (massPrimaryU == 'M_Lysithea') {
        massPrimary = massPrimary * 7.76699816441212e16;
      }
      if (massPrimaryU == 'M_Carme') {
        massPrimary = massPrimary * 9.55630662185067e16;
      }
      if (massPrimaryU == 'M_Ananke') {
        massPrimary = massPrimary * 3.81852419408679e16;
      }
      if (massPrimaryU == 'M_Leda') {
        massPrimary = massPrimary * 5.6778056079615e15;
      }
      if (massPrimaryU == 'M_Thebe') {
        massPrimary = massPrimary * 7.76699816441212e17;
      }
      if (massPrimaryU == 'M_Adrastea') {
        massPrimary = massPrimary * 1.90926209704339e16;
      }
      if (massPrimaryU == 'M_Metis') {
        massPrimary = massPrimary * 9.55630662185067e16;
      }
      if (massPrimaryU == 'M_Mimas') {
        massPrimary = massPrimary * 3.81429321227243e19;
      }
      if (massPrimaryU == 'M_Enceladus') {
        massPrimary = massPrimary * 1.17050220435577e20;
      }
      if (massPrimaryU == 'M_Tethys') {
        massPrimary = massPrimary * 6.17639232970985e20;
      }
      if (massPrimaryU == 'M_Dione') {
        massPrimary = massPrimary * 1.09569832670221e21;
      }
      if (massPrimaryU == 'M_Rhea') {
        massPrimary = massPrimary * 2.31572188769539e21;
      }
      if (massPrimaryU == 'M_Titan') {
        massPrimary = massPrimary * 1.34555202850711e23;
      }
      if (massPrimaryU == 'M_Hyperion') {
        massPrimary = massPrimary * 5.54593618108186e18;
      }
      if (massPrimaryU == 'M_Iapetus') {
        massPrimary = massPrimary * 1.80652899243564e21;
      }
      if (massPrimaryU == 'M_Phoebe') {
        massPrimary = massPrimary * 8.28855423929348e18;
      }
      if (massPrimaryU == 'M_Janus') {
        massPrimary = massPrimary * 1.8972946850153e18;
      }
      if (massPrimaryU == 'M_Epimetheus') {
        massPrimary = massPrimary * 5.26205381601159e17;
      }
      if (massPrimaryU == 'M_Atlas') {
        massPrimary = massPrimary * 1.13924780048507e15;
      }
      if (massPrimaryU == 'M_Prometheus') {
        massPrimary = massPrimary * 1.87289854971031e17;
      }
      if (massPrimaryU == 'M_Pandora') {
        massPrimary = massPrimary * 1.48445610732647e17;
      }
      if (massPrimaryU == 'M_Ariel') {
        massPrimary = massPrimary * 1.29013922898875e21;
      }
      if (massPrimaryU == 'M_Umbriel') {
        massPrimary = massPrimary * 1.25880780428295e21;
      }
      if (massPrimaryU == 'M_Titania') {
        massPrimary = massPrimary * 3.4460391356142e21;
      }
      if (massPrimaryU == 'M_Oberon') {
        massPrimary = massPrimary * 2.99680258484984e21;
      }
      if (massPrimaryU == 'M_Miranda') {
        massPrimary = massPrimary * 6.51349484606072e19;
      }
      if (massPrimaryU == 'M_Triton') {
        massPrimary = massPrimary * 2.13993058500051e22;
      }
      if (massPrimaryU == 'M_Charon') {
        massPrimary = massPrimary * 1.62268483858135e21;
      }
      if (massPrimaryU == 'M_Ceres') {
        massPrimary = massPrimary * 8.70013290062687e20;
      }
      if (massPrimaryU == 'M_Pallas') {
        massPrimary = massPrimary * 3.1800485774705e20;
      }
      if (massPrimaryU == 'M_Vesta') {
        massPrimary = massPrimary * 3.00004582780236e20;
      }
    }
    if (!(massSecondaryU == 'kg' || typeof massSecondaryU == 'undefined')) {
      if (massSecondaryU == 'g') {
        massSecondary = massSecondary / 1000;
      }
      if (massSecondaryU == 'M_Sun') {
        massSecondary = massSecondary * 1.98894729428839e30;
      }
      if (massSecondaryU == 'M_Mercury') {
        massSecondary = massSecondary * 3.30192458710471e23;
      }
      if (massSecondaryU == 'M_Venus') {
        massSecondary = massSecondary * 4.86862144253118e24;
      }
      if (massSecondaryU == 'M_Earth') {
        massSecondary = massSecondary * 5.97378250603408e24;
      }
      if (massSecondaryU == 'M_Mars') {
        massSecondary = massSecondary * 6.41863349674674e23;
      }
      if (massSecondaryU == 'M_Jupiter') {
        massSecondary = massSecondary * 1.89863768365072e27;
      }
      if (massSecondaryU == 'M_Saturn') {
        massSecondary = massSecondary * 5.68470940139966e26;
      }
      if (massSecondaryU == 'M_Uranus') {
        massSecondary = massSecondary * 8.68333186484441e25;
      }
      if (massSecondaryU == 'M_Neptune') {
        massSecondary = massSecondary * 1.02431564713932e26;
      }
      if (massSecondaryU == 'M_Pluto') {
        massSecondary = massSecondary * 1.30861680530754e22;
      }
      if (massSecondaryU == 'M_Moon') {
        massSecondary = massSecondary * 7.34777534869879e22;
      }
      if (massSecondaryU == 'M_Phobos') {
        massSecondary = massSecondary * 1.03409569809204e16;
      }
      if (massSecondaryU == 'M_Deimos') {
        massSecondary = massSecondary * 1.79842730102965e15;
      }
      if (massSecondaryU == 'M_Io') {
        massSecondary = massSecondary * 8.9320629865446e22;
      }
      if (massSecondaryU == 'M_Europa') {
        massSecondary = massSecondary * 4.79990319196655e22;
      }
      if (massSecondaryU == 'M_Ganymede') {
        massSecondary = massSecondary * 1.48187846087315e23;
      }
      if (massSecondaryU == 'M_Callisto') {
        massSecondary = massSecondary * 1.07595283170753e23;
      }
      if (massSecondaryU == 'M_Amalthea') {
        massSecondary = massSecondary * 7.49344708762353e18;
      }
      if (massSecondaryU == 'M_Himalia') {
        massSecondary = massSecondary * 9.55630662185067e18;
      }
      if (massSecondaryU == 'M_Elara') {
        massSecondary = massSecondary * 7.76699816441212e17;
      }
      if (massSecondaryU == 'M_Pasiphae') {
        massSecondary = massSecondary * 1.90926209704339e17;
      }
      if (massSecondaryU == 'M_Sinope') {
        massSecondary = massSecondary * 7.76699816441212e16;
      }
      if (massSecondaryU == 'M_Lysithea') {
        massSecondary = massSecondary * 7.76699816441212e16;
      }
      if (massSecondaryU == 'M_Carme') {
        massSecondary = massSecondary * 9.55630662185067e16;
      }
      if (massSecondaryU == 'M_Ananke') {
        massSecondary = massSecondary * 3.81852419408679e16;
      }
      if (massSecondaryU == 'M_Leda') {
        massSecondary = massSecondary * 5.6778056079615e15;
      }
      if (massSecondaryU == 'M_Thebe') {
        massSecondary = massSecondary * 7.76699816441212e17;
      }
      if (massSecondaryU == 'M_Adrastea') {
        massSecondary = massSecondary * 1.90926209704339e16;
      }
      if (massSecondaryU == 'M_Metis') {
        massSecondary = massSecondary * 9.55630662185067e16;
      }
      if (massSecondaryU == 'M_Mimas') {
        massSecondary = massSecondary * 3.81429321227243e19;
      }
      if (massSecondaryU == 'M_Enceladus') {
        massSecondary = massSecondary * 1.17050220435577e20;
      }
      if (massSecondaryU == 'M_Tethys') {
        massSecondary = massSecondary * 6.17639232970985e20;
      }
      if (massSecondaryU == 'M_Dione') {
        massSecondary = massSecondary * 1.09569832670221e21;
      }
      if (massSecondaryU == 'M_Rhea') {
        massSecondary = massSecondary * 2.31572188769539e21;
      }
      if (massSecondaryU == 'M_Titan') {
        massSecondary = massSecondary * 1.34555202850711e23;
      }
      if (massSecondaryU == 'M_Hyperion') {
        massSecondary = massSecondary * 5.54593618108186e18;
      }
      if (massSecondaryU == 'M_Iapetus') {
        massSecondary = massSecondary * 1.80652899243564e21;
      }
      if (massSecondaryU == 'M_Phoebe') {
        massSecondary = massSecondary * 8.28855423929348e18;
      }
      if (massSecondaryU == 'M_Janus') {
        massSecondary = massSecondary * 1.8972946850153e18;
      }
      if (massSecondaryU == 'M_Epimetheus') {
        massSecondary = massSecondary * 5.26205381601159e17;
      }
      if (massSecondaryU == 'M_Atlas') {
        massSecondary = massSecondary * 1.13924780048507e15;
      }
      if (massSecondaryU == 'M_Prometheus') {
        massSecondary = massSecondary * 1.87289854971031e17;
      }
      if (massSecondaryU == 'M_Pandora') {
        massSecondary = massSecondary * 1.48445610732647e17;
      }
      if (massSecondaryU == 'M_Ariel') {
        massSecondary = massSecondary * 1.29013922898875e21;
      }
      if (massSecondaryU == 'M_Umbriel') {
        massSecondary = massSecondary * 1.25880780428295e21;
      }
      if (massSecondaryU == 'M_Titania') {
        massSecondary = massSecondary * 3.4460391356142e21;
      }
      if (massSecondaryU == 'M_Oberon') {
        massSecondary = massSecondary * 2.99680258484984e21;
      }
      if (massSecondaryU == 'M_Miranda') {
        massSecondary = massSecondary * 6.51349484606072e19;
      }
      if (massSecondaryU == 'M_Triton') {
        massSecondary = massSecondary * 2.13993058500051e22;
      }
      if (massSecondaryU == 'M_Charon') {
        massSecondary = massSecondary * 1.62268483858135e21;
      }
      if (massSecondaryU == 'M_Ceres') {
        massSecondary = massSecondary * 8.70013290062687e20;
      }
      if (massSecondaryU == 'M_Pallas') {
        massSecondary = massSecondary * 3.1800485774705e20;
      }
      if (massSecondaryU == 'M_Vesta') {
        massSecondary = massSecondary * 3.00004582780236e20;
      }
    }

    let mass = massPrimary + massSecondary;

    let eca = m0 + ec / 2;
    let diff = 10000;
    let eps = 0.000001;
    let e1 = 0;

    while (diff > eps) {
      e1 = eca - (eca - ec * Math.sin(eca) - m0) / (1 - ec * Math.cos(eca));
      diff = Math.abs(e1 - eca);
      eca = e1;
    }

    let ceca = Math.cos(eca);
    let seca = Math.sin(eca);
    e1 = a * Math.sqrt(Math.abs(1 - ec * ec));
    let xw = a * (ceca - ec);
    let yw = e1 * seca;

    let edot = Math.sqrt((G * mass) / a) / (a * (1 - ec * ceca));
    let xdw = -a * edot * seca;
    let ydw = e1 * edot * ceca;

    let cw = Math.cos(w0);
    let sw = Math.sin(w0);
    let co = Math.cos(o0);
    let so = Math.sin(o0);
    let ci = Math.cos(i);
    let si = Math.sin(i);
    let swci = sw * ci;
    let cwci = cw * ci;
    let pX = cw * co - so * swci;
    let pY = cw * so + co * swci;
    let pZ = sw * si;
    let qx = -sw * co - so * cwci;
    let qy = -sw * so + co * cwci;
    let qz = cw * si;
    rx = xw * pX + yw * qx;
    ry = xw * pY + yw * qy;
    rz = xw * pZ + yw * qz;
    vx = xdw * pX + ydw * qx;
    vy = xdw * pY + ydw * qy;
    vz = xdw * pZ + ydw * qz;

    if (typeof vectorU != 'undefined') {
      rxu = vectorU[0];
      ryu = vectorU[1];
      rzu = vectorU[2];
      vxu = vectorU[3];
      vyu = vectorU[4];
      vzu = vectorU[5];
      if (rxu == 'cm') {
        rx = rx * 100;
      }
      if (rxu == 'km') {
        rx = rx / 1000;
      }
      if (rxu == 'AU') {
        rx = rx / 149597870691;
      }
      if (rxu == 'LY') {
        rx = rx / 9.4605e15;
      }
      if (rxu == 'PC') {
        rx = rx / 3.0857e16;
      }
      if (rxu == 'mi') {
        rx = rx / 1609.344;
      }
      if (rxu == 'ft') {
        rx = rx / 0.3048;
      }

      if (ryu == 'cm') {
        ry = ry * 100;
      }
      if (ryu == 'km') {
        ry = ry / 1000;
      }
      if (ryu == 'AU') {
        ry = ry / 149597870691;
      }
      if (ryu == 'LY') {
        ry = ry / 9.4605e15;
      }
      if (ryu == 'PC') {
        ry = ry / 3.0857e16;
      }
      if (ryu == 'mi') {
        ry = ry / 1609.344;
      }
      if (ryu == 'ft') {
        ry = ry / 0.3048;
      }

      if (rzu == 'cm') {
        rz = rz * 100;
      }
      if (rzu == 'km') {
        rz = rz / 1000;
      }
      if (rzu == 'AU') {
        rz = rz / 149597870691;
      }
      if (rzu == 'LY') {
        rz = rz / 9.4605e15;
      }
      if (rzu == 'PC') {
        rz = rz / 3.0857e16;
      }
      if (rzu == 'mi') {
        rz = rz / 1609.344;
      }
      if (rzu == 'ft') {
        rz = rz / 0.3048;
      }

      if (vxu == 'km/s') {
        vx = vx / 1000;
      }
      if (vyu == 'km/s') {
        vy = vy / 1000;
      }
      if (vzu == 'km/s') {
        vz = vz / 1000;
      }
    }

    return {
      position: {
        x: rx,
        y: ry,
        z: rz,
      },
      velocityX: vx,
      velocityY: vy,
      velocityZ: vz,
    };
  };
  */

// Internal Functions
const _arctan2 = (y, x) => {
  let u;
  if (x != 0) {
    u = Math.atan(y / x);
    if (x < 0) u = u + PI;
    if (x > 0 && y < 0) u = u + TAU;
  } else {
    if (y < 0) u = -PI / 2;
    if (y == 0) u = 0;
    if (y > 0) u = PI / 2;
  }
  return u;
};
const _dayOfYear = (mon, day, hr, minute, sec) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  (Math.floor((275 * mon) / 9.0) + day + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0) //  ut in days
    .toFixed(5);
const _pad0 = (str, max) => (str.length < max ? _pad0('0' + str, max) : str);

const omManager = om;
export { omManager };
