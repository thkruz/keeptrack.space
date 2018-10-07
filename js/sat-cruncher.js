/* global

    satellite
    importScripts
    postMessage
    onmessage: true

*/
/* exported

    onmessage

*/
importScripts('lib/satellite.js');

// /////////////////////////////////////////////
// TODO: Clean the top of this file up, it's a mess
// /////////////////////////////////////////////

/** CONSTANTS */
var TAU = 2 * Math.PI;            // PI * 2 -- This makes understanding the formulas easier
var DEG2RAD = TAU / 360;          // Used to convert degrees to radians
var RAD2DEG = 360 / TAU;          // Used to convert radians to degrees
var RADIUS_OF_EARTH = 6371;       // Radius of Earth in kilometers
var globalPropagationRate = 1000;
var globalPropagationRateMultiplier = 1;

/** ARRAYS */
var satCache = [];                // Cache of Satellite Data from TLE.json and Static Data from variable.js
var satPos, satVel;               // Array of current Satellite and Static Positions and Velocities
var satInView;                    // Array of booleans showing if current Satellite is in view of Sensor

var satelliteSelected = [-1];
var selectedSatFOV = 90; // FOV in Degrees

var isShowFOVBubble = false;
var isResetFOVBubble = false;
var isShowSatOverfly = false;
var isResetSatOverfly = false;
var isMultiSensor = false;
var planetariumView = false;

/** OBSERVER VARIABLES */
var sensor = {};
var mSensor;
var defaultGd = {
  lat: null,
  longitude: 0,
  latitude: 0,
  height: 0
};
sensor.defaultGd = defaultGd;
sensor.observerGd = defaultGd;
var propagationRunning = false;
var divisor = 1;

/** TIME VARIABLES */
var propOffset = 0;                 // offset varting us propagate in the future (or past)
var propRate = 1;                   // vars us run time faster (or slower) than normal
var propRealTime = Date.now();      // vars us run time faster (or slower) than normal

