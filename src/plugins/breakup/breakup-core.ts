/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * breakup-core.ts holds the DOM-free, catalog-free physics for the Breakup
 * simulator. Fragments are modelled the way a real breakup behaves: every piece
 * leaves the parent's exact position at the breakup instant with a small random
 * velocity change (delta-V) sampled in the radial / in-track / cross-track (RIC)
 * frame. The fragment state is then fit to SGP4 *mean* elements with `rv2tle`
 * (a TLE built straight from osculating elements lands kilometres off, because
 * SGP4 expects Brouwer mean elements). This works in ANY orbital regime
 * (LEO/MEO/GEO/HEO/elliptical) - unlike the old OrbitFinder "rotate the ground
 * track over a lat/lon" approach, which only approximated a near-circular breakup.
 *
 * Everything here works in the TEME frame (the SGP4 output frame KeepTrack uses),
 * so there is no J2000-vs-TEME frame mismatch.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { rv2tle, RvVector, TleLine1, TleLine2 } from '@ootk/src/main';

/** Convert metres-per-second (UI units) to kilometres-per-second (ootk units). */
export const MS_TO_KMS = 0.001;

/** A spliced TLE line must be exactly this long. */
const TLE_LINE_LENGTH = 69;

/** Max mean motion (rev/day) the TLE format / ootk parser accepts; beyond this an orbit is sub-orbital. */
const MAX_TLE_MEAN_MOTION = 18;

/** A simple cartesian 3-vector (km for position, km/s for velocity). */
export type Vec3 = RvVector;

/**
 * Event-type presets that fill the per-axis delta-V fields (one-sigma, m/s).
 *
 * Magnitudes are grounded in the NASA Standard Breakup Model (EVOLVE 4.0):
 * fragment delta-V is log-normal, mu_v = 0.2*log10(A/M)+1.85 (explosion) or
 * 0.9*log10(A/M)+2.90 (collision), sigma_v = 0.4. Per-axis sigmas target the
 * observed median total delta-V for trackable (>~10 cm) debris (median total of
 * an isotropic draw ~= 1.54*sigma; for the anisotropic presets it is ~0.89*RMS):
 *   - explosion: ~60 m/s   (catalog-dominant rocket-body/battery breakups, ~10-100 m/s)
 *   - collision: ~155 m/s  (catastrophic on-orbit collision; 80% of >10 cm fragments <250 m/s)
 *   - asat_cosmos: ~130 m/s (Cosmos 1408, 2021; tighter 185-1440 km spread -> lower energy)
 *   - asat_fy1c: ~300 m/s  (Fengyun-1C, 2007; ~9 km/s intercept, 200-4000 km spread)
 *   - venting: ~23 m/s     (low-energy overpressure / propellant venting)
 *
 * Direction (anisotropy): the NASA SBM assigns directions isotropically (it
 * averages over unknown impact geometry). That is physically right for an
 * explosion / venting (internal energy release -> spherically symmetric), so
 * those keep equal axes. A hypervelocity impact instead imparts momentum along
 * the impact direction; for a direct-ascent ASAT the closing velocity is
 * dominated by the target's in-plane orbital motion, so the spread concentrates
 * in the orbital plane (radial + in-track) with suppressed cross-track. The
 * collision/ASAT presets therefore use cross-track ~= 0.4x the in-plane axes.
 * (A specific collision's geometry varies; this is the common LEO in-plane case.)
 */
export interface BreakupPreset {
  id: string;
  radial: number;
  inTrack: number;
  crossTrack: number;
}

export const BREAKUP_PRESETS: readonly BreakupPreset[] = [
  { id: 'explosion', radial: 40, inTrack: 40, crossTrack: 40 },
  { id: 'collision', radial: 120, inTrack: 120, crossTrack: 50 },
  { id: 'asat_cosmos', radial: 100, inTrack: 100, crossTrack: 40 },
  { id: 'asat_fy1c', radial: 230, inTrack: 230, crossTrack: 90 },
  { id: 'venting', radial: 15, inTrack: 15, crossTrack: 15 },
];

/** Default event-type preset (matches the menu's initial delta-V field values). */
export const DEFAULT_BREAKUP_PRESET = 'explosion';

/** Look up a preset by id, or null (e.g. for the "custom" option). */
export function getBreakupPreset(id: string): BreakupPreset | null {
  return BREAKUP_PRESETS.find((p) => p.id === id) ?? null;
}

/** Per-axis delta-V spread (standard deviation), in metres per second, as entered in the menu. */
export interface DeltaVSpreadMps {
  /** Radial (toward/away from Earth) spread. */
  radial: number;
  /** In-track (along velocity) spread - dominates how the cloud stretches along the orbit. */
  inTrack: number;
  /** Cross-track (out of plane) spread - dominates how the cloud fans across the orbit plane. */
  crossTrack: number;
}

/** A sampled delta-V for one fragment, in km/s, expressed in RIC components. */
export interface DeltaVComponentsKms {
  r: number;
  i: number;
  c: number;
}

/** Orthonormal radial / in-track / cross-track basis vectors for a parent state. */
export interface RicBasis {
  radial: Vec3;
  inTrack: Vec3;
  crossTrack: Vec3;
}

