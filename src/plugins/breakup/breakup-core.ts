/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * breakup-core.ts holds the DOM-free, catalog-free math for the Breakup
 * simulator: variation parsing/validation, the symmetric RAAN bucket plan, the
 * per-piece TLE construction, and a seedable PRNG. Keeping this pure makes the
 * variation math unit-testable without OrbitFinder, the catalog, or the DOM.
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

import { TleLine1, TleLine2 } from '@ootk/src/main';

/** Minutes in a day, used to convert a period variation (minutes) to mean-motion (rev/day). */
export const MINUTES_PER_DAY = 1440;

/**
 * Number of discrete RAAN buckets the debris cloud is split into. Each bucket is
 * one OrbitFinder solve (expensive), so this is kept small; the pieces inside a
 * bucket share the bucket's RAAN but get independent inc/period/ecc jitter.
 */
export const RAAN_BUCKET_COUNT = 5;

/** A TLE line-2 field is invalid if a spliced line is not exactly this long. */
const TLE_LINE_LENGTH = 69;

/** Eccentricity must stay in [0, 1); clamp just below 1 so the 7-digit field never overflows. */
const MAX_ECCENTRICITY = 0.9999999;

/** Raw (string) form values read from the menu, before parsing. */
export interface BreakupRawForm {
  periodVariation: string;
  incVariation: string;
  rascVariation: string;
  eccVariation: string;
  count: string;
  startNum: string;
}

/** Parsed, numeric breakup variation parameters. */
export interface BreakupVariationParams {
  /** Number of debris pieces to create. */
  breakupCount: number;
  /** RAAN spread in degrees (full width of the distribution). */
  rascVariation: number;
  /** Inclination spread in degrees (+/- half-width applied per piece). */
  incVariation: number;
  /** Mean-motion spread in rev/day (derived from the period variation). */
  meanmoVariation: number;
  /** Eccentricity spread (absolute, +/- half-width applied per piece). */
  eccVariation: number;
  /** First analyst catalog number assigned to the pieces. */
  startNum: number;
}

/** A single RAAN bucket: an offset (degrees) shared by `count` pieces. */
export interface RaanBucket {
  /** RAAN offset for this bucket, in degrees, relative to the parent orbit. */
  offset: number;
  /** How many pieces fall into this bucket. */
  count: number;
}

/** Inputs for building one debris piece's TLE pair. */
export interface PieceVariationInput {
  /** Alpha-5 satellite number (5 chars) to stamp into both lines. */
  a5Num: string;
  /** Parent inclination in degrees (the variation is applied around this). */
  baseInc: number;
  /** Inclination spread in degrees. */
  incVariation: number;
  /** Mean-motion spread in rev/day. */
  meanmoVariation: number;
  /** Parent eccentricity (0..1) the variation is applied around. */
  baseEcc: number;
  /** Eccentricity spread (absolute). */
  eccVariation: number;
  /** Random source returning a value in [0, 1). */
  rng: () => number;
}

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

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Parse the raw menu strings into numeric variation params. The period variation
 * (minutes) is converted to a mean-motion variation (rev/day). An invalid start
 * number falls back to the analyst block default and is flagged so the caller can
 * warn the user.
 *
 * @param raw - Raw string values read from the form.
 * @param defaultStartNum - Fallback start number when the field is not a number.
 */
export function parseBreakupParams(
  raw: BreakupRawForm,
  defaultStartNum: number,
): { params: BreakupVariationParams; startNumWasInvalid: boolean } {
  const periodVariation = parseFloat(raw.periodVariation);
  const incVariation = parseFloat(raw.incVariation);
  const rascVariation = parseFloat(raw.rascVariation);
  const eccVariation = parseFloat(raw.eccVariation);
  const breakupCount = parseInt(raw.count);
  let startNum = parseInt(raw.startNum);
  let startNumWasInvalid = false;

  if (isNaN(startNum)) {
    startNum = defaultStartNum;
    startNumWasInvalid = true;
  }

  return {
    params: {
      breakupCount: isNaN(breakupCount) ? 0 : breakupCount,
      rascVariation: isNaN(rascVariation) ? 0 : rascVariation,
      incVariation: isNaN(incVariation) ? 0 : incVariation,
      meanmoVariation: (isNaN(periodVariation) ? 0 : periodVariation) / MINUTES_PER_DAY,
      eccVariation: isNaN(eccVariation) ? 0 : eccVariation,
      startNum,
    },
    startNumWasInvalid,
  };
}

