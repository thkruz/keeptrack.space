/* */

/*! Date Format 1.2.4
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by:
 * Scott Trenda <scott.trenda.net>
 * Kris Kowal <cixar.com/~kris.kowal/>
 * Theodore Kruczek
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to formats.masks.default.
 */

var pad = (val, len) => {
  val = String(val);
  len = len || 2;
  while (val.length < len) val = '0' + val;
  return val;
};

var formats = {
  masks: {
    // Common Formats
    default: 'ddd mmm dd yyyy HH:MM:ss',
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
    isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'",
  },
  i18n: {
    // Internationalization strings
    dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
};

// eslint-disable-next-line prefer-named-capture-group
var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/gu;
var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/gu;
var timezoneClip = /[^-+\dA-Z]/gu;
var dateFormat = function (date, mask, utc) {
  // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
  if (arguments.length === 1 && Object.prototype.toString.call(date) === '[object String]' && !/\d/u.test(date)) {
    mask = date;
    // eslint-disable-next-line no-undefined
    date = undefined;
  }

  // Passing date through Date applies Date.parse, if necessary
  date = date ? new Date(date) : new Date();
  if (isNaN(date)) throw SyntaxError(`invalid date - ${date}`);

  mask = String(formats.masks[mask] || mask || formats.masks['default']);

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
    dd: pad(d),
    ddd: formats.i18n.dayNames[D],
    dddd: formats.i18n.dayNames[D + 7],
    m: m + 1,
    mm: pad(m + 1),
    mmm: formats.i18n.monthNames[m],
    mmmm: formats.i18n.monthNames[m + 12],
    yy: String(y).slice(2),
    yyyy: y,
    h: H % 12 || 12,
    hh: pad(H % 12 || 12),
    H: H,
    HH: pad(H),
    M: M,
    MM: pad(M),
    s: s,
    ss: pad(s),
    l: pad(L, 3),
    L: pad(L > 99 ? Math.round(L / 10) : L),
    t: H < 12 ? 'a' : 'p',
    tt: H < 12 ? 'am' : 'pm',
    T: H < 12 ? 'A' : 'P',
    TT: H < 12 ? 'AM' : 'PM',
    Z: utc ? 'UTC' : (String(date).match(timezone) || ['']).pop().replace(timezoneClip, ''),
    o: (o > 0 ? '-' : '+') + pad(Math.floor(Math.abs(o) / 60) * 100 + (Math.abs(o) % 60), 4),
    S: ['th', 'st', 'nd', 'rd'][d % 10 > 3 ? 0 : (((d % 100) - (d % 10) !== 10) * d) % 10],
  };

  return mask.replace(token, function ($0) {
    return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
  });
};

export { dateFormat };
