/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * satMath.ts an expansion library for the Orbital Object Toolkit (OOTK)
 * providing tailored functions for calculating orbital data.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2021 Theodore Kruczek
 * @Copyright (C) 2020 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { DEG2RAD, DISTANCE_TO_SUN, MILLISECONDS_PER_DAY, MINUTES_PER_DAY, PLANETARIUM_DIST, RAD2DEG, RADIUS_OF_EARTH, TAU } from '@app/js/lib/constants';
import { saveCsv, stringPad } from '@app/js/lib/helpers';
import $ from 'jquery';
import * as Ootk from 'ootk';
import { SatRec } from 'satellite.js';
import { keepTrackApi } from '../api/keepTrackApi';
import { Eci, EciArr3, SatGroupCollection, SatMath, SatObject, SensorManager, SensorObject, SunObject, TearrData } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { dateFormat } from '../lib/external/dateFormat.js';
import { numeric } from '../lib/external/numeric';
import { jday } from '../timeManager/transforms';
import { getOrbitByLatLon } from './getOrbitByLatLon';
import { formatArgumentOfPerigee, formatInclination, formatMeanAnomaly, formatMeanMotion, formatRightAscension } from './tleFormater';

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
      var now1 = new Date();
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
  // epochDay = stringPad.pad0(epochDay, 12);
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
      $('#menu-sensor-info').removeClass('bmenu-item-disabled');
      $('#menu-fov-bubble').removeClass('bmenu-item-disabled');
      $('#menu-surveillance').removeClass('bmenu-item-disabled');
      $('#menu-planetarium').removeClass('bmenu-item-disabled');
      $('#menu-astronomy').removeClass('bmenu-item-disabled');
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
  const satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
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

  // const apparentMagnitude = intrinsicMagnitude + term2 + term3;
  return intrinsicMagnitude + term2 + term3;
};
export const altitudeCheck = (tle1: string, tle2: string, now: Date) => {
  const satrec = satellite.twoline2satrec(tle1, tle2); // perform and store sat init calcs
  const { m, gmst } = calculateTimeVariables(now, satrec);
  let positionEci = satellite.sgp4(satrec, m);
  let gpos;

  try {
    gpos = satellite.eciToGeodetic(positionEci.position, gmst);
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
  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const now = typeof propTime !== 'undefined' ? propTime : timeManager.calculateSimulationTime();
  const { m, gmst } = calculateTimeVariables(now, satrec);
  let positionEci = satellite.sgp4(satrec, m);

  try {
    let gpos = satellite.eciToGeodetic(positionEci.position, gmst);
    currentTEARR.alt = gpos.alt;
    currentTEARR.lon = gpos.lon;
    currentTEARR.lat = gpos.lat;
    let positionEcf = satellite.eciToEcf(positionEci.position, gmst);
    let lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
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
  // TODO: Instead of doing the first sensor this should return an array.
  const sensor = sensors[0];

  // If length and interval not set try to use defaults
  searchLength ??= satellite.lookanglesLength;
  interval ??= satellite.lookanglesInterval;

  const simulationTime = timeManager.calculateSimulationTime();
  let offset = 0;
  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
    // 5second Looks
    offset = i * 1000; // Offset in seconds (msec * 1000)
    let now = timeManager.getOffsetTimeObj(offset, simulationTime);
    let aer = satellite.getRae(now, satrec, sensor);

    let isInFOV = satellite.checkIsInView(sensor, aer);
    if (isInFOV) return dateFormat(now, 'isoDateTime', true);
  }
  return 'No Passes in ' + searchLength + ' Days';
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
  const simulationTime = timeManager.calculateSimulationTime();
  let offset = 0;
  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
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
      i = i + orbitalPeriod * 60 * 0.75; // Jump 3/4th to the next orbit
    }
  }
  return passTimesArray;
};
export const getlookangles = (sat: SatObject): TearrData[] => {
  const { timeManager, sensorManager } = keepTrackApi.programs;

  // Error Checking
  if (!sensorManager.checkSensorSelected()) {
    console.debug('satellite.getlookangles requires a sensor to be set!');
    return [];
  }

  let sensor = sensorManager.currentSensor;

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.calculateSimulationTime();
  let offset = 0;

  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

  // const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion
  // Use custom interval unless doing rise/set lookangles - then use 1 second
  let lookanglesInterval = satellite.isRiseSetLookangles ? 1 : satellite.lookanglesInterval;

  let looksArray = [];
  for (let i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += lookanglesInterval) {
    offset = i * 1000; // Offset in seconds (msec * 1000)
    let now = timeManager.getOffsetTimeObj(offset, simulationTime);
    let looksPass = getTearData(now, satrec, sensor);
    if (looksPass.time !== '') {
      looksArray.push(<TearrData>looksPass); // Update the table with looks for this 5 second chunk and then increase table counter by 1

      // i = i + (orbitalPeriod * 60 * 0.75); // Jump 3/4th to the next orbit
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
    var tbl = <HTMLTableElement>document.getElementById('looks'); // Identify the table to update
    tbl.innerHTML = ''; // Clear the table from old object data
    var tr = tbl.insertRow();
    var tdT = tr.insertCell();
    tdT.appendChild(document.createTextNode('Time'));
    tdT.setAttribute('style', 'text-decoration: underline');
    var tdE = tr.insertCell();
    tdE.appendChild(document.createTextNode('El'));
    tdE.setAttribute('style', 'text-decoration: underline');
    var tdA = tr.insertCell();
    tdA.appendChild(document.createTextNode('Az'));
    tdA.setAttribute('style', 'text-decoration: underline');
    var tdR = tr.insertCell();
    tdR.appendChild(document.createTextNode('Rng'));
    tdR.setAttribute('style', 'text-decoration: underline');

    for (let i = 0; i < looksArray.length; i++) {
      let tr;
      if (tbl.rows.length > 0) {
        for (let r = 0; r < tbl.rows.length; r++) {
          var dateString = tbl.rows[r].cells[0].textContent;

          var sYear = parseInt(dateString.substr(0, 4)); // UTC Year
          var sMon = parseInt(dateString.substr(5, 2)) - 1; // UTC Month in MMM prior to converting
          var sDay = parseInt(dateString.substr(8, 2)); // UTC Day
          var sHour = parseInt(dateString.substr(11, 2)); // UTC Hour
          var sMin = parseInt(dateString.substr(14, 2)); // UTC Min
          var sSec = parseInt(dateString.substr(17, 2)); // UTC Sec

          var topTime = new Date(sYear, sMon, sDay, sHour, sMin, sSec); // New Date object of the future collision

          // Date object defaults to local time.
          topTime.setUTCDate(sDay); // Move to UTC day.
          topTime.setUTCHours(sHour); // Move to UTC Hour

          if (new Date(looksArray[i].time) < topTime) {
            tr = tbl.insertRow(i);
            break;
          }
        }
      }

      if (tr == null) {
        tr = tbl.insertRow();
      }

      let tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(looksArray[i].time, 'isoDateTime', false)));
      // tdT.style.border = '1px solid black';
      let tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode(looksArray[i].el.toFixed(1)));
      let tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode(looksArray[i].az.toFixed(0)));
      let tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode(looksArray[i].rng.toFixed(0)));
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

  const simulationTime = timeManager.calculateSimulationTime();
  let offset = 0;

  // Get Satellite Info
  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
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
        i = i + orbitalPeriod * 60 * 0.75; // Jump 3/4th to the next orbit
      }
    }
  }

  multiSiteArray.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  satellite.lastMultiSiteArray = multiSiteArray;

  // Populate the Side Menu
  populateMultiSiteTable(multiSiteArray);

  isResetToDefault ? sensorManager.setCurrentSensor(sensorManager.defaultSensor) : sensorManager.setCurrentSensor(sensorManager.tempSensor);
};

