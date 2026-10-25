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
} from '@app/engine/conjunction/analysis-state';
import { findApproachMinima } from '@app/engine/conjunction/conjunction-tca';
import { ConjunctionAssessment, cappedScreeningCovarianceFromTle, EpochUTC, j2SecularRates, Kilometers, RIC, Satellite, Seconds, StateCovariance } from '@ootk/src/main';
import { isPlaceholderIntlDes } from '../sat-info-box/placeholder-intl-des';
import { screeningSigmasKm } from '../sat-info-box-orbital/screening-sigmas';
import { doc, docEn, fillDoc } from './report-i18n';
import { formatReportTime, ReportData, ReportTable, ReportText, tleEpochFromLine1 } from './reports-core';
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
 * Objects-table sigma row label (English; the text report prints it in the UI language). The sigmas
 * are not aged to TCA: they are the TLE-epoch values of the model Pc uses, the same numbers the
 * orbital info box shows.
 */
export const SIGMA_ROW_LABEL = docEn('objects.sigma');

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

/**
 * Object summary block (name, ids, TLE epoch, GP age, Pc sigmas, mean elements).
 *
 * `uncertaintyParent`: for an analyst clone, the cataloged object it was derived from. The clone's
 * TLE is a fit at the burn epoch, so its own GP age is near zero (negative for a future burn) and
 * its TLE-derived sigmas can be smaller than the parent's, as if the burn had improved our
 * knowledge of the orbit. The clone knows no more than its parent, so it takes the parent's
 * 1-sigma RIC and GP age, and `uncertaintyAssumedFromNoradId` says so. Its own TLE epoch is kept.
 */
export const buildObjectSummary = (sat: Satellite, role: AnalysisObjectRole, env: AnalysisEnv, uncertaintyParent?: Satellite | null): AnalysisObjectSummary => {
  const epoch = tleEpochFromLine1(sat.tle1);
  const parent = analystParentSccNum(sat);
  const source = uncertaintyParent ?? sat;
  const sourceEpoch = uncertaintyParent ? tleEpochFromLine1(uncertaintyParent.tle1) : epoch;
  const summary: AnalysisObjectSummary = {
    role,
    name: sat.name,
    noradId: sat.sccNum || null,
    cosparId: sat.intlDes && !isPlaceholderIntlDes(sat) ? sat.intlDes : null,
    tleEpochIso: epoch ? epoch.toISOString() : null,
    gpAgeHours: sourceEpoch ? (env.analysisEpoch.getTime() - sourceEpoch.getTime()) / MS_PER_HOUR : null,
    ricSigmasKm: ricSigmas(source),
    meanElements: meanElementsOf(sat),
    isAnalystObject: parent !== null,
    derivedFromNoradId: parent,
  };

  if (uncertaintyParent) {
    summary.uncertaintyAssumedFromNoradId = uncertaintyParent.sccNum || null;
  }

  return summary;
};

