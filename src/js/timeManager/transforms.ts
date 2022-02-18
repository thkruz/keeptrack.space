import { MILLISECONDS_PER_DAY } from '../lib/constants';
import { dateFormat } from '../lib/external/dateFormat';

export const getDayOfYear = (date: Date): number => {
  date = date || new Date();
  const _isLeapYear = (dateIn: Date) => {
    const year = dateIn.getUTCFullYear();
    if ((year & 3) !== 0) return false;
    return year % 100 !== 0 || year % 400 === 0;
  };

  const dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const mn = date.getMonth();
  const dn = date.getUTCDate();
  let dayOfYear = dayCount[mn] + dn;
  if (mn > 1 && _isLeapYear(date)) dayOfYear++;
  return dayOfYear;
};

export const jday = (year?: number, mon?: number, day?: number, hr?: number, minute?: number, sec?: number) => {
  if (!year) {
    const now = new Date();
    const jDayStart = new Date(now.getUTCFullYear(), 0, 0);
    const jDayDiff = now.getDate() - jDayStart.getDate();
    return Math.floor(jDayDiff / MILLISECONDS_PER_DAY);
  } else {
    return (
      367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor((275 * mon) / 9.0) + day + 1721013.5 + ((sec / 60.0 + minute) / 60.0 + hr) / 24.0
    );
  }
};

export const localToZulu = (date: Date) => {
  const dateStr = dateFormat(date, 'isoDateTime', true);
  const dateArr = dateStr.split(' ');
  date = new Date(dateArr[0] + 'T' + dateArr[1] + 'Z');
  return date;
};

export const dateFromJday = (year: number, day: number): Date => {
  const date = new Date(year, 0); // initialize a date in `year-01-01`
  return new Date(date.setDate(day));
};

export const dateToLocalInIso = (date: Date): string => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const msLocal = date.getTime() - offsetMs;
  const dateLocal = new Date(msLocal);
  let iso = dateLocal.toISOString();
  iso = iso.replace('T', ' ');
  const isoLocal = iso.slice(0, 19) + ' ' + dateLocal.toString().slice(25, 31);
  return isoLocal;
};