// satellite.satSensorFOV = (sat1, sat2) => {
//   // Set default timing settings. These will be changed to find look angles at different times in future.
//   let propOffset, propRealTimeTemp, now;
//   try {
//     propOffset = timeManager.getPropOffset() || 0;
//     propRealTimeTemp = Date.now();
//     now = timeManager.getOffsetTimeObj(propOffset, propRealTimeTemp);
//   } catch {
//     now = new Date();
//   }

//   let _getEcf = (now, satrec) => {
//     let j = jday(
//       now.getUTCFullYear(),
//       now.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
//       now.getUTCDate(),
//       now.getUTCHours(),
//       now.getUTCMinutes(),
//       now.getUTCSeconds()
//     ); // Converts time to jday (TLEs use epoch year/day)
//     j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
//     let gmst = satellite.gstime(j);

//     let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
//     let positionEci = satellite.sgp4(satrec, m);

//     return satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
//   };

//   // let satrec1 = satellite.twoline2satrec(sat1.TLE1, sat1.TLE2); // perform and store sat init calcs
//   // let sat1Ecf = _getEcf(now, satrec1);
//   // let satrec2 = satellite.twoline2satrec(sat2.TLE1, sat2.TLE2); // perform and store sat init calcs
//   // let sat2Ecf = _getEcf(now, satrec2);

//   // console.log(sat1Ecf);
//   // console.log(sat2Ecf);
//   // Find the ECI position of the Selected Satellite
//   /*
//   satSelPosX = satPos[satelliteSelected[snum] * 3];
//   satSelPosY = satPos[satelliteSelected[snum] * 3 + 1];
//   satSelPosZ = satPos[satelliteSelected[snum] * 3 + 2];
//   satSelPosEcf = { x: satSelPosX, y: satSelPosY, z: satSelPosZ };
//     satSelPos = satellite.ecfToEci(satSelPosEcf, gmst);

//     // Find the Lat/Long of the Selected Satellite
//     satSelGeodetic = satellite.eciToGeodetic(satSelPos, gmst); // pv.position is called positionEci originally
//     satalt = satSelGeodetic.alt;
//     satSelPosEarth = {
//         lon: satSelGeodetic.lon,
//         lat: satSelGeodetic.lat,
//         alt: 1,
//     };

//     deltaLatInt = 1;
//     if (satalt < 2500 && objectManager.selectedSatFOV <= 60)
//         deltaLatInt = 0.5;
//     if (satalt > 7000 || objectManager.selectedSatFOV >= 90)
//         deltaLatInt = 2;
//     if (satelliteSelected.length > 1) deltaLatInt = 2;
//     for (deltaLat = -60; deltaLat < 60; deltaLat += deltaLatInt) {
//         lat =
//             Math.max(
//                 Math.min(
//                     Math.round(satSelGeodetic.lat * RAD2DEG) +
//                         deltaLat,
//                     90
//                 ),
//                 -90
//             ) * DEG2RAD;
//         if (lat > 90) continue;
//         deltaLonInt = 1; // Math.max((Math.abs(lat)*RAD2DEG/15),1);
//         if (satalt < 2500 && objectManager.selectedSatFOV <= 60)
//             deltaLonInt = 0.5;
//         if (satalt > 7000 || objectManager.selectedSatFOV >= 90)
//             deltaLonInt = 2;
//         if (satelliteSelected.length > 1) deltaLonInt = 2;
//         for (deltaLon = 0; deltaLon < 181; deltaLon += deltaLonInt) {
//             // //////////
//             // Add Long
//             // //////////
//             long = satSelGeodetic.lon + deltaLon * DEG2RAD;
//             satSelPosEarth = { lon: long, lat: lat, alt: 15 };
//             // Find the Az/El of the position on the earth
//             lookangles = satellite.ecfToLookAngles(
//                 satSelPosEarth,
//                 satSelPosEcf
//             );
//             // az = lookangles.az;
//             el = lookangles.el;
//             // rng = lookangles.rng;

//             if (
//                 el * RAD2DEG > 0 &&
//                 90 - el * RAD2DEG < objectManager.selectedSatFOV
//             ) {
//                 satSelPosEarth = satellite.geodeticToEcf(satSelPosEarth);

