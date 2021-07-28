/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * lookangles.js is an expansion library for satellite.js providing tailored
 * functions for calculating orbital data.
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

'use strict';
import * as Ootk from 'ootk';
import { PLANETARIUM_DIST, RADIUS_OF_EARTH } from '@app/js/lib/constants.js';
import { saveCsv, saveVariable, stringPad } from './helpers.ts';
import $ from 'jquery';
import { dateFormat } from '@app/js/lib/external/dateFormat.js';
import { keepTrackApi } from '@app/js/api/externalApi.ts';
import { timeManager } from '@app/js/timeManager/timeManager.ts';
let satellite = {};

// Constants
const TAU = 2 * Math.PI;
const DEG2RAD = TAU / 360;
const RAD2DEG = 360 / TAU;
const MINUTES_PER_DAY = 1440;
const MILLISECONDS_PER_DAY = 1.15741e-8;

let settingsManager;

// Legacy API
satellite.sgp4 = Ootk.Sgp4.propagate;
satellite.gstime = Ootk.Sgp4.gstime;
satellite.twoline2satrec = Ootk.Sgp4.createSatrec;
satellite.geodeticToEcf = Ootk.Transforms.lla2ecf;
satellite.ecfToEci = Ootk.Transforms.ecf2eci;
satellite.eciToEcf = Ootk.Transforms.eci2ecf;
satellite.eciToGeodetic = Ootk.Transforms.eci2lla;
satellite.degreesLat = Ootk.Transforms.getDegLat;
satellite.degreesLong = Ootk.Transforms.getDegLon;
satellite.ecfToLookAngles = Ootk.Transforms.ecf2rae;

let satSet, satCruncher, sensorManager, groupsManager;
satellite.initLookangles = () => {
  satSet = keepTrackApi.programs.satSet;
  satCruncher = keepTrackApi.programs.satCruncher;
  sensorManager = keepTrackApi.programs.sensorManager;
  groupsManager = keepTrackApi.programs.groupsManager;
  settingsManager = keepTrackApi.programs.settingsManager;
};

var _propagate = (propTempOffset, satrec, sensor) => {
  let now = new Date(); // Make a time variable
  now.setTime(Number(Date.now()) + propTempOffset); // Set the time variable to the time in the future
  let aer = satellite.getRae(now, satrec, sensor);
  let isInFOV = satellite.checkIsInFOV(sensor, aer);

  if (isInFOV) {
    if (satellite.isRiseSetLookangles) {
      // Previous Pass to Calculate first line of coverage
      var now1 = new Date();
      now1.setTime(Number(now) - 1000);
      let aer1 = satellite.getRae(now1, satrec, sensor);
      let isInFOV1 = satellite.checkIsInFOV(sensor, aer1);

      // Is in FOV and Wasn't Last Time so First Line of Coverage
      if (!isInFOV1) {
        return {
          time: dateFormat(now, 'isoDateTime', true),
          rng: aer.rng,
          az: aer.az,
          el: aer.el,
        };
      } else {
        // Next Pass to Calculate Last line of coverage
        now1.setTime(Number(now) + 1000);
        aer1 = satellite.getRae(now1, satrec, sensor);
        isInFOV1 = satellite.checkIsInFOV(sensor, aer1);

        // Is in FOV and Wont Be Next Time so Last Line of Coverage
        if (!isInFOV1) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: aer.rng,
            az: aer.az,
            el: aer.el,
          };
        }
      }
      return false;
    }
    return {
      time: dateFormat(now, 'isoDateTime', true),
      rng: aer.rng,
      az: aer.az,
      el: aer.el,
    };
  }
  return false;
};

// Settings
satellite.lookanglesInterval = 5;
satellite.lookanglesLength = 2;
satellite.isRiseSetLookangles = false;

satellite.currentEpoch = (currentDate) => {
  currentDate = new Date(currentDate);
  let epochYear = currentDate.getUTCFullYear();
  epochYear = parseInt(epochYear.toString().substr(2, 2));
  let epochDay = stringPad.pad0(timeManager.getDayOfYear(currentDate), 3);
  let timeOfDay = (currentDate.getUTCHours() * 60 + currentDate.getUTCMinutes()) / 1440;
  epochDay = (epochDay + timeOfDay).toFixed(8);
  epochDay = stringPad.pad0(epochDay, 12);
  return [epochYear, epochDay];
};

satellite.distance = (hoverSat, selectedSat) => {
  if (hoverSat == null || selectedSat == null) return '';
  hoverSat = satSet.getSat(hoverSat.id);
  selectedSat = satSet.getSat(selectedSat.id);
  if (selectedSat == null || hoverSat == null) {
    return '';
  }
  if (selectedSat.type === 'Star' || hoverSat.type === 'Star') {
    return '';
  }
  let distanceApartX = Math.pow(hoverSat.position.x - selectedSat.position.x, 2);
  let distanceApartY = Math.pow(hoverSat.position.y - selectedSat.position.y, 2);
  let distanceApartZ = Math.pow(hoverSat.position.z - selectedSat.position.z, 2);
  let distanceApart = Math.sqrt(distanceApartX + distanceApartY + distanceApartZ).toFixed(0);

  let sameBeamStr = '';
  try {
    if (satellite.currentTEARR.inview) {
      if (distanceApart < satellite.currentTEARR.rng * Math.sin(DEG2RAD * sensorManager.currentSensor.beamwidth)) {
        if (satellite.currentTEARR.rng < sensorManager.currentSensor.obsmaxrange && satellite.currentTEARR.rng > 0) {
          sameBeamStr = ' (Within One Beam)';
        }
      }
    }
  } catch {
    // Intentionally Blank
  }

  return '<br />Range: ' + distanceApart + ' km' + sameBeamStr;
};

// TODO: UI element changes/references should be moved to ui.js
// There are a series of referecnes, especially in satellite.obs, to ui elements.
// These should be moved to ui.js and then called before/after calling satellite.setobs
satellite.setobs = (sensor) => {
  try {
    if (typeof sensor == 'undefined' || sensor == null) {
      sensorManager.setCurrentSensor(sensorManager.defaultSensor);
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
    sensorManager.setCurrentSensor(sensor);
    sensorManager.currentSensor.observerGd = {
      // Array to calculate look angles in propagate()
      lat: sensor.lat * DEG2RAD,
      lon: sensor.lon * DEG2RAD,
      alt: parseFloat(sensor.alt), // Converts from string to number
    };
  } catch (error) {
    console.warn(error);
  }
};

satellite.calculateVisMag = (sat, sensor, propTime, sun) => {
  const satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const rae = satellite.getRae(propTime, satrec, sensor);
  const distanceToSatellite = rae.rng; //This is in KM

  const theta = Math.acos(
    self.numeric.dot([-sat.position.x, -sat.position.y, -sat.position.z], [sat.position.x + sun.eci.x, -sat.position.y + sun.eci.y, -sat.position.z + sun.eci.z]) /
      (Math.sqrt(Math.pow(-sat.position.x, 2) + Math.pow(-sat.position.y, 2) + Math.pow(-sat.position.z, 2)) * Math.sqrt(Math.pow(-sat.position.x + sun.eci.x, 2) + Math.pow(-sat.position.y + sun.eci.y, 2) + Math.pow(-sat.position.z + sun.eci.z, 2)))
  );

  // Note sometimes -1.3 is used for this calculation.
  //-1.8 is std. mag for iss
  const intrinsicMagnitude = -1.8;

  const term2 = 5.0 * Math.log10(distanceToSatellite);

  const arg = Math.sin(theta) + (Math.PI - theta) * Math.cos(theta);
  const term3 = -2.5 * Math.log10(arg);

  const apparentMagnitude = intrinsicMagnitude + term2 + term3;
  return apparentMagnitude;
};

satellite.altitudeCheck = (tle1, tle2, propOffset) => {
  let satrec = satellite.twoline2satrec(tle1, tle2); // perform and store sat init calcs

  let propTime = timeManager.propTimeCheck(propOffset, timeManager.propRealTime);
  let j = timeManager.jday(
    propTime.getUTCFullYear(),
    propTime.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
    propTime.getUTCDate(),
    propTime.getUTCHours(),
    propTime.getUTCMinutes(),
    propTime.getUTCSeconds()
  ); // Converts time to jday (TLEs use epoch year/day)
  j += propTime.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  let gmst = satellite.gstime(j);

  let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
  let positionEci = satellite.sgp4(satrec, m);
  let gpos;

  try {
    gpos = satellite.eciToGeodetic(positionEci.position, gmst);
  } catch (e) {
    return 0; // Auto fail the altitude check
  }
  return gpos.alt;
};
satellite.setTEARR = (currentTEARR) => {
  satellite.currentTEARR = currentTEARR;
};
satellite.getTEARR = (sat, sensor, propTime) => {
  let currentTEARR = {}; // Most current TEARR data that is set in satellite object and returned.

  // If no sensor passed to function then try to use the 'currentSensor'
  if (typeof sensor == 'undefined') {
    if (typeof sensorManager.currentSensor != 'undefined') {
      sensor = sensorManager.currentSensor;
    } else {
      throw new Error('getTEARR requires a sensor or for a sensor to be currently selected.');
    }
  }
  // If sensor's observerGd is not set try to set it using it parameters
  if (typeof sensor.observerGd == 'undefined') {
    try {
      sensor.observerGd = {
        alt: sensor.alt,
        lat: sensor.lat,
        lon: sensor.lon,
      };
    } catch (e) {
      throw 'observerGd is not set and could not be guessed.';
    }
    // If it didn't work, try again
    if (typeof sensor.observerGd.lon == 'undefined') {
      try {
        sensor.observerGd = {
          alt: sensor.alt,
          lat: sensor.lat * DEG2RAD,
          lon: sensor.lon * DEG2RAD,
        };
      } catch (e) {
        throw 'observerGd is not set and could not be guessed.';
      }
    }
  }

  // Set default timing settings. These will be changed to find look angles at different times in future.
  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  let now;
  if (typeof propTime != 'undefined') {
    now = propTime;
  } else {
    now = timeManager.propTime();
  }
  let j = timeManager.jday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  ); // Converts time to jday (TLEs use epoch year/day)
  j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  let gmst = satellite.gstime(j);

  let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
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
  } catch (e) {
    currentTEARR.alt = 0;
    currentTEARR.lon = 0;
    currentTEARR.lat = 0;
    currentTEARR.az = 0;
    currentTEARR.el = 0;
    currentTEARR.rng = 0;
  }

  currentTEARR.inview = satellite.checkIsInFOV(sensor, {
    az: currentTEARR.az,
    el: currentTEARR.el,
    rng: currentTEARR.rng,
  });
  satellite.currentTEARR = currentTEARR;
  return currentTEARR;
};

