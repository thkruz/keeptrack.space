/**
 * Pure Rendezvous and Proximity Operations (RPO) search core.
 *
 * This module is intentionally free of DOM, ServiceLocator, and KeepTrack
 * runtime dependencies so it can run unchanged on the main thread (as a
 * synchronous fallback and in unit tests) and inside the proximity-ops web
 * worker. All astrodynamics is delegated to ootk (SGP4 via Satellite.toJ2000,
 * the RIC relative frame) and the shared conjunction TCA finder
 * (engine/conjunction), which the whole conjunction family already uses.
 *
 * The previous in-plugin implementation hand-rolled a three-pass coarse/fine
 * scan that only recomputed the RIC + relative velocity inside the innermost
 * loop. When that loop failed to strictly beat the second pass's minimum the
 * event was returned with `vel = Infinity` and a zero RIC, which then failed
 * the velocity gate and silently dropped a real close approach. Standardizing
 * on `findTca` (coarse scan + golden-section refinement) removes that class of
 * bug: the geometry is always recomputed at the refined time of closest
 * approach.
 */

import { findTca } from '@app/engine/conjunction/conjunction-tca';
import {
  cappedScreeningCovarianceFromTle, CatalogSource, ConjunctionAssessment, EpochUTC, Kilometers, RIC, Satellite,
  Seconds, Tle, TleLine1, TleLine2,
} from '@ootk/src/main';

/** Covariance confidence level accepted by ootk's TLE-derived covariance helper. */
export type CovarianceConfidence = Parameters<typeof cappedScreeningCovarianceFromTle>[2];

/** Orbit regime the all-vs-all survey iterates over. */
export enum RPOType {
  GEO = 'GEO',
  LEO = 'LEO',
}

/**
 * Which search the worker (or synchronous fallback) should run:
 * - `ava-geo` / `ava-leo`: bin the whole candidate set and screen every pair.
 * - `single`: the candidate list is already a primary (first) + its neighborhood,
 *   so screen the primary against the rest directly.
 */
export type RpoSearchMode = 'ava-geo' | 'ava-leo' | 'single';

/** A single predicted close approach with geometry recomputed at the refined TCA. */
export interface ProximityOpsEvent {
  sat1Id: number;
  sat1SccNum: string;
  sat1Name?: string;
  sat2Id: number;
  sat2SccNum: string;
  sat2Name?: string;
  /**
   * Secondary (chaser) relative to the primary's RIC frame, as plain numbers so
   * the event is structured-clone-safe across the worker boundary. `position`
   * is radial/in-track/cross-track (km); `velocity` is the matching rates (km/s).
   */
  ric: {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
  };
  /** Miss distance (range) at closest approach in kilometers. */
  dist: number;
  /** Inertial relative speed magnitude (km/s) at closest approach. */
  vel: number;
  /** Time of closest approach. */
  date: Date;
  /**
   * Probability of collision at the approach (ootk ConjunctionAssessment), or
   * null when it could not be computed. Filled for reported events only.
   */
  pc: number | null;
}

/**
 * Serializable satellite input for the worker boundary: the catalog id (so the
 * main thread can re-select the object), canonical sccNum/name, the TLE lines
 * (everything orbital is rederived from these), plus the source/altId needed to
 * label VIMPEL objects in the results.
 */
export interface ProxSatData {
  id: number;
  sccNum: string;
  name: string;
  tle1: string;
  tle2: string;
  source: CatalogSource;
  altId: string;
}

/** Parameters shared by every search mode (plain numbers, clone-safe). */
export interface RpoSearchParams {
  /** Max miss distance (km) for an approach to be reported. */
  maxDis: number;
  /** Max inertial relative speed (km/s) for an approach to be reported. */
  maxVel: number;
  /** Forward search window in seconds. */
  durationSec: number;
  /** Search base epoch in ms; all propagation is relative to this. */
  baseTimeMs: number;
  /** Coarse TCA scan step in seconds. */
  stepSeconds: number;
  /** Golden-section TCA refinement tolerance in ms. */
  refineToleranceMs: number;
  /**
   * Covariance confidence level for the per-result Pc estimate. When omitted, Pc
   * is not computed (the column shows "-"); the unit tests omit it.
   */
  confidenceLevel?: CovarianceConfidence;
}