//                 if (i === len) {
//                     console.debug('Ran out of Markers');
//                     continue; // Only get so many markers.
//                 }
//                 satCache[i].active = true;

//                 satPos[i * 3] = satSelPosEarth.x;
//                 satPos[i * 3 + 1] = satSelPosEarth.y;
//                 satPos[i * 3 + 2] = satSelPosEarth.z;

//                 satVel[i * 3] = 0;
//                 satVel[i * 3 + 1] = 0;
//                 satVel[i * 3 + 2] = 0;
//                 i++;
//             }
//             // //////////
//             // Minus Long
//             // //////////
//             if (deltaLon === 0 || deltaLon === 180) continue; // Don't Draw Two Dots On the Center Line
//             long = satSelGeodetic.lon - deltaLon * DEG2RAD;
//             satSelPosEarth = { lon: long, lat: lat, alt: 15 };
//             // Find the Az/El of the position on the earth
//             lookangles = satellite.ecfToLookAngles(
//                 satSelPosEarth,
//                 satSelPosEcf
//             );
//             // az = lookangles.az;
//             el = lookangles.el;
//             // rng = lookangles.rng;

//             if (
//                 el * RAD2DEG > 0 &&
//                 90 - el * RAD2DEG < objectManager.selectedSatFOV
//             ) {
//                 satSelPosEarth = satellite.geodeticToEcf(satSelPosEarth);

//                 if (i === len) {
//                     console.debug('Ran out of Markers');
//                     continue; // Only get so many markers.
//                 }
//                 satCache[i].active = true;

//                 satPos[i * 3] = satSelPosEarth.x;
//                 satPos[i * 3 + 1] = satSelPosEarth.y;
//                 satPos[i * 3 + 2] = satSelPosEarth.z;

//                 satVel[i * 3] = 0;
//                 satVel[i * 3 + 1] = 0;
//                 satVel[i * 3 + 2] = 0;
//                 i++;
//             }

