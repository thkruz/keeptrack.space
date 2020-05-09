/* /////////////////////////////////////////////////////////////////////////////

(c) 2016-2020, Theodore Kruczek

lookangles.js is an expansion library for satellite.js providing tailored functions
for calculating orbital data.
http://keeptrack.space

Copyright © 2016-2020 by Theodore Kruczek. All rights reserved. No part of this
web site may be reproduced, published, distributed, displayed, performed, copied
or stored for public or private use, without written permission of the author.

No part of this code may be modified or changed or exploited in any way used
for derivative works, or offered for sale, or used to construct any kind of database
or mirrored at any other location without the express written permission of the author.

///////////////////////////////////////////////////////////////////////////// */

/* global

  $
  satellite
  timeManager

*/

// Constants

(function () {
  var tau = 2 * Math.PI;
  var deg2rad = tau / 360;
  var rad2deg = 360 / tau;
  var minutesPerDay = 1440;
  var millisecondsPerDay = 1.15741e-8;
  // Settings
  satellite.lookanglesInterval = 5;
  satellite.lookanglesLength = 2;
  satellite.isRiseSetLookangles = false;

  satellite.currentSensor = {};
  satellite.tempSensor = {};
  satellite.currentTEARR = {};
  satellite.defaultSensor = {};
  satellite.defaultSensor.observerGd = {
    lat: null,
    longitude: 0,
    latitude: 0,
    height: 0
  };
  satellite.currentSensor = satellite.defaultSensor;
  satellite.sensorListUS = [
    window.sensorManager.sensorList.COD,
    window.sensorManager.sensorList.BLE,
    window.sensorManager.sensorList.CAV,
    window.sensorManager.sensorList.CLR,
    window.sensorManager.sensorList.EGL,
    window.sensorManager.sensorList.FYL,
    window.sensorManager.sensorList.THL,
    window.sensorManager.sensorList.MIL,
    window.sensorManager.sensorList.ALT,
    window.sensorManager.sensorList.ASC,
    window.sensorManager.sensorList.CDN
  ];

  satellite.sensorSelected = function () {
    if (satellite.currentSensor.lat != null) {
      return true;
    } else {
      return false;
    }
  };
  satellite.currentEpoch = function (currentDate) {
    currentDate = new Date(currentDate);
    var epochYear = currentDate.getUTCFullYear();
    epochYear = parseInt(epochYear.toString().substr(2, 2));
    var epochDay = pad(timeManager.getDayOfYear(currentDate), 3);
    var timeOfDay = ((currentDate.getUTCHours() * 60) + currentDate.getUTCMinutes()) / 1440;
    epochDay = (epochDay + timeOfDay).toFixed(8);
    epochDay = pad(epochDay,12);

    function pad (str, max) {
      return str.length < max ? pad('0' + str, max) : str;
    }

    return [epochYear, epochDay];
  };

  satellite.distance = function (hoverSat, selectedSat) {
    if (selectedSat == null || hoverSat == null) {
      return '';
    }
    if (selectedSat.type === 'Star' || hoverSat.type === 'Star') {
      return '';
    }
    var distanceApartX = Math.pow(hoverSat.position.x - selectedSat.position.x, 2);
    var distanceApartY = Math.pow(hoverSat.position.y - selectedSat.position.y, 2);
    var distanceApartZ = Math.pow(hoverSat.position.z - selectedSat.position.z, 2);
    var distanceApart = Math.sqrt(distanceApartX + distanceApartY + distanceApartZ).toFixed(0);
    return '<br />' + distanceApart + ' km';
  };
  satellite.getsensorinfo = function () {
    $('#sensor-latitude').html(satellite.currentSensor.lat);
    $('#sensor-longitude').html(satellite.currentSensor.long);
    $('#sensor-minazimuth').html(satellite.currentSensor.obsminaz);
    $('#sensor-maxazimuth').html(satellite.currentSensor.obsmaxaz);
    $('#sensor-minelevation').html(satellite.currentSensor.obsminel);
    $('#sensor-maxelevation').html(satellite.currentSensor.obsmaxel);
    $('#sensor-minrange').html(satellite.currentSensor.obsminrange);
    $('#sensor-maxrange').html(satellite.currentSensor.obsmaxrange);
  };
  satellite.setobs = function (sensor, reset) {
    /** obslat is what is used to determine if a site is set or not. If this is null sensorSelected() will return false */
    if (reset) {
      satellite.currentSensor = satellite.defaultSensor;
      $('.sensor-reset-menu').hide(); // TODO: This belongs in UI.js somewhere
      return;
    } else {
      $('#menu-sensor-info').removeClass('bmenu-item-disabled');
      $('#menu-fov-bubble').removeClass('bmenu-item-disabled');
      $('#menu-surveillance').removeClass('bmenu-item-disabled');
      $('#menu-planetarium').removeClass('bmenu-item-disabled');
      $('#menu-astronomy').removeClass('bmenu-item-disabled');
      $('.sensor-reset-menu').show(); // TODO: This belongs in UI.js somewhere
    }
    satellite.currentSensor = sensor;
    satellite.currentSensor.observerGd = {   // Array to calculate look angles in propagate()
      latitude: sensor.lat * deg2rad,
      longitude: sensor.long * deg2rad,
      height: sensor.obshei * 1               // Converts from string to number TODO: Find correct way to convert string to integer
    };
  };

  satellite.altitudeCheck = function (TLE1, TLE2, propOffset) {
    // Allow alternate function        (sat, propOffset)
    var satrec;
    if (TLE1.TLE1 !== undefined) {
      propOffset = TLE2;
      satrec = satellite.twoline2satrec(TLE1.TLE1, TLE1.TLE2);// perform and store sat init calcs
    } else {
      satrec = satellite.twoline2satrec(TLE1, TLE2);// perform and store sat init calcs
    }

    var propTime = timeManager.propTimeCheck(propOffset, timeManager.propRealTime);
    var j = timeManager.jday(propTime.getUTCFullYear(),
                 propTime.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 propTime.getUTCDate(),
                 propTime.getUTCHours(),
                 propTime.getUTCMinutes(),
                 propTime.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += propTime.getUTCMilliseconds() * millisecondsPerDay;
    var gmst = satellite.gstime(j);

    var m = (j - satrec.jdsatepoch) * minutesPerDay;
    var positionEci = satellite.sgp4(satrec, m);
    var gpos;

    try {
      gpos = satellite.eciToGeodetic(positionEci.position, gmst);
    } catch (e) {
      return 0; // Auto fail the altitude check
    }
    return gpos.height;
  };

  satellite.getDirection = function (sat) {
    var nowLat = satellite.getTEARR(sat).lat;
    var futureTime = timeManager.propTimeCheck(5000, timeManager.propTime());
    var futLat = satellite.getTEARR(sat, undefined, futureTime).lat;

    nowLat *= RAD2DEG;
    futLat *= RAD2DEG;
    // console.log('Now: ' + timeManager.propTime() + ' --- Fut: ' + futureTime);
    // console.log('Now: ' + nowLat + ' --- Fut: ' + futLat);

    if (nowLat < futLat) return 'N';
    if (nowLat > futLat) return 'S';
    if (nowLat === futLat) {
      futureTime = timeManager.propTimeCheck(20000, timeManager.propTime());
      futureTEARR = satellite.getTEARR(sat, undefined, futureTime);
      if (nowLat < futLat) return 'N';
      if (nowLat > futLat) return 'S';
    }
    console.error('Sat Direction Calculation Error - By Pole?');
    return 'Error';
  };

  satellite.getTEARR = function (sat, sensor, propTime) {
    var currentTEARR = {}; // Most current TEARR data that is set in satellite object and returned.

    // If no sensor passed to function then try to use the 'currentSensor'
    if (typeof sensor == 'undefined') {
      if (typeof satellite.currentSensor == 'undefined') {
        throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
      } else {
        sensor = satellite.currentSensor;
      }
    }
    // If sensor's observerGd is not set try to set it using it parameters
    if (typeof sensor.observerGd == 'undefined') {
      try {
        sensor.observerGd = {
          height: sensor.obshei,
          latitude: sensor.lat,
          longitude: sensor.long
        };
      } catch (e) {
        throw 'observerGd is not set and could not be guessed.';
      }
      // If it didn't work, try again
      if (typeof sensor.observerGd.longitude == 'undefined') {
        try {
          sensor.observerGd = {
            height: sensor.alt,
            latitude: sensor.lat * DEG2RAD,
            longitude: sensor.lon * DEG2RAD
          };
        } catch (e) {
          throw 'observerGd is not set and could not be guessed.';
        }
      }
    }

    // Set default timing settings. These will be changed to find look angles at different times in future.
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
    var now;
    if (typeof propTime == 'undefined') {
      now = timeManager.propTime();
    } else {
      now = propTime;
    }
    var j = timeManager.jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 now.getUTCDate(),
                 now.getUTCHours(),
                 now.getUTCMinutes(),
                 now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * millisecondsPerDay;
    var gmst = satellite.gstime(j);

    var m = (j - satrec.jdsatepoch) * minutesPerDay;
    var positionEci = satellite.sgp4(satrec, m);
    var positionEcf, lookAngles;
    var gpos;

    try {
      gpos = satellite.eciToGeodetic(positionEci.position, gmst);
      currentTEARR.alt = gpos.height;
      currentTEARR.lon = gpos.longitude;
      currentTEARR.lat = gpos.latitude;
      positionEcf = satellite.eciToEcf(positionEci.position, gmst);
      lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
      currentTEARR.azimuth = lookAngles.azimuth * rad2deg;
      currentTEARR.elevation = lookAngles.elevation * rad2deg;
      currentTEARR.range = lookAngles.rangeSat;
    } catch (e) {
      currentTEARR.alt = 0;
      currentTEARR.lon = 0;
      currentTEARR.lat = 0;
      positionEcf = 0;
      lookAngles = 0;
      currentTEARR.azimuth = 0;
      currentTEARR.elevation = 0;
      currentTEARR.range = 0;
    }

    // Check if satellite is in field of view of a sensor.
    if (sensor.obsminaz > sensor.obsmaxaz) {
      if (((currentTEARR.azimuth >= sensor.obsminaz || currentTEARR.azimuth <= sensor.obsmaxaz) &&
           (currentTEARR.elevation >= sensor.obsminel && currentTEARR.elevation <= sensor.obsmaxel) &&
           (currentTEARR.range <= sensor.obsmaxrange && currentTEARR.range >= sensor.obsminrange)) ||
           ((currentTEARR.azimuth >= sensor.obsminaz2 || currentTEARR.azimuth <= sensor.obsmaxaz2) &&
           (currentTEARR.elevation >= sensor.obsminel2 && currentTEARR.elevation <= sensor.obsmaxel2) &&
           (currentTEARR.range <= sensor.obsmaxrange2 && currentTEARR.range >= sensor.obsminrange2))) {
        currentTEARR.inview = true;
      } else {
        currentTEARR.inview = false;
      }
    } else {
      if (((currentTEARR.azimuth >= sensor.obsminaz && currentTEARR.azimuth <= sensor.obsmaxaz) &&
           (currentTEARR.elevation >= sensor.obsminel && currentTEARR.elevation <= sensor.obsmaxel) &&
           (currentTEARR.range <= sensor.obsmaxrange && currentTEARR.range >= sensor.obsminrange)) ||
           ((currentTEARR.azimuth >= sensor.obsminaz2 && currentTEARR.azimuth <= sensor.obsmaxaz2) &&
           (currentTEARR.elevation >= sensor.obsminel2 && currentTEARR.elevation <= sensor.obsmaxel2) &&
           (currentTEARR.range <= sensor.obsmaxrange2 && currentTEARR.range >= sensor.obsminrange2))) {
        currentTEARR.inview = true;
      } else {
        currentTEARR.inview = false;
      }
    }
    satellite.currentTEARR = currentTEARR;
    return currentTEARR;
  };

  satellite.calculateSatrec = function () {
    console.time('satrecCache');
    var satrecCache = [];
    var satrec;
    for (var s = 0; s < satSet.getSatData().length; s++) {
      sat = satSet.getSat(s);
      if (sat.static || sat.missile || !sat.active) { continue; }
      satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
      satrecCache.push({'SCC_NUM': sat.SCC_NUM, 'satrec': satrec});
    }
    window.satrecCache = satrecCache;
    console.timeEnd('satrecCache');
  };

  // satellite.calculateTimeInCoverage = function () {
  //   console.time('TIC');
  //   console.log(Date.now());
  //   var calcTICArray = [];
  //   var ready1, ready2, ready3, ready4, ready5, ready6, ready7, ready8;
  //   var debugCalculations = 17868;
  //   ready1 = false;
  //   ready2 = false;
  //   ready3 = false;
  //   ready4 = false;
  //   ready5 = false;
  //   ready6 = false;
  //   ready7 = false;
  //   ready8 = false;
  //
  //   // multThreadCruncher1.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 0, endNum: 0, sensor: satellite.currentSensor});
  //   // multThreadCruncher2.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 1, endNum: 1, sensor: satellite.currentSensor});
  //   // multThreadCruncher3.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 2, endNum: 2, sensor: satellite.currentSensor});
  //   // multThreadCruncher4.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 3, endNum: 3, sensor: satellite.currentSensor});
  //   // multThreadCruncher5.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 4, endNum: 4, sensor: satellite.currentSensor});
  //   // multThreadCruncher6.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 5, endNum: 5, sensor: satellite.currentSensor});
  //   // multThreadCruncher7.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 6, endNum: 6, sensor: satellite.currentSensor});
  //   // multThreadCruncher8.postMessage({type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 7, endNum: 1599, sensor: satellite.currentSensor});
  //
  //   multThreadCruncher1.postMessage({thread: 1, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: 0, endNum: debugCalculations/8*1, sensor: satellite.currentSensor});
  //   multThreadCruncher2.postMessage({thread: 2, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*1+1, endNum: debugCalculations/8*2, sensor: satellite.currentSensor});
  //   multThreadCruncher3.postMessage({thread: 3, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*2+1, endNum: debugCalculations/8*3, sensor: satellite.currentSensor});
  //   multThreadCruncher4.postMessage({thread: 4, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*3+1, endNum: debugCalculations/8*4, sensor: satellite.currentSensor});
  //   multThreadCruncher5.postMessage({thread: 5, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*4+1, endNum: debugCalculations/8*5, sensor: satellite.currentSensor});
  //   multThreadCruncher6.postMessage({thread: 6, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*5+1, endNum: debugCalculations/8*6, sensor: satellite.currentSensor});
  //   multThreadCruncher7.postMessage({thread: 7, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*6+1, endNum: debugCalculations/8*7, sensor: satellite.currentSensor});
  //   multThreadCruncher8.postMessage({thread: 8, type: 'calcTIC', propOffset: timeManager.getPropOffset(), startNum: debugCalculations/8*7+1, endNum: debugCalculations/8*8, sensor: satellite.currentSensor});
  //
  //   multThreadCruncher1.onmessage = function (m) {
  //     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
  //     ready1 = true;
  //     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
  //   };
  //   multThreadCruncher2.onmessage = function (m) {
  //     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
  //     ready2 = true;
  //     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
  //   };
  //   multThreadCruncher3.onmessage = function (m) {
  //     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
  //     ready3 = true;
  //     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
  //   };
  //   multThreadCruncher4.onmessage = function (m) {
  //     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
  //     ready4 = true;
  //     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
  //   };
  //   multThreadCruncher5.onmessage = function (m) {
  //     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
  //     ready5 = true;
  //     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
  //   };
  //   multThreadCruncher6.onmessage = function (m) {
  //     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
  //     ready6 = true;
  //     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
  //   };
  //   multThreadCruncher7.onmessage = function (m) {
  //     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
  //     ready7 = true;
  //     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
  //   };
  //   multThreadCruncher8.onmessage = function (m) {
  //     for (var i = 0; i < m.data.calcTICArray.length; i++) { calcTICArray.push(m.data.calcTICArray[i]); }
  //     ready8 = true;
  //     if (ready1 && ready2 && ready3 && ready4 && ready5 && ready6 && ready7 && ready8) multThreadComplete();
  //   };
  //   function multThreadComplete () {
  //     console.log(calcTICArray);
  //     console.timeEnd('TIC');
  //   }
  // };
  satellite.nextpassList = function (satArray) {
    var nextPassArray = [];
    for (var s = 0; s < satArray.length; s++) {
      var time = satellite.next5passes(satArray[s], undefined, (1000 * 60 * 60 * 24)); // Only do 1 day looks
      for (var i = 0; i < time.length; i++) {
        nextPassArray.push({'SCC_NUM': satArray[s].SCC_NUM, 'time': time[i]});
      }
    }
    return nextPassArray;
  };
  satellite.nextpass = function (sat, sensor, searchLength, interval) {
    // If no sensor passed to function then try to use the 'currentSensor'
    if (typeof sensor == 'undefined') {
      if (typeof satellite.currentSensor == 'undefined') {
        throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
      } else {
        sensor = satellite.currentSensor;
      }
    }
    // If sensor's observerGd is not set try to set it using it parameters
    if (typeof sensor.observerGd == 'undefined') {
      try {
        sensor.observerGd = {
          height: sensor.obshei,
          latitude: sensor.lat,
          longitude: sensor.long
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
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    for (var i = 0; i < (searchLength * 24 * 60 * 60); i += interval) {         // 5second Looks
      propTempOffset = i * 1000 + propOffset;                 // Offset in seconds (msec * 1000)
      var now = timeManager.propTimeCheck(propTempOffset, timeManager.propRealTime);
      var j = timeManager.jday(now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * millisecondsPerDay;
      var gmst = satellite.gstime(j);

      var m = (j - satrec.jdsatepoch) * minutesPerDay;
      var positionEci = satellite.sgp4(satrec, m);
      var positionEcf, lookAngles, azimuth, elevation, range;

      positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
      lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
      azimuth = lookAngles.azimuth * rad2deg;
      elevation = lookAngles.elevation * rad2deg;
      range = lookAngles.rangeSat;

      if (sensor.obsminaz > sensor.obsmaxaz) {
        if (((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (range <= sensor.obsmaxrange && range >= sensor.obsminrange)) ||
           ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2))) {
          return timeManager.dateFormat(now, 'isoDateTime', true);
        }
      } else {
        if (((azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (range <= sensor.obsmaxrange && range >= sensor.obsminrange)) ||
           ((azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2))) {
          return timeManager.dateFormat(now, 'isoDateTime', true);
        }
      }
    }
    return 'No Passes in ' + satellite.lookanglesLength + ' Days';
  };

  // TODO: Convert this into nextNpasses
  satellite.next5passes = function (sat, sensor, searchLength, interval) {
    // If no sensor passed to function then try to use the 'currentSensor'
    if (typeof sensor == 'undefined') {
      if (typeof satellite.currentSensor == 'undefined') {
        throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
      } else {
        sensor = satellite.currentSensor;
      }
    }
    // If sensor's observerGd is not set try to set it using it parameters
    if (typeof sensor.observerGd == 'undefined') {
      try {
        sensor.observerGd = {
          height: sensor.obshei,
          latitude: sensor.lat,
          longitude: sensor.long
        };
      } catch (e) {
        throw 'observerGd is not set and could not be guessed.';
      }
    }
    // If length and interval not set try to use defaults
    if (typeof searchLength == 'undefined') searchLength = satellite.lookanglesLength;
    if (typeof interval == 'undefined') interval = satellite.lookanglesInterval;

    var passTimesArray = [];
    var propOffset = timeManager.getPropOffset();
    var propTempOffset = 0;
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    var orbitalPeriod = minutesPerDay / (satrec.no * minutesPerDay / tau); // Seconds in a day divided by mean motion
    for (var i = 0; i < (searchLength * 24 * 60 * 60); i += interval) {         // 5second Looks
      // Only pass a maximum of 5 passes
      if (passTimesArray.length >= 5) { return passTimesArray; }

      propTempOffset = i * 1000 + propOffset;                 // Offset in seconds (msec * 1000)
      var now = timeManager.propTimeCheck(propTempOffset, timeManager.propRealTime);
      var j = timeManager.jday(now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * millisecondsPerDay;
      var gmst = satellite.gstime(j);

      var m = (j - satrec.jdsatepoch) * minutesPerDay;
      var positionEci = satellite.sgp4(satrec, m);
      var positionEcf, lookAngles, azimuth, elevation, range;

      positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
      lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
      azimuth = lookAngles.azimuth * rad2deg;
      elevation = lookAngles.elevation * rad2deg;
      range = lookAngles.rangeSat;

      if (sensor.obsminaz > sensor.obsmaxaz) {
        if (((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (range <= sensor.obsmaxrange && range >= sensor.obsminrange)) ||
           ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2))) {
          passTimesArray.push(now);
          i = i + (orbitalPeriod * 60 * 0.75); // Jump 3/4th to the next orbit
        }
      } else {
        if (((azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (range <= sensor.obsmaxrange && range >= sensor.obsminrange)) ||
           ((azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2))) {
          passTimesArray.push(now);
          i = i + (orbitalPeriod * 60 * 0.75); // Jump 3/4th to the next orbit
        }
      }
    }
    return passTimesArray;
  };

  // TODO: Replace the tables in these functions with arrays that are then turned into tables in main.js
  // This will help with the end goal of making these functions part of the satellite library
  satellite.getlookanglesMultiSite = function (sat, isLookanglesMultiSiteMenuOpen) {
    if (!isLookanglesMultiSiteMenuOpen) return;

    var resetWhenDone = false;
    if (!satellite.sensorSelected()) { resetWhenDone = true; }

    // Set default timing settings. These will be changed to find look angles at different times in future.
    var propTempOffset = 0;               // offset letting us propagate in the future (or past)
    // timeManager.propRealTime = Date.now();      // Set current time

    var propOffset = timeManager.getPropOffset();
    satellite.tempSensor = satellite.currentSensor;
    satellite.setobs(satellite.sensorListUS[0]);

    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    var orbitalPeriod = minutesPerDay / (satrec.no * minutesPerDay / tau); // Seconds in a day divided by mean motion
    var tbl = document.getElementById('looksmultisite');           // Identify the table to update
    tbl.innerHTML = '';                                   // Clear the table from old object data
    var tblLength = 0;                                   // Iniially no rows to the table
    var lastTblLength = 0;                               // Tracks when to change sensors
    var sensor = 0;
    var howManyPasses = 6; // Complete 3 passes before switching sensors

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

    for (var i = 0; i < (satellite.lookanglesLength * 24 * 60 * 60); i += satellite.lookanglesInterval) {         // 5second Looks
      propTempOffset = i * 1000 + propOffset;                 // Offset in seconds (msec * 1000)
      tblLength += propagateMultiSite(propTempOffset, tbl, satrec, sensor);   // Update the table with looks for this 5 second chunk and then increase table counter by 1
      if (tblLength > lastTblLength) {                           // Maximum of 1500 lines in the look angles table
        lastTblLength++;
        if (howManyPasses === 1) { // When 3 passes have been complete - looks weird with 1 instead of 0
          sensor++;
          satellite.setobs(satellite.sensorListUS[sensor]);
          i = 0;
          howManyPasses = 6; // Reset to 3 passes
        } else {
          howManyPasses = howManyPasses - 1;
          i = i + (orbitalPeriod * 60 * 0.75); // Jump 3/4th to the next orbit
        }
      }
      if (sensor === satellite.sensorListUS.length - 1) {
        (resetWhenDone) ? satellite.currentSensor = satellite.defaultSensor : satellite.currentSensor = satellite.tempSensor;
        break;
      }
      if (sensor < satellite.sensorListUS.length - 1 && i >= (satellite.lookanglesLength * 24 * 60 * 60) - satellite.lookanglesInterval) { // Move to next sensor if this sensor doesn't have enough passes.
        sensor++;
        satellite.setobs(satellite.sensorListUS[sensor]);
        i = 0;
        howManyPasses = 6;
      }
    }
    (resetWhenDone) ? satellite.currentSensor = satellite.defaultSensor : satellite.currentSensor = satellite.tempSensor;
  };
  satellite.getOrbitByLatLon = function (sat, goalLat, goalLon, upOrDown, propOffset, goalAlt, rascOffset) {
    /**
     * Function to brute force find an orbit over a sites lattiude and longitude
     * @param  object       sat             satellite object with satrec
     * @param  long         goalLat         Goal Latitude
     * @param  long         goalLon         Goal Longitude
     * @param  long         goalAlt         Goal Altitude
     * @param  string       upOrDown        'Up' or 'Down'
     * @param  integer      propOffset   milliseconds between now and 0000z
     * @return Array                        [0] is TLE1 and [1] is TLE2
     * @method pad                          pads front of string with 0's for TLEs
     * @method meanaCalc                    returns 1 when latitude found 2 if error
     * @method rascCalc                     returns 1 when longitude found 2 if error and 5 if it is not close
     * @method propagate                    calculates a modified TLEs latitude and longitude
     */
    var mainTLE1;
    var mainTLE2;
    var mainMeana;
    var mainRasc;
    var mainArgPer;
    var argPerCalcResults;
    var meanACalcResults;
    var meanAiValue;
    var lastLat;
    var isUpOrDown;
    var i;

    if (typeof rascOffset == 'undefined') rascOffset = 0;

    // ===== Mean Anomaly Loop =====
    for (i = 0; i < (520 * 10); i += 1) { /** Rotate Mean Anomaly 0.1 Degree at a Time for Up To 400 Degrees */
      meanACalcResults = meanaCalc(i);
      if (meanACalcResults === 1) {
        if (isUpOrDown !== upOrDown) { // If Object is moving opposite of the goal direction (upOrDown)
          i = i + 20;                 // Move 2 Degrees ahead in the orbit to prevent being close on the next lattiude check
        } else {
          meanAiValue = i;
          break; // Stop changing the Mean Anomaly
        }
      }
      if (meanACalcResults === 5) {
        i += (10 * 10); // Change meanA faster
      }
    }
    if (meanACalcResults === 2) {
      console.warn(`meanACalcResults failed after trying all combinations!`);
      return ['Error', ''];
    }

    // Don't Bother Unless Specifically Requested
    // NOTE: Applies to eccentric orbits
    // ===== Argument of Perigee Loop =====
    if (typeof goalAlt != 'undefined' && goalAlt !== 0) {
      meanACalcResults = 0; // Reset meanACalcResults
      for (i = 0; i < (360 * 10); i += 1) { /** Rotate ArgPer 0.1 Degree at a Time for Up To 400 Degrees */
        argPerCalcResults = argPerCalc(i);
        if (argPerCalcResults === 1) {
          // console.log('Found Correct Alt');
          if (meanACalcResults === 1) {
            // console.log('Found Correct Lat');
            // console.log('Up Or Down: ' + upOrDown);
            if (isUpOrDown === upOrDown) { // If Object is moving in the goal direction (upOrDown)
              break; // Stop changing ArgPer
            }
          } else {
            // console.log('Found Wrong Lat');
          }
        } else {
          console.log('Failed Arg of Per Calc');
        }
        if (argPerCalcResults === 5) {
          i += (5 * 10); // Change ArgPer faster
        }
        if (argPerCalcResults === 2) { return ['Error', '']; }

        // ===== Mean Anomaly Loop =====
        for (var j = 0; j < (520 * 10); j += 1) { /** Rotate Mean Anomaly 0.1 Degree at a Time for Up To 400 Degrees */
          meanACalcResults = meanaCalc(j);
          if (meanACalcResults === 1) {
            if (isUpOrDown !== upOrDown) { // If Object is moving opposite of the goal direction (upOrDown)
              j = j + 20;                 // Move 2 Degrees ahead in the orbit to prevent being close on the next lattiude check
            } else {
              break; // Stop changing the Mean Anomaly
            }
          }
          if (meanACalcResults === 5) {
            j += (10 * 10); // Change meanA faster
          }
          if (meanACalcResults === 2) { return ['Error', '']; }
        }
      }
    }

    // ===== Right Ascension Loop =====
    for (i = 0; i < (5200 * 100); i += 1) {         // 520 degress in 0.01 increments TODO More precise?
      var rascCalcResults = rascCalc(i, rascOffset);
      if (rascCalcResults === 1) {
        break;
      }
      if (rascCalcResults === 5) {
        i += (10 * 100);
      }
    }

    return [mainTLE1, mainTLE2];

    function pad (str, max) {
      return str.length < max ? pad('0' + str, max) : str;
    }

    function argPerCalc (argPe) {
      var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs

      var meana;
      if (typeof mainMeana == 'undefined') {
        meana = (satrec.mo * rad2deg).toPrecision(10);
      } else {
        meana = mainMeana;
      }
      meana = meana.split('.');
      meana[0] = meana[0].substr(-3, 3);
      meana[1] = meana[1].substr(0, 4);
      meana = (meana[0] + '.' + meana[1]).toString();
      meana = pad(meana, 8);

      var rasc;
      if (typeof mainRasc == 'undefined') {
        rasc = (sat.raan * rad2deg).toPrecision(7);
      } else {
        rasc = mainRasc;
      }
      rasc = rasc.split('.');
      rasc[0] = rasc[0].substr(-3, 3);
      rasc[1] = rasc[1].substr(0, 4);
      rasc = (rasc[0] + '.' + rasc[1]).toString();
      rasc = pad(rasc, 8);
      mainRasc = rasc;

      var scc = sat.SCC_NUM;

      var intl = sat.TLE1.substr(9, 8);
      var inc = (sat.inclination * rad2deg).toPrecision(7);
      inc = inc.split('.');
      inc[0] = inc[0].substr(-3, 3);
      inc[1] = inc[1].substr(0, 4);
      inc = (inc[0] + '.' + inc[1]).toString();

      inc = pad(inc, 8);
      var epochyr = sat.TLE1.substr(18, 2);
      var epochday = sat.TLE1.substr(20, 12);

      var meanmo = sat.TLE2.substr(52, 11);

      var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

      argPe = argPe / 10;
      argPe = parseFloat(argPe).toPrecision(7);
      argPe = pad(argPe, 8);

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
    }

    function meanaCalc (meana) {
      var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs

      meana = meana / 10;
      meana = parseFloat(meana).toPrecision(7);
      meana = pad(meana, 8);

      var rasc = (sat.raan * rad2deg).toPrecision(7);
      mainRasc = rasc;
      rasc = rasc.toString().split('.');
      rasc[0] = rasc[0].substr(-3, 3);
      rasc[1] = rasc[1].substr(0, 4);
      rasc = (rasc[0] + '.' + rasc[1]).toString();
      rasc = pad(rasc, 8);

      var scc = sat.SCC_NUM;

      var intl = sat.TLE1.substr(9, 8);
      var inc = (sat.inclination * rad2deg).toPrecision(7);
      inc = inc.split('.');
      inc[0] = inc[0].substr(-3, 3);
      inc[1] = inc[1].substr(0, 4);
      inc = (inc[0] + '.' + inc[1]).toString();

      inc = pad(inc, 8);
      var epochyr = sat.TLE1.substr(18, 2);
      var epochday = sat.TLE1.substr(20, 12);

      var meanmo = sat.TLE2.substr(52, 11);

      var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

      var argPe;
      if (typeof mainArgPer == 'undefined') {
        argPe = (sat.argPe * rad2deg).toPrecision(7);
      } else {
        argPe = mainArgPer;
      }
      argPe = argPe.split('.');
      argPe[0] = argPe[0].substr(-3, 3);
      argPe[1] = argPe[1].substr(0, 4);
      argPe = (argPe[0] + '.' + argPe[1]).toString();
      argPe = pad(argPe, 8);

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
    }

    function rascCalc (rasc, rascOffset) {
      var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
      var meana = mainMeana;

      rascNum = rasc;
      rasc = (rasc / 100);
      if (rasc > 360) {
        rasc = rasc - 360; // angle can't be bigger than 360
      }
      rasc = rasc.toPrecision(7);
      rasc = rasc.split('.');
      rasc[0] = rasc[0].substr(-3, 3);
      rasc[1] = rasc[1].substr(0, 4);
      rasc = (rasc[0] + '.' + rasc[1]).toString();
      rasc = pad(rasc, 8);
      mainRasc = rasc;

      var scc = sat.SCC_NUM;

      var intl = sat.TLE1.substr(9, 8);
      var inc = (sat.inclination * rad2deg).toPrecision(7);
      inc = inc.split('.');
      inc[0] = inc[0].substr(-3, 3);
      inc[1] = inc[1].substr(0, 4);
      inc = (inc[0] + '.' + inc[1]).toString();

      inc = pad(inc, 8);
      var epochyr = sat.TLE1.substr(18, 2);
      var epochday = sat.TLE1.substr(20, 12);

      var meanmo = sat.TLE2.substr(52, 11);

      var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

      var argPe;
      if (typeof mainArgPer == 'undefined') {
        argPe = (sat.argPe * rad2deg).toPrecision(7);
      } else {
        argPe = mainArgPer;
      }
      argPe = argPe.split('.');
      argPe[0] = argPe[0].substr(-3, 3);
      argPe[1] = argPe[1].substr(0, 4);
      argPe = (argPe[0] + '.' + argPe[1]).toString();
      argPe = pad(argPe, 8);

      var TLE1Ending = sat.TLE1.substr(32, 39);

      mainTLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
      mainTLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

      satrec = satellite.twoline2satrec(mainTLE1, mainTLE2);

      var propNewRasc = getOrbitByLatLonPropagate(propOffset, satrec, 2);

      if (propNewRasc === 1) {
        sat.TLE1 = mainTLE1;

        rasc = (rascNum / 100) + rascOffset;
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
        rasc = pad(rasc, 8);
        mainRasc = rasc;

        mainTLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

        sat.TLE2 = mainTLE2;
      }

      // 1 === If RASC within 0.15 degrees then good enough
      // 5 === If RASC outside 15 degrees then rotate RASC faster
      return propNewRasc;
    }

    function getOrbitByLatLonPropagate (propOffset, satrec, type) {
      timeManager.propRealTime = Date.now();
      var now = timeManager.propTimeCheck(propOffset, timeManager.propRealTime);
      var j = timeManager.jday(now.getUTCFullYear(),
                   now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                   now.getUTCDate(),
                   now.getUTCHours(),
                   now.getUTCMinutes(),
                   now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * millisecondsPerDay;
      var gmst = satellite.gstime(j);

      var m = (j - satrec.jdsatepoch) * minutesPerDay;
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

      lat = satellite.degreesLat(gpos.latitude) * 1;
      lon = satellite.degreesLong(gpos.longitude) * 1;
      alt = gpos.height;

      if (lastLat == null) { // Set it the first time
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

      if (lat > (goalLat - 0.15) && lat < (goalLat + 0.15) && type === 1) {
        // console.log('Lat: ' + lat);
        return 1;
      }

      if (lon > (goalLon - 0.15) && lon < (goalLon + 0.15) && type === 2) {
        // console.log('Lon: ' + lon);
        return 1;
      }

      if (alt > (goalAlt - 30) && alt < (goalAlt + 30) && type === 3) {
        return 1;
      }

      // If current latitude greater than 11 degrees off rotate meanA faster
      if (!(lat > (goalLat - 11) && lat < (goalLat + 11)) && type === 1) {
        // console.log('Lat: ' + lat);
        return 5;
      }

      // If current longitude greater than 11 degrees off rotate RASC faster
      if (!(lon > (goalLon - 11) && lon < (goalLon + 11)) && type === 2) {
        return 5;
      }

      // If current altitude greater than 100 km off rotate augPerigee faster
      if ((alt < (goalAlt - 100) || alt > (goalAlt + 100)) && type === 3) {
        // console.log('Lat: ' + lat);
        // console.log('Alt: ' + alt + ' --- MeanMo: ' + satrec.mo * RAD2DEG + ' --- ArgPer: ' + satrec.argpo * RAD2DEG);
        return 5;
      }

      return 0;
    }
  };
  satellite.calculateLookAngles = function (sat, sensor, offset) {
    var propOffset;
    (function _inputValidation () {
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
        sensor.observerGd = {   // Array to calculate look angles in propagate()
          latitude: sensor.lat * deg2rad,
          longitude: sensor.long * deg2rad,
          height: sensor.obshei * 1               // Converts from string to number TODO: Find correct way to convert string to integer
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
    var propTempOffset = 0;               // offset letting us propagate in the future (or past)

    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    var lookanglesTable = [];                                   // Iniially no rows to the table

    if (satellite.isRiseSetLookangles) {
      var tempLookanglesInterval = satellite.lookanglesInterval;
      satellite.lookanglesInterval = 1;
    }

    for (var i = 0; i < (satellite.lookanglesLength * 24 * 60 * 60); i += satellite.lookanglesInterval) {         // satellite.lookanglesInterval in seconds
      propTempOffset = i * 1000 + propOffset;                 // Offset in seconds (msec * 1000)
      if (lookanglesTable.length <= 5000) {                           // Maximum of 1500 lines in the look angles table
        lookanglesRow = propagate2(propTempOffset, satrec);
        if (typeof lookanglesRow != 'undefined') {
          lookanglesTable.push(lookanglesRow);   // Update the table with looks for this 5 second chunk and then increase table counter by 1
        }
      }
    }

    if (satellite.isRiseSetLookangles) {
      satellite.lookanglesInterval = tempLookanglesInterval;
    }
    function propagate2 (propTempOffset, satrec) {
      var lookAngleRecord = {};
      var now = new Date();                                     // Make a time variable
      now.setTime(Number(Date.now()) + propTempOffset);           // Set the time variable to the time in the future
      var j = _jday(now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * millisecondsPerDay;
      var gmst = satellite.gstime(j);

      var m = (j - satrec.jdsatepoch) * minutesPerDay;
      var positionEci = satellite.sgp4(satrec, m);
      var positionEcf, lookAngles, azimuth, elevation, range;

      positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
      lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
      azimuth = lookAngles.azimuth * rad2deg;
      elevation = lookAngles.elevation * rad2deg;
      range = lookAngles.rangeSat;

      if (sensor.obsminaz < sensor.obsmaxaz) {
        if (!((azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (range <= sensor.obsmaxrange && range >= sensor.obsminrange)) ||
        ((azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2))) {
          return;
        }
      }
      if (((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (range <= sensor.obsmaxrange && range >= sensor.obsminrange)) ||
      ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2))) {
        if (satellite.isRiseSetLookangles) {
          // Previous Pass to Calculate first line of coverage
          var now1 = new Date();
          now1.setTime(Number(Date.now()) + propTempOffset - (satellite.lookanglesInterval * 1000));
          var j1 = timeManager.jday(now1.getUTCFullYear(),
          now1.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
          now1.getUTCDate(),
          now1.getUTCHours(),
          now1.getUTCMinutes(),
          now1.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
          j1 += now1.getUTCMilliseconds() * millisecondsPerDay;
          var gmst1 = satellite.gstime(j1);

          var m1 = (j1 - satrec.jdsatepoch) * minutesPerDay;
          var positionEci1 = satellite.sgp4(satrec, m1);
          var positionEcf1, lookAngles1, azimuth1, elevation1, range1;

          positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
          lookAngles1 = satellite.ecfToLookAngles(sensor.observerGd, positionEcf1);
          azimuth1 = lookAngles1.azimuth * rad2deg;
          elevation1 = lookAngles1.elevation * rad2deg;
          range1 = lookAngles1.rangeSat;
          if (!((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (range <= sensor.obsmaxrange && range >= sensor.obsminrange)) ||
          ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2))) {
            return {time: timeManager.dateFormat(now, 'isoDateTime', true),
                    rng: range,
                    az: azimuth,
                    el: elevation};
          } else {
            // Next Pass to Calculate Last line of coverage
            now1.setTime(Number(Date.now()) + propTempOffset - (satellite.lookanglesInterval * 1000));
            j1 = _jday(now1.getUTCFullYear(),
            now1.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
            now1.getUTCDate(),
            now1.getUTCHours(),
            now1.getUTCMinutes(),
            now1.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
            j1 += now1.getUTCMilliseconds() * millisecondsPerDay;
            gmst1 = satellite.gstime(j1);

            m1 = (j1 - satrec.jdsatepoch) * minutesPerDay;
            positionEci1 = satellite.sgp4(satrec, m1);

            positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
            lookAngles1 = satellite.ecfToLookAngles(sensor.observerGd, positionEcf1);
            azimuth1 = lookAngles1.azimuth * rad2deg;
            elevation1 = lookAngles1.elevation * rad2deg;
            range1 = lookAngles1.rangeSat;
            if (!((azimuth1 >= sensor.obsminaz || azimuth1 <= sensor.obsmaxaz) && (elevation1 >= sensor.obsminel && elevation1 <= sensor.obsmaxel) && (range1 <= sensor.obsmaxrange && range1 >= sensor.obsminrange)) ||
            ((azimuth1 >= sensor.obsminaz2 || azimuth1 <= sensor.obsmaxaz2) && (elevation1 >= sensor.obsminel2 && elevation1 <= sensor.obsmaxel2) && (range1 <= sensor.obsmaxrange2 && range1 >= sensor.obsminrange2))) {
              return {time: timeManager.dateFormat(now, 'isoDateTime', true),
                      rng: range,
                      az: azimuth,
                      el: elevation};
            }
          }
          return;
        }
        return {time: timeManager.dateFormat(now, 'isoDateTime', true),
                rng: range,
                az: azimuth,
                el: elevation};
      }
      return;
    }
    function _jday(year, mon, day, hr, minute, sec) { // from satellite.js
      if (!year) {
        // console.error('timeManager.jday should always have a date passed to it!');
        var now;
        now = Date.now();
        jDayStart = new Date(now.getFullYear(), 0, 0);
        jDayDiff = now - jDayStart;
        return Math.floor(jDayDiff / MILLISECONDS_PER_DAY);
      } else {
        return (367.0 * year -
          Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
          Math.floor(275 * mon / 9.0) +
          day + 1721013.5 +
          ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
        );
      }
    }
    return lookanglesTable;
  };
  satellite.getlookangles = function (sat, isLookanglesMenuOpen) {
    if (!isLookanglesMenuOpen) {
      return;
    }
    if (satellite.sensorSelected()) {
      // Set default timing settings. These will be changed to find look angles at different times in future.
      var propTempOffset = 0;               // offset letting us propagate in the future (or past)
      // timeManager.propRealTime = Date.now();      // Set current time

      var propOffset = timeManager.getPropOffset();

      var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
      var tbl = document.getElementById('looks');           // Identify the table to update
      tbl.innerHTML = '';                                   // Clear the table from old object data
      var tblLength = 0;                                   // Iniially no rows to the table

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

      if (satellite.isRiseSetLookangles) {
        var tempLookanglesInterval = satellite.lookanglesInterval;
        satellite.lookanglesInterval = 1;
      }

      for (var i = 0; i < (satellite.lookanglesLength * 24 * 60 * 60); i += satellite.lookanglesInterval) {         // satellite.lookanglesInterval in seconds
        propTempOffset = i * 1000 + propOffset;                 // Offset in seconds (msec * 1000)
        if (tblLength >= 1500) {                           // Maximum of 1500 lines in the look angles table
          break;                                            // No more updates to the table (Prevent GEO object slowdown)
        }
        tblLength += propagate(propTempOffset, tbl, satrec);   // Update the table with looks for this 5 second chunk and then increase table counter by 1
      }

      if (satellite.isRiseSetLookangles) {
        satellite.lookanglesInterval = tempLookanglesInterval;
      }
    }
  };
  function propagate (propTempOffset, tbl, satrec) {
    timeManager.propRealTime = Date.now();
    var now = timeManager.propTimeCheck(propTempOffset, timeManager.propRealTime);
    var j = timeManager.jday(now.getUTCFullYear(),
    now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * millisecondsPerDay;
    var gmst = satellite.gstime(j);

    var m = (j - satrec.jdsatepoch) * minutesPerDay;
    var positionEci = satellite.sgp4(satrec, m);
    var positionEcf, lookAngles, azimuth, elevation, range;

    positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
    lookAngles = satellite.ecfToLookAngles(satellite.currentSensor.observerGd, positionEcf);
    azimuth = lookAngles.azimuth * rad2deg;
    elevation = lookAngles.elevation * rad2deg;
    range = lookAngles.rangeSat;

    if (satellite.currentSensor.obsminaz < satellite.currentSensor.obsmaxaz) {
      if (!((azimuth >= satellite.currentSensor.obsminaz && azimuth <= satellite.currentSensor.obsmaxaz) && (elevation >= satellite.currentSensor.obsminel && elevation <= satellite.currentSensor.obsmaxel) && (range <= satellite.currentSensor.obsmaxrange && range >= satellite.currentSensor.obsminrange)) ||
      ((azimuth >= satellite.currentSensor.obsminaz2 && azimuth <= satellite.currentSensor.obsmaxaz2) && (elevation >= satellite.currentSensor.obsminel2 && elevation <= satellite.currentSensor.obsmaxel2) && (range <= satellite.currentSensor.obsmaxrange2 && range >= satellite.currentSensor.obsminrange2))) {
        return 0;
      }
    }
    if (((azimuth >= satellite.currentSensor.obsminaz || azimuth <= satellite.currentSensor.obsmaxaz) && (elevation >= satellite.currentSensor.obsminel && elevation <= satellite.currentSensor.obsmaxel) && (range <= satellite.currentSensor.obsmaxrange && range >= satellite.currentSensor.obsminrange)) ||
    ((azimuth >= satellite.currentSensor.obsminaz2 || azimuth <= satellite.currentSensor.obsmaxaz2) && (elevation >= satellite.currentSensor.obsminel2 && elevation <= satellite.currentSensor.obsmaxel2) && (range <= satellite.currentSensor.obsmaxrange2 && range >= satellite.currentSensor.obsminrange2))) {
      if (satellite.isRiseSetLookangles) {
        // Previous Pass to Calculate first line of coverage
        var now1 = timeManager.propTimeCheck(propTempOffset - (satellite.lookanglesInterval * 1000), timeManager.propRealTime);
        var j1 = timeManager.jday(now1.getUTCFullYear(),
        now1.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
        now1.getUTCDate(),
        now1.getUTCHours(),
        now1.getUTCMinutes(),
        now1.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
        j1 += now1.getUTCMilliseconds() * millisecondsPerDay;
        var gmst1 = satellite.gstime(j1);

        var m1 = (j1 - satrec.jdsatepoch) * minutesPerDay;
        var positionEci1 = satellite.sgp4(satrec, m1);
        var positionEcf1, lookAngles1, azimuth1, elevation1, range1;

        positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
        lookAngles1 = satellite.ecfToLookAngles(satellite.currentSensor.observerGd, positionEcf1);
        azimuth1 = lookAngles1.azimuth * rad2deg;
        elevation1 = lookAngles1.elevation * rad2deg;
        range1 = lookAngles1.rangeSat;
        if (!((azimuth >= satellite.currentSensor.obsminaz || azimuth <= satellite.currentSensor.obsmaxaz) && (elevation >= satellite.currentSensor.obsminel && elevation <= satellite.currentSensor.obsmaxel) && (range <= satellite.currentSensor.obsmaxrange && range >= satellite.currentSensor.obsminrange)) ||
        ((azimuth >= satellite.currentSensor.obsminaz2 || azimuth <= satellite.currentSensor.obsmaxaz2) && (elevation >= satellite.currentSensor.obsminel2 && elevation <= satellite.currentSensor.obsmaxel2) && (range <= satellite.currentSensor.obsmaxrange2 && range >= satellite.currentSensor.obsminrange2))) {
          var tr = tbl.insertRow();
          var tdT = tr.insertCell();
          tdT.appendChild(document.createTextNode(timeManager.dateFormat(now, 'isoDateTime', true)));
          // tdT.style.border = '1px solid black';
          var tdE = tr.insertCell();
          tdE.appendChild(document.createTextNode(elevation.toFixed(1)));
          var tdA = tr.insertCell();
          tdA.appendChild(document.createTextNode(azimuth.toFixed(0)));
          var tdR = tr.insertCell();
          tdR.appendChild(document.createTextNode(range.toFixed(0)));
          return 1;
        } else {
          // Next Pass to Calculate Last line of coverage
          now1 = timeManager.propTimeCheck(propTempOffset + (satellite.lookanglesInterval * 1000), timeManager.propRealTime);
          j1 = timeManager.jday(now1.getUTCFullYear(),
          now1.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
          now1.getUTCDate(),
          now1.getUTCHours(),
          now1.getUTCMinutes(),
          now1.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
          j1 += now1.getUTCMilliseconds() * millisecondsPerDay;
          gmst1 = satellite.gstime(j1);

          m1 = (j1 - satrec.jdsatepoch) * minutesPerDay;
          positionEci1 = satellite.sgp4(satrec, m1);

          positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
          lookAngles1 = satellite.ecfToLookAngles(satellite.currentSensor.observerGd, positionEcf1);
          azimuth1 = lookAngles1.azimuth * rad2deg;
          elevation1 = lookAngles1.elevation * rad2deg;
          range1 = lookAngles1.rangeSat;
          if (!((azimuth1 >= satellite.currentSensor.obsminaz || azimuth1 <= satellite.currentSensor.obsmaxaz) && (elevation1 >= satellite.currentSensor.obsminel && elevation1 <= satellite.currentSensor.obsmaxel) && (range1 <= satellite.currentSensor.obsmaxrange && range1 >= satellite.currentSensor.obsminrange)) ||
          ((azimuth1 >= satellite.currentSensor.obsminaz2 || azimuth1 <= satellite.currentSensor.obsmaxaz2) && (elevation1 >= satellite.currentSensor.obsminel2 && elevation1 <= satellite.currentSensor.obsmaxel2) && (range1 <= satellite.currentSensor.obsmaxrange2 && range1 >= satellite.currentSensor.obsminrange2))) {
            tr = tbl.insertRow();
            tdT = tr.insertCell();
            tdT.appendChild(document.createTextNode(timeManager.dateFormat(now, 'isoDateTime', true)));
            // tdT.style.border = '1px solid black';
            tdE = tr.insertCell();
            tdE.appendChild(document.createTextNode(elevation.toFixed(1)));
            tdA = tr.insertCell();
            tdA.appendChild(document.createTextNode(azimuth.toFixed(0)));
            tdR = tr.insertCell();
            tdR.appendChild(document.createTextNode(range.toFixed(0)));
            return 1;
          }
        }
        return 0;
      }

      tr = tbl.insertRow();
      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(timeManager.dateFormat(now, 'isoDateTime', true)));
      // tdT.style.border = '1px solid black';
      tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode(elevation.toFixed(1)));
      tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode(azimuth.toFixed(0)));
      tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode(range.toFixed(0)));
      return 1;
    }
    return 0;
  }
  function propagateMultiSite (propTempOffset, tbl, satrec, sensor) {
    // Changes Sensor Name for Lookangles Table
    sensor = satellite.sensorListUS[sensor].googleName;
    var propRealTimeTemp = Date.now();
    var now = timeManager.propTimeCheck(propTempOffset, propRealTimeTemp);
    var j = timeManager.jday(now.getUTCFullYear(),
    now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * millisecondsPerDay;
    var gmst = satellite.gstime(j);

    var m = (j - satrec.jdsatepoch) * minutesPerDay;
    var positionEci = satellite.sgp4(satrec, m);
    var positionEcf, lookAngles, azimuth, elevation, range;

    positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
    lookAngles = satellite.ecfToLookAngles(satellite.currentSensor.observerGd, positionEcf);
    azimuth = lookAngles.azimuth * rad2deg;
    elevation = lookAngles.elevation * rad2deg;
    range = lookAngles.rangeSat;

    if (satellite.currentSensor.obsminaz < satellite.currentSensor.obsmaxaz) {
      if (!((azimuth >= satellite.currentSensor.obsminaz && azimuth <= satellite.currentSensor.obsmaxaz) && (elevation >= satellite.currentSensor.obsminel && elevation <= satellite.currentSensor.obsmaxel) && (range <= satellite.currentSensor.obsmaxrange && range >= satellite.currentSensor.obsminrange)) ||
      ((azimuth >= satellite.currentSensor.obsminaz2 && azimuth <= satellite.currentSensor.obsmaxaz2) && (elevation >= satellite.currentSensor.obsminel2 && elevation <= satellite.currentSensor.obsmaxel2) && (range <= satellite.currentSensor.obsmaxrange2 && range >= satellite.currentSensor.obsminrange2))) {
        return 0;
      }
    }
    if (((azimuth >= satellite.currentSensor.obsminaz || azimuth <= satellite.currentSensor.obsmaxaz) && (elevation >= satellite.currentSensor.obsminel && elevation <= satellite.currentSensor.obsmaxel) && (range <= satellite.currentSensor.obsmaxrange && range >= satellite.currentSensor.obsminrange)) ||
    ((azimuth >= satellite.currentSensor.obsminaz2 || azimuth <= satellite.currentSensor.obsmaxaz2) && (elevation >= satellite.currentSensor.obsminel2 && elevation <= satellite.currentSensor.obsmaxel2) && (range <= satellite.currentSensor.obsmaxrange2 && range >= satellite.currentSensor.obsminrange2))) {
      var tr;
      if (tbl.rows.length > 0) {
        // console.log(tbl.rows[0].cells[0].textContent);
        for (var i = 0; i < tbl.rows.length; i++) {
          var dateString = tbl.rows[i].cells[0].textContent;

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

          if (now < topTime) {
            tr = tbl.insertRow(i);
            break;
          }
        }
      }

      if (tr == null) {
        tr = tbl.insertRow();
      }

      var tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(timeManager.dateFormat(now, 'isoDateTime', true)));
      // tdT.style.border = '1px solid black';
      var tdE = tr.insertCell();
      tdE.appendChild(document.createTextNode(elevation.toFixed(1)));
      var tdA = tr.insertCell();
      tdA.appendChild(document.createTextNode(azimuth.toFixed(0)));
      var tdR = tr.insertCell();
      tdR.appendChild(document.createTextNode(range.toFixed(0)));
      var tdS = tr.insertCell();
      tdS.appendChild(document.createTextNode(sensor));
      return 1;
    }
    return 0;
  }

  satellite.getDOPsTable = function (lat, lon, alt) {
    var now;
    var tbl = document.getElementById('dops');           // Identify the table to update
    tbl.innerHTML = '';                                   // Clear the table from old object data
    var tblLength = 0;
    var propOffset = timeManager.getPropOffset();
    var propTempOffset = 0;

    var tr = tbl.insertRow();
    var tdT = tr.insertCell();
    tdT.appendChild(document.createTextNode('Time'));
    var tdH = tr.insertCell();
    tdH.appendChild(document.createTextNode('HDOP'));
    var tdP = tr.insertCell();
    tdP.appendChild(document.createTextNode('PDOP'));
    var tdG = tr.insertCell();
    tdG.appendChild(document.createTextNode('GDOP'));

    for (var t = 0; t < 1440; t++) {
      propTempOffset = t * 1000 * 60 + propOffset;                 // Offset in seconds (msec * 1000)
      now = timeManager.propTimeCheck(propTempOffset, timeManager.propRealTime);

      dops = satellite.getDOPs(lat, lon, alt, false, now);

      tr = tbl.insertRow();
      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(timeManager.dateFormat(now, 'isoDateTime', true)));
      tdH = tr.insertCell();
      tdH.appendChild(document.createTextNode(dops.HDOP));
      tdP = tr.insertCell();
      tdP.appendChild(document.createTextNode(dops.PDOP));
      tdG = tr.insertCell();
      tdG.appendChild(document.createTextNode(dops.GDOP));
    }
  };

  satellite.getDOPs = function (lat, lon, alt, isDrawLine, propTime) {
    if (typeof lat == 'undefined') {
      console.error('Latitude Required');
      return;
    }
    if (typeof lon == 'undefined') {
      console.error('Longitude Required');
      return;
    }
    alt = (typeof alt != 'undefined') ? alt : 0;
    isDrawLine = (typeof isDrawLine != 'undefined') ? isDrawLine : false;

    lat = lat * DEG2RAD;
    lon = lon * DEG2RAD;

    var sat;
    var lookAngles, az, el;
    var azList = [];
    var elList = [];
    var inViewList = [];

    if (typeof groups.GPSGroup == 'undefined') {
      groups.GPSGroup = new groups.SatGroup('nameRegex', /NAVSTAR/);
    }

    if (typeof propTime == 'undefined') propTime = timeManager.propTime();
    var j = timeManager.jday(propTime.getUTCFullYear(),
                 propTime.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 propTime.getUTCDate(),
                 propTime.getUTCHours(),
                 propTime.getUTCMinutes(),
                 propTime.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += propTime.getUTCMilliseconds() * 1.15741e-8;
    var gmst = satellite.gstime(j);

    var referenceECF = {};
    var cosLat = Math.cos(lat);
    var sinLat = Math.sin(lat);
    var cosLon = Math.cos((lon) + gmst);
    var sinLon = Math.sin((lon) + gmst);

    referenceECF.x = (6371 + 0.25) * cosLat * cosLon; // 6371 is radius of earth
    referenceECF.y = (6371 + 0.25) * cosLat * sinLon;
    referenceECF.z = (6371 + 0.25) * sinLat;

    for (var i = 0; i < groups.GPSGroup.sats.length; i++) {
      sat = satSet.getSat(groups.GPSGroup.sats[i].satId);
      lookAngles = satellite.ecfToLookAngles({longitude: lon, latitude: lat, height: alt}, satellite.eciToEcf(sat.position, gmst));
      sat.az = lookAngles.azimuth * RAD2DEG;
      sat.el = lookAngles.elevation * RAD2DEG;
      if (sat.el > settingsManager.gpsElevationMask) {
        inViewList.push(sat);
      }
    }

    return satellite.calculateDOPs(inViewList, referenceECF, isDrawLine);
  };

  satellite.calculateDOPs = function (satList, referenceECF, isDrawLine) {
    var dops = {};

    nsat = satList.length;
    if (nsat < 4) {
        dops.PDOP = 50;
        dops.HDOP = 50;
        dops.GDOP = 50;
        dops.VDOP = 50;
        dops.TDOP = 50;
        // console.error("Need More Satellites");
        return dops;
    }

    var A = numeric.rep([nsat, 4], 0);
    var azlist = [];
    var elvlist = [];
    if (isDrawLine) drawLineList = [];
    for (var n = 1; n <= nsat; n++) {
        var cursat = satList[n-1];

        if (isDrawLine) {
          drawLineList[n-1] = {};
          drawLineList[n-1].line = new Line();
          drawLineList[n-1].sat = cursat;
          drawLineList[n-1].ref = [referenceECF.x, referenceECF.y, referenceECF.z];
        }

        var az = cursat.az;
        var elv = cursat.el;

        azlist.push(az);
        elvlist.push(elv);
        var B = [Math.cos(elv * Math.PI / 180.0) * Math.sin(az * Math.PI / 180.0), Math.cos(elv * Math.PI / 180.0) * Math.cos(az * Math.PI / 180.0), Math.sin(elv * Math.PI / 180.0), 1];
        numeric.setBlock(A, [n - 1, 0], [n - 1, 3], [B]);
    }
    var Q = numeric.dot(numeric.transpose(A), A);
    var Qinv = numeric.inv(Q);
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

  function _Nearest180 (arr) {
    var  maxDiff = null;
    for(var x = 0; x < arr.length; x++){
      for(var y = x+1; y < arr.length; y++){
          if(arr[x] < arr[y] && maxDiff < (arr[y] - arr[x])){
              if (arr[y] - arr[x] > 180) {
                arr[y] = arr[y] - 180;
              }
              if (maxDiff < (arr[y] - arr[x])) {
                maxDiff = arr[y] - arr[x];
              }
          }
      }
    }
    return maxDiff === null ? -1 : maxDiff;
  }

  satellite.getSunTimes = function (sat, sensor, searchLength, interval) {
    // If no sensor passed to function then try to use the 'currentSensor'
    if (typeof sensor == 'undefined') {
      if (typeof satellite.currentSensor == 'undefined') {
        throw 'getTEARR requires a sensor or for a sensor to be currently selected.';
      } else {
        sensor = satellite.currentSensor;
      }
    }
    // If sensor's observerGd is not set try to set it using it parameters
    if (typeof sensor.observerGd == 'undefined') {
      try {
        sensor.observerGd = {
          height: sensor.obshei,
          latitude: sensor.lat,
          longitude: sensor.long
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
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    var minDistanceApart = 100000000000;
    var minDistTime;
    for (var i = 0; i < (searchLength * 24 * 60 * 60); i += interval) {         // 5second Looks
      propTempOffset = i * 1000 + propOffset;                 // Offset in seconds (msec * 1000)
      var now = timeManager.propTimeCheck(propTempOffset, timeManager.propRealTime);
      var j = timeManager.jday(now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * millisecondsPerDay;
      var gmst = satellite.gstime(j);

      var sunXYZ = sun.getDirection2(j);
      // console.log(sunXYZ);
      var sunX = sunXYZ[0] * 1000000;
      var sunY = sunXYZ[1] * 1000000;
      var sunZ = sunXYZ[2] * 1000000;

      var m = (j - satrec.jdsatepoch) * minutesPerDay;
      var positionEci = satellite.sgp4(satrec, m);
      var positionEcf, lookAngles, azimuth, elevation, range;

      var distanceApartX = Math.pow(sunX - positionEci.position.x, 2);
      var distanceApartY = Math.pow(sunY - positionEci.position.y, 2);
      var distanceApartZ = Math.pow(sunZ - positionEci.position.z, 2);
      var distanceApart = Math.sqrt(distanceApartX + distanceApartY + distanceApartZ);

      positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
      lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
      gpos = satellite.eciToGeodetic(positionEci.position, gmst);
      alt = gpos.height * 1000; // Km to m
      lon = gpos.longitude;
      lat = gpos.latitude;
      azimuth = lookAngles.azimuth * rad2deg;
      elevation = lookAngles.elevation * rad2deg;
      range = lookAngles.rangeSat;

      if (sensor.obsminaz > sensor.obsmaxaz) {
        if (((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (range <= sensor.obsmaxrange && range >= sensor.obsminrange)) ||
           ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2))) {
             if (distanceApart < minDistanceApart) {
               minDistanceApart = distanceApart;
               minDistTime = now;
             }
        }
      } else {
        if (((azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (range <= sensor.obsmaxrange && range >= sensor.obsminrange)) ||
           ((azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2))) {
             if (distanceApart < minDistanceApart) {
               minDistanceApart = distanceApart;
               minDistTime = now;
             }
        }
      }
    }
    console.log('minDistanceApart: ' + minDistanceApart);
    console.log('minDistTime: ' + minDistTime);

    //return 'No Passes in ' + satellite.lookanglesLength + ' Days';
  };

  satellite.lookAnglesToEcf = function (azimuthDeg, elevationDeg, slantRange, obs_lat, obs_long, obs_alt) {

      // site ecef in meters
      var geodeticCoords = {};
      geodeticCoords.latitude = obs_lat;
      geodeticCoords.longitude = obs_long;
      geodeticCoords.height = obs_alt;

      var siteXYZ = satellite.geodeticToEcf(geodeticCoords);
      var sitex, sitey, sitez;
      sitex = siteXYZ.x;
      sitey = siteXYZ.y;
      sitez = siteXYZ.z;

      // some needed calculations
      var slat = Math.sin(obs_lat);
      var slon = Math.sin(obs_long);
      var clat = Math.cos(obs_lat);
      var clon = Math.cos(obs_long);

      var azRad = DEG2RAD * azimuthDeg;
      var elRad = DEG2RAD * elevationDeg;

      // az,el,range to sez convertion
      var south  = -slantRange * Math.cos(elRad) * Math.cos(azRad);
      var east   =  slantRange * Math.cos(elRad) * Math.sin(azRad);
      var zenith =  slantRange * Math.sin(elRad);

      var x = ( slat * clon * south) + (-slon * east) + (clat * clon * zenith) + sitex;
      var y = ( slat * slon * south) + ( clon * east) + (clat * slon * zenith) + sitey;
      var z = (-clat *        south) + ( slat * zenith) + sitez;

    return {'x': x, 'y': y, 'z': z};
  };

  satellite.xyz2latlon = function (x, y, z) {
    var propTime = timeManager.propTime();
    var j = timeManager.jday(propTime.getUTCFullYear(),
                 propTime.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 propTime.getUTCDate(),
                 propTime.getUTCHours(),
                 propTime.getUTCMinutes(),
                 propTime.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += propTime.getUTCMilliseconds() * 1.15741e-8;
    var gmst = satellite.gstime(j);
    var latLon = satellite.eciToGeodetic({x: x, y: y, z: z}, gmst);
    latLon.latitude = latLon.latitude * RAD2DEG;
    latLon.longitude = latLon.longitude * RAD2DEG;

    latLon.longitude = (latLon.longitude > 180) ? latLon.longitude - 360 : latLon.longitude;
    latLon.longitude = (latLon.longitude < -180) ? latLon.longitude + 360 : latLon.longitude;
    return latLon;
  };

  satellite.isInSun = function (sat) {
    // Distances all in km
    var sunECI = sun.getXYZ();
    // NOTE: Position needs to be relative to satellite NOT ECI
    // var distSatEarthX = Math.pow(-sat.position.x, 2);
    // var distSatEarthY = Math.pow(-sat.position.y, 2);
    // var distSatEarthZ = Math.pow(-sat.position.z, 2);
    // var distSatEarth = Math.sqrt(distSatEarthX + distSatEarthY + distSatEarthZ);
    // var semiDiamEarth = Math.asin(RADIUS_OF_EARTH/distSatEarth) * RAD2DEG;
    var semiDiamEarth = Math.asin(RADIUS_OF_EARTH/Math.sqrt(Math.pow(-sat.position.x, 2) + Math.pow(-sat.position.y, 2) + Math.pow(-sat.position.z, 2))) * RAD2DEG;

    // NOTE: Position needs to be relative to satellite NOT ECI
    // var distSatSunX = Math.pow(-sat.position.x + sunECI.x, 2);
    // var distSatSunY = Math.pow(-sat.position.y + sunECI.y, 2);
    // var distSatSunZ = Math.pow(-sat.position.z + sunECI.z, 2);
    // var distSatSun = Math.sqrt(distSatSunX + distSatSunY + distSatSunZ);
    // var semiDiamSun = Math.asin(RADIUS_OF_SUN/distSatSun) * RAD2DEG;
    var semiDiamSun = Math.asin(RADIUS_OF_SUN/Math.sqrt(Math.pow(-sat.position.x + sunECI.x, 2) + Math.pow(-sat.position.y + sunECI.y, 2) + Math.pow(-sat.position.z + sunECI.z, 2))) * RAD2DEG;

    // Angle between earth and sun
    var theta = Math.acos(numeric.dot([-sat.position.x,-sat.position.y,-sat.position.z],[-sat.position.x + sunECI.x,-sat.position.y + sunECI.y,-sat.position.z + sunECI.z])/(Math.sqrt(Math.pow(-sat.position.x, 2) + Math.pow(-sat.position.y, 2) + Math.pow(-sat.position.z, 2))*Math.sqrt(Math.pow(-sat.position.x + sunECI.x, 2) + Math.pow(-sat.position.y + sunECI.y, 2) + Math.pow(-sat.position.z + sunECI.z, 2)))) * RAD2DEG;

    // var isSun = false;

    // var isUmbral = false;
    if ((semiDiamEarth > semiDiamSun) && (theta < semiDiamEarth - semiDiamSun)) {
      // isUmbral = true;
      return 0;
    }

    // var isPenumbral = false;
    if ((Math.abs(semiDiamEarth - semiDiamSun) < theta) && (theta < semiDiamEarth + semiDiamSun)){
      // isPenumbral = true;
      return 1;
    }

    if (semiDiamSun > semiDiamEarth) {
      // isPenumbral = true;
      return 1;
    }

    if (theta < semiDiamSun - semiDiamEarth) {
      // isPenumbral = true;
      return 1;
    }

    // if (!isUmbral && !isPenumbral) isSun = true;
    return 2;
  };

  // NOTE Specific to my project.
  satellite.map = function (sat, i) {
    // Set default timing settings. These will be changed to find look angles at different times in future.
    var propOffset = timeManager.getPropOffset();
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    var propTempOffset = i * sat.period / 50 * 60 * 1000 + propOffset;             // Offset in seconds (msec * 1000)
    return propagate(propTempOffset, satrec);   // Update the table with looks for this 5 second chunk and then increase table counter by 1

    function propagate (propOffset, satrec) {
      var now = timeManager.propTimeCheck(propOffset, timeManager.propRealTime);
      var j = timeManager.jday(now.getUTCFullYear(),
                   now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                   now.getUTCDate(),
                   now.getUTCHours(),
                   now.getUTCMinutes(),
                   now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * millisecondsPerDay;
      var gmst = satellite.gstime(j);

      var m = (j - satrec.jdsatepoch) * minutesPerDay;
      var positionEci = satellite.sgp4(satrec, m);

      var gpos, lat, lon;

      gpos = satellite.eciToGeodetic(positionEci.position, gmst);

      lat = satellite.degreesLat(gpos.latitude);
      lon = satellite.degreesLong(gpos.longitude);
      var time = timeManager.dateFormat(now, 'isoDateTime', true);

      var positionEcf, lookAngles, azimuth, elevation, range;
      positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
      lookAngles = satellite.ecfToLookAngles(satellite.currentSensor.observerGd, positionEcf);
      azimuth = lookAngles.azimuth * rad2deg;
      elevation = lookAngles.elevation * rad2deg;
      range = lookAngles.rangeSat;
      var inview = 0;

      if (satellite.currentSensor.obsminaz < satellite.currentSensor.obsmaxaz) {
        if (((azimuth >= satellite.currentSensor.obsminaz && azimuth <= satellite.currentSensor.obsmaxaz) && (elevation >= satellite.currentSensor.obsminel && elevation <= satellite.currentSensor.obsmaxel) && (range <= satellite.currentSensor.obsmaxrange && range >= satellite.currentSensor.obsminrange)) ||
           ((azimuth >= satellite.currentSensor.obsminaz2 && azimuth <= satellite.currentSensor.obsmaxaz2) && (elevation >= satellite.currentSensor.obsminel2 && elevation <= satellite.currentSensor.obsmaxel2) && (range <= satellite.currentSensor.obsmaxrange2 && range >= satellite.currentSensor.obsminrange2))) {
          inview = 1;
        }
      } else {
        if (((azimuth >= satellite.currentSensor.obsminaz || azimuth <= satellite.currentSensor.obsmaxaz) && (elevation >= satellite.currentSensor.obsminel && elevation <= satellite.currentSensor.obsmaxel) && (range <= satellite.currentSensor.obsmaxrange && range >= satellite.currentSensor.obsminrange)) ||
           ((azimuth >= satellite.currentSensor.obsminaz2 || azimuth <= satellite.currentSensor.obsmaxaz2) && (elevation >= satellite.currentSensor.obsminel2 && elevation <= satellite.currentSensor.obsmaxel2) && (range <= satellite.currentSensor.obsmaxrange2 && range >= satellite.currentSensor.obsminrange2))) {
          inview = 1;
        }
      }

      return {lat: lat, lon: lon, time: time, inview: inview};
    }
  };
})();
