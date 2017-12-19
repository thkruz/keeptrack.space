/* global

  $
  satellite
  timeManager

*/

// Constants
var TAU = 2 * Math.PI;
var DEG2RAD = TAU / 360;
var RAD2DEG = 360 / TAU;
var MINUTES_PER_DAY = 1440;
var MILLISECONDS_PER_DAY = 1.15741e-8;

(function () {
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
    var epochDay = timeManager.getDayOfYear(currentDate) + (currentDate.getUTCHours() * 3600 + currentDate.getUTCMinutes() * 60 + currentDate.getUTCSeconds()) / (1440 * 60);
    return [epochYear, epochDay];
  };
  satellite.distance = function (hoverSat, selectedSat) {
    if (selectedSat == null || hoverSat == null) {
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
      return;
    }

    satellite.currentSensor = sensor;
    satellite.currentSensor.observerGd = {   // Array to calculate look angles in propagate()
      latitude: sensor.lat * DEG2RAD,
      longitude: sensor.long * DEG2RAD,
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

    var propTime = propTimeCheck(propOffset, timeManager.propRealTime);
    var j = timeManager.jday(propTime.getUTCFullYear(),
                 propTime.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 propTime.getUTCDate(),
                 propTime.getUTCHours(),
                 propTime.getUTCMinutes(),
                 propTime.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += propTime.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    var gmst = satellite.gstime(j);

    var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
    var positionEci = satellite.sgp4(satrec, m);
    var gpos;

    try {
      gpos = satellite.eciToGeodetic(positionEci.position, gmst);
    } catch (e) {
      return 0; // Auto fail the altitude check
    }
    return gpos.height;
  };
  satellite.getTEARR = function (sat, sensor) {
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
    }

    // Set default timing settings. These will be changed to find look angles at different times in future.
    timeManager.propRealTime = Date.now();
    var propOffset = getPropOffset();               // offset letting us propagate in the future (or past)
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
    var now = propTimeCheck(propOffset, timeManager.propRealTime);
    var j = timeManager.jday(now.getUTCFullYear(),
                 now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                 now.getUTCDate(),
                 now.getUTCHours(),
                 now.getUTCMinutes(),
                 now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    var gmst = satellite.gstime(j);

    var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
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
      currentTEARR.azimuth = lookAngles.azimuth * RAD2DEG;
      currentTEARR.elevation = lookAngles.elevation * RAD2DEG;
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

    var propOffset = getPropOffset();
    var propTempOffset = 0;
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    for (var i = 0; i < (searchLength * 24 * 60 * 60); i += interval) {         // 5second Looks
      propTempOffset = i * 1000 + propOffset;                 // Offset in seconds (msec * 1000)
      var now = propTimeCheck(propTempOffset, timeManager.propRealTime);
      var j = timeManager.jday(now.getUTCFullYear(),
      now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
      var gmst = satellite.gstime(j);

      var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
      var positionEci = satellite.sgp4(satrec, m);
      var positionEcf, lookAngles, azimuth, elevation, range;

      positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
      lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
      azimuth = lookAngles.azimuth * RAD2DEG;
      elevation = lookAngles.elevation * RAD2DEG;
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

  // TODO: Replace the tables in these functions with arrays that are then turned into tables in main.js
  // This will help with the end goal of making these functions part of the satellite library
  satellite.getlookanglesMultiSite = function (sat, isLookanglesMultiSiteMenuOpen) {
    if (!isLookanglesMultiSiteMenuOpen) return;

    var resetWhenDone = false;
    if (!satellite.sensorSelected()) { resetWhenDone = true; }

    // Set default timing settings. These will be changed to find look angles at different times in future.
    var propTempOffset = 0;               // offset letting us propagate in the future (or past)
    // timeManager.propRealTime = Date.now();      // Set current time

    var propOffset = getPropOffset();
    satellite.tempSensor = satellite.currentSensor;
    satellite.setobs(satellite.sensorListUS[0]);

    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    var orbitalPeriod = MINUTES_PER_DAY / (satrec.no * MINUTES_PER_DAY / TAU); // Seconds in a day divided by mean motion
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
  satellite.getOrbitByLatLon = function (sat, goalLat, goalLon, upOrDown, propOffset) {
    /**
     * Function to brute force find an orbit over a sites lattiude and longitude
     * @param  object       sat             satellite object with satrec
     * @param  long         goalLat         Goal Latitude
     * @param  long         goalLon         Goal Longitude
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
    var lastLat;
    var isUpOrDown;
    var rascOffset = false;

    for (var i = 0; i < (520 * 10); i += 1) { /** Rotate Mean Anomaly 0.1 Degree at a Time for Up To 400 Degrees */
      var meanACalcResults = meanaCalc(i, rascOffset);
      if (meanACalcResults === 1) {
        if (isUpOrDown !== upOrDown) { // If Object is moving opposite of the goal direction (upOrDown)
          // rascOffset = true;
          i = i + 20;                 // Move 2 Degrees ahead in the orbit to prevent being close on the next lattiude check
        } else {
          break; // Stop changing the Mean Anomaly
        }
      }
      if (meanACalcResults === 5) {
        i += (10 * 10); // Change meanA faster
      }
      if (meanACalcResults === 2) { return ['Error', '']; }
    }

    for (i = 0; i < (5200 * 100); i += 1) {         // 520 degress in 0.01 increments TODO More precise?
      if (rascOffset && i === 0) {
        i = (mainRasc - 10) * 100;
      }
      var rascCalcResults = rascCalc(i);
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

    function meanaCalc (meana, rascOffset) {
      var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs

      meana = meana / 10;
      meana = parseFloat(meana).toPrecision(7);
      meana = pad(meana, 8);

      var rasc = (sat.raan * RAD2DEG).toPrecision(7);
      // if (rascOffset) {
      //   rasc = (rasc * 1) + 180; // Spin the orbit 180 degrees.
      //   if (rasc > 360) {
      //     rasc = (rasc * 1) - 360; // angle can't be bigger than 360
      //   }
      // }
      mainRasc = rasc;
      rasc = rasc.toString().split('.');
      rasc[0] = rasc[0].substr(-3, 3);
      rasc[1] = rasc[1].substr(0, 4);
      rasc = (rasc[0] + '.' + rasc[1]).toString();
      rasc = pad(rasc, 8);

      var scc = sat.SCC_NUM;

      var intl = sat.TLE1.substr(9, 8);
      var inc = (sat.inclination * RAD2DEG).toPrecision(7);
      inc = inc.split('.');
      inc[0] = inc[0].substr(-3, 3);
      inc[1] = inc[1].substr(0, 4);
      inc = (inc[0] + '.' + inc[1]).toString();

      inc = pad(inc, 8);
      var epochyr = sat.TLE1.substr(18, 2);
      var epochday = sat.TLE1.substr(20, 12);

      var meanmo = sat.TLE2.substr(52, 11);

      var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

      var argPe = (sat.argPe * RAD2DEG).toPrecision(7);
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
        mainMeana = meana;
        return 1;
      }
      return propagateResults;
    }

    function rascCalc (rasc) {
      var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
      var meana = mainMeana;

      rasc = rasc / 100;
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
      var inc = (sat.inclination * RAD2DEG).toPrecision(7);
      inc = inc.split('.');
      inc[0] = inc[0].substr(-3, 3);
      inc[1] = inc[1].substr(0, 4);
      inc = (inc[0] + '.' + inc[1]).toString();

      inc = pad(inc, 8);
      var epochyr = sat.TLE1.substr(18, 2);
      var epochday = sat.TLE1.substr(20, 12);

      var meanmo = sat.TLE2.substr(52, 11);

      var ecen = sat.eccentricity.toPrecision(7).substr(2, 7);

      var argPe = (sat.argPe * RAD2DEG).toPrecision(7);
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
      // 1 === If RASC within 0.15 degrees then good enough
      // 5 === If RASC outside 15 degrees then rotate RASC faster
      return propNewRasc;
    }

    function getOrbitByLatLonPropagate (propOffset, satrec, type) {
      timeManager.propRealTime = Date.now();
      var now = propTimeCheck(propOffset, timeManager.propRealTime);
      var j = timeManager.jday(now.getUTCFullYear(),
                   now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                   now.getUTCDate(),
                   now.getUTCHours(),
                   now.getUTCMinutes(),
                   now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
      var gmst = satellite.gstime(j);

      var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
      var positionEci = satellite.sgp4(satrec, m);

      var gpos, lat, lon;

      try {
        gpos = satellite.eciToGeodetic(positionEci.position, gmst);
      } catch (err) {
        return 2;
      }

      lat = satellite.degreesLat(gpos.latitude) * 1;
      lon = satellite.degreesLong(gpos.longitude) * 1;

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

      // If current latitude greater than 11 degrees off rotate meanA faster
      if (!(lat > (goalLat - 11) && lat < (goalLat + 11)) && type === 1) {
        return 5;
      }

      // If current longitude greater than 11 degrees off rotate RASC faster
      if (!(lon > (goalLon - 11) && lon < (goalLon + 11)) && type === 2) {
        return 5;
      }

      return 0;
    }
  };
  satellite.getlookangles = function (sat, isLookanglesMenuOpen) {
    if (!isLookanglesMenuOpen) {
      return;
    }
    if (satellite.sensorSelected()) {
      // Set default timing settings. These will be changed to find look angles at different times in future.
      var propTempOffset = 0;               // offset letting us propagate in the future (or past)
      // timeManager.propRealTime = Date.now();      // Set current time

      var propOffset = getPropOffset();

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
  function getPropOffset () {
    var selectedDate = $('#datetime-text').text().substr(0, 19);
    selectedDate = selectedDate.split(' ');
    selectedDate = new Date(selectedDate[0] + 'T' + selectedDate[1] + 'Z');
    var today = new Date();
    var propOffset = selectedDate - today;// - (selectedDate.getTimezoneOffset() * 60 * 1000);
    return propOffset;
  }
  function propagate (propTempOffset, tbl, satrec) {
    timeManager.propRealTime = Date.now();
    var now = propTimeCheck(propTempOffset, timeManager.propRealTime);
    var j = timeManager.jday(now.getUTCFullYear(),
    now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    var gmst = satellite.gstime(j);

    var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
    var positionEci = satellite.sgp4(satrec, m);
    var positionEcf, lookAngles, azimuth, elevation, range;

    positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
    lookAngles = satellite.ecfToLookAngles(satellite.currentSensor.observerGd, positionEcf);
    azimuth = lookAngles.azimuth * RAD2DEG;
    elevation = lookAngles.elevation * RAD2DEG;
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
        var now1 = propTimeCheck(propTempOffset - (satellite.lookanglesInterval * 1000), timeManager.propRealTime);
        var j1 = timeManager.jday(now1.getUTCFullYear(),
        now1.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
        now1.getUTCDate(),
        now1.getUTCHours(),
        now1.getUTCMinutes(),
        now1.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
        j1 += now1.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
        var gmst1 = satellite.gstime(j1);

        var m1 = (j1 - satrec.jdsatepoch) * MINUTES_PER_DAY;
        var positionEci1 = satellite.sgp4(satrec, m1);
        var positionEcf1, lookAngles1, azimuth1, elevation1, range1;

        positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
        lookAngles1 = satellite.ecfToLookAngles(satellite.currentSensor.observerGd, positionEcf1);
        azimuth1 = lookAngles1.azimuth * RAD2DEG;
        elevation1 = lookAngles1.elevation * RAD2DEG;
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
          now1 = propTimeCheck(propTempOffset + (satellite.lookanglesInterval * 1000), timeManager.propRealTime);
          j1 = timeManager.jday(now1.getUTCFullYear(),
          now1.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
          now1.getUTCDate(),
          now1.getUTCHours(),
          now1.getUTCMinutes(),
          now1.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
          j1 += now1.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
          gmst1 = satellite.gstime(j1);

          m1 = (j1 - satrec.jdsatepoch) * MINUTES_PER_DAY;
          positionEci1 = satellite.sgp4(satrec, m1);

          positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
          lookAngles1 = satellite.ecfToLookAngles(satellite.currentSensor.observerGd, positionEcf1);
          azimuth1 = lookAngles1.azimuth * RAD2DEG;
          elevation1 = lookAngles1.elevation * RAD2DEG;
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
    var now = propTimeCheck(propTempOffset, propRealTimeTemp);
    var j = timeManager.jday(now.getUTCFullYear(),
    now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
    j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
    var gmst = satellite.gstime(j);

    var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
    var positionEci = satellite.sgp4(satrec, m);
    var positionEcf, lookAngles, azimuth, elevation, range;

    positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
    lookAngles = satellite.ecfToLookAngles(satellite.currentSensor.observerGd, positionEcf);
    azimuth = lookAngles.azimuth * RAD2DEG;
    elevation = lookAngles.elevation * RAD2DEG;
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
  function propTimeCheck (propTempOffset, propRealTime) {
    'use strict';
    var now = new Date();                                     // Make a time variable
    now.setTime(Number(propRealTime) + propTempOffset);           // Set the time variable to the time in the future
    return now;
  }

  // NOTE Specific to my project.
  satellite.map = function (sat, i) {
    // Set default timing settings. These will be changed to find look angles at different times in future.
    var propOffset = getPropOffset();
    var satrec = satellite.twoline2satrec(sat.TLE1, sat.TLE2);// perform and store sat init calcs
    var propTempOffset = i * sat.period / 50 * 60 * 1000 + propOffset;             // Offset in seconds (msec * 1000)
    return propagate(propTempOffset, satrec);   // Update the table with looks for this 5 second chunk and then increase table counter by 1

    function propagate (propOffset, satrec) {
      var now = propTimeCheck(propOffset, timeManager.propRealTime);
      var j = timeManager.jday(now.getUTCFullYear(),
                   now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
                   now.getUTCDate(),
                   now.getUTCHours(),
                   now.getUTCMinutes(),
                   now.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
      j += now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
      var gmst = satellite.gstime(j);

      var m = (j - satrec.jdsatepoch) * MINUTES_PER_DAY;
      var positionEci = satellite.sgp4(satrec, m);

      var gpos, lat, lon;

      gpos = satellite.eciToGeodetic(positionEci.position, gmst);

      lat = satellite.degreesLat(gpos.latitude);
      lon = satellite.degreesLong(gpos.longitude);
      var time = timeManager.dateFormat(now, 'isoDateTime', true);

      var positionEcf, lookAngles, azimuth, elevation, range;
      positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
      lookAngles = satellite.ecfToLookAngles(satellite.currentSensor.observerGd, positionEcf);
      azimuth = lookAngles.azimuth * RAD2DEG;
      elevation = lookAngles.elevation * RAD2DEG;
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


  window.lookangles = lookangles;
})();