onmessage = function (m) {
  propRealTime = Date.now();

  if (m.data.planetariumView) {
    planetariumView = true;
  }
  if (m.data.nonPlanetariumView){
    planetariumView = false;
  }

  if (m.data.satelliteSelected){
    satelliteSelected = m.data.satelliteSelected;
    if (satelliteSelected[0] === -1) {
      isResetSatOverfly = true;
    }
  }

  if (m.data.isSlowCPUModeEnabled) {
    globalPropagationRateMultiplier = 2;
  }

  // //////////////////////////////
  // SAT OVERFLY AND FOV BUBBLE
  // /////////////////////////////
  if (m.data.fieldOfViewSetLength) {
    fieldOfViewSetLength = m.data.fieldOfViewSetLength;
  }
  if (m.data.isShowSatOverfly === 'enable') {
    isShowSatOverfly = true;
    selectedSatFOV = m.data.selectedSatFOV;
  }
  if (m.data.isSatOverfly === 'reset') {
    isResetSatOverfly = true;
    isShowSatOverfly = false;
  }

  if (m.data.isShowFOVBubble === 'enable') {
    isShowFOVBubble = true;
  }
  if (m.data.isShowFOVBubble === 'reset') {
    isResetFOVBubble = true;
    isShowFOVBubble = false;
  }
  // ////////////////////////////////

  if (m.data.multiSensor) {
    isMultiSensor = true;
    mSensor = m.data.sensor;
    globalPropagationRate = 2000;
  } else if (m.data.sensor) {
    sensor = m.data.sensor;
    if (m.data.setlatlong) {
      if (m.data.resetObserverGd) {
        globalPropagationRate = 1000;
        sensor.observerGd = defaultGd;
      } else {
        globalPropagationRate = 2000;
        sensor.observerGd = {
          longitude: m.data.sensor.long * DEG2RAD,
          latitude: m.data.sensor.lat * DEG2RAD,
          height: m.data.sensor.obshei * 1 // Convert from string
        };
      }
    }
    isMultiSensor = false;
  }

  switch (m.data.typ) {
    case 'offset':
      propOffset = Number(m.data.dat.split(' ')[0]);
      propRate = Number(m.data.dat.split(' ')[1]);
      divisor = Math.max(propRate, 0.1);
      return;
    case 'satdata':
      var satData = JSON.parse(m.data.dat);
      len = satData.length;
      var i = 0;

      var extraData = [];
      var extra = {};
      var satrec;
      while (i < len) {
        extra = {};
        satrec = null;
        if ((satData[i].static) || (satData[i].missile)) {
          satrec = satData[i];
          extraData.push(extra);
          satCache.push(satrec);
          i++;
          continue;
        } else {
          satrec = satellite.twoline2satrec( // perform and store sat init calcs
            satData[i].TLE1, satData[i].TLE2);
          extra.inclination = satrec.inclo; // rads
          extra.eccentricity = satrec.ecco;
          extra.raan = satrec.nodeo;        // rads
          extra.argPe = satrec.argpo;       // rads
          extra.meanMotion = satrec.no * 60 * 24 / TAU; // convert rads/minute to rev/day
          extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, (2 / 3));
          extra.semiMinorAxis = extra.semiMajorAxis * Math.sqrt(1 - Math.pow(extra.eccentricity, 2));
          extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - RADIUS_OF_EARTH;
          extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - RADIUS_OF_EARTH;
          extra.period = 1440.0 / extra.meanMotion;

          extraData.push(extra);
          satCache.push(satrec);
          i++;
        }
      }

      satPos = new Float32Array(len * 3);
      satVel = new Float32Array(len * 3);
      satInView = new Float32Array(len);

      postMessage({
        extraData: JSON.stringify(extraData)
      });
      satData = null;
      break;
    case 'satEdit':
      // TODO: This code is not optimized yet. Making arrays for one object is unnecessary
      // and I am not sure if there is any reason to convert to JSON back and forth from the web workers.
      satCache[m.data.id] = satellite.twoline2satrec( // replace old TLEs
        m.data.TLE1, m.data.TLE2);
      satrec = satCache[m.data.id];
      extraData = [];
      extra = {};
      // keplerian elements
      extra.inclination = satrec.inclo; // rads
      extra.eccentricity = satrec.ecco;
      extra.raan = satrec.nodeo;        // rads
      extra.argPe = satrec.argpo;       // rads
      extra.meanMotion = satrec.no * 60 * 24 / (2 * Math.PI); // convert rads/minute to rev/day

      // fun other data
      extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, (2 / 3));
      extra.semiMinorAxis = extra.semiMajorAxis * Math.sqrt(1 - Math.pow(extra.eccentricity, 2));
      extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - RADIUS_OF_EARTH;
      extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - RADIUS_OF_EARTH;
      extra.period = 1440.0 / extra.meanMotion;
      extra.TLE1 = m.data.TLE1;
      extra.TLE2 = m.data.TLE2;
      extraData.push(extra);
      postMessage({
        extraUpdate: true,
        extraData: JSON.stringify(extraData),
        satId: m.data.id
      });
      break;
    case 'newMissile':
      satCache[m.data.id] = m.data;
      break;
  }
  if (!propagationRunning) {
    len =- 1; // propagteCruncher needs to start at -1 not 0
    propagateCruncher();
  }
};

function _lookAnglesToEcf(azimuthDeg, elevationDeg, slantRange, obs_lat, obs_long, obs_alt) {

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
}