/** Raw (string) form values read from the menu, before parsing. */
export interface BreakupRawForm {
  radialDv: string;
  inTrackDv: string;
  crossTrackDv: string;
  count: string;
  startNum: string;
}

/** Parsed, numeric breakup parameters. */
export interface BreakupVariationParams {
  /** Number of debris pieces to create. */
  breakupCount: number;
  /** Radial delta-V spread (m/s). */
  radialDeltaV: number;
  /** In-track delta-V spread (m/s). */
  inTrackDeltaV: number;
  /** Cross-track delta-V spread (m/s). */
  crossTrackDeltaV: number;
  /** First analyst catalog number assigned to the pieces. */
  startNum: number;
}

// --- Minimal vector helpers (kept local so the core has no class-construction quirks) ---

const dot_ = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross_ = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const norm_ = (a: Vec3): number => Math.sqrt(dot_(a, a));
const scale_ = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const add_ = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const unit_ = (a: Vec3): Vec3 => {
  const m = norm_(a) || 1;

  return scale_(a, 1 / m);
};

/**
 * Mulberry32 - a tiny, fast, seedable PRNG. A fixed seed makes a debris cloud
 * reproducible, which is what lets the core be unit-tested for output values
 * rather than just "did not throw".
 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a += 0x6d2b79f5;
    let t = a;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draw one sample from a standard normal distribution (mean 0, std 1) using the
 * Box-Muller transform over a uniform [0,1) source. Real fragment velocity
 * dispersions are roughly Gaussian, so this gives a more natural cloud than a
 * flat distribution.
 */
