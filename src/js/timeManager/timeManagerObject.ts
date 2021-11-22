/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

export interface timeManagerObject {
  init: any;
  dateObject: Date;
  propTimeVar: any;
  datetimeInputDOM: any;
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
