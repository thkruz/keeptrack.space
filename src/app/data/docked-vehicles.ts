/**
 * Docked visiting vehicles (Dragon, Soyuz, Progress, Cygnus, Tianzhou...) fold into their host
 * station while their elset matches the host's (#463). Unlike the static station modules (#459),
 * a vehicle stays in the catalog: it keeps its row, stays searchable and selectable, and only its
 * dot is hidden while docked. When its elset diverges (it undocked and was re-fit) it shows normally.
 *
 * Detection is data driven: compare the TLE line 2 elements and the epoch against each host.
 * The comparison is pure math on parsed numbers; it could move to ootk later.
 */

import { STATION_HOST_LABELS } from './station-modules';

/** Elements parsed from a TLE pair that matter for "is this the same orbit". */
export interface ElsetSummary {
  /** Epoch as fractional days since 2000-01-01 (a continuous scale across year changes). */
  epochDays: number;
  inclination: number;
  raan: number;
  eccentricity: number;
  argPerigee: number;
  meanAnomaly: number;
  /** Mean motion, revolutions per day. */
  meanMotion: number;
}

/**
 * Match tolerances. A docked vehicle's elset is normally a copy of the host's (same epoch, same
 * six elements to the last printed digit); the slack only absorbs a re-fit a few hours apart.
 * Real neighbours differ by far more: in the 2026-03 catalog snapshot the free-flying ISS OBJECT
 * pieces differ in RAAN by 1.6 deg or more and mean motion by 0.03 rev/day or more, and HTV-X1
 * (docked, but on its own older fit) differs by 1.3 deg RAAN and 1.1 deg mean anomaly.
 */
export interface DockTolerance {
  /** Max epoch difference, days. One orbit is 0.065 d; a day keeps same-pass re-fits. */
  epochDays: number;
  /** Degrees. 0.005 deg is under 0.6 km of plane tilt at ISS radius. */
  inclination: number;
  /** Degrees. 0.01 deg is about 1 km of plane offset at ISS radius. */
  raan: number;
  /** Unitless. Printed to 7 digits; ISS ecc is ~8e-4, so 2e-5 is a 2.5% change. */
  eccentricity: number;
  /** Degrees. Poorly defined at low eccentricity, so looser than RAAN, still under 0.1 deg. */
  argPerigee: number;
  /** Degrees. 0.05 deg is about 5 km along track. */
  meanAnomaly: number;
  /** Rev/day. 5e-6 rev/day drifts under 0.1 km per day. */
  meanMotion: number;
}

export const DEFAULT_DOCK_TOLERANCE: Readonly<DockTolerance> = {
  epochDays: 1,
  inclination: 0.005,
  raan: 0.01,
  eccentricity: 2e-5,
  argPerigee: 0.1,
  meanAnomaly: 0.05,
  meanMotion: 5e-6,
};

/** Host objects a vehicle can dock to: NORAD id to its display label (ISS, Tiangong). */
export const DOCK_HOSTS: Readonly<Record<string, string>> = STATION_HOST_LABELS;

/** Days from 2000-01-01 to Jan 1 of a (2000-2056) year. */
function daysToYearStart_(year: number): number {
  let days = 0;

  for (let y = 2000; y < year; y++) {
    days += y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 366 : 365;
  }

  return days;
}

/** Parse the elements of a TLE pair, or null when either line is malformed. */
export function parseElset(tle1: string | undefined, tle2: string | undefined): ElsetSummary | null {
  if (typeof tle1 !== 'string' || typeof tle2 !== 'string' || tle1.length < 32 || tle2.length < 63) {
    return null;
  }

  const yy = Number.parseInt(tle1.substring(18, 20), 10);
  const day = Number.parseFloat(tle1.substring(20, 32));
  const inclination = Number.parseFloat(tle2.substring(8, 16));
  const raan = Number.parseFloat(tle2.substring(17, 25));
  const eccentricity = Number.parseFloat(`0.${tle2.substring(26, 33).trim()}`);
  const argPerigee = Number.parseFloat(tle2.substring(34, 42));
  const meanAnomaly = Number.parseFloat(tle2.substring(43, 51));
  const meanMotion = Number.parseFloat(tle2.substring(52, 63));
  const values = [yy, day, inclination, raan, eccentricity, argPerigee, meanAnomaly, meanMotion];

  if (values.some((v) => !Number.isFinite(v))) {
    return null;
  }

  const year = yy < 57 ? 2000 + yy : 1900 + yy;

  if (year < 2000) {
    return null;
  }

  return {
    epochDays: daysToYearStart_(year) + day - 1,
    inclination,
    raan,
    eccentricity,
    argPerigee,
    meanAnomaly,
    meanMotion,
  };
}

