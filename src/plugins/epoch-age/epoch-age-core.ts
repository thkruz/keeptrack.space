/**
 * Pure helpers for the EpochAge plugin. No DOM or ServiceLocator imports.
 *
 * "Epoch age" is how far the simulation time sits from the selected object's
 * element-set epoch, in either direction. It is deliberately not called orbit
 * confidence: that name belongs to the covariance-based estimate.
 */

import { type TrustLevel, trustLevel } from '../time-slider/slider-bands-core';

export type EpochAgeLevel = TrustLevel;

/**
 * Grade an epoch age in days: ok <= 3 < caution <= 7 < low <= 14 < poor.
 * Negative ages (sim time before the epoch) are graded by magnitude. Shares
 * its thresholds with the time slider's trust bands.
 */
export const ageLevel = (days: number): EpochAgeLevel => trustLevel(days);

/** Signed days with one decimal and a unit, e.g. `+5.2 d` or `-1.0 d`. */
export const formatDays = (days: number): string => {
  const rounded = Math.round(days * 10) / 10;
  const sign = rounded < 0 || Object.is(rounded, -0) ? '-' : '+';

  return `${sign}${Math.abs(rounded).toFixed(1)} d`;
};

/** Epoch age above which jumping in time shows the one-time caution toast. */
export const POOR_AGE_DAYS = 14;
