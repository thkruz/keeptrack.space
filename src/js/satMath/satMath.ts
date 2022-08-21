/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * satMath.ts an expansion library for the Orbital Object Toolkit (OOTK)
 * providing tailored functions for calculating orbital data.
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

import { DEG2RAD, RAD2DEG } from '@app/js/lib/constants';
import { getEl } from '@app/js/lib/helpers';
import { calcSatrec } from '@app/js/satSet/catalogSupport/calcSatrec';
import $ from 'jquery';
import numeric from 'numeric';
import { EciVec3, Sgp4 } from 'ootk';
import { keepTrackApi } from '../api/keepTrackApi';
import { SatObject, SensorObject, TearrData } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { calculateLookAngles } from './calc/calculateLookAngles';
import { calculateSensorPos } from './calc/calculateSensorPos';
import { calculateTimeVariables } from './calc/calculateTimeVariables';
import { currentEpoch } from './calc/currentEpoch';
import { distance } from './calc/distance';
import { getAlt } from './calc/getAlt';
import { getAngleBetweenTwoSatellites } from './calc/getAngleBetweenTwoSatellites';
import { getEcfOfCurrentOrbit } from './calc/getEcfOfCurrentOrbit';
import { getEci } from './calc/getEci';
import { getEciOfCurrentOrbit } from './calc/getEciOfCurrentOrbit';
import { getLlaOfCurrentOrbit } from './calc/getLlaOfCurrentOrbit';
import { getOrbitByLatLon } from './calc/getOrbitByLatLon';
import { getRae } from './calc/getRae';
import { getRicOfCurrentOrbit } from './calc/getRicOfCurrentOrbit';
import { getSunTimes } from './calc/getSunTimes';
import { getTearData } from './calc/getTearData';
import { map } from './calc/map';
import { verifySensors } from './calc/verifySensors';
import { calculateDops, getDops, updateDopsTable } from './dops/dops';
import { findBestPass } from './find/findBestPass';
import { findBestPasses } from './find/findBestPasses';
import { findCloseObjects } from './find/findCloseObjects';
import { findClosestApproachTime } from './find/findClosestApproachTime';
import { findNearbyObjectsByOrbit } from './find/findNearbyObjectsByOrbit';
import { findReentries } from './find/findReentries';
import { checkIsInView } from './lookangles/checkIsInView';
import { getlookangles, getlookanglesMultiSite, populateMultiSiteTable } from './lookangles/getlookangles';
import { nextNpasses, nextpass, nextpassList } from './lookangles/nextpass';
import { calculateVisMag } from './optical/calculateVisMag';
import { createTle } from './tle/createTle';
import { ecf2eci, ecf2rae, eci2ecf, eci2lla, getDegLat, getDegLon, lla2ecf, lookAngles2ecf } from './transforms';
import { eci2ll } from './transforms/eci2ll';
import { eci2rae } from './transforms/eci2rae';
import { sat2ric } from './transforms/sat2ric';

window._numeric = numeric; // numeric break if it is not available globally

