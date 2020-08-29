/* global
  $
*/

(function () {
  var timeManager = {};

  var propFrozen = Date.now(); // for when propRate 0
  var realElapsedMsec;
  var scaledMsec;

  // Variables pulled from timeManager.jday function to reduce garbage collection
  var jDayStart;
  var jDayDiff;

  timeManager.dateObject = new Date();
  timeManager.nowTemp = timeManager.dateObject;

  timeManager.now = propFrozen; // (initialized as Date.now)
  timeManager.propRealTime = propFrozen; // actual time we're running it (initialized as Date.now)
  timeManager.propOffset = 0.0; // offset we're propagating to, msec
  timeManager.propRate = 1.0; // time rate multiplier for propagation

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
    timeManager.dateFormat = function (date, mask, utc) {
      var dF = timeManager.dateFormat;

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
    timeManager.dateFormat.masks = { // Common Formats
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
    timeManager.dateFormat.i18n = { // Internationalization strings
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

  // Propagation Time Functions
  timeManager.propTime = function () {
    if (timeManager.propRate === 0) {
      timeManager.nowTemp.setTime(Number(propFrozen) + timeManager.propOffset);
    } else {
      timeManager.nowTemp.setTime(Number(timeManager.propRealTime) + timeManager.propOffset +
                                 ((Number(timeManager.now) - Number(timeManager.propRealTime)) * timeManager.propRate));
    }
    return timeManager.nowTemp;
  };

  timeManager.propTimeCheck = function (propTempOffset, propRealTime) {
    'use strict';
    var now = new Date();                                     // Make a time variable
    now.setTime(Number(propRealTime) + propTempOffset);           // Set the time variable to the time in the future
    return now;
  };

  timeManager.setPropRateZero = function () {
    timeManager.propRate = 0;
    propFrozen = Date.now();
  };
  timeManager.getPropOffset = function () {
    // timeManager.selectedDate = $('#datetime-text').text().substr(0, 19);
    if (!timeManager.selectedDate) return;
    // selectedDate = selectedDate.split(' ');
    // selectedDate = new Date(selectedDate[0] + 'T' + selectedDate[1] + 'Z');
    var today = new Date();
    // Not using local scope caused time to drift backwards!
    let propOffset = timeManager.selectedDate - today;
    return timeManager.propOffset;
  };

  timeManager.dateToISOLikeButLocal = function(date) {
    var offsetMs = date.getTimezoneOffset() * 60 * 1000;
    var msLocal =  date.getTime() - offsetMs;
    var dateLocal = new Date(msLocal);
    var iso = dateLocal.toISOString();
    iso = iso.replace('T', ' ');
    var isoLocal = iso.slice(0, 19) + " " + dateLocal.toString().slice(25,31);
    return isoLocal;
  };

  timeManager.localToZulu = function (date) {
    date = timeManager.dateFormat(date, 'isoDateTime', true);
    date = date.split(' ');
    date = new Date(date[0] + 'T' + date[1] + 'Z');
    return date;
  };

  // Get Day of Year
  timeManager.getDayOfYear = function (date) {
    date = date || new Date();

    var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var mn = date.getMonth();
    var dn = date.getUTCDate();
    var dayOfYear = dayCount[mn] + dn;
    if (mn > 1 && _isLeapYear(date)) dayOfYear++;
    return dayOfYear;
    function _isLeapYear (date) {
      var year = date.getFullYear();
      if ((year & 3) !== 0) return false;
      return ((year % 100) !== 0 || (year % 400) === 0);
    }
  };

  timeManager.dateFromDay = function (year, day) {
    var date = new Date(year, 0); // initialize a date in `year-01-01`
    return new Date(date.setDate(day)); // add the number of days
  };

  timeManager.jday = function (year, mon, day, hr, minute, sec) { // from satellite.js
    if (!year) {
      // console.error('timeManager.jday should always have a date passed to it!');
      let now = new Date();
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

  window.timeManager = timeManager;
})();
