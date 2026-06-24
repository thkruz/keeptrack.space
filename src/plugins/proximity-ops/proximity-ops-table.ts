/**
 * Results-table column spec for the Proximity Ops plugin.
 *
 * The shared, column-configurable renderer (engine/conjunction) owns the table
 * structure and the row click hooks; this module only declares the RPO columns
 * (target/chaser identity, miss distance, the RIC breakdown, relative velocity,
 * a lazily-filled Pc cell, and the encounter date). Pure DOM building - no
 * ServiceLocator/network - so it stays unit-testable.
 */

import { ConjunctionColumn, renderConjunctionTable } from '@app/engine/conjunction/conjunction-results-table';
import { ProximityOpsEvent } from './proximity-ops-core';
import { RpoSortKey } from './proximity-ops-sort';

export interface ProximityOpsTableLabels {
  target: string;
  targetName: string;
  chaser: string;
  chaserName: string;
  relDistance: string;
  radial: string;
  intrack: string;
  crosstrack: string;
  relVelocity: string;
  pc: string;
  date: string;
}

/** Shown in the Pc cell when the probability of collision could not be computed. */
export const RPO_PC_PLACEHOLDER = '—';

/**
 * Render the approaches into `tbl`. Body rows carry `eventRowClass` (the plugin's
 * delegated click handler keys off it) plus a `data-row` index. Pc is computed
 * for every row during the search, so it is rendered inline here. Headers are
 * click-to-sort; the plugin owns the actual row reordering and supplies the
 * active `sort` state.
 */
export function renderProximityOpsTable(
  tbl: HTMLTableElement,
  events: ProximityOpsEvent[],
  eventRowClass: string,
  labels: ProximityOpsTableLabels,
  sort: { key: RpoSortKey; asc: boolean },
): void {
  const columns: ConjunctionColumn<ProximityOpsEvent>[] = [
    { header: labels.target, cell: (e) => e.sat1SccNum, sortKey: 'target' },
    { header: labels.targetName, cell: (e) => e.sat1Name ?? '', sortKey: 'targetName' },
    { header: labels.chaser, cell: (e) => e.sat2SccNum, sortKey: 'chaser' },
    { header: labels.chaserName, cell: (e) => e.sat2Name ?? '', sortKey: 'chaserName' },
    { header: labels.relDistance, cell: (e) => e.dist.toFixed(2), sortKey: 'dist' },
    { header: labels.radial, cell: (e) => e.ric.position.x.toFixed(2), sortKey: 'radial' },
    { header: labels.intrack, cell: (e) => e.ric.position.y.toFixed(2), sortKey: 'intrack' },
    { header: labels.crosstrack, cell: (e) => e.ric.position.z.toFixed(2), sortKey: 'crosstrack' },
    { header: labels.relVelocity, cell: (e) => e.vel.toFixed(3), sortKey: 'vel' },
    { header: labels.pc, cell: (e) => (typeof e.pc === 'number' ? e.pc.toExponential(2) : RPO_PC_PLACEHOLDER), sortKey: 'pc' },
    // Compact "YYYY-MM-DD HH:MM" (drop the ISO 'T' and seconds) to keep the column narrow.
    { header: labels.date, cell: (e) => e.date.toISOString().slice(0, 16).replace('T', ' '), sortKey: 'date' },
  ];

  renderConjunctionTable(tbl, events, columns, { rowClass: `${eventRowClass} link`, sort });
}
