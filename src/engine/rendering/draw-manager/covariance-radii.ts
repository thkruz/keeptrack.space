import { RicSigmas, scaleAndClampRicSigmas } from '@ootk/src/main';
import { vec3 } from 'gl-matrix';

/**
 * Per-axis caps (km) applied to covariance display radii so the rendered
 * ellipsoid does not become absurdly large for poorly-tracked objects.
 */
export const COVARIANCE_RADII_CAPS: RicSigmas = {
  radial: 1200,
  inTrack: 5000,
  crossTrack: 1000,
};

/**
 * Fallback ellipsoid radii (km) in the renderer's [radial, cross-track,
 * in-track] order, used when a usable covariance cannot be derived.
 */
export const COVARIANCE_RADII_FALLBACK: vec3 = [COVARIANCE_RADII_CAPS.radial, COVARIANCE_RADII_CAPS.crossTrack, COVARIANCE_RADII_CAPS.inTrack];

/**
 * Convert RIC 1-sigma position uncertainties into capped, confidence-scaled
 * ellipsoid radii in the renderer's [radial, cross-track, in-track] order.
 * @param sigmas The 1-sigma RIC position uncertainties (km).
 * @param confidence The confidence multiplier (e.g. 1, 2, or 3 for n-sigma).
 * @returns The display radii, or `null` if the sigmas are not usable.
 */
export function covarianceDisplayRadii(sigmas: RicSigmas, confidence: number): vec3 | null {
  const scaled = scaleAndClampRicSigmas(sigmas, confidence, COVARIANCE_RADII_CAPS);

  if (!scaled) {
    return null;
  }

  return [scaled.radial, scaled.crossTrack, scaled.inTrack];
}

/**
 * Extract RIC 1-sigma position uncertainties (km) from the position block of a
 * RIC-frame covariance matrix. The diagonal order is [radial, in-track,
 * cross-track].
 * @param elements The covariance matrix elements (variances on the diagonal).
 * @returns The 1-sigma RIC position uncertainties.
 */
export function ricSigmasFromCovarianceMatrix(elements: number[][]): RicSigmas {
  return {
    radial: Math.sqrt(elements[0][0]),
    inTrack: Math.sqrt(elements[1][1]),
    crossTrack: Math.sqrt(elements[2][2]),
  };
}
