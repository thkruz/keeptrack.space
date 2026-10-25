/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * breakup-core.ts holds the DOM-free, catalog-free physics for the Breakup
 * simulator. Fragments are modelled the way a real breakup behaves: every piece
 * leaves the parent's exact position at the breakup instant with a small random
 * velocity change (delta-V). The delta-V is sampled per axis in a selectable
 * frame (RTN, NTW or inertial) from a selectable dispersion model (per-axis
 * Gaussian, isotropic Maxwellian from a target mean speed, or a uniform box),
 * with an optional cap on the total speed. The fragment state is then fit to
 * SGP4 *mean* elements with `rv2tle` (a TLE built straight from osculating
 * elements lands kilometres off, because SGP4 expects Brouwer mean elements).
 * This works in ANY orbital regime (LEO/MEO/GEO/HEO/elliptical).
 *
 * Everything here works in the TEME frame (the SGP4 output frame KeepTrack uses),
 * so there is no J2000-vs-TEME frame mismatch. The "ECI" frame option is TEME.
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025-2026 Kruczek Labs LLC
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

import { RvVector, rv2tle, TleLine1, TleLine2 } from '@ootk/src/main';

/** Convert metres-per-second (UI units) to kilometres-per-second (ootk units). */
export const MS_TO_KMS = 0.001;

/** A spliced TLE line must be exactly this long. */
const TLE_LINE_LENGTH = 69;

/** Earth gravitational parameter (km^3/s^2) and equatorial radius (km), WGS-72 as used by SGP4/TLEs. */
const EARTH_MU = 398600.8;
const EARTH_RADIUS_KM = 6378.135;

/**
 * Fragments whose fitted mean perigee is below this altitude reenter within about
 * one revolution, so they are reported as reentered instead of created.
 */
export const MIN_PERIGEE_ALT_KM = 100;

/** rv2tle convergence target, and the residual beyond which a fit is rejected as unconverged. */
const FIT_TOLERANCE_KM = 0.05;
const MAX_FIT_ERROR_KM = 0.5;

/** Mean of a chi(3) variable: E|z| for z ~ N(0, I3) is 2*sqrt(2/pi) ~= 1.5957691216. */
export const MAXWELL_MEAN_PER_SIGMA = 2 * Math.sqrt(2 / Math.PI);

/** A simple cartesian 3-vector (km for position, km/s for velocity). */
export type Vec3 = RvVector;

/** Three per-axis values in the order of the menu's three inputs. */
export type AxisTriple = [number, number, number];

/**
 * Frame the three delta-V inputs are expressed in. Inputs keep the same physical
 * slots across frames so the presets stay meaningful: slot 1 ~ radial, slot 2 ~
 * along-track, slot 3 ~ cross-track (the ECI slots are plain X, Y, Z).
 *   - rtn: Radial, Transverse (in-track), Normal (cross-track)
 *   - ntw: in-plane Normal to velocity, Tangential (along velocity), cross-track W
 *   - eci: inertial TEME X, Y, Z
 */
export type DeltaVFrame = 'rtn' | 'ntw' | 'eci';
export const DELTA_V_FRAMES: readonly DeltaVFrame[] = ['rtn', 'ntw', 'eci'];
export const DEFAULT_DELTA_V_FRAME: DeltaVFrame = 'rtn';

/**
 * How each fragment's delta-V is drawn.
 *   - gaussian: independent N(0, sigma_i^2) per axis (inputs are 1-sigma)
 *   - maxwellian: isotropic Gaussian whose resultant speed has the entered mean
 *   - uniform: independent U(-max_i, +max_i) per axis (inputs are half-widths)
 */
export type DispersionModel = 'gaussian' | 'maxwellian' | 'uniform';
export const DISPERSION_MODELS: readonly DispersionModel[] = ['gaussian', 'maxwellian', 'uniform'];
export const DEFAULT_DISPERSION_MODEL: DispersionModel = 'gaussian';

