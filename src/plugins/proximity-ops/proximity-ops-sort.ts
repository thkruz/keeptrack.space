/**
 * Pure, DOM-free comparison/sort helpers for the Proximity Ops results table.
 *
 * Numeric columns (distance, the RIC components, relative velocity, Pc) compare
 * numerically, the date column by epoch, and the identity columns with a
 * numeric-aware locale compare (so sccNums order naturally and VIMPEL "JSC..."
 * ids still sort sensibly). Null/empty values always sort last. Extracted so the
 * ordering rules are unit-testable without the plugin.
 */

import { ProximityOpsEvent } from './proximity-ops-core';

/** Stable per-column sort keys (decoupled from the localized header text). */
export type RpoSortKey =
  | 'target' | 'targetName' | 'chaser' | 'chaserName'
  | 'dist' | 'radial' | 'intrack' | 'crosstrack' | 'vel' | 'pc' | 'date';

/** Default column the results table sorts by (chronological). */
export const DEFAULT_SORT_KEY: RpoSortKey = 'date';
/** Default sort direction for the default column (earliest approach first). */
export const DEFAULT_SORT_ASC = true;

/** The comparable value for a column; null when the column has no value for the row. */
function sortValue_(event: ProximityOpsEvent, key: RpoSortKey): number | string | null {
  switch (key) {
    case 'target': return event.sat1SccNum;
    case 'targetName': return event.sat1Name ?? '';
    case 'chaser': return event.sat2SccNum;
    case 'chaserName': return event.sat2Name ?? '';
    case 'dist': return event.dist;
    case 'radial': return event.ric.position.x;
    case 'intrack': return event.ric.position.y;
    case 'crosstrack': return event.ric.position.z;
    case 'vel': return event.vel;
    case 'pc': return event.pc;
    case 'date': return event.date.getTime();
    default: return null;
  }
}

/** Numeric representation of a value, or null when it is not purely numeric. */
function toNumber_(val: number | string): number | null {
  if (typeof val === 'number') {
    return val;
  }
  if ((/^-?\d+(?:\.\d+)?$/u).test(val.trim())) {
    return parseFloat(val);
  }

  return null;
}

/** Compares two non-empty values, numerically when both parse as numbers. */
function compareValues_(aVal: number | string, bVal: number | string): number {
  const aNum = toNumber_(aVal);
  const bNum = toNumber_(bVal);

  if (aNum !== null && bNum !== null) {
    return aNum - bNum;
  }

  return String(aVal).localeCompare(String(bVal), 'en', { numeric: true });
}

/**
 * Returns a new array of events ordered by `key`. Null/empty values always sort
 * last regardless of direction. The input array is not mutated.
 */
export function sortEvents(events: ProximityOpsEvent[], key: RpoSortKey, asc: boolean): ProximityOpsEvent[] {
  const dir = asc ? 1 : -1;

  return [...events].sort((a, b) => {
    const aVal = sortValue_(a, key);
    const bVal = sortValue_(b, key);
    const aEmpty = aVal === null || aVal === '';
    const bEmpty = bVal === null || bVal === '';

    if (aEmpty && bEmpty) {
      return 0;
    }
    if (aEmpty) {
      return 1;
    }
    if (bEmpty) {
      return -1;
    }

    return compareValues_(aVal, bVal) * dir;
  });
}