export const distanceString = (hoverSat: SatObject, selectedSat: SatObject): string => {
  const { satSet, sensorManager } = keepTrackApi.programs;

  // Sanity Check
  if (hoverSat == null || selectedSat == null) return '';

  // Get Objects
  hoverSat = satSet.getSat(hoverSat.id);
  selectedSat = satSet.getSat(selectedSat.id);

  // Validate Objects
  if (selectedSat == null || hoverSat == null) return '';
  if (selectedSat.type === SpaceObjectType.STAR || hoverSat.type === SpaceObjectType.STAR) return '';

  // Calculate Distance
  const distanceApart = distance(hoverSat.position, selectedSat.position).toFixed(0);

  // Calculate if same beam
  let sameBeamStr = '';
  try {
    if (satellite.currentTEARR.inView) {
      if (parseFloat(distanceApart) < satellite.currentTEARR.rng * Math.sin(DEG2RAD * sensorManager.currentSensor[0].beamwidth)) {
        if (satellite.currentTEARR.rng < sensorManager.currentSensor[0].obsmaxrange && satellite.currentTEARR.rng > 0) {
          sameBeamStr = ' (Within One Beam)';
        }
      }
    }
  } catch {
    // Intentionally Blank
  }

  return '<br />Range: ' + distanceApart + ' km' + sameBeamStr;
};
export const setobs = (sensors: SensorObject[]) => {
  // TODO: UI element changes/references should be moved to ui.js
  // There are a series of referecnes, especially in satellite.obs, to ui elements.
  // These should be moved to ui.js and then called before/after calling satellite.setobs

  const { sensorManager } = keepTrackApi.programs;

  try {
    if (typeof sensors == 'undefined' || sensors == null) {
      sensorManager.setCurrentSensor(null);
      $('.sensor-reset-menu').hide();
      return;
    } else {
      getEl('menu-sensor-info')?.classList.remove('bmenu-item-disabled');
      getEl('menu-fov-bubble')?.classList.remove('bmenu-item-disabled');
      getEl('menu-surveillance')?.classList.remove('bmenu-item-disabled');
      getEl('menu-planetarium')?.classList.remove('bmenu-item-disabled');
      getEl('menu-astronomy')?.classList.remove('bmenu-item-disabled');
      $('.sensor-reset-menu').show();
    }

    sensorManager.setCurrentSensor(sensors);
    sensorManager.currentSensorList = sensors;
    sensorManager.currentSensorMultiSensor = sensors.length > 1;
    sensorManager.currentSensor[0].observerGd = {
      // Array to calculate look angles in propagate()
      lat: sensors[0].lat * DEG2RAD,
      lon: sensors[0].lon * DEG2RAD,
      alt: sensors[0].alt, // Converts from string to number
    };
  } catch (error) {
    console.debug(error);
  }
};
export const setTEARR = (currentTEARR: TearrData): void => {
  satellite.currentTEARR = currentTEARR;
};
export const getTEARR = (sat?: SatObject, sensors?: SensorObject[], propTime?: Date): TearrData => {
  const { timeManager, sensorManager } = keepTrackApi.programs;
  const currentTEARR = <TearrData>{}; // Most current TEARR data that is set in satellite object and returned.

  sensors = verifySensors(sensors, sensorManager);
  // TODO: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  // Set default timing settings. These will be changed to find look angles at different times in future.
  let satrec = calcSatrec(sat);
  const now = typeof propTime !== 'undefined' ? propTime : timeManager.simulationTimeObj;
  const { m, gmst } = calculateTimeVariables(now, satrec);
  let positionEci = <EciVec3>Sgp4.propagate(satrec, m).position;
  if (!positionEci) {
    console.error('No ECI position for', satrec.satnum, 'at', now);
    currentTEARR.alt = 0;
    currentTEARR.lon = 0;
    currentTEARR.lat = 0;
    currentTEARR.az = 0;
    currentTEARR.el = 0;
    currentTEARR.rng = 0;
  }

  try {
    let gpos = eci2lla(positionEci, gmst);
    currentTEARR.alt = gpos.alt;
    currentTEARR.lon = gpos.lon;
    currentTEARR.lat = gpos.lat;
    let positionEcf = eci2ecf(positionEci, gmst);
    let lookAngles = ecf2rae(sensor.observerGd, positionEcf);
    currentTEARR.az = lookAngles.az * RAD2DEG;
    currentTEARR.el = lookAngles.el * RAD2DEG;
    currentTEARR.rng = lookAngles.rng;
  } catch /* istanbul ignore next */ {
    currentTEARR.alt = 0;
    currentTEARR.lon = 0;
    currentTEARR.lat = 0;
    currentTEARR.az = 0;
    currentTEARR.el = 0;
    currentTEARR.rng = 0;
  }

  currentTEARR.inView = satellite.checkIsInView(sensor, {
    az: currentTEARR.az,
    el: currentTEARR.el,
    rng: currentTEARR.rng,
  });
  satellite.currentTEARR = currentTEARR;
  return currentTEARR;
};

