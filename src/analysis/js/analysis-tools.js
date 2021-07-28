/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek
http://keeptrack.space

All code is Copyright © 2016-2020 by Theodore Kruczek. All rights reserved.
No part of this web site may be reproduced, published, distributed, displayed,
performed, copied or stored for public or private use, without written
permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

import '@app/js/lib/external/Chart.js';
import * as $ from 'jquery';
import { dateFormat } from '@app/js/lib/external/dateFormat.js';
import { satellite } from '@app/js/lib/lookangles.js';
import { sensorList } from '@app/js/plugins/sensor/sensorList.js';
import { timeManager } from '@app/js/timeManager/timeManager.ts';

var requestInfo = {};
var isDrawApogee = false;
var isDrawPerigee = false;
var isDrawInc = false;
var isDrawEcc = false;
var isDrawRAAN = false;
var isDrawPeriod = false;
var isDrawRng = false;
var isDrawAz = false;
var isDrawEl = false;
var sensor;
var TAU = 2 * Math.PI; // PI * 2 -- This makes understanding the formulas easier
var DEG2RAD = TAU / 360; // Used to convert degrees to radians
var RAD2DEG = 360 / TAU; // Used to convert radians to degrees
var minutesPerDay = 1440;
var millisecondsPerDay = 1.15741e-8;
var raeType = 1;

