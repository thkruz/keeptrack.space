/* global satellite */
importScripts('satellite.min.js');

var satInView = [];
var satCache = [];
var satPos, satVel, satAlt;
var satAzimuth, satElevation, satRange;
var satInView;
// Set the Observer Location and then convert to RADIANS
var deg2rad = 0.017453292519943295; // (angle / 180) * Math.PI

var latitude = 0;
var longitude = 0;
var height = 0;
var observerGd = {};
var obsminaz = 0;
var obsmaxaz = 0;
var obsminel = 0;
var obsmaxel = 0;
var obsminrange = 0;
var obsmaxrange = 0;


// offset letting us propagate in the future (or past)
var propOffset = 0;

// these let us run time faster (or slower) than normal
var propRate = 1;
var propRealTime = Date.now();

onmessage = function(m) {
  var start = Date.now();

  if (m.data.lat)
    latitude = m.data.lat;
  if (m.data.long)
    longitude = m.data.long;
  if (m.data.hei)
    height = m.data.hei;
    //string
  if (m.data.setlatlong){
    observerGd = {
      longitude: longitude * deg2rad,
      latitude: latitude * deg2rad,
      height: height * 1 // Convert from string
    };
    if (m.data.obsminaz != null)
      obsminaz = m.data.obsminaz * 1;
    if (m.data.obsmaxaz != null)
      obsmaxaz = m.data.obsmaxaz * 1;
    if (m.data.obsminel != null)
      obsminel = m.data.obsminel * 1;
    if (m.data.obsmaxel != null)
      obsmaxel = m.data.obsmaxel * 1;
    if (m.data.obsminrange != null)
      obsminrange = m.data.obsminrange * 1;
    if (m.data.obsmaxrange != null)
      obsmaxrange = m.data.obsmaxrange * 1;
  }

  switch (m.data.typ) {
  case "offset":
    propOffset = Number(m.data.dat.split(' ')[0]);
    propRate = Number(m.data.dat.split(' ')[1]);
    //console.log('sat-cruncher offset: ' + propOffset + ' rate: ' + propRate);
    propRealTime = start;
    return;
  case "satdata":
    //console.log('sat-cruncher satdata');
    break;
  }

  var satData = JSON.parse(m.data.dat);
  var len = satData.length;

  var extraData = [];
  for(var i = 0; i < len; i++) {
    var extra = {};
    var satrec = satellite.twoline2satrec( //perform and store sat init calcs
      satData[i].TLE_LINE1, satData[i].TLE_LINE2);

    //keplerian elements
    extra.inclination  = satrec.inclo;  //rads
    extra.eccentricity = satrec.ecco;
    extra.raan         = satrec.nodeo;   //rads
    extra.argPe        = satrec.argpo;  //rads
    extra.meanMotion   = satrec.no * 60 * 24 / (2 * Math.PI);     // convert rads/minute to rev/day

    //fun other data
    //extra.country = satData[i].COUNTRY;
    extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, (2/3));
    extra.semiMinorAxis = extra.semiMajorAxis * Math.sqrt(1 - Math.pow(extra.eccentricity, 2));
    extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - 6371;
    extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - 6371;
    extra.period = 1440.0 / extra.meanMotion;

    extraData.push(extra);
    satCache.push(satrec);
  }

  satPos = new Float32Array(len * 3);
  satVel = new Float32Array(len * 3);
  satAlt = new Float32Array(len);
  satLon = new Float32Array(len);
  satLat = new Float32Array(len);
  satAzimuth = new Float32Array(len);
  satElevation = new Float32Array(len);
  satRange = new Float32Array(len);
  satInView = new Float32Array(len);

  var postStart = Date.now();
  postMessage({
    extraData : JSON.stringify(extraData),
  });
  //console.log('sat-cruncher init: ' + (Date.now() - start) + ' ms  (incl post: ' + (Date.now() - postStart) + ' ms)');
  propagate();
};

