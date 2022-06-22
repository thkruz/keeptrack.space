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

import { DEG2RAD, MILLISECONDS_PER_DAY, MINUTES_PER_DAY, RAD2DEG, TAU } from '@app/js/lib/constants';
import { getEl, getUnique, saveCsv, stringPad } from '@app/js/lib/helpers';
import $ from 'jquery';
import numeric from 'numeric';
import { SatRec } from 'satellite.js';
import { keepTrackApi } from '../api/keepTrackApi';
import { Eci, EciArr3, lookanglesRow, SatGroupCollection, SatMath, SatObject, SensorObject, SunObject, TearrData } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { dateFormat } from '../lib/external/dateFormat.js';
import { jday } from '../timeManager/transforms';
import { calculateSensorPos } from './calculateSensorPos';
import { checkIsInView } from './checkIsInView';
import { findNearbyObjectsByOrbit } from './findNearbyObjectsByOrbit';
import { findReentries } from './findReentries';
import { getAngleBetweenTwoSatellites } from './getAngleBetweenTwoSatellites';
import { getEcfOfCurrentOrbit } from './getEcfOfCurrentOrbit';
import { getEciOfCurrentOrbit } from './getEciOfCurrentOrbit';
import { getOrbitByLatLon } from './getOrbitByLatLon';
import { getSunDirection } from './getSunDirection';
import { sat2ric } from './transforms/sat2ric';
import { verifySensors } from './verifySensors';
import { createTle } from './createTle';
import { Sgp4 } from 'ootk';
import { ecf2eci, ecf2rae, eci2ecf, eci2lla, getDegLat, getDegLon, lla2ecf } from './transforms';


window._numeric = numeric; // numeric break if it is not available globally

type sccPassTimes = {
  sccNum: string;
  time: number;
};