satellite.lookanglesInterval = 60;
satellite.calculateLookAngles = function (sat, sensor, tableType, offset) {
  var propOffset;
  (function _inputValidation() {
    // Check if there is a sensor
    if (typeof sensor == 'undefined') {
      // Try using the current sensor if there is one
      if (satellite.sensorSelected()) {
        sensor = satellite.currentSensor;
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
        latitude: sensor.lat * DEG2RAD,
        longitude: sensor.lon * DEG2RAD,
        height: sensor.alt * 1, // Converts from string to number TODO: Find correct way to convert string to integer
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

    if (typeof tableType == 'undefined') {
      tableType = 1;
    }

    if (typeof satellite.isRiseSetLookangles == 'undefined') {
      satellite.isRiseSetLookangles = false;
    }

    if (typeof satellite.lookanglesInterval == 'undefined') {
      satellite.lookanglesInterval = 1;
    }
  })();

  // Set default timing settings. These will be changed to find look angles at different times in future.
  var propTempOffset = 0; // offset letting us propagate in the future (or past)

  var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  var lookanglesTable = []; // Iniially no rows to the table

  const propagate2 = (propTempOffset, satrec) => {
    // var lookAngleRecord = {};
    var now = new Date(); // Make a time variable
    now.setTime(Number(Date.now()) + propTempOffset); // Set the time variable to the time in the future
    var j = _jday(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * millisecondsPerDay;
    var gmst = satellite.gstime(j);

    var m = (j - satrec.jdsatepoch) * minutesPerDay;
    var positionEci = satellite.sgp4(satrec, m);
    var positionEcf, lookAngles, azimuth, elevation, range;

    positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
    const lla = {
      lat: sensor.observerGd.latitude,
      lon: sensor.observerGd.longitude,
      alt: sensor.observerGd.height,
    };
    lookAngles = satellite.ecfToLookAngles(lla, positionEcf);
    azimuth = lookAngles.az * RAD2DEG;
    elevation = lookAngles.el * RAD2DEG;
    range = lookAngles.rng;

    if (sensor.obsminaz < sensor.obsmaxaz) {
      if (
        !(azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz && elevation >= sensor.obsminel && elevation <= sensor.obsmaxel && range <= sensor.obsmaxrange && range >= sensor.obsminrange) ||
        (azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2 && elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2 && range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2)
      ) {
        if (tableType == 1) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: range,
            az: azimuth,
            el: elevation,
          };
        } else if (tableType == 2) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: null,
            az: null,
            el: null,
          };
        } else {
          return;
        }
      }
    }
    if (
      ((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && elevation >= sensor.obsminel && elevation <= sensor.obsmaxel && range <= sensor.obsmaxrange && range >= sensor.obsminrange) ||
      ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2 && range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2)
    ) {
      if (satellite.isRiseSetLookangles) {
        // Previous Pass to Calculate first line of coverage
        var now1 = new Date();
        now1.setTime(Number(Date.now()) + propTempOffset - satellite.lookanglesInterval * 1000);
        var j1 = timeManager.jday(
          now1.getUTCFullYear(),
          now1.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
          now1.getUTCDate(),
          now1.getUTCHours(),
          now1.getUTCMinutes(),
          now1.getUTCSeconds()
        ); // Converts time to jday (TLEs use epoch year/day)
        j1 += now1.getUTCMilliseconds() * millisecondsPerDay;
        var gmst1 = satellite.gstime(j1);

        var m1 = (j1 - satrec.jdsatepoch) * minutesPerDay;
        var positionEci1 = satellite.sgp4(satrec, m1);
        var positionEcf1, lookAngles1, azimuth1, elevation1, range1;

        const lla = {
          lat: sensor.observerGd.latitude,
          lon: sensor.observerGd.longitude,
          alt: sensor.observerGd.height,
        };
        positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
        lookAngles1 = satellite.ecfToLookAngles(lla, positionEcf1);
        azimuth1 = lookAngles1.az * RAD2DEG;
        elevation1 = lookAngles1.el * RAD2DEG;
        range1 = lookAngles1.rng;
        if (
          !((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && elevation >= sensor.obsminel && elevation <= sensor.obsmaxel && range <= sensor.obsmaxrange && range >= sensor.obsminrange) ||
          ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2 && range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2)
        ) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: range,
            az: azimuth,
            el: elevation,
          };
        } else {
          // Next Pass to Calculate Last line of coverage
          now1.setTime(Number(Date.now()) + propTempOffset - satellite.lookanglesInterval * 1000);
          j1 = _jday(
            now1.getUTCFullYear(),
            now1.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
            now1.getUTCDate(),
            now1.getUTCHours(),
            now1.getUTCMinutes(),
            now1.getUTCSeconds()
          ); // Converts time to jday (TLEs use epoch year/day)
          j1 += now1.getUTCMilliseconds() * millisecondsPerDay;
          gmst1 = satellite.gstime(j1);

          m1 = (j1 - satrec.jdsatepoch) * minutesPerDay;
          positionEci1 = satellite.sgp4(satrec, m1);

          const lla = {
            lat: sensor.observerGd.latitude,
            lon: sensor.observerGd.longitude,
            alt: sensor.observerGd.height,
          };
          positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
          lookAngles1 = satellite.ecfToLookAngles(lla, positionEcf1);
          azimuth1 = lookAngles1.az * RAD2DEG;
          elevation1 = lookAngles1.el * RAD2DEG;
          range1 = lookAngles1.rng;
          if (
            !((azimuth1 >= sensor.obsminaz || azimuth1 <= sensor.obsmaxaz) && elevation1 >= sensor.obsminel && elevation1 <= sensor.obsmaxel && range1 <= sensor.obsmaxrange && range1 >= sensor.obsminrange) ||
            ((azimuth1 >= sensor.obsminaz2 || azimuth1 <= sensor.obsmaxaz2) && elevation1 >= sensor.obsminel2 && elevation1 <= sensor.obsmaxel2 && range1 <= sensor.obsmaxrange2 && range1 >= sensor.obsminrange2)
          ) {
            return {
              time: dateFormat(now, 'isoDateTime', true),
              rng: range,
              az: azimuth,
              el: elevation,
            };
          }
        }
        if (tableType == 1) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: range,
            az: azimuth,
            el: elevation,
          };
        } else if (tableType == 2) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: null,
            az: null,
            el: null,
          };
        } else {
          return;
        }
      }
      return {
        time: dateFormat(now, 'isoDateTime', true),
        rng: range,
        az: azimuth,
        el: elevation,
      };
    }
    if (tableType == 1) {
      return {
        time: dateFormat(now, 'isoDateTime', true),
        rng: range,
        az: azimuth,
        el: elevation,
      };
    } else if (tableType == 2) {
      return {
        time: dateFormat(now, 'isoDateTime', true),
        rng: null,
        az: null,
        el: null,
      };
    } else {
      return;
    }
  };
  const _jday = (year, mon, day, hr, minute, sec) => {
    // from satellite.js
    if (!year) {
      // console.error('timeManager.jday should always have a date passed to it!');
      var now;
      now = Date.now();
      let jDayStart = new Date(now.getFullYear(), 0, 0);
      let jDayDiff = now - jDayStart;
      return Math.floor(jDayDiff / millisecondsPerDay);
    } else {
      return (
        367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor((275 * mon) / 9.0) + day + 1721013.5 + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0 //  ut in days
      );
    }
  };

  var tempLookanglesInterval;
  if (satellite.isRiseSetLookangles) {
    tempLookanglesInterval = satellite.lookanglesInterval;
    satellite.lookanglesInterval = 1;
  }

  if (typeof satellite.lookanglesLength == 'undefined') {
    satellite.lookanglesLength = 1.0;
  }

  for (var i = 0; i < satellite.lookanglesLength * 24 * 60 * 60; i += satellite.lookanglesInterval) {
    // satellite.lookanglesInterval in seconds
    propTempOffset = i * 1000 + propOffset; // Offset in seconds (msec * 1000)
    if (lookanglesTable.length <= 15000) {
      // Maximum of 1500 lines in the look angles table
      let lookanglesRow = propagate2(propTempOffset, satrec);
      if (typeof lookanglesRow != 'undefined') {
        lookanglesTable.push(lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1
      }
    }
  }

  if (satellite.isRiseSetLookangles) {
    satellite.lookanglesInterval = tempLookanglesInterval;
  }
  return lookanglesTable;
};