function propagate() {
  //profile  var start = performance.now();
  var now = propTime();
  //console.log('sat-cruncher propagate: ' + now);
  var j = jday(now.getUTCFullYear(),
               now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
               now.getUTCDate(),
               now.getUTCHours(),
               now.getUTCMinutes(),
               now.getUTCSeconds());
  j += now.getUTCMilliseconds() * 1.15741e-8; //days per millisecond
  var gmst = satellite.gstime_from_jday(j);

  for(var i=0; i < satCache.length; i++) {
    var m = (j - satCache[i].jdsatepoch) * 1440.0; //1440 = minutes_per_day
    var pv = satellite.sgp4(satCache[i], m);
    var x,y,z,vx,vy,vz,gpos,alt,lon,lat;
    var positionEcf, lookAngles, azimuth, elevation, rangeSat;

    try{
       x = pv.position.x; // translation of axes from earth-centered inertial
       y = pv.position.y; // to OpenGL is done in shader with projection matrix
       z = pv.position.z; // so we don't have to worry about it
       vx = pv.velocity.x;
       vy = pv.velocity.y;
       vz = pv.velocity.z;
       gpos = satellite.eci_to_geodetic(pv.position, gmst);
       alt = gpos.height;
       lon = gpos.longitude;
       lat = gpos.latitude;

       // You can get ECF, Geodetic, Look Angles, and Doppler Factor.
       positionEcf   = satellite.eci_to_ecf(pv.position, gmst); // pv.position is called positionEci originally
       //observerEcf   = satellite.geodetic_to_ecf(observerGd);
       //positionGd    = satellite.eciToGeodetic(positionEci, gmst),
       lookAngles    = satellite.ecf_to_look_angles(observerGd, positionEcf);
       //dopplerFactor = satellite.dopplerFactor(observerCoordsEcf, positionEcf, velocityEcf);

       // Look Angles may be accessed by `azimuth`, `elevation`, `range_sat` properties.
       azimuth   = lookAngles.azimuth,
       elevation = lookAngles.elevation,
       rangeSat  = lookAngles.range_sat;

    } catch(e) {
       x = 0;
       y = 0;
       z = 0;
       vx = 0;
       vy = 0;
       vz = 0;
       alt = 0;
       lon = 0;
       lat = 0;
       positionEcf = 0;
       lookAngles = 0;
       azimuth = 0;
       elevation = 0;
       rangeSat = 0;
    }
  //    console.log('x: ' + x + ' y: ' + y + ' z: ' + z);
    satPos[i*3] = x;
    satPos[i*3+1] = y;
    satPos[i*3+2] = z;

    satVel[i*3] = vx;
    satVel[i*3+1] = vy;
    satVel[i*3+2] = vz;

    satAlt[i] = alt;
    satLon[i] = lon;
    satLat[i] = lat;
    satAzimuth[i] = azimuth / deg2rad; // Convert to Degrees
    satElevation[i] = elevation / deg2rad; // Convert to Degrees
    satRange[i] = rangeSat;

    if ((satAzimuth[i] >= obsminaz || satAzimuth[i] <= obsmaxaz) && (satElevation[i] >= obsminel && satElevation[i] <= obsmaxel) && (satRange[i] <= obsmaxrange && satRange[i] >= obsminrange))
        satInView[i] = true;
    else
      satInView[i] = false;

  }

  postMessage({satPos: satPos.buffer, satVel: satVel.buffer, satAlt: satAlt.buffer, satLon: satLon.buffer, satLat: satLat.buffer, satAzimuth: satAzimuth.buffer, satElevation: satElevation.buffer, satRange: satRange.buffer, satInView: satInView.buffer},
              [satPos.buffer, satVel.buffer, satAlt.buffer, satLon.buffer, satLat.buffer, satAzimuth.buffer, satElevation.buffer, satRange.buffer, satInView.buffer]);

  satPos = new Float32Array(satCache.length * 3);
  satVel = new Float32Array(satCache.length * 3);
  satAlt = new Float32Array(satCache.length);
  satLon = new Float32Array(satCache.length);
  satLat = new Float32Array(satCache.length);
  satAzimuth = new Float32Array(satCache.length);
  satElevation = new Float32Array(satCache.length);
  satRange = new Float32Array(satCache.length);
  satInView = new Float32Array(satCache.length);

//profile  console.log('sat-cruncher propagate: ' + (performance.now() - start) + ' ms');

  var divisor = Math.max(propRate, 0.1);
  setTimeout(propagate, 500 / divisor);
}

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
  //console.log('sgp4 propTime: ' + now + ' elapsed=' + realElapsedMsec/1000);
  return now;
}
