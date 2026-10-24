/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * conjunction-report-core.ts holds the pure generators for the Conjunction
 * Report, the Maneuver Report and the screening comparison. Each one builds a
 * {@link ConjunctionAnalysisState} (the JSON output, and what a composed report
 * renders from) and a {@link ReportData} (the text and CSV outputs) from the
 * same numbers, so the formats can never disagree.
 *
 * No DOM, ServiceLocator or plugin lookups: everything app-side (burn history,
 * screening runs, sensor passes, settings) is passed in by the plugin.
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

import {
  type AnalysisKind,
  type AnalysisObjectRole,
  type AnalysisObjectSummary,
  type BurnSummary,
  CONJUNCTION_ANALYSIS_SCHEMA_VERSION,
  type ConjunctionAnalysisState,
  type ConjunctionEncounter,
  type ManeuverOption,
  type MeanElements,
  type MissionImpact,
  PC_CONVENTION,
  type PcInputs,
  type RelativeGeometrySample,
  RIC_CONVENTION,
  type RicVector,
  type ScreeningDiff,
  type ScreeningDiffEntry,
} from '@app/engine/conjunction/analysis-state';
import { findApproachMinima } from '@app/engine/conjunction/conjunction-tca';
import { ConjunctionAssessment, cappedScreeningCovarianceFromTle, EpochUTC, j2SecularRates, Kilometers, RIC, Satellite, Seconds, StateCovariance } from '@ootk/src/main';
import { isPlaceholderIntlDes } from '../sat-info-box/placeholder-intl-des';
import { screeningSigmasKm } from '../sat-info-box-orbital/screening-sigmas';
import { formatReportTime, ReportData, ReportTable, tleEpochFromLine1 } from './reports-core';
import { formatPc, riskLevelFromPc } from './screening-diff';

/** Conjunction search half-widths offered in the menu (seconds). */
export const CONJUNCTION_HALF_WIDTH_OPTIONS_SEC = [12 * 3600, 36 * 3600, 72 * 3600] as const;
/** Default conjunction search half-width: plus/minus 12 h around the sim time. */
export const CONJUNCTION_DEFAULT_HALF_WIDTH_SEC = 12 * 3600;

/** Relative-geometry table: plus/minus 5 min around TCA at 10 s. */
const GEOMETRY_HALF_SPAN_SEC = 300;
const GEOMETRY_STEP_SEC = 10;
/** Coarse scan step for the closest-approach search. */
const TCA_SCAN_STEP_MS = 20_000;
/** Golden-section tolerance: 1 ms, about 15 m of along-track motion at LEO crossing speeds. */
const TCA_TOL_MS = 1;
/** Half-width of the narrow window the Pc assessment re-runs around the found TCA. */
const PC_REFINE_HALF_WIDTH_SEC = 60;

/** The 1-sigma caps ootk's cappedScreeningCovarianceFromTle applies by default (km). */
const SCREENING_SIGMA_CAPS_KM: [number, number, number] = [35, 71, 32];

const MS_PER_HOUR = 3_600_000;

/**
 * Objects-table sigma row label. The sigmas are not aged to TCA: they are the TLE-epoch values of
 * the model Pc uses, the same numbers the orbital info box shows.
 */
export const SIGMA_ROW_LABEL = '1-sigma R / I / C (km, own RIC frame, at TLE epoch)';

/** App-side context every analysis needs. */
export interface AnalysisEnv {
  /** Simulation time the analysis is centred on. */
  analysisEpoch: Date;
  /** Wall-clock time of generation. */
  wallClock: Date;
  appVersion: string;
  /** Sigma multiplier k (settingsManager.covarianceConfidenceLevel). */
  covarianceConfidenceLevel: number;
  /** Hard-body radii (km), from the Debris Screening constants. */
  primaryHardBodyRadiusKm: number;
  secondaryHardBodyRadiusKm: number;
}

/** Analyst lineage fields, read duck-typed (the Maneuver tool writes `derivedFromSccNum`). */
interface AnalystLineage {
  derivedFromSccNum?: unknown;
  parentSccNum?: unknown;
  derivedFrom?: unknown;
}

/** NORAD number of the object an analyst satellite was derived from, or null. */
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

// =============================================================================
// Building blocks
// =============================================================================

const ricOf = (v: { x: number; y: number; z: number }): RicVector => ({ radial: v.x, intrack: v.y, crosstrack: v.z });

const speedOf = (v: RicVector): number => Math.hypot(v.radial, v.intrack, v.crosstrack);

/** The screening covariance for an object (same call the Debris Screening tool makes). */
const screeningCovariance = (sat: Satellite, k: number): StateCovariance | null => {
  try {
    return cappedScreeningCovarianceFromTle(sat.tle1, sat.tle2, k);
  } catch {
    return null;
  }
};

