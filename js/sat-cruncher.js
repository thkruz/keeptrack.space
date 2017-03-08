/* global

    satellite
    importScripts
    postMessage
    onmessage: true

*/
/* exported

    onmessage

*/
importScripts('satellite.min.js');

// var satInView = [];
var satCache = [];
var satPos, satVel;
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

onmessage = function (m) {
  var start = Date.now();

  if (m.data.lat) { latitude = m.data.lat; }
  if (m.data.long) { longitude = m.data.long; }
  if (m.data.hei) { height = m.data.hei; } // string
  if (m.data.setlatlong) {
    observerGd = {
      longitude: longitude * deg2rad,
      latitude: latitude * deg2rad,
      height: height * 1 // Convert from string
    };
    if (m.data.obsminaz != null) { obsminaz = m.data.obsminaz * 1; }
    if (m.data.obsmaxaz != null) { obsmaxaz = m.data.obsmaxaz * 1; }
    if (m.data.obsminel != null) { obsminel = m.data.obsminel * 1; }
    if (m.data.obsmaxel != null) { obsmaxel = m.data.obsmaxel * 1; }
    if (m.data.obsminrange != null) { obsminrange = m.data.obsminrange * 1; }
    if (m.data.obsmaxrange != null) { obsmaxrange = m.data.obsmaxrange * 1; }
  }

  function pad (num, size) {
    var s = '00000' + num;
    return s.substr(s.length - size);
  }

  switch (m.data.typ) {
    case 'offset':
      propOffset = Number(m.data.dat.split(' ')[0]);
      propRate = Number(m.data.dat.split(' ')[1]);
      // console.log('sat-cruncher offset: ' + propOffset + ' rate: ' + propRate);
      propRealTime = start;
      return;
    case 'satdata':
      var satData = JSON.parse(m.data.dat);
      var len = satData.length;

      var extraData = [];
      for (var i = 0; i < len; i++) {
        var extra = {};
        var satrec = satellite.twoline2satrec( // perform and store sat init calcs
          satData[i].TLE_LINE1, satData[i].TLE_LINE2);

        // TODO: This should be moved to the lookangles function instead of the sat-cruncher
        // keplerian elements

        // NOTE: This is the section that allows shrinking the TLE.json file
        if (satData[i].OBJECT_TYPE === 0) { extra.OBJECT_TYPE = 'TBA'; }
        if (satData[i].OBJECT_TYPE === 1) { extra.OBJECT_TYPE = 'PAYLOAD'; }
        if (satData[i].OBJECT_TYPE === 2) { extra.OBJECT_TYPE = 'ROCKET BODY'; }
        if (satData[i].OBJECT_TYPE === 3) { extra.OBJECT_TYPE = 'DEBRIS'; }

        extra.RCS_SIZE = satData[i].RCS_SIZE;
        if (satData[i].RCS_SIZE === 0) { extra.RCS_SIZE = 'SMALL'; }
        if (satData[i].RCS_SIZE === 1) { extra.RCS_SIZE = 'MEDIUM'; }
        if (satData[i].RCS_SIZE === 2) { extra.RCS_SIZE = 'LARGE'; }

        // Launch Site and Country Corelation Table
        var site = satData[i].LAUNCH_SITE;
        var sitec = satData[i].LAUNCH_SITEC;

        if (site === 'AFETR') {
          site = 'Cape Canaveral AFS';
          sitec = 'United States';
        }
        if (site === 'AFWTR') {
          site = 'Vandenberg AFB';
          sitec = 'United States';
        }
        if (site === 'CAS') {
          site = 'Canary Islands';
          sitec = 'United States';
        }
        if (site === 'FRGUI') {
          site = 'French Guiana';
          sitec = 'United States';
        }
        if (site === 'HGSTR') {
          site = 'Hammaguira STR';
          sitec = 'Algeria';
        }
        if (site === 'KSCUT') {
          site = 'Uchinoura Space Center';
          sitec = 'Japan';
        }
        if (site === 'KYMTR') {
          site = 'Kapustin Yar MSC';
          sitec = 'Russia';
        }
        if (site === 'PKMTR') {
          site = 'Plesetsk MSC';
          sitec = 'Russia';
        }
        if (site === 'WSC') {
          site = 'Wenchang SLC';
          sitec = 'China';
        }
        if (site === 'SNMLP') {
          site = 'San Marco LP';
          sitec = 'Kenya';
        }
        if (site === 'SRI') {
          site = 'Satish Dhawan SC';
          sitec = 'India';
        }
        if (site === 'TNSTA') {
          site = 'Tanegashima SC';
          sitec = 'Japan';
        }
        if (site === 'TTMTR') {
          site = 'Baikonur Cosmodrome';
          sitec = 'Kazakhstan';
        }
        if (site === 'WLPIS') {
          site = 'Wallops Island';
          sitec = 'United States';
        }
        if (site === 'WOMRA') {
          site = 'Woomera';
          sitec = 'Australia';
        }
        if (site === 'VOSTO') {
          site = 'Vostochny Cosmodrome';
          sitec = 'Russia';
        }
        if (site === 'PMRF') {
          site = 'PMRF Barking Sands';
          sitec = 'United States';
        }
        if (site === 'SEAL') {
          site = 'Sea Launch Odyssey';
          sitec = 'Russia';
        }
        if (site === 'KWAJ') {
          site = 'Kwajalein';
          sitec = 'United States';
        }
        if (site === 'ERAS') {
          site = 'Pegasus East';
          sitec = 'United States';
        }
        if (site === 'JSC') {
          site = 'Jiuquan SLC';
          sitec = 'China';
        }
        if (site === 'SVOB') {
          site = 'Svobodny';
          sitec = 'Russia';
        }
        if (site === 'UNKN') {
          site = 'Unknown';
          sitec = 'Unknown';
        }
        if (site === 'TSC') {
          site = 'Taiyaun SC';
          sitec = 'China';
        }
        if (site === 'WRAS') {
          site = 'Pegasus West';
          sitec = 'United States';
        }
        if (site === 'XSC') {
          site = 'Xichang SC';
          sitec = 'China';
        }
        if (site === 'YAVNE') {
          site = 'Yavne';
          sitec = 'Israel';
        }
        if (site === 'OREN') {
          site = 'Orenburg';
          sitec = 'Russia';
        }
        if (site === 'SADOL') {
          site = 'Submarine Launch';
          sitec = 'Russia';
        }
        if (site === 'KODAK') {
          site = 'Kodiak Island';
          sitec = 'United States';
        }
        if (site === 'SEM') {
          site = 'Semnan';
          sitec = 'Iran';
        }
        if (site === 'YUN') {
          site = 'Yunsong';
          sitec = 'North Korea';
        }
        if (site === 'NSC') {
          site = 'Naro Space Center';
          sitec = 'South Korea';
        }

        extra.LAUNCH_SITE = site;
        extra.LAUNCH_SITEC = sitec;

      // Country Correlation Table
      var country;

        country = satData[i].COUNTRY;
        if (country === 'AB') // Headquartered in Riyadh, Saudi Arabia
          country = 'Saudi Arabia';
        if (country === 'AC')
          country = 'AsiaSat Corp';
        if (country === 'ALG')
          country = 'Algeria';
        if (country === 'ALL')
          country = 'All';
        if (country === 'ARGN')
          country = 'Argentina';
        if (country === 'ASRA')
          country = 'Austria';
        if (country === 'AUS')
          country = 'Australia';
        if (country === 'AZER')
          country = 'Azerbaijan';
        if (country === 'BEL')
          country = 'Belgium';
        if (country === 'BELA')
          country = 'Belarus';
        if (country === 'BERM')
          country = 'Bermuda';
        if (country === 'BOL')
          country = 'Bolivia';
        if (country === 'BRAZ')
          country = 'Brazil';
        if (country === 'CA')
          country = 'Canada';
        if (country === 'CHBZ')
          country = 'China/Brazil';
        if (country === 'CHLE')
          country = 'Chile';
        if (country === 'CIS')
          country = 'Commonwealth of Ind States';
        if (country === 'COL')
          country = 'Colombia';
        if (country === 'CZCH')
          country = 'Czechoslovakia';
        if (country === 'DEN')
          country = 'Denmark';
        if (country === 'ECU')
          country = 'Ecuador';
        if (country === 'EGYP')
          country = 'Egypt';
        if (country === 'ESA')
          country = 'European Space Agency';
        if (country === 'ESA')
          country = 'European Space Research Org';
        if (country === 'EST')
          country = 'Estonia';
        if (country === 'EUME')
          country = 'EUMETSAT';
        if (country === 'EUTE')
          country = 'EUTELSAT';
        if (country === 'FGER')
          country = 'France/Germany';
        if (country === 'FR')
          country = 'France';
        if (country === 'FRIT')
          country = 'France/Italy';
        if (country === 'GER')
          country = 'Germany';
        if (country === 'GLOB') // Headquartered in Louisiana, USA
          country = 'United States';
        if (country === 'GREC')
          country = 'Greece';
        if (country === 'HUN')
          country = 'Hungary';
        if (country === 'IM') // Headquartered in London, UK
          country = 'United Kingdom';
        if (country === 'IND')
          country = 'India';
        if (country === 'INDO')
          country = 'Indonesia';
        if (country === 'IRAN')
          country = 'Iran';
        if (country === 'IRAQ')
          country = 'Iraq';
        if (country === 'ISRA')
          country = 'Israel';
        if (country === 'ISS')
          country = 'International';
        if (country === 'IT')
          country = 'Italy';
        if (country === 'ITSO') // Headquartered in Luxembourg District, Luxembourg
          country = 'Luxembourg';
        if (country === 'JPN')
          country = 'Japan';
        if (country === 'KAZ')
          country = 'Kazakhstan';
        if (country === 'LAOS')
          country = 'Laos';
        if (country === 'LTU')
          country = 'Lithuania';
        if (country === 'LUXE')
          country = 'Luxembourg';
        if (country === 'MALA')
          country = 'Malaysia';
        if (country === 'MEX')
          country = 'Mexico';
        if (country === 'NATO')
          country = 'North Atlantic Treaty Org';
        if (country === 'NETH')
          country = 'Netherlands';
        if (country === 'NICO') // Headquartered in Washington, USA
          country = 'United States';
        if (country === 'NIG')
          country = 'Nigeria';
        if (country === 'NKOR')
          country = 'North Korea';
        if (country === 'NOR')
          country = 'Norway';
        if (country === 'O3B') // Majority Shareholder Based in Luxembourg
          country = 'Luxembourg';
        if (country === 'ORB') // Headquartered in Louisiana, USA
          country = 'United States';
        if (country === 'PAKI')
          country = 'Pakistan';
        if (country === 'PERU')
          country = 'Peru';
        if (country === 'POL')
          country = 'Poland';
        if (country === 'POR')
          country = 'Portugal';
        if (country === 'PRC')
          country = 'China';
        if (country === 'PRC')
          country = 'China';
        if (country === 'RASC') // Headquartered in Mauritius
          country = 'Mauritius';
        if (country === 'ROC')
          country = 'Taiwan';
        if (country === 'ROM')
          country = 'Romania';
        if (country === 'RP')
          country = 'Philippines';
        if (country === 'SAFR')
          country = 'South Africa';
        if (country === 'SAUD')
          country = 'Saudi Arabia';
        if (country === 'SEAL') // Primary Shareholder Russian
          country = 'Russia';
        if (country === 'RP')
          country = 'Philippines';
        if (country === 'SES')
          country = 'Luxembourg';
        if (country === 'SING')
          country = 'Singapore';
        if (country === 'SKOR')
          country = 'South Korea';
        if (country === 'SPN')
          country = 'Spain';
        if (country === 'STCT')
          country = 'Singapore/Taiwan';
        if (country === 'SWED')
          country = 'Sweden';
        if (country === 'SWTZ')
          country = 'Switzerland';
        if (country === 'THAI')
          country = 'Thailand';
        if (country === 'TMMC')
          country = 'Turkmenistan/Monaco';
        if (country === 'TURK')
          country = 'Turkey';
        if (country === 'UAE')
          country = 'United Arab Emirates';
        if (country === 'UK')
          country = 'United Kingdom';
        if (country === 'UKR')
          country = 'Ukraine';
        if (country === 'URY')
          country = 'Uruguay';
        if (country === 'US')
          country = 'United States';
        if (country === 'USBZ')
          country = 'United States/Brazil';
        if (country === 'VENZ')
          country = 'Venezuela';
        if (country === 'VTNM')
          country = 'Vietnam';

        extra.COUNTRY = country;

        extra.SCC_NUM = pad(satData[i].TLE_LINE1.substr(2, 5).trim(), 5);
        var year = parseInt(satData[i].TLE_LINE1.substr(9, 8).trim());
        var prefix = (year > 50) ? '19' : '20';
        year = prefix + year;
        var rest = satData[i].TLE_LINE1.substr(9, 8).trim().substring(2);
        extra.INTLDES = year + '-' + rest;

        extra.inclination = satrec.inclo; // rads
        extra.eccentricity = satrec.ecco;
        extra.raan = satrec.nodeo;        // rads
        extra.argPe = satrec.argpo;       // rads
        extra.meanMotion = satrec.no * 60 * 24 / (2 * Math.PI); // convert rads/minute to rev/day

        // fun other data
        extra.semiMajorAxis = Math.pow(8681663.653 / extra.meanMotion, (2 / 3));
        extra.semiMinorAxis = extra.semiMajorAxis * Math.sqrt(1 - Math.pow(extra.eccentricity, 2));
        extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - 6371;
        extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - 6371;
        extra.period = 1440.0 / extra.meanMotion;

        extraData.push(extra);
        satCache.push(satrec);
      }

      satPos = new Float32Array(len * 3);
      satVel = new Float32Array(len * 3);
      satInView = new Float32Array(len);

      // var postStart = Date.now();
      postMessage({
        extraData: JSON.stringify(extraData)
      });
      break;
    case 'satEdit':
      // TODO: This code is not optimized yet. Making arrays for one object is unnecessary
      // and I am not sure if there is any reason to convert to JSON back and forth from the web workers.
      satCache[m.data.id] = satellite.twoline2satrec( // replace old TLEs
        m.data.TLE_LINE1, m.data.TLE_LINE2);
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
      extra.apogee = extra.semiMajorAxis * (1 + extra.eccentricity) - 6371;
      extra.perigee = extra.semiMajorAxis * (1 - extra.eccentricity) - 6371;
      extra.period = 1440.0 / extra.meanMotion;
      extra.TLE_LINE1 = m.data.TLE_LINE1;
      extra.TLE_LINE2 = m.data.TLE_LINE2;
      extraData.push(extra);
      postMessage({
        extraUpdate: true,
        extraData: JSON.stringify(extraData),
        satId: m.data.id
      });
      break;
  }
  // console.log('sat-cruncher init: ' + (Date.now() - start) + ' ms  (incl post: ' + (Date.now() - postStart) + ' ms)');
  propagate();
};