//             if (lat === 90 || lat === -90) break; // One Dot for the Poles
//         }
//     }
//     */
//   return;
// };
/* istanbul ignore next */
export const findCloseObjects = () => {
  const { satSet } = keepTrackApi.programs;
  const searchRadius = 50; // km

  let csoList = [];
  let satList = <SatObject[]>[];

  // Short internal function to find the satellites position
  const _getSatPos = (offset: number, satrec: SatRec): Eci => {
    try {
      const now = new Date(); // Make a time variable
      now.setTime(Number(Date.now()) + offset); // Set the time variable to the time in the future
      const { m } = calculateTimeVariables(now, satrec);
      return satellite.sgp4(satrec, m);
    } catch {
      return { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } };
    }
  };

  // Loop through all the satellites
  for (let i = 0; i < satSet.numSats; i++) {
    // Get the satellite
    const sat = satSet.getSat(i);
    // Avoid unnecessary errors
    if (typeof sat.TLE1 == 'undefined') continue;
    // Only look at satellites in LEO
    if (sat.apogee > 5556) continue;
    // Find where the satellite is right now
    sat.satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs)
    sat.position = _getSatPos(0, sat.satrec).position;
    // If it fails, skip it
    if (sat.position === { x: 0, y: 0, z: 0 }) continue;
    // Add the satellite to the list
    satList.push(sat);
  }

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

  let csoListUnique = Array.from(new Set(csoList));

  const csoStrArr = []; // Clear CSO List
  satList = []; // Clear CSO List

  // Loop through the possible CSOs
  for (let i = 0; i < csoListUnique.length; i++) {
    // Calculate the first CSO's position 30 minutes later
    let sat = csoListUnique[i].sat1;
    let eci = _getSatPos(1000 * 60 * 30, sat.satrec);
    if (eci.position === { x: 0, y: 0, z: 0 }) continue;
    csoListUnique[i].sat1.position = eci.position;

    // Calculate the second CSO's position 30 minutes later
    sat = csoListUnique[i].sat2;
    eci = _getSatPos(1000 * 60 * 30, sat.satrec);
    if (eci.position === { x: 0, y: 0, z: 0 }) continue;
    sat.position = eci.position;
    csoListUnique[i].sat2.position = eci.position;
  }

  // Remove duplicates
  satList = Array.from(new Set(satList));

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
export const calculateLookAngles = (sat: SatObject, sensors: SensorObject[]) => {
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

  const simulationTime = timeManager.calculateSimulationTime();
  let offset = 0;
  var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  var lookanglesTable = []; // Iniially no rows to the table
  var tempLookanglesInterval;

  if (satellite.isRiseSetLookangles) {
    tempLookanglesInterval = satellite.lookanglesInterval;
    satellite.lookanglesInterval = 1;
  }

  for (var i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += satellite.lookanglesInterval) {
    // satellite.lookanglesInterval in seconds
    offset = i * 1000; // Offset in seconds (msec * 1000)
    let now = timeManager.getOffsetTimeObj(offset, simulationTime);
    if (lookanglesTable.length <= 5000) {
      // Maximum of 1500 lines in the look angles table
      let lookanglesRow = getTearData(now, satrec, [sensor]);
      if (lookanglesRow.time !== '') {
        lookanglesTable.push(lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1
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
      let satId = satArray[i];
      if (typeof satId == 'undefined' || satId == null || satId == '' || satId == ' ') continue;
      let sat = satSet.getSatFromObjNum(parseInt(satId));
      let satPasses = satellite.findBestPass(sat, [sensor], 0);
      for (let s = 0; s < satPasses.length; s++) {
        tableSatTimes.push(satPasses[s]);
        // }
      }
    } catch (e) {
      console.debug(e);
    }
  }
  let sortedTableSatTimes = tableSatTimes.sort((a, b) => b.sortTime - a.sortTime);
  sortedTableSatTimes.reverse();

  sortedTableSatTimes.forEach(function (v) {
    delete v.sortTime;
  });

  for (let i = 0; i < sortedTableSatTimes.length; i++) {
    sortedTableSatTimes[i].startDate = sortedTableSatTimes[i].startDate.toISOString().split('T')[0];
    sortedTableSatTimes[i].startTime = sortedTableSatTimes[i].startTime.toISOString().split('T')[1].split('.')[0];
    sortedTableSatTimes[i].stopDate = sortedTableSatTimes[i].stopDate.toISOString().split('T')[0];
    sortedTableSatTimes[i].stopTime = sortedTableSatTimes[i].stopTime.toISOString().split('T')[1].split('.')[0];
  }

  saveCsv(sortedTableSatTimes, 'bestSatTimes');
};
/* istanbul ignore next */
export const findBestPass = (sat: SatObject, sensors: SensorObject[]) => {
  const { sensorManager, timeManager } = keepTrackApi.programs;

  (function _inputValidation() {
    // Check if there is a sensor
    if (typeof sensors == 'undefined') {
      // Try using the current sensors if there is one
      if (sensorManager.checkSensorSelected()) {
        sensors = sensorManager.currentSensor;
      } else {
        console.debug('findBestPass requires a sensor!');
        return;
      }
      // Simple Error Checking
    } else {
      if (typeof sensors[0].obsminaz == 'undefined') {
        console.debug('sensor format incorrect');
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

  const simulationTime = timeManager.calculateSimulationTime();
  let offset = 0;

  var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  var lookanglesTable = []; // Iniially no rows to the table

  let looksInterval = 5;
  let looksLength = 7;

  // Setup flags for passes
  let score = 0;
  let sAz = <string | null>null;
  let sEl = <string | null>null;
  let srng = <string | null>null;
  let sTime = <number | null>null;
  let passMinrng = sensor.obsmaxrange; // This is set each look to find minimum rng (start at max rng)
  let passMaxEl = 0;
  let start3 = false;
  let stop3 = false;

  let orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

  let _propagateBestPass = (now: Date, satrec: SatRec) => {
    let aer = satellite.getRae(now, satrec, sensor);
    let isInFOV = satellite.checkIsInView(sensor, aer);

    if (isInFOV) {
      // Previous Pass to Calculate first line of coverage
      let now1 = timeManager.getOffsetTimeObj(offset - looksInterval * 1000, simulationTime);
      let aer1 = satellite.getRae(now1, satrec, sensor);

      let isInFOV1 = satellite.checkIsInView(sensor, aer1);
      if (!isInFOV1) {
        // if it starts around 3
        if (aer.el <= 3.5) {
          start3 = true;
        }

        // First Line of Coverage
        sTime = now.getTime();
        sAz = aer.az.toFixed(0);
        sEl = aer.el.toFixed(1);
        srng = aer.rng.toFixed(0);
      } else {
        // Next Pass to Calculate Last line of coverage
        let now1 = timeManager.getOffsetTimeObj(offset + looksInterval * 1000, simulationTime);
        aer1 = satellite.getRae(now1, satrec, sensor);

        isInFOV1 = satellite.checkIsInView(sensor, aer1);
        if (!isInFOV1) {
          // if it stops around 3
          stop3 = aer.el <= 3.5;

          score = Math.min((((now.getTime() - sTime) / 1000 / 60) * 10) / 8, 10); // 8 minute pass is max score
          let elScore = Math.min((passMaxEl / 50) * 10, 10); // 50 el or above is max score
          // elScore -= Math.max((passMaxEl - 50) / 5, 0); // subtract points for being over 50 el
          elScore *= start3 && stop3 ? 2 : 1; // Double points for start and stop at 3
          score += elScore;
          score += Math.min((10 * 750) / passMinrng, 10); // 750 or less is max score
          // score -= Math.max((750 - passMinrng) / 10, 0); // subtract points for being closer than 750

          let tic = 0;
          try {
            tic = (now.getTime() - sTime) / 1000;
          } catch (e) {
            tic = 0;
          }

          // Skip pass if satellite is in track right now
          if (sTime == null) return {};

          // Last Line of Coverage
          return {
            sortTime: sTime,
            scc: satrec.satnum,
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
    return {};
  };

  for (var i = 0; i < looksLength * 24 * 60 * 60; i += looksInterval) {
    // satellite.lookanglesInterval in seconds
    offset = i * 1000; // Offset in seconds (msec * 1000)
    let now = timeManager.getOffsetTimeObj(offset, simulationTime);
    if (lookanglesTable.length <= 5000) {
      // Maximum of 1500 lines in the look angles table
      let lookanglesRow = _propagateBestPass(now, satrec);
      // If data came back...
      if (typeof lookanglesRow.score !== 'undefined') {
        lookanglesTable.push(lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1
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
        i = i + orbitalPeriod * 60 * 0.75; // Jump 3/4th to the next orbit
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
  const gmst = satellite.gstime(j);

  const m = satrec ? (j - satrec.jdsatepoch) * MINUTES_PER_DAY : null;

  return { gmst, m, j };
};

export const getRae = (now: Date, satrec: SatRec, sensor: SensorObject) => {
  const { gmst, m } = calculateTimeVariables(now, satrec);
  let positionEci = satellite.sgp4(satrec, m);
  let positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
  sensor.observerGd ??= { lat: sensor.lat * DEG2RAD, lon: sensor.lon * DEG2RAD, alt: sensor.alt };

  let lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
  let az = lookAngles.az * RAD2DEG;
  let el = lookAngles.el * RAD2DEG;
  let rng = lookAngles.rng;
  return { az, el, rng };
};

// NOTE: This is still in development and not used in the app
/* istanbul ignore next */
// satellite.genMlData = {
//   eci2inc: (start: number, stop: number) => {
//     const { timeManager, satSet } = keepTrackApi.programs;

//     let startTime = timeManager.calculateSimulationTime();
//     let trainData = [];
//     let trainTarget = [];
//     let testData = [];
//     let testTarget = [];
//     let satEciData = [];
//     //   let propLength = 1000 * 60 * 1440; //ms
//     let satData = satSet.satData;
//     let tt = 0;
//     let badSat = false;
//     for (let s = start; s < stop; s++) {
//       if (satData[s].static) break;
//       satEciData = [];
//       // console.log(satData[s].sccNum);
//       for (let i = 0; i < 3; i++) {
//         satEciData[i] = [];
//         let now = new Date(startTime.getTime() * 1 + 1000 * 60 * 2 * s * i);
//         let satrec = satellite.twoline2satrec(satData[s].TLE1, satData[s].TLE2); // perform and store sat init calcs
//         const { m } = calculateTimeVariables(now, satrec);
//         let positionEci = satellite.sgp4(satrec, m);
//         try {
//           satEciData[i].push(now.getTime() * 1, positionEci.position.x, positionEci.position.y, positionEci.position.z, positionEci.velocity.x, positionEci.velocity.y, positionEci.velocity.z);
//         } catch (e) {
//           badSat = true;
//           break;
//         }
//       }

//       if (badSat) {
//         badSat = false;
//         continue;
//       }

//       if (tt == 5) {
//         tt = 0;
//         testData.push(satEciData);
//         testTarget.push([satData[s].inclination * RAD2DEG, satData[s].raan * RAD2DEG, satData[s].eccentricity, satData[s].argPe * RAD2DEG, satData[s].meanMotion]);
//       } else {
//         trainData.push(satEciData);
//         trainTarget.push([satData[s].inclination * RAD2DEG, satData[s].raan * RAD2DEG, satData[s].eccentricity, satData[s].argPe * RAD2DEG, satData[s].meanMotion]);
//       }
//       tt++;
//     }
//     console.log(trainData.length);
//     console.log(trainTarget.length);
//     console.log(testData.length);
//     console.log(testTarget.length);
//     saveVariable(trainData, 'train-data.json');
//     saveVariable(trainTarget, 'train-target.json');
//     saveVariable(testData, 'test-data.json');
//     saveVariable(testTarget, 'test-target.json');
//   },
//   tlePredict: (start: number, stop: number) => {
//     const { timeManager, satSet } = keepTrackApi.programs;

//     let startTime = timeManager.calculateSimulationTime();
//     let satEciDataArray = [];
//     let satEciData = [];
//     //   let propLength = 1000 * 60 * 1440; //ms
//     let satData = satSet.satData;
//     //   let tt = 0;
//     let badSat = false;
//     for (let s = start; s < stop; s++) {
//       if (satData[s].static) break;
//       satEciData = [];
//       // console.log(satData[s].sccNum);
//       for (let i = 0; i < 3; i++) {
//         satEciData[i] = [];
//         let now = new Date(startTime.getTime() * 1 + 1000 * 10 * i);
//         let satrec = satellite.twoline2satrec(satData[s].TLE1, satData[s].TLE2); // perform and store sat init calcs
//         const { m } = calculateTimeVariables(now, satrec);
//         let positionEci = satellite.sgp4(satrec, m);
//         try {
//           satEciData[i].push(now.getTime() * 1, positionEci.position.x, positionEci.position.y, positionEci.position.z, positionEci.velocity.x, positionEci.velocity.y, positionEci.velocity.z);
//         } catch (e) {
//           badSat = true;
//           break;
//         }
//       }

//       if (badSat) {
//         badSat = false;
//         continue;
//       }

//       satEciDataArray.push(satEciData);
//     }
//     console.log(satEciDataArray.length);
//     saveVariable(satEciDataArray, 'metObs.json');
//   },
// };

export const eci2Rae = (now: Date, eci: EciArr3, sensor: SensorObject) => {
  now = new Date(now);
  const { gmst } = calculateTimeVariables(now);

  let positionEcf = satellite.eciToEcf(eci, gmst); // positionEci.position is called positionEci originally
  let lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
  let az = lookAngles.az * RAD2DEG;
  let el = lookAngles.el * RAD2DEG;
  let rng = lookAngles.rng;
  return { az: az, el: el, rng: rng };
};
export const getEci = (sat: SatObject, now: Date) => {
  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const { m } = calculateTimeVariables(now, satrec);

  return satellite.sgp4(satrec, m);
};
/* istanbul ignore next */
export const findNearbyObjectsByOrbit = (sat: SatObject) => {
  const { satSet } = keepTrackApi.programs;

  let catalog = satSet.satData;
  let possibleMatches = [];
  let maxPeriod = sat.period * 1.05;
  let minPeriod = sat.period * 0.95;
  let maxInclination = sat.inclination * 1.025;
  let minInclination = sat.inclination * 0.975;
  let maxRaan = sat.raan * 1.025;
  let minRaan = sat.raan * 0.975;
  for (let ss = 0; ss < catalog.length; ss++) {
    let sat2 = catalog[ss];
    if (sat2.static) break;
    if (sat2.period > maxPeriod || sat2.period < minPeriod) continue;
    if (sat2.inclination > maxInclination || sat2.inclination < minInclination) continue;
    if (sat2.raan > maxRaan || sat2.raan < minRaan) continue;
    possibleMatches.push(sat2.id);
  }

  return possibleMatches;
};
// satellite.findClosestApproachTime = (sat1: SatObject, sat2: SatObject, propOffset: number, propLength: number) => {
//   const { timeManager } = keepTrackApi.programs;
//   const simulationTime = timeManager.calculateSimulationTime();
//   let offset = 0;

//   if (typeof propLength == 'undefined') propLength = 1440 * 60; // 1 Day
//   let minDistance = 1000000;
//   for (let t = 0; t < propLength; t++) {
//     offset = t * 1000; // Offset in seconds (msec * 1000)
//     let now = timeManager.getOffsetTimeObj(offset, simulationTime);
//     let sat1Pos = satellite.getEci(sat1, now);
//     let sat2Pos = satellite.getEci(sat2, now);
//     let distance = Math.sqrt((sat1Pos.position.x - sat2Pos.position.x) ** 2 + (sat1Pos.position.y - sat2Pos.position.y) ** 2 + (sat1Pos.position.z - sat2Pos.position.z) ** 2);
//     if (distance < minDistance) {
//       minDistance = distance;
//       return {
//         time: now,
//         propOffset: propOffset + t * 1000,
//         dist: distance,
//         velX: sat1Pos.velocity.x - sat2Pos.velocity.x,
//         velY: sat1Pos.velocity.y - sat2Pos.velocity.y,
//         velZ: sat1Pos.velocity.z - sat2Pos.velocity.z,
//       };
//     }
//   }

//   // Go to closest approach time
//   // timeManager.propOffset = distArray.propOffset;
//   // satCruncher.postMessage({
//   //     // Tell satCruncher we have changed times for orbit calculations
//   //     typ: 'offset',
//   //     dat:
//   //         timeManager.propOffset.toString() +
//   //         ' ' +
//   //         (1.0).toString(),
//   // });
//   // timeManager.dynamicOffsetEpoch = Date.now(); // Reset realtime...this might not be necessary...
//   // timeManager.calculateSimulationTime();

//   return {
//     time: new Date(),
//     propOffset: 0,
//     dist: -1,
//     velX: -1,
//     velY: -1,
//     velZ: -1,
//   };
// };
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

//   var currentEpoch = satellite.currentEpoch(timeManager.calculateSimulationTime());
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
//   if (satellite.altitudeCheck(iTLE1, iTLE2, timeManager.calculateSimulationTime()) > 1) {
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
const checkIsInView = (sensor: SensorObject, rae: { rng: number; az: number; el: number }): boolean => {
  const { az, el, rng } = rae;

  if (sensor.obsminaz > sensor.obsmaxaz) {
    if (
      ((az >= sensor.obsminaz || az <= sensor.obsmaxaz) && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
      ((az >= sensor.obsminaz2 || az <= sensor.obsmaxaz2) && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
    ) {
      return true;
    } else {
      return false;
    }
  } else {
    if (
      (az >= sensor.obsminaz && az <= sensor.obsmaxaz && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
      (az >= sensor.obsminaz2 && az <= sensor.obsmaxaz2 && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
    ) {
      return true;
    } else {
      return false;
    }
  }
};

export const updateDopsTable = (lat: number, lon: number, alt: number) => {
  const { timeManager } = keepTrackApi.programs;

  try {
    let tbl = <HTMLTableElement>document.getElementById('dops'); // Identify the table to update
    tbl.innerHTML = ''; // Clear the table from old object data

    // let tblLength = 0;
    const simulationTime = timeManager.calculateSimulationTime();
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
  propTime ??= timeManager.calculateSimulationTime();

  const { gmst } = calculateTimeVariables(propTime);

  let inViewList = [];
  groupsManager.GPSGroup.sats.forEach((satObj: SatGroupCollection) => {
    const sat = satSet.getSat(satObj.satId);
    const lookAngles = satellite.ecfToLookAngles({ lon: lon, lat: lat, alt: alt }, satellite.eciToEcf(sat.position, gmst));
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
    // console.debug("Need More Satellites");
    return dops;
  }

  var A = <any>numeric.rep([nsat, 4], 0);
  var azlist = [];
  var ellist = [];
  for (var n = 1; n <= nsat; n++) {
    var cursat = satList[n - 1];

    var az = cursat.az;
    var el = cursat.el;

    azlist.push(az);
    ellist.push(el);
    var B = [
      Math.cos((el * Math.PI) / 180.0) * Math.sin((az * Math.PI) / 180.0),
      Math.cos((el * Math.PI) / 180.0) * Math.cos((az * Math.PI) / 180.0),
      Math.sin((el * Math.PI) / 180.0),
      1,
    ];
    numeric.setBlock(A, [n - 1, 0], [n - 1, 3], [B]);
  }
  var Q = <any>numeric.dot(numeric.transpose(A), A);
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
// satellite.radarMaxrng = (pW: number, aG: number, rcs: number, minSdB: number, fMhz: number): number => {
//   // let powerInWatts = 325 * 1792;
//   // let antennaGain = 2613000000;
//   // let minimumDetectableSignaldB;
//   let minSW = Math.pow(10, (minSdB - 30) / 10);
//   // let frequencyMhz = 435;
//   let fHz = (fMhz *= Math.pow(10, 6));

//   let numer = pW * Math.pow(aG, 2) * rcs * Math.pow(3 * Math.pow(10, 8), 2);
//   let denom = minSW * Math.pow(4 * Math.PI, 3) * Math.pow(fHz, 2);

//   let rng = Math.sqrt(Math.sqrt(numer / denom));
//   return rng;
// };

// satellite.radarMinSignal = (pW: number, aG: number, rcs: number, rng: number, fMhz: number): number => {
//   // let powerInWatts = 325 * 1792;
//   // let antennaGain = 2613000000;
//   // let minimumDetectableSignaldB;
//   // let frequencyMhz = 435;
//   let fHz = (fMhz *= Math.pow(10, 6));

//   let numer = pW * Math.pow(aG, 2) * rcs * Math.pow(3 * Math.pow(10, 8), 2);
//   let denom = rng ** 4 * Math.pow(4 * Math.PI, 3) * Math.pow(fHz, 2);

//   let minSW = numer / denom;
//   let minSdB = Math.log10(minSW);
//   return minSdB;
// };
export const getSunDirection = (jd: number): EciArr3 => {
  const n = jd - 2451545;
  let L = 280.46 + 0.9856474 * n; // mean longitude of sun
  let g = 357.528 + 0.9856003 * n; // mean anomaly
  L = L % 360.0;
  g = g % 360.0;

  const ecLon = L + 1.915 * Math.sin(g * DEG2RAD) + 0.02 * Math.sin(2 * g * DEG2RAD);

  const t = (jd - 2451545) / 3652500;

  const obliq =
    84381.448 -
    4680.93 * t -
    1.55 * Math.pow(t, 2) +
    1999.25 * Math.pow(t, 3) -
    51.38 * Math.pow(t, 4) -
    249.67 * Math.pow(t, 5) -
    39.05 * Math.pow(t, 6) +
    7.12 * Math.pow(t, 7) +
    27.87 * Math.pow(t, 8) +
    5.79 * Math.pow(t, 9) +
    2.45 * Math.pow(t, 10);

  const ob = obliq / 3600.0;

  const x = DISTANCE_TO_SUN * Math.cos(ecLon * DEG2RAD);
  const y = DISTANCE_TO_SUN * Math.cos(ob * DEG2RAD) * Math.sin(ecLon * DEG2RAD);
  const z = DISTANCE_TO_SUN * Math.sin(ob * DEG2RAD) * Math.sin(ecLon * DEG2RAD);

  return [x, y, z];
};
export const getSunTimes = (sat: SatObject, sensors?: SensorObject[], searchLength?: number, interval?: number) => {
  const { timeManager, sensorManager } = keepTrackApi.programs;

  sensors = verifySensors(sensors, sensorManager);
  // TOOD: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  // If length and interval not set try to use defaults
  searchLength ??= satellite.lookanglesLength;
  interval ??= satellite.lookanglesInterval;

  const simulationTime = timeManager.calculateSimulationTime();
  let offset = 0;
  const satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  let minDistanceApart = 100000000000; // Arbitrarily large number
  // var minDistTime;
  for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
    // 5second Looks
    offset = i * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    const { m, j, gmst } = calculateTimeVariables(now, satrec);

    const [sunX, sunY, sunZ] = getSunDirection(j);
    const eci = satellite.sgp4(satrec, m).position;

    const distX = Math.pow(sunX - eci.x, 2);
    const distY = Math.pow(sunY - eci.y, 2);
    const distZ = Math.pow(sunZ - eci.z, 2);
    const dist = Math.sqrt(distX + distY + distZ);

    const positionEcf = satellite.eciToEcf(eci, gmst);
    const lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);

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
          // minDistTime = now;
        }
      }
    } else {
      if (
        (az >= sensor.obsminaz && az <= sensor.obsmaxaz && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
        (az >= sensor.obsminaz2 && az <= sensor.obsmaxaz2 && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
      ) {
        if (dist < minDistanceApart) {
          minDistanceApart = dist;
          // minDistTime = now;
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

  const site = satellite.geodeticToEcf(geodeticCoords);
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

  const now = timeManager.calculateSimulationTime();
  const { gmst } = calculateTimeVariables(now);
  var latLon = satellite.eciToGeodetic({ x: x, y: y, z: z }, gmst);
  latLon.lat = latLon.lat * RAD2DEG;
  latLon.lon = latLon.lon * RAD2DEG;

  // Normalize
  latLon.lon = latLon.lon > 180 ? latLon.lon - 360 : latLon.lon;
  latLon.lon = latLon.lon < -180 ? latLon.lon + 360 : latLon.lon;
  return latLon;
};

export const getLlaTimeView = (now: Date, sat: SatObject) => {
  const { sensorManager } = keepTrackApi.programs;
  const satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

  const { m, gmst } = calculateTimeVariables(now, satrec);
  const positionEci = satellite.sgp4(satrec, m);

  const gpos = satellite.eciToGeodetic(positionEci.position, gmst);
  const lat = satellite.degreesLat(gpos.lat);
  const lon = satellite.degreesLong(gpos.lon);
  const time = dateFormat(now, 'isoDateTime', true);

  const positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
  const lookAngles = satellite.ecfToLookAngles(sensorManager.currentSensor[0].observerGd, positionEcf);
  const az = lookAngles.az * RAD2DEG;
  const el = lookAngles.el * RAD2DEG;
  const rng = lookAngles.rng;
  const inView = checkIsInView(sensorManager.currentSensor[0], { az, el, rng });

  return { lat, lon, time, inView };
};

export const map = (sat: SatObject, i: number): { time: string; lat: number; lon: number; inView: boolean } => {
  const { timeManager } = keepTrackApi.programs;

  // Set default timing settings. These will be changed to find look angles at different times in future.
  const simulationTime = timeManager.calculateSimulationTime();
  let offset = ((i * sat.period) / 50) * 60 * 1000; // Offset in seconds (msec * 1000)
  const now = timeManager.getOffsetTimeObj(offset, simulationTime);

  return getLlaTimeView(now, sat);
};

export const calculateSensorPos = (sensors?: SensorObject[]): { x: number; y: number; z: number; lat: number; lon: number; gmst: number } => {
  const { timeManager, sensorManager } = keepTrackApi.programs;
  sensors = verifySensors(sensors, sensorManager);
  const sensor = sensors[0];

  const now = timeManager.calculateSimulationTime();
  const { gmst } = calculateTimeVariables(now);

  const cosLat = Math.cos(sensor.lat * DEG2RAD);
  const sinLat = Math.sin(sensor.lat * DEG2RAD);
  const cosLon = Math.cos(sensor.lon * DEG2RAD + gmst);
  const sinLon = Math.sin(sensor.lon * DEG2RAD + gmst);

  const pos = {
    x: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * cosLon,
    y: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * sinLon,
    z: (RADIUS_OF_EARTH + PLANETARIUM_DIST) * sinLat,
    gmst: gmst,
    lat: sensor.lat,
    lon: sensor.lon,
  };
  return pos;
};

export type TleParams = {
  sat: SatObject;
  inc: string;
  meanmo: string;
  rasc: string;
  argPe: string;
  meana: string;
  ecen: string;
  epochyr: string;
  epochday: string;
  intl: string;
  scc: string;
};

export const createTle = (tleParams: TleParams): { TLE1: string; TLE2: string } => {
  let { sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc } = tleParams;
  inc = formatInclination(inc);
  meanmo = formatMeanMotion(meanmo);
  rasc = formatRightAscension(rasc);
  argPe = formatArgumentOfPerigee(argPe);
  meana = formatMeanAnomaly(meana);

  const TLE1Ending = sat.TLE1.substr(32, 39);
  const TLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
  const TLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

  return { TLE1, TLE2 };
};

const verifySensors = (sensors: SensorObject[], sensorManager: SensorManager): SensorObject[] => {
  // If no sensor passed to function then try to use the 'currentSensor'
  if (typeof sensors == 'undefined' || sensors == null) {
    if (typeof sensorManager.currentSensor == 'undefined') {
      throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
    } else {
      sensors = sensorManager.currentSensor;
    }
  }
  // If sensor's observerGd is not set try to set it using it parameters
  if (typeof sensors[0].observerGd == 'undefined') {
    try {
      sensors[0].observerGd = {
        alt: sensors[0].alt,
        lat: sensors[0].lat,
        lon: sensors[0].lon,
      };
    } catch (e) {
      throw 'observerGd is not set and could not be guessed.';
    }
  }
  return sensors;
};

export const satellite: SatMath = {
  // Legacy API
  sgp4: Ootk.Sgp4.propagate,
  gstime: Ootk.Sgp4.gstime,
  twoline2satrec: Ootk.Sgp4.createSatrec,
  geodeticToEcf: Ootk.Transforms.lla2ecf,
  ecfToEci: Ootk.Transforms.ecf2eci,
  eciToEcf: Ootk.Transforms.eci2ecf,
  eciToGeodetic: Ootk.Transforms.eci2lla,
  degreesLat: Ootk.Transforms.getDegLat,
  degreesLong: Ootk.Transforms.getDegLon,
  ecfToLookAngles: Ootk.Transforms.ecf2rae,
  // Settings
  lookanglesInterval: 30,
  lookanglesLength: 1,
  isRiseSetLookangles: false,
  currentEpoch,
  distance,
  setobs,
  calculateVisMag,
  altitudeCheck,
  setTEARR,
  lastlooksArray: [],
  lastMultiSiteArray: [],
  getTEARR,
  nextpassList,
  nextNpasses,
  nextpass,
  getlookangles,
  getlookanglesMultiSite,
  findCloseObjects,
  getOrbitByLatLon,
  calculateLookAngles,
  findBestPasses,
  findBestPass,
  eci2Rae,
  getEci,
  findNearbyObjectsByOrbit,
  updateDopsTable,
  getDops,
  getSunTimes,
  getRae,
  lookAngles2Ecf,
  eci2ll,
  calculateDops,
  checkIsInView,
  map,
  calculateSensorPos,
  createTle,
  obsmaxrange: 0,
  obsminrange: 0,
  currentTEARR: {
    time: '',
    az: 0,
    el: 0,
    rng: 0,
    name: '',
  },
};

window.satellite = satellite;

const populateMultiSiteTable = (multiSiteArray: TearrData[]) => {
  // const { timeManager, sensorManager, objectManager, mainCamera, satSet } = keepTrackApi.programs;

  const tbl = <HTMLTableElement>document.getElementById('looksmultisite'); // Identify the table to update
  tbl.innerHTML = ''; // Clear the table from old object data
  const tr = tbl.insertRow();
  const tdT = tr.insertCell();
  tdT.appendChild(document.createTextNode('Time'));
  tdT.setAttribute('style', 'text-decoration: underline');
  const tdR = tr.insertCell();
  tdR.appendChild(document.createTextNode('Rng'));
  tdR.setAttribute('style', 'text-decoration: underline');
  const tdA = tr.insertCell();
  tdA.appendChild(document.createTextNode('Az'));
  tdA.setAttribute('style', 'text-decoration: underline');
  const tdE = tr.insertCell();
  tdE.appendChild(document.createTextNode('El'));
  tdE.setAttribute('style', 'text-decoration: underline');
  const tdS = tr.insertCell();
  tdS.appendChild(document.createTextNode('Sensor'));
  tdS.setAttribute('style', 'text-decoration: underline');

  for (let i = 0; i < multiSiteArray.length; i++) {
    let tr;
    if (tbl.rows.length > 0) {
      // console.log(tbl.rows[0].cells[0].textContent);
      for (let r = 0; r < tbl.rows.length; r++) {
        var dateString = tbl.rows[r].cells[0].textContent;

        var sYear = parseInt(dateString.substr(0, 4)); // UTC Year
        var sMon = parseInt(dateString.substr(5, 2)) - 1; // UTC Month in MMM prior to converting
        var sDay = parseInt(dateString.substr(8, 2)); // UTC Day
        var sHour = parseInt(dateString.substr(11, 2)); // UTC Hour
        var sMin = parseInt(dateString.substr(14, 2)); // UTC Min
        var sSec = parseInt(dateString.substr(17, 2)); // UTC Sec

        var topTime = new Date(sYear, sMon, sDay, sHour, sMin, sSec); // New Date object of the future collision

        // Date object defaults to local time.
        topTime.setUTCDate(sDay); // Move to UTC day.
        topTime.setUTCHours(sHour); // Move to UTC Hour

        if (new Date(multiSiteArray[i].time) < topTime) {
          tr = tbl.insertRow(i);
          break;
        }
      }
    }

    if (tr == null) {
      tr = tbl.insertRow();
    }

    let tdT = tr.insertCell();
    tdT.appendChild(document.createTextNode(dateFormat(multiSiteArray[i].time, 'isoDateTime', true)));
    // tdT.style.border = '1px solid black';
    let tdE = tr.insertCell();
    tdE.appendChild(document.createTextNode(multiSiteArray[i].el.toFixed(1)));
    let tdA = tr.insertCell();
    tdA.appendChild(document.createTextNode(multiSiteArray[i].az.toFixed(0)));
    let tdR = tr.insertCell();
    tdR.appendChild(document.createTextNode(multiSiteArray[i].rng.toFixed(0)));
    let tdS = tr.insertCell();
    tdS.appendChild(document.createTextNode(multiSiteArray[i].name));
    // tdS.onclick = () => {
    //   timeManager.changeStaticOffset(new Date(multiSiteArray[i].time).getTime() - new Date().getTime());
    //   sensorManager.setSensor(sensorManager.sensorList[multiSiteArray[i].name]);
    //   mainCamera.snapToSat(satSet.getSat(objectManager.lastSelectedSat()));
    // };
  }
};
