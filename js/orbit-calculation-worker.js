/* global satellite */
importScripts('satellite.min.js');

var propRealTime;
var propOffset;
var propRate;

var NUM_SEGS;
var satCache = [];

onmessage = function(m) {

  if(m.data.isUpdate) {
    satCache[m.data.satId] = satellite.twoline2satrec(
      m.data.TLE1, m.data.TLE2
    );
  }

  if(m.data.isInit) {

    var satData = JSON.parse(m.data.satData);

    for(var i=0; i < satData.length; i++) {
      satCache[i] = satellite.twoline2satrec(
        satData[i].TLE1, satData[i].TLE2
      );
    }

    NUM_SEGS = m.data.numSegs;

  } else {
  //  var start = performance.now();
    //TODO: figure out how to calculate the orbit points on constant
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
    nowJ += nowDate.getUTCMilliseconds() * 1.15741e-8; //days per millisecond
    var now = (nowJ - satCache[satId].jdsatepoch) * 1440.0; //in minutes

    var period = (2 * Math.PI) / satCache[satId].no  //convert rads/min to min
    var timeslice = period / NUM_SEGS;

    for(var i=0; i<NUM_SEGS+1; i++) {
      var t = now + i*timeslice;
      var p = satellite.sgp4(satCache[satId], t).position;
      try {
        pointsOut[i*3] = p.x;
        pointsOut[i*3+1] = p.y;
        pointsOut[i*3+2] = p.z;
      } catch (ex) {
        pointsOut[i*3] = 0;
        pointsOut[i*3+1] = 0;
        pointsOut[i*3+2] = 0;
      }
    }
    postMessage({
      pointsOut : pointsOut.buffer,
      satId : satId
    }, [pointsOut.buffer]);
  //  console.log('cop: ' + (performance.now() - start )+ ' ms');
  }
};

function jday(year, mon, day, hr, minute, sec){ //from satellite.js
  'use strict';
  return (367.0 * year -
        Math.floor((7 * (year + Math.floor((mon + 9) / 12.0))) * 0.25) +
        Math.floor( 275 * mon / 9.0 ) +
        day + 1721013.5 +
        ((sec / 60.0 + minute) / 60.0 + hr) / 24.0  //  ut in days
        //#  - 0.5*sgn(100.0*year + mon - 190002.5) + 0.5;
        );
}

function propTime(){
  'use strict';

  var now = new Date();
  var realElapsedMsec = Number(now) - Number(propRealTime);
  var scaledMsec = realElapsedMsec * propRate;
  now.setTime(Number(propRealTime) + propOffset + scaledMsec);
  //next line will slow things down tremendously!
  //console.log('orbit propTime: ' + now + ' elapsed=' + realElapsedMsec/1000);
  return now;
}