export function nextGaussian(rng: () => number): number {
  let u = 0;
  let v = 0;

  while (u === 0) {
    u = rng();
  }
  while (v === 0) {
    v = rng();
  }

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Parse the raw menu strings into numeric parameters. An invalid start number
 * falls back to the analyst block default and is flagged so the caller can warn.
 *
 * @param raw - Raw string values read from the form.
 * @param defaultStartNum - Fallback start number when the field is not a number.
 */
export function parseBreakupParams(
  raw: BreakupRawForm,
  defaultStartNum: number,
): { params: BreakupVariationParams; startNumWasInvalid: boolean } {
  const breakupCount = parseInt(raw.count);
  const radialDeltaV = parseFloat(raw.radialDv);
  const inTrackDeltaV = parseFloat(raw.inTrackDv);
  const crossTrackDeltaV = parseFloat(raw.crossTrackDv);
  let startNum = parseInt(raw.startNum);
  let startNumWasInvalid = false;

  if (isNaN(startNum)) {
    startNum = defaultStartNum;
    startNumWasInvalid = true;
  }

  // Negative spreads are meaningless (the distribution is already symmetric); floor at 0.
  const nonNeg = (n: number) => (isNaN(n) ? 0 : Math.max(0, n));

  return {
    params: {
      breakupCount: isNaN(breakupCount) ? 0 : breakupCount,
      radialDeltaV: nonNeg(radialDeltaV),
      inTrackDeltaV: nonNeg(inTrackDeltaV),
      crossTrackDeltaV: nonNeg(crossTrackDeltaV),
      startNum,
    },
    startNumWasInvalid,
  };
}

/**
 * Build the orthonormal RIC (radial / in-track / cross-track) basis for a parent
 * state. Radial points away from Earth; cross-track is the orbit normal (h);
 * in-track completes the right-handed set (≈ velocity direction for near-circular
 * orbits, exactly transverse in general).
 */
export function computeRicBasis(position: Vec3, velocity: Vec3): RicBasis {
  const radial = unit_(position);
  const crossTrack = unit_(cross_(position, velocity));
  const inTrack = cross_(crossTrack, radial);

  return { radial, inTrack, crossTrack };
}

/** Zero bias — the isotropic default (an explosion/venting has no preferred direction). */
const NO_BIAS: DeltaVComponentsKms = { r: 0, i: 0, c: 0 };

/**
 * Sample one fragment's delta-V (km/s) in RIC components. Each axis is an
 * independent Gaussian whose standard deviation is the entered spread (m/s),
 * clamped to +/-3 sigma so a rare Box-Muller outlier cannot fling a fragment
 * onto a wildly different orbit.
 *
 * An optional `biasKms` shifts the mean of every fragment along a fixed RIC
 * direction. This models a kinetic impact, where the whole cloud's centre of
 * mass gains the impactor's momentum (a hypervelocity intercept is not
 * isotropic); the sign of the radial component is what makes an ascending hit
 * add radial energy and a descending hit drop perigee toward reentry.
 * @param rng - Seeded uniform source.
 * @param spread - Per-axis 1-sigma spread (m/s).
 * @param biasKms - Optional RIC mean shift (km/s); defaults to isotropic (no bias).
 */
export function sampleDeltaV(rng: () => number, spread: DeltaVSpreadMps, biasKms: DeltaVComponentsKms = NO_BIAS): DeltaVComponentsKms {
  const axis = (sigmaMps: number) => clamp(nextGaussian(rng), -3, 3) * sigmaMps * MS_TO_KMS;

  return {
    r: biasKms.r + axis(spread.radial),
    i: biasKms.i + axis(spread.inTrack),
    c: biasKms.c + axis(spread.crossTrack),
  };
}

/**
 * Project a kinetic-impact relative velocity onto the parent's RIC axes and scale
 * it by a momentum-transfer fraction to get the mean delta-V the debris cloud
 * inherits. `relativeVelocity` is the impactor's velocity *relative to the target*
 * (km/s, same inertial frame as `basis`); the fraction stands in for the notional
 * (impactor mass / target mass) ratio.
 * @param relativeVelocity - Impactor velocity minus target velocity (km/s).
 * @param basis - The target's RIC basis.
 * @param transferFraction - Fraction of the relative velocity imparted to the cloud.
 */
export function computeImpactBias(relativeVelocity: Vec3, basis: RicBasis, transferFraction: number): DeltaVComponentsKms {
  return {
    r: dot_(relativeVelocity, basis.radial) * transferFraction,
    i: dot_(relativeVelocity, basis.inTrack) * transferFraction,
    c: dot_(relativeVelocity, basis.crossTrack) * transferFraction,
  };
}

/**
 * Apply a RIC delta-V (km/s) to a velocity, returning the new velocity vector.
 * The position is unchanged (the fragment leaves the breakup point).
 */
export function applyDeltaV(velocity: Vec3, basis: RicBasis, dv: DeltaVComponentsKms): Vec3 {
  return add_(velocity, add_(add_(scale_(basis.radial, dv.r), scale_(basis.inTrack, dv.i)), scale_(basis.crossTrack, dv.c)));
}

/**
 * Build one debris fragment's TLE pair from the parent's TEME state and a sampled
 * delta-V, stamping the analyst SCC number. The fragment is fit so SGP4
 * reproduces (parent position, parent velocity + delta-V) at the breakup epoch,
 * so every fragment leaves the breakup point. Works in any orbital regime.
 *
 * @param epoch - Breakup time (state vector epoch).
 * @param position - Parent TEME position (km) at the breakup time.
 * @param velocity - Parent TEME velocity (km/s) at the breakup time.
 * @param basis - RIC basis for the parent state.
 * @param dv - Sampled delta-V (km/s, RIC components).
 * @param a5Num - 5-char alpha-5 analyst satellite number to stamp.
 * @throws if SGP4 mean elements cannot be fit to the fragment state.
 */
export function buildFragmentTle(
  epoch: Date,
  position: Vec3,
  velocity: Vec3,
  basis: RicBasis,
  dv: DeltaVComponentsKms,
  a5Num: string,
): { tle1: TleLine1; tle2: TleLine2 } {
  const newVelocity = applyDeltaV(velocity, basis, dv);
  const fit = rv2tle(epoch, position, newVelocity, { maxIterations: 15, toleranceKm: 0.05 });

  if (!fit) {
    throw new Error('Failed to fit SGP4 mean elements to the fragment state');
  }

  // A large delta-V on a low orbit can drop a fragment's perigee below the surface
  // (it would reenter). Such a state has a mean motion the TLE format can't hold
  // (the parser rejects > 18 rev/day, ~sub-orbital). Reject it here so the caller
  // skips this fragment instead of throwing deep inside the Satellite constructor.
  const meanMotion = parseFloat(fit.tle2.substring(52, 63));

  if (!(meanMotion > 0 && meanMotion <= MAX_TLE_MEAN_MOTION)) {
    throw new Error(`Fragment is sub-orbital (mean motion ${meanMotion.toFixed(2)} rev/day) and would reenter`);
  }

  // rv2tle stamps a fixed 5-char SCC ("00001"); replace it with the analyst number.
  const tle1 = `1 ${a5Num}${fit.tle1.substring(7)}` as TleLine1;
  const tle2 = `2 ${a5Num}${fit.tle2.substring(7)}` as TleLine2;

  if (tle1.length !== TLE_LINE_LENGTH) {
    throw new Error(`Invalid tle1: length is not ${TLE_LINE_LENGTH} - "${tle1}"`);
  }
  if (tle2.length !== TLE_LINE_LENGTH) {
    throw new Error(`Invalid tle2: length is not ${TLE_LINE_LENGTH} - "${tle2}"`);
  }

  return { tle1, tle2 };
}

/**
 * Validate that the requested analyst-slot range [startNum, startNum + count)
 * lies entirely within the reserved analyst block. Writing outside it would
 * collide with real catalog satellites (below the block) or with unallocated
 * slots (above it).
 *
 * @param startNum - First analyst catalog number requested.
 * @param count - Number of consecutive slots requested.
 * @param analystStart - First number of the analyst block (CatalogManager.ANALYST_START_ID).
 * @param analystCount - Size of the analyst block (settingsManager.maxAnalystSats).
 */
export function isAnalystRangeValid(
  startNum: number,
  count: number,
  analystStart: number,
  analystCount: number,
): boolean {
  if (count <= 0) {
    return false;
  }

  return startNum >= analystStart && startNum + count <= analystStart + analystCount;
}