export const getTearData = (now: Date, satrec: SatRec, sensors: SensorObject[], isInFOV?: boolean): TearrData => {
  // TODO: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  let aer = satellite.getRae(now, satrec, sensor);
  isInFOV ??= satellite.checkIsInView(sensor, aer);

  if (isInFOV) {
    if (satellite.isRiseSetLookangles) {
      // Previous Pass to Calculate first line of coverage
      const now1 = new Date();
      now1.setTime(Number(now) - 1000);
      let aer1 = satellite.getRae(now1, satrec, sensor);
      let isInFOV1 = satellite.checkIsInView(sensor, aer1);

      // Is in FOV and Wasn't Last Time so First Line of Coverage
      if (!isInFOV1) {
        return {
          time: dateFormat(now, 'isoDateTime', true),
          rng: aer.rng,
          az: aer.az,
          el: aer.el,
          name: sensor.shortName,
        };
      } else {
        // Next Pass to Calculate Last line of coverage
        now1.setTime(Number(now) + 1000);
        aer1 = satellite.getRae(now1, satrec, sensor);
        isInFOV1 = satellite.checkIsInView(sensor, aer1);

        // Is in FOV and Wont Be Next Time so Last Line of Coverage
        if (!isInFOV1) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: aer.rng,
            az: aer.az,
            el: aer.el,
            name: sensor.shortName,
          };
        }
      }
      return {
        time: '',
        rng: -1,
        az: -1,
        el: -1,
        name: sensor.shortName,
      };
    }
    return {
      time: dateFormat(now, 'isoDateTime', true),
      rng: aer.rng,
      az: aer.az,
      el: aer.el,
      name: sensor.shortName,
    };
  }
  return {
    time: '',
    rng: -1,
    az: -1,
    el: -1,
    name: sensor.shortName,
  };
};
export const currentEpoch = (currentDate: Date): [string, string] => {
  const { timeManager } = keepTrackApi.programs;

  const currentDateObj = new Date(currentDate);
  let epochYear = currentDateObj.getUTCFullYear().toString().substr(2, 2);
  let epochDay = timeManager.getDayOfYear(currentDateObj);
  let timeOfDay = (currentDateObj.getUTCHours() * 60 + currentDateObj.getUTCMinutes()) / 1440;
  const epochDayStr = stringPad.pad0((epochDay + timeOfDay).toFixed(8), 12);
  return [epochYear, epochDayStr];
};
export const distance = (hoverSat: SatObject, selectedSat: SatObject): string => {
  const { satSet, sensorManager } = keepTrackApi.programs;

  if (hoverSat == null || selectedSat == null) return '';
  hoverSat = satSet.getSat(hoverSat.id);
  selectedSat = satSet.getSat(selectedSat.id);
  if (selectedSat == null || hoverSat == null) {
    return '';
  }
  if (selectedSat.type === SpaceObjectType.STAR || hoverSat.type === SpaceObjectType.STAR) return '';

  let distanceApartX = Math.pow(hoverSat.position.x - selectedSat.position.x, 2);
  let distanceApartY = Math.pow(hoverSat.position.y - selectedSat.position.y, 2);
  let distanceApartZ = Math.pow(hoverSat.position.z - selectedSat.position.z, 2);
  let distanceApart = Math.sqrt(distanceApartX + distanceApartY + distanceApartZ).toFixed(0);

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
export const calculateVisMag = (sat: SatObject, sensor: SensorObject, propTime: Date, sun: SunObject): number => {
  const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const rae = satellite.getRae(propTime, satrec, sensor);
  const distanceToSatellite = rae.rng; //This is in KM

  const theta = Math.acos(
    <number>numeric.dot([-sat.position.x, -sat.position.y, -sat.position.z], [sat.position.x + sun.eci.x, -sat.position.y + sun.eci.y, -sat.position.z + sun.eci.z]) /
      (Math.sqrt(Math.pow(-sat.position.x, 2) + Math.pow(-sat.position.y, 2) + Math.pow(-sat.position.z, 2)) *
        Math.sqrt(Math.pow(-sat.position.x + sun.eci.x, 2) + Math.pow(-sat.position.y + sun.eci.y, 2) + Math.pow(-sat.position.z + sun.eci.z, 2)))
  );

  // Note sometimes -1.3 is used for this calculation.
  //-1.8 is std. mag for iss
  const intrinsicMagnitude = -1.8;

  const term2 = 5.0 * Math.log10(distanceToSatellite);

  const arg = Math.sin(theta) + (Math.PI - theta) * Math.cos(theta);
  const term3 = -2.5 * Math.log10(arg);

  return intrinsicMagnitude + term2 + term3;
};
export const altitudeCheck = (tle1: string, tle2: string, now: Date) => {
  const satrec = Sgp4.createSatrec(tle1, tle2); // perform and store sat init calcs
  const { m, gmst } = calculateTimeVariables(now, satrec);
  let positionEci = Sgp4.propagate(satrec, m);
  let gpos;

  try {
    gpos = eci2lla(positionEci.position, gmst);
  } catch (e) {
    return 0; // Auto fail the altitude check
  }
  return gpos.alt;
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
  let satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const now = typeof propTime !== 'undefined' ? propTime : timeManager.simulationTimeObj;
  const { m, gmst } = calculateTimeVariables(now, satrec);
  let positionEci = Sgp4.propagate(satrec, m);

  try {
    let gpos = eci2lla(positionEci.position, gmst);
    currentTEARR.alt = gpos.alt;
    currentTEARR.lon = gpos.lon;
    currentTEARR.lat = gpos.lat;
    let positionEcf = eci2ecf(positionEci.position, gmst);
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

export const nextpassList = (satArray: SatObject[]): sccPassTimes[] => {
  let nextPassArray = [];
  settingsManager.nextNPassesCount ??= 1;
  for (let s = 0; s < satArray.length; s++) {
    let time = nextNpasses(satArray[s], null, 7, satellite.lookanglesInterval, settingsManager.nextNPassesCount); // Only do 1 day looks
    for (let i = 0; i < time.length; i++) {
      nextPassArray.push({
        sccNum: satArray[s].sccNum,
        time: time[i],
      });
    }
  }
  return nextPassArray;
};
export const nextpass = (sat: SatObject, sensors?: SensorObject[], searchLength?: number, interval?: number) => {
  const { timeManager, sensorManager } = keepTrackApi.programs;

  sensors = verifySensors(sensors, sensorManager);
  // Loop through sensors looking for in view times
  const inViewTime = [];
  // If length and interval not set try to use defaults
  searchLength ??= satellite.lookanglesLength;
  interval ??= satellite.lookanglesInterval;

  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;
  const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  for (const sensor of sensors) {
    for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
      // 5second Looks
      offset = i * 1000; // Offset in seconds (msec * 1000)
      const now = timeManager.getOffsetTimeObj(offset, simulationTime);
      const aer = satellite.getRae(now, satrec, sensor);

      const isInFOV = satellite.checkIsInView(sensor, aer);
      if (isInFOV) {
        inViewTime.push(now);
        break;
      }
    }
  }
  // If there are in view times find the earlierst and return it formatted
  if (inViewTime.length > 0) {
    inViewTime.sort((a, b) => a.getTime() - b.getTime());
    return dateFormat(inViewTime[0], 'isoDateTime', true);
  } else {
    return 'No Passes in ' + searchLength + ' Days';
  }
};
export const nextNpasses = (sat: SatObject, sensors: SensorObject[], searchLength: number, interval: number, numPasses: number) => {
  const { timeManager, sensorManager } = keepTrackApi.programs;

  sensors = verifySensors(sensors, sensorManager);
  // TODO: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  // If length and interval not set try to use defaults
  searchLength = searchLength || satellite.lookanglesLength;
  interval = interval || satellite.lookanglesInterval;
  numPasses = numPasses || 1;

  let passTimesArray = [];
  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;
  let satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion
  for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
    // 5second Looks
    // Only pass a maximum of N passes
    if (passTimesArray.length >= numPasses) {
      return passTimesArray;
    }

    offset = i * 1000; // Offset in seconds (msec * 1000)
    let now = timeManager.getOffsetTimeObj(offset, simulationTime);
    let aer = satellite.getRae(now, satrec, sensor);

    let isInFOV = satellite.checkIsInView(sensor, aer);
    if (isInFOV) {
      passTimesArray.push(now);
      // Jump 3/4th to the next orbit
      i = i + orbitalPeriod * 60 * 0.75; // NOSONAR
    }
  }
  return passTimesArray;
};
export const getlookangles = (sat: SatObject): TearrData[] => { // NOSONAR
  const { timeManager, sensorManager } = keepTrackApi.programs;

  // Error Checking
  if (!sensorManager.checkSensorSelected()) {
    console.debug('satellite.getlookangles requires a sensor to be set!');
    return [];
  }

  let sensor = sensorManager.currentSensor;

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;

  let satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

  // const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion
  // Use custom interval unless doing rise/set lookangles - then use 1 second
  let lookanglesInterval = satellite.isRiseSetLookangles ? 1 : satellite.lookanglesInterval;

  let looksArray = [];
  for (let i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += lookanglesInterval) {
    offset = i * 1000; // Offset in seconds (msec * 1000)
    let now = timeManager.getOffsetTimeObj(offset, simulationTime);
    let looksPass = satellite.getTearData(now, satrec, sensor);
    if (looksPass.time !== '') {
      looksArray.push(looksPass); // Update the table with looks for this 5 second chunk and then increase table counter by 1
    }
    if (looksArray.length >= 1500) {
      // Maximum of 1500 lines in the look angles table
      break; // No more updates to the table (Prevent GEO object slowdown)
    }
  }

  looksArray.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  satellite.lastlooksArray = looksArray;

  // Populate the Side Menu
  (() => {
    let tbl = <HTMLTableElement>getEl('looks'); // Identify the table to update
    tbl.innerHTML = ''; // Clear the table from old object data
    let tr = tbl.insertRow();
    let tdT = tr.insertCell();
    tdT.appendChild(document.createTextNode('Time'));
    tdT.setAttribute('style', 'text-decoration: underline');
    let tdE = tr.insertCell();
    tdE.appendChild(document.createTextNode('El'));
    tdE.setAttribute('style', 'text-decoration: underline');
    let tdA = tr.insertCell();
    tdA.appendChild(document.createTextNode('Az'));
    tdA.setAttribute('style', 'text-decoration: underline');
    let tdR = tr.insertCell();
    tdR.appendChild(document.createTextNode('Rng'));
    tdR.setAttribute('style', 'text-decoration: underline');

    for (let i = 0; i < looksArray.length; i++) {
      if (tbl.rows.length > 0) {       
        tr = tbl.insertRow();
        tdT = tr.insertCell();
        tdT.appendChild(document.createTextNode(dateFormat(looksArray[i].time, 'isoDateTime', false)));
        tdE = tr.insertCell();
        tdE.appendChild(document.createTextNode(looksArray[i].el.toFixed(1)));
        tdA = tr.insertCell();
        tdA.appendChild(document.createTextNode(looksArray[i].az.toFixed(0)));
        tdR = tr.insertCell();
        tdR.appendChild(document.createTextNode(looksArray[i].rng.toFixed(0)));
      }
    }
  })();

  return looksArray;
};

const propagateMultiSite = (now: Date, satrec: SatRec, sensor: SensorObject): TearrData => {
  // Setup Realtime and Offset Time
  const aer = satellite.getRae(now, satrec, sensor);

  if (satellite.checkIsInView(sensor, aer)) {
    return {
      time: now.toISOString(),
      el: aer.el,
      az: aer.az,
      rng: aer.rng,
      name: sensor.shortName,
    };
  } else {
    return {
      time: '',
      el: 0,
      az: 0,
      rng: 0,
      name: '',
    };
  }
};

export const getlookanglesMultiSite = (sat: SatObject) => {
  const { timeManager, sensorManager } = keepTrackApi.programs;

  const isResetToDefault = !sensorManager.checkSensorSelected();

  // Save Current Sensor
  sensorManager.tempSensor = sensorManager.currentSensor;

  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;

  // Get Satellite Info
  let satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

  const multiSiteArray = <TearrData[]>[];
  for (const sensor in sensorManager.sensorList) {
    satellite.setobs([sensorManager.sensorList[sensor]]);
    for (let i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += satellite.lookanglesInterval) {
      // 5second Looks
      offset = i * 1000; // Offset in seconds (msec * 1000)
      let now = timeManager.getOffsetTimeObj(offset, simulationTime);
      let multiSitePass = propagateMultiSite(now, satrec, sensorManager.sensorList[sensor]);
      if (multiSitePass.time !== '') {
        multiSiteArray.push(multiSitePass); // Update the table with looks for this 5 second chunk and then increase table counter by 1
        // Jump 3/4th to the next orbit
        i = i + orbitalPeriod * 60 * 0.75; // NOSONAR
      }
    }
  }

  multiSiteArray.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  satellite.lastMultiSiteArray = multiSiteArray;

  // Populate the Side Menu
  populateMultiSiteTable(multiSiteArray, sat);

  isResetToDefault ? sensorManager.setCurrentSensor(sensorManager.defaultSensor) : sensorManager.setCurrentSensor(sensorManager.tempSensor);
};

const getSatPos = (offset: number, satrec: SatRec): Eci => {
  try {
    const now = new Date(); // Make a time variable
    now.setTime(Number(Date.now()) + offset); // Set the time variable to the time in the future
    const { m } = calculateTimeVariables(now, satrec);
    return Sgp4.propagate(satrec, m);
  } catch {
    return { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } };
  }
};