var drawChart = (data) => {
  var labelInfo = [];
  var inclinationInfo = [];
  var periodInfo = [];
  var apogeeInfo = [];
  var perigeeInfo = [];
  var raanInfo = [];
  var eccInfo = [];
  var rngInfo = [];
  var azInfo = [];
  var elInfo = [];
  var dataInfo = [];
  var satData = [];
  (function processTLEs() {
    var RADIUS_OF_EARTH = 6371; // Radius of Earth in kilometers
    var satrec;
    for (var i = 0; i < data.length; i++) {
      satrec = satellite.twoline2satrec(
        // replace old TLEs
        data[i].TLE1,
        data[i].TLE2
      );
      let extra = {};
      extra.year = data[i].TLE1.substr(18, 2);
      extra.jday = data[i].TLE1.substr(20, 12);

      // keplerian elements
      extra.inclination = satrec.inclo * RAD2DEG; // rads
      extra.eccentricity = satrec.ecco;
      extra.raan = satrec.nodeo * RAD2DEG; // rads
      extra.argPe = satrec.argpo * RAD2DEG; // rads
      extra.meanMotion = (satrec.no * 60 * 24) / (2 * Math.PI); // convert rads/minute to rev/day

      // fun other data
      extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, 2 / 3);
      extra.semiMinorAxis = extra.semiMajorAxis * Math.sqrt(1 - Math.pow(extra.eccentricity, 2));
      extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - RADIUS_OF_EARTH;
      extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - RADIUS_OF_EARTH;
      extra.period = 1440.0 / extra.meanMotion;
      extra.TLE1 = data[i].TLE1;
      extra.TLE2 = data[i].TLE2;
      satData[i] = extra;
    }
  })();
  (function setupDataInfo() {
    if (typeof sensor == 'undefined' || isDrawInc || isDrawApogee || isDrawEcc || isDrawInc || isDrawPerigee || isDrawPeriod || isDrawRAAN) {
      for (let i = 0; i < satData.length; i++) {
        labelInfo.push(`${satData[i].year} ${satData[i].jday}`);
      }
    }
    for (let i = 0; i < satData.length; i++) {
      inclinationInfo.push({ x: i, y: satData[i].inclination });
    }
    for (let i = 0; i < satData.length; i++) {
      periodInfo.push({ x: i, y: satData[i].period });
    }
    for (let i = 0; i < satData.length; i++) {
      perigeeInfo.push({ x: i, y: satData[i].perigee });
    }
    for (let i = 0; i < satData.length; i++) {
      apogeeInfo.push({ x: i, y: satData[i].apogee });
    }
    for (let i = 0; i < satData.length; i++) {
      raanInfo.push({ x: i, y: satData[i].raan });
    }
    for (let i = 0; i < satData.length; i++) {
      eccInfo.push({ x: i, y: satData[i].eccentricity });
    }
    if (typeof sensor != 'undefined' && !isDrawInc && !isDrawApogee && !isDrawEcc && !isDrawInc && !isDrawPerigee && !isDrawPeriod && !isDrawRAAN) {
      let lookAngles = satellite.calculateLookAngles(
        {
          TLE1: data[data.length - 1].TLE1,
          TLE2: data[data.length - 1].TLE2,
        },
        sensor,
        raeType
      );
      for (var i = 0; i < lookAngles.length; i++) {
        if (i > 0) {
          if ((Date.parse(lookAngles[i].time) - Date.parse(lookAngles[i - 1].time)) / 1000 > satellite.lookanglesInterval) {
            labelInfo.push('Gap');
            rngInfo.push({ x: i, y: null });
            azInfo.push({ x: i, y: null });
            elInfo.push({ x: i, y: null });
          } else {
            labelInfo.push(`${lookAngles[i].time}`);
            if (lookAngles[i].rng > 0) lookAngles[i].rng = lookAngles[i].rng / 10;
            rngInfo.push({ x: i, y: lookAngles[i].rng });
            if (sensor.obsminaz > sensor.obsmaxaz && lookAngles[i].az > sensor.obsmaxaz) {
              if (sensor.obsminaz > 180) lookAngles[i].az = lookAngles[i].az - 360;
            }
            azInfo.push({ x: i, y: lookAngles[i].az });
            elInfo.push({ x: i, y: lookAngles[i].el });
          }
        } else {
          labelInfo.push(`${lookAngles[i].time}`);
          if (lookAngles[i].rng > 0) lookAngles[i].rng = lookAngles[i].rng / 10;
          rngInfo.push({ x: i, y: lookAngles[i].rng });
          if (sensor.obsminaz > sensor.obsmaxaz && lookAngles[i].az > sensor.obsmaxaz) {
            if (sensor.obsminaz > 180) lookAngles[i].az = lookAngles[i].az - 360;
          }
          azInfo.push({ x: i, y: lookAngles[i].az });
          elInfo.push({ x: i, y: lookAngles[i].el });
        }
      }
    }

    if (isDrawInc) {
      dataInfo.push({
        label: 'Inclination (deg)',
        data: inclinationInfo,
        backgroundColor: 'rgba(255, 20, 20, 0.8)',
        borderColor: 'rgba(255, 20, 20, 0.8)',
        borderWidth: 3,
        fill: false,
      });
    }
    if (isDrawPerigee) {
      dataInfo.push({
        label: 'Perigee (km)',
        data: perigeeInfo,
        backgroundColor: 'rgba(20, 255, 20, 0.8)',
        borderColor: 'rgba(20, 255, 20, 0.8)',
        borderWidth: 1,
        fill: false,
      });
    }
    if (isDrawApogee) {
      dataInfo.push({
        label: 'Apogee (km)',
        data: apogeeInfo,
        backgroundColor: 'rgba(20, 20, 255, 0.8)',
        borderColor: 'rgba(20, 20, 255, 0.8)',
        borderWidth: 1,
        fill: false,
      });
    }
    if (isDrawPeriod) {
      dataInfo.push({
        label: 'Period (min)',
        data: periodInfo,
        backgroundColor: 'rgba(255, 20, 255, 0.8)',
        borderColor: 'rgba(255, 20, 255, 0.8)',
        borderWidth: 3,
        fill: false,
      });
    }
    if (isDrawRAAN) {
      dataInfo.push({
        label: 'RAAN (deg)',
        data: raanInfo,
        backgroundColor: 'rgba(255, 100, 20, 0.8)',
        borderColor: 'rgba(255, 100, 20, 0.8)',
        borderWidth: 3,
        fill: false,
      });
    }
    if (isDrawEcc) {
      dataInfo.push({
        label: 'Eccentricity',
        data: eccInfo,
        backgroundColor: 'rgba(100, 200, 255, 0.8)',
        borderColor: 'rgba(100, 200, 255, 0.8)',
        borderWidth: 3,
        fill: false,
      });
    }
    if (isDrawRng) {
      dataInfo.push({
        label: 'Range (10 km)',
        data: rngInfo,
        backgroundColor: 'rgba(255, 200, 100, 0.8)',
        borderColor: 'rgba(255, 200, 100, 0.8)',
        borderWidth: 3,
        spanGaps: false,
        fill: false,
      });
    }
    if (isDrawAz) {
      dataInfo.push({
        label: 'Azimuth',
        data: azInfo,
        backgroundColor: 'rgba(100, 200, 255, 0.8)',
        borderColor: 'rgba(100, 200, 255, 0.8)',
        borderWidth: 3,
        spanGaps: false,
        fill: false,
      });
    }
    if (isDrawEl) {
      dataInfo.push({
        label: 'Elevation',
        data: elInfo,
        backgroundColor: 'rgba(100, 255, 200, 0.8)',
        borderColor: 'rgba(100, 255, 200, 0.8)',
        borderWidth: 3,
        spanGaps: false,
        fill: false,
      });
    }
  })();

  // Actually Draw the Charts
  var context = document.getElementById('satChart').getContext('2d');
  // eslint-disable-next-line no-unused-vars
  var myChart = new Chart(context, {
    type: 'line',
    data: {
      labels: labelInfo,
      datasets: dataInfo,
    },
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
      },
    },
  });

  (function resize() {
    var isRedraw = false;
    var canvas = document.getElementById('satChart');
    // let context = canvas.getContext('2d');

    // resize the canvas to fill browser window dynamically
    window.addEventListener('resize', resizeCanvas, false);

    var resizeCanvas = () => {
      if (isRedraw) return;
      isRedraw = true;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      /**
       * Your drawings need to be inside this function otherwise they will be reset when
       * you resize the browser window and the canvas goes will be cleared.
       */
      isRedraw = false;
    };
    resizeCanvas();
  })();
};