satellite.nextpassList = (satArray) => {
  let nextPassArray = [];
  for (let s = 0; s < satArray.length; s++) {
    let time = satellite.nextNpasses(satArray[s], null, 1000 * 60 * 60 * 24, satellite.lookanglesInterval, settingsManager.nextNPassesCount); // Only do 1 day looks
    for (let i = 0; i < time.length; i++) {
      nextPassArray.push({
        SCC_NUM: satArray[s].SCC_NUM,
        time: time[i],
      });
    }
  }
  return nextPassArray;
};
satellite.nextpass = (sat, sensor, searchLength, interval) => {
  // If no sensor passed to function then try to use the 'currentSensor'
  if (typeof sensor == 'undefined') {
    if (typeof sensorManager.currentSensor == 'undefined') {
      throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
    } else {
      sensor = sensorManager.currentSensor;
    }
  }
  // If sensor's observerGd is not set try to set it using it parameters
  if (typeof sensor.observerGd == 'undefined') {
    try {
      sensor.observerGd = {
        alt: sensor.alt,
        lat: sensor.lat,
        lon: sensor.lon,
      };
    } catch (e) {
      throw 'observerGd is not set and could not be guessed.';
    }
  }
  // If length and interval not set try to use defaults
  if (typeof searchLength == 'undefined') searchLength = satellite.lookanglesLength;
  if (typeof interval == 'undefined') interval = satellite.lookanglesInterval;

  let propOffset = timeManager.getPropOffset();
  let propTempOffset = 0;
  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
    // 5second Looks
    propTempOffset = i * 1000 + propOffset; // Offset in seconds (msec * 1000)
    let now = timeManager.propTimeCheck(propTempOffset, timeManager.propRealTime);
    let aer = satellite.getRae(now, satrec, sensor);

    let isInFOV = satellite.checkIsInFOV(sensor, aer);
    if (isInFOV) {
      return dateFormat(now, 'isoDateTime', true);
    }
  }
  return 'No Passes in ' + satellite.lookanglesLength + ' Days';
};
satellite.nextNpasses = (sat, sensor, searchLength, interval, numPasses) => {
  // If no sensor passed to function then try to use the 'currentSensor'
  if (typeof sensor == 'undefined' || sensor == null) {
    if (typeof sensorManager.currentSensor == 'undefined') {
      throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
    } else {
      sensor = sensorManager.currentSensor;
    }
  }
  // If sensor's observerGd is not set try to set it using it parameters
  if (typeof sensor.observerGd == 'undefined') {
    try {
      sensor.observerGd = {
        alt: sensor.alt,
        lat: sensor.lat,
        lon: sensor.lon,
      };
    } catch (e) {
      throw 'observerGd is not set and could not be guessed.';
    }
  }
  // If length and interval not set try to use defaults
  searchLength = searchLength || satellite.lookanglesLength;
  interval = interval || satellite.lookanglesInterval;
  numPasses = numPasses || 1;

  let passTimesArray = [];
  let propOffset = timeManager.getPropOffset();
  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion
  for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
    // 5second Looks
    // Only pass a maximum of N passes
    if (passTimesArray.length >= numPasses) {
      return passTimesArray;
    }

    let propTempOffset = i + propOffset; // Offset in seconds (msec * 1000)
    let now = timeManager.propTimeCheck(propTempOffset * 1000, timeManager.propRealTime);
    let aer = satellite.getRae(now, satrec, sensor);

    let isInFOV = satellite.checkIsInFOV(sensor, aer);
    if (isInFOV) {
      passTimesArray.push(now);
      i = i + orbitalPeriod * 60 * 0.75; // Jump 3/4th to the next orbit
    }
  }
  return passTimesArray;
};

