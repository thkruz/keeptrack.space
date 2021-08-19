import $ from 'jquery';
import { MILLISECONDS_PER_DAY } from '@app/js/lib/constants.js';
import { dateFormat } from '@app/js/lib/external/dateFormat.js';
import { keepTrackApi } from '@app/js/api/externalApi';

interface timeManagerObject {
  init: any;
  dateObject: Date;
  propTimeVar: any;
  datetimeInputDOM: JQuery<HTMLElement>;
  timeTextStr: string;
  timeTextStrEmpty: string;
  now: number;
  propRealTime: number;
  propOffset: number;
  propRate: number;
  dt: number;
  drawDt: number;
  updatePropTime: (propTimeVar?: any) => void;
  propTime: () => any;
  propTimeCheck: (propTempOffset: any, propRealTime: any) => Date;
  setNow: (now: any, dt: any) => void;
  setLastTime(propTimeVar: any): any;
  setSelectedDate(propTimeVar: any): any;
  lastTime: any;
  selectedDate: any;
  setDrawDt: (drawDt: any) => void;
  setPropRateZero: () => void;
  tDS: any;
  iText: number;
  propRate0: any;
  dateDOM: any;
  getPropOffset: () => number;
  dateToISOLikeButLocal: (date: any) => string;
  localToZulu: (date: any) => any;
  getDayOfYear: (date: any) => any;
  dateFromDay: (year: any, day: any) => Date;
  jday: (year: any, mon: any, day: any, hr: any, minute: any, sec: any) => any;
}

