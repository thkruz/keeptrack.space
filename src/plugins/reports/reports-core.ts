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

/** A structured report table: a header row plus pre-formatted string cells. */
export interface ReportTable {
  headers: string[];
  rows: string[][];
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
  /** Multi-line metadata block printed above the table. */
  header: string;
  /** Structured table (preferred). */
  table?: ReportTable;
  /** Message shown in place of rows when the table is empty (e.g. "No passes found"). */
  emptyMessage?: string;
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

/** A single in-view pass window over a sensor. */
export interface ReportPass {
  aos: Date;
  los: Date;
  maxEl: number;
  maxElTime: Date;
}

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
export const buildReportHeader = (title: string, sat: HeaderSat, sensor: DetailedSensor | null, generatedAt: Date): string => {
  const satData =
    `${title}\n${HEADER_RULE}\n` +
    `Date: ${generatedAt.toISOString()}\n` +
    `Satellite: ${sat.name}\n` +
    `NORAD ID: ${sat.sccNum ?? 'None'}\n` +
    `Alternate ID: ${sat.altId || 'None'}\n` +
    `International Designator: ${sat.intlDes ?? 'None'}\n\n`;

  if (!sensor) {
    return satData;
  }

  const sensorData =
    `Sensor: ${sensor.name}\n` +
    `Type: ${sensor.getTypeString()}\n` +
    `Latitude: ${sensor.lat}\n` +
    `Longitude: ${sensor.lon}\n` +
    `Altitude: ${sensor.alt}\n` +
    `Min Azimuth: ${sensor.minAz}\n` +
    `Max Azimuth: ${sensor.maxAz}\n` +
    `Min Elevation: ${sensor.minEl}\n` +
    `Max Elevation: ${sensor.maxEl}\n` +
    `Min Range: ${sensor.minRng}\n` +
    `Max Range: ${sensor.maxRng}\n\n`;

  return satData + sensorData;
};

/**
 * Azimuth/Elevation/Range report. Samples the look angle at {@link ReportOptions.stepSec}
 * inside each in-view pass window (found by the injected pass finder) rather than
 * brute-forcing the whole span, so it stays consistent with the sensor's field of
 * regard and never blocks on a multi-day on-thread scan.
 */
export const generateAerReport = (sat: Satellite, sensor: DetailedSensor, opts: ReportOptions, deps: ReportCoreDeps, generatedAt: Date): ReportData => {
  const header = buildReportHeader('Azimuth Elevation Range Report', sat, sensor, generatedAt);
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
    table: { headers: ['Time (UTC)', 'Pass', 'Azimuth(°)', 'Elevation(°)', 'Range(km)'], rows },
    emptyMessage: 'No passes found!',
  };
};

/** Latitude/Longitude/Altitude ground track over the report window. */
export const generateLlaReport = (sat: ReportableObject, opts: ReportOptions, generatedAt: Date): ReportData => {
  const header = buildReportHeader('Latitude Longitude Altitude Report', sat, null, generatedAt);
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
    table: { headers: ['Time (UTC)', 'Latitude(°)', 'Longitude(°)', 'Altitude(km)'], rows },
  };
};

