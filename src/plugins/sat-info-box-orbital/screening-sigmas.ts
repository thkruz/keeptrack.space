import { cappedScreeningCovarianceFromTle, RicSigmas } from '@ootk/src/main';

/**
 * The single source for the 1-sigma position uncertainty KeepTrack shows next to an object.
 *
 * Both the orbital info box and the Conjunction / Maneuver Reports print these numbers, and
 * Debris Screening and the Conjunction Report compute Pc from the same model
 * (ootk `cappedScreeningCovarianceFromTle`, scaled there by the confidence level k). Values are:
 *
 * - 1-sigma (k = 1), independent of the confidence-level setting, so the label is always true;
 * - in km, in the object's own RIC frame (radial, in-track, cross-track);
 * - evaluated at the TLE (GP) epoch. The model is not aged with GP age or propagated to TCA.
 *
 * Measured covariance (the Pro Covariance plugin's covariance.json) only resizes the drawn
 * ellipsoid; it is not used for Pc, so it is not shown as the object's sigma either.
 */
export type ScreeningSigmasKm = RicSigmas;

let cacheKey_ = '';
let cacheValue_: ScreeningSigmasKm | null = null;

/**
 * 1-sigma R / I / C position uncertainty (km) of the TLE-derived screening covariance.
 * @param tle1 TLE line 1
 * @param tle2 TLE line 2
 * @returns The sigmas, or null when the TLE cannot produce a covariance.
 */
export const screeningSigmasKm = (tle1: string, tle2: string): ScreeningSigmasKm | null => {
  const key = `${tle1}\n${tle2}`;

  if (key === cacheKey_) {
    return cacheValue_;
  }

  let value: ScreeningSigmasKm | null = null;

  try {
    const el = cappedScreeningCovarianceFromTle(tle1, tle2, 1).matrix.elements;
    const sigmas: ScreeningSigmasKm = { radial: Math.sqrt(el[0][0]), inTrack: Math.sqrt(el[1][1]), crossTrack: Math.sqrt(el[2][2]) };

    value = [sigmas.radial, sigmas.inTrack, sigmas.crossTrack].every((s) => Number.isFinite(s) && s > 0) ? sigmas : null;
  } catch {
    value = null;
  }

  cacheKey_ = key;
  cacheValue_ = value;

  return value;
};
