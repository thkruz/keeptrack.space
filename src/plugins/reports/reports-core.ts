/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * reports-core.ts contains the pure report-generation math and formatting for the
 * Reports plugin. It has no DOM, ServiceLocator, or timeManager dependencies:
 * every piece of application state it needs (the sun's position, the sensor pass
 * windows, and the satellite sun/eclipse status) is injected through
 * {@link ReportCoreDeps}. This lets the generators be unit-tested without a
 * browser and keeps the plugin file focused on wiring and UI.
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

import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { Degrees, J2000, Kilometers, LlaVec3, MILLISECONDS_PER_SECOND, PosVel, Satellite, Tle, TleLine1 } from '@ootk/src/main';
import { doc, docEn, fillDoc } from './report-i18n';

/** A structured report table: a header row plus pre-formatted string cells. */
export interface ReportTable {
  /** Column headers. English for the generators here: CSV and JSON read these verbatim. */
  headers: string[];
  rows: string[][];
  /**
   * Text-preview overrides in the UI language (translated headers, translated enum cells).
   * CSV and JSON always use {@link headers} and {@link rows}, so exports stay English.
   */
  display?: { headers?: string[]; rows?: string[][] };
}

/** A titled table printed in the text output above the main table. */
export interface ReportSection {
  title: string;
  table: ReportTable;
}

/**
 * The output of a report generator. Built-in reports return a structured
 * {@link table}; the legacy `body`/`columns`/`isHeaders` fields are retained so
 * externally registered reports built against the old string-body contract keep
 * working.
 */
export interface ReportData {
  filename: string;
  /** Multi-line metadata block printed above the table (UI language). */
  header: string;
  /** English copy of {@link header} for the CSV `#` preamble (see {@link csvIncludeHeader}); defaults to header. */
  csvHeader?: string;
  /** Structured table (preferred). */
  table?: ReportTable;
  /** Message shown in place of rows when the table is empty (e.g. "No passes found"). */
  emptyMessage?: string;
  /**
   * When true the CSV download starts with the metadata {@link header} as `#` comment
   * rows (station, window) before the table. Off by default so pure data CSVs stay clean.
   */
  csvIncludeHeader?: boolean;
  /** Extra titled tables shown in the text output before the main table (CSV carries only the main table). */
  sections?: ReportSection[];
  /** Title printed above the main table in the text output. */
  tableTitle?: string;
  /**
   * Structured payload for the JSON output. When set, JSON downloads this value
   * instead of the header-keyed rows of {@link table} (the conjunction reports put
   * their ConjunctionAnalysisState here).
   */
  json?: unknown;
  /** @deprecated Legacy raw CSV-ish body. Prefer {@link table}. */
  body?: string;
  /** @deprecated Legacy fixed-width column count. */
  columns?: number;
  /** @deprecated Legacy "first row is a header" flag. */
  isHeaders?: boolean;
}

/** Sun-illumination state of the satellite, mapped to display strings by the core. */
export type SunIllumination = 'sun' | 'penumbral' | 'umbral' | 'unknown';

/**
 * Why a pass window edge is the report window edge rather than a real rise/set:
 * `continuous` = in view for the whole window, `start`/`end` = already in view at the
 * window start / still in view at the window end.
 */
export type ReportPassEdge = 'continuous' | 'start' | 'end';

/** A single in-view pass window over a sensor. */
export interface ReportPass {
  aos: Date;
  los: Date;
  maxEl: number;
  maxElTime: Date;
  /** Set when the window is clipped by the report interval (see {@link ReportPassEdge}). */
  edge?: ReportPassEdge;
}

/** Visibility at one instant, as the edge-pass scan needs it. */
export interface ReportVisibilitySample {
  inView: boolean;
  el: number;
}

/** A translator for report text keys: {@link doc} (UI language) or {@link docEn} (English exports). */
export type ReportText = (key: string) => string;

/** Column headers by key: English for CSV/JSON, UI language for the text preview. */
const bilingualHeaders = (keys: string[]): Pick<ReportTable, 'headers' | 'display'> => ({
  headers: keys.map((key) => docEn(`cols.${key}`)),
  display: { headers: keys.map((key) => doc(`cols.${key}`)) },
});

/**
 * Adds the pass windows a rise/set finder cannot see: an object already in view at the
 * report start, still in view at the report end, or in view the whole time (a GEO that
 * never sets). The last case returns ONE window spanning the whole report interval,
 * flagged `continuous`. Pure: visibility is sampled through `sampleAt`.
 * @param passes Rise-to-set passes found inside the window (sorted by AOS).
 * @param opts The report window.
 * @param scanStepSec Sampling step for the edge scans, in seconds.
 * @param sampleAt Visibility at an instant (in the sensor's field of regard + elevation).
 */