/** Earth Centered Inertial (TEME) position and velocity over the report window. */
export const generateEciReport = (sat: ReportableObject, opts: ReportOptions, generatedAt: Date): ReportData => {
  const header = buildReportHeader('Earth Centered Inertial (TEME) Report', sat, null, generatedAt);
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
    table: {
      headers: ['Time (UTC)', 'Position X(km)', 'Position Y(km)', 'Position Z(km)', 'Velocity X(km/s)', 'Velocity Y(km/s)', 'Velocity Z(km/s)'],
      rows,
    },
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
  const header =
    `${buildReportHeader('Classical Orbital Elements Report', sat, null, generatedAt)}` +
    'Note: osculating elements (J2000) at the state epoch, derived from the propagated state vector.\n' +
    'They differ from the TLE mean elements used for catalog apogee/perigee.\n\n';
  const el = sat.toJ2000(stateEpoch).toClassicalElements();
  const tleEpoch = tleEpochFromLine1(sat.tle1);
  const rows: string[][] = [
    ['Element Set', 'Osculating (J2000)'],
    ['TLE Epoch (UTC)', tleEpoch ? formatReportTime(tleEpoch) : 'N/A'],
    ['State Epoch (osculating, UTC)', formatReportTime(el.epoch.toDateTime())],
    ['Apogee', `${el.apogee.toFixed(3)} km`],
    ['Perigee', `${el.perigee.toFixed(3)} km`],
    ['Inclination', `${el.inclinationDegrees.toFixed(4)}°`],
    ['Right Ascension', `${el.rightAscensionDegrees.toFixed(4)}°`],
    ['Argument of Perigee', `${el.argPerigeeDegrees.toFixed(4)}°`],
    ['True Anomaly', `${el.trueAnomalyDegrees.toFixed(4)}°`],
    // Seven places like a TLE: near-circular LEO orbits (e ~ 1e-4) would print as 0.000 at three.
    ['Eccentricity', el.eccentricity.toFixed(7)],
    ['Period', `${el.period.toFixed(3)} min`],
    ['Semi-Major Axis', `${el.semimajorAxis.toFixed(3)} km`],
    // ClassicalElements.meanMotion is rad/s; revsPerDay is the rev/day value.
    ['Mean Motion', `${el.revsPerDay.toFixed(8)} rev/day`],
  ];

  return {
    filename: `coes-${reportId(sat)}`,
    header,
    table: { headers: ['Element', 'Value'], rows },
  };
};

/** Rise/set visibility windows over a sensor for the report window. */
export const generateVisibilityWindowsReport = (sat: Satellite, sensor: DetailedSensor, opts: ReportOptions, deps: ReportCoreDeps, generatedAt: Date): ReportData => {
  const header = buildReportHeader('Visibility Windows Report', sat, sensor, generatedAt);
  const passes = deps.findPasses(sensor, opts);
  const rows = passes.map((pass, idx) => {
    const durationMin = (pass.los.getTime() - pass.aos.getTime()) / (MILLISECONDS_PER_SECOND * 60);

    return [`${idx + 1}`, formatReportTime(pass.aos), formatReportTime(pass.los), durationMin.toFixed(2), pass.maxEl.toFixed(1), formatReportTime(pass.maxElTime)];
  });

  return {
    filename: `visibility-windows-${sat.sccNum}`,
    header,
    table: {
      headers: ['Pass #', 'Rise Time (UTC)', 'Set Time (UTC)', 'Duration (min)', 'Max Elevation(°)', 'Max Elevation Time (UTC)'],
      rows,
    },
    emptyMessage: 'No passes found in the report window!',
  };
};

const ILLUMINATION_LABEL: Record<SunIllumination, string> = {
  sun: 'Yes',
  penumbral: 'Partial',
  umbral: 'No',
  unknown: 'Unknown',
};

const ECLIPSE_LABEL: Record<SunIllumination, string> = {
  sun: 'None',
  penumbral: 'Penumbral',
  umbral: 'Umbral',
  unknown: 'Unknown',
};

/** Sun illumination + eclipse timing over the report window (for power/thermal work). */
export const generateSunEclipseReport = (sat: ReportableObject, opts: ReportOptions, deps: ReportCoreDeps, generatedAt: Date): ReportData => {
  const header = buildReportHeader('Sun/Eclipse Analysis Report', sat, null, generatedAt);
  const rows: string[][] = [];
  const stepMs = Math.max(1, opts.stepSec) * MILLISECONDS_PER_SECOND;
  const endMs = opts.startTime.getTime() + opts.windowSec * MILLISECONDS_PER_SECOND;

  for (let ms = opts.startTime.getTime(); ms < endMs; ms += stepMs) {
    const time = new Date(ms);
    const status = deps.sunStatusAt(time);

    if (!status) {
      continue;
    }

    rows.push([formatReportTime(time), ILLUMINATION_LABEL[status.illumination], ECLIPSE_LABEL[status.illumination], status.sunAngleDeg.toFixed(3)]);
  }

  return {
    filename: `sun-eclipse-${reportId(sat)}`,
    header,
    table: { headers: ['Time (UTC)', 'Sun Illuminated', 'Eclipse Type', 'Sun Angle(°)'], rows },
  };
};