export const timeManager: timeManagerObject = {
  dateObject: null,
  propTimeVar: null,
  datetimeInputDOM: null,
  timeTextStr: null,
  timeTextStrEmpty: null,
  now: null,
  propRealTime: null,
  propOffset: null,
  propRate: null,
  dt: null,
  drawDt: null,
  updatePropTime: null,
  propTime: null,
  propTimeCheck: null,
  setNow: null,
  setLastTime: null,
  setSelectedDate: null,
  lastTime: null,
  selectedDate: null,
  setDrawDt: null,
  setPropRateZero: null,
  tDS: null,
  iText: null,
  propRate0: null,
  dateDOM: null,
  getPropOffset: null,
  dateToISOLikeButLocal: null,
  localToZulu: null,
  getDayOfYear: null,
  dateFromDay: null,
  jday: null,
  init: () => {
    const settingsManager = keepTrackApi.programs.settingsManager;
    // Variables pulled from timeManager.jday function to reduce garbage collection
    let jDayStart;
    let jDayDiff;

    timeManager.dateObject = new Date();
    timeManager.propTimeVar = timeManager.dateObject;
    timeManager.datetimeInputDOM = $('#datetime-input-tb');

    timeManager.timeTextStr = '';
    timeManager.timeTextStrEmpty = '';

    let propFrozen = Date.now(); // for when propRate 0
    timeManager.now = propFrozen; // (initialized as Date.now)
    timeManager.propRealTime = propFrozen; // actual time we're running it (initialized as Date.now)
    timeManager.propOffset = 0.0; // offset we're propagating to, msec
    timeManager.propRate = 1.0; // time rate multiplier for propagation
    timeManager.dt = 0;
    timeManager.drawDt = 0;

    timeManager.updatePropTime = (propTimeVar?) => {
      if (typeof propTimeVar !== 'undefined' && propTimeVar !== null) {
        timeManager.propTimeVar.setTime(propTimeVar);
        return;
      }
      if (timeManager.propRate === 0) {
        timeManager.propTimeVar.setTime(Number(timeManager.propRealTime) + timeManager.propOffset);
      } else {
        timeManager.propTimeVar.setTime(Number(timeManager.propRealTime) + timeManager.propOffset + (Number(timeManager.now) - Number(timeManager.propRealTime)) * timeManager.propRate);
      }
    };

    // Propagation Time Functions
    timeManager.propTime = function () {
      if (timeManager.propRate === 0) {
        timeManager.propTimeVar.setTime(Number(timeManager.propRealTime) + timeManager.propOffset);
      } else {
        timeManager.propTimeVar.setTime(Number(timeManager.propRealTime) + timeManager.propOffset + (Number(timeManager.now) - Number(timeManager.propRealTime)) * timeManager.propRate);
      }
      return timeManager.propTimeVar;
    };

    timeManager.propTimeCheck = function (propTempOffset, propRealTime) {
      const now = new Date(); // Make a time variable
      now.setTime(Number(propRealTime) + propTempOffset); // Set the time variable to the time in the future
      return now;
    };

    timeManager.setNow = (now, dt) => {
      timeManager.now = now;
      timeManager.dt = dt;

      timeManager.setLastTime(timeManager.propTimeVar);
      timeManager.updatePropTime();
      timeManager.setSelectedDate(timeManager.propTimeVar);

      // Passing datetimeInput eliminates needing jQuery in main module
      if (timeManager.lastTime - timeManager.propTimeVar < 300 && (settingsManager.isEditTime || !settingsManager.cruncherReady)) {
        if (settingsManager.plugins.datetime) {
          timeManager.datetimeInputDOM.val(timeManager.selectedDate.toISOString().slice(0, 10) + ' ' + timeManager.selectedDate.toISOString().slice(11, 19));
        }
      }
    };

    timeManager.setDrawDt = (drawDt) => {
      timeManager.drawDt = drawDt;
    };

    timeManager.setPropRateZero = function () {
      timeManager.propRate = 0;
      propFrozen = Date.now();
    };

    timeManager.setLastTime = (now) => {
      timeManager.lastTime = now;
    };

    timeManager.setSelectedDate = (selectedDate) => {
      timeManager.selectedDate = selectedDate;
      
      // This function only applies when datetime plugin is enabled
      if (settingsManager.plugins.datetime) {
        if (timeManager.lastTime - timeManager.propTimeVar < 300) {
          timeManager.tDS = timeManager.propTimeVar.toJSON();
          timeManager.timeTextStr = timeManager.timeTextStrEmpty;
          for (timeManager.iText = 11; timeManager.iText < 20; timeManager.iText++) {
            if (timeManager.iText > 11) timeManager.timeTextStr += timeManager.tDS[timeManager.iText - 1];
          }
          timeManager.propRate0 = timeManager.propRate;
          settingsManager.isPropRateChange = false;
        }
        // textContent doesn't remove the Node! No unecessary DOM changes everytime time updates.
        if (timeManager.dateDOM == null) timeManager.dateDOM = window.document.getElementById('datetime-text');
        if (timeManager.dateDOM == null) {
          console.debug('Cant find datetime-text!');
          return;
        }
        timeManager.dateDOM.textContent = timeManager.timeTextStr;

        // Load the current JDAY
        let jday = timeManager.getDayOfYear(timeManager.propTime());
        $('#jday').html(jday);
      }
    };

    timeManager.getPropOffset = function () {
      // timeManager.selectedDate = $('#datetime-text').text().substr(0, 19);
      if (!timeManager.selectedDate) {
        // console.error(timeManager);
        return;
      }
      // selectedDate = selectedDate.split(' ');
      // selectedDate = new Date(selectedDate[0] + 'T' + selectedDate[1] + 'Z');
      var today = new Date();
      // Not using local scope caused time to drift backwards!
      let propOffset = timeManager.selectedDate - today.getTime();
      return propOffset;
    };

    timeManager.dateToISOLikeButLocal = function (date) {
      var offsetMs = date.getTimezoneOffset() * 60 * 1000;
      var msLocal = date.getTime() - offsetMs;
      var dateLocal = new Date(msLocal);
      var iso = dateLocal.toISOString();
      iso = iso.replace('T', ' ');
      var isoLocal = iso.slice(0, 19) + ' ' + dateLocal.toString().slice(25, 31);
      return isoLocal;
    };

    timeManager.localToZulu = function (date) {
      date = dateFormat(date, 'isoDateTime', true);
      date = date.split(' ');
      date = new Date(date[0] + 'T' + date[1] + 'Z');
      return date;
    };

    // Get Day of Year
    timeManager.getDayOfYear = function (date) {
      date = date || new Date();
      var _isLeapYear = (date: Date) => {
        var year = date.getFullYear();
        if ((year & 3) !== 0) return false;
        return year % 100 !== 0 || year % 400 === 0;
      };

      var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
      var mn = date.getMonth();
      var dn = date.getUTCDate();
      var dayOfYear = dayCount[mn] + dn;
      if (mn > 1 && _isLeapYear(date)) dayOfYear++;
      return dayOfYear;
    };

    timeManager.dateFromDay = function (year, day) {
      var date = new Date(year, 0); // initialize a date in `year-01-01`
      return new Date(date.setDate(day)); // add the number of days
    };

    timeManager.jday = function (year, mon, day, hr, minute, sec) {
      // from satellite.js
      if (!year) {
        // console.error('timeManager.jday should always have a date passed to it!');
        let now = new Date();
        jDayStart = new Date(now.getFullYear(), 0, 0);
        jDayDiff = now.getDate() - jDayStart.getDate();
        return Math.floor(jDayDiff / MILLISECONDS_PER_DAY);
      } else {
        return (
          367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor((275 * mon) / 9.0) + day + 1721013.5 + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0 //  ut in days
        );
      }
    };

    // Initialize
    timeManager.updatePropTime();
    timeManager.setSelectedDate(timeManager.propTimeVar);
  },
};