export const addWindowEdgePasses = (passes: ReportPass[], opts: ReportOptions, scanStepSec: number, sampleAt: (date: Date) => ReportVisibilitySample | null): ReportPass[] => {
  const startMs = opts.startTime.getTime();
  const endMs = startMs + opts.windowSec * MILLISECONDS_PER_SECOND;
  const stepMs = Math.max(1, scanStepSec) * MILLISECONDS_PER_SECOND;

  if (endMs <= startMs) {
    return passes;
  }

  /** Walks from `fromMs` toward `toMs` while in view; returns the last in-view time and the peak. */
  const scan = (fromMs: number, toMs: number): { lastInMs: number; maxEl: number; maxElMs: number; reachedEnd: boolean } => {
    const dir = toMs >= fromMs ? 1 : -1;
    let lastInMs = fromMs;
    let maxEl = Number.NEGATIVE_INFINITY;
    let maxElMs = fromMs;
    let ms = fromMs;

    for (;;) {
      const sample = sampleAt(new Date(ms));

      if (!sample?.inView) {
        return { lastInMs, maxEl, maxElMs, reachedEnd: false };
      }
      lastInMs = ms;
      if (sample.el > maxEl) {
        maxEl = sample.el;
        maxElMs = ms;
      }
      if (ms === toMs) {
        return { lastInMs, maxEl, maxElMs, reachedEnd: true };
      }
      const next = ms + dir * stepMs;

      // Clamp so the final sample lands exactly on the far edge.
      ms = dir > 0 ? Math.min(next, toMs) : Math.max(next, toMs);
    }
  };

  const result = [...passes];

  if (sampleAt(new Date(startMs))?.inView) {
    const fwd = scan(startMs, endMs);

    if (fwd.reachedEnd) {
      return [{ aos: new Date(startMs), los: new Date(endMs), maxEl: fwd.maxEl, maxElTime: new Date(fwd.maxElMs), edge: 'continuous' }];
    }

    const first = result[0];

    if (!first || first.aos.getTime() > fwd.lastInMs) {
      result.unshift({ aos: new Date(startMs), los: new Date(fwd.lastInMs), maxEl: fwd.maxEl, maxElTime: new Date(fwd.maxElMs), edge: 'start' });
    }
  }

  if (sampleAt(new Date(endMs))?.inView) {
    const back = scan(endMs, startMs);
    const last = result.at(-1);

    if (!last || last.los.getTime() < back.lastInMs) {
      result.push({ aos: new Date(back.lastInMs), los: new Date(endMs), maxEl: back.maxEl, maxElTime: new Date(back.maxElMs), edge: 'end' });
    }
  }

  return result;
};

/** Time window controls shared by the time-series reports. */
export interface ReportOptions {
  startTime: Date;
  /** Total span to cover, in seconds. */
  windowSec: number;
  /** Sampling step, in seconds. */
  stepSec: number;
}

/** Application state injected into the otherwise-pure generators. */
export interface ReportCoreDeps {
  /** In-view passes over the sensor within the report window. */
  findPasses: (sensor: DetailedSensor, opts: ReportOptions) => ReportPass[];
  /** Satellite sun-illumination + sun angle at a time (null when unavailable). */
  sunStatusAt: (date: Date) => { illumination: SunIllumination; sunAngleDeg: number } | null;
}

/** Sensible defaults; the menu lets the user override window and step. */
export const REPORT_DEFAULTS = {
  windowSec: 72 * 60 * 60,
  stepSec: 30,
} as const;

const HEADER_RULE = '-'.repeat(31);

/**
 * Minimal shape the position/time-series generators need from a report target.
 * Full TLE-backed satellites satisfy it, but so do ephemeris-driven objects
 * (OemSatellite) and ballistic missiles (MissileObject): anything that can be
 * sampled for a position over time.
 */
export interface ReportableObject {
  name: string;
  sccNum?: string;
  altId?: string;
  intlDes?: string;
  lla(date?: Date): LlaVec3<Degrees, Kilometers> | null;
  eci(date?: Date): PosVel | null;
}

