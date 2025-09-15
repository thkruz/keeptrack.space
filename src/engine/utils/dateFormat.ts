/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * dateFormat.ts is a standalone library that accepts a date, a mask, or a date
 * and a mask, and returns a formatted version of the given date.
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 * @Copyright (C) 2007-2009 Steven Levithan <stevenlevithan.com>
 *
 * This file includes enhancements by:
 * Scott Trenda <scott.trenda.net>
 * Kris Kowal <cixar.com/~kris.kowal/>
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

interface DateFormatFlags {
  d: number;
  dd: string;
  ddd: string;
  dddd: string;
  m: number;
  mm: string;
  mmm: string;
  mmmm: string;
  yy: string;
  yyyy: number;
  h: number;
  hh: string;
  H: number;
  HH: string;
  M: number;
  MM: string;
  s: number;
  ss: string;
  l: string;
  L: string;
  t: string;
  tt: string;
  T: string;
  TT: string;
  Z: string;
  o: string;
  S: string;
}

/**
 * This file contains a date formatting library that accepts a date, a mask, or a date and a mask, and returns a formatted version of the given date.
 * The library includes a regular expression that matches date format tokens and another regular expression that matches any timezone information in a date string.
 * It also includes a set of common date formats and internationalization strings for day and month names.
 *
 * @interface DateFormatFlags - An interface that defines the format flags used in the date format masks.
 * @constant {object} formats - An object that contains a set of common date formats and internationalization strings for day and month names.
 * @constant {object} formats.masks - An object that contains a set of common date formats.
 * @constant {string} formats.masks.default - The default date format mask.
 * @constant {string} formats.masks.shortDate - The short date format mask.
 * @constant {string} formats.masks.mediumDate - The medium date format mask.
 * @constant {string} formats.masks.longDate - The long date format mask.
 * @constant {string} formats.masks.fullDate - The full date format mask.
 * @constant {string} formats.masks.shortTime - The short time format mask.
 * @constant {string} formats.masks.mediumTime - The medium time format mask.
 * @constant {string} formats.masks.longTime - The long time format mask.
 * @constant {string} formats.masks.isoDate - The ISO date format mask.
 * @constant {string} formats.masks.isoTime - The ISO time format mask.
 * @constant {string} formats.masks.isoDateTime - The ISO date and time format mask.
 * @constant {string} formats.masks.isoUtcDateTime - The ISO UTC date and time format mask.
 * @constant {object} formats.i18n - An object that contains internationalization strings for day and month names.
 * @constant {string[]} formats.i18n.dayNames - An array of abbreviated and full day names.
 * @constant {string[]} formats.i18n.monthNames - An array of abbreviated and full month names.
 * @constant {RegExp} token - A regular expression that matches date format tokens.
 * @constant {RegExp} timezone - A regular expression that matches any timezone information in a date string.
 * @constant {RegExp} timezoneClip - A regular expression that matches any character that is not a digit, a plus sign, a minus sign, or an uppercase letter A to Z.
 */
const formats = {
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
    isoDateTime: 'yyyy-mm-dd\' \'HH:MM:ss',
    isoUtcDateTime: 'UTC:yyyy-mm-dd\'T\'HH:MM:ss\'Z\'',
  },
  i18n: {
    // Internationalization strings
    dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    monthNames: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  },
};

/**
 * A regular expression that matches date format tokens.
 *
 * This regular expression matches the following tokens:
 * - d: Day of the month as a numeric value (1 to 31).
 * - dd: Day of the month as a zero-padded numeric value (01 to 31).
 * - ddd: Day of the week as an abbreviated textual representation (e.g. "Mon").
 * - dddd: Day of the week as a full textual representation (e.g. "Monday").
 * - m: Month as a numeric value (1 to 12).
 * - mm: Month as a zero-padded numeric value (01 to 12).
 * - mmm: Month as an abbreviated textual representation (e.g. "Jan").
 * - mmmm: Month as a full textual representation (e.g. "January").
 * - yy: Year as a two-digit numeric value (e.g. "99" or "15").
 * - yyyy: Year as a four-digit numeric value (e.g. "1999" or "2015").
 * - h: Hours in 12-hour format (1 to 12).
 * - hh: Hours in 12-hour format as a zero-padded numeric value (01 to 12).
 * - H: Hours in 24-hour format (0 to 23).
 * - HH: Hours in 24-hour format as a zero-padded numeric value (00 to 23).
 * - M: Minutes as a numeric value (0 to 59).
 * - MM: Minutes as a zero-padded numeric value (00 to 59).
 * - s: Seconds as a numeric value (0 to 59).
 * - ss: Seconds as a zero-padded numeric value (00 to 59).
 * - l: Milliseconds as a numeric value (0 to 999).
 * - L: Milliseconds as a zero-padded numeric value (000 to 999).
 * - t: Lowercase "a" or "p" to denote AM or PM.
 * - tt: Uppercase "AM" or "PM".
 * - T: Lowercase "a" or "p" to denote AM or PM.
 * - TT: Uppercase "AM" or "PM".
 * - Z: Timezone offset in the format "+HHmm" or "-HHmm".
 * - o: Timezone offset in the format "GMT+HH:mm" or "GMT-HH:mm".
 * - S: The date's ordinal suffix (e.g. "st" for 1st, "nd" for 2nd, etc.).
 * - "quoted text": Any text enclosed in double quotes.
 * - 'quoted text': Any text enclosed in single quotes.
 */