// TODO: Future Idea
/*
// satellite.createManeuverAnalyst = (satId, incVariation, meanmoVariation, rascVariation) => {
//   const { timeManager, satSet } = keepTrackApi.programs;
//   // TODO This needs rewrote from scratch to bypass the satcruncher
//   var mainsat = satSet.getSat(satId);
//   var origsat = mainsat;
//   // Launch Points are the Satellites Current Location
//   var TEARR = mainsat.getTEARR();
//   var launchLat, launchLon, alt;
//   launchLat = satellite.degreesLat(TEARR.lat);
//   launchLon = satellite.degreesLong(TEARR.lon);
//   alt = TEARR.alt;
//   var upOrDown = mainsat.getDirection();
//   var currentEpoch = satellite.currentEpoch(timeManager.simulationTimeObj);
//   mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);
//   var TLEs;
//   // Ignore argument of perigee for round orbits OPTIMIZE
//   if (mainsat.apogee - mainsat.perigee < 300) {
//     TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.simulationTimeObj);
//   } else {
//     TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.simulationTimeObj, alt);
//   }
//   var TLE1 = TLEs[0];
//   var TLE2 = TLEs[1];
//   //   var breakupSearchString = '';
//   satId = satSet.getIdFromObjNum(80000);
//   var sat = satSet.getSat(satId);
//   sat = origsat;
//   let iTLE1 = '1 ' + 80000 + TLE1.substr(7);
//   let iTLEs;
//   // Ignore argument of perigee for round orbits OPTIMIZE
//   if (sat.apogee - sat.perigee < 300) {
//     iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.simulationTimeObj, 0, rascVariation);
//   } else {
//     iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.simulationTimeObj, alt, rascVariation);
//   }
//   iTLE1 = iTLEs[0];
//   let iTLE2 = iTLEs[1];
//   // For the first 30
//   var inc = TLE2.substr(8, 8);
//   inc = (parseFloat(inc) + incVariation).toPrecision(7);
//   inc = inc.split('.');
//   inc[0] = inc[0].substr(-3, 3);
//   if (inc[1]) {
//     inc[1] = inc[1].substr(0, 4);
//   } else {
//     inc[1] = '0000';
//   }
//   inc = (inc[0] + '.' + inc[1]).toString();
//   inc = stringPad.padEmpty(inc, 8);
//   // For the second 30
//   var meanmo: any = iTLE2.substr(52, 10);
//   meanmo = (parseFloat(meanmo) * meanmoVariation).toPrecision(10);
//   // meanmo = parseFloat(meanmo - (0.005 / 10) + (0.01 * ((meanmoIterat + 1) / 10))).toPrecision(10);
//   meanmo = meanmo.split('.');
//   meanmo[0] = meanmo[0].substr(-2, 2);
//   if (meanmo[1]) {
//     meanmo[1] = meanmo[1].substr(0, 8);
//   } else {
//     meanmo[1] = '00000000';
//   }
//   meanmo = (meanmo[0] + '.' + meanmo[1]).toString();
//   iTLE2 = '2 ' + 80000 + ' ' + inc + ' ' + iTLE2.substr(17, 35) + meanmo + iTLE2.substr(63);
//   sat = satSet.getSat(satId);
//   sat.TLE1 = iTLE1;
//   sat.TLE2 = iTLE2;
//   sat.active = true;
//   if (satellite.altitudeCheck(iTLE1, iTLE2, timeManager.simulationTimeObj) > 1) {
//     satSet.satCruncher.postMessage({
//       type: 'satEdit',
//       id: satId,
//       TLE1: iTLE1,
//       TLE2: iTLE2,
//     });
//     // TODO: This belongs in main or uiManager
//     // orbitManager.updateOrbitBuffer(satId, true, iTLE1, iTLE2);
//   } else {
//     console.debug('Breakup Generator Failed');
//     return false;
//   }
//   // breakupSearchString += mainsat.sccNum + ',Analyst Sat';
//   // uiManager.doSearch(breakupSearchString);
//   return true;
// };
// satellite.findChangeOrbitToDock = (sat, sat2, propOffset, propLength) => {
//   const { satSet } = keepTrackApi.programs;
//   let closestInc = 0;
//   let closestRaan = 0;
//   let closestMeanMo = 1;
//   let minDistArray = {
//     dist: 1000000,
//   };
//   for (let incTemp = -1; incTemp <= 1; incTemp++) {
//     for (let raanTemp = -1; raanTemp <= 1; raanTemp++) {
//       for (let meanMoTemp = 0.95; meanMoTemp <= 1.05; meanMoTemp += 0.05) {
//         if (satellite.createManeuverAnalyst(sat.id, incTemp, meanMoTemp, raanTemp)) {
//           let minDistArrayTemp = satellite.findClosestApproachTime(satSet.getSatFromObjNum(80000), sat2, propOffset, propLength);
//           if (minDistArrayTemp.dist < minDistArray.dist) {
//             minDistArray = minDistArrayTemp;
//             // let closestInc = incTemp;
//             // let closestRaan = raanTemp;
//             // let closestMeanMo = meanMoTemp;
//             // console.log(`Distance: ${minDistArray.dist}`);
//             // console.log(`Time: ${minDistArray.time}`);
//             // console.log(satSet.getSatFromObjNum(80000));
//           }
//         }
//       }
//     }
//   }

//   console.log(`${sat.inclination + closestInc}`);
//   console.log(`${sat.raan + closestRaan}`);
//   console.log(`${sat.meanMotion * closestMeanMo}`);
//   satellite.createManeuverAnalyst(sat.id, closestInc, closestMeanMo, closestRaan);
// };
*/