function propagate () {
  // profile  var start = performance.now();
  var now = propTime();
  // console.log('sat-cruncher propagate: ' + now);
  var j = jday(now.getUTCFullYear(),
               now.getUTCMonth() + 1, // Note, this function requires months in range 1-12.
               now.getUTCDate(),
               now.getUTCHours(),
               now.getUTCMinutes(),
               now.getUTCSeconds());
  j += now.getUTCMilliseconds() * 1.15741e-8; // days per millisecond
  var gmst = satellite.gstime_from_jday(j);

  for (var i = 0; i < satCache.length; i++) {
    var m = (j - satCache[i].jdsatepoch) * 1440.0; // 1440 = minutes_per_day
    var pv = satellite.sgp4(satCache[i], m);
    var x, y, z, vx, vy, vz;
    var positionEcf, lookAngles, azimuth, elevation, rangeSat;

    try {
      x = pv.position.x; // translation of axes from earth-centered inertial
      y = pv.position.y; // to OpenGL is done in shader with projection matrix
      z = pv.position.z; // so we don't have to worry about it
      vx = pv.velocity.x;
      vy = pv.velocity.y;
      vz = pv.velocity.z;
      // gpos = satellite.eci_to_geodetic(pv.position, gmst);

      // You can get ECF, Geodetic, Look Angles, and Doppler Factor.
      positionEcf = satellite.eci_to_ecf(pv.position, gmst); // pv.position is called positionEci originally
      // observerEcf   = satellite.geodetic_to_ecf(observerGd);
      // positionGd    = satellite.eciToGeodetic(positionEci, gmst),
      lookAngles = satellite.ecf_to_look_angles(observerGd, positionEcf);
      // TODO: Might add dopplerFactor back in or to lookangles for HAM Radio use
      // dopplerFactor = satellite.dopplerFactor(observerCoordsEcf, positionEcf, velocityEcf);

      // Look Angles may be accessed by `azimuth`, `elevation`, `range_sat` properties.
      azimuth = lookAngles.azimuth;
      elevation = lookAngles.elevation;
      rangeSat = lookAngles.range_sat;
    } catch (e) {
      x = 0;
      y = 0;
      z = 0;
      vx = 0;
      vy = 0;
      vz = 0;
      positionEcf = 0;
      lookAngles = 0;
      azimuth = 0;
      elevation = 0;
      rangeSat = 0;
    }
  //    console.log('x: ' + x + ' y: ' + y + ' z: ' + z);
    satPos[i * 3] = x;
    satPos[i * 3 + 1] = y;
    satPos[i * 3 + 2] = z;

    satVel[i * 3] = vx;
    satVel[i * 3 + 1] = vy;
    satVel[i * 3 + 2] = vz;

    // satAlt[i] = alt;
    // satLon[i] = lon;
    // satLat[i] = lat;
    azimuth = azimuth / deg2rad; // Convert to Degrees
    elevation = elevation / deg2rad; // Convert to Degrees
    // satRange[i] = rangeSat;

    if (obsminaz > obsmaxaz) {
      if ((azimuth >= obsminaz || azimuth <= obsmaxaz) && (elevation >= obsminel && elevation <= obsmaxel) && (rangeSat <= obsmaxrange && rangeSat >= obsminrange)) {
        satInView[i] = true;
      } else {
        satInView[i] = false;
      }
    } else {
      if ((azimuth >= obsminaz && azimuth <= obsmaxaz) && (elevation >= obsminel && elevation <= obsmaxel) && (rangeSat <= obsmaxrange && rangeSat >= obsminrange)) {
        satInView[i] = true;
      } else {
        satInView[i] = false;
      }
    }
  }

  postMessage({
    satPos: satPos.buffer,
    satVel: satVel.buffer,
    satInView: satInView.buffer},
              [satPos.buffer, satVel.buffer, satInView.buffer]
  );

  satPos = new Float32Array(satCache.length * 3);
  satVel = new Float32Array(satCache.length * 3);
  satInView = new Float32Array(satCache.length);

// profile  console.log('sat-cruncher propagate: ' + (performance.now() - start) + ' ms');

  var divisor = Math.max(propRate, 0.1);
  setTimeout(propagate, 500 / divisor);
}

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
  // console.log('sgp4 propTime: ' + now + ' elapsed=' + realElapsedMsec/1000);
  return now;
}
