import { DEG2RAD, Degrees, getDayOfYear, Kilometers, Radians, TAU } from '@ootk/src/main';
import { RADIUS_OF_EARTH, ZOOM_EXP } from './constants';

/**
 * This function normalizes the angle to be between -TAU/2 and TAU/2.
 */
export const normalizeAngle = (angle: Radians): Radians => {
  let normalizedAngle = angle % TAU;

  if (normalizedAngle > TAU / 2) {
    normalizedAngle -= TAU;
  }
  if (normalizedAngle < -TAU / 2) {
    normalizedAngle += TAU;
  }

  return <Radians>normalizedAngle;
};

/**
 * This function converts longitude in degrees to yaw in radians for the camera.
 */
export const lon2yaw = (lon: Degrees, selectedDate: Date): Radians => {
  const realTime = new Date();
  let propTime = new Date();

  /*
   * NOTE: camera formula sometimes is incorrect, but has been stable for over a year
   * NOTE: Looks wrong again as of 8/29/2020 - time of year issue?
   * NOTE: Could camera be related to daylight savings time? Subtracting one hour from selected date works
   */
  const doy = getDayOfYear(selectedDate);
  const modifier = 1000 * 60 * 60 * (-11.23 + 0.065666667 * doy);

  propTime.setUTCHours(selectedDate.getUTCHours());
  // + (selectedDate.getUTCMonth() * 2 - 11) / 2); // Offset has to account for time of year. Add 2 Hours per month into the year starting at -12.
  propTime.setUTCMinutes(selectedDate.getUTCMinutes());
  propTime.setUTCSeconds(selectedDate.getUTCSeconds());
  propTime = new Date(propTime.getTime() * 1 + modifier);

  realTime.setUTCHours(0, 0, 0, 0);
  const longOffset = (((propTime.getTime() - realTime.getTime()) / 60 / 60 / 1000) % 24) * 15; // 15 Degress Per Hour longitude Offset

  return normalizeAngle(<Radians>((lon + longOffset) * DEG2RAD));
};
/**
 * This function converts latitude in degrees to pitch in radians.
 */
export const lat2pitch = (lat: Degrees): Radians => {
  const QUARTER_TAU = TAU / 4;

  let pitch = lat * DEG2RAD;

  pitch = Math.min(Math.max(pitch, -QUARTER_TAU), QUARTER_TAU);

  return <Radians>pitch;
};

/**
 * This function converts altitude in kilometers to a zoom level between MIN_ZOOM_LEVEL and MAX_ZOOM_LEVEL for the camera.
 */
export const alt2zoom = (alt: Kilometers, minZoomDistance: Kilometers, maxZoomDistance: Kilometers, minDistanceFromSatellite: Kilometers): number => {
  if (minZoomDistance > maxZoomDistance) {
    throw new Error('minZoomDistance must be less than maxZoomDistance');
  }

  const distanceFromCenter = alt + RADIUS_OF_EARTH + minDistanceFromSatellite;
  const zoomLevel = ((distanceFromCenter - minZoomDistance) / (maxZoomDistance - minZoomDistance)) ** (1 / ZOOM_EXP);


  return Number.isNaN(zoomLevel) ? 0.5 : Math.min(Math.max(zoomLevel, 0), 1);
};

const isLeapYear_ = (dateIn: Date) => {
  const year = dateIn.getUTCFullYear();

  if ((year & 3) !== 0) {
    return false;
  }

  return year % 100 !== 0 || year % 400 === 0;
};

/**
 * Calculate the julian day from a calendar date.
 */
export const jday = (year: number, month: number, day: number, hour: number, minute: number, second: number): number => {
  // Any negative values throw an error
  if (year < 0 || month < 1 || day < 0 || hour < 0 || minute < 0 || second < 0) {
    throw new Error('Invalid negative value');
  }
  // Validate month
  if (month > 12) {
    throw new Error('Invalid month value');
  }
  // Validate day
  if (day > 31) {
    throw new Error('Invalid day value');
  }
  // Validate hour
  if (hour > 23) {
    throw new Error('Invalid hour value');
  }
  // Validate minute
  if (minute > 59) {
    throw new Error('Invalid minute value');
  }
  // Validate second
  if (second > 60) {
    throw new Error('Invalid second value');
  }

  return (
    367.0 * year -
    Math.trunc(7 * (year + Math.trunc((month + 9) / 12.0)) * 0.25) +
    Math.trunc((275 * month) / 9.0) +
    day +
    1721013.5 +
    ((second / 60.0 + minute) / 60.0 + hour) / 24.0
  );
};

/**
 * Converts a local date to a zulu (UTC) date.
 */
export const localToZulu = (date: Date) => new Date(date.toISOString());

export const dateFromJday = (year: number, day: number): Date => {
  if (year < 0) {
    throw new Error('Invalid negative value');
  }
  if (day < 1 || day > 366) {
    throw new Error('Invalid day value');
  }

  const date = new Date(Date.UTC(year, 0)); // initialize a date in `year-01-01` in UTC

  if (isLeapYear_(date)) {
    if (day > 366) {
      throw new Error('Invalid day value');
    }
  } else if (day > 365) {
    throw new Error('Invalid day value');
  }

  return new Date(date.setUTCDate(day)); // set the UTC date to the specified day
};

export const dateToLocalInIso = (date: Date): string => {
  const offsetMs = -date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() + offsetMs);
  const iso = localDate.toISOString().replace('T', ' ');


  return `${iso.slice(0, 19)} ${iso.slice(25, 31)}`;
};