export type SatMath = typeof satellite;
export const satellite = {
  // Legacy API
  sgp4: Sgp4.propagate,
  gstime: Sgp4.gstime,
  twoline2satrec: Sgp4.createSatrec,
  geodeticToEcf: lla2ecf,
  ecfToEci: ecf2eci,
  eciToEcf: eci2ecf,
  eciToGeodetic: eci2lla,
  degreesLat: getDegLat,
  degreesLong: getDegLon,
  ecfToLookAngles: ecf2rae,
  // New API
  altitudeCheck: getAlt,
  calculateDops,
  calculateLookAngles,
  calculateSensorPos,
  calculateVisMag,
  checkIsInView,
  createTle,
  currentEpoch,
  distance,
  distanceString,
  eci2ll,
  eci2rae,
  findBestPass,
  findBestPasses,
  findCloseObjects,
  findReentries,
  findClosestApproachTime,
  findNearbyObjectsByOrbit,
  getDops,
  getEci,
  getEciOfCurrentOrbit,
  getEcfOfCurrentOrbit,
  getRicOfCurrentOrbit,
  getLlaOfCurrentOrbit,
  getlookangles,
  getlookanglesMultiSite,
  getOrbitByLatLon,
  getRae,
  getSunTimes,
  getTEARR,
  getTearData,
  getAngleBetweenTwoSatellites,
  isRiseSetLookangles: false,
  lastlooksArray: [],
  lastMultiSiteArray: [],
  lookAngles2Ecf: lookAngles2ecf,
  lookanglesInterval: 30,
  lookanglesLength: 2,
  map,
  nextNpasses,
  nextpass,
  nextpassList,
  obsmaxrange: 0,
  obsminrange: 0,
  sat2ric,
  setobs,
  setTEARR,
  updateDopsTable,
  populateMultiSiteTable,
  currentTEARR: <TearrData>{
    az: 0,
    el: 0,
    rng: 0,
    name: '',
    lat: 0,
    lon: 0,
    alt: 0,
    inView: false,
  },
};

window.satellite = satellite;