/**
 * 1-sigma R/I/C position uncertainty (km, own RIC frame, at the TLE epoch). Same helper the
 * orbital info box uses, so the two always print the same numbers. Always k = 1: the Pc
 * computation applies the confidence level k separately (see the Pc inputs block).
 */
const ricSigmas = (sat: Satellite): RicVector | null => {
  const s = screeningSigmasKm(sat.tle1, sat.tle2);

  return s ? { radial: s.radial, intrack: s.inTrack, crosstrack: s.crossTrack } : null;
};

/** TLE (SGP4 mean) elements, read from the satellite the same way the info box does. */
export const meanElementsOf = (sat: Satellite): MeanElements => {
  const epoch = tleEpochFromLine1(sat.tle1);

  return {
    epochIso: epoch ? epoch.toISOString() : null,
    inclinationDeg: sat.inclination,
    raanDeg: sat.rightAscension,
    eccentricity: sat.eccentricity,
    argPerigeeDeg: sat.argOfPerigee,
    meanAnomalyDeg: sat.meanAnomaly,
    meanMotionRevPerDay: sat.meanMotion,
    periodMin: sat.period,
    apogeeKm: sat.apogee,
    perigeeKm: sat.perigee,
    semiMajorAxisKm: sat.semiMajorAxis,
    bstar: sat.bstar,
  };
};

const ELEMENT_KEYS = [
  'inclinationDeg',
  'raanDeg',
  'eccentricity',
  'argPerigeeDeg',
  'meanAnomalyDeg',
  'meanMotionRevPerDay',
  'periodMin',
  'apogeeKm',
  'perigeeKm',
  'semiMajorAxisKm',
  'bstar',
] as const;

const ANGLE_KEYS = new Set<string>(['raanDeg', 'argPerigeeDeg', 'meanAnomalyDeg']);
const RAD2DEG = 180 / Math.PI;

const wrap360 = (deg: number): number => ((deg % 360) + 360) % 360;
/** Signed angle difference in [-180, 180). */
const wrap180 = (deg: number): number => wrap360(deg + 180) - 180;

/**
 * Moves TLE mean elements to another epoch using the secular J2 rates (RAAN, argument of perigee,
 * mean anomaly). Without this the maneuver report compared the parent at its TLE epoch with the
 * clone at the burn epoch, so the Change column showed hours of orbital motion as a burn effect.
 */
export const advanceMeanElements = (el: MeanElements, targetIso: string): MeanElements => {
  if (!el.epochIso) {
    return el;
  }
  const dtSec = (new Date(targetIso).getTime() - new Date(el.epochIso).getTime()) / 1000;
  const rates = j2SecularRates(el.semiMajorAxisKm, el.eccentricity, el.inclinationDeg / RAD2DEG);

  if (!Number.isFinite(dtSec) || !Number.isFinite(rates.meanAnomalyDot)) {
    return el;
  }

  return {
    ...el,
    epochIso: targetIso,
    raanDeg: wrap360(el.raanDeg + rates.raanDot * dtSec * RAD2DEG),
    argPerigeeDeg: wrap360(el.argPerigeeDeg + rates.argPerigeeDot * dtSec * RAD2DEG),
    meanAnomalyDeg: wrap360(el.meanAnomalyDeg + rates.meanAnomalyDot * dtSec * RAD2DEG),
  };
};

const meanElementDeltas = (pre: MeanElements, post: MeanElements): ManeuverOption['meanElementDeltas'] => {
  const out: NonNullable<ManeuverOption['meanElementDeltas']> = {};

  for (const key of ELEMENT_KEYS) {
    const delta = post[key] - pre[key];

    out[key] = ANGLE_KEYS.has(key) ? wrap180(delta) : delta;
  }

  return out;
};

/** Object summary block (name, ids, TLE epoch, GP age, Pc sigmas, mean elements). */
export const buildObjectSummary = (sat: Satellite, role: AnalysisObjectRole, env: AnalysisEnv): AnalysisObjectSummary => {
  const epoch = tleEpochFromLine1(sat.tle1);
  const parent = analystParentSccNum(sat);

  return {
    role,
    name: sat.name,
    noradId: sat.sccNum || null,
    cosparId: sat.intlDes && !isPlaceholderIntlDes(sat) ? sat.intlDes : null,
    tleEpochIso: epoch ? epoch.toISOString() : null,
    gpAgeHours: epoch ? (env.analysisEpoch.getTime() - epoch.getTime()) / MS_PER_HOUR : null,
    ricSigmasKm: ricSigmas(sat),
    meanElements: meanElementsOf(sat),
    isAnalystObject: parent !== null,
    derivedFromNoradId: parent,
  };
};