/** A report target that can additionally express itself as an orbit (COES). */
export interface OrbitalReportableObject extends ReportableObject {
  toJ2000(date?: Date): J2000;
  /** TLE line 1, present for TLE-backed satellites (ephemeris-only objects have none). */
  tle1?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * MILLISECONDS_PER_SECOND;

/** The epoch encoded in a TLE's line 1, or null when the line is missing or unparseable. */
export const tleEpochFromLine1 = (tle1: string | undefined): Date | null => {
  if (!tle1 || tle1.length < 32) {
    return null;
  }

  const year = Tle.epochYearFull(tle1 as TleLine1);
  const dayOfYear = Tle.epochDay(tle1);

  if (!Number.isFinite(year) || !Number.isFinite(dayOfYear)) {
    return null;
  }

  // Day-of-year 1.0 is 00:00 UTC on 1 January.
  return new Date(Date.UTC(year, 0, 1) + (dayOfYear - 1) * MS_PER_DAY);
};

/** File-safe id for report filenames: the SCC number when present, else the name. */
const reportId = (sat: ReportableObject): string => sat.sccNum || (sat.name || 'object').replace(/[^\w.-]+/gu, '_');

/** Formats a Date as "YYYY-MM-DD HH:MM:SS" (UTC). */
export const formatReportTime = (time: Date): string => {
  const [date, rest] = time.toISOString().split('T');

  return `${date} ${rest.split('.')[0]}`;
};

/** Minimal shape the metadata header needs from a report target. */
type HeaderSat = Pick<ReportableObject, 'name' | 'sccNum' | 'altId' | 'intlDes'>;

/**
 * Builds the metadata block printed above every report. Pure: the "generated at"
 * timestamp is injected rather than read from the wall clock so the block matches
 * the simulation time the report covers.
 */
export const buildReportHeader = (title: string, sat: HeaderSat, sensor: DetailedSensor | null, generatedAt: Date, tr: ReportText = doc): string => {
  const line = (key: string, value: string | number): string => {
    const label = tr(`header.${key}`);

    return `${label}: ${value}\n`;
  };
  const none = tr('header.none');
  const satData =
    `${title}\n${HEADER_RULE}\n` +
    line('date', generatedAt.toISOString()) +
    line('satellite', sat.name) +
    line('noradId', sat.sccNum ?? none) +
    line('altId', sat.altId || none) +
    `${line('intlDes', sat.intlDes || none)}\n`;

  if (!sensor) {
    return satData;
  }

  const sensorData =
    line('sensor', sensor.name) +
    line('type', sensor.getTypeString()) +
    line('latitude', sensor.lat) +
    line('longitude', sensor.lon) +
    line('altitude', sensor.alt) +
    line('minAz', sensor.minAz) +
    line('maxAz', sensor.maxAz) +
    line('minEl', sensor.minEl) +
    line('maxEl', sensor.maxEl) +
    line('minRng', sensor.minRng) +
    `${line('maxRng', sensor.maxRng)}\n`;

  return satData + sensorData;
};

/** One header line stating the sampled interval, so two reports can be compared at a glance. */
export const buildReportWindowLine = (opts: ReportOptions, tr: ReportText = doc): string => {
  const endMs = opts.startTime.getTime() + opts.windowSec * MILLISECONDS_PER_SECOND;
  const text = fillDoc(tr('header.windowLine'), {
    start: formatReportTime(opts.startTime),
    end: formatReportTime(new Date(endMs)),
    step: Math.max(1, opts.stepSec),
  });

  return `${text}\n\n`;
};

/**
 * Azimuth/Elevation/Range report. Samples the look angle at {@link ReportOptions.stepSec}
 * inside each in-view pass window (found by the injected pass finder) rather than
 * brute-forcing the whole span, so it stays consistent with the sensor's field of
 * regard and never blocks on a multi-day on-thread scan.
 */
export const generateAerReport = (sat: Satellite, sensor: DetailedSensor, opts: ReportOptions, deps: ReportCoreDeps, generatedAt: Date): ReportData => {
  const header = buildReportHeader(doc('titles.aer'), sat, sensor, generatedAt) + buildReportWindowLine(opts);
  const rows: string[][] = [];
  const stepMs = Math.max(1, opts.stepSec) * MILLISECONDS_PER_SECOND;
  const passes = deps.findPasses(sensor, opts);

  passes.forEach((pass, idx) => {
    for (let ms = pass.aos.getTime(); ms <= pass.los.getTime(); ms += stepMs) {
      const time = new Date(ms);
      const rae = sensor.rae(sat, time);

      if (!rae) {
        continue;
      }

      rows.push([formatReportTime(time), `${idx + 1}`, rae.az.toFixed(3), rae.el.toFixed(3), rae.rng.toFixed(3)]);
    }
  });

  return {
    filename: `aer-${sat.sccNum}`,
    header,
    table: { ...bilingualHeaders(['timeUtc', 'pass', 'azimuthDeg', 'elevationDeg', 'rangeKm']), rows },
    emptyMessage: doc('empty.noPasses'),
  };
};

/** Latitude/Longitude/Altitude ground track over the report window. */
export const generateLlaReport = (sat: ReportableObject, opts: ReportOptions, generatedAt: Date): ReportData => {
  const header = buildReportHeader(doc('titles.lla'), sat, null, generatedAt) + buildReportWindowLine(opts);
  const rows: string[][] = [];
  const stepMs = Math.max(1, opts.stepSec) * MILLISECONDS_PER_SECOND;
  const endMs = opts.startTime.getTime() + opts.windowSec * MILLISECONDS_PER_SECOND;

  for (let ms = opts.startTime.getTime(); ms < endMs; ms += stepMs) {
    const time = new Date(ms);
    const lla = sat.lla(time);

    if (!lla) {
      continue;
    }

    rows.push([formatReportTime(time), lla.lat.toFixed(3), lla.lon.toFixed(3), lla.alt.toFixed(3)]);
  }

  return {
    filename: `lla-${reportId(sat)}`,
    header,
    table: { ...bilingualHeaders(['timeUtc', 'latitudeDeg', 'longitudeDeg', 'altitudeKm']), rows },
  };
};

/** Earth Centered Inertial (TEME) position and velocity over the report window. */
export const generateEciReport = (sat: ReportableObject, opts: ReportOptions, generatedAt: Date): ReportData => {
  const header = buildReportHeader(doc('titles.eci'), sat, null, generatedAt) + buildReportWindowLine(opts);
  const rows: string[][] = [];
  const stepMs = Math.max(1, opts.stepSec) * MILLISECONDS_PER_SECOND;
  const endMs = opts.startTime.getTime() + opts.windowSec * MILLISECONDS_PER_SECOND;

  for (let ms = opts.startTime.getTime(); ms < endMs; ms += stepMs) {
    const time = new Date(ms);
    const eci = sat.eci(time);

    if (!eci) {
      continue;
    }

    rows.push([
      formatReportTime(time),
      eci.position.x.toFixed(3),
      eci.position.y.toFixed(3),
      eci.position.z.toFixed(3),
      eci.velocity.x.toFixed(3),
      eci.velocity.y.toFixed(3),
      eci.velocity.z.toFixed(3),
    ]);
  }

  return {
    filename: `eci-${reportId(sat)}`,
    header,
    table: { ...bilingualHeaders(['timeUtc', 'posX', 'posY', 'posZ', 'velX', 'velY', 'velZ']), rows },
  };
};

/**
 * Classical orbital elements at the report epoch. The elements are OSCULATING:
 * they come from the propagated J2000 state vector at the simulation time the
 * report covers (`stateEpoch`), not from the TLE's mean elements, so apogee,
 * perigee and mean motion differ slightly from the catalog (TLE mean) values.
 * Both epochs are printed so the convention is explicit.
 */
export const generateCoesReport = (sat: OrbitalReportableObject, generatedAt: Date, stateEpoch: Date = generatedAt): ReportData => {
  const header = `${buildReportHeader(doc('titles.coes'), sat, null, generatedAt)}${doc('coes.note')}\n\n`;
  const el = sat.toJ2000(stateEpoch).toClassicalElements();
  const tleEpoch = tleEpochFromLine1(sat.tle1);
  // [label key, value]: the label is English in CSV/JSON and translated in the text preview.
  const entries: [string, string | null][] = [
    // null value: the element-set name is itself prose and follows the same split.
    ['elementSet', null],
    ['tleEpoch', tleEpoch ? formatReportTime(tleEpoch) : 'N/A'],
    ['stateEpoch', formatReportTime(el.epoch.toDateTime())],
    ['apogee', `${el.apogee.toFixed(3)} km`],
    ['perigee', `${el.perigee.toFixed(3)} km`],
    ['inclination', `${el.inclinationDegrees.toFixed(4)}°`],
    ['rightAscension', `${el.rightAscensionDegrees.toFixed(4)}°`],
    ['argOfPerigee', `${el.argPerigeeDegrees.toFixed(4)}°`],
    ['trueAnomaly', `${el.trueAnomalyDegrees.toFixed(4)}°`],
    // Seven places like a TLE: near-circular LEO orbits (e ~ 1e-4) would print as 0.000 at three.
    ['eccentricity', el.eccentricity.toFixed(7)],
    ['period', `${el.period.toFixed(3)} min`],
    ['semiMajorAxis', `${el.semimajorAxis.toFixed(3)} km`],
    // ClassicalElements.meanMotion is rad/s; revsPerDay is the rev/day value.
    ['meanMotion', `${el.revsPerDay.toFixed(8)} rev/day`],
  ];
  const toRows = (tr: ReportText): string[][] => entries.map(([key, value]) => [tr(`coes.${key}`), value ?? tr('coes.osculatingJ2000')]);
  const table = bilingualHeaders(['element', 'value']);

  return {
    filename: `coes-${reportId(sat)}`,
    header,
    table: { ...table, rows: toRows(docEn), display: { ...table.display, rows: toRows(doc) } },
  };
};

/** Rise/set visibility windows over a sensor for the report window. */
export const generateVisibilityWindowsReport = (sat: Satellite, sensor: DetailedSensor, opts: ReportOptions, deps: ReportCoreDeps, generatedAt: Date): ReportData => {
  const header = buildReportHeader(doc('titles.visibility'), sat, sensor, generatedAt) + buildReportWindowLine(opts);
  const csvHeader = buildReportHeader(docEn('titles.visibility'), sat, sensor, generatedAt, docEn) + buildReportWindowLine(opts, docEn);
  const passes = deps.findPasses(sensor, opts);
  // A Note column only when a window is clipped by the report interval (e.g. a GEO that never sets)
  const hasNotes = passes.some((pass) => typeof pass.edge !== 'undefined');
  const toRows = (tr: ReportText): string[][] =>
    passes.map((pass, idx) => {
      const durationMin = (pass.los.getTime() - pass.aos.getTime()) / (MILLISECONDS_PER_SECOND * 60);
      const row = [`${idx + 1}`, formatReportTime(pass.aos), formatReportTime(pass.los), durationMin.toFixed(2), pass.maxEl.toFixed(1), formatReportTime(pass.maxElTime)];

      if (hasNotes) {
        row.push(pass.edge ? tr(`passEdge.${pass.edge}`) : '');
      }

      return row;
    });
  const columns = ['passNum', 'riseTime', 'setTime', 'durationMin', 'maxElDeg', 'maxElTime'];

  if (hasNotes) {
    columns.push('note');
  }
  const table = bilingualHeaders(columns);

  return {
    filename: `visibility-windows-${sat.sccNum}`,
    header,
    csvHeader,
    table: { ...table, rows: toRows(docEn), display: { ...table.display, rows: toRows(doc) } },
    emptyMessage: doc('empty.noPassesWindow'),
    // The station block (name, lat/lon/alt, mask, window) travels with the CSV too
    csvIncludeHeader: true,
  };
};

/** Sun illumination + eclipse timing over the report window (for power/thermal work). */
export const generateSunEclipseReport = (sat: ReportableObject, opts: ReportOptions, deps: ReportCoreDeps, generatedAt: Date): ReportData => {
  const header = buildReportHeader(doc('titles.sunEclipse'), sat, null, generatedAt) + buildReportWindowLine(opts);
  const samples: { time: Date; illumination: SunIllumination; sunAngleDeg: number }[] = [];
  const stepMs = Math.max(1, opts.stepSec) * MILLISECONDS_PER_SECOND;
  const endMs = opts.startTime.getTime() + opts.windowSec * MILLISECONDS_PER_SECOND;

  for (let ms = opts.startTime.getTime(); ms < endMs; ms += stepMs) {
    const time = new Date(ms);
    const status = deps.sunStatusAt(time);

    if (!status) {
      continue;
    }

    samples.push({ time, illumination: status.illumination, sunAngleDeg: status.sunAngleDeg });
  }

  // Illumination and eclipse cells are enums: English in CSV/JSON, translated in the text preview.
  const toRows = (tr: ReportText): string[][] =>
    samples.map((sample) => [formatReportTime(sample.time), tr(`illumination.${sample.illumination}`), tr(`eclipse.${sample.illumination}`), sample.sunAngleDeg.toFixed(3)]);
  const table = bilingualHeaders(['timeUtc', 'sunIlluminated', 'eclipseType', 'sunAngleDeg']);

  return {
    filename: `sun-eclipse-${reportId(sat)}`,
    header,
    table: { ...table, rows: toRows(docEn), display: { ...table.display, rows: toRows(doc) } },
  };
};