/* istanbul ignore next */
export const findCloseObjects = () => { // NOSONAR
  const { satSet } = keepTrackApi.programs;
  const searchRadius = 50; // km

  let csoList = [];
  let satList = <SatObject[]>[];

  // Loop through all the satellites
  for (let i = 0; i < satSet.numSats; i++) {
    // Get the satellite
    const sat = satSet.getSat(i);
    // Avoid unnecessary errors
    if (typeof sat.TLE1 == 'undefined') continue;
    // Only look at satellites in LEO
    if (sat.apogee > 5556) continue;
    // Find where the satellite is right now
    sat.satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs)
    sat.position = getSatPos(0, sat.satrec).position;
    // If it fails, skip it
    if (sat.position === { x: 0, y: 0, z: 0 }) continue;
    // Add the satellite to the list
    satList.push(sat);
  }

  // Remove duplicates
  satList = getUnique(satList);

  // Loop through all the satellites with valid positions
  for (let i = 0; i < satList.length; i++) {
    let sat1 = satList[i];
    let pos1 = sat1.position;

    // Calculate the area around the satellite
    let posXmin = pos1.x - searchRadius;
    let posXmax = pos1.x + searchRadius;
    let posYmin = pos1.y - searchRadius;
    let posYmax = pos1.y + searchRadius;
    let posZmin = pos1.z - searchRadius;
    let posZmax = pos1.z + searchRadius;

    // Loop through the list again
    for (let j = 0; j < satList.length; j++) {
      // Get the second satellite
      let sat2 = satList[j];
      // Skip the same satellite
      if (sat1 == sat2) continue;
      // Get the second satellite's position
      let pos2 = sat2.position;
      // Check to see if the second satellite is in the search area
      if (pos2.x < posXmax && pos2.x > posXmin && pos2.y < posYmax && pos2.y > posYmin && pos2.z < posZmax && pos2.z > posZmin) {
        // Add the second satellite to the list if it is close
        csoList.push({ sat1: sat1, sat2: sat2 });
      }
    }
  }

  let csoListUnique = getUnique(csoList);

  const csoStrArr = []; // Clear CSO List
  // Loop through the possible CSOs
  for (let i = 0; i < csoListUnique.length; i++) {
    // Calculate the first CSO's position 30 minutes later
    let sat = csoListUnique[i].sat1;
    let eci = getSatPos(1000 * 60 * 30, sat.satrec);
    if (eci.position === { x: 0, y: 0, z: 0 }) continue;
    csoListUnique[i].sat1.position = eci.position;

    // Calculate the second CSO's position 30 minutes later
    sat = csoListUnique[i].sat2;
    eci = getSatPos(1000 * 60 * 30, sat.satrec);
    if (eci.position === { x: 0, y: 0, z: 0 }) continue;
    sat.position = eci.position;
    csoListUnique[i].sat2.position = eci.position;
  }

  // Loop through the CSOs
  for (let i = 0; i < csoListUnique.length; i++) {
    // Check the first CSO
    let sat1 = csoListUnique[i].sat1;
    let pos1 = sat1.position;
    if (typeof pos1 == 'undefined') continue;

    // Calculate the area around the CSO
    let posXmin = pos1.x - searchRadius;
    let posXmax = pos1.x + searchRadius;
    let posYmin = pos1.y - searchRadius;
    let posYmax = pos1.y + searchRadius;
    let posZmin = pos1.z - searchRadius;
    let posZmax = pos1.z + searchRadius;

    // Get the second CSO object
    let sat2 = csoListUnique[i].sat2;
    let pos2 = sat2.position;
    if (typeof pos2 == 'undefined') continue;

    // If it is still in the search area, add it to the list
    if (pos2.x < posXmax && pos2.x > posXmin && pos2.y < posYmax && pos2.y > posYmin && pos2.z < posZmax && pos2.z > posZmin) {
      csoStrArr.push(sat1.sccNum);
      csoStrArr.push(sat2.sccNum);
    }
  }

  // Generate the search string
  const csoListUniqueArr = Array.from(new Set(csoStrArr));
  let searchStr = '';
  for (let i = 0; i < csoListUniqueArr.length; i++) {
    if (i == csoListUniqueArr.length - 1) {
      searchStr += csoListUniqueArr[i];
    } else {
      searchStr += csoListUniqueArr[i] + ',';
    }
  }

  return searchStr; // csoListUnique;
};
export const calculateLookAngles = (sat: SatObject, sensors: SensorObject[]) => { // NOSONAR
  const { sensorManager, timeManager } = keepTrackApi.programs;

  (function _inputValidation() {
    // Check if there is a sensor
    if (typeof sensors == 'undefined') {
      // Try using the current sensor if there is one
      if (sensorManager.checkSensorSelected()) {
        sensors = sensorManager.currentSensor;
      } else {
        console.debug('getlookangles2 requires a sensor!');
        return;
      }
      // Simple Error Checking
    } else {
      if (typeof sensors[0].obsminaz == 'undefined') {
        console.debug('sensors[0] format incorrect');
        return;
      }
      sensors[0].observerGd = {
        // Array to calculate look angles in propagate()
        lat: sensors[0].lat * DEG2RAD,
        lon: sensors[0].lon * DEG2RAD,
        alt: sensors[0].alt,
      };
    }

    if (typeof sat == 'undefined') {
      console.debug('sat parameter required!');
    } else {
      if (typeof sat.TLE1 == 'undefined' || typeof sat.TLE2 == 'undefined') {
        console.debug('sat parameter invalid format!');
      }
    }

    if (typeof satellite.isRiseSetLookangles == 'undefined') {
      satellite.isRiseSetLookangles = false;
    }
  })();

  // TOOD: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;
  var satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  var lookanglesTable = []; // Iniially no rows to the table
  var tempLookanglesInterval;

  if (satellite.isRiseSetLookangles) {
    tempLookanglesInterval = satellite.lookanglesInterval;
    satellite.lookanglesInterval = 1;
  }

  for (var i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += satellite.lookanglesInterval) {
    // satellite.lookanglesInterval in seconds
    offset = i * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    if (lookanglesTable.length <= 5000) {
      // Maximum of 1500 lines in the look angles table
      const _lookanglesRow = getTearData(now, satrec, [sensor]);
      if (_lookanglesRow.time !== '') {
        lookanglesTable.push(_lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1
      }
    }
  }

  if (satellite.isRiseSetLookangles) {
    satellite.lookanglesInterval = tempLookanglesInterval;
  }
  return lookanglesTable;
};
/* istanbul ignore next */
export const findBestPasses = (sats: string, sensor: SensorObject) => {
  const { satSet } = keepTrackApi.programs;

  sats = sats.replace(/ /gu, ',');
  const satArray = sats.split(',');
  let tableSatTimes = [];
  for (let i = 0; i < satArray.length; i++) {
    try {
      const satId = satArray[i];
      if (typeof satId == 'undefined' || satId == null || satId === '' || satId === ' ') continue;
      const sat = satSet.getSatFromObjNum(parseInt(satId));
      const satPasses = findBestPass(sat, [sensor]);
      for (let s = 0; s < satPasses.length; s++) {
        tableSatTimes.push(satPasses[s]);
        // }
      }
    } catch (e) {
      console.debug(e);
    }
  }
  tableSatTimes.sort((a, b) => b.sortTime - a.sortTime);
  tableSatTimes.reverse();
  tableSatTimes.forEach((v) => {
    delete v.sortTime;
  });

  for (let i = 0; i < tableSatTimes.length; i++) {
    tableSatTimes[i].startDate = tableSatTimes[i].startDate.toISOString().split('T')[0];
    tableSatTimes[i].startTime = tableSatTimes[i].startTime.toISOString().split('T')[1].split('.')[0];
    tableSatTimes[i].stopDate = tableSatTimes[i].stopDate.toISOString().split('T')[0];
    tableSatTimes[i].stopTime = tableSatTimes[i].stopTime.toISOString().split('T')[1].split('.')[0];
  }

  saveCsv(tableSatTimes, 'bestSatTimes');
};
/* istanbul ignore next */
export const findBestPass = (sat: SatObject, sensors: SensorObject[]): lookanglesRow[] => { // NOSONAR
  const { sensorManager, timeManager,uiManager } = keepTrackApi.programs;

  (function _inputValidation() {
    // Check if there is a sensor
    if (typeof sensors == 'undefined') {
      // Try using the current sensors if there is one
      if (sensorManager.checkSensorSelected()) {
        sensors = sensorManager.currentSensor;
      } else {
        uiManager.toast(`No sensor selected. Did you select a sensor first?`, 'critical');
        return;
      }
      // Simple Error Checking
    } else {
      if (sensors.length <= 0 || !sensors[0] || typeof sensors[0].obsminaz == 'undefined') {
        uiManager.toast(`Sensor's format incorrect. Did you select a sensor first?`, 'critical');
        return;
      }
      sensors[0].observerGd = {
        // Array to calculate look angles in propagate()
        lat: sensors[0].lat * DEG2RAD,
        lon: sensors[0].lon * DEG2RAD,
        alt: sensors[0].alt,
      };
    }

    if (typeof sat == 'undefined') {
      console.debug('sat parameter required!');
    } else {
      if (typeof sat.TLE1 == 'undefined' || typeof sat.TLE2 == 'undefined') {
        console.debug('sat parameter invalid format!');
      }
    }
  })();

  // TOOD: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;

  var satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  var lookanglesTable = []; // Iniially no rows to the table

  let looksInterval = 5;
  let looksLength = 7;

  // Setup flags for passes
  let score = 0;
  let sAz = <string | null>null;
  let sEl = <string | null>null;
  let srng = <string | null>null;
  let sTime = <Date | null>null;
  let passMinrng = sensor.obsmaxrange; // This is set each look to find minimum rng (start at max rng)
  let passMaxEl = 0;
  let start3 = false;
  let stop3 = false;

  let orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

  const _propagateBestPass = (now: Date, satrecIn: SatRec): lookanglesRow => {
    let aer = satellite.getRae(now, satrecIn, sensor);
    let isInFOV = satellite.checkIsInView(sensor, aer);

    if (isInFOV) {
      // Previous Pass to Calculate first line of coverage
      const now1 = timeManager.getOffsetTimeObj(offset - looksInterval * 1000, simulationTime);
      let aer1 = satellite.getRae(now1, satrecIn, sensor);

      let isInFOV1 = satellite.checkIsInView(sensor, aer1);
      if (!isInFOV1) {
        // if it starts around 3
        if (aer.el <= 3.5) {
          start3 = true;
        }

        // First Line of Coverage
        sTime = now;
        sAz = aer.az.toFixed(0);
        sEl = aer.el.toFixed(1);
        srng = aer.rng.toFixed(0);
      } else {
        // Next Pass to Calculate Last line of coverage
        let _now1 = timeManager.getOffsetTimeObj(offset + looksInterval * 1000, simulationTime);
        aer1 = satellite.getRae(_now1, satrecIn, sensor);

        isInFOV1 = satellite.checkIsInView(sensor, aer1);
        if (!isInFOV1) {
          // if it stops around 3
          stop3 = aer.el <= 3.5;

          score = Math.min((((now.getTime() - sTime.getTime()) / 1000 / 60) * 10) / 8, 10); // 8 minute pass is max score
          let elScore = Math.min((passMaxEl / 50) * 10, 10); // 50 el or above is max score
          // elScore -= Math.max((passMaxEl - 50) / 5, 0); // subtract points for being over 50 el
          elScore *= start3 && stop3 ? 2 : 1; // Double points for start and stop at 3
          score += elScore;
          score += Math.min((10 * 750) / passMinrng, 10); // 750 or less is max score
          // score -= Math.max((750 - passMinrng) / 10, 0); // subtract points for being closer than 750

          let tic = 0;
          tic = (now.getTime() - sTime.getTime()) / 1000 || 0;

          // Skip pass if satellite is in track right now
          if (sTime == null) return {
            sortTime: null,
            scc: null,
            score: null,
            startDate: null,
            startTime: null,
            startAz: null,
            startEl: null,
            startrng: null,
            stopDate: null,
            stopTime: null,
            stopAz: null,
            stopEl: null,
            stoprng: null,
            tic: null,
            minrng: null,
            passMaxEl: null,
          };

          // Last Line of Coverage
          return {
            sortTime: sTime.getTime(),
            scc: satrecIn.satnum,
            score: score,
            startDate: sTime,
            startTime: sTime,
            startAz: sAz,
            startEl: sEl,
            startrng: srng,
            stopDate: now,
            stopTime: now,
            stopAz: aer.az.toFixed(0),
            stopEl: aer.el.toFixed(1),
            stoprng: aer.rng.toFixed(0),
            tic: tic,
            minrng: passMinrng.toFixed(0),
            passMaxEl: passMaxEl.toFixed(1),
          };
        }
      }
      // Do this for any pass in coverage
      if (passMaxEl < aer.el) passMaxEl = aer.el;
      if (passMinrng > aer.rng) passMinrng = aer.rng;
    }
    return {
      sortTime: null,
      scc: null,
      score: null,
      startDate: null,
      startTime: null,
      startAz: null,
      startEl: null,
      startrng: null,
      stopDate: null,
      stopTime: null,
      stopAz: null,
      stopEl: null,
      stoprng: null,
      tic: null,
      minrng: null,
      passMaxEl: null,
    };
  };

  for (let i = 0; i < looksLength * 24 * 60 * 60; i += looksInterval) {
    // satellite.lookanglesInterval in seconds
    offset = i * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    if (lookanglesTable.length <= 5000) {
      // Maximum of 1500 lines in the look angles table
      const _lookanglesRow = _propagateBestPass(now, satrec);
      // If data came back...
      if (_lookanglesRow.score !== null) {
        lookanglesTable.push(_lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1
        // Reset flags for next pass
        score = 0;
        sAz = null;
        sEl = null;
        srng = null;
        sTime = null;
        passMinrng = sensor.obsmaxrange; // This is set each look to find minimum rng
        passMaxEl = 0;
        start3 = false;
        stop3 = false;
        // Jump 3/4th to the next orbit
        i = i + orbitalPeriod * 60 * 0.75; // NOSONAR
      }
    }
  }

  return lookanglesTable;
};

export const calculateTimeVariables = (now: Date, satrec?: SatRec): { gmst: number; m: number; j: number } => {
  const j =
    jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ) +
    now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  const gmst = Sgp4.gstime(j);

  const m = satrec ? (j - satrec.jdsatepoch) * MINUTES_PER_DAY : null;

  return { gmst, m, j };
};

export const getRae = (now: Date, satrec: SatRec, sensor: SensorObject) => {
  const { gmst, m } = calculateTimeVariables(now, satrec);
  let positionEci = Sgp4.propagate(satrec, m);
  let positionEcf = eci2ecf(positionEci.position, gmst); // positionEci.position is called positionEci originally
  sensor.observerGd ??= { lat: sensor.lat * DEG2RAD, lon: sensor.lon * DEG2RAD, alt: sensor.alt };

  let lookAngles = ecf2rae(sensor.observerGd, positionEcf);
  let az = lookAngles.az * RAD2DEG;
  let el = lookAngles.el * RAD2DEG;
  let rng = lookAngles.rng;
  return { az, el, rng };
};

export const eci2Rae = (now: Date, eci: EciArr3, sensor: SensorObject) => {
  now = new Date(now);
  const { gmst } = calculateTimeVariables(now);

  let positionEcf = eci2ecf(eci, gmst); // positionEci.position is called positionEci originally
  let lookAngles = ecf2rae(sensor.observerGd, positionEcf);
  let az = lookAngles.az * RAD2DEG;
  let el = lookAngles.el * RAD2DEG;
  let rng = lookAngles.rng;
  return { az: az, el: el, rng: rng };
};
export const getEci = (sat: SatObject, now: Date) => {
  let satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const { m } = calculateTimeVariables(now, satrec);

  return Sgp4.propagate(satrec, m);
};
export const findClosestApproachTime = (
  sat1: SatObject,
  sat2: SatObject,
  propLength?: number
): {
  offset: number;
  dist: number;
  ric: { position: [number, number, number]; velocity: [number, number, number] };
} => {
  let offset = 0;
  propLength ??= 1440 * 60; // 1 Day
  let minDist = 1000000;
  let result = {
    offset: null,
    dist: null,
    ric: null,
  };

  sat1.satrec = Sgp4.createSatrec(sat1.TLE1, sat1.TLE2); // perform and store sat init calcs
  sat2.satrec = Sgp4.createSatrec(sat2.TLE1, sat2.TLE2); // perform and store sat init calcs

  for (let t = 0; t < propLength; t++) {
    offset = t * 1000; // Offset in seconds (msec * 1000)
    sat1 = <SatObject>{ ...sat1, ...getSatPos(offset, sat1.satrec) };
    sat2 = <SatObject>{ ...sat2, ...getSatPos(offset, sat2.satrec) };
    const pv = sat2ric(sat1, sat2);
    const dist = Math.sqrt(pv.position[0] ** 2 + pv.position[1] ** 2 + pv.position[2] ** 2);
    if (dist < minDist && !(pv.position[0] === 0 && pv.position[1] === 0 && pv.position[2] === 0)) {
      minDist = dist;
      result = {
        offset,
        dist: dist,
        ric: pv,
      };
    }
  }

  // Go to closest approach time
  keepTrackApi.programs.timeManager.changeStaticOffset(result.offset);

  return result;
};

export const updateDopsTable = (lat: number, lon: number, alt: number) => {
  const { timeManager } = keepTrackApi.programs;

  try {
    let tbl = <HTMLTableElement>getEl('dops'); // Identify the table to update
    tbl.innerHTML = ''; // Clear the table from old object data

    const simulationTime = timeManager.simulationTimeObj;
    let offset = 0;

    let tr = tbl.insertRow();
    let tdT = tr.insertCell();
    tdT.appendChild(document.createTextNode('Time'));
    let tdH = tr.insertCell();
    tdH.appendChild(document.createTextNode('HDOP'));
    let tdP = tr.insertCell();
    tdP.appendChild(document.createTextNode('PDOP'));
    let tdG = tr.insertCell();
    tdG.appendChild(document.createTextNode('GDOP'));

    for (let t = 0; t < 1440; t++) {
      offset = t * 1000 * 60; // Offset in seconds (msec * 1000)
      const now = timeManager.getOffsetTimeObj(offset, simulationTime);

      let dops = satellite.getDops(lat, lon, alt, now);

      tr = tbl.insertRow();
      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(now, 'isoDateTime', true)));
      tdH = tr.insertCell();
      tdH.appendChild(document.createTextNode(dops.hdop));
      tdP = tr.insertCell();
      tdP.appendChild(document.createTextNode(dops.pdop));
      tdG = tr.insertCell();
      tdG.appendChild(document.createTextNode(dops.gdop));
    }
  } catch (error) {
    console.debug(error);
  }
};
export const getDops = (lat: number, lon: number, alt?: number, propTime?: Date) => {
  const { timeManager, groupsManager, satSet } = keepTrackApi.programs;

  if (typeof lat == 'undefined') throw new Error('Latitude is undefined');
  if (typeof lon == 'undefined') throw new Error('Longitude is undefined');

  lat = lat * DEG2RAD;
  lon = lon * DEG2RAD;
  alt ??= 0;
  groupsManager.GPSGroup ??= groupsManager.createGroup('nameRegex', /NAVSTAR/iu);
  propTime ??= timeManager.simulationTimeObj;

  const { gmst } = calculateTimeVariables(propTime);

  let inViewList = [];
  groupsManager.GPSGroup.sats.forEach((satObj: SatGroupCollection) => {
    const sat = satSet.getSat(satObj.satId);
    const lookAngles = ecf2rae({ lon: lon, lat: lat, alt: alt }, eci2ecf(sat.position, gmst));
    sat.az = lookAngles.az * RAD2DEG;
    sat.el = lookAngles.el * RAD2DEG;
    if (sat.el > settingsManager.gpsElevationMask) {
      inViewList.push(sat);
    }
  });

  return calculateDops(inViewList);
};
export const calculateDops = (satList: { az: number; el: number }[]): { pdop: string; hdop: string; gdop: string; vdop: string; tdop: string } => {
  var dops: any = {};

  let nsat = satList.length;
  if (nsat < 4) {
    dops.pdop = 50;
    dops.hdop = 50;
    dops.gdop = 50;
    dops.vdop = 50;
    dops.tdop = 50;
    return dops;
  }

  var A = <any>numeric.rep([nsat, 4], 0);
  for (var n = 1; n <= nsat; n++) {
    var cursat = satList[n - 1];

    var az = cursat.az;
    var el = cursat.el;

    const B = [
      Math.cos((el * Math.PI) / 180.0) * Math.sin((az * Math.PI) / 180.0),
      Math.cos((el * Math.PI) / 180.0) * Math.cos((az * Math.PI) / 180.0),
      Math.sin((el * Math.PI) / 180.0),
      1,
    ];
    numeric.setBlock(A, [n - 1, 0], [n - 1, 3], [B]);
  }
  var Q = <number[][]>numeric.dot(numeric.transpose(A), A);
  var Qinv = numeric.inv(Q);
  var pdop = Math.sqrt(Qinv[0][0] + Qinv[1][1] + Qinv[2][2]);
  var hdop = Math.sqrt(Qinv[0][0] + Qinv[1][1]);
  var gdop = Math.sqrt(Qinv[0][0] + Qinv[1][1] + Qinv[2][2] + Qinv[3][3]);
  var vdop = Math.sqrt(Qinv[2][2]);
  var tdop = Math.sqrt(Qinv[3][3]);
  dops.pdop = (Math.round(pdop * 100) / 100).toFixed(2);
  dops.hdop = (Math.round(hdop * 100) / 100).toFixed(2);
  dops.gdop = (Math.round(gdop * 100) / 100).toFixed(2);
  dops.vdop = (Math.round(vdop * 100) / 100).toFixed(2);
  dops.tdop = (Math.round(tdop * 100) / 100).toFixed(2);
  return dops;
};
export const getSunTimes = (sat: SatObject, sensors?: SensorObject[], searchLength?: number, interval?: number) => { // NOSONAR
  const { timeManager, sensorManager } = keepTrackApi.programs;

  sensors = verifySensors(sensors, sensorManager);
  // TOOD: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  // If length and interval not set try to use defaults
  searchLength ??= satellite.lookanglesLength;
  interval ??= satellite.lookanglesInterval;

  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;
  const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  let minDistanceApart = 100000000000; // Arbitrarily large number
  // var minDistTime;
  for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
    // 5second Looks
    offset = i * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    const { m, j, gmst } = calculateTimeVariables(now, satrec);

    const [sunX, sunY, sunZ] = getSunDirection(j);
    const eci = Sgp4.propagate(satrec, m).position;

    const distX = Math.pow(sunX - eci.x, 2);
    const distY = Math.pow(sunY - eci.y, 2);
    const distZ = Math.pow(sunZ - eci.z, 2);
    const dist = Math.sqrt(distX + distY + distZ);

    const positionEcf = eci2ecf(eci, gmst);
    const lookAngles = ecf2rae(sensor.observerGd, positionEcf);

    const az = lookAngles.az * RAD2DEG;
    const el = lookAngles.el * RAD2DEG;
    const rng = lookAngles.rng;

    if (sensor.obsminaz > sensor.obsmaxaz) {
      if (
        ((az >= sensor.obsminaz || az <= sensor.obsmaxaz) && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
        ((az >= sensor.obsminaz2 || az <= sensor.obsmaxaz2) && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
      ) {
        if (dist < minDistanceApart) {
          minDistanceApart = dist;
        }
      }
    } else {
      if (
        (az >= sensor.obsminaz && az <= sensor.obsmaxaz && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
        (az >= sensor.obsminaz2 && az <= sensor.obsmaxaz2 && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
      ) {
        if (dist < minDistanceApart) {
          minDistanceApart = dist;
        }
      }
    }
  }
};
export const lookAngles2Ecf = (az: number, el: number, rng: number, lat: number, lon: number, alt: number): { x: number; y: number; z: number } => {
  // site ecef in meters
  const geodeticCoords: any = {
    lat: lat,
    lon: lon,
    alt: alt,
  };

  const site = lla2ecf(geodeticCoords);
  const sitex = site.x;
  const sitey = site.y;
  const sitez = site.z;

  // some needed calculations
  const slat = Math.sin(lat);
  const slon = Math.sin(lon);
  const clat = Math.cos(lat);
  const clon = Math.cos(lon);

  az *= DEG2RAD;
  el *= DEG2RAD;

  // az,el,rng to sez convertion
  const south = -rng * Math.cos(el) * Math.cos(az);
  const east = rng * Math.cos(el) * Math.sin(az);
  const zenith = rng * Math.sin(el);

  const x = slat * clon * south + -slon * east + clat * clon * zenith + sitex;
  const y = slat * slon * south + clon * east + clat * slon * zenith + sitey;
  const z = -clat * south + slat * zenith + sitez;

  return { x: x, y: y, z: z };
};
export const eci2ll = (x: number, y: number, z: number): { lat: number; lon: number; alt: number } => {
  const { timeManager } = keepTrackApi.programs;

  const now = timeManager.simulationTimeObj;
  const { gmst } = calculateTimeVariables(now);
  var latLon = eci2lla({ x: x, y: y, z: z }, gmst);
  latLon.lat = latLon.lat * RAD2DEG;
  latLon.lon = latLon.lon * RAD2DEG;

  // Normalize
  latLon.lon = latLon.lon > 180 ? latLon.lon - 360 : latLon.lon;
  latLon.lon = latLon.lon < -180 ? latLon.lon + 360 : latLon.lon;
  return latLon;
};

export const getLlaTimeView = (now: Date, sat: SatObject) => {
  const { sensorManager } = keepTrackApi.programs;
  const satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

  const { m, gmst } = calculateTimeVariables(now, satrec);
  const positionEci = Sgp4.propagate(satrec, m);

  const gpos = eci2lla(positionEci.position, gmst);
  const lat = getDegLat(gpos.lat);
  const lon = getDegLon(gpos.lon);
  const time = dateFormat(now, 'isoDateTime', true);

  const positionEcf = eci2ecf(positionEci.position, gmst); // positionEci.position is called positionEci originally
  const lookAngles = ecf2rae(sensorManager.currentSensor[0].observerGd, positionEcf);
  const az = lookAngles.az * RAD2DEG;
  const el = lookAngles.el * RAD2DEG;
  const rng = lookAngles.rng;
  const inView = checkIsInView(sensorManager.currentSensor[0], { az, el, rng });

  return { lat, lon, time, inView };
};

export const map = (sat: SatObject, i: number, pointPerOrbit?: number): { time: string; lat: number; lon: number; inView: boolean } => {
  const { timeManager } = keepTrackApi.programs;
  pointPerOrbit ??= 256; // TODO: This should be mandatory but tests need updated

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.simulationTimeObj;
  let offset = ((i * sat.period) / pointPerOrbit) * 60 * 1000; // Offset in seconds (msec * 1000)
  const now = timeManager.getOffsetTimeObj(offset, simulationTime);

  return getLlaTimeView(now, sat);
};

export const getRicOfCurrentOrbit = (sat: SatObject, sat2: SatObject, points: number, orbits?: number): { x: number; y: number; z: number }[] => {
  const { timeManager } = keepTrackApi.programs;

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.simulationTimeObj;
  orbits ??= 1;
  let ricPoints = [];
  for (let i = 0; i < points; i++) {
    let offset = ((i * sat.period * orbits) / points) * 60 * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    sat = {...sat, ...<SatObject>getEci(sat, now)};
    sat2 = {...sat2, ...<SatObject>getEci(sat2, now)};
    ricPoints.push(sat2ric(sat, sat2).position);
  }
  return ricPoints;
}

export const getLlaOfCurrentOrbit = (sat: SatObject, points: number): { lat: number; lon: number; alt: number, time: number }[] => {
  const { timeManager } = keepTrackApi.programs;

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.simulationTimeObj;
  let llaPoints = [];
  for (let i = 0; i < points; i++) {
    let offset = ((i * sat.period) / points) * 60 * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    const { gmst } = calculateTimeVariables(now);
    const eci = getEci(sat, now).position;
    const lla = eci2lla(eci, gmst);
    const llat = {...lla, ...{time: now.getTime()}};
    llaPoints.push(llat);
  }
  return llaPoints;
}

export const populateMultiSiteTable = (multiSiteArray: TearrData[], sat: SatObject) => {
  const { sensorManager } = keepTrackApi.programs;

  const tbl = <HTMLTableElement>getEl('looksmultisite'); // Identify the table to update
  tbl.innerHTML = ''; // Clear the table from old object data
  let tr = tbl.insertRow();
  let tdT = tr.insertCell();
  tdT.appendChild(document.createTextNode('Time'));
  tdT.setAttribute('style', 'text-decoration: underline');
  let tdR = tr.insertCell();
  tdR.appendChild(document.createTextNode('Rng'));
  tdR.setAttribute('style', 'text-decoration: underline');
  let tdA = tr.insertCell();
  tdA.appendChild(document.createTextNode('Az'));
  tdA.setAttribute('style', 'text-decoration: underline');
  let tdE = tr.insertCell();
  tdE.appendChild(document.createTextNode('El'));
  tdE.setAttribute('style', 'text-decoration: underline');
  let tdS = tr.insertCell();
  tdS.appendChild(document.createTextNode('Sensor'));
  tdS.setAttribute('style', 'text-decoration: underline');

  for (let i = 0; i < multiSiteArray.length; i++) {
    if (sensorManager.sensorListUS.includes(sensorManager.sensorList[multiSiteArray[i].name])) {
      tr = tbl.insertRow();
      tr.setAttribute('style', 'cursor: pointer');
      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(multiSiteArray[i].time, 'isoDateTime', true)));
      tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode(multiSiteArray[i].el.toFixed(1)));
      tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode(multiSiteArray[i].az.toFixed(0)));
      tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode(multiSiteArray[i].rng.toFixed(0)));
      tdS = tr.insertCell();
      tdS.appendChild(document.createTextNode(multiSiteArray[i].name));
      // TODO: Future feature
      tr.addEventListener('click', () => {
        const { timeManager, satSet } = keepTrackApi.programs;
        timeManager.changeStaticOffset(new Date(multiSiteArray[i].time).getTime() - new Date().getTime());
        sensorManager.setSensor(sensorManager.sensorList[multiSiteArray[i].name]);
        // TODO: This is an ugly workaround
        setTimeout(() => {
          satSet.selectSat(sat.id);
        }, 500);
      });
    }
  }
};

export const satellite: SatMath = {
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
  altitudeCheck,
  calculateDops,
  calculateLookAngles,
  calculateSensorPos,
  calculateVisMag,
  checkIsInView,
  createTle,
  currentEpoch,
  distance,
  eci2ll,
  eci2Rae,
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
  lookAngles2Ecf,
  lookanglesInterval: 30,
  lookanglesLength: 7,
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
  currentTEARR: {
    time: '',
    az: 0,
    el: 0,
    rng: 0,
    name: '',
  },
};

window.satellite = satellite;