/** The Pc inputs block, built from the same constants and setting the computation uses. */
export const buildPcInputs = (env: AnalysisEnv): PcInputs => ({
  method: 'ootk ConjunctionAssessment: 2D Pc in the encounter plane, combined covariance in the primary RIC frame',
  primaryHardBodyRadiusKm: env.primaryHardBodyRadiusKm,
  secondaryHardBodyRadiusKm: env.secondaryHardBodyRadiusKm,
  combinedHardBodyRadiusKm: env.primaryHardBodyRadiusKm + env.secondaryHardBodyRadiusKm,
  covarianceSource: 'Synthetic TLE-derived covariance (ootk cappedScreeningCovarianceFromTle), not an operator covariance; same as Debris Screening',
  covarianceConfidenceLevel: env.covarianceConfidenceLevel,
  sigmaCapsKm: [...SCREENING_SIGMA_CAPS_KM],
});

/** Relative state (secondary minus primary, primary RIC) at a time, or null if either fails to propagate. */
const relativeAt = (primary: Satellite, secondary: Satellite, date: Date): RIC | null => {
  try {
    return RIC.fromJ2000(secondary.toJ2000(date), primary.toJ2000(date));
  } catch {
    return null;
  }
};

/** Separation (km) at a time; a large finite value when propagation fails so the search stays well-defined. */
const separationKm = (primary: Satellite, secondary: Satellite, date: Date): number => {
  const a = primary.eci(date);
  const b = secondary.eci(date);

  if (!a || !b) {
    return 1e12;
  }

  return Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y, a.position.z - b.position.z);
};

/**
 * Finds the closest approach between two objects within plus/minus `halfWidthSec`
 * of the analysis epoch, then re-runs the ootk assessment in a narrow window
 * around it for the Pc (the same assessment the Debris Screening tool runs).
 * Returns null when the window holds no interior minimum.
 */
export const findEncounter = (primary: Satellite, secondary: Satellite, env: AnalysisEnv, halfWidthSec: number): ConjunctionEncounter | null => {
  const startMs = env.analysisEpoch.getTime() - halfWidthSec * 1000;
  const windowMs = 2 * halfWidthSec * 1000;
  const distFn = (t: number): number => separationKm(primary, secondary, new Date(startMs + t));
  const minima = findApproachMinima(distFn, windowMs, TCA_SCAN_STEP_MS, TCA_TOL_MS);

  if (minima.length === 0) {
    return null;
  }

  const best = minima.reduce((a, b) => (b.missKm < a.missKm ? b : a));
  let tcaMs = startMs + best.tcaMs;
  let missKm = best.missKm;
  let ricKm: RicVector | null = null;
  let ricVelocityKmS: RicVector | null = null;
  let pc: number | null = null;

  const primaryCov = screeningCovariance(primary, env.covarianceConfidenceLevel);
  const secondaryCov = screeningCovariance(secondary, env.covarianceConfidenceLevel);

  try {
    const assessment = new ConjunctionAssessment(
      {
        tle: primary.toTle(),
        name: primary.sccNum,
        radius: env.primaryHardBodyRadiusKm as Kilometers,
        covariance: primaryCov ?? undefined,
      },
      {
        tle: secondary.toTle(),
        name: secondary.sccNum,
        radius: env.secondaryHardBodyRadiusKm as Kilometers,
        covariance: secondaryCov ?? undefined,
      }
    );
    const event = assessment.assess({
      startTime: EpochUTC.fromDateTime(new Date(tcaMs - PC_REFINE_HALF_WIDTH_SEC * 1000)),
      endTime: EpochUTC.fromDateTime(new Date(tcaMs + PC_REFINE_HALF_WIDTH_SEC * 1000)),
      searchStepSize: 5 as Seconds,
      tcaTolerance: 0.001 as Seconds,
    });

    tcaMs = event.tca.toDateTime().getTime();
    missKm = event.missDistance;
    ricKm = { radial: event.radialDistance, intrack: event.intrackDistance, crosstrack: event.crosstrackDistance };
    ricVelocityKmS = ricOf(event.relativeState.velocity);
    pc = typeof event.probabilityOfCollision === 'number' && Number.isFinite(event.probabilityOfCollision) ? event.probabilityOfCollision : null;
  } catch {
    // Fall back to the scan's own geometry; the Pc stays null.
    const rel = relativeAt(primary, secondary, new Date(tcaMs));

    if (rel) {
      ricKm = ricOf(rel.position);
      ricVelocityKmS = ricOf(rel.velocity);
    }
  }

  if (!ricKm) {
    return null;
  }

  return {
    primaryNoradId: primary.sccNum || null,
    secondaryNoradId: secondary.sccNum || null,
    tcaIso: new Date(tcaMs).toISOString(),
    tcaMs,
    missDistanceKm: missKm,
    ricKm,
    ricVelocityKmS,
    relativeSpeedKmS: ricVelocityKmS ? speedOf(ricVelocityKmS) : 0,
    pc,
    riskLevel: riskLevelFromPc(pc),
    pcInputs: buildPcInputs(env),
    searchWindow: {
      startIso: new Date(startMs).toISOString(),
      endIso: new Date(startMs + windowMs).toISOString(),
      halfWidthHours: halfWidthSec / 3600,
    },
    ricConvention: RIC_CONVENTION,
  };
};