/** Default coarse scan step for the per-pair TCA search. */
export const DEFAULT_STEP_SECONDS = 60;
/** Default golden-section refinement tolerance (ms) for the TCA. */
export const DEFAULT_REFINE_TOLERANCE_MS = 500;
/** GEO all-vs-all longitude-bin width (deg). */
const GEO_LON_STEP_DEG = 1.5;
/** LEO all-vs-all inclination/RAAN bin width (deg). */
const LEO_PLANE_STEP_DEG = 5;

/** Inertial separation (km) between two satellites at `time`; Infinity on a failed propagation. */
function separationRange_(sat1: Satellite, sat2: Satellite, time: Date): number {
  try {
    return RIC.fromJ2000(sat2.toJ2000(time), sat1.toJ2000(time)).range;
  } catch {
    return Infinity;
  }
}

/** Display SCC: VIMPEL objects carry a zeroed sccNum, so fall back to their JSC alt id. */
function displaySccNum_(sat: Satellite): string {
  return sat.source === CatalogSource.VIMPEL ? `JSC${sat.altId}` : sat.sccNum;
}

/**
 * Find the single closest approach between two satellites over the forward
 * window and snapshot the RIC geometry there.
 *
 * `findTca` coarse-scans at `stepSeconds` then golden-section refines, so the
 * returned event always carries a finite distance/velocity computed at the
 * refined TCA (the old three-pass scan could leave them at their Infinity/zero
 * defaults). When every sample fails to propagate the event is returned with
 * the Infinity/zero defaults, which the distance/velocity gate then rejects.
 */
export function findClosestApproach(
  sat1: Satellite,
  sat2: Satellite,
  start: Date,
  durationSec: number,
  stepSeconds: number = DEFAULT_STEP_SECONDS,
  tolMs: number = DEFAULT_REFINE_TOLERANCE_MS,
): ProximityOpsEvent {
  const baseMs = start.getTime();
  const tca = findTca((tMs) => separationRange_(sat1, sat2, new Date(baseMs + tMs)), 0, durationSec * 1000, stepSeconds * 1000, tolMs);
  const tocaMs = tca ? tca.tcaMs : 0;
  const date = new Date(baseMs + tocaMs);

  let ric = { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } };
  let dist = tca ? tca.missKm : Infinity;
  let vel = Infinity;

  try {
    const relative = RIC.fromJ2000(sat2.toJ2000(date), sat1.toJ2000(date));

    ric = {
      position: { x: relative.position.x, y: relative.position.y, z: relative.position.z },
      velocity: { x: relative.velocity.x, y: relative.velocity.y, z: relative.velocity.z },
    };
    dist = relative.range;
    vel = Math.sqrt(relative.velocity.x ** 2 + relative.velocity.y ** 2 + relative.velocity.z ** 2);
  } catch {
    // Keep the Infinity/zero defaults; the caller's gate will drop this pair.
  }

  return {
    sat1Id: sat1.id,
    sat2Id: sat2.id,
    sat1SccNum: displaySccNum_(sat1),
    sat2SccNum: displaySccNum_(sat2),
    sat1Name: sat1.name,
    sat2Name: sat2.name,
    ric,
    dist,
    vel,
    date,
    // Filled by findRpoPairs for events that pass the distance/velocity gate.
    pc: null,
  };
}

/** Half-width (ms) of the assessment window bracketing the approach for the Pc estimate. */
const PC_WINDOW_MS = 5 * 60 * 1000;

/**
 * Probability of collision for a single approach via ootk's ConjunctionAssessment.
 * Covariance is derived from each TLE (the same capped model the debris-screening
 * worker uses), assessed over a tight window bracketing the encounter. Pure ootk
 * math, so it runs in the worker; returns null on any failure or missing TLE.
 */
export function computeEventPc(sat1: Satellite, sat2: Satellite, eventDate: Date, confidenceLevel?: CovarianceConfidence): number | null {
  if (!confidenceLevel || !sat1.tle1 || !sat1.tle2 || !sat2.tle1 || !sat2.tle2) {
    return null;
  }

  try {
    const assessment = new ConjunctionAssessment(
      {
        tle: new Tle(sat1.tle1, sat1.tle2),
        name: sat1.sccNum,
        radius: 0.01 as Kilometers,
        covariance: cappedScreeningCovarianceFromTle(sat1.tle1, sat1.tle2, confidenceLevel),
      },
      {
        tle: new Tle(sat2.tle1, sat2.tle2),
        name: sat2.sccNum,
        radius: 0.01 as Kilometers,
        covariance: cappedScreeningCovarianceFromTle(sat2.tle1, sat2.tle2, confidenceLevel),
      },
    );

    const result = assessment.assess({
      startTime: EpochUTC.fromDateTime(new Date(eventDate.getTime() - PC_WINDOW_MS)),
      endTime: EpochUTC.fromDateTime(new Date(eventDate.getTime() + PC_WINDOW_MS)),
      searchStepSize: 30 as Seconds,
    });

    return result?.probabilityOfCollision ?? null;
  } catch {
    return null;
  }
}

