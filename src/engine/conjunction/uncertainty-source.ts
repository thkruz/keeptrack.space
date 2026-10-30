/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * uncertainty-source.ts answers one question for every conjunction tool: whose
 * uncertainty (TLE-derived covariance, 1-sigma RIC, GP age) does an object use?
 *
 * An analyst clone made by the Maneuver tool carries a TLE fitted at the burn
 * epoch, so its own GP age is near zero and its TLE-derived sigmas look better
 * than its parent's, as if the burn had improved our knowledge of the orbit. The
 * clone knows no more than the object it came from, so it takes the uncertainty
 * of its root catalog object (a clone of a clone resolves through the chain).
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2026 Kruczek Labs LLC
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

import { ServiceLocator } from '@app/engine/core/service-locator';
import { Satellite } from '@ootk/src/main';

/** Analyst lineage fields, read duck-typed (the Maneuver tool writes `derivedFromSccNum`; the others are aliases). */
interface AnalystLineage {
  derivedFromSccNum?: unknown;
  parentSccNum?: unknown;
  derivedFrom?: unknown;
}

/** Longest clone chain followed before giving up (guards against a lineage cycle). */
const MAX_LINEAGE_DEPTH = 32;

/** NORAD number of the object an analyst satellite was derived from (its immediate parent), or null. */
export const analystParentSccNum = (obj: unknown): string | null => {
  if (typeof obj !== 'object' || obj === null) {
    return null;
  }
  const lineage = obj as AnalystLineage;
  const own = (obj as { sccNum?: unknown }).sccNum;

  for (const value of [lineage.derivedFromSccNum, lineage.parentSccNum, lineage.derivedFrom]) {
    if (typeof value === 'string' && value.length > 0 && value !== own) {
      return value;
    }
  }

  return null;
};

/** Finds a TLE-backed satellite by NORAD number, or null. */
export type SatelliteLookup = (sccNum: string) => Satellite | null;

/** Catalog lookup used when the caller passes none (null when there is no catalog, e.g. early boot). */
export const catalogSatelliteLookup: SatelliteLookup = (sccNum) => {
  try {
    const sat = ServiceLocator.getCatalogManager().sccNum2Sat(sccNum);

    // instanceof excludes OemSatellite, which passes isSatellite() but has no TLE.
    return sat instanceof Satellite ? sat : null;
  } catch {
    return null;
  }
};

/**
 * The root catalog object whose uncertainty an analyst clone assumes, or null
 * when `sat` is not a clone or its parent is no longer in the catalog. A clone
 * of a clone follows the chain to the first object that is not a clone; when an
 * ancestor further up is missing, the deepest one found is used.
 */
export const uncertaintyParentOf = (sat: Satellite, lookup: SatelliteLookup = catalogSatelliteLookup): Satellite | null => {
  const visited = new Set<Satellite>([sat]);
  let root: Satellite | null = null;
  let current: Satellite = sat;

  for (let depth = 0; depth < MAX_LINEAGE_DEPTH; depth++) {
    const parentScc = analystParentSccNum(current);

    if (!parentScc) {
      break;
    }
    const parent = lookup(parentScc);

    if (!parent || visited.has(parent)) {
      break;
    }
    visited.add(parent);
    root = parent;
    current = parent;
  }

  return root;
};

/** The object whose TLE drives `sat`'s covariance, sigmas and GP age: its root parent for a clone, else itself. */
export const covarianceSourceOf = (sat: Satellite, lookup: SatelliteLookup = catalogSatelliteLookup): Satellite => uncertaintyParentOf(sat, lookup) ?? sat;

/** TLE lines a worker needs to build an object's covariance from someone else's TLE. */
export interface CovarianceTle {
  covarianceTle1: string;
  covarianceTle2: string;
}

/**
 * The covariance TLE fields to send to a worker for `sat`: its root parent's
 * TLE lines for a clone, or an empty object (the worker then uses the object's own TLE).
 */
export const covarianceTleFields = (sat: Satellite, lookup: SatelliteLookup = catalogSatelliteLookup): Partial<CovarianceTle> => {
  const parent = uncertaintyParentOf(sat, lookup);

  return parent ? { covarianceTle1: parent.tle1, covarianceTle2: parent.tle2 } : {};
};