/** Relative geometry plus/minus 5 min around TCA at 10 s steps. */
export const sampleRelativeGeometry = (primary: Satellite, secondary: Satellite, tcaMs: number): RelativeGeometrySample[] => {
  const samples: RelativeGeometrySample[] = [];

  for (let offsetSec = -GEOMETRY_HALF_SPAN_SEC; offsetSec <= GEOMETRY_HALF_SPAN_SEC; offsetSec += GEOMETRY_STEP_SEC) {
    const date = new Date(tcaMs + offsetSec * 1000);
    const rel = relativeAt(primary, secondary, date);

    if (!rel) {
      continue;
    }
    const ricKm = ricOf(rel.position);

    samples.push({
      offsetSec,
      timeIso: date.toISOString(),
      rangeKm: speedOf(ricKm),
      ricKm,
      relativeSpeedKmS: speedOf(ricOf(rel.velocity)),
    });
  }

  return samples;
};

const baseState = (kind: AnalysisKind, env: AnalysisEnv, missionImpact: MissionImpact | undefined): ConjunctionAnalysisState => ({
  schemaVersion: CONJUNCTION_ANALYSIS_SCHEMA_VERSION,
  kind,
  generatedAtIso: env.analysisEpoch.toISOString(),
  generatedWallClockIso: env.wallClock.toISOString(),
  appVersion: env.appVersion,
  analysisEpochIso: env.analysisEpoch.toISOString(),
  ricConvention: RIC_CONVENTION,
  pcConvention: PC_CONVENTION,
  objects: [],
  encounter: null,
  relativeGeometry: [],
  maneuverOptions: [],
  screeningDiff: null,
  missionImpact: missionImpact ?? { sensorName: null, passWindows: null, notes: [] },
  notes: [],
});

// =============================================================================
// Text formatting helpers
// =============================================================================