// var averageTimeForCrunchLoop = 0;
var totalCrunchTime1 = 0;
// var averageTimeForPropagate = 0;
// var totalCrunchTime2 = 0;
var numOfCrunches = 0;
function propagateCruncher () {
  // OPTIMIZE: 25.9ms

  var startTime1 = performance.now();
  numOfCrunches++;
  propagationRunning = true;

  var now = propTime();

  j = jday(now.getUTCFullYear(),
               now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
               now.getUTCDate(),
               now.getUTCHours(),
               now.getUTCMinutes(),
               now.getUTCSeconds());
  j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond

  var gmst = satellite.gstime(j);
  var j2 = j;
  j2 = jday(now.getUTCFullYear(),
               now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
               now.getUTCDate(),
               now.getUTCHours(),
               now.getUTCMinutes(),
               now.getUTCSeconds() + 1);
  j2 += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
  var gmstNext = satellite.gstime(j2);
  var len = satCache.length - 1;

  if (!isResetSatOverfly && !isShowSatOverfly && !isResetFOVBubble && !isShowFOVBubble) {
    // console.warn('No Markers');
    len -= (fieldOfViewSetLength);
  }

  var i = -1;

  // var startTime2 = 0;
  // var stopTime2 = 0;

  var positionEcf, lookangles, azimuth, elevation, rangeSat;
  var x, y, z, vx, vy, vz;
  var cosLat, sinLat, cosLon, sinLon;
  var curMissivarime;
  var s, m, pv, tLen, t;
  var sat;
  var isSensorChecked = false;
  while (i < len) {
    i++; // At the beginning so i starts at 0
    // totalCrunchTime2 += (stopTime2 - startTime2);
    sat = satCache[i];
    if (sat.satnum) {
      // Skip reentries
      if (sat.skip) continue;
      m = (j - sat.jdsatepoch) * 1440.0; // 1440 = minutes_per_day
      // startTime2 = performance.now();
      pv = satellite.sgp4(sat, m);
      // stopTime2 = performance.now();

      if (pv[0] !== false) {
        satPos[i * 3] = pv.position.x;
        satPos[i * 3 + 1] = pv.position.y;
        satPos[i * 3 + 2] = pv.position.z;

        satVel[i * 3] = pv.velocity.x;
        satVel[i * 3 + 1] = pv.velocity.y;
        satVel[i * 3 + 2] = pv.velocity.z;

        // Skip Calculating Lookangles if No Sensor is Selected
        if (!isSensorChecked) {
          if (sensor.observerGd !== defaultGd && !isMultiSensor) {
            isSensorChecked = true;
            positionEcf = satellite.eciToEcf(pv.position, gmst); // pv.position is called positionEci originally
            lookangles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
            azimuth = lookangles.azimuth;
            elevation = lookangles.elevation;
            rangeSat = lookangles.rangeSat;
          }
        }
      } else {
        // This is probably a reentry and should be skipped from now on.
        satCache[i].skip = true;
        satPos[i * 3] = 0;
        satPos[i * 3 + 1] = 0;
        satPos[i * 3 + 2] = 0;

        satVel[i * 3] = 0;
        satVel[i * 3 + 1] = 0;
        satVel[i * 3 + 2] = 0;

        positionEcf = 0;
        lookangles = 0;
        azimuth = 0;
        elevation = 0;
        rangeSat = 0;
      }

      satInView[i] = false; // Default in case no sensor selected

      if (sensor.observerGd !== defaultGd) {
        if (isMultiSensor) {
          for (s = 0; s < mSensor.length; s++) {
            if (satInView[i]) break;
            sensor = mSensor[s];
            sensor.observerGd = {
              longitude: sensor.long * DEG2RAD,
              latitude: sensor.lat * DEG2RAD,
              height: sensor.obshei * 1 // Convert from string
            };
            lookangles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
            azimuth = lookangles.azimuth;
            elevation = lookangles.elevation;
            rangeSat = lookangles.rangeSat;
            azimuth *= RAD2DEG;
            elevation *= RAD2DEG;

            if (sensor.obsminaz > sensor.obsmaxaz) {
              if (((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
              ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
                satInView[i] = true;
              }
            } else {
              if (((azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
              ((azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
                satInView[i] = true;
              }
            }
          }
        } else {
          azimuth *= RAD2DEG;
          elevation *= RAD2DEG;

          if (sensor.obsminaz > sensor.obsmaxaz) {
            if (((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
               ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
              satInView[i] = true;
            }
          } else {
            if (((azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
               ((azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
              satInView[i] = true;
            }
          }
        }
      }
    }
    else if (satCache[i].static && !satCache[i].marker) {
      cosLat = Math.cos(satCache[i].lat * DEG2RAD);
      sinLat = Math.sin(satCache[i].lat * DEG2RAD);
      cosLon = Math.cos((satCache[i].lon * DEG2RAD) + gmst);
      sinLon = Math.sin((satCache[i].lon * DEG2RAD) + gmst);

      satPos[i * 3] = (6371 + 0.25) * cosLat * cosLon; // 6371 is radius of earth
      satPos[i * 3 + 1] = (6371 + 0.25) * cosLat * sinLon;
      satPos[i * 3 + 2] = (6371 + 0.25) * sinLat;

      satVel[i * 3] = 0;
      satVel[i * 3 + 1] = 0;
      satVel[i * 3 + 2] = 0;

      cosLat = null;
      cosLon = null;
      sinLat = null;
      sinLon = null;
    }
    else if (satCache[i].missile) {
        if (!satCache[i].active) { continue; } // Skip inactive missiles
        tLen = satCache[i].altList.length;
        for (t = 0; t < tLen; t++) {
          if (satCache[i].startTime + t * 1000 > now) {
            curMissivarime = t;
            continue;
          }
        }
        cosLat = Math.cos(satCache[i].latList[curMissivarime] * DEG2RAD);
        sinLat = Math.sin(satCache[i].latList[curMissivarime] * DEG2RAD);
        cosLon = Math.cos((satCache[i].lonList[curMissivarime] * DEG2RAD) + gmst);
        sinLon = Math.sin((satCache[i].lonList[curMissivarime] * DEG2RAD) + gmst);

        satPos[i * 3] = (6371 + satCache[i].altList[curMissivarime]) * cosLat * cosLon;
        satPos[i * 3 + 1] = (6371 + satCache[i].altList[curMissivarime]) * cosLat * sinLon;
        satPos[i * 3 + 2] = (6371 + satCache[i].altList[curMissivarime]) * sinLat;

        cosLat = Math.cos(satCache[i].latList[curMissivarime + 1] * DEG2RAD);
        sinLat = Math.sin(satCache[i].latList[curMissivarime + 1] * DEG2RAD);
        cosLon = Math.cos((satCache[i].lonList[curMissivarime + 1] * DEG2RAD) + gmstNext);
        sinLon = Math.sin((satCache[i].lonList[curMissivarime + 1] * DEG2RAD) + gmstNext);

        satVel[i * 3] = ((6371 + satCache[i].altList[curMissivarime + 1]) * cosLat * cosLon) - satPos[i * 3];
        satVel[i * 3 + 1] = ((6371 + satCache[i].altList[curMissivarime + 1]) * cosLat * sinLon) - satPos[i * 3 + 1];
        satVel[i * 3 + 2] = ((6371 + satCache[i].altList[curMissivarime + 1]) * sinLat) - satPos[i * 3 + 2];

        x = satPos[i * 3];
        y = satPos[i * 3 + 1];
        z = satPos[i * 3 + 2];
        // NOTE: Might not be needed
        cosLat = null;
        cosLon = null;
        sinLat = null;
        sinLon = null;

        positionEcf = satellite.eciToEcf({x: x, y: y, z: z}, gmst); // pv.position is called positionEci originally
        if (satellite.eciToGeodetic({x: x, y: y, z: z}, gmst).height <= 150 && satellite.missile === false) {
          console.error(satellite.SCC_NUM);
          satCache[i].skip = true;
        }
        lookangles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);

        azimuth = lookangles.azimuth;
        elevation = lookangles.elevation;
        rangeSat = lookangles.rangeSat;

        azimuth *= RAD2DEG;
        elevation *= RAD2DEG;
        satInView[i] = false; // Default in case no sensor selected

        if (sensor.obsminaz > sensor.obsmaxaz) {
          if (((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
             ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
            satInView[i] = true;
          } else {
            satInView[i] = false;
          }
        } else {
          if (((azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (rangeSat <= sensor.obsmaxrange && rangeSat >= sensor.obsminrange)) ||
             ((azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (rangeSat <= sensor.obsmaxrange2 && rangeSat >= sensor.obsminrange2))) {
            satInView[i] = true;
          } else {
            satInView[i] = false;
          }
        }
    }
    else if (isShowFOVBubble || isResetFOVBubble) {
      // //////////////////////////////////
      // FOV Bubble Drawing Code - START
      // //////////////////////////////////
      if (satCache[i].marker) {
        if (isResetFOVBubble) {
          satPos[i * 3] = 0;
          satPos[i * 3 + 1] = 0;
          satPos[i * 3 + 2] = 0;

          satVel[i * 3] = 0;
          satVel[i * 3 + 1] = 0;
          satVel[i * 3 + 2] = 0;
          continue;
        }

        if (!isShowFOVBubble) continue;
        if (sensor.observerGd === sensor.defaultGd) continue;

        var az, el, rng, pos;
        var q = 20;

        // Only on non-360 FOV
        if (sensor.obsminaz !== 0 && sensor.obsmaxaz !== 360) {
        // //////////////////////////////////
        // Min AZ FOV
        // //////////////////////////////////
        for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng+=(Math.min(sensor.obsmaxrange, 60000)/30)) {
          az = sensor.obsminaz;
          for (el = sensor.obsminel; el < sensor.obsmaxel; el+=2) {
            pos = satellite.ecfToEci(_lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
            satCache[i].active = true;
            satPos[i * 3] = pos.x;
            satPos[i * 3 + 1] = pos.y;
            satPos[i * 3 + 2] = pos.z;

            satVel[i * 3] = 0;
            satVel[i * 3 + 1] = 0;
            satVel[i * 3 + 2] = 0;
            i++;
          }
        }

        // //////////////////////////////////
        // Max AZ FOV
        // //////////////////////////////////
        for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng+=(Math.min(sensor.obsmaxrange, 60000)/30)) {
          az = sensor.obsmaxaz;
          for (el = sensor.obsminel; el < sensor.obsmaxel; el+=2) {
            pos = satellite.ecfToEci(_lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
            satCache[i].active = true;
            satPos[i * 3] = pos.x;
            satPos[i * 3 + 1] = pos.y;
            satPos[i * 3 + 2] = pos.z;

            satVel[i * 3] = 0;
            satVel[i * 3 + 1] = 0;
            satVel[i * 3 + 2] = 0;
            i++;
          }
        }
      // Only on 360 FOV
      } else {
        for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng+=(Math.min(sensor.obsmaxrange, 60000)/30)) {
          el = sensor.obsmaxel;
          for (az = sensor.obsminaz; az < sensor.obsmaxaz; az+=2) {
            pos = satellite.ecfToEci(_lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
            satCache[i].active = true;
            satPos[i * 3] = pos.x;
            satPos[i * 3 + 1] = pos.y;
            satPos[i * 3 + 2] = pos.z;

            satVel[i * 3] = 0;
            satVel[i * 3 + 1] = 0;
            satVel[i * 3 + 2] = 0;
            i++;
          }
        }
      }

        // //////////////////////////////////
        // Floor of FOV
        // //////////////////////////////////
        q = 2;
        for (rng = Math.max(sensor.obsminrange, 100); rng < Math.min(sensor.obsmaxrange, 60000); rng+=(Math.min(sensor.obsmaxrange, 60000)/30)) {
          for (az = 0; az < 360; az+=(1 * q)) {
            if (sensor.obsminaz > sensor.obsmaxaz) {
              if (az >= sensor.obsminaz || az <= sensor.obsmaxaz) {
              } else {
                continue;
              }
            } else {
              if (az >= sensor.obsminaz && az <= sensor.obsmaxaz) {
              } else {
                continue;
              }
            }
            pos = satellite.ecfToEci(_lookAnglesToEcf(az, sensor.obsminel, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
            if (i === len) {
              console.error('No More Markers');
              break;
            }
            satCache[i].active = true;
            satPos[i * 3] = pos.x;
            satPos[i * 3 + 1] = pos.y;
            satPos[i * 3 + 2] = pos.z;

            satVel[i * 3] = 0;
            satVel[i * 3 + 1] = 0;
            satVel[i * 3 + 2] = 0;
            i++;
          }
        }

        // //////////////////////////////////
        // Outside of FOV
        // //////////////////////////////////
        rng = Math.min(sensor.obsmaxrange, 60000);
        for (az = 0; az < 360; az+=2) {
          if (sensor.obsminaz > sensor.obsmaxaz) {
            if (az >= sensor.obsminaz || az <= sensor.obsmaxaz) {
            } else {
              continue;
            }
          } else {
            if (az >= sensor.obsminaz && az <= sensor.obsmaxaz) {
            } else {
              continue;
            }
          }
          for (el = sensor.obsminel; el < sensor.obsmaxel; el+=2) {
            pos = satellite.ecfToEci(_lookAnglesToEcf(az, el, rng, sensor.observerGd.latitude, sensor.observerGd.longitude, sensor.observerGd.height), gmst);
            if (i === len) {
              console.error('No More Markers');
              break;
            }
            satCache[i].active = true;
            satPos[i * 3] = pos.x;
            satPos[i * 3 + 1] = pos.y;
            satPos[i * 3 + 2] = pos.z;

            satVel[i * 3] = 0;
            satVel[i * 3 + 1] = 0;
            satVel[i * 3 + 2] = 0;
            i++;
          }
        }
      }
      // //////////////////////////////////
      // FOV Bubble Drawing Code - STOP
      // //////////////////////////////////
    }
    else if (isShowSatOverfly || isResetSatOverfly) {
      // //////////////////////////////////
      // Satellite Overfly Drawing Code - START
      // //////////////////////////////////
      if (satCache[i].marker) {
        if (isResetSatOverfly && satCache[i].active === true) {
          satCache[i].active = false;

          satPos[i * 3] = 0;
          satPos[i * 3 + 1] = 0;
          satPos[i * 3 + 2] = 0;

          satVel[i * 3] = 0;
          satVel[i * 3 + 1] = 0;
          satVel[i * 3 + 2] = 0;
          continue;
        }
        for (snum = 0; snum < satelliteSelected.length; snum++) {
          if (satelliteSelected[snum] !== -1) {
            if (!isShowSatOverfly) continue;
            // Find the ECI position of the Selected Satellite
            satSelPosX = satPos[satelliteSelected[snum] * 3];
            satSelPosY = satPos[satelliteSelected[snum] * 3 + 1];
            satSelPosZ = satPos[satelliteSelected[snum] * 3 + 2];
            satSelPosEcf = {x: satSelPosX, y: satSelPosY, z: satSelPosZ};
            satSelPos = satellite.ecfToEci(satSelPosEcf, gmst);

            // Find the Lat/Long of the Selected Satellite
            satSelGeodetic = satellite.eciToGeodetic(satSelPos, gmst); // pv.position is called positionEci originally
            satHeight = satSelGeodetic.height;
            satSelPosEarth = {longitude: satSelGeodetic.longitude, latitude: satSelGeodetic.latitude, height: 1};

            deltaLatInt = 1;
            // TODO: Change 7000 to a setting variable
            if (satHeight < 2500 && selectedSatFOV <= 60) deltaLatInt = 0.5;
            if (satHeight > 7000 || selectedSatFOV >= 90) deltaLatInt = 2;
            if (satelliteSelected.length > 1) deltaLatInt = 2;
            for ( deltaLat = -60; deltaLat < 60; deltaLat+=deltaLatInt) {
              lat = Math.max(Math.min(Math.round((satSelGeodetic.latitude * RAD2DEG)) + deltaLat,90),-90) * DEG2RAD;
              if (lat > 90) continue;
              deltaLonInt = 1; // Math.max((Math.abs(lat)*RAD2DEG/15),1);
              if (satHeight < 2500 && selectedSatFOV <= 60) deltaLonInt = 0.5;
              if (satHeight > 7000 || selectedSatFOV >= 90) deltaLonInt = 2;
              if (satelliteSelected.length > 1) deltaLonInt = 2;
              for (deltaLon = 0; deltaLon < 181; deltaLon+=deltaLonInt) {
                // //////////
                // Add Long
                // //////////
                long = satSelGeodetic.longitude + (deltaLon * DEG2RAD);
                satSelPosEarth = {longitude: long, latitude: lat, height: 15};
                // Find the Az/El of the position on the earth
                lookangles = satellite.ecfToLookAngles(satSelPosEarth, satSelPosEcf);
                // azimuth = lookangles.azimuth;
                elevation = lookangles.elevation;
                // rangeSat = lookangles.rangeSat;

                if ((elevation * RAD2DEG > 0) && (90 - (elevation * RAD2DEG)) < selectedSatFOV) {
                  satSelPosEarth = satellite.geodeticToEcf(satSelPosEarth);

                  if (i === len) {
                    console.error('Ran out of Markers');
                    continue; // Only get so many markers.
                  }
                  satCache[i].active = true;

                  satPos[i * 3] = satSelPosEarth.x;
                  satPos[i * 3 + 1] = satSelPosEarth.y;
                  satPos[i * 3 + 2] = satSelPosEarth.z;

                  satVel[i * 3] = 0;
                  satVel[i * 3 + 1] = 0;
                  satVel[i * 3 + 2] = 0;
                  i++;
                }
                // //////////
                // Minus Long
                // //////////
                if (deltaLon === 0 || deltaLon === 180) continue; // Don't Draw Two Dots On the Center Line
                long = satSelGeodetic.longitude - (deltaLon * DEG2RAD);
                satSelPosEarth = {longitude: long, latitude: lat, height: 15};
                // Find the Az/El of the position on the earth
                lookangles = satellite.ecfToLookAngles(satSelPosEarth, satSelPosEcf);
                // azimuth = lookangles.azimuth;
                elevation = lookangles.elevation;
                // rangeSat = lookangles.rangeSat;

                if ((elevation * RAD2DEG > 0) && (90 - (elevation * RAD2DEG)) < selectedSatFOV) {
                  satSelPosEarth = satellite.geodeticToEcf(satSelPosEarth);

                  if (i === len) {
                    console.error('Ran out of Markers');
                    continue; // Only get so many markers.
                  }
                  satCache[i].active = true;

                  satPos[i * 3] = satSelPosEarth.x;
                  satPos[i * 3 + 1] = satSelPosEarth.y;
                  satPos[i * 3 + 2] = satSelPosEarth.z;

                  satVel[i * 3] = 0;
                  satVel[i * 3 + 1] = 0;
                  satVel[i * 3 + 2] = 0;
                  i++;
                }

                if (lat === 90 || lat === -90) break; // One Dot for the Poles
              }
            }
          }
        }
      }
      // //////////////////////////////////
      // Satellite Overfly Drawing Code - STOP
      // //////////////////////////////////
    }
    if (satCache[i].marker && !satCache[i].active) {
      isResetSatOverfly = false;
      len -= fieldOfViewSetLength;
      break;
    }
  }
  if (isResetFOVBubble) {
    console.log('Resetting FOV Bubble');
    isResetFOVBubble = false;
    len -= fieldOfViewSetLength;
  }

  postMessage({
    satPos: satPos.buffer,
    satVel: satVel.buffer,
    satInView: satInView.buffer}
  );

  // OPTIMIZE: 5.8ms
  // satPos = new Float32Array(satCache.length * 3);
  // satVel = new Float32Array(satCache.length * 3);
  // satInView = new Float32Array(satCache.length);

  // NOTE The longer the delay the more jitter at higher speeds of propagation
  setTimeout(propagateCruncher, 1 * globalPropagationRate * globalPropagationRateMultiplier / divisor);

  var stopTime1 = performance.now();
  if (numOfCrunches > 5) {
    totalCrunchTime1 += (stopTime1 - startTime1);
    averageTimeForCrunchLoop = totalCrunchTime1 / (numOfCrunches - 5);

    // averageTimeForPropagate = totalCrunchTime2 / (numOfCrunches - 5);
  }
}

/** Returns Ordinal Day (Commonly Called J Day) */
function jday (year, mon, day, hr, minute, sec) {
  'use strict';
  return (367.0 * year -
        Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
        Math.floor(275 * mon / 9.0) +
        day + 1721013.5 +
        ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
        );
}

/** Returns Current Propagation Time */
function propTime () {
  'use strict';

  var now = new Date();
  var realElapsedMsec = Number(now) - Number(propRealTime);
  var scaledMsec = realElapsedMsec * propRate;
  now.setTime(Number(propRealTime) + propOffset + scaledMsec);
  return now;
}
