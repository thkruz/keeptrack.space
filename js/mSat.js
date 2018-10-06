importScripts('lib/satellite-1.3.min.js');

// Constants
var TAU = 2 * Math.PI;
var DEG2RAD = TAU / 360;
var RAD2DEG = 360 / TAU;
var MINUTES_PER_DAY = 1440;
var MILLISECONDS_PER_DAY = 1.15741e-8;
var RADIUS_OF_EARTH = 6371;       // Radius of Earth in kilometers

/** TIME VARIABLES */
var propOffset = 0;                 // offset letting us propagate in the future (or past)
var propRealTime = Date.now();      // lets us run time faster (or slower) than normal

var satCache = [];

onmessage = function (msg) {
  msg = msg.data;

  if (msg.propOffset) {
    propOffset = msg.propOffset;
  }

  if (msg.type === 'init') {
    var satData = JSON.parse(msg.data);
    var sLen = satData.length - 1;
    var i = -1;
    while (i < sLen) {
      i++;
      if (satData[i].static || satData[i].missile) {
        satCache[i] = satData[i];
      } else {
        satCache[i] = satellite.twoline2satrec(
          satData[i].TLE1, satData[i].TLE2
        );
        satCache[i].SCC_NUM = pad0(satData[i].TLE1.substr(2, 5).trim(), 5);
        satCache[i].meanMotion = satCache[i].no * 60 * 24 / (2 * Math.PI); // convert rads/minute to rev/day
        satCache[i].semiMajorAxis = Math.pow(8681663.653 / satCache[i].meanMotion, (2 / 3));
        satCache[i].perigee = satCache[i].semiMajorAxis * (1 - satCache[i].ecco) - RADIUS_OF_EARTH;
      }
    }
  }
  if (msg.type === 'calcTIC') {
    var calcTICArray = [];
    var sensor = msg.sensor;

    // If length and interval not set try to use defaults
    if (typeof searchLength == 'undefined') searchLength = 1; // 1 Day Search
    if (typeof interval == 'undefined') interval = 3; // 20 Second Interval

    for (var s = msg.startNum; s < msg.endNum; s++) { // satSet.getSatData().length
      satrec = satCache[s];
      if (typeof satrec == 'undefined') continue;
      if (satrec.static || satrec.missile) { continue; }

      if (sensor.obsmaxrange < satrec.perigee) continue;

      console.debug('Thread ' + msg.thread + ': ' + satrec.SCC_NUM);
      var orbitalPeriod = satrec.period;

      var propTempOffset = 0;
      for (var i = 0; i < (searchLength * 24 * 60 * 60); i += interval) {         // 5second Looks
        propTempOffset = i * 1000 + propOffset;                 // Offset in seconds (msec * 1000)
        var now = propTimeCheck(propTempOffset, Date.now());
        var j = jday(now.getUTCFullYear(),
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

        try {
        positionEcf = satellite.eciToEcf(positionEci.position, gmst); // positionEci.position is called positionEci originally
        lookAngles = satellite.ecfToLookAngles(sensor.observerGd, positionEcf);
        azimuth = lookAngles.azimuth * RAD2DEG;
        elevation = lookAngles.elevation * RAD2DEG;
        range = lookAngles.rangeSat;
        } catch (e) {
          break;
        }

        if (range >= sensor.obsmaxrange * 1.75) interval = 240;
        if (range >= sensor.obsmaxrange * 1.3) interval = 80;
        if (range < sensor.obsmaxrange * 1.3) interval = 20;
        if (range < sensor.obsmaxrange) interval = 1;
        if (elevation <= -30) interval = 120;
        if (elevation > 6 || elevation <= -15) interval = 30;
        if (elevation <= 6 && elevation > -15) interval = 1;
        if (sensor.obsminaz > sensor.obsmaxaz) {
          if (((azimuth >= sensor.obsminaz || azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (range <= sensor.obsmaxrange && range >= sensor.obsminrange)) ||
             ((azimuth >= sensor.obsminaz2 || azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2))) {
             // Previous Pass to Calculate first line of coverage
             var now1 = propTimeCheck(propTempOffset - (interval * 1000), Date.now());
             var j1 = jday(now1.getUTCFullYear(),
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

             try {
             positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
             lookAngles1 = satellite.ecfToLookAngles(sensor.observerGd, positionEcf1);
             azimuth1 = lookAngles1.azimuth * RAD2DEG;
             elevation1 = lookAngles1.elevation * RAD2DEG;
             range1 = lookAngles1.rangeSat;
             } catch (e) {
               break;
             }

             if (!((azimuth1 >= sensor.obsminaz || azimuth1 <= sensor.obsmaxaz) && (elevation1 >= sensor.obsminel && elevation1 <= sensor.obsmaxel) && (range1 <= sensor.obsmaxrange && range1 >= sensor.obsminrange)) &&
             !((azimuth1 >= sensor.obsminaz2 || azimuth1 <= sensor.obsmaxaz2) && (elevation1 >= sensor.obsminel2 && elevation1 <= sensor.obsmaxel2) && (range1 <= sensor.obsmaxrange2 && range1 >= sensor.obsminrange2))) {
               calcTICArray.push({'l': 0, 's': satrec.SCC_NUM, 't': dateFormat(now, 'isoDateTime', true), 'e': elevation.toPrecision(4), 'a': azimuth.toPrecision(5), 'r': range.toPrecision(7)});
             } else {
               // Next Pass to Calculate Last line of coverage
               now1 = propTimeCheck(propTempOffset + (interval * 1000), Date.now());
               j1 = jday(now1.getUTCFullYear(),
               now1.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
               now1.getUTCDate(),
               now1.getUTCHours(),
               now1.getUTCMinutes(),
               now1.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
               j1 += now1.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
               gmst1 = satellite.gstime(j1);

               m1 = (j1 - satrec.jdsatepoch) * MINUTES_PER_DAY;
               positionEci1 = satellite.sgp4(satrec, m1);

               try {
               positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
               lookAngles1 = satellite.ecfToLookAngles(sensor.observerGd, positionEcf1);
               azimuth1 = lookAngles1.azimuth * RAD2DEG;
               elevation1 = lookAngles1.elevation * RAD2DEG;
               range1 = lookAngles1.rangeSat;
               } catch (e) {
                 break;
               }

               if (!((azimuth1 >= sensor.obsminaz || azimuth1 <= sensor.obsmaxaz) && (elevation1 >= sensor.obsminel && elevation1 <= sensor.obsmaxel) && (range1 <= sensor.obsmaxrange && range1 >= sensor.obsminrange)) &&
               !((azimuth1 >= sensor.obsminaz2 || azimuth1 <= sensor.obsmaxaz2) && (elevation1 >= sensor.obsminel2 && elevation1 <= sensor.obsmaxel2) && (range1 <= sensor.obsmaxrange2 && range1 >= sensor.obsminrange2))) {
                calcTICArray.push({'l': 1, 's': satrec.SCC_NUM, 't': dateFormat(now, 'isoDateTime', true), 'e': elevation.toPrecision(4), 'a': azimuth.toPrecision(5), 'r': range.toPrecision(7)});
                i = i + (orbitalPeriod * 60 * 0.85); // Jump 3/4th to the next orbit
               }
             }
          }
        } else {
          if (((azimuth >= sensor.obsminaz && azimuth <= sensor.obsmaxaz) && (elevation >= sensor.obsminel && elevation <= sensor.obsmaxel) && (range <= sensor.obsmaxrange && range >= sensor.obsminrange)) ||
             ((azimuth >= sensor.obsminaz2 && azimuth <= sensor.obsmaxaz2) && (elevation >= sensor.obsminel2 && elevation <= sensor.obsmaxel2) && (range <= sensor.obsmaxrange2 && range >= sensor.obsminrange2))) {
             // Previous Pass to Calculate first line of coverage
             var now1 = propTimeCheck(propTempOffset - (interval * 1000), Date.now());
             var j1 = jday(now1.getUTCFullYear(),
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

             try {
             positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
             lookAngles1 = satellite.ecfToLookAngles(sensor.observerGd, positionEcf1);
             azimuth1 = lookAngles1.azimuth * RAD2DEG;
             elevation1 = lookAngles1.elevation * RAD2DEG;
             range1 = lookAngles1.rangeSat;
             } catch (e) {
               break;
             }

             if (!((azimuth1 >= sensor.obsminaz || azimuth1 <= sensor.obsmaxaz) && (elevation1 >= sensor.obsminel && elevation1 <= sensor.obsmaxel) && (range1 <= sensor.obsmaxrange && range1 >= sensor.obsminrange)) &&
             !((azimuth1 >= sensor.obsminaz2 || azimuth1 <= sensor.obsmaxaz2) && (elevation1 >= sensor.obsminel2 && elevation1 <= sensor.obsmaxel2) && (range1 <= sensor.obsmaxrange2 && range1 >= sensor.obsminrange2))) {
               calcTICArray.push({'l': 0, 's': satrec.SCC_NUM, 't': dateFormat(now, 'isoDateTime', true), 'e': elevation.toPrecision(4), 'a': azimuth.toPrecision(5), 'r': range.toPrecision(7)});
             } else {
               // Next Pass to Calculate Last line of coverage
               now1 = propTimeCheck(propTempOffset + (interval * 1000), Date.now());
               j1 = jday(now1.getUTCFullYear(),
               now1.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
               now1.getUTCDate(),
               now1.getUTCHours(),
               now1.getUTCMinutes(),
               now1.getUTCSeconds()); // Converts time to jday (TLEs use epoch year/day)
               j1 += now1.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
               gmst1 = satellite.gstime(j1);

               m1 = (j1 - satrec.jdsatepoch) * MINUTES_PER_DAY;
               positionEci1 = satellite.sgp4(satrec, m1);

               try {
               positionEcf1 = satellite.eciToEcf(positionEci1.position, gmst1); // positionEci.position is called positionEci originally
               lookAngles1 = satellite.ecfToLookAngles(sensor.observerGd, positionEcf1);
               azimuth1 = lookAngles1.azimuth * RAD2DEG;
               elevation1 = lookAngles1.elevation * RAD2DEG;
               range1 = lookAngles1.rangeSat;
               } catch (e) {
                 break;
               }

               if (!((azimuth1 >= sensor.obsminaz || azimuth1 <= sensor.obsmaxaz) && (elevation1 >= sensor.obsminel && elevation1 <= sensor.obsmaxel) && (range1 <= sensor.obsmaxrange && range1 >= sensor.obsminrange)) &&
               !((azimuth1 >= sensor.obsminaz2 || azimuth1 <= sensor.obsmaxaz2) && (elevation1 >= sensor.obsminel2 && elevation1 <= sensor.obsmaxel2) && (range1 <= sensor.obsmaxrange2 && range1 >= sensor.obsminrange2))) {
                 calcTICArray.push({'l': 1, 's': satrec.SCC_NUM, 't': dateFormat(now, 'isoDateTime', true), 'e': elevation.toPrecision(4), 'a': azimuth.toPrecision(5), 'r': range.toPrecision(7)});
                 i = i + (orbitalPeriod * 60 * 0.75); // Jump 3/4th to the next orbit
               }
             }
          }
        }
        // return 'No Passes in ' + satellite.lookanglesLength + ' Days';
      }
    }
    postMessage({
      calcTICArray: calcTICArray
    });
  }
};
propTimeCheck = function (propTempOffset, propRealTime) {
  'use strict';
  var now = new Date();                                     // Make a time variable
  now.setTime(Number(propRealTime) + propTempOffset);           // Set the time variable to the time in the future
  return now;
};
jday = function (year, mon, day, hr, minute, sec) { // from satellite.js
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
};
function pad0 (str, max) {
  return str.length < max ? pad0('0' + str, max) : str;
}
// Date Format
(function () {
  /* Date Format 1.2.3
  * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
  * MIT license
  *
  * Includes ENHANCEMENT by Scott Trenda <scott.trenda.net>
  * and Kris Kowal <cixar.com/~kris.kowal/>
  *
  * Accepts a date, a mask, or a date and a mask.
  * Returns a formatted version of the given date.
  * The date defaults to the current date/time.
  * The mask defaults to dateFormat.masks.default.
  */
  var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g;
  var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g;
  var timezoneClip = /[^-+\dA-Z]/g;
  dateFormat = function (date, mask, utc) {
    var dF = dateFormat;

    // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
    if (arguments.length === 1 && Object.prototype.toString.call(date) === '[object String]' && !/\d/.test(date)) {
      mask = date;
      date = undefined;
    }

    // Passing date through Date applies Date.parse, if necessary
    date = date ? new Date(date) : new Date();
    if (isNaN(date)) throw SyntaxError('invalid date');

    mask = String(dF.masks[mask] || mask || dF.masks['default']);

    // Allow setting the utc argument via the mask
    if (mask.slice(0, 4) === 'UTC:') {
      mask = mask.slice(4);
      utc = true;
    }

    var _ = utc ? 'getUTC' : 'get';
    var d = date[_ + 'Date']();
    var D = date[_ + 'Day']();
    var m = date[_ + 'Month']();
    var y = date[_ + 'FullYear']();
    var H = date[_ + 'Hours']();
    var M = date[_ + 'Minutes']();
    var s = date[_ + 'Seconds']();
    var L = date[_ + 'Milliseconds']();
    var o = utc ? 0 : date.getTimezoneOffset();
    var flags = {
      d: d,
      dd: _pad(d),
      ddd: dF.i18n.dayNames[D],
      dddd: dF.i18n.dayNames[D + 7],
      m: m + 1,
      mm: _pad(m + 1),
      mmm: dF.i18n.monthNames[m],
      mmmm: dF.i18n.monthNames[m + 12],
      yy: String(y).slice(2),
      yyyy: y,
      h: H % 12 || 12,
      hh: _pad(H % 12 || 12),
      H: H,
      HH: _pad(H),
      M: M,
      MM: _pad(M),
      s: s,
      ss: _pad(s),
      l: _pad(L, 3),
      L: _pad(L > 99 ? Math.round(L / 10) : L),
      t: H < 12 ? 'a' : 'p',
      tt: H < 12 ? 'am' : 'pm',
      T: H < 12 ? 'A' : 'P',
      TT: H < 12 ? 'AM' : 'PM',
      Z: utc ? 'UTC' : (String(date).match(timezone) || ['']).pop().replace(timezoneClip, ''),
      o: (o > 0 ? '-' : '+') + _pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
      S: ['th', 'st', 'nd', 'rd'][d % 10 > 3 ? 0 : (d % 100 - d % 10 !== 10) * d % 10]
    };

    return mask.replace(token, function ($0) {
      return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
    });
    function _pad (val, len) {
      val = String(val);
      len = len || 2;
      while (val.length < len) val = '0' + val;
      return val;
    }
  };
  dateFormat.masks = { // Common Formats
    'default': 'ddd mmm dd yyyy HH:MM:ss',
    shortDate: 'm/d/yy',
    mediumDate: 'mmm d, yyyy',
    longDate: 'mmmm d, yyyy',
    fullDate: 'dddd, mmmm d, yyyy',
    shortTime: 'h:MM TT',
    mediumTime: 'h:MM:ss TT',
    longTime: 'h:MM:ss TT Z',
    isoDate: 'yyyy-mm-dd',
    isoTime: 'HH:MM:ss',
    isoDateTime: "yyyy-mm-dd' 'HH:MM:ss",
    isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
  };
  dateFormat.i18n = { // Internationalization strings
    dayNames: [
      'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ],
    monthNames: [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
    ]
  };
})();