/** Smallest absolute difference between two angles in degrees (wraps at 360). */
function angleDiff_(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;

  return d > 180 ? 360 - d : d;
}

/** True when two elsets describe the same orbit at the same time, within the tolerance. */
export function elsetsMatch(a: ElsetSummary, b: ElsetSummary, tol: Readonly<DockTolerance> = DEFAULT_DOCK_TOLERANCE): boolean {
  return (
    Math.abs(a.epochDays - b.epochDays) <= tol.epochDays &&
    Math.abs(a.inclination - b.inclination) <= tol.inclination &&
    angleDiff_(a.raan, b.raan) <= tol.raan &&
    Math.abs(a.eccentricity - b.eccentricity) <= tol.eccentricity &&
    angleDiff_(a.argPerigee, b.argPerigee) <= tol.argPerigee &&
    angleDiff_(a.meanAnomaly, b.meanAnomaly) <= tol.meanAnomaly &&
    Math.abs(a.meanMotion - b.meanMotion) <= tol.meanMotion
  );
}

/** The minimum an object needs for docking detection. */
export interface DockCandidate {
  id: number;
  sccNum: string;
  tle1?: string;
  tle2?: string;
}

/**
 * Object id to host NORAD id for every candidate whose elset matches a host's. Hosts themselves
 * are never docked, and objects with no usable elset are skipped.
 */
export function findDockedVehicles(objects: readonly DockCandidate[], tol: Readonly<DockTolerance> = DEFAULT_DOCK_TOLERANCE): Map<number, string> {
  const hostElsets = new Map<string, ElsetSummary>();

  for (const obj of objects) {
    if (obj && typeof obj.sccNum === 'string' && Object.hasOwn(DOCK_HOSTS, obj.sccNum)) {
      const elset = parseElset(obj.tle1, obj.tle2);

      if (elset) {
        hostElsets.set(obj.sccNum, elset);
      }
    }
  }

  const docked = new Map<number, string>();

  if (hostElsets.size === 0) {
    return docked;
  }

  for (const obj of objects) {
    if (!obj || typeof obj.sccNum !== 'string' || Object.hasOwn(DOCK_HOSTS, obj.sccNum)) {
      continue;
    }
    const elset = parseElset(obj.tle1, obj.tle2);

    if (!elset) {
      continue;
    }
    for (const [host, hostElset] of hostElsets) {
      if (elsetsMatch(elset, hostElset, tol)) {
        docked.set(obj.id, host);
        break;
      }
    }
  }

  return docked;
}

let dockedVehicles_ = new Map<number, string>();

/** Replace the docked registry (called by the catalog loader on every catalog or elset reload). */
export function setDockedVehicles(docked: Map<number, string>): void {
  dockedVehicles_ = docked;
}

/** Re-evaluate docking for a catalog and store the result. */
export function refreshDockedVehicles(objects: readonly DockCandidate[]): Map<number, string> {
  setDockedVehicles(findDockedVehicles(objects));

  return dockedVehicles_;
}

/** Host NORAD id when the object (by catalog id) is a docked vehicle, otherwise undefined. */
export function getDockedHost(id: number): string | undefined {
  return dockedVehicles_.get(id);
}

/** True while the object (by catalog id) is folded into a host. */
export function isDocked(id: number): boolean {
  return dockedVehicles_.has(id);
}

/** Display label of the host a docked object is attached to ("ISS", "Tiangong"). */
export function getDockedHostLabel(id: number): string | undefined {
  const host = dockedVehicles_.get(id);

  return host ? (DOCK_HOSTS[host] ?? host) : undefined;
}

/** Catalog ids of every vehicle currently folded into a host. */
export function getDockedIds(): IterableIterator<number> {
  return dockedVehicles_.keys();
}