/** The Pc inputs block, built from the same constants and setting the computation uses. */
export const buildPcInputs = (env: AnalysisEnv): PcInputs => ({
  method: doc('pcInputs.methodValue'),
  primaryHardBodyRadiusKm: env.primaryHardBodyRadiusKm,
  secondaryHardBodyRadiusKm: env.secondaryHardBodyRadiusKm,
  combinedHardBodyRadiusKm: env.primaryHardBodyRadiusKm + env.secondaryHardBodyRadiusKm,
  covarianceSource: doc('pcInputs.covarianceSourceValue'),
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
export const findEncounter = (
  primary: Satellite,
  secondary: Satellite,
  env: AnalysisEnv,
  halfWidthSec: number,
  /** Object whose screening covariance stands in for the primary's (an analyst clone uses its parent's). */
  primaryCovarianceSource: Satellite = primary
): ConjunctionEncounter | null => {
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

  const primaryCov = screeningCovariance(primaryCovarianceSource, env.covarianceConfidenceLevel);
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
const fmtAge = (hours: number | null): string => (hours === null ? 'N/A' : fillDoc(doc('objects.days'), { days: (hours / 24).toFixed(2) }));
const fmtSigmas = (s: RicVector | null): string => (s ? `${s.radial.toFixed(3)} / ${s.intrack.toFixed(3)} / ${s.crosstrack.toFixed(3)}` : 'N/A');
/** Appends "(assumed from parent)" to a cell whose value was taken from the object's parent. */
const assumedCell = (o: AnalysisObjectSummary, text: string): string => (o.uncertaintyAssumedFromNoradId && text !== 'N/A' ? `${text} ${doc('objects.assumedFromParent')}` : text);

const headerBlock = (title: string, state: ConjunctionAnalysisState): string =>
  `${title}\n${RULE}\n` +
  `${doc('header.date')}: ${state.generatedAtIso}\n` +
  `${doc('header.generatedWallClock')}: ${state.generatedWallClockIso}\n` +
  `${doc('header.appVersion')}: ${state.appVersion}\n` +
  `${doc('header.ricConvention')}: ${state.ricConvention}\n\n`;

/** Object comparison table: one column per object. */
const objectsTable = (objects: AnalysisObjectSummary[]): ReportTable => {
  const cell = (fn: (o: AnalysisObjectSummary) => string): string[] => objects.map(fn);

  return {
    headers: [doc('objects.field'), ...objects.map((o) => doc(`roles.${o.role}`))],
    rows: [
      [doc('objects.name'), ...cell((o) => o.name)],
      [doc('objects.noradId'), ...cell((o) => o.noradId ?? doc('header.none'))],
      [doc('objects.cosparId'), ...cell((o) => o.cosparId ?? doc('header.none'))],
      [doc('objects.tleEpoch'), ...cell((o) => fmtIsoTime(o.tleEpochIso))],
      [doc('objects.gpAge'), ...cell((o) => assumedCell(o, fmtAge(o.gpAgeHours)))],
      [doc('objects.sigma'), ...cell((o) => assumedCell(o, fmtSigmas(o.ricSigmasKm)))],
      [doc('objects.derivedFrom'), ...cell((o) => o.derivedFromNoradId ?? '-')],
    ],
  };
};

const encounterRows = (e: ConjunctionEncounter): string[][] => [
  [doc('encounter.tca'), formatReportTime(new Date(e.tcaMs))],
  [doc('encounter.miss'), `${fmtKm(e.missDistanceKm)} km`],
  [doc('encounter.radial'), `${fmtSigned(e.ricKm.radial)} km`],
  [doc('encounter.intrack'), `${fmtSigned(e.ricKm.intrack)} km`],
  [doc('encounter.crosstrack'), `${fmtSigned(e.ricKm.crosstrack)} km`],
  [doc('encounter.relSpeed'), `${e.relativeSpeedKmS.toFixed(4)} km/s`],
  ['Pc', formatPc(e.pc)],
  [doc('encounter.risk'), doc(`risk.${e.riskLevel}`)],
  [
    doc('encounter.searchWindow'),
    fillDoc(doc('encounter.searchWindowValue'), {
      start: fmtIsoTime(e.searchWindow.startIso),
      end: fmtIsoTime(e.searchWindow.endIso),
      hours: e.searchWindow.halfWidthHours,
    }),
  ],
];

const pcInputsTable = (p: PcInputs): ReportTable => ({
  headers: [doc('pcInputs.input'), doc('common.value')],
  rows: [
    [doc('pcInputs.method'), p.method],
    [doc('pcInputs.primaryHbr'), `${(p.primaryHardBodyRadiusKm * 1000).toFixed(1)} m`],
    [doc('pcInputs.secondaryHbr'), `${(p.secondaryHardBodyRadiusKm * 1000).toFixed(1)} m`],
    [doc('pcInputs.combinedHbr'), `${(p.combinedHardBodyRadiusKm * 1000).toFixed(1)} m`],
    [doc('pcInputs.covarianceSource'), p.covarianceSource],
    [doc('pcInputs.confidence'), p.covarianceConfidenceLevel.toString()],
    [doc('pcInputs.sigmaCaps'), `${p.sigmaCapsKm.join(' / ')} km`],
  ],
});

const missionImpactTable = (mi: MissionImpact): ReportTable | null => {
  if (!mi.sensorName || !mi.passWindows) {
    return null;
  }

  return {
    headers: [doc('passes.object'), doc('passes.aos'), doc('passes.los'), doc('passes.maxEl')],
    rows: mi.passWindows.map((p) => [p.noradId ?? '', fmtIsoTime(p.aosIso), fmtIsoTime(p.losIso), p.maxElevationDeg.toFixed(1)]),
  };
};

const DIFF_COLUMNS = ['status', 'secondary', 'name', 'preTca', 'preMiss', 'prePc', 'postTca', 'postMiss', 'postPc', 'missChange'];

const diffRows = (diff: ScreeningDiff, tr: ReportText): string[][] =>
  diff.entries.map((e) => [
    tr(`status.${e.status}`),
    e.secondaryId || tr('diff.noId'),
    e.secondaryName,
    e.pre ? formatReportTime(new Date(e.pre.tcaMs)) : '-',
    e.pre ? fmtKm(e.pre.missDistanceKm) : '-',
    e.pre ? formatPc(e.pre.pc) : '-',
    e.post ? formatReportTime(new Date(e.post.tcaMs)) : '-',
    e.post ? fmtKm(e.post.missDistanceKm) : '-',
    e.post ? formatPc(e.post.pc) : '-',
    e.missDeltaKm === null ? '-' : fmtSigned(e.missDeltaKm),
  ]);

/**
 * Screening-diff table, one row per event (none for a missing diff). Headers and status cells
 * are English for CSV/JSON and translated for the text preview.
 */
export const screeningDiffTable = (diff: ScreeningDiff | null): ReportTable => ({
  headers: DIFF_COLUMNS.map((key) => docEn(`diff.${key}`)),
  rows: diff ? diffRows(diff, docEn) : [],
  display: {
    headers: DIFF_COLUMNS.map((key) => doc(`diff.${key}`)),
    rows: diff ? diffRows(diff, doc) : [],
  },
});

const diffSummaryRows = (diff: ScreeningDiff): string[][] => {
  const range = (startIso: string | null, endIso: string | null): string => fillDoc(doc('summary.range'), { start: fmtIsoTime(startIso), end: fmtIsoTime(endIso) });

  return [
    [doc('summary.preRunPrimary'), diff.preRun.primaryId],
    [doc('summary.preRunWindow'), range(diff.preRun.startIso, diff.preRun.endIso)],
    [doc('summary.postRunPrimary'), diff.postRun.primaryId],
    [doc('summary.postRunWindow'), range(diff.postRun.startIso, diff.postRun.endIso)],
    [doc('summary.concernThreshold'), fillDoc(doc('summary.concernThresholdValue'), { level: doc(`risk.${diff.concernThreshold}`) })],
    [doc('summary.excluded'), diff.excludedSecondaryIds.length > 0 ? diff.excludedSecondaryIds.join(', ') : doc('header.none')],
    [doc('status.introduced'), diff.counts.introduced.toString()],
    [doc('status.removed'), diff.counts.removed.toString()],
    [doc('status.moved'), (diff.counts.moved ?? 0).toString()],
    [doc('status.unchanged'), diff.counts.unchanged.toString()],
    [doc('summary.appearedDropped'), `${diff.counts.appeared} / ${diff.counts.dropped}`],
  ];
};

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
    state.notes.push(doc('notes.noEncounter'));
  }

  return state;
};

/** Renders a conjunction analysis state as report data (text sections, CSV time series, JSON state). */
export const conjunctionReportFromState = (state: ConjunctionAnalysisState): ReportData => {
  const [primary, secondary] = state.objects;
  const sections: ReportData['sections'] = [{ title: doc('sections.objects'), table: objectsTable(state.objects) }];

  if (state.encounter) {
    sections.push({ title: doc('sections.closestApproach'), table: { headers: [doc('common.quantity'), doc('common.value')], rows: encounterRows(state.encounter) } });
    sections.push({ title: doc('sections.pcInputs'), table: pcInputsTable(state.encounter.pcInputs) });
  }
  const passes = missionImpactTable(state.missionImpact);

  if (passes) {
    sections.push({ title: fillDoc(doc('sections.sensorPasses'), { sensor: state.missionImpact.sensorName ?? '' }), table: passes });
  }
  const geometryColumns = ['timeUtc', 'offsetSec', 'rangeKmSpaced', 'radialKm', 'intrackKm', 'crosstrackKm', 'relSpeed'];

  return {
    filename: `conjunction-${primary?.noradId ?? 'primary'}-${secondary?.noradId ?? 'secondary'}`,
    header: headerBlock(doc('titles.conjunction'), state) + (state.notes.length > 0 ? `${state.notes.join('\n')}\n\n` : ''),
    sections,
    tableTitle: doc('sections.relativeGeometry'),
    table: {
      headers: geometryColumns.map((key) => docEn(`cols.${key}`)),
      display: { headers: geometryColumns.map((key) => doc(`cols.${key}`)) },
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
    emptyMessage: doc('empty.noApproach'),
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
  // The clone's uncertainty and GP age are its parent's (see buildObjectSummary).
  const analystSummary = buildObjectSummary(analyst, 'analyst', env, parent);

  state.objects = [parentSummary, analystSummary];

  let preEncounter: ConjunctionEncounter | null = null;
  let postEncounter: ConjunctionEncounter | null = null;

  if (input.secondary) {
    state.objects.push(buildObjectSummary(input.secondary, 'secondary', env));
    preEncounter = findEncounter(parent, input.secondary, env, halfWidthSec);
    postEncounter = findEncounter(analyst, input.secondary, env, halfWidthSec, parent);
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
      screeningDiffUnavailableReason: input.screeningDiff ? null : (input.screeningDiffUnavailableReason ?? doc('notes.noScreeningRuns')),
    },
  ];

  /*
   * One option, one diff: mirror it at the top level so a JSON reader that
   * looks for $.screeningDiff finds the same diff the text report prints
   * (it was null there while $.maneuverOptions[0].screeningDiff held the diff).
   */
  state.screeningDiff = input.screeningDiff;

  state.notes.push(fillDoc(doc('notes.uncertaintyAssumed'), { parent: parent.sccNum || parent.name }));
  if (input.screeningDiff?.isWindowMismatch) {
    state.notes.push(doc('notes.windowMismatchManeuver'));
  }

  return state;
};

/** [element, decimal places]; the row label is the locale key elements.<element>. */
const ELEMENT_ROWS: [keyof Omit<MeanElements, 'epochIso'>, number][] = [
  ['inclinationDeg', 4],
  ['raanDeg', 4],
  ['eccentricity', 7],
  ['argPerigeeDeg', 4],
  ['meanAnomalyDeg', 4],
  ['meanMotionRevPerDay', 8],
  ['periodMin', 4],
  ['apogeeKm', 3],
  ['perigeeKm', 3],
  ['semiMajorAxisKm', 3],
  ['bstar', 8],
];

const meanElementsTable = (option: ManeuverOption): ReportTable => {
  const pre = option.preMeanElements;
  const post = option.postMeanElements;
  const deltas = option.meanElementDeltas;

  return {
    headers: [doc('elements.header'), doc('elements.pre'), doc('elements.post'), doc('elements.change')],
    rows: [
      [doc('elements.epoch'), fmtIsoTime(pre?.epochIso ?? null), fmtIsoTime(post?.epochIso ?? null), '-'],
      ...ELEMENT_ROWS.map(([key, digits]) => [
        doc(`elements.${key}`),
        pre ? pre[key].toFixed(digits) : 'N/A',
        post ? post[key].toFixed(digits) : 'N/A',
        typeof deltas?.[key] === 'number' ? fmtSigned(deltas[key], digits) : 'N/A',
      ]),
    ],
  };
};

const burnsTable = (burns: BurnSummary[]): ReportTable => ({
  headers: ['#', doc('burns.epoch'), doc('burns.frame'), doc('burns.dvInput'), doc('burns.magnitude'), doc('burns.source'), doc('burns.label')],
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
  const notFound = doc('compare.notFound');
  const val = (e: ConjunctionEncounter | null, fn: (e: ConjunctionEncounter) => string): string => (e ? fn(e) : notFound);

  return {
    headers: [doc('common.quantity'), doc('compare.pre'), doc('compare.post')],
    rows: [
      [doc('encounter.tca'), val(pre, (e) => formatReportTime(new Date(e.tcaMs))), val(post, (e) => formatReportTime(new Date(e.tcaMs)))],
      [doc('compare.miss'), val(pre, (e) => fmtKm(e.missDistanceKm)), val(post, (e) => fmtKm(e.missDistanceKm))],
      [
        doc('compare.ric'),
        val(pre, (e) => `${fmtSigned(e.ricKm.radial)} / ${fmtSigned(e.ricKm.intrack)} / ${fmtSigned(e.ricKm.crosstrack)}`),
        val(post, (e) => `${fmtSigned(e.ricKm.radial)} / ${fmtSigned(e.ricKm.intrack)} / ${fmtSigned(e.ricKm.crosstrack)}`),
      ],
      [doc('compare.relSpeed'), val(pre, (e) => e.relativeSpeedKmS.toFixed(4)), val(post, (e) => e.relativeSpeedKmS.toFixed(4))],
      ['Pc', val(pre, (e) => formatPc(e.pc)), val(post, (e) => formatPc(e.pc))],
    ],
  };
};

/** Renders a maneuver analysis state as report data. */
export const maneuverReportFromState = (state: ConjunctionAnalysisState): ReportData => {
  const option = state.maneuverOptions[0];
  const sections: ReportData['sections'] = [{ title: doc('sections.objects'), table: objectsTable(state.objects) }];

  if (option?.burns && option.burns.length > 0) {
    sections.push({ title: fillDoc(doc('sections.burnsTotal'), { dv: option.totalDeltaVMs?.toFixed(4) ?? '' }), table: burnsTable(option.burns) });
  } else {
    sections.push({ title: doc('sections.burns'), table: { headers: [doc('burns.parameters')], rows: [[doc('burns.unavailable')]] } });
  }
  if (option) {
    sections.push({ title: doc('sections.meanElements'), table: meanElementsTable(option) });
  }
  if (option && (option.preEncounter || option.postEncounter)) {
    const secondary = state.objects.find((o) => o.role === 'secondary');

    sections.push({
      title: fillDoc(doc('sections.closeApproachTo'), { name: secondary?.name ?? doc('roles.secondary'), id: secondary?.noradId ?? '' }),
      table: encounterCompareTable(option.preEncounter, option.postEncounter),
    });
  }
  if (option?.screeningDiff) {
    sections.push({ title: doc('sections.diffSummary'), table: { headers: [doc('common.item'), doc('common.value')], rows: diffSummaryRows(option.screeningDiff) } });
  }
  const passes = missionImpactTable(state.missionImpact);

  if (passes) {
    sections.push({ title: fillDoc(doc('sections.sensorPasses'), { sensor: state.missionImpact.sensorName ?? '' }), table: passes });
  }

  const parent = state.objects.find((o) => o.role === 'parent');
  const analyst = state.objects.find((o) => o.role === 'analyst');

  return {
    filename: `maneuver-${parent?.noradId ?? 'parent'}-${analyst?.noradId ?? 'analyst'}`,
    header: headerBlock(doc('titles.maneuver'), state) + (state.notes.length > 0 ? `${state.notes.join('\n')}\n\n` : ''),
    sections,
    tableTitle: doc('sections.diffManeuver'),
    table: screeningDiffTable(option?.screeningDiff ?? null),
    emptyMessage: option?.screeningDiffUnavailableReason ?? doc('empty.noScreeningEvents'),
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
  const pre = input.objects?.pre ?? null;
  const post = input.objects?.post ?? null;

  if (pre) {
    state.objects.push(buildObjectSummary(pre, analystParentSccNum(pre) ? 'analyst' : 'primary', input.env));
  }
  if (post && post !== pre) {
    // A clone compared with its own parent takes the parent's uncertainty (see buildObjectSummary).
    const uncertaintyParent = pre && analystParentSccNum(post) === pre.sccNum ? pre : null;

    state.objects.push(buildObjectSummary(post, analystParentSccNum(post) ? 'analyst' : 'primary', input.env, uncertaintyParent));
  }
  if (input.diff.isWindowMismatch) {
    state.notes.push(doc('notes.windowMismatchCompare'));
  }

  return state;
};

export const screeningCompareReportFromState = (state: ConjunctionAnalysisState): ReportData => {
  const diff = state.screeningDiff;
  const sections: ReportData['sections'] = [];

  if (state.objects.length > 0) {
    sections.push({ title: doc('sections.objects'), table: objectsTable(state.objects) });
  }
  if (diff) {
    sections.push({ title: doc('sections.diffSummary'), table: { headers: [doc('common.item'), doc('common.value')], rows: diffSummaryRows(diff) } });
  }

  return {
    filename: `screening-compare-${diff?.preRun.primaryId ?? 'pre'}-${diff?.postRun.primaryId ?? 'post'}`,
    header: headerBlock(doc('titles.screeningCompare'), state) + (state.notes.length > 0 ? `${state.notes.join('\n')}\n\n` : ''),
    sections,
    tableTitle: doc('sections.diffCompare'),
    table: screeningDiffTable(diff),
    emptyMessage: doc('empty.noScreeningEvents'),
    json: state,
  };
};

export const generateScreeningCompareReport = (input: ScreeningCompareInput): ReportData => screeningCompareReportFromState(buildScreeningCompareState(input));
