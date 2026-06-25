/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * catalog-management-export.ts holds the pure, DOM-free helpers shared by the
 * catalog-management export flows: the base STK ephemeris export and the Pro
 * CCSDS ODM (OPM/OEM/OMM) exports. Keeping these here makes the orchestration
 * in the plugin classes thin and lets the logic be unit-tested without a DOM.
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

import { Satellite } from '@ootk/src/main';
import { saveAs } from 'file-saver';

/** Default ephemeris span (hours) used when the input is blank or invalid. */
export const DEFAULT_EPHEM_SPAN_HOURS = 24;
/** Default ephemeris step (seconds) used when the input is blank or invalid. */
export const DEFAULT_EPHEM_STEP_SEC = 60;
/**
 * Hard cap on generated ephemeris points. Above this an export would build a
 * huge string on the main thread and freeze the UI, so callers bail instead.
 */
export const MAX_EPHEM_POINTS = 100_000;

/** Validated span/step plus the derived sample count. */
export interface EphemerisParams {
  spanHours: number;
  stepSec: number;
  numPoints: number;
}

/** Discriminated result of {@link parseEphemerisParams}. */
export type EphemerisParseResult =
  | { ok: true; params: EphemerisParams }
  | { ok: false; reason: 'tooManyPoints'; numPoints: number };

/**
 * Parse and validate raw span/step strings from the ephemeris form.
 *
 * Blank, non-numeric, zero, or negative inputs fall back to the defaults so a
 * bad field never produces an empty or reversed time span. Returns
 * `{ ok: false }` only when the resulting sample count would exceed
 * {@link MAX_EPHEM_POINTS} (which would otherwise hang the UI).
 */
export function parseEphemerisParams(
  rawSpanHours: string | null | undefined,
  rawStepSec: string | null | undefined,
): EphemerisParseResult {
  let spanHours = parseFloat(rawSpanHours ?? '');
  let stepSec = parseFloat(rawStepSec ?? '');

  // `!(x > 0)` rejects NaN, 0, and negatives in one check.
  if (!(spanHours > 0)) {
    spanHours = DEFAULT_EPHEM_SPAN_HOURS;
  }
  if (!(stepSec > 0)) {
    stepSec = DEFAULT_EPHEM_STEP_SEC;
  }

  const numPoints = Math.floor((spanHours * 3600) / stepSec) + 1;

  if (numPoints > MAX_EPHEM_POINTS) {
    return { ok: false, reason: 'tooManyPoints', numPoints };
  }

  return { ok: true, params: { spanHours, stepSec, numPoints } };
}

/**
 * Build an export filename from a satellite's canonical id and an extension.
 * Prefers the 5-digit SCC number, falling back to the raw sccNum.
 */
export function exportFileName(satellite: Satellite, ext: string): string {
  return `${satellite.sccNum5 ?? satellite.sccNum}.${ext}`;
}

/** Save a text payload as a UTF-8 file download. */
export function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

  saveAs(blob, filename);
}

// ============================================================================
// STK .e ephemeris writer
//
// The pure serializer for STK .e files. It lives in OSS so the base
// catalog-management export can use it, while the Pro STK file handler imports
// it too (OSS cannot depend on Pro). Read+write therefore meet here.
// ============================================================================

/** One ephemeris sample for the STK writer: offset from the scenario epoch + state. */
export interface StkEphemerisRow {
  /** Seconds from the ScenarioEpoch. */
  offsetSec: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
}

/** Header fields for {@link formatStkEphemeris}; all but the epoch have STK-typical defaults. */
export interface StkEphemerisExportOptions {
  scenarioEpoch: Date;
  /** STK CoordinateSystem keyword. @default 'TEME' */
  coordinateSystem?: string;
  /** STK CentralBody keyword. @default 'Earth' */
  centralBody?: string;
  /** STK InterpolationMethod keyword. @default 'Lagrange' */
  interpolationMethod?: string;
  /** STK InterpolationOrder keyword. @default 7 */
  interpolationOrder?: number;
}

/** Format a Date as an STK epoch string: "DD Mon YYYY HH:MM:SS.sss" (UTC). */
export function formatStkEpoch(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getUTCDate().toString().padStart(2, '0');
  const mon = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hrs = date.getUTCHours().toString().padStart(2, '0');
  const min = date.getUTCMinutes().toString().padStart(2, '0');
  const sec = date.getUTCSeconds().toString().padStart(2, '0');
  const ms = date.getUTCMilliseconds().toString().padStart(3, '0');

  return `${day} ${mon} ${year} ${hrs}:${min}:${sec}.${ms}`;
}

/** Build the full text of an STK .e (EphemerisTimePosVel, EpSec) file. */
export function formatStkEphemeris(rows: StkEphemerisRow[], opts: StkEphemerisExportOptions): string {
  const dataLines = rows.map((r) =>
    `${r.offsetSec.toFixed(6)}  ${r.position.x.toFixed(6)}  ${r.position.y.toFixed(6)}  ${r.position.z.toFixed(6)}  ` +
    `${r.velocity.x.toFixed(6)}  ${r.velocity.y.toFixed(6)}  ${r.velocity.z.toFixed(6)}`,
  );

  return [
    'stk.v.11.0',
    'BEGIN Ephemeris',
    `NumberOfEphemerisPoints ${rows.length}`,
    `ScenarioEpoch ${formatStkEpoch(opts.scenarioEpoch)}`,
    `InterpolationMethod ${opts.interpolationMethod ?? 'Lagrange'}`,
    `InterpolationOrder ${opts.interpolationOrder ?? 7}`,
    `CentralBody ${opts.centralBody ?? 'Earth'}`,
    `CoordinateSystem ${opts.coordinateSystem ?? 'TEME'}`,
    'DistanceUnit Kilometers',
    'EphemerisTimePosVel',
    '',
    ...dataLines,
    '',
    'END Ephemeris',
  ].join('\n');
}