const RULE = '-'.repeat(31);
const fmtKm = (v: number): string => v.toFixed(3);
const fmtSigned = (v: number, digits = 3): string => `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;
const fmtIsoTime = (iso: string | null): string => (iso ? formatReportTime(new Date(iso)) : 'N/A');
const fmtAge = (hours: number | null): string => (hours === null ? 'N/A' : `${(hours / 24).toFixed(2)} days`);
const fmtSigmas = (s: RicVector | null): string => (s ? `${s.radial.toFixed(3)} / ${s.intrack.toFixed(3)} / ${s.crosstrack.toFixed(3)}` : 'N/A');

const headerBlock = (title: string, state: ConjunctionAnalysisState): string =>
  `${title}\n${RULE}\n` +
  `Date: ${state.generatedAtIso}\n` +
  `Generated (wall clock): ${state.generatedWallClockIso}\n` +
  `KeepTrack version: ${state.appVersion}\n` +
  `RIC convention: ${state.ricConvention}\n\n`;

/** Object comparison table: one column per object. */
const objectsTable = (objects: AnalysisObjectSummary[]): ReportTable => {
  const cell = (fn: (o: AnalysisObjectSummary) => string): string[] => objects.map(fn);

  return {
    headers: ['Field', ...objects.map((o) => o.role.charAt(0).toUpperCase() + o.role.slice(1))],
    rows: [
      ['Name', ...cell((o) => o.name)],
      ['NORAD ID', ...cell((o) => o.noradId ?? 'None')],
      ['COSPAR ID', ...cell((o) => o.cosparId ?? 'None')],
      ['TLE Epoch (UTC)', ...cell((o) => fmtIsoTime(o.tleEpochIso))],
      ['GP Age', ...cell((o) => fmtAge(o.gpAgeHours))],
      [SIGMA_ROW_LABEL, ...cell((o) => fmtSigmas(o.ricSigmasKm))],
      ['Derived From', ...cell((o) => o.derivedFromNoradId ?? '-')],
    ],
  };
};

const encounterRows = (e: ConjunctionEncounter): string[][] => [
  ['TCA (UTC)', formatReportTime(new Date(e.tcaMs))],
  ['Miss Distance', `${fmtKm(e.missDistanceKm)} km`],
  ['Radial (R)', `${fmtSigned(e.ricKm.radial)} km`],
  ['In-Track (I)', `${fmtSigned(e.ricKm.intrack)} km`],
  ['Cross-Track (C)', `${fmtSigned(e.ricKm.crosstrack)} km`],
  ['Relative Speed', `${e.relativeSpeedKmS.toFixed(4)} km/s`],
  ['Pc', formatPc(e.pc)],
  ['Risk Level', e.riskLevel],
  ['Search Window (UTC)', `${fmtIsoTime(e.searchWindow.startIso)} to ${fmtIsoTime(e.searchWindow.endIso)} (+/- ${e.searchWindow.halfWidthHours} h)`],
];

const pcInputsTable = (p: PcInputs): ReportTable => ({
  headers: ['Pc Input', 'Value'],
  rows: [
    ['Method', p.method],
    ['Primary Hard-Body Radius', `${(p.primaryHardBodyRadiusKm * 1000).toFixed(1)} m`],
    ['Secondary Hard-Body Radius', `${(p.secondaryHardBodyRadiusKm * 1000).toFixed(1)} m`],
    ['Combined Hard-Body Radius', `${(p.combinedHardBodyRadiusKm * 1000).toFixed(1)} m`],
    ['Covariance Source', p.covarianceSource],
    ['Confidence Level (k)', p.covarianceConfidenceLevel.toString()],
    ['1-sigma Caps R / I / C', `${p.sigmaCapsKm.join(' / ')} km`],
  ],
});

const missionImpactTable = (mi: MissionImpact): ReportTable | null => {
  if (!mi.sensorName || !mi.passWindows) {
    return null;
  }

  return {
    headers: ['Object', 'AOS (UTC)', 'LOS (UTC)', 'Max El (deg)'],
    rows: mi.passWindows.map((p) => [p.noradId ?? '', fmtIsoTime(p.aosIso), fmtIsoTime(p.losIso), p.maxElevationDeg.toFixed(1)]),
  };
};

const STATUS_LABEL: Record<ScreeningDiffEntry['status'], string> = {
  introduced: 'Introduced',
  removed: 'Removed',
  unchanged: 'Unchanged',
  appeared: 'Appeared (below threshold)',
  dropped: 'Dropped (below threshold)',
};

const DIFF_HEADERS = ['Status', 'Secondary', 'Name', 'Pre TCA (UTC)', 'Pre Miss (km)', 'Pre Pc', 'Post TCA (UTC)', 'Post Miss (km)', 'Post Pc', 'Miss Change (km)'];

/** Screening-diff table, one row per event. */
export const screeningDiffTable = (diff: ScreeningDiff): ReportTable => ({
  headers: [...DIFF_HEADERS],
  rows: diff.entries.map((e) => [
    STATUS_LABEL[e.status],
    e.secondaryId || '(no id)',
    e.secondaryName,
    e.pre ? formatReportTime(new Date(e.pre.tcaMs)) : '-',
    e.pre ? fmtKm(e.pre.missDistanceKm) : '-',
    e.pre ? formatPc(e.pre.pc) : '-',
    e.post ? formatReportTime(new Date(e.post.tcaMs)) : '-',
    e.post ? fmtKm(e.post.missDistanceKm) : '-',
    e.post ? formatPc(e.post.pc) : '-',
    e.missDeltaKm === null ? '-' : fmtSigned(e.missDeltaKm),
  ]),
});

const diffSummaryRows = (diff: ScreeningDiff): string[][] => [
  ['Pre Run Primary', diff.preRun.primaryId],
  ['Pre Run Window (UTC)', `${fmtIsoTime(diff.preRun.startIso)} to ${fmtIsoTime(diff.preRun.endIso)}`],
  ['Post Run Primary', diff.postRun.primaryId],
  ['Post Run Window (UTC)', `${fmtIsoTime(diff.postRun.startIso)} to ${fmtIsoTime(diff.postRun.endIso)}`],
  ['Concern Threshold', `${diff.concernThreshold} and above`],
  ['Excluded Secondaries', diff.excludedSecondaryIds.length > 0 ? diff.excludedSecondaryIds.join(', ') : 'None'],
  ['Introduced', diff.counts.introduced.toString()],
  ['Removed', diff.counts.removed.toString()],
  ['Unchanged', diff.counts.unchanged.toString()],
  ['Appeared / Dropped (below threshold)', `${diff.counts.appeared} / ${diff.counts.dropped}`],
];

// =============================================================================
// Conjunction Report
// =============================================================================

export interface ConjunctionReportInput {
  primary: Satellite;
  secondary: Satellite;
  env: AnalysisEnv;
  halfWidthSec?: number;
  missionImpact?: MissionImpact;
}

/** Builds the analysis state for a primary/secondary pair. */
export const buildConjunctionState = (input: ConjunctionReportInput): ConjunctionAnalysisState => {
  const { primary, secondary, env } = input;
  const state = baseState('conjunction', env, input.missionImpact);
  const encounter = findEncounter(primary, secondary, env, input.halfWidthSec ?? CONJUNCTION_DEFAULT_HALF_WIDTH_SEC);

  state.objects = [buildObjectSummary(primary, 'primary', env), buildObjectSummary(secondary, 'secondary', env)];
  state.encounter = encounter;
  state.relativeGeometry = encounter ? sampleRelativeGeometry(primary, secondary, encounter.tcaMs) : [];
  if (!encounter) {
    state.notes.push('No closest approach inside the search window; widen the window or move the sim time closer to the event.');
  }

  return state;
};

/** Renders a conjunction analysis state as report data (text sections, CSV time series, JSON state). */
export const conjunctionReportFromState = (state: ConjunctionAnalysisState): ReportData => {
  const [primary, secondary] = state.objects;
  const sections: ReportData['sections'] = [{ title: 'Objects', table: objectsTable(state.objects) }];

  if (state.encounter) {
    sections.push({ title: 'Closest Approach', table: { headers: ['Quantity', 'Value'], rows: encounterRows(state.encounter) } });
    sections.push({ title: 'Probability of Collision Inputs', table: pcInputsTable(state.encounter.pcInputs) });
  }
  const passes = missionImpactTable(state.missionImpact);

  if (passes) {
    sections.push({ title: `Sensor Passes (${state.missionImpact.sensorName})`, table: passes });
  }

  return {
    filename: `conjunction-${primary?.noradId ?? 'primary'}-${secondary?.noradId ?? 'secondary'}`,
    header: headerBlock('Conjunction Report', state) + (state.notes.length > 0 ? `${state.notes.join('\n')}\n\n` : ''),
    sections,
    tableTitle: 'Relative Geometry (TCA +/- 5 min, 10 s)',
    table: {
      headers: ['Time (UTC)', 'Offset (s)', 'Range (km)', 'Radial (km)', 'In-Track (km)', 'Cross-Track (km)', 'Rel Speed (km/s)'],
      rows: state.relativeGeometry.map((s) => [
        formatReportTime(new Date(s.timeIso)),
        s.offsetSec.toString(),
        fmtKm(s.rangeKm),
        fmtSigned(s.ricKm.radial),
        fmtSigned(s.ricKm.intrack),
        fmtSigned(s.ricKm.crosstrack),
        s.relativeSpeedKmS.toFixed(4),
      ]),
    },
    emptyMessage: 'No closest approach found in the search window.',
    json: state,
  };
};

/** Conjunction Report: state plus report data in one call. */
export const generateConjunctionReport = (input: ConjunctionReportInput): ReportData => conjunctionReportFromState(buildConjunctionState(input));

// =============================================================================
// Maneuver Report
// =============================================================================

export interface ManeuverReportInput {
  parent: Satellite;
  analyst: Satellite;
  env: AnalysisEnv;
  /** Burns that produced the analyst object, or null when not recoverable. */
  burns: BurnSummary[] | null;
  /** Optional secondary for a pre/post close-approach comparison. */
  secondary?: Satellite | null;
  halfWidthSec?: number;
  screeningDiff: ScreeningDiff | null;
  /** Why the screening diff is missing (shown in place of the table). */
  screeningDiffUnavailableReason?: string | null;
  missionImpact?: MissionImpact;
}

/** Builds the analysis state for a parent/analyst pair. */
export const buildManeuverState = (input: ManeuverReportInput): ConjunctionAnalysisState => {
  const { parent, analyst, env } = input;
  const state = baseState('maneuver', env, input.missionImpact);
  const halfWidthSec = input.halfWidthSec ?? CONJUNCTION_DEFAULT_HALF_WIDTH_SEC;
  const parentSummary = buildObjectSummary(parent, 'parent', env);
  const analystSummary = buildObjectSummary(analyst, 'analyst', env);

  state.objects = [parentSummary, analystSummary];

  let preEncounter: ConjunctionEncounter | null = null;
  let postEncounter: ConjunctionEncounter | null = null;

  if (input.secondary) {
    state.objects.push(buildObjectSummary(input.secondary, 'secondary', env));
    preEncounter = findEncounter(parent, input.secondary, env, halfWidthSec);
    postEncounter = findEncounter(analyst, input.secondary, env, halfWidthSec);
    state.encounter = postEncounter;
  }

  const post = analystSummary.meanElements;
  // Compare at one epoch: the parent's elements are carried forward to the clone's epoch.
  const pre = parentSummary.meanElements && post?.epochIso ? advanceMeanElements(parentSummary.meanElements, post.epochIso) : parentSummary.meanElements;
  const burns = input.burns;

  state.maneuverOptions = [
    {
      id: analyst.sccNum || analyst.name,
      label: analyst.name,
      parentNoradId: parent.sccNum || null,
      analystNoradId: analyst.sccNum || null,
      burns,
      burnParametersAvailable: burns !== null,
      totalDeltaVMs: burns ? burns.reduce((sum, b) => sum + b.magnitudeMs, 0) : null,
      preMeanElements: pre,
      postMeanElements: post,
      meanElementDeltas: pre && post ? meanElementDeltas(pre, post) : null,
      preEncounter,
      postEncounter,
      screeningDiff: input.screeningDiff,
      screeningDiffUnavailableReason: input.screeningDiff ? null : (input.screeningDiffUnavailableReason ?? 'No screening runs available.'),
    },
  ];

  /*
   * One option, one diff: mirror it at the top level so a JSON reader that
   * looks for $.screeningDiff finds the same diff the text report prints
   * (it was null there while $.maneuverOptions[0].screeningDiff held the diff).
   */
  state.screeningDiff = input.screeningDiff;

  if (input.screeningDiff?.isWindowMismatch) {
    state.notes.push('The pre and post screening runs cover different windows; events near the window edges may be classified wrongly.');
  }

  return state;
};

const ELEMENT_ROWS: [keyof Omit<MeanElements, 'epochIso'>, string, number][] = [
  ['inclinationDeg', 'Inclination (deg)', 4],
  ['raanDeg', 'RAAN (deg)', 4],
  ['eccentricity', 'Eccentricity', 7],
  ['argPerigeeDeg', 'Arg of Perigee (deg)', 4],
  ['meanAnomalyDeg', 'Mean Anomaly (deg)', 4],
  ['meanMotionRevPerDay', 'Mean Motion (rev/day)', 8],
  ['periodMin', 'Period (min)', 4],
  ['apogeeKm', 'Apogee (km)', 3],
  ['perigeeKm', 'Perigee (km)', 3],
  ['semiMajorAxisKm', 'Semi-Major Axis (km)', 3],
  ['bstar', 'B*', 8],
];

const meanElementsTable = (option: ManeuverOption): ReportTable => {
  const pre = option.preMeanElements;
  const post = option.postMeanElements;
  const deltas = option.meanElementDeltas;

  return {
    headers: ['Mean Element (TLE)', 'Pre (parent, at Post epoch)', 'Post (analyst)', 'Change'],
    rows: [
      ['Epoch (UTC)', fmtIsoTime(pre?.epochIso ?? null), fmtIsoTime(post?.epochIso ?? null), '-'],
      ...ELEMENT_ROWS.map(([key, label, digits]) => [
        label,
        pre ? pre[key].toFixed(digits) : 'N/A',
        post ? post[key].toFixed(digits) : 'N/A',
        typeof deltas?.[key] === 'number' ? fmtSigned(deltas[key], digits) : 'N/A',
      ]),
    ],
  };
};

const burnsTable = (burns: BurnSummary[]): ReportTable => ({
  headers: ['#', 'Epoch (UTC)', 'Frame', 'Delta-V Input (m/s)', 'Magnitude (m/s)', 'Source', 'Label'],
  rows: burns.map((b, i) => [
    (i + 1).toString(),
    fmtIsoTime(b.epochIso),
    b.frame.toUpperCase(),
    b.inputDeltaVMs.map((v) => fmtSigned(v, 4)).join(', '),
    b.magnitudeMs.toFixed(4),
    b.source,
    b.label ?? '',
  ]),
});

const encounterCompareTable = (pre: ConjunctionEncounter | null, post: ConjunctionEncounter | null): ReportTable => {
  const val = (e: ConjunctionEncounter | null, fn: (e: ConjunctionEncounter) => string): string => (e ? fn(e) : 'Not found');

  return {
    headers: ['Quantity', 'Pre (parent)', 'Post (analyst)'],
    rows: [
      ['TCA (UTC)', val(pre, (e) => formatReportTime(new Date(e.tcaMs))), val(post, (e) => formatReportTime(new Date(e.tcaMs)))],
      ['Miss Distance (km)', val(pre, (e) => fmtKm(e.missDistanceKm)), val(post, (e) => fmtKm(e.missDistanceKm))],
      [
        'R / I / C (km)',
        val(pre, (e) => `${fmtSigned(e.ricKm.radial)} / ${fmtSigned(e.ricKm.intrack)} / ${fmtSigned(e.ricKm.crosstrack)}`),
        val(post, (e) => `${fmtSigned(e.ricKm.radial)} / ${fmtSigned(e.ricKm.intrack)} / ${fmtSigned(e.ricKm.crosstrack)}`),
      ],
      ['Relative Speed (km/s)', val(pre, (e) => e.relativeSpeedKmS.toFixed(4)), val(post, (e) => e.relativeSpeedKmS.toFixed(4))],
      ['Pc', val(pre, (e) => formatPc(e.pc)), val(post, (e) => formatPc(e.pc))],
    ],
  };
};

/** Renders a maneuver analysis state as report data. */
export const maneuverReportFromState = (state: ConjunctionAnalysisState): ReportData => {
  const option = state.maneuverOptions[0];
  const sections: ReportData['sections'] = [{ title: 'Objects', table: objectsTable(state.objects) }];

  if (option?.burns && option.burns.length > 0) {
    sections.push({ title: `Burns (total ${option.totalDeltaVMs?.toFixed(4)} m/s)`, table: burnsTable(option.burns) });
  } else {
    sections.push({ title: 'Burns', table: { headers: ['Burn Parameters'], rows: [['Burn parameters unavailable']] } });
  }
  if (option) {
    sections.push({ title: 'Mean Elements, Pre vs Post', table: meanElementsTable(option) });
  }
  if (option && (option.preEncounter || option.postEncounter)) {
    const secondary = state.objects.find((o) => o.role === 'secondary');

    sections.push({
      title: `Close Approach to ${secondary?.name ?? 'Secondary'} (${secondary?.noradId ?? ''}), Pre vs Post`,
      table: encounterCompareTable(option.preEncounter, option.postEncounter),
    });
  }
  if (option?.screeningDiff) {
    sections.push({ title: 'Screening Diff Summary', table: { headers: ['Item', 'Value'], rows: diffSummaryRows(option.screeningDiff) } });
  }
  const passes = missionImpactTable(state.missionImpact);

  if (passes) {
    sections.push({ title: `Sensor Passes (${state.missionImpact.sensorName})`, table: passes });
  }

  const parent = state.objects.find((o) => o.role === 'parent');
  const analyst = state.objects.find((o) => o.role === 'analyst');

  return {
    filename: `maneuver-${parent?.noradId ?? 'parent'}-${analyst?.noradId ?? 'analyst'}`,
    header: headerBlock('Maneuver Report', state) + (state.notes.length > 0 ? `${state.notes.join('\n')}\n\n` : ''),
    sections,
    tableTitle: 'Screening Diff (parent before vs analyst after)',
    table: option?.screeningDiff ? screeningDiffTable(option.screeningDiff) : { headers: [...DIFF_HEADERS], rows: [] },
    emptyMessage: option?.screeningDiffUnavailableReason ?? 'No screening events in either run.',
    json: state,
  };
};

/** Maneuver Report: state plus report data in one call. */
export const generateManeuverReport = (input: ManeuverReportInput): ReportData => maneuverReportFromState(buildManeuverState(input));

// =============================================================================
// Screening comparison (any two runs)
// =============================================================================

export interface ScreeningCompareInput {
  diff: ScreeningDiff;
  env: AnalysisEnv;
  /** Objects screened in the two runs, when they are still in the catalog. */
  objects?: { pre: Satellite | null; post: Satellite | null };
}

export const buildScreeningCompareState = (input: ScreeningCompareInput): ConjunctionAnalysisState => {
  const state = baseState('screening-compare', input.env, undefined);

  state.screeningDiff = input.diff;
  if (input.objects?.pre) {
    state.objects.push(buildObjectSummary(input.objects.pre, analystParentSccNum(input.objects.pre) ? 'analyst' : 'primary', input.env));
  }
  if (input.objects?.post && input.objects.post !== input.objects.pre) {
    state.objects.push(buildObjectSummary(input.objects.post, analystParentSccNum(input.objects.post) ? 'analyst' : 'primary', input.env));
  }
  if (input.diff.isWindowMismatch) {
    state.notes.push('The two screening runs cover different windows; events near the window edges may be classified wrongly.');
  }

  return state;
};

export const screeningCompareReportFromState = (state: ConjunctionAnalysisState): ReportData => {
  const diff = state.screeningDiff;
  const sections: ReportData['sections'] = [];

  if (state.objects.length > 0) {
    sections.push({ title: 'Objects', table: objectsTable(state.objects) });
  }
  if (diff) {
    sections.push({ title: 'Screening Diff Summary', table: { headers: ['Item', 'Value'], rows: diffSummaryRows(diff) } });
  }

  return {
    filename: `screening-compare-${diff?.preRun.primaryId ?? 'pre'}-${diff?.postRun.primaryId ?? 'post'}`,
    header: headerBlock('Screening Comparison Report', state) + (state.notes.length > 0 ? `${state.notes.join('\n')}\n\n` : ''),
    sections,
    tableTitle: 'Screening Diff (older run vs newer run)',
    table: diff ? screeningDiffTable(diff) : { headers: [...DIFF_HEADERS], rows: [] },
    emptyMessage: 'No screening events in either run.',
    json: state,
  };
};

export const generateScreeningCompareReport = (input: ScreeningCompareInput): ReportData => screeningCompareReportFromState(buildScreeningCompareState(input));
