/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * breakup-analysis-table.ts holds the DOM-free HTML string builders for the
 * Breakup Analysis plugin (event list, event info card, statistics + dispersion
 * card, and the sortable fragment table). Every user-facing string is passed in
 * via a pre-localized {@link BreakupLabels} object so this module stays
 * locale-free and unit-testable.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { html } from '@app/engine/utils/development/formatter';
import { Satellite } from '@ootk/src/main';
import { EventSummary, FragmentSortKey, SortDir } from './breakup-analysis-core';
import { BreakupEvent } from './breakup-events';

/** Every user-facing string the table builders need, pre-resolved through t7e. */
export interface BreakupLabels {
  // Event list headers
  event: string;
  date: string;
  cause: string;
  altKm: string;
  estDebris: string;
  // Event info labels
  parentObject: string;
  country: string;
  orbitType: string;
  breakupAltitude: string;
  launchDate: string;
  breakupDate: string;
  timeToBreakup: string;
  years: string;
  km: string;
  // Stats
  debrisStatistics: string;
  trackedDebris: string;
  estimatedTotal: string;
  trackingRatio: string;
  typeBreakdown: string;
  fragmentDispersion: string;
  parameter: string;
  min: string;
  max: string;
  mean: string;
  spread: string;
  perigeeParam: string;
  apogeeParam: string;
  eccentricityParam: string;
  inclinationParam: string;
  noTrackedDebris: string;
  // Fragment table
  trackedFragments: string;
  /** Parameterized "(showing {shown} of {total})". */
  showingOf: string;
  norad: string;
  name: string;
  type: string;
  perigee: string;
  apogee: string;
  incDeg: string;
  ecc: string;
}

export const FRAGMENT_DEFAULT_MAX_ROWS = 100;

