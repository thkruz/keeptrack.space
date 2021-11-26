import { keepTrackApi } from '@app/js/api/externalApi';
import $ from 'jquery';
import { timeManagerObject } from './timeManagerObject';
import { dateFromJday, dateToLocalInIso, getDayOfYear, jday, localToZulu } from './transforms';

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
  init: () => {
    const settingsManager = keepTrackApi.programs.settingsManager;
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

    timeManager.propTimeCheck = function (propTempOffset: number, propRealTime) {
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
        const jday = timeManager.getDayOfYear(timeManager.propTime());
        $('#jday').html(jday);
      }
    };

    timeManager.getPropOffset = (): number => {
      // timeManager.selectedDate = $('#datetime-text').text().substr(0, 19);
      if (!timeManager.selectedDate) {
        // console.debug(timeManager);
        return 0;
      }
      // selectedDate = selectedDate.split(' ');
      // selectedDate = new Date(selectedDate[0] + 'T' + selectedDate[1] + 'Z');
      const today = new Date();
      // Not using local scope caused time to drift backwards!
      const propOffset = timeManager.selectedDate - today.getTime();
      return propOffset;
    };

    // Initialize
    timeManager.updatePropTime();
    timeManager.setSelectedDate(timeManager.propTimeVar);
  },
  dateToLocalInIso: dateToLocalInIso,
  jday: jday,
  getDayOfYear: getDayOfYear,
  localToZulu: localToZulu,
  dateFromJday: dateFromJday,
};
