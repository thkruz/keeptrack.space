/* global

  satellite
  postMessage
  importScripts
  onmessage: true

*/
/* exported

    onmessage

*/
importScripts('lib/satellite.js');

var propRealTime;
var propOffset;
var propRate;

/** CONSTANTS */
var TAU = 2 * Math.PI;            // PI * 2 -- This makes understanding the formulas easier
var DEG2RAD = TAU / 360;          // Used to convert degrees to radians
// var RAD2DEG = 360 / TAU;          // Used to convert radians to degrees
var RADIUS_OF_EARTH = 6371;       // Radius of Earth in kilometers

var NUM_SEGS;
var satCache = [];

onmessage = function (m) {
  if (m.data.isUpdate) {
    if (!m.data.missile) {
      satCache[m.data.satId] = satellite.twoline2satrec(
        m.data.TLE1, m.data.TLE2
      );
    }
    if (m.data.missile) {
      satCache[m.data.satId] = m.data;
    }
  }

  if (m.data.isInit) {
    var satData = JSON.parse(m.data.satData);
    var sLen = satData.length - 1;
    let i = -1;
    while (i < sLen) {
      i++;
      if (satData[i].static || satData[i].missile) {
        satCache[i] = satData[i];
      } else {
        satCache[i] = satellite.twoline2satrec(
          satData[i].TLE1, satData[i].TLE2
        );
      }
    }

    NUM_SEGS = m.data.numSegs;
  } else {
  //  var start = performance.now();
    // IDEA: figure out how to calculate the orbit points on constant
    // position slices, not timeslices (ugly perigees on HEOs)

    var satId = m.data.satId;
    propRealTime = m.data.realTime;
    propOffset = m.data.offset;
    propRate = m.data.rate;
    var pointsOut = new Float32Array((NUM_SEGS + 1) * 3);

    var nowDate = propTime();
    var nowJ = jday(nowDate.getUTCFullYear(),
                 nowDate.getUTCMonth() + 1,
                 nowDate.getUTCDate(),
                 nowDate.getUTCHours(),
                 nowDate.getUTCMinutes(),
                 nowDate.getUTCSeconds());
    nowJ += nowDate.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
    var now = (nowJ - satCache[satId].jdsatepoch) * 1440.0; // in minutes

    var len = NUM_SEGS + 1;
    let i = 0;
    if (satCache[satId].missile) {
      let timeslice = satCache[satId].altList.length / NUM_SEGS;
      while (i < len) {
        var x = parseInt(satCache[satId].altList.length * (i / NUM_SEGS));

        var missileTime = propTime();
        var j = jday(missileTime.getUTCFullYear(),
                     missileTime.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
                     missileTime.getUTCDate(),
                     missileTime.getUTCHours(),
                     missileTime.getUTCMinutes(),
                     missileTime.getUTCSeconds());
        j += missileTime.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
        var gmst = satellite.gstime(j);

        var cosLat = Math.cos(satCache[satId].latList[x] * DEG2RAD);
        var sinLat = Math.sin(satCache[satId].latList[x] * DEG2RAD);
        var cosLon = Math.cos((satCache[satId].lonList[x] * DEG2RAD) + gmst);
        var sinLon = Math.sin((satCache[satId].lonList[x] * DEG2RAD) + gmst);

        pointsOut[i * 3] = (RADIUS_OF_EARTH + satCache[satId].altList[x]) * cosLat * cosLon;
        pointsOut[i * 3 + 1] = (RADIUS_OF_EARTH + satCache[satId].altList[x]) * cosLat * sinLon;
        pointsOut[i * 3 + 2] = (RADIUS_OF_EARTH + satCache[satId].altList[x]) * sinLat;
        i++;
      }
    } else {
      var period = (2 * Math.PI) / satCache[satId].no;  // convert rads/min to min
      let timeslice = period / NUM_SEGS;

      while (i < len) {
        var t = now + i * timeslice;
        var p = satellite.sgp4(satCache[satId], t).position;
        try {
          pointsOut[i * 3] = p.x;
          pointsOut[i * 3 + 1] = p.y;
          pointsOut[i * 3 + 2] = p.z;
        } catch (ex) {
          pointsOut[i * 3] = 0;
          pointsOut[i * 3 + 1] = 0;
          pointsOut[i * 3 + 2] = 0;
        }
        i++;
      }
    }
    postMessage({
      pointsOut: pointsOut.buffer,
      satId: satId
    }, [pointsOut.buffer]);
  //  console.log('cop: ' + (performance.now() - start )+ ' ms');
  }
};

function jday (year, mon, day, hr, minute, sec) { // from satellite.js
  'use strict';
  return (367.0 * year -
        Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
        Math.floor(275 * mon / 9.0) +
        day + 1721013.5 +
        ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
        // #  - 0.5*sgn(100.0*year + mon - 190002.5) + 0.5;
        );
}

function propTime () {
  'use strict';

  var now = new Date();
  var realElapsedMsec = Number(now) - Number(propRealTime);
  var scaledMsec = realElapsedMsec * propRate;
  now.setTime(Number(propRealTime) + propOffset + scaledMsec);
  // next line will slow things down tremendously!
  // console.log('orbit propTime: ' + now + ' elapsed=' + realElapsedMsec/1000);
  return now;
}