/**
 * Event-type presets that fill the per-axis delta-V fields (one-sigma, m/s, RTN).
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

/** Orthonormal basis of a {@link DeltaVFrame}, axes in input-slot order. */
export type FrameBasis = readonly [Vec3, Vec3, Vec3];

/** Everything needed to draw one fragment's delta-V (all speeds m/s). */
export interface DeltaVDispersion {
  model: DispersionModel;
  /** Per-axis values in slot order: 1-sigma (gaussian) or half-width (uniform). Ignored by maxwellian. */
  axes: AxisTriple;
  /** Target mean resultant speed (maxwellian only). */
  meanSpeed: number;
  /** Cap on the resultant speed, applied by rejection; 0 means no cap. */
  maxTotalSpeed: number;
}

/** Raw (string) form values read from the menu, before parsing. */
export interface BreakupRawForm {
  radialDv: string;
  inTrackDv: string;
  crossTrackDv: string;
  count: string;
  startNum: string;
  /** Optional so callers with only the three axis fields (the interceptor) keep the defaults. */
  frame?: string;
  model?: string;
  meanSpeed?: string;
  maxTotalSpeed?: string;
}

/** Parsed, numeric breakup parameters. */
export interface BreakupVariationParams {
  /** Number of debris pieces to create. */
  breakupCount: number;
  /** Slot-1 delta-V value (m/s): radial in RTN, N in NTW, X in ECI. */
  radialDeltaV: number;
  /** Slot-2 delta-V value (m/s): in-track in RTN, T (along velocity) in NTW, Y in ECI. */
  inTrackDeltaV: number;
  /** Slot-3 delta-V value (m/s): cross-track in RTN, W in NTW, Z in ECI. */
  crossTrackDeltaV: number;
  /** First analyst catalog number assigned to the pieces. */
  startNum: number;
  /** Frame of the three slot values; defaults to RTN. */
  frame?: DeltaVFrame;
  /** Dispersion model; defaults to per-axis Gaussian. */
  model?: DispersionModel;
  /** Target mean resultant speed (m/s), maxwellian only. */
  meanSpeed?: number;
  /** Resultant speed cap (m/s); 0 or absent means no cap. */
  maxTotalSpeed?: number;
}

/** Thrown by {@link buildFragmentTle} when the fragment's orbit reenters (perigee too low or sub-orbital). */
export class SubOrbitalFragmentError extends Error {}

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

const parseFrame_ = (value: string | undefined): DeltaVFrame => DELTA_V_FRAMES.find((f) => f === value) ?? DEFAULT_DELTA_V_FRAME;
const parseModel_ = (value: string | undefined): DispersionModel => DISPERSION_MODELS.find((m) => m === value) ?? DEFAULT_DISPERSION_MODEL;

/**
 * Parse the raw menu strings into numeric parameters. An invalid start number
 * falls back to the analyst block default and is flagged so the caller can warn.
 *
 * @param raw - Raw string values read from the form.
 * @param defaultStartNum - Fallback start number when the field is not a number.
 */
export function parseBreakupParams(raw: BreakupRawForm, defaultStartNum: number): { params: BreakupVariationParams; startNumWasInvalid: boolean } {
  const breakupCount = parseInt(raw.count);
  let startNum = parseInt(raw.startNum);
  let startNumWasInvalid = false;

  if (isNaN(startNum)) {
    startNum = defaultStartNum;
    startNumWasInvalid = true;
  }

  // Negative spreads are meaningless (the distribution is already symmetric); floor at 0.
  // An empty or invalid cap reads as 0, which means "no cap".
  const nonNeg = (s: string | undefined) => {
    const n = parseFloat(s ?? '');

    return isNaN(n) ? 0 : Math.max(0, n);
  };

  return {
    params: {
      breakupCount: isNaN(breakupCount) ? 0 : breakupCount,
      radialDeltaV: nonNeg(raw.radialDv),
      inTrackDeltaV: nonNeg(raw.inTrackDv),
      crossTrackDeltaV: nonNeg(raw.crossTrackDv),
      startNum,
      frame: parseFrame_(raw.frame),
      model: parseModel_(raw.model),
      meanSpeed: nonNeg(raw.meanSpeed),
      maxTotalSpeed: nonNeg(raw.maxTotalSpeed),
    },
    startNumWasInvalid,
  };
}

