import { DEG2RAD, RADIUS_OF_EARTH, TAU, ZOOM_EXP } from '../lib/constants';
import { getDayOfYear } from '../timeManager/transforms';

export const normalizeAngle = (angle: number): number => {
  angle %= TAU;
  if (angle > TAU / 2) angle -= TAU;
  if (angle < -TAU / 2) angle += TAU;
  return angle;
};
export const lon2yaw = (long: number, selectedDate: Date): number => {
  const realTime = new Date();
  let propTime = new Date();
  let angle = 0;

  // NOTE: camera formula sometimes is incorrect, but has been stable for over a year
  // NOTE: Looks wrong again as of 8/29/2020 - time of year issue?
  // NOTE: Could camera be related to daylight savings time? Subtracting one hour from selected date works
  const doy = getDayOfYear(selectedDate);
  const modifier = 1000 * 60 * 60 * (-11.23 + 0.065666667 * doy);

  propTime.setUTCHours(selectedDate.getUTCHours()); // + (selectedDate.getUTCMonth() * 2 - 11) / 2); // Offset has to account for time of year. Add 2 Hours per month into the year starting at -12.
  propTime.setUTCMinutes(selectedDate.getUTCMinutes());
  propTime.setUTCSeconds(selectedDate.getUTCSeconds());
  propTime = new Date(propTime.getTime() * 1 + modifier);

  realTime.setUTCHours(0);
  realTime.setUTCMinutes(0);
  realTime.setUTCSeconds(0);
  let longOffset = (propTime.getTime() - realTime.getTime()) / 60 / 60 / 1000; // In Hours
  if (longOffset > 24) longOffset = longOffset - 24;
  longOffset = longOffset * 15; // 15 Degress Per Hour longitude Offset

  angle = (long + longOffset) * DEG2RAD;
  angle = normalizeAngle(angle);
  return angle;
};
export const lat2pitch = (lat: number): number => {
  let pitch = lat * DEG2RAD;
  if (pitch > TAU / 4) pitch = TAU / 4; // Max 90 Degrees
  if (pitch < -TAU / 4) pitch = -TAU / 4; // Min -90 Degrees
  return pitch;
};
export const alt2zoom = (alt: number): number => {
  const distanceFromCenter = alt + RADIUS_OF_EARTH + 30;
  return Math.pow((distanceFromCenter - settingsManager.minZoomDistance) / (settingsManager.maxZoomDistance - settingsManager.minZoomDistance), 1 / ZOOM_EXP);
};