satellite.lastlooksArray = [];
satellite.getlookangles = (sat) => {
  // Error Checking
  if (!sensorManager.checkSensorSelected()) {
    console.warn('satellite.getlookangles requires a sensor to be set!');
    return;
  }

  let sensor = sensorManager.currentSensor;

  // Set default timing settings. These will be changed to find look angles at different times in future.
  let propOffset = timeManager.getPropOffset();

  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  // const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

  // Use custom interval unless doing rise/set lookangles - then use 1 second
  let lookanglesInterval = satellite.isRiseSetLookangles ? 1 : satellite.lookanglesInterval;

  let looksArray = [];
  for (let i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += lookanglesInterval) {
    let propTempOffset = i * 1000 + propOffset; // Offset in seconds
    let looksPass = _propagate(propTempOffset, satrec, sensor, lookanglesInterval);
    if (looksPass !== false) {
      looksArray.push(looksPass); // Update the table with looks for this 5 second chunk and then increase table counter by 1
      // i = i + (orbitalPeriod * 60 * 0.75); // Jump 3/4th to the next orbit
    }
    if (looksArray.length >= 1500) {
      // Maximum of 1500 lines in the look angles table
      break; // No more updates to the table (Prevent GEO object slowdown)
    }
  }

  looksArray.sort(function (a, b) {
    return new Date(a.time) - new Date(b.time);
  });
  satellite.lastlooksArray = looksArray;

  // Populate the Side Menu
  (function _populateSideMenu() {
    var tbl = document.getElementById('looks'); // Identify the table to update
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

          if (looksArray[i].time < topTime) {
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
};
satellite.lastMultiSiteArray = [];
satellite.getlookanglesMultiSite = (sat) => {
  let isResetToDefault = false;
  if (!sensorManager.checkSensorSelected()) {
    isResetToDefault = true;
  }

  var _propagateMultiSite = (offset, satrec, sensor) => {
    // Setup Realtime and Offset Time
    var propRealTimeTemp = Date.now();
    var now = timeManager.propTimeCheck(offset, propRealTimeTemp);
    let aer = satellite.getRae(now, satrec, sensor);

    let isInFOV = satellite.checkIsInFOV(sensor, aer);
    if (isInFOV) {
      return {
        time: now.toISOString(),
        el: aer.el,
        az: aer.az,
        rng: aer.rng,
        name: sensor.shortName,
      };
    }
    return;
  };

  // Save Current Sensor
  sensorManager.tempSensor = sensorManager.currentSensor;

  // Determine time offset from real time
  let propOffset = timeManager.getPropOffset();

  // Get Satellite Info
  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  const orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

  // Calculate Look Angles
  let multiSiteArray = [];
  for (let sensorIndex = 0; sensorIndex < sensorManager.sensorListUS.length; sensorIndex++) {
    satellite.setobs(sensorManager.sensorListUS[sensorIndex]);
    for (let i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += satellite.lookanglesInterval) {
      // 5second Looks
      let propTempOffset = i * 1000 + propOffset; // Offset in seconds
      let multiSitePass = _propagateMultiSite(propTempOffset, satrec, sensorManager.sensorListUS[sensorIndex]);
      if (typeof multiSitePass != 'undefined') {
        multiSiteArray.push(multiSitePass); // Update the table with looks for this 5 second chunk and then increase table counter by 1
        i = i + orbitalPeriod * 60 * 0.75; // Jump 3/4th to the next orbit
      }
    }
  }
  multiSiteArray.sort(function (a, b) {
    return new Date(a.time) - new Date(b.time);
  });
  satellite.lastMultiSiteArray = multiSiteArray;

  // Populate the Side Menu
  (function _populateSideMenu() {
    var tbl = document.getElementById('looksmultisite'); // Identify the table to update
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
    var tdS = tr.insertCell();
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

          if (multiSiteArray[i].time < topTime) {
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
    }
  })();

  if (isResetToDefault) {
    sensorManager.setCurrentSensor(sensorManager.defaultSensor);
  } else {
    sensorManager.setCurrentSensor(sensorManager.tempSensor);
  }
};

// satellite.satSensorFOV = (sat1, sat2) => {
//   // Set default timing settings. These will be changed to find look angles at different times in future.
//   let propOffset, propRealTimeTemp, now;
//   try {
//     propOffset = timeManager.getPropOffset() || 0;
//     propRealTimeTemp = Date.now();
//     now = timeManager.propTimeCheck(propOffset, propRealTimeTemp);
//   } catch {
//     now = new Date();
//   }

//   let _getEcf = (now, satrec) => {
//     let j = _jday(
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
//                     console.error('Ran out of Markers');
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
//                     console.error('Ran out of Markers');
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

satellite.findCloseObjects = () => {
  const searchRadius = 50; // km

  let csoList = [];
  let satList = [];

  // Short internal function to find the satellites position
  const _getSatPos = (propTempOffset, satrec) => {
    let now = new Date(); // Make a time variable
    now.setTime(Number(Date.now()) + propTempOffset); // Set the time variable to the time in the future
    let j = _jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    // let gmst = satellite.gstime(j);

    let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
    return satellite.sgp4(satrec, m);
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
    sat.position = _getSatPos(0, sat.satrec, sensorManager.currentSensor, satellite.lookanglesInterval).position;
    // If it fails, skip it
    if (typeof sat.position == 'undefined') continue;
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
  csoList = []; // Clear CSO List
  satList = []; // Clear CSO List

  // Loop through the possible CSOs
  for (let i = 0; i < csoListUnique.length; i++) {
    // Calculate the first CSO's position 30 minutes later
    let sat = csoListUnique[i].sat1;
    let pos = _getSatPos(1000 * 60 * 30, sat.satrec, sensorManager.currentSensor, satellite.lookanglesInterval);
    csoListUnique[i].sat1.position = pos.position;

    // Calculate the second CSO's position 30 minutes later
    sat = csoListUnique[i].sat2;
    pos = _getSatPos(1000 * 60 * 30, sat.satrec, sensorManager.currentSensor, satellite.lookanglesInterval);
    sat.position = pos.position;
    csoListUnique[i].sat2.position = pos.position;
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
      csoList.push(sat1.SCC_NUM);
      csoList.push(sat2.SCC_NUM);
    }
  }

  // Generate the search string
  csoListUnique = Array.from(new Set(csoList));
  let searchStr = '';
  for (let i = 0; i < csoListUnique.length; i++) {
    if (i == csoListUnique.length - 1) {
      searchStr += csoListUnique[i];
    } else {
      searchStr += csoListUnique[i] + ',';
    }
  }

  return searchStr; // csoListUnique;
};

// TODO: satellite.getOrbitByLatLon needs cleaned up badly
satellite.getOrbitByLatLon = (sat, goalLat, goalLon, upOrDown, propOffset, goalAlt, rascOffset) => {
  var mainTLE1;
  var mainTLE2;
  var mainMeana;
  var mainRasc;
  var mainArgPer;
  var argPerCalcResults;
  var meanACalcResults;
  // var meanAiValue;
  var lastLat;
  var isUpOrDown;
  var i;

  if (typeof rascOffset == 'undefined') rascOffset = 0;

  var argPerCalc = (argPe) => {
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

    var meana;
    if (typeof mainMeana == 'undefined') {
      meana = (satrec.mo * RAD2DEG).toPrecision(10);
    } else {
      meana = mainMeana;
    }
    meana = meana.split('.');
    meana[0] = meana[0].substr(-3, 3);
    meana[1] = meana[1].substr(0, 4);
    meana = (meana[0] + '.' + meana[1]).toString();
    meana = stringPad.pad0(meana, 8);

    var rasc;
    if (typeof mainRasc == 'undefined') {
      rasc = (sat.raan * RAD2DEG).toPrecision(7);
    } else {
      rasc = mainRasc;
    }
    rasc = rasc.split('.');
    rasc[0] = rasc[0].substr(-3, 3);
    rasc[1] = rasc[1].substr(0, 4);
    rasc = (rasc[0] + '.' + rasc[1]).toString();
    rasc = stringPad.pad0(rasc, 8);
    mainRasc = rasc;

    var scc = sat.SCC_NUM;

    var intl = sat.TLE1.substr(9, 8);
    var inc = (sat.inclination * RAD2DEG).toPrecision(7);
    inc = inc.split('.');
    inc[0] = inc[0].substr(-3, 3);
    inc[1] = inc[1].substr(0, 4);
    inc = (inc[0] + '.' + inc[1]).toString();

    inc = stringPad.pad0(inc, 8);
    var epochyr = sat.TLE1.substr(18, 2);
    var epochday = sat.TLE1.substr(20, 12);

    var meanmo = sat.TLE2.substr(52, 11);

    var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

    argPe = argPe / 10;
    argPe = parseFloat(argPe).toPrecision(7);
    argPe = stringPad.pad0(argPe, 8);

    var TLE1Ending = sat.TLE1.substr(32, 39);

    mainTLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
    mainTLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

    satrec = satellite.twoline2satrec(mainTLE1, mainTLE2);

    var propNewArgPe = getOrbitByLatLonPropagate(propOffset, satrec, 3);
    // if (propNewArgPe === 1) {
    sat.TLE1 = mainTLE1;
    sat.TLE2 = mainTLE2;
    mainArgPer = argPe;
    // }
    // 1 === If RASC within 0.15 degrees then good enough
    // 5 === If RASC outside 15 degrees then rotate RASC faster
    return propNewArgPe;
  };

  var meanaCalc = (meana) => {
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

    meana = meana / 10;
    meana = parseFloat(meana).toPrecision(7);
    meana = stringPad.pad0(meana, 8);

    var rasc = (sat.raan * RAD2DEG).toPrecision(7);
    mainRasc = rasc;
    rasc = rasc.toString().split('.');
    rasc[0] = rasc[0].substr(-3, 3);
    rasc[1] = rasc[1].substr(0, 4);
    rasc = (rasc[0] + '.' + rasc[1]).toString();
    rasc = stringPad.pad0(rasc, 8);

    var scc = sat.SCC_NUM;

    var intl = sat.TLE1.substr(9, 8);
    var inc = (sat.inclination * RAD2DEG).toPrecision(7);
    inc = inc.split('.');
    inc[0] = inc[0].substr(-3, 3);
    inc[1] = inc[1].substr(0, 4);
    inc = (inc[0] + '.' + inc[1]).toString();

    inc = stringPad.pad0(inc, 8);
    var epochyr = sat.TLE1.substr(18, 2);
    var epochday = sat.TLE1.substr(20, 12);

    var meanmo = sat.TLE2.substr(52, 11);

    var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

    var argPe;
    if (typeof mainArgPer == 'undefined') {
      argPe = (sat.argPe * RAD2DEG).toPrecision(7);
    } else {
      argPe = mainArgPer;
    }
    argPe = argPe.split('.');
    argPe[0] = argPe[0].substr(-3, 3);
    argPe[1] = argPe[1].substr(0, 4);
    argPe = (argPe[0] + '.' + argPe[1]).toString();
    argPe = stringPad.pad0(argPe, 8);

    var TLE1Ending = sat.TLE1.substr(32, 39);

    var TLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
    var TLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

    satrec = satellite.twoline2satrec(TLE1, TLE2);
    var propagateResults = getOrbitByLatLonPropagate(propOffset, satrec, 1);
    if (propagateResults === 1) {
      mainTLE1 = TLE1;
      mainTLE2 = TLE2;
      sat.TLE1 = TLE1;
      sat.TLE2 = TLE2;
      mainMeana = meana;
    }
    return propagateResults;
  };

  var rascCalc = (rasc, rascOffset) => {
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
    var meana = mainMeana;

    let rascNum = rasc;
    rasc = rasc / 100;
    if (rasc > 360) {
      rasc = rasc - 360; // angle can't be bigger than 360
    }
    rasc = rasc.toPrecision(7);
    rasc = rasc.split('.');
    rasc[0] = rasc[0].substr(-3, 3);
    rasc[1] = rasc[1].substr(0, 4);
    rasc = (rasc[0] + '.' + rasc[1]).toString();
    rasc = stringPad.pad0(rasc, 8);
    mainRasc = rasc;

    var scc = sat.SCC_NUM;

    var intl = sat.TLE1.substr(9, 8);
    var inc = (sat.inclination * RAD2DEG).toPrecision(7);
    inc = inc.split('.');
    inc[0] = inc[0].substr(-3, 3);
    inc[1] = inc[1].substr(0, 4);
    inc = (inc[0] + '.' + inc[1]).toString();

    inc = stringPad.pad0(inc, 8);
    var epochyr = sat.TLE1.substr(18, 2);
    var epochday = sat.TLE1.substr(20, 12);

    var meanmo = sat.TLE2.substr(52, 11);

    var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

    var argPe;
    if (typeof mainArgPer == 'undefined') {
      argPe = (sat.argPe * RAD2DEG).toPrecision(7);
    } else {
      argPe = mainArgPer;
    }
    argPe = argPe.split('.');
    argPe[0] = argPe[0].substr(-3, 3);
    argPe[1] = argPe[1].substr(0, 4);
    argPe = (argPe[0] + '.' + argPe[1]).toString();
    argPe = stringPad.pad0(argPe, 8);

    var TLE1Ending = sat.TLE1.substr(32, 39);

    mainTLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
    mainTLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

    satrec = satellite.twoline2satrec(mainTLE1, mainTLE2);

    var propNewRasc = getOrbitByLatLonPropagate(propOffset, satrec, 2);

    if (propNewRasc === 1) {
      sat.TLE1 = mainTLE1;

      rasc = rascNum / 100 + rascOffset;
      if (rasc > 360) {
        rasc = rasc - 360; // angle can't be bigger than 360 with offset
      }
      if (rasc < 0) {
        rasc = rasc + 360; // angle can't be less than 360 with offset
      }
      rasc = rasc.toPrecision(7);
      rasc = rasc.split('.');
      rasc[0] = rasc[0].substr(-3, 3);
      rasc[1] = rasc[1].substr(0, 4);
      rasc = (rasc[0] + '.' + rasc[1]).toString();
      rasc = stringPad.pad0(rasc, 8);
      mainRasc = rasc;

      mainTLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

      sat.TLE2 = mainTLE2;
    }

    // 1 === If RASC within 0.15 degrees then good enough
    // 5 === If RASC outside 15 degrees then rotate RASC faster
    return propNewRasc;
  };

  var getOrbitByLatLonPropagate = (propOffset, satrec, type) => {
    timeManager.propRealTime = Date.now();
    var now = timeManager.propTimeCheck(propOffset, timeManager.propRealTime);
    var j = timeManager.jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    var gmst = satellite.gstime(j);

    var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
    var positionEci = satellite.sgp4(satrec, m);
    if (typeof positionEci == 'undefined') {
      console.log(satrec);
    }

    var gpos, lat, lon, alt;

    try {
      gpos = satellite.eciToGeodetic(positionEci.position, gmst);
    } catch (err) {
      console.warn(err);
      return 2;
    }

    lat = satellite.degreesLat(gpos.lat) * 1;
    lon = satellite.degreesLong(gpos.lon) * 1;
    alt = gpos.alt;

    if (lastLat == null) {
      // Set it the first time
      lastLat = lat;
    }

    if (type === 1) {
      if (lat === lastLat) {
        return 0; // Not enough movement, skip this
      }

      if (lat > lastLat) {
        isUpOrDown = 'N';
      }
      if (lat < lastLat) {
        isUpOrDown = 'S';
      }

      lastLat = lat;
    }

    if (lat > goalLat - 0.15 && lat < goalLat + 0.15 && type === 1) {
      // console.log('Lat: ' + lat);
      return 1;
    }

    if (lon > goalLon - 0.15 && lon < goalLon + 0.15 && type === 2) {
      // console.log('Lon: ' + lon);
      return 1;
    }

    if (alt > goalAlt - 30 && alt < goalAlt + 30 && type === 3) {
      return 1;
    }

    // If current latitude greater than 11 degrees off rotate meanA faster
    if (!(lat > goalLat - 11 && lat < goalLat + 11) && type === 1) {
      // console.log('Lat: ' + lat);
      return 5;
    }

    // If current longitude greater than 11 degrees off rotate RASC faster
    if (!(lon > goalLon - 11 && lon < goalLon + 11) && type === 2) {
      return 5;
    }

    // If current altitude greater than 100 km off rotate augPerigee faster
    if ((alt < goalAlt - 100 || alt > goalAlt + 100) && type === 3) {
      // console.log('Lat: ' + lat);
      // console.log('Alt: ' + alt + ' --- MeanMo: ' + satrec.mo * RAD2DEG + ' --- ArgPer: ' + satrec.argpo * RAD2DEG);
      return 5;
    }

    return 0;
  };

  // ===== Mean Anomaly Loop =====
  for (i = 0; i < 520 * 10; i += 1) {
    /** Rotate Mean Anomaly 0.1 Degree at a Time for Up To 400 Degrees */
    meanACalcResults = meanaCalc(i);
    if (meanACalcResults === 1) {
      if (isUpOrDown !== upOrDown) {
        // If Object is moving opposite of the goal direction (upOrDown)
        i = i + 20; // Move 2 Degrees ahead in the orbit to prevent being close on the next lattiude check
      } else {
        // meanAiValue = i;
        break; // Stop changing the Mean Anomaly
      }
    }
    if (meanACalcResults === 5) {
      i += 10 * 10; // Change meanA faster
    }
  }
  if (meanACalcResults === 2) {
    console.warn(`meanACalcResults failed after trying all combinations!`);
    return ['Error', ''];
  }

  // Don't Bother Unless Specifically Requested
  // Applies to eccentric orbits
  // ===== Argument of Perigee Loop =====
  if (typeof goalAlt != 'undefined' && goalAlt !== 0) {
    meanACalcResults = 0; // Reset meanACalcResults
    for (i = 0; i < 360 * 10; i += 1) {
      /** Rotate ArgPer 0.1 Degree at a Time for Up To 400 Degrees */
      argPerCalcResults = argPerCalc(i);
      if (argPerCalcResults === 1) {
        // console.log('Found Correct Alt');
        if (meanACalcResults === 1) {
          // console.log('Found Correct Lat');
          // console.log('Up Or Down: ' + upOrDown);
          if (isUpOrDown === upOrDown) {
            // If Object is moving in the goal direction (upOrDown)
            break; // Stop changing ArgPer
          }
        } else {
          // console.log('Found Wrong Lat');
        }
      } else {
        // console.log('Failed Arg of Per Calc');
      }
      if (argPerCalcResults === 5) {
        i += 5 * 10; // Change ArgPer faster
      }
      if (argPerCalcResults === 2) {
        return ['Error', ''];
      }

      // ===== Mean Anomaly Loop =====
      for (var j = 0; j < 520 * 10; j += 1) {
        /** Rotate Mean Anomaly 0.1 Degree at a Time for Up To 400 Degrees */
        meanACalcResults = meanaCalc(j);
        if (meanACalcResults === 1) {
          if (isUpOrDown !== upOrDown) {
            // If Object is moving opposite of the goal direction (upOrDown)
            j = j + 20; // Move 2 Degrees ahead in the orbit to prevent being close on the next lattiude check
          } else {
            break; // Stop changing the Mean Anomaly
          }
        }
        if (meanACalcResults === 5) {
          j += 10 * 10; // Change meanA faster
        }
        if (meanACalcResults === 2) {
          return ['Error', ''];
        }
      }
    }
  }

  // ===== Right Ascension Loop =====
  for (i = 0; i < 5200 * 100; i += 1) {
    // 520 degress in 0.01 increments TODO More precise?
    var rascCalcResults = rascCalc(i, rascOffset);
    if (rascCalcResults === 1) {
      break;
    }
    if (rascCalcResults === 5) {
      i += 10 * 100;
    }
  }
  return [mainTLE1, mainTLE2];
};

satellite.calculateLookAngles = (sat, sensor, propOffset) => {
  (function _inputValidation() {
    // Check if there is a sensor
    if (typeof sensor == 'undefined') {
      // Try using the current sensor if there is one
      if (sensorManager.checkSensorSelected()) {
        sensor = sensorManager.currentSensor;
      } else {
        console.error('getlookangles2 requires a sensor!');
        return;
      }
      // Simple Error Checking
    } else {
      if (typeof sensor.obsminaz == 'undefined') {
        console.error('sensor format incorrect');
        return;
      }
      sensor.observerGd = {
        // Array to calculate look angles in propagate()
        lat: sensor.lat * DEG2RAD,
        lon: sensor.lon * DEG2RAD,
        alt: parseFloat(sensor.alt),
      };
    }

    if (typeof sat == 'undefined') {
      console.error('sat parameter required!');
    } else {
      if (typeof sat.TLE1 == 'undefined' || typeof sat.TLE2 == 'undefined') {
        console.error('sat parameter invalid format!');
      }
    }

    if (typeof propOffset == 'undefined') {
      propOffset = 0;
    }

    if (typeof satellite.isRiseSetLookangles == 'undefined') {
      satellite.isRiseSetLookangles = false;
    }
  })();

  // Set default timing settings. These will be changed to find look angles at different times in future.
  if (typeof propOffset == 'undefined') propOffset = 0; // Could be used for changing the time start
  var propTempOffset = 0; // offset letting us propagate in the future (or past)

  var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  var lookanglesTable = []; // Iniially no rows to the table
  var tempLookanglesInterval;

  if (satellite.isRiseSetLookangles) {
    tempLookanglesInterval = satellite.lookanglesInterval;
    satellite.lookanglesInterval = 1;
  }

  for (var i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += satellite.lookanglesInterval) {
    // satellite.lookanglesInterval in seconds
    propTempOffset = i * 1000 + propOffset; // Offset in seconds (msec * 1000)
    if (lookanglesTable.length <= 5000) {
      // Maximum of 1500 lines in the look angles table
      let lookanglesRow = _propagate(propTempOffset, satrec, sensor, satellite.lookanglesInterval);
      if (lookanglesRow == false) {
        lookanglesTable.push(lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1
      }
    }
  }

  if (satellite.isRiseSetLookangles) {
    satellite.lookanglesInterval = tempLookanglesInterval;
  }
  return lookanglesTable;
};
satellite.findBestPasses = (sats, sensor) => {
  sats = sats.replace(' ', ',');
  const satArray = sats.split(',');
  let tableSatTimes = [];
  for (let i = 0; i < satArray.length; i++) {
    try {
      let satId = satArray[i];
      if (typeof satId == 'undefined' || satId == null || satId == '' || satId == ' ') continue;
      let sat = satSet.getSatFromObjNum(parseInt(satId));
      let satPasses = satellite.findBestPass(sat, sensor, 0);
      for (let s = 0; s < satPasses.length; s++) {
        tableSatTimes.push(satPasses[s]);
        // }
      }
    } catch (e) {
      console.warn(e);
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
satellite.findBestPass = (sat, sensor, propOffset) => {
  (function _inputValidation() {
    // Check if there is a sensor
    if (typeof sensor == 'undefined') {
      // Try using the current sensor if there is one
      if (sensorManager.checkSensorSelected()) {
        sensor = sensorManager.currentSensor;
      } else {
        console.error('findBestPass requires a sensor!');
        return;
      }
      // Simple Error Checking
    } else {
      if (typeof sensor.obsminaz == 'undefined') {
        console.error('sensor format incorrect');
        return;
      }
      sensor.observerGd = {
        // Array to calculate look angles in propagate()
        lat: sensor.lat * DEG2RAD,
        lon: sensor.lon * DEG2RAD,
        alt: parseFloat(sensor.alt),
      };
    }

    if (typeof sat == 'undefined') {
      console.error('sat parameter required!');
    } else {
      if (typeof sat.TLE1 == 'undefined' || typeof sat.TLE2 == 'undefined') {
        console.error('sat parameter invalid format!');
      }
    }
  })();

  // Set default timing settings. These will be changed to find look angles at different times in future.
  if (typeof propOffset == 'undefined') propOffset = 0; // Could be used for changing the time start
  var propTempOffset = 0; // offset letting us propagate in the future (or past)

  var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  var lookanglesTable = []; // Iniially no rows to the table

  let looksInterval = 5;
  let looksLength = 7;

  // Setup flags for passes
  let score = 0;
  let sAz = null;
  let sEl = null;
  let srng = null;
  let sTime = null;
  let passMinrng = sensor.obsmaxrange; // This is set each look to find minimum rng (start at max rng)
  let passMaxEl = 0;
  let start3 = false;
  let stop3 = false;

  let orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

  let _propagateBestPass = (propTempOffset, satrec) => {
    let now = new Date(); // Make a time variable
    now.setTime(Number(Date.now()) + propTempOffset); // Set the time variable to the time in the future
    let aer = satellite.getRae(now, satrec, sensor);
    let isInFOV = satellite.checkIsInFOV(sensor, aer);

    if (isInFOV) {
      // Previous Pass to Calculate first line of coverage
      let now1 = new Date();
      now1.setTime(Number(Date.now()) + propTempOffset - looksInterval * 1000);
      let aer1 = satellite.getRae(now1, satrec, sensor);

      let isInFOV1 = satellite.checkIsInFOV(sensor, aer1);
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
        now1.setTime(Number(Date.now()) + propTempOffset + looksInterval * 1000);
        aer1 = satellite.getRae(now1, satrec, sensor);

        isInFOV1 = satellite.checkIsInFOV(sensor, aer1);
        if (!isInFOV1) {
          // if it stops around 3
          stop3 = aer.el <= 3.5;

          score = Math.min((((now - sTime) / 1000 / 60) * 10) / 8, 10); // 8 minute pass is max score
          let elScore = Math.min((passMaxEl / 50) * 10, 10); // 50 el or above is max score
          // elScore -= Math.max((passMaxEl - 50) / 5, 0); // subtract points for being over 50 el
          elScore *= start3 && stop3 ? 2 : 1; // Double points for start and stop at 3
          score += elScore;
          score += Math.min((10 * 750) / passMinrng, 10); // 750 or less is max score
          // score -= Math.max((750 - passMinrng) / 10, 0); // subtract points for being closer than 750

          let tic = 0;
          try {
            tic = (now - sTime) / 1000;
          } catch (e) {
            tic = 0;
          }

          // Skip pass if satellite is in track right now
          if (sTime == null) return;

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
    return;
  };

  for (var i = 0; i < looksLength * 24 * 60 * 60; i += looksInterval) {
    // satellite.lookanglesInterval in seconds
    propTempOffset = i * 1000 + propOffset; // Offset in seconds (msec * 1000)
    if (lookanglesTable.length <= 5000) {
      // Maximum of 1500 lines in the look angles table
      let lookanglesRow = _propagateBestPass(propTempOffset, satrec);
      // If data came back...
      if (typeof lookanglesRow != 'undefined') {
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

// IDEA: standardize use of az, el, and rng (whatever satellite.js uses)
satellite.getRae = (now, satrec, sensor) => {
  let j = _jday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  ); // Converts time to jday (TLEs use epoch year/day)
  j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  let gmst = satellite.gstime(j);

  let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
  let positionEci = satellite.sgp4(satrec, m);
  if (typeof positionEci == 'undefined' || positionEci == null) {
    console.debug('positionEci failed in satellite.getRae()');
    return { az: 0, el: 0, rng: 0 };
  }

  let positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
  let lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
  let az = lookAngles.az * RAD2DEG;
  let el = lookAngles.el * RAD2DEG;
  let rng = lookAngles.rng;
  return { az: az, el: el, rng: rng };
};

satellite.genMlData = {};
/* istanbul ignore next */
satellite.genMlData.eci2inc = (start, stop) => {
  let startTime = timeManager.propTime();
  let trainData = [];
  let trainTarget = [];
  let testData = [];
  let testTarget = [];
  let satEciData = [];
  //   let propLength = 1000 * 60 * 1440; //ms
  let satData = satSet.getSatData();
  let tt = 0;
  let badSat = false;
  for (let s = start; s < stop; s++) {
    if (satData[s].static) break;
    satEciData = [];
    // console.log(satData[s].SCC_NUM);
    for (let i = 0; i < 3; i++) {
      satEciData[i] = [];
      let now = new Date(startTime * 1 + 1000 * 60 * 2 * s * i);
      let j = _jday(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      ); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
      //   let gmst = satellite.gstime(j);

      let satrec = satellite.twoline2satrec(satData[s].TLE1, satData[s].TLE2); // perform and store sat init calcs
      let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
      let positionEci = satellite.sgp4(satrec, m);
      try {
        satEciData[i].push(now * 1, positionEci.position.x, positionEci.position.y, positionEci.position.z, positionEci.velocity.x, positionEci.velocity.y, positionEci.velocity.z);
      } catch (e) {
        badSat = true;
        break;
      }
    }

    if (badSat) {
      badSat = false;
      continue;
    }

    if (tt == 5) {
      tt = 0;
      testData.push(satEciData);
      testTarget.push([satData[s].inclination * RAD2DEG, satData[s].raan * RAD2DEG, satData[s].eccentricity, satData[s].argPe * RAD2DEG, satData[s].meanMotion]);
    } else {
      trainData.push(satEciData);
      trainTarget.push([satData[s].inclination * RAD2DEG, satData[s].raan * RAD2DEG, satData[s].eccentricity, satData[s].argPe * RAD2DEG, satData[s].meanMotion]);
    }
    tt++;
  }
  console.log(trainData.length);
  console.log(trainTarget.length);
  console.log(testData.length);
  console.log(testTarget.length);
  saveVariable(trainData, 'train-data.json');
  saveVariable(trainTarget, 'train-target.json');
  saveVariable(testData, 'test-data.json');
  saveVariable(testTarget, 'test-target.json');
};
/* istanbul ignore next */
satellite.genMlData.tlePredict = (start, stop) => {
  let startTime = timeManager.propTime();
  let satEciDataArray = [];
  let satEciData = [];
  //   let propLength = 1000 * 60 * 1440; //ms
  let satData = satSet.getSatData();
  //   let tt = 0;
  let badSat = false;
  for (let s = start; s < stop; s++) {
    if (satData[s].static) break;
    satEciData = [];
    // console.log(satData[s].SCC_NUM);
    for (let i = 0; i < 3; i++) {
      satEciData[i] = [];
      let now = new Date(startTime * 1 + 1000 * 10 * i);
      let j = _jday(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
      ); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
      //   let gmst = satellite.gstime(j);

      let satrec = satellite.twoline2satrec(satData[s].TLE1, satData[s].TLE2); // perform and store sat init calcs
      let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
      let positionEci = satellite.sgp4(satrec, m);
      try {
        satEciData[i].push(now * 1, positionEci.position.x, positionEci.position.y, positionEci.position.z, positionEci.velocity.x, positionEci.velocity.y, positionEci.velocity.z);
      } catch (e) {
        badSat = true;
        break;
      }
    }

    if (badSat) {
      badSat = false;
      continue;
    }

    satEciDataArray.push(satEciData);
  }
  console.log(satEciDataArray.length);
  saveVariable(satEciDataArray, 'metObs.json');
};

satellite.eci2Rae = (now, eci, sensor) => {
  now = new Date(now);
  let j = _jday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  ); // Converts time to jday (TLEs use epoch year/day)
  j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  let gmst = satellite.gstime(j);

  let positionEcf = satellite.eciToEcf(eci.position, gmst); // positionEci.position is called positionEci originally
  let lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
  let az = lookAngles.az * RAD2DEG;
  let el = lookAngles.el * RAD2DEG;
  let rng = lookAngles.rng;
  return { az: az, el: el, rng: rng };
};

satellite.getEci = (sat, propTime) => {
  let j = _jday(
    propTime.getUTCFullYear(),
    propTime.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
    propTime.getUTCDate(),
    propTime.getUTCHours(),
    propTime.getUTCMinutes(),
    propTime.getUTCSeconds()
  ); // Converts time to jday (TLEs use epoch year/day)
  j += propTime.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  // let gmst = satellite.gstime(j);

  let satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

  let m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
  return satellite.sgp4(satrec, m);
};

satellite.findNearbyObjectsByOrbit = (sat) => {
  if (typeof sat == 'undefined' || sat == null) return;
  let catalog = satSet.getSatData();
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

satellite.findClosestApproachTime = (sat1, sat2, propOffset, propLength) => {
  let distArray = {};
  if (typeof propLength == 'undefined') propLength = 1440 * 60; // 1 Day
  let minDistance = 1000000;
  for (let t = 0; t < propLength; t++) {
    let propTempOffset = propOffset + t * 1000;
    let now = timeManager.propTimeCheck(propTempOffset, timeManager.propRealTime);
    let sat1Pos = satellite.getEci(sat1, now);
    let sat2Pos = satellite.getEci(sat2, now);
    let distance = Math.sqrt((sat1Pos.position.x - sat2Pos.position.x) ** 2 + (sat1Pos.position.y - sat2Pos.position.y) ** 2 + (sat1Pos.position.z - sat2Pos.position.z) ** 2);
    if (distance < minDistance) {
      minDistance = distance;
      distArray = {
        time: now,
        propOffset: propOffset + t * 1000,
        dist: distance,
        velX: sat1Pos.velocity.x - sat2Pos.velocity.x,
        velY: sat1Pos.velocity.y - sat2Pos.velocity.y,
        velZ: sat1Pos.velocity.z - sat2Pos.velocity.z,
      };
    }
  }

  // Go to closest approach time
  // timeManager.propOffset = distArray.propOffset;
  // satCruncher.postMessage({
  //     // Tell satCruncher we have changed times for orbit calculations
  //     typ: 'offset',
  //     dat:
  //         timeManager.propOffset.toString() +
  //         ' ' +
  //         (1.0).toString(),
  // });
  // timeManager.propRealTime = Date.now(); // Reset realtime...this might not be necessary...
  // timeManager.propTime();

  return distArray;
};

satellite.createManeuverAnalyst = (satId, incVariation, meanmoVariation, rascVariation) => {
  // TODO This needs rewrote from scratch to bypass the satcruncher

  var mainsat = satSet.getSat(satId);
  var origsat = mainsat;

  // Launch Points are the Satellites Current Location
  var TEARR = mainsat.getTEARR();
  var launchLat, launchLon, alt;
  launchLat = satellite.degreesLat(TEARR.lat);
  launchLon = satellite.degreesLong(TEARR.lon);
  alt = TEARR.alt;

  var upOrDown = mainsat.getDirection();

  var currentEpoch = satellite.currentEpoch(timeManager.propTime());
  mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);

  var TLEs;
  // Ignore argument of perigee for round orbits OPTIMIZE
  if (mainsat.apogee - mainsat.perigee < 300) {
    TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset);
  } else {
    TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset, alt);
  }
  var TLE1 = TLEs[0];
  var TLE2 = TLEs[1];

  //   var breakupSearchString = '';

  satId = satSet.getIdFromObjNum(80000);
  var sat = satSet.getSat(satId);
  sat = origsat;
  var iTLE1 = '1 ' + 80000 + TLE1.substr(7);

  var iTLEs;
  // Ignore argument of perigee for round orbits OPTIMIZE
  if (sat.apogee - sat.perigee < 300) {
    iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset, 0, rascVariation);
  } else {
    iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset, alt, rascVariation);
  }
  iTLE1 = iTLEs[0];
  iTLE2 = iTLEs[1];

  // For the first 30
  var inc = TLE2.substr(8, 8);
  inc = (parseFloat(inc) + incVariation).toPrecision(7);
  inc = inc.split('.');
  inc[0] = inc[0].substr(-3, 3);
  if (inc[1]) {
    inc[1] = inc[1].substr(0, 4);
  } else {
    inc[1] = '0000';
  }
  inc = (inc[0] + '.' + inc[1]).toString();
  inc = stringPad.padEmpty(inc, 8);

  // For the second 30
  var meanmo = iTLE2.substr(52, 10);
  meanmo = parseFloat(meanmo * meanmoVariation).toPrecision(10);
  // meanmo = parseFloat(meanmo - (0.005 / 10) + (0.01 * ((meanmoIterat + 1) / 10))).toPrecision(10);
  meanmo = meanmo.split('.');
  meanmo[0] = meanmo[0].substr(-2, 2);
  if (meanmo[1]) {
    meanmo[1] = meanmo[1].substr(0, 8);
  } else {
    meanmo[1] = '00000000';
  }
  meanmo = (meanmo[0] + '.' + meanmo[1]).toString();

  var iTLE2 = '2 ' + 80000 + ' ' + inc + ' ' + iTLE2.substr(17, 35) + meanmo + iTLE2.substr(63);
  sat = satSet.getSat(satId);
  sat.TLE1 = iTLE1;
  sat.TLE2 = iTLE2;
  sat.active = true;
  if (satellite.altitudeCheck(iTLE1, iTLE2, timeManager.propOffset) > 1) {
    satCruncher.postMessage({
      typ: 'satEdit',
      id: satId,
      TLE1: iTLE1,
      TLE2: iTLE2,
    });
    // TODO: This belongs in main or uiManager
    // orbitManager.updateOrbitBuffer(satId, true, iTLE1, iTLE2);
  } else {
    console.warn('Breakup Generator Failed');
    return false;
  }

  // breakupSearchString += mainsat.SCC_NUM + ',Analyst Sat';
  // uiManager.doSearch(breakupSearchString);
  return true;
};

satellite.findChangeOrbitToDock = (sat, sat2, propOffset, propLength) => {
  let closestInc = 0;
  let closestRaan = 0;
  let closestMeanMo = 1;

  let minDistArray = {
    dist: 1000000,
  };

  for (let incTemp = -1; incTemp <= 1; incTemp++) {
    for (let raanTemp = -1; raanTemp <= 1; raanTemp++) {
      for (let meanMoTemp = 0.95; meanMoTemp <= 1.05; meanMoTemp += 0.05) {
        if (satellite.createManeuverAnalyst(sat.id, incTemp, meanMoTemp, raanTemp)) {
          let minDistArrayTemp = satellite.findClosestApproachTime(satSet.getSatFromObjNum(80000), sat2, propOffset, propLength);
          if (minDistArrayTemp.dist < minDistArray.dist) {
            minDistArray = minDistArrayTemp;
            // let closestInc = incTemp;
            // let closestRaan = raanTemp;
            // let closestMeanMo = meanMoTemp;
            // console.log(`Distance: ${minDistArray.dist}`);
            // console.log(`Time: ${minDistArray.time}`);
            // console.log(satSet.getSatFromObjNum(80000));
          }
        }
      }
    }
  }

  console.log(`${sat.inclination + closestInc}`);
  console.log(`${sat.raan + closestRaan}`);
  console.log(`${sat.meanMotion * closestMeanMo}`);
  satellite.createManeuverAnalyst(sat.id, closestInc, closestMeanMo, closestRaan);
};

// NOTE: Better code is available for this
satellite.checkIsInFOV = (sensor, rae) => {
  let az = rae.az;
  let el = rae.el;
  let rng = rae.rng;

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

satellite.getDOPsTable = (lat, lon, alt) => {
  try {
    let now;
    let tbl = document.getElementById('dops'); // Identify the table to update
    tbl.innerHTML = ''; // Clear the table from old object data
    // let tblLength = 0;
    let propOffset = timeManager.getPropOffset();
    let propTempOffset = 0;

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
      propTempOffset = t * 1000 * 60 + propOffset; // Offset in seconds (msec * 1000)
      now = timeManager.propTimeCheck(propTempOffset, timeManager.propRealTime);

      let dops = satellite.getDOPs(lat, lon, alt, now);

      tr = tbl.insertRow();
      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(now, 'isoDateTime', true)));
      tdH = tr.insertCell();
      tdH.appendChild(document.createTextNode(dops.HDOP));
      tdP = tr.insertCell();
      tdP.appendChild(document.createTextNode(dops.PDOP));
      tdG = tr.insertCell();
      tdG.appendChild(document.createTextNode(dops.GDOP));
    }
  } catch (error) {
    console.debug(error);
  }
};
satellite.getDOPs = (lat, lon, alt, propTime) => {
  try {
    if (typeof lat == 'undefined') {
      console.error('Latitude Required');
      return;
    }
    if (typeof lon == 'undefined') {
      console.error('Longitude Required');
      return;
    }
    alt = typeof alt != 'undefined' ? alt : 0;

    lat = lat * DEG2RAD;
    lon = lon * DEG2RAD;

    var sat;
    var lookAngles;
    // let az, el;
    // var azList = [];
    // var elList = [];
    var inViewList = [];

    if (typeof groupsManager.GPSGroup == 'undefined') {
      groupsManager.GPSGroup = groupsManager.createGroup('nameRegex', /NAVSTAR/iu);
    }

    if (typeof propTime == 'undefined') propTime = timeManager.propTime();
    var j = timeManager.jday(
      propTime.getUTCFullYear(),
      propTime.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
      propTime.getUTCDate(),
      propTime.getUTCHours(),
      propTime.getUTCMinutes(),
      propTime.getUTCSeconds()
    ); // Converts time to jday (TLEs use epoch year/day)
    j += propTime.getUTCMilliseconds() * 1.15741e-8;
    var gmst = satellite.gstime(j);

    for (var i = 0; i < groupsManager.GPSGroup.sats.length; i++) {
      sat = satSet.getSat(groupsManager.GPSGroup.sats[i].satId);
      lookAngles = satellite.ecfToLookAngles({ lon: lon, lat: lat, alt: alt }, satellite.eciToEcf(sat.position, gmst));
      sat.az = lookAngles.az * RAD2DEG;
      sat.el = lookAngles.el * RAD2DEG;
      if (sat.el > settingsManager.gpsElevationMask) {
        inViewList.push(sat);
      }
    }

    return satellite.calculateDOPs(inViewList);
  } catch (error) {
    console.debug(error);
  }
};
satellite.calculateDOPs = (satList) => {
  var dops = {};

  let nsat = satList.length;
  if (nsat < 4) {
    dops.PDOP = 50;
    dops.HDOP = 50;
    dops.GDOP = 50;
    dops.VDOP = 50;
    dops.TDOP = 50;
    // console.error("Need More Satellites");
    return dops;
  }

  var A = window.numeric.rep([nsat, 4], 0);
  var azlist = [];
  var elvlist = [];
  for (var n = 1; n <= nsat; n++) {
    var cursat = satList[n - 1];

    var az = cursat.az;
    var elv = cursat.el;

    azlist.push(az);
    elvlist.push(elv);
    var B = [Math.cos((elv * Math.PI) / 180.0) * Math.sin((az * Math.PI) / 180.0), Math.cos((elv * Math.PI) / 180.0) * Math.cos((az * Math.PI) / 180.0), Math.sin((elv * Math.PI) / 180.0), 1];
    window.numeric.setBlock(A, [n - 1, 0], [n - 1, 3], [B]);
  }
  var Q = window.numeric.dot(window.numeric.transpose(A), A);
  var Qinv = window.numeric.inv(Q);
  var pdop = Math.sqrt(Qinv[0][0] + Qinv[1][1] + Qinv[2][2]);
  var hdop = Math.sqrt(Qinv[0][0] + Qinv[1][1]);
  var gdop = Math.sqrt(Qinv[0][0] + Qinv[1][1] + Qinv[2][2] + Qinv[3][3]);
  var vdop = Math.sqrt(Qinv[2][2]);
  var tdop = Math.sqrt(Qinv[3][3]);
  dops.PDOP = parseFloat(Math.round(pdop * 100) / 100).toFixed(2);
  dops.HDOP = parseFloat(Math.round(hdop * 100) / 100).toFixed(2);
  dops.GDOP = parseFloat(Math.round(gdop * 100) / 100).toFixed(2);
  dops.VDOP = parseFloat(Math.round(vdop * 100) / 100).toFixed(2);
  dops.TDOP = parseFloat(Math.round(tdop * 100) / 100).toFixed(2);
  return dops;
};

satellite.radarMaxrng = (pW, aG, rcs, minSdB, fMhz) => {
  // let powerInWatts = 325 * 1792;
  // let antennaGain = 2613000000;
  // let minimumDetectableSignaldB;
  let minSW = Math.pow(10, (minSdB - 30) / 10);
  // let frequencyMhz = 435;
  let fHz = (fMhz *= Math.pow(10, 6));

  let numer = pW * Math.pow(aG, 2) * rcs * Math.pow(3 * Math.pow(10, 8), 2);
  let denom = minSW * Math.pow(4 * Math.PI, 3) * Math.pow(fHz, 2);

  let rng = Math.sqrt(Math.sqrt(numer / denom));
  return rng;
};

satellite.radarMinSignal = (pW, aG, rcs, rng, fMhz) => {
  // let powerInWatts = 325 * 1792;
  // let antennaGain = 2613000000;
  // let minimumDetectableSignaldB;
  // let frequencyMhz = 435;
  let fHz = (fMhz *= Math.pow(10, 6));

  let numer = pW * Math.pow(aG, 2) * rcs * Math.pow(3 * Math.pow(10, 8), 2);
  let denom = rng ** 4 * Math.pow(4 * Math.PI, 3) * Math.pow(fHz, 2);

  let minSW = numer / denom;
  let minSdB = Math.log10(minSW);
  return minSdB;
};

var getSunDirection = (jd) => {
  let n = jd - 2451545;
  let L = 280.46 + 0.9856474 * n; // mean longitude of sun
  let g = 357.528 + 0.9856003 * n; // mean anomaly
  L = L % 360.0;
  g = g % 360.0;

  let ecLon = L + 1.915 * Math.sin(g * DEG2RAD) + 0.02 * Math.sin(2 * g * DEG2RAD);

  let t = (jd - 2451545) / 3652500;

  let obliq =
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

  let ob = obliq / 3600.0;

  let x = 1000000 * Math.cos(ecLon * DEG2RAD);
  let y = 1000000 * Math.cos(ob * DEG2RAD) * Math.sin(ecLon * DEG2RAD);
  let z = 1000000 * Math.sin(ob * DEG2RAD) * Math.sin(ecLon * DEG2RAD);

  return [x, y, z];
};

satellite.getSunTimes = (sat, sensor, searchLength, interval) => {
  // If no sensor passed to function then try to use the 'currentSensor'
  if (typeof sensor == 'undefined') {
    if (typeof sensorManager.currentSensor == 'undefined') {
      throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
    } else {
      sensor = sensorManager.currentSensor;
    }
  }
  // If sensor's observerGd is not set try to set it using it parameters
  if (typeof sensor.observerGd == 'undefined') {
    try {
      sensor.observerGd = {
        alt: sensor.alt,
        lat: sensor.lat,
        lon: sensor.lon,
      };
    } catch (e) {
      throw 'observerGd is not set and could not be guessed.';
    }
  }
  // If length and interval not set try to use defaults
  if (typeof searchLength == 'undefined') searchLength = satellite.lookanglesLength;
  if (typeof interval == 'undefined') interval = satellite.lookanglesInterval;

  var propOffset = timeManager.getPropOffset();
  var propTempOffset = 0;
  var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  var minDistanceApart = 100000000000;
  // var minDistTime;
  for (var i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
    // 5second Looks
    propTempOffset = i * 1000 + propOffset; // Offset in seconds (msec * 1000)
    var now = timeManager.propTimeCheck(propTempOffset, timeManager.propRealTime);
    var j = timeManager.jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    var gmst = satellite.gstime(j);

    var [sunX, sunY, sunZ] = getSunDirection(j);

    var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
    var positionEci = satellite.sgp4(satrec, m);
    var positionEcf, lookAngles, az, el, rng;

    var distanceApartX = Math.pow(sunX - positionEci.position.x, 2);
    var distanceApartY = Math.pow(sunY - positionEci.position.y, 2);
    var distanceApartZ = Math.pow(sunZ - positionEci.position.z, 2);
    var distanceApart = Math.sqrt(distanceApartX + distanceApartY + distanceApartZ);

    positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
    lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
    // let gpos = satellite.eciToGeodetic(positionEci.position, gmst);
    // let alt = gpos.alt * 1000; // Km to m
    // let lon = gpos.lon;
    // let lat = gpos.lat;
    az = lookAngles.az * RAD2DEG;
    el = lookAngles.el * RAD2DEG;
    rng = lookAngles.rng;

    if (sensor.obsminaz > sensor.obsmaxaz) {
      if (
        ((az >= sensor.obsminaz || az <= sensor.obsmaxaz) && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
        ((az >= sensor.obsminaz2 || az <= sensor.obsmaxaz2) && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
      ) {
        if (distanceApart < minDistanceApart) {
          minDistanceApart = distanceApart;
          // minDistTime = now;
        }
      }
    } else {
      if (
        (az >= sensor.obsminaz && az <= sensor.obsmaxaz && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
        (az >= sensor.obsminaz2 && az <= sensor.obsmaxaz2 && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
      ) {
        if (distanceApart < minDistanceApart) {
          minDistanceApart = distanceApart;
          // minDistTime = now;
        }
      }
    }
  }
};
satellite.lookAnglesToEcf = (azDeg, elDeg, slantrng, obsLat, obsLong, obsAlt) => {
  // site ecef in meters
  var geodeticCoords = {};
  geodeticCoords.lat = obsLat;
  geodeticCoords.lon = obsLong;
  geodeticCoords.alt = obsAlt;

  var siteXYZ = satellite.geodeticToEcf(geodeticCoords);
  var sitex, sitey, sitez;
  sitex = siteXYZ.x;
  sitey = siteXYZ.y;
  sitez = siteXYZ.z;

  // some needed calculations
  var slat = Math.sin(obsLat);
  var slon = Math.sin(obsLong);
  var clat = Math.cos(obsLat);
  var clon = Math.cos(obsLong);

  var azRad = DEG2RAD * azDeg;
  var elRad = DEG2RAD * elDeg;

  // az,el,rng to sez convertion
  var south = -slantrng * Math.cos(elRad) * Math.cos(azRad);
  var east = slantrng * Math.cos(elRad) * Math.sin(azRad);
  var zenith = slantrng * Math.sin(elRad);

  var x = slat * clon * south + -slon * east + clat * clon * zenith + sitex;
  var y = slat * slon * south + clon * east + clat * slon * zenith + sitey;
  var z = -clat * south + slat * zenith + sitez;

  return { x: x, y: y, z: z };
};

// Requires timeManager
satellite.eci2ll = (x, y, z) => {
  var propTime = timeManager.propTime();
  var j = timeManager.jday(
    propTime.getUTCFullYear(),
    propTime.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
    propTime.getUTCDate(),
    propTime.getUTCHours(),
    propTime.getUTCMinutes(),
    propTime.getUTCSeconds()
  ); // Converts time to jday (TLEs use epoch year/day)
  j += propTime.getUTCMilliseconds() * 1.15741e-8;
  var gmst = satellite.gstime(j);
  var latLon = satellite.eciToGeodetic({ x: x, y: y, z: z }, gmst);
  latLon.lat = latLon.lat * RAD2DEG;
  latLon.lon = latLon.lon * RAD2DEG;

  latLon.lon = latLon.lon > 180 ? latLon.lon - 360 : latLon.lon;
  latLon.lon = latLon.lon < -180 ? latLon.lon + 360 : latLon.lon;
  return latLon;
};

// Specific to KeepTrack.
satellite.map = (sat, i) => {
  // Set default timing settings. These will be changed to find look angles at different times in future.
  var propOffset = timeManager.getPropOffset();
  var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  var propTempOffset = ((i * sat.period) / 50) * 60 * 1000 + propOffset; // Offset in seconds (msec * 1000)

  var propagate = (propOffset, satrec) => {
    var now = timeManager.propTimeCheck(propOffset, timeManager.propRealTime);
    var j = timeManager.jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in rng 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    var gmst = satellite.gstime(j);

    var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
    var positionEci = satellite.sgp4(satrec, m);

    var gpos, lat, lon;

    gpos = satellite.eciToGeodetic(positionEci.position, gmst);

    lat = satellite.degreesLat(gpos.lat);
    lon = satellite.degreesLong(gpos.lon);
    var time = dateFormat(now, 'isoDateTime', true);

    var positionEcf, lookAngles, az, el, rng;
    positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
    lookAngles = satellite.ecfToLookAngles(sensorManager.currentSensor.observerGd, positionEcf);
    az = lookAngles.az * RAD2DEG;
    el = lookAngles.el * RAD2DEG;
    rng = lookAngles.rng;
    var inview = 0;

    if (sensorManager.currentSensor.obsminaz < sensorManager.currentSensor.obsmaxaz) {
      if (
        (az >= sensorManager.currentSensor.obsminaz &&
          az <= sensorManager.currentSensor.obsmaxaz &&
          el >= sensorManager.currentSensor.obsminel &&
          el <= sensorManager.currentSensor.obsmaxel &&
          rng <= sensorManager.currentSensor.obsmaxrange &&
          rng >= sensorManager.currentSensor.obsminrange) ||
        (az >= sensorManager.currentSensor.obsminaz2 &&
          az <= sensorManager.currentSensor.obsmaxaz2 &&
          el >= sensorManager.currentSensor.obsminel2 &&
          el <= sensorManager.currentSensor.obsmaxel2 &&
          rng <= sensorManager.currentSensor.obsmaxrange2 &&
          rng >= sensorManager.currentSensor.obsminrange2)
      ) {
        inview = 1;
      }
    } else {
      if (
        ((az >= sensorManager.currentSensor.obsminaz || az <= sensorManager.currentSensor.obsmaxaz) &&
          el >= sensorManager.currentSensor.obsminel &&
          el <= sensorManager.currentSensor.obsmaxel &&
          rng <= sensorManager.currentSensor.obsmaxrange &&
          rng >= sensorManager.currentSensor.obsminrange) ||
        ((az >= sensorManager.currentSensor.obsminaz2 || az <= sensorManager.currentSensor.obsmaxaz2) &&
          el >= sensorManager.currentSensor.obsminel2 &&
          el <= sensorManager.currentSensor.obsmaxel2 &&
          rng <= sensorManager.currentSensor.obsmaxrange2 &&
          rng >= sensorManager.currentSensor.obsminrange2)
      ) {
        inview = 1;
      }
    }

    return { lat: lat, lon: lon, time: time, inview: inview };
  };

  return propagate(propTempOffset, satrec); // Update the table with looks for this 5 second chunk and then increase table counter by 1
};

satellite.calculateSensorPos = (sensor) => {
  sensor = sensor || sensorManager.currentSensor;
  if (typeof sensor == 'undefined') return;
  var now = timeManager.propTime();
  var jday = (year, mon, day, hr, minute, sec) => 367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor((275 * mon) / 9.0) + day + 1721013.5 + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0; //  ut in days
  var j = jday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1, // Note, this function requires months in rng 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  );
  j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
  var gmst = satellite.gstime(j);

  var cosLat = Math.cos(sensor.lat * DEG2RAD);
  var sinLat = Math.sin(sensor.lat * DEG2RAD);
  var cosLon = Math.cos(sensor.lon * DEG2RAD + gmst);
  var sinLon = Math.sin(sensor.lon * DEG2RAD + gmst);

  let pos = {};
  pos.x = (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * cosLon;
  pos.y = (RADIUS_OF_EARTH + PLANETARIUM_DIST) * cosLat * sinLon;
  pos.z = (RADIUS_OF_EARTH + PLANETARIUM_DIST) * sinLat;
  pos.gmst = gmst;
  pos.lat = sensor.lat;
  pos.lon = sensor.lon;
  return pos;
};

// function _Nearest180(arr) {
//     let maxDiff = null;
//     for (let x = 0; x < arr.length; x++) {
//         for (let y = x + 1; y < arr.length; y++) {
//             if (arr[x] < arr[y] && maxDiff < arr[y] - arr[x]) {
//                 if (arr[y] - arr[x] > 180) {
//                     arr[y] = arr[y] - 180;
//                 }
//                 if (maxDiff < arr[y] - arr[x]) {
//                     maxDiff = arr[y] - arr[x];
//                 }
//             }
//         }
//     }
//     return maxDiff === null ? -1 : maxDiff;
// }
var _jday = (year, mon, day, hr, minute, sec) => {
  // from satellite.js
  if (!year) {
    // console.error('timeManager.jday should always have a date passed to it!');
    var now;
    now = new Date();
    let jDayStart = new Date(now.getFullYear(), 0, 0);
    let jDayDiff = now - jDayStart;
    return Math.floor(jDayDiff / MILLISECONDS_PER_DAY);
  } else {
    return (
      367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor((275 * mon) / 9.0) + day + 1721013.5 + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0 //  ut in days
    );
  }
};

window.satellite = satellite;

export { satellite };