export const buildEventListTable = (events: BreakupEvent[], labels: BreakupLabels): string => {
  let rows = '';

  for (const evt of events) {
    rows += html`
      <tr class="breakup-analysis-event-row link" data-event-id="${evt.id}">
        <td class="ba-cell-left">${evt.name}</td>
        <td>${evt.breakupDate}</td>
        <td>${evt.cause}</td>
        <td>${evt.altitudeKm.toString()}</td>
        <td>${evt.estimatedDebrisCount.toLocaleString()}</td>
      </tr>
    `;
  }

  return html`
    <table id="breakup-analysis-event-table" class="ba-table center-align">
      <thead>
        <tr class="ba-table-header">
          <th class="ba-cell-left">${labels.event}</th>
          <th>${labels.date}</th>
          <th>${labels.cause}</th>
          <th>${labels.altKm}</th>
          <th>${labels.estDebris}</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

const infoItem = (label: string, value: string): string => html`
  <div class="breakup-info-item">
    <span class="breakup-info-label">${label}</span>
    <span class="breakup-info-value">${value}</span>
  </div>
`;

export const buildEventInfoCard = (event: BreakupEvent, yearsToBreakup: string, labels: BreakupLabels): string => html`
  <section class="kt-section breakup-info-card">
    <div class="kt-section-label">${event.name}</div>
    <p class="breakup-description">${event.description}</p>
    <div class="breakup-info-grid">
      ${infoItem(labels.parentObject, `${event.parentName} (${event.parentNoradId.toString()})`)}
      ${infoItem(labels.country, event.country)}
      ${infoItem(labels.orbitType, event.orbitType)}
      ${infoItem(labels.breakupAltitude, `${event.altitudeKm.toString()} ${labels.km}`)}
      ${infoItem(labels.cause, event.cause)}
      ${infoItem(labels.launchDate, event.launchDate)}
      ${infoItem(labels.breakupDate, event.breakupDate)}
      ${infoItem(labels.timeToBreakup, `${yearsToBreakup} ${labels.years}`)}
    </div>
  </section>
`;

export const buildStatsCard = (summary: EventSummary, labels: BreakupLabels): string => {
  const { tracked, estimated, trackingRatio, counts, altStats, eccStats, incStats } = summary;
  const typeValue = `${counts.payloads.toString()} / ${counts.rocketBodies.toString()} / ${counts.debris.toString()}`;

  const dispersion = tracked > 0
    ? html`
      <div class="kt-section-label" style="margin-top:12px;">${labels.fragmentDispersion}</div>
      <table class="breakup-dispersion-table center-align">
        <thead>
          <tr class="ba-table-header">
            <th class="ba-cell-left">${labels.parameter}</th>
            <th>${labels.min}</th>
            <th>${labels.max}</th>
            <th>${labels.mean}</th>
            <th>${labels.spread}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="ba-cell-left">${labels.perigeeParam}</td>
            <td>${altStats.minPerigee.toFixed(0)}</td>
            <td>${altStats.maxPerigee.toFixed(0)}</td>
            <td>${altStats.meanPerigee.toFixed(0)}</td>
            <td>${(altStats.maxPerigee - altStats.minPerigee).toFixed(0)}</td>
          </tr>
          <tr>
            <td class="ba-cell-left">${labels.apogeeParam}</td>
            <td>${altStats.minApogee.toFixed(0)}</td>
            <td>${altStats.maxApogee.toFixed(0)}</td>
            <td>${altStats.meanApogee.toFixed(0)}</td>
            <td>${(altStats.maxApogee - altStats.minApogee).toFixed(0)}</td>
          </tr>
          <tr>
            <td class="ba-cell-left">${labels.eccentricityParam}</td>
            <td>${eccStats.min.toFixed(4)}</td>
            <td>${eccStats.max.toFixed(4)}</td>
            <td>${eccStats.mean.toFixed(4)}</td>
            <td>${(eccStats.max - eccStats.min).toFixed(4)}</td>
          </tr>
          <tr>
            <td class="ba-cell-left">${labels.inclinationParam}</td>
            <td>${incStats.min.toFixed(2)}</td>
            <td>${incStats.max.toFixed(2)}</td>
            <td>${incStats.mean.toFixed(2)}</td>
            <td>${(incStats.max - incStats.min).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    `
    : html`<p class="ba-empty-state">${labels.noTrackedDebris}</p>`;

  return html`
    <section class="kt-section breakup-stats-card">
      <div class="kt-section-label">${labels.debrisStatistics}</div>
      <div class="breakup-info-grid">
        ${infoItem(labels.trackedDebris, tracked.toLocaleString())}
        ${infoItem(labels.estimatedTotal, estimated.toLocaleString())}
        ${infoItem(labels.trackingRatio, `${trackingRatio}%`)}
        ${infoItem(labels.typeBreakdown, typeValue)}
      </div>
      ${dispersion}
    </section>
  `;
};

interface FragmentTableOptions {
  sortKey: FragmentSortKey;
  sortDir: SortDir;
  showAll: boolean;
  maxRows: number;
}

const sortIndicator = (key: FragmentSortKey, opts: FragmentTableOptions): string => {
  if (opts.sortKey !== key) {
    return '';
  }

  return opts.sortDir === 'asc' ? ' ▲' : ' ▼';
};

const fragmentHeader = (key: FragmentSortKey, label: string, opts: FragmentTableOptions, extraClass = ''): string => html`
  <th class="ba-sortable ${extraClass}" data-sort-key="${key}">${label}${sortIndicator(key, opts)}</th>
`;

/**
 * Build the tracked-fragment table. `sats` is assumed already sorted; this
 * builder only slices to `maxRows` (unless `showAll`) and renders the header
 * sort indicators.
 */
export const buildFragmentTable = (sats: Satellite[], opts: FragmentTableOptions, labels: BreakupLabels): string => {
  const total = sats.length;
  const displayResults = opts.showAll ? sats : sats.slice(0, opts.maxRows);
  const isTruncated = total > displayResults.length;

  let rows = '';

  for (const sat of displayResults) {
    rows += html`
      <tr class="breakup-analysis-debris-row link" data-scc="${sat.sccNum}">
        <td>${sat.sccNum}</td>
        <td class="ba-cell-left">${sat.name}</td>
        <td>${sat.getTypeString()}</td>
        <td>${sat.perigee.toFixed(0)}</td>
        <td>${sat.apogee.toFixed(0)}</td>
        <td>${sat.inclination.toFixed(2)}</td>
        <td>${sat.eccentricity.toFixed(4)}</td>
      </tr>
    `;
  }

  const countNote = isTruncated
    ? ` ${labels.showingOf.replace('{shown}', displayResults.length.toString()).replace('{total}', total.toString())}`
    : '';

  return html`
    <div class="kt-section-label">${labels.trackedFragments}${countNote}</div>
    <div class="breakup-debris-table-wrapper">
      <table class="breakup-debris-table ba-table center-align">
        <thead>
          <tr class="ba-table-header">
            ${fragmentHeader('sccNum', labels.norad, opts)}
            ${fragmentHeader('name', labels.name, opts, 'ba-cell-left')}
            ${fragmentHeader('type', labels.type, opts)}
            ${fragmentHeader('perigee', labels.perigee, opts)}
            ${fragmentHeader('apogee', labels.apogee, opts)}
            ${fragmentHeader('inclination', labels.incDeg, opts)}
            ${fragmentHeader('eccentricity', labels.ecc, opts)}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};