/**
 * Screen a list of satellites for close approaches within the distance/velocity
 * thresholds.
 *
 * With `isAva` the list is screened pairwise (every unordered pair once), gated
 * by an apogee/perigee gap and an inclination match before the expensive TCA
 * search, and de-duplicated across bins via the shared `satPairs` accumulator.
 * Otherwise the first satellite is the primary and is screened against the rest.
 */
export function findRpoPairs(
  sats: Satellite[],
  params: RpoSearchParams,
  baseDate: Date,
  isAva: boolean,
  satPairs?: number[][],
  onProgress?: RpoProgressFn,
): ProximityOpsEvent[] {
  const { maxDis, maxVel, durationSec, stepSeconds, refineToleranceMs, confidenceLevel } = params;
  const RPOs: ProximityOpsEvent[] = [];
  const search = (a: Satellite, b: Satellite) => findClosestApproach(a, b, baseDate, durationSec, stepSeconds, refineToleranceMs);
  // Pc is filled only for events that pass the gate (a bounded set), and only
  // when a confidence level is supplied - so it is off the per-pair hot path.
  const keep = (res: ProximityOpsEvent, primarySat: Satellite, secondarySat: Satellite) => {
    if (res.dist <= maxDis && res.vel <= maxVel) {
      res.pc = computeEventPc(primarySat, secondarySat, res.date, confidenceLevel);
      RPOs.push(res);
    }
  };

  if (isAva && satPairs) {
    sats.forEach((primarySat, i) => {
      sats.slice(i + 1).forEach((secondarySat) => {
        const pairExists = satPairs.some((pair) =>
          (pair[0] === primarySat.id && pair[1] === secondarySat.id) ||
          (pair[0] === secondarySat.id && pair[1] === primarySat.id),
        );

        if (pairExists) {
          return;
        }

        // Record the pair as processed to avoid duplicate work across bins.
        satPairs.push([primarySat.id, secondarySat.id]);

        // Cheap orbital pre-filters before the expensive per-pair TCA search.
        if ((secondarySat.perigee - primarySat.apogee) > maxDis || (primarySat.perigee - secondarySat.apogee) > maxDis) {
          return;
        }
        if (!(Math.abs(primarySat.inclination - secondarySat.inclination) < 1)) {
          return;
        }

        keep(search(primarySat, secondarySat), primarySat, secondarySat);
      });
    });
  } else {
    const primarySat = sats[0];
    const secondaries = sats.slice(1);

    secondaries.forEach((secondarySat, idx) => {
      keep(search(primarySat, secondarySat), primarySat, secondarySat);
      onProgress?.(idx + 1, secondaries.length);
    });
  }

  return RPOs;
}

/**
 * Geostationary satellites within ~1 deg of `lon` at the search epoch.
 *
 * The longitude is evaluated at `baseDate` explicitly (rather than relying on
 * the catalog's ambient propagation state) so the binning is deterministic on
 * the main thread and reproducible inside the worker.
 */
export function findSatsAvAGeo(allSats: Satellite[], lon: number, baseDate: Date): Satellite[] {
  return allSats.filter((sat) => {
    const lla = sat.lla(baseDate);

    if (!lla) {
      return false;
    }

    return Boolean(sat.tle1) &&
      sat.period > 23 * 60 &&
      (180 - Math.abs(Math.abs(lon - lla.lon) - 180)) < 1;
  });
}

/** Low Earth orbit satellites within ~5 deg of the target inclination and RAAN. */
export function findSatsAvALeo(allSats: Satellite[], inc: number, raan: number): Satellite[] {
  return allSats.filter((sat) =>
    Boolean(sat.tle1) &&
    sat.period < 3 * 60 &&
    (180 - Math.abs(Math.abs(inc - sat.inclination) - 180)) < 5 &&
    (360 - Math.abs(Math.abs(raan - sat.rightAscension) - 360)) < 5,
  );
}

