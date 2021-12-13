import * as satellite from 'satellite.js';
('use strict');

let dynamicOffsetEpoch;
let staticOffset;
let propRate = 1.0;

/** CONSTANTS */
const TAU = 2 * Math.PI; // PI * 2 -- This makes understanding the formulas easier
const DEG2RAD = TAU / 360; // Used to convert degrees to radians
// var RAD2DEG = 360 / TAU;          // Used to convert radians to degrees
const RADIUS_OF_EARTH = 6371; // Radius of Earth in kilometers

var NUM_SEGS;
var satCache = [];
let orbitFadeFactor = 1.0;

onmessage = function (m) {
  if (m.data.isUpdate) {
    // Add Satellites
    if (m.data.missile != true && m.data.satId < 99999) {
      satCache[m.data.satId] = satellite.twoline2satrec(m.data.TLE1, m.data.TLE2);
    }
    // Add Missiles
    if (m.data.missile) {
      satCache[m.data.satId] = m.data;
    }
    // Don't Add Anything Else
  }

  if (typeof m.data.dynamicOffsetEpoch !== 'undefined') {
    dynamicOffsetEpoch = m.data.dynamicOffsetEpoch;
  }
  if (typeof m.data.staticOffset !== 'undefined') {
    staticOffset = m.data.staticOffset;
  }
  if (typeof m.data.propRate !== 'undefined') {
    propRate = m.data.propRate;
  }

  if (m.data.isInit) {
    var satData = JSON.parse(m.data.satData);
    orbitFadeFactor = JSON.parse(m.data.orbitFadeFactor);
    var sLen = satData.length - 1;
    let i = -1;
    while (i < sLen) {
      i++;
      delete satData[i]['id'];
      if (satData[i].static || satData[i].missile) {
        satCache[i] = satData[i];
      } else {
        satCache[i] = satellite.twoline2satrec(satData[i].TLE1, satData[i].TLE2);
      }
    }

    NUM_SEGS = m.data.numSegs;
  }

  if (m.data.satId) {
    //  var start = performance.now();
    // IDEA: figure out how to calculate the orbit points on constant
    // position slices, not timeslices (ugly perigees on HEOs)

    var satId = m.data.satId;
    var pointsOut = new Float32Array((NUM_SEGS + 1) * 4);

    var nowDate = propTime();
    var nowJ = jday(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + 1, nowDate.getUTCDate(), nowDate.getUTCHours(), nowDate.getUTCMinutes(), nowDate.getUTCSeconds());
    nowJ += nowDate.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
    var now = (nowJ - satCache[satId].jdsatepoch) * 1440.0; // in minutes

    var len = NUM_SEGS + 1;
    let i = 0;
    if (satCache[satId].missile) {
      // let timeslice = satCache[satId].altList.length / NUM_SEGS;
      while (i < len) {
        const missile = satCache[satId];
        var x = parseInt(missile.altList.length * (i / NUM_SEGS));

        var missileTime = propTime();
        var j = jday(
          missileTime.getUTCFullYear(),
          missileTime.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
          missileTime.getUTCDate(),
          missileTime.getUTCHours(),
          missileTime.getUTCMinutes(),
          missileTime.getUTCSeconds()
        );
        j += missileTime.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
        var gmst = satellite.gstime(j);

        var cosLat = Math.cos(missile.latList[x] * DEG2RAD);
        var sinLat = Math.sin(missile.latList[x] * DEG2RAD);
        var cosLon = Math.cos(missile.lonList[x] * DEG2RAD + gmst);
        var sinLon = Math.sin(missile.lonList[x] * DEG2RAD + gmst);

        pointsOut[i * 4] = (RADIUS_OF_EARTH + missile.altList[x]) * cosLat * cosLon;
        pointsOut[i * 4 + 1] = (RADIUS_OF_EARTH + missile.altList[x]) * cosLat * sinLon;
        pointsOut[i * 4 + 2] = (RADIUS_OF_EARTH + missile.altList[x]) * sinLat;
        pointsOut[i * 4 + 3] = Math.min(orbitFadeFactor * (len / (i + 1)), 1.0);
        i++;
      }
    } else {
      var period = (2 * Math.PI) / satCache[satId].no; // convert rads/min to min
      let timeslice = period / NUM_SEGS;

      while (i < len) {
        var t = now + i * timeslice;
        var p = satellite.sgp4(satCache[satId], t).position;
        try {
          pointsOut[i * 4] = p.x;
          pointsOut[i * 4 + 1] = p.y;
          pointsOut[i * 4 + 2] = p.z;
          pointsOut[i * 4 + 3] = Math.min(orbitFadeFactor * (len / (i + 1)), 1.0);
        } catch (ex) {
          pointsOut[i * 4] = 0;
          pointsOut[i * 4 + 1] = 0;
          pointsOut[i * 4 + 2] = 0;
          pointsOut[i * 4 + 3] = 0;
        }
        i++;
      }
    }
    postMessage(
      {
        pointsOut: pointsOut.buffer,
        satId: satId,
      },
      [pointsOut.buffer]
    );
    //  console.log('cop: ' + (performance.now() - start )+ ' ms');
  }
};

var jday = (year, mon, day, hr, minute, sec) => {
  // from satellite.js
  'use strict';
  return (
    367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor((275 * mon) / 9.0) + day + 1721013.5 + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0 //  ut in days
    // #  - 0.5*sgn(100.0*year + mon - 190002.5) + 0.5;
  );
};

const propTime = () => {
  const now = new Date();
  const dynamicPropOffset = now.getTime() - dynamicOffsetEpoch;
  now.setTime(dynamicOffsetEpoch + staticOffset + dynamicPropOffset * propRate);
  return now;
};