/** Collect the sampling inputs from parsed params, filling the frame/model defaults. */
export function dispersionFromParams(params: BreakupVariationParams): DeltaVDispersion {
  return {
    model: params.model ?? DEFAULT_DISPERSION_MODEL,
    axes: [params.radialDeltaV, params.inTrackDeltaV, params.crossTrackDeltaV],
    meanSpeed: params.meanSpeed ?? 0,
    maxTotalSpeed: params.maxTotalSpeed ?? 0,
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

/**
 * Build the orthonormal basis of `frame` for a parent state, axes in input-slot order.
 *   - rtn: [R = r/|r|, T = N x R, N = (r x v)/|r x v|]; R x T = N
 *   - ntw: [N = T x W, T = v/|v|, W = (r x v)/|r x v|]; N x T = W
 *   - eci: [X, Y, Z]
 */
export function computeFrameBasis(frame: DeltaVFrame, position: Vec3, velocity: Vec3): FrameBasis {
  switch (frame) {
    case 'ntw': {
      const t = unit_(velocity);
      const w = unit_(cross_(position, velocity));

      return [cross_(t, w), t, w];
    }
    case 'eci':
      return [
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 },
      ];
    case 'rtn':
    default: {
      const ric = computeRicBasis(position, velocity);

      return [ric.radial, ric.inTrack, ric.crossTrack];
    }
  }
}

/** Rotate frame components into the inertial frame: sum of c_i * basis_i. */
export function frameToInertial(basis: FrameBasis, components: AxisTriple): Vec3 {
  return add_(add_(scale_(basis[0], components[0]), scale_(basis[1], components[1])), scale_(basis[2], components[2]));
}

/** Per-axis 1-sigma (m/s) of a Gaussian-family dispersion, or null for the uniform box. */
export function gaussianSigmas(dispersion: DeltaVDispersion): AxisTriple | null {
  switch (dispersion.model) {
    case 'gaussian':
      return [...dispersion.axes];
    case 'maxwellian': {
      const sigma = dispersion.meanSpeed / MAXWELL_MEAN_PER_SIGMA;

      return [sigma, sigma, sigma];
    }
    default:
      return null;
  }
}

const length3_ = (v: AxisTriple): number => Math.hypot(v[0], v[1], v[2]);

/** One uncapped draw (m/s, frame components). */
function drawOnce_(rng: () => number, dispersion: DeltaVDispersion): AxisTriple {
  const sigmas = gaussianSigmas(dispersion);

  if (sigmas) {
    return [sigmas[0] * nextGaussian(rng), sigmas[1] * nextGaussian(rng), sigmas[2] * nextGaussian(rng)];
  }
  const [a, b, c] = dispersion.axes;

  return [a * (2 * rng() - 1), b * (2 * rng() - 1), c * (2 * rng() - 1)];
}

/** Redraws allowed before a capped sample is pulled onto the cap sphere instead. */
const MAX_CAP_ATTEMPTS = 1000;

/**
 * Sample one fragment's delta-V (m/s) as frame components. With a cap, whole
 * vectors whose resultant exceeds it are redrawn (rejection sampling), so the
 * accepted cloud is the original distribution truncated at the cap, with no
 * per-axis clipping. If the cap rejects nearly everything (see
 * {@link DispersionStats.acceptance}), a sample still over it after
 * {@link MAX_CAP_ATTEMPTS} draws is scaled onto the cap sphere.
 */
export function sampleDispersion(rng: () => number, dispersion: DeltaVDispersion): AxisTriple {
  let sample = drawOnce_(rng, dispersion);
  const cap = dispersion.maxTotalSpeed;

  if (!(cap > 0)) {
    return sample;
  }
  for (let attempt = 1; attempt < MAX_CAP_ATTEMPTS && length3_(sample) > cap; attempt++) {
    sample = drawOnce_(rng, dispersion);
  }
  const speed = length3_(sample);

  if (speed > cap) {
    const s = cap / speed;

    sample = [sample[0] * s, sample[1] * s, sample[2] * s];
  }

  return sample;
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
 * Mean-element perigee altitude (km) from a TLE line 2: a from the mean motion,
 * then a(1 - e) minus the Earth radius.
 */
export function perigeeAltitudeFromTle2(tle2: string): number {
  const meanMotionRevPerDay = parseFloat(tle2.substring(52, 63));
  const eccentricity = parseFloat(`0.${tle2.substring(26, 33)}`);
  const n = (meanMotionRevPerDay * 2 * Math.PI) / 86400;
  const a = Math.cbrt(EARTH_MU / (n * n));

  return a * (1 - eccentricity) - EARTH_RADIUS_KM;
}

/**
 * Build one debris fragment's TLE pair from the parent's TEME state and an
 * inertial delta-V, stamping the analyst SCC number. The fragment is fit so SGP4
 * reproduces (parent position, parent velocity + delta-V) at the breakup epoch,
 * so every fragment leaves the breakup point. Works in any orbital regime.
 *
 * @param epoch - Breakup time (state vector epoch).
 * @param position - Parent TEME position (km) at the breakup time.
 * @param velocity - Parent TEME velocity (km/s) at the breakup time.
 * @param deltaVKms - Fragment delta-V in TEME (km/s).
 * @param a5Num - 5-char alpha-5 analyst satellite number to stamp.
 * @throws {SubOrbitalFragmentError} if the fragment's perigee is below {@link MIN_PERIGEE_ALT_KM}.
 * @throws {Error} if SGP4 mean elements cannot be fit to the fragment state.
 */
export function buildFragmentTle(epoch: Date, position: Vec3, velocity: Vec3, deltaVKms: Vec3, a5Num: string): { tle1: TleLine1; tle2: TleLine2 } {
  const newVelocity = add_(velocity, deltaVKms);
  // rv2tle stamps the analyst number itself, so both checksums already cover it.
  const fit = rv2tle(epoch, position, newVelocity, { maxIterations: 15, toleranceKm: FIT_TOLERANCE_KM, scc: a5Num });

  if (!fit) {
    throw new Error('Failed to fit SGP4 mean elements to the fragment state');
  }

  // A large delta-V on a low orbit can drop a fragment's perigee into the
  // atmosphere or below the surface. The breakup point itself is always at the
  // parent's altitude, so check the orbit's perigee, not the epoch position.
  const meanMotion = parseFloat(fit.tle2.substring(52, 63));
  const perigeeAltKm = perigeeAltitudeFromTle2(fit.tle2);

  if (!(meanMotion > 0) || !(perigeeAltKm >= MIN_PERIGEE_ALT_KM)) {
    throw new SubOrbitalFragmentError(`Fragment is sub-orbital (perigee ${perigeeAltKm.toFixed(0)} km) and would reenter`);
  }

  // rv2tle returns its best attempt even when it did not converge; a fragment
  // that does not start at the breakup point is wrong, so refuse it.
  if (fit.positionErrorKm > MAX_FIT_ERROR_KM) {
    throw new Error(`SGP4 fit did not converge (${fit.positionErrorKm.toFixed(2)} km residual)`);
  }

  const tle1 = fit.tle1 as TleLine1;
  const tle2 = fit.tle2 as TleLine2;

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
export function isAnalystRangeValid(startNum: number, count: number, analystStart: number, analystCount: number): boolean {
  if (count <= 0) {
    return false;
  }

  return startNum >= analystStart && startNum + count <= analystStart + analystCount;
}

/**
 * Pick `count` analyst catalog numbers for the fragments, starting at `startNum` and
 * walking up to (not including) `blockEnd`. A number the writer may not use (reserved
 * by another object, or holding an active object another tool made) is skipped and
 * the pieces shift to the next usable numbers, so a breakup never overwrites another
 * tool's object. Returns null when the block runs out first.
 *
 * @param isWritable - Whether the slot with this 6-digit analyst number may be written.
 */
export function selectAnalystSlots(startNum: number, count: number, blockEnd: number, isWritable: (num: number) => boolean): number[] | null {
  const slots: number[] = [];

  for (let num = startNum; num < blockEnd && slots.length < count; num++) {
    if (isWritable(num)) {
      slots.push(num);
    }
  }

  return slots.length === count ? slots : null;
}

// =========================================================================
// Theoretical ensemble statistics (live menu readout)
// =========================================================================

/** Theoretical properties of the resultant speed |dv| for a dispersion (m/s). */
export interface DispersionStats {
  meanSpeed: number;
  rmsSpeed: number;
  p99Speed: number;
  /** Fraction of raw draws inside the cap (1 with no cap). */
  acceptance: number;
}

const SQRT_2_OVER_PI = Math.sqrt(2 / Math.PI);

/** erf(x), Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7), ample for a display readout. */
function erf_(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));

  return sign * (1 - poly * Math.exp(-ax * ax));
}

/*
 * chi(3) helpers for t = |z|, z ~ N(0, I3) (density sqrt(2/pi) t^2 e^(-t^2/2)):
 *   cdf(T)        = erf(T/sqrt2) - sqrt(2/pi) T e^(-T^2/2)
 *   E[t;   t<=T]  = sqrt(2/pi) (2 - (T^2 + 2) e^(-T^2/2))
 *   E[t^2; t<=T]  = 3 erf(T/sqrt2) - sqrt(2/pi) (T^3 + 3T) e^(-T^2/2)
 */
const chi3Cdf_ = (t: number): number => erf_(t / Math.SQRT2) - SQRT_2_OVER_PI * t * Math.exp((-t * t) / 2);
const chi3PartialMean_ = (t: number): number => SQRT_2_OVER_PI * (2 - (t * t + 2) * Math.exp((-t * t) / 2));
const chi3PartialSecond_ = (t: number): number => 3 * erf_(t / Math.SQRT2) - SQRT_2_OVER_PI * (t * t * t + 3 * t) * Math.exp((-t * t) / 2);

const SPHERE_POINTS = 2048;
let sphereCache_: AxisTriple[] | null = null;

/** Near-uniform unit directions (Fibonacci sphere) for averaging over directions. */
function spherePoints_(): AxisTriple[] {
  if (!sphereCache_) {
    const golden = Math.PI * (3 - Math.sqrt(5));

    sphereCache_ = Array.from({ length: SPHERE_POINTS }, (_, i) => {
      const z = 1 - (2 * (i + 0.5)) / SPHERE_POINTS;
      const r = Math.sqrt(1 - z * z);

      return [r * Math.cos(golden * i), r * Math.sin(golden * i), z] as AxisTriple;
    });
  }

  return sphereCache_;
}

/** Solve f(s) = target for a non-decreasing f on [0, hi] by bisection. */
function bisect_(f: (s: number) => number, target: number, hi: number): number {
  let lo = 0;
  let top = hi;

  for (let i = 0; i < 60; i++) {
    const mid = (lo + top) / 2;

    if (f(mid) < target) {
      lo = mid;
    } else {
      top = mid;
    }
  }

  return (lo + top) / 2;
}

/**
 * Gaussian-family stats. A zero-mean Gaussian with per-axis sigma_i is x = k(u) t u
 * with u a uniform direction, t ~ chi(3) independent of u, and
 * k(u) = sqrt(sum sigma_i^2 u_i^2). So every speed statistic is a chi(3) statistic
 * averaged over directions; for equal sigmas k is constant and the result is exact
 * (mean = 2 sigma sqrt(2/pi), RMS = sqrt3 sigma).
 */
function gaussianStats_(sigmas: AxisTriple, cap: number): DispersionStats {
  const isIsotropic = sigmas[0] === sigmas[1] && sigmas[1] === sigmas[2];
  const scales = (isIsotropic ? [[1, 0, 0] as AxisTriple] : spherePoints_()).map((u) =>
    Math.sqrt(sigmas[0] ** 2 * u[0] ** 2 + sigmas[1] ** 2 * u[1] ** 2 + sigmas[2] ** 2 * u[2] ** 2)
  );
  const hasCap = cap > 0;
  const avg = (f: (k: number) => number) => scales.reduce((sum, k) => sum + f(k), 0) / scales.length;
  // P(|x| <= s); a zero scale is a point mass at 0.
  const cdf = (s: number) => avg((k) => (k === 0 ? 1 : chi3Cdf_(s / k)));

  const acceptance = hasCap ? cdf(cap) : 1;

  if (!(acceptance > 0)) {
    return { meanSpeed: cap, rmsSpeed: cap, p99Speed: cap, acceptance: 0 };
  }

  const meanSpeed = hasCap ? avg((k) => (k === 0 ? 0 : k * chi3PartialMean_(cap / k))) / acceptance : avg((k) => k * MAXWELL_MEAN_PER_SIGMA);
  const second = hasCap ? avg((k) => (k === 0 ? 0 : k * k * chi3PartialSecond_(cap / k))) / acceptance : avg((k) => 3 * k * k);
  // chi(3) upper tail beyond 10 is ~1e-21, so 10 * max sigma always brackets P99.
  const hi = hasCap ? cap : 10 * Math.max(...sigmas);

  return {
    meanSpeed,
    rmsSpeed: Math.sqrt(second),
    p99Speed: bisect_(cdf, 0.99 * acceptance, hi),
    acceptance,
  };
}

const UNIFORM_GRID = 40;

/** Uniform-box stats by midpoint quadrature over the box (no closed form for the mean or P99). */
function uniformStats_(halfWidths: AxisTriple, cap: number): DispersionStats {
  const nodes = halfWidths.map((a) => (a > 0 ? Array.from({ length: UNIFORM_GRID }, (_, i) => a * ((2 * (i + 0.5)) / UNIFORM_GRID - 1)) : [0]));
  const total = nodes[0].length * nodes[1].length * nodes[2].length;
  const accepted: number[] = [];
  const hasCap = cap > 0;

  for (const x of nodes[0]) {
    for (const y of nodes[1]) {
      for (const z of nodes[2]) {
        const s = Math.hypot(x, y, z);

        if (!hasCap || s <= cap) {
          accepted.push(s);
        }
      }
    }
  }

  if (accepted.length === 0) {
    return { meanSpeed: cap, rmsSpeed: cap, p99Speed: cap, acceptance: 0 };
  }

  const sorted = Float64Array.from(accepted).sort();
  const mean = sorted.reduce((sum, s) => sum + s, 0) / sorted.length;
  const second = sorted.reduce((sum, s) => sum + s * s, 0) / sorted.length;

  return {
    meanSpeed: mean,
    rmsSpeed: Math.sqrt(second),
    p99Speed: sorted[Math.min(sorted.length - 1, Math.floor(0.99 * sorted.length))],
    acceptance: accepted.length / total,
  };
}

/**
 * Theoretical mean, RMS and 99th-percentile resultant speed (m/s) of a
 * dispersion, including the truncation from an optional cap. The frame does not
 * enter: rotating the per-axis draw into the inertial frame preserves its length.
 */
export function computeDispersionStats(dispersion: DeltaVDispersion): DispersionStats {
  const sigmas = gaussianSigmas(dispersion);

  return sigmas ? gaussianStats_(sigmas, dispersion.maxTotalSpeed) : uniformStats_(dispersion.axes, dispersion.maxTotalSpeed);
}