/** Progress callback: `done` of `total` bins processed. */
export type RpoProgressFn = (done: number, total: number) => void;

/**
 * Survey every geostationary satellite against every other by walking the belt
 * in {@link GEO_LON_STEP_DEG} longitude bins. A shared `satPairs` accumulator
 * keeps a pair from being screened twice when it falls in adjacent bins.
 */
export function runAllVsAllGeo(allSats: Satellite[], params: RpoSearchParams, onProgress?: RpoProgressFn): ProximityOpsEvent[] {
  const baseDate = new Date(params.baseTimeMs);
  const satPairs: number[][] = [];
  const lons: number[] = [];

  for (let lon = -180; lon <= 180; lon += GEO_LON_STEP_DEG) {
    lons.push(lon);
  }

  let RPOs: ProximityOpsEvent[] = [];

  lons.forEach((lon, idx) => {
    const sats = findSatsAvAGeo(allSats, lon, baseDate);

    RPOs = RPOs.concat(findRpoPairs(sats, params, baseDate, true, satPairs));
    onProgress?.(idx + 1, lons.length);
  });

  return RPOs;
}

/**
 * Survey every LEO satellite against every other by walking inclination/RAAN
 * bins of {@link LEO_PLANE_STEP_DEG}. Progress is reported per inclination row.
 */
export function runAllVsAllLeo(allSats: Satellite[], params: RpoSearchParams, onProgress?: RpoProgressFn): ProximityOpsEvent[] {
  const baseDate = new Date(params.baseTimeMs);
  const satPairs: number[][] = [];
  const incs: number[] = [];

  for (let inc = 0; inc <= 180; inc += LEO_PLANE_STEP_DEG) {
    incs.push(inc);
  }

  let RPOs: ProximityOpsEvent[] = [];

  incs.forEach((inc, idx) => {
    for (let raan = 0; raan <= 360; raan += LEO_PLANE_STEP_DEG) {
      const sats = findSatsAvALeo(allSats, inc, raan);

      if (sats.length === 0) {
        continue;
      }

      RPOs = RPOs.concat(findRpoPairs(sats, params, baseDate, true, satPairs));
    }
    onProgress?.(idx + 1, incs.length);
  });

  return RPOs;
}

/** Reconstruct an ootk Satellite from the serializable worker input. */
export function dataToSat(data: ProxSatData): Satellite {
  return new Satellite({
    id: data.id,
    sccNum: data.sccNum,
    tle1: data.tle1 as TleLine1,
    tle2: data.tle2 as TleLine2,
    name: data.name,
    source: data.source,
    altId: data.altId,
  });
}

/** Serialize a catalog Satellite for transport to the worker. */
export function satToData(sat: Satellite): ProxSatData {
  return {
    id: sat.id,
    sccNum: sat.sccNum,
    name: sat.name,
    tle1: sat.tle1,
    tle2: sat.tle2,
    source: sat.source as CatalogSource,
    altId: sat.altId,
  };
}

/** Sort events closest-first (ascending miss distance). Returns a new array. */
export function sortByDistance(events: ProximityOpsEvent[]): ProximityOpsEvent[] {
  return [...events].sort((a, b) => a.dist - b.dist);
}

/** CSV column headers for an exported RPO list (matches {@link buildRpoCsvRow}). */
export const RPO_CSV_HEADERS = [
  't_id', 't_sccnum', 't_name', 'c_id', 'c_sccnum', 'c_name', 'date',
  'dr(km)', 'dt(km)', 'dn(km)',
  'dvr(km/s)', 'dvt(km/s)', 'dvn(km/s)',
  'rel_dist(km)', 'rel_vel(km/s)',
] as const;

/** One ordered CSV value row for an event (aligns with {@link RPO_CSV_HEADERS}). */
export function buildRpoCsvRow(rpo: ProximityOpsEvent): (string | number)[] {
  return [
    rpo.sat1Id,
    rpo.sat1SccNum,
    rpo.sat1Name ?? '',
    rpo.sat2Id,
    rpo.sat2SccNum,
    rpo.sat2Name ?? '',
    rpo.date.toISOString(),
    rpo.ric.position.x,
    rpo.ric.position.y,
    rpo.ric.position.z,
    rpo.ric.velocity.x,
    rpo.ric.velocity.y,
    rpo.ric.velocity.z,
    rpo.dist,
    rpo.vel,
  ];
}