/**
 * Split `count` pieces across a small number of evenly spaced, **symmetric** RAAN
 * buckets spanning the full [-rascVariation/2, +rascVariation/2] range.
 *
 * This replaces the legacy `rascIterat = 0..4` loop that normalized by 4 (so the
 * extreme +rascVariation/2 bucket never ran) and could leave the last bucket
 * empty - the cloud was biased to one side in RAAN. Here every bucket gets pieces
 * and the offsets are mirror-symmetric about 0.
 *
 * @param count - Total number of pieces.
 * @param rascVariation - Full RAAN spread in degrees.
 * @param bucketCount - Number of discrete RAAN solves (defaults to {@link RAAN_BUCKET_COUNT}).
 */
export function planRaanBuckets(
  count: number,
  rascVariation: number,
  bucketCount: number = RAAN_BUCKET_COUNT,
): RaanBucket[] {
  if (count <= 0) {
    return [];
  }

  const buckets = Math.min(Math.max(1, bucketCount), count);
  const result: RaanBucket[] = [];

  for (let b = 0; b < buckets; b++) {
    const frac = buckets === 1 ? 0.5 : b / (buckets - 1);
    const offset = -rascVariation / 2 + rascVariation * frac;
    // Evenly distribute pieces; using floored cumulative boundaries guarantees
    // the bucket counts sum to exactly `count` with no piece lost or doubled.
    const start = Math.floor((b * count) / buckets);
    const end = Math.floor(((b + 1) * count) / buckets);

    result.push({ offset, count: end - start });
  }

  return result;
}

/**
 * Format an eccentricity (0..1) as a TLE line-2 7-digit implied-decimal field.
 * e.g. 0.0006703 -> "0006703".
 */
export function formatEccentricity(ecc: number): string {
  const clamped = clamp(ecc, 0, MAX_ECCENTRICITY);

  // toFixed(7) on a value < 1 always yields "0.xxxxxxx"; drop the "0." prefix.
  return clamped.toFixed(7).slice(2);
}

/**
 * Build one debris piece's TLE pair from a reference orbit (the RAAN-rotated TLE
 * for the piece's bucket), applying per-piece inclination, mean-motion, and
 * eccentricity jitter and stamping the analyst SCC number.
 *
 * Unlike the legacy implementation, the eccentricity jitter is actually spliced
 * into the line-2 eccentricity field (columns 27-33); previously it was computed
 * onto a shared object and never reached the output.
 *
 * @throws if either constructed line is not 69 characters (a splice/format bug).
 */
export function buildPieceTle(
  refTle1: string,
  refTle2: string,
  input: PieceVariationInput,
): { tle1: TleLine1; tle2: TleLine2 } {
  const { a5Num, baseInc, incVariation, meanmoVariation, baseEcc, eccVariation, rng } = input;

  // Inclination (cols 9-16): jitter around the parent inclination, kept in [0, 180].
  const inc = clamp(baseInc + rng() * incVariation * 2 - incVariation, 0, 180);
  const incStr = inc.toFixed(4).padStart(8, '0');

  if (incStr.length !== 8) {
    throw new Error(`Inclination field is not 8 chars - "${incStr}"`);
  }

  // Mean motion (cols 53-63): jitter around the reference orbit's mean motion.
  const meanmo = parseFloat(refTle2.substring(52, 63)) + rng() * meanmoVariation * 2 - meanmoVariation;
  const meanmoStr = meanmo.toFixed(8).padStart(11, '0');

  if (meanmoStr.length !== 11) {
    throw new Error(`Mean motion field is not 11 chars - "${meanmoStr}"`);
  }

  // Eccentricity (cols 27-33): jitter around the parent eccentricity.
  const eccStr = formatEccentricity(baseEcc + rng() * eccVariation * 2 - eccVariation);

  const tle1 = `1 ${a5Num}${refTle1.substring(7)}` as TleLine1;
  // Rebuild line 2 with the new SCC, inclination, and mean motion (preserving the
  // reference RAAN/argPe/meanAnomaly), then splice the eccentricity field in place.
  let tle2 = `2 ${a5Num} ${incStr} ${refTle2.substring(17, 52)}${meanmoStr}${refTle2.substring(63)}`;

  tle2 = `${tle2.substring(0, 26)}${eccStr}${tle2.substring(33)}`;

  if (tle1.length !== TLE_LINE_LENGTH) {
    throw new Error(`Invalid tle1: length is not ${TLE_LINE_LENGTH} - "${tle1}"`);
  }
  if (tle2.length !== TLE_LINE_LENGTH) {
    throw new Error(`Invalid tle2: length is not ${TLE_LINE_LENGTH} - "${tle2}"`);
  }

  return { tle1, tle2: tle2 as TleLine2 };
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