// Breaking down the regex into smaller parts to reduce complexity
const dateToken = /d{1,4}|m{1,4}|yy(?:yy)?/gu;
// eslint-disable-next-line prefer-named-capture-group
const timeToken = /([HhMsTt])\1?|[LloSZ]/gu;
const quotedToken = /"[^"]*"|'[^']*'/gu;
const token = new RegExp(`${dateToken.source}|${timeToken.source}|${quotedToken.source}`, 'gu');

/**
 * A regular expression that matches any timezone information in a date string.
 *
 * This regular expression matches any of the following timezone formats:
 * - PMT, PDT, PST, PET, PEST, EDT, EST, CDT, CST, MDT, MST, ADT, AST, HDT, HST, AKDT, AKST, AWT, AWST, NT, IDLW, CET, CEST, WEST, WET, EET, EEST, MSK, IST, SGT, JST, KST, ACDT,
 * ACST, AEDT, AEST, NZDT, NZST, or any of the following:
 * - Pacific Standard Time, Pacific Daylight Time, Pacific Prevailing Time, Mountain Standard Time, Mountain Daylight Time, Mountain Prevailing Time, Central Standard Time, Central
 * Daylight Time, Central Prevailing Time, Eastern Standard Time, Eastern Daylight Time, Eastern Prevailing Time, Atlantic Standard Time, Atlantic Daylight Time, Atlantic
 * Prevailing Time, GMT, UTC, GMT-XXXX, or UTC+XXXX.
 *
 * This regular expression is used to remove any timezone information from a date string.
 */
const timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/gu;

/**
 * A regular expression that matches any character that is not a digit, a plus sign, a minus sign, or an uppercase letter A to Z.
 *
 * This is used to remove any timezone information from a date string.
 */
const timezoneClip = /[^-+\dA-Z]/gu;

/**
 * Pads a number with leading zeros until it reaches the desired length.
 * @param num - The number to pad.
 * @param length - The desired length of the resulting string.
 * @returns A string representing the padded number.
 */
const pad = (num: number, length: number): string => String(num).padStart(length, '0');

/**
 * Formats a given date according to a specified mask.
 * @param date - The date to format. Can be a string or a Date object.
 * @param mask - The mask to use for formatting the date. If not provided, the default mask will be used.
 * @param utc - If true, the date will be formatted in UTC time. Default is false.
 * @returns A formatted string representing the date according to the specified mask.
 * @throws SyntaxError if the provided date is invalid.
 */
export const dateFormat = (date: string | Date, mask: string, utc = false) => {
  if (typeof date === 'string' && !(/\d/u).test(date)) {
    mask = date;
    date = null;
  }

  if (!date) {
    throw new SyntaxError('invalid date');
  }
  const dateObj = new Date(date as string);

  if (Number.isNaN(dateObj.getTime())) {
    throw new SyntaxError(`invalid date - ${date}`);
  }

  mask = String(formats.masks[mask] || mask || formats.masks.default);

  if (mask.startsWith('UTC:')) {
    mask = mask.slice(4);
    utc = true;
  }

  const getFunctionPrefix = utc ? 'getUTC' : 'get';
  const d = dateObj[`${getFunctionPrefix}Date`]();
  const D = dateObj[`${getFunctionPrefix}Day`]();
  const m = dateObj[`${getFunctionPrefix}Month`]();
  const y = dateObj[`${getFunctionPrefix}FullYear`]();
  const H = dateObj[`${getFunctionPrefix}Hours`]();
  const M = dateObj[`${getFunctionPrefix}Minutes`]();
  const s = dateObj[`${getFunctionPrefix}Seconds`]();
  const L = dateObj[`${getFunctionPrefix}Milliseconds`]();
  const o = utc ? 0 : dateObj.getTimezoneOffset();
  const flags: DateFormatFlags = {
    d,
    dd: pad(d, 2),
    ddd: formats.i18n.dayNames[D],
    dddd: formats.i18n.dayNames[D + 7],
    m: m + 1,
    mm: pad(m + 1, 2),
    mmm: formats.i18n.monthNames[m],
    mmmm: formats.i18n.monthNames[m + 12],
    yy: String(y).slice(2),
    yyyy: y,
    h: H % 12 || 12,
    hh: pad(H % 12 || 12, 2),
    H,
    HH: pad(H, 2),
    M,
    MM: pad(M, 2),
    s,
    ss: pad(s, 2),
    l: pad(L, 3),
    L: pad(L > 99 ? Math.round(L / 10) : L, 2),
    t: H < 12 ? 'a' : 'p',
    tt: H < 12 ? 'am' : 'pm',
    T: H < 12 ? 'A' : 'P',
    TT: H < 12 ? 'AM' : 'PM',
    Z: utc ? 'UTC' : (String(date).match(timezone) || ['']).pop().replace(timezoneClip, ''),
    o: (o > 0 ? '-' : '+') + pad(Math.floor(Math.abs(o) / 60) * 100 + (Math.abs(o) % 60), 4),
    S: ['th', 'st', 'nd', 'rd'][d % 10 > 3 || (d % 100) - (d % 10) === 10 ? 0 : d % 10],
  };

  return mask.replace(token, ($0) => ($0 in flags ? flags[$0] : $0.slice(1, $0.length - 1)));
};