var loadJSON = () => {
  $.get(`sathist/${requestInfo.sat}.json`)
    .done(function (resp) {
      // if the .json loads then use it
      drawChart(resp);
    })
    .fail(function () {
      console.error('Could Not Load JSON File!');
    });
};

(function initParseFromGETVariables() {
  // This is an initial parse of the GET variables
  // A satSet focused one happens later.

  var queryStr = window.location.search.substring(1);
  var params = queryStr.split('&');
  for (var i = 0; i < params.length; i++) {
    var key = params[i].split('=')[0];
    var val = params[i].split('=')[1];
    switch (key) {
      case 'sat':
        requestInfo.sat = val;
        break;
      case 'type':
        if (val == 'inc') isDrawInc = true;
        if (val == 'ap') isDrawApogee = true;
        if (val == 'pe') isDrawPerigee = true;
        if (val == 'e') isDrawEcc = true;
        if (val == 'per') isDrawPeriod = true;
        if (val == 'ra') isDrawRAAN = true;
        if (val == 'all') {
          isDrawApogee = true;
          isDrawPerigee = true;
          isDrawInc = true;
          isDrawEcc = true;
          isDrawRAAN = true;
          isDrawPeriod = true;
        }

        if (val == 'rng') {
          isDrawRng = true;
          raeType = 3;
        }
        if (val == 'az') {
          isDrawAz = true;
          raeType = 3;
        }
        if (val == 'el') {
          isDrawEl = true;
          raeType = 3;
        }
        if (val == 'rae') {
          isDrawRng = true;
          isDrawAz = true;
          isDrawEl = true;
          raeType = 3;
        }
        break;
      case 'sensor':
        if (val == 'BLE') sensor = sensorList.BLE;
        if (val == 'CLR') sensor = sensorList.CLR;
        if (val == 'COD') sensor = sensorList.COD;
        if (val == 'FYL') sensor = sensorList.FYL;
        break;
      case 'lookanglesLength':
        satellite.lookanglesLength = parseFloat(val);
        break;
      case 'lookanglesInterval':
        satellite.lookanglesInterval = parseInt(val);
        break;
      case 'raeType':
        raeType = parseInt(val);
        break;
    }
  }
  loadJSON();
})();
