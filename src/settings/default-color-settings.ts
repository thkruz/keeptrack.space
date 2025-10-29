import { rgbaArray } from '@app/engine/core/interfaces';

export const defaultColorSettings = {
  version: '1.4.6', // This should match the one in settings.ts and be updated to force users cache to clear
  length: 0,
  facility: [0.0, 0.64, 0.64, 1.0] as rgbaArray,
  sunlight100: [1.0, 1.0, 1.0, 0.7] as rgbaArray,
  sunlight80: [1.0, 1.0, 1.0, 0.4] as rgbaArray,
  sunlight60: [1.0, 1.0, 1.0, 0.1] as rgbaArray,
  starHi: [1.0, 1.0, 1.0, 1.0] as rgbaArray,
  starMed: [1.0, 1.0, 1.0, 0.85] as rgbaArray,
  starLow: [1.0, 1.0, 1.0, 0.65] as rgbaArray,
  sensor: [1.0, 0.0, 0.0, 1.0] as rgbaArray,
  sensorAlt: [0.0, 0.0, 1.0, 1.0] as rgbaArray,
  marker: [
    [0.2, 1.0, 1.0, 1.0] as rgbaArray,
    [1.0, 0.2, 1.0, 1.0] as rgbaArray,
    [1.0, 1.0, 0.2, 1.0] as rgbaArray,
    [0.2, 0.2, 1.0, 1.0] as rgbaArray,
    [0.2, 1.0, 0.2, 1.0] as rgbaArray,
    [1.0, 0.2, 0.2, 1.0] as rgbaArray,
    [0.5, 0.6, 1.0, 1.0] as rgbaArray,
    [0.6, 0.5, 1.0, 1.0] as rgbaArray,
    [1.0, 0.6, 0.5, 1.0] as rgbaArray,
    [1.0, 1.0, 1.0, 1.0] as rgbaArray,
    [0.2, 1.0, 1.0, 1.0] as rgbaArray,
    [1.0, 0.2, 1.0, 1.0] as rgbaArray,
    [1.0, 1.0, 0.2, 1.0] as rgbaArray,
    [0.2, 0.2, 1.0, 1.0] as rgbaArray,
    [0.2, 1.0, 0.2, 1.0] as rgbaArray,
    [1.0, 0.2, 0.2, 1.0] as rgbaArray,
    [0.5, 0.6, 1.0, 1.0] as rgbaArray,
    [0.6, 0.5, 1.0, 1.0] as rgbaArray,
  ],
  deselected: [1.0, 1.0, 1.0, 0] as rgbaArray,
  inFOV: [0.85, 0.5, 0.0, 1.0] as rgbaArray,
  inFOVAlt: [0.2, 0.4, 1.0, 1] as rgbaArray,
  payload: [0.2, 1.0, 0.0, 0.5] as rgbaArray,
  rocketBody: [0.2, 0.4, 1.0, 1] as rgbaArray,
  debris: [0.5, 0.5, 0.5, 1] as rgbaArray,
  unknown: [0.5, 0.5, 0.5, 0.85] as rgbaArray,
  pink: [1.0, 0.0, 0.6, 1.0] as rgbaArray,
  analyst: [1.0, 1.0, 1.0, 0.8] as rgbaArray,
  missile: [1.0, 1.0, 0.0, 1.0] as rgbaArray,
  missileInview: [1.0, 0.0, 0.0, 1.0] as rgbaArray,
  transparent: [1.0, 1.0, 1.0, 0.1] as rgbaArray,
  satHi: [1.0, 1.0, 1.0, 1.0] as rgbaArray,
  satMed: [1.0, 1.0, 1.0, 0.8] as rgbaArray,
  satLow: [1.0, 1.0, 1.0, 0.6] as rgbaArray,
  sunlightInview: [0.85, 0.5, 0.0, 1.0] as rgbaArray,
  penumbral: [1.0, 1.0, 1.0, 0.3] as rgbaArray,
  umbral: [1.0, 1.0, 1.0, 0.1] as rgbaArray,
  /*
   * DEBUG Colors
   * sunlight = [0.2, 0.4, 1.0, 1]
   * penumbral = [0.5, 0.5, 0.5, 0.85]
   * umbral = [0.2, 1.0, 0.0, 0.5]
   */
  gradientAmt: 0,
  /*
   * Gradients Must be Edited in color-scheme.js
   * apogeeGradient = [1.0 - this.colors.gradientAmt, this.colors.gradientAmt, 0.0, 1.0]
   * velGradient = [1.0 - this.colors.gradientAmt, this.colors.gradientAmt, 0.0, 1.0]
   */
  satSmall: [0.2, 1.0, 0.0, 0.65] as rgbaArray,
  confidenceHi: [0.0, 1.0, 0.0, 0.65] as rgbaArray,
  confidenceMed: [1.0, 0.4, 0.0, 0.65] as rgbaArray,
  confidenceLow: [1.0, 0.0, 0.0, 0.65] as rgbaArray,
  rcsXXSmall: [1.0, 0, 0, 0.6] as rgbaArray,
  rcsXSmall: [1.0, 0.2, 0, 0.6] as rgbaArray,
  rcsSmall: [1.0, 0.4, 0, 0.6] as rgbaArray,
  rcsMed: [0.2, 0.4, 1.0, 1] as rgbaArray,
  rcsLarge: [0, 1.0, 0, 0.6] as rgbaArray,
  rcsUnknown: [1.0, 1.0, 0, 0.6] as rgbaArray,
  lostobjects: [1, 0, 0, 0.8] as rgbaArray,
  inGroup: [1.0, 0.0, 0.0, 1.0] as rgbaArray,
  countryPRC: [1.0, 0, 0, 0.6] as rgbaArray,
  countryUS: [0.2, 0.4, 1.0, 1] as rgbaArray,
  countryCIS: [1.0, 1.0, 1.0, 1.0] as rgbaArray,
  countryOther: [0, 1.0, 0, 0.6] as rgbaArray,
  densityPayload: [0.15, 0.7, 0.8, 1.0] as rgbaArray,
  spatialDensityHi: [1, 0, 0, 1] as rgbaArray,
  spatialDensityMed: [1, 0.4, 0, 1] as rgbaArray,
  spatialDensityLow: [1, 1, 0, 0.9] as rgbaArray,
  spatialDensityOther: [0.8, 0.8, 0.8, 0.3] as rgbaArray,
  notional: [1, 0, 0, 0.8] as rgbaArray,
  starlink: [0.0, 0.8, 0.0, 0.8] as rgbaArray,
  starlinkNot: [0.8, 0.0, 0.0, 0.8] as rgbaArray,
};
