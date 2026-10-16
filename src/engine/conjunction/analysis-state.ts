/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * analysis-state.ts defines {@link ConjunctionAnalysisState}, the machine-readable
 * record of a conjunction or maneuver analysis. The OSS Conjunction Report and
 * Maneuver Report (src/plugins/reports) serialize to it for their JSON output, and
 * a composed report renderer (Pro) renders from it, so every number a report
 * prints lives here with its units and conventions stated.
 *
 * Plain JSON only: ISO 8601 UTC strings for times, numbers in the units named in
 * each field, `null` where a value could not be computed. No class instances, so
 * a state survives JSON.stringify / JSON.parse unchanged.
 *
 * Bump {@link CONJUNCTION_ANALYSIS_SCHEMA_VERSION} on any breaking change (renamed
 * or removed field, changed unit or meaning). Adding an optional field is not a
 * breaking change.
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

/** Current schema version of {@link ConjunctionAnalysisState}. */
export const CONJUNCTION_ANALYSIS_SCHEMA_VERSION = 1;

/**
 * Sign convention every RIC vector in the state uses. Matches ootk
 * `RIC.fromJ2000(secondary, primary)` and the Debris Screening table.
 */
export const RIC_CONVENTION = 'Secondary minus primary, expressed in the primary RIC frame (R = radial/up, I = in-track/along velocity, C = cross-track/orbit normal).' as const;

/** Which report produced the state. */
export type AnalysisKind = 'conjunction' | 'maneuver' | 'screening-compare';

/** Role an object plays in the analysis. */
export type AnalysisObjectRole = 'primary' | 'secondary' | 'parent' | 'analyst';

/** Risk bands, from the Pc thresholds the Debris Screening tool uses. */
export type ScreeningRiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

/** A radial / in-track / cross-track triple (km, or km/s for velocities). */
export interface RicVector {
  radial: number;
  intrack: number;
  crosstrack: number;
}

/** TLE (SGP4 mean) elements, the same convention the sat info box prints. */
export interface MeanElements {
  /** TLE epoch, ISO 8601 UTC. */
  epochIso: string | null;
  inclinationDeg: number;
  raanDeg: number;
  eccentricity: number;
  argPerigeeDeg: number;
  meanAnomalyDeg: number;
  meanMotionRevPerDay: number;
  periodMin: number;
  apogeeKm: number;
  perigeeKm: number;
  semiMajorAxisKm: number;
  bstar: number;
}

/** One object in the analysis. */
export interface AnalysisObjectSummary {
  role: AnalysisObjectRole;
  name: string;
  /** NORAD catalog number as a string (analyst objects carry their analyst number). */
  noradId: string | null;
  /** COSPAR international designator (e.g. 2013-008A), null when unknown. */
  cosparId: string | null;
  /** TLE epoch, ISO 8601 UTC. */
  tleEpochIso: string | null;
  /** Hours from the TLE epoch to the analysis epoch (positive = TLE older than the analysis epoch). */
  gpAgeHours: number | null;
  /**
   * 1-sigma position uncertainty (km) of the covariance the Pc uses for this
   * object, in its own RIC frame, at the TLE epoch (1-sigma, before confidence scaling; capped).
   */
  ricSigmasKm: RicVector | null;
  meanElements: MeanElements | null;
  /** True for a KeepTrack analyst object (not a cataloged object). */
  isAnalystObject: boolean;
  /** NORAD number of the cataloged object this one was derived from, if any. */
  derivedFromNoradId: string | null;
}

/** Everything the probability of collision was computed from. */
export interface PcInputs {
  /** Human-readable method name. */
  method: string;
  primaryHardBodyRadiusKm: number;
  secondaryHardBodyRadiusKm: number;
  /** Sum of the two radii, the radius of the combined hard-body circle. */
  combinedHardBodyRadiusKm: number;
  /** Where the covariance comes from. */
  covarianceSource: string;
  /** Sigma multiplier k applied to the covariance (C = k^2 S). */
  covarianceConfidenceLevel: number;
  /** 1-sigma caps (km) applied per axis, [radial, in-track, cross-track]. */
  sigmaCapsKm: [number, number, number];
}

/** The refined close approach between two objects. */
export interface ConjunctionEncounter {
  primaryNoradId: string | null;
  secondaryNoradId: string | null;
  /** Time of closest approach, ISO 8601 UTC. */
  tcaIso: string;
  /** Time of closest approach, ms since the Unix epoch. */
  tcaMs: number;
  missDistanceKm: number;
  /** Signed relative position at TCA (km), see {@link RIC_CONVENTION}. */
  ricKm: RicVector;
  /** Signed relative velocity at TCA (km/s), same frame and sign as {@link ricKm}. */
  ricVelocityKmS: RicVector | null;
  relativeSpeedKmS: number;
  /** Probability of collision, null when it could not be computed. */
  pc: number | null;
  riskLevel: ScreeningRiskLevel;
  pcInputs: PcInputs;
  /** The window that was searched for the closest approach. */
  searchWindow: {
    startIso: string;
    endIso: string;
    halfWidthHours: number;
  };
  ricConvention: string;
}

/** One sample of the relative-geometry time series around TCA. */
export interface RelativeGeometrySample {
  /** Seconds from TCA (negative = before). */
  offsetSec: number;
  timeIso: string;
  rangeKm: number;
  ricKm: RicVector;
  relativeSpeedKmS: number;
}

/** One impulsive burn, as recorded by the Maneuver tool. */
export interface BurnSummary {
  epochIso: string;
  /** Frame the delta-V was entered in. */
  frame: 'eci' | 'ric' | 'unknown';
  /** Delta-V components as entered (m/s), [x, y, z] or [R, I, C]. */
  inputDeltaVMs: [number, number, number];
  magnitudeMs: number;
  source: string;
  label: string | null;
}

/** One screening event (a row from a Debris Screening run). */
export interface ScreeningEventSummary {
  secondaryId: string;
  secondaryName: string;
  tcaIso: string;
  tcaMs: number;
  missDistanceKm: number;
  pc: number | null;
  riskLevel: ScreeningRiskLevel;
}

/**
 * How an event changed between the pre-maneuver and post-maneuver screens:
 * - `introduced`: of concern after, not of concern (or absent) before
 * - `removed`: of concern before, not of concern (or absent) after
 * - `unchanged`: present in both screens, concern status unchanged
 * - `appeared`: only in the post screen, below the concern threshold
 * - `dropped`: only in the pre screen, below the concern threshold
 */
export type ScreeningDiffStatus = 'introduced' | 'removed' | 'unchanged' | 'appeared' | 'dropped';

export interface ScreeningDiffEntry {
  status: ScreeningDiffStatus;
  secondaryId: string;
  secondaryName: string;
  pre: ScreeningEventSummary | null;
  post: ScreeningEventSummary | null;
  /** post.miss - pre.miss (km) when both exist. */
  missDeltaKm: number | null;
  /** Risk band movement when both exist. */
  riskChange: 'up' | 'down' | 'same' | null;
}

/** The comparison of two screening runs (pre vs post maneuver, or any two runs). */
export interface ScreeningDiff {
  source: 'debris-screening-runs' | 'provided';
  preRun: { primaryId: string; startIso: string | null; endIso: string | null; eventCount: number };
  postRun: { primaryId: string; startIso: string | null; endIso: string | null; eventCount: number };
  /** Lowest risk band that counts as "of concern" for introduced/removed. */
  concernThreshold: ScreeningRiskLevel;
  /** Max TCA difference (ms) for two rows with the same secondary to count as the same event. */
  tcaMatchToleranceMs: number;
  /** Secondaries left out of the diff (the parent, the analyst objects themselves). */
  excludedSecondaryIds: string[];
  /** True when the two runs did not cover the same window. */
  isWindowMismatch: boolean;
  counts: Record<ScreeningDiffStatus, number>;
  entries: ScreeningDiffEntry[];
}

/** One maneuver option: an analyst object derived from a parent by burns. */
export interface ManeuverOption {
  id: string;
  label: string;
  parentNoradId: string | null;
  analystNoradId: string | null;
  /** Null when the burn parameters are not recoverable. */
  burns: BurnSummary[] | null;
  burnParametersAvailable: boolean;
  totalDeltaVMs: number | null;
  preMeanElements: MeanElements | null;
  postMeanElements: MeanElements | null;
  /** post - pre for each numeric element, null when either side is missing. */
  meanElementDeltas: Partial<Record<keyof Omit<MeanElements, 'epochIso'>, number>> | null;
  /** Close approach to the selected secondary before (parent) and after (analyst), when a secondary is selected. */
  preEncounter: ConjunctionEncounter | null;
  postEncounter: ConjunctionEncounter | null;
  screeningDiff: ScreeningDiff | null;
  /** Why {@link screeningDiff} is null. */
  screeningDiffUnavailableReason: string | null;
}

/** A sensor pass window. */
export interface PassWindow {
  noradId: string | null;
  aosIso: string;
  losIso: string;
  maxElevationDeg: number;
}

/** Mission-impact block. Stage A fills the sensor passes; the rest is a placeholder for the composed report. */
export interface MissionImpact {
  sensorName: string | null;
  /** Pass windows over the sensor in the analysis window, null when no sensor is selected. */
  passWindows: PassWindow[] | null;
  notes: string[];
}

/** The complete machine-readable analysis state. */
export interface ConjunctionAnalysisState {
  schemaVersion: typeof CONJUNCTION_ANALYSIS_SCHEMA_VERSION;
  kind: AnalysisKind;
  /** Simulation time the analysis was generated at, ISO 8601 UTC. */
  generatedAtIso: string;
  /** Wall-clock time the analysis was generated, ISO 8601 UTC. */
  generatedWallClockIso: string;
  /** KeepTrack version (`__VERSION__`). */
  appVersion: string;
  /** Epoch the GP ages and search windows are measured from, ISO 8601 UTC. */
  analysisEpochIso: string;
  ricConvention: string;
  objects: AnalysisObjectSummary[];
  encounter: ConjunctionEncounter | null;
  relativeGeometry: RelativeGeometrySample[];
  maneuverOptions: ManeuverOption[];
  /** A standalone screening comparison (kind 'screening-compare'). */
  screeningDiff: ScreeningDiff | null;
  missionImpact: MissionImpact;
  notes: string[];
}

// =============================================================================
// Runtime validation
// =============================================================================

const RISK_LEVELS: readonly ScreeningRiskLevel[] = ['critical', 'high', 'medium', 'low', 'unknown'];
const DIFF_STATUSES: readonly ScreeningDiffStatus[] = ['introduced', 'removed', 'unchanged', 'appeared', 'dropped'];
const KINDS: readonly AnalysisKind[] = ['conjunction', 'maneuver', 'screening-compare'];
const ROLES: readonly AnalysisObjectRole[] = ['primary', 'secondary', 'parent', 'analyst'];

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isIso = (v: unknown): boolean => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/**
 * Collects schema errors into a list instead of throwing, so a caller (or a test)
 * sees every problem at once.
 */
class Checker {
  readonly errors: string[] = [];

  fail(path: string, msg: string): void {
    this.errors.push(`${path}: ${msg}`);
  }

  num(o: Rec, key: string, path: string, nullable = false): void {
    const v = o[key];

    if (!(isNum(v) || (nullable && v === null))) {
      this.fail(`${path}.${key}`, nullable ? 'expected number or null' : 'expected number');
    }
  }

  str(o: Rec, key: string, path: string, nullable = false): void {
    const v = o[key];

    if (!(typeof v === 'string' || (nullable && v === null))) {
      this.fail(`${path}.${key}`, nullable ? 'expected string or null' : 'expected string');
    }
  }

  iso(o: Rec, key: string, path: string, nullable = false): void {
    const v = o[key];

    if (!(isIso(v) || (nullable && v === null))) {
      this.fail(`${path}.${key}`, nullable ? 'expected ISO date string or null' : 'expected ISO date string');
    }
  }

  oneOf(o: Rec, key: string, path: string, allowed: readonly string[]): void {
    if (!allowed.includes(o[key] as string)) {
      this.fail(`${path}.${key}`, `expected one of ${allowed.join(', ')}`);
    }
  }

  ric(v: unknown, path: string, nullable = false): void {
    if (nullable && v === null) {
      return;
    }
    if (!isRec(v)) {
      this.fail(path, 'expected RIC object');

      return;
    }
    this.num(v, 'radial', path);
    this.num(v, 'intrack', path);
    this.num(v, 'crosstrack', path);
  }

  meanElements(v: unknown, path: string): void {
    if (v === null) {
      return;
    }
    if (!isRec(v)) {
      this.fail(path, 'expected mean elements object or null');

      return;
    }
    this.iso(v, 'epochIso', path, true);
    for (const key of [
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
    ]) {
      this.num(v, key, path);
    }
  }

  object(v: unknown, path: string): void {
    if (!isRec(v)) {
      this.fail(path, 'expected object summary');

      return;
    }
    this.oneOf(v, 'role', path, ROLES);
    this.str(v, 'name', path);
    this.str(v, 'noradId', path, true);
    this.str(v, 'cosparId', path, true);
    this.iso(v, 'tleEpochIso', path, true);
    this.num(v, 'gpAgeHours', path, true);
    this.ric(v.ricSigmasKm, `${path}.ricSigmasKm`, true);
    this.meanElements(v.meanElements, `${path}.meanElements`);
    if (typeof v.isAnalystObject !== 'boolean') {
      this.fail(`${path}.isAnalystObject`, 'expected boolean');
    }
    this.str(v, 'derivedFromNoradId', path, true);
  }

  encounter(v: unknown, path: string): void {
    if (v === null) {
      return;
    }
    if (!isRec(v)) {
      this.fail(path, 'expected encounter or null');

      return;
    }
    this.iso(v, 'tcaIso', path);
    this.num(v, 'tcaMs', path);
    this.num(v, 'missDistanceKm', path);
    this.ric(v.ricKm, `${path}.ricKm`);
    this.ric(v.ricVelocityKmS, `${path}.ricVelocityKmS`, true);
    this.num(v, 'relativeSpeedKmS', path);
    this.num(v, 'pc', path, true);
    this.oneOf(v, 'riskLevel', path, RISK_LEVELS);
    this.str(v, 'ricConvention', path);
    const pc = v.pcInputs;

    if (isRec(pc)) {
      this.str(pc, 'method', `${path}.pcInputs`);
      this.num(pc, 'primaryHardBodyRadiusKm', `${path}.pcInputs`);
      this.num(pc, 'secondaryHardBodyRadiusKm', `${path}.pcInputs`);
      this.num(pc, 'combinedHardBodyRadiusKm', `${path}.pcInputs`);
      this.str(pc, 'covarianceSource', `${path}.pcInputs`);
      this.num(pc, 'covarianceConfidenceLevel', `${path}.pcInputs`);
      if (!Array.isArray(pc.sigmaCapsKm) || pc.sigmaCapsKm.length !== 3 || !pc.sigmaCapsKm.every(isNum)) {
        this.fail(`${path}.pcInputs.sigmaCapsKm`, 'expected [number, number, number]');
      }
    } else {
      this.fail(`${path}.pcInputs`, 'expected object');
    }
    const win = v.searchWindow;

    if (isRec(win)) {
      this.iso(win, 'startIso', `${path}.searchWindow`);
      this.iso(win, 'endIso', `${path}.searchWindow`);
      this.num(win, 'halfWidthHours', `${path}.searchWindow`);
    } else {
      this.fail(`${path}.searchWindow`, 'expected object');
    }
  }

  screeningEvent(v: unknown, path: string): void {
    if (v === null) {
      return;
    }
    if (!isRec(v)) {
      this.fail(path, 'expected screening event or null');

      return;
    }
    this.str(v, 'secondaryId', path);
    this.str(v, 'secondaryName', path);
    this.iso(v, 'tcaIso', path);
    this.num(v, 'tcaMs', path);
    this.num(v, 'missDistanceKm', path);
    this.num(v, 'pc', path, true);
    this.oneOf(v, 'riskLevel', path, RISK_LEVELS);
  }

  diff(v: unknown, path: string): void {
    if (v === null) {
      return;
    }
    if (!isRec(v)) {
      this.fail(path, 'expected screening diff or null');

      return;
    }
    this.oneOf(v, 'concernThreshold', path, RISK_LEVELS);
    this.num(v, 'tcaMatchToleranceMs', path);
    if (!Array.isArray(v.excludedSecondaryIds)) {
      this.fail(`${path}.excludedSecondaryIds`, 'expected array');
    }
    for (const run of ['preRun', 'postRun']) {
      const r = v[run];

      if (isRec(r)) {
        this.str(r, 'primaryId', `${path}.${run}`);
        this.iso(r, 'startIso', `${path}.${run}`, true);
        this.iso(r, 'endIso', `${path}.${run}`, true);
        this.num(r, 'eventCount', `${path}.${run}`);
      } else {
        this.fail(`${path}.${run}`, 'expected object');
      }
    }
    if (!isRec(v.counts)) {
      this.fail(`${path}.counts`, 'expected object');
    }
    if (!Array.isArray(v.entries)) {
      this.fail(`${path}.entries`, 'expected array');

      return;
    }
    v.entries.forEach((e, i) => {
      const p = `${path}.entries[${i}]`;

      if (!isRec(e)) {
        this.fail(p, 'expected entry');

        return;
      }
      this.oneOf(e, 'status', p, DIFF_STATUSES);
      this.str(e, 'secondaryId', p);
      this.screeningEvent(e.pre, `${p}.pre`);
      this.screeningEvent(e.post, `${p}.post`);
      this.num(e, 'missDeltaKm', p, true);
      if (e.pre === null && e.post === null) {
        this.fail(p, 'entry has neither a pre nor a post event');
      }
    });
  }

  maneuverOption(v: unknown, path: string): void {
    if (!isRec(v)) {
      this.fail(path, 'expected maneuver option');

      return;
    }
    this.str(v, 'id', path);
    this.str(v, 'label', path);
    this.str(v, 'parentNoradId', path, true);
    this.str(v, 'analystNoradId', path, true);
    if (typeof v.burnParametersAvailable !== 'boolean') {
      this.fail(`${path}.burnParametersAvailable`, 'expected boolean');
    }
    if (v.burns !== null) {
      if (Array.isArray(v.burns)) {
        v.burns.forEach((b, i) => {
          const p = `${path}.burns[${i}]`;

          if (!isRec(b)) {
            this.fail(p, 'expected burn');

            return;
          }
          this.iso(b, 'epochIso', p);
          this.num(b, 'magnitudeMs', p);
          if (!Array.isArray(b.inputDeltaVMs) || b.inputDeltaVMs.length !== 3) {
            this.fail(`${p}.inputDeltaVMs`, 'expected [number, number, number]');
          }
        });
      } else {
        this.fail(`${path}.burns`, 'expected array or null');
      }
    }
    this.num(v, 'totalDeltaVMs', path, true);
    this.meanElements(v.preMeanElements, `${path}.preMeanElements`);
    this.meanElements(v.postMeanElements, `${path}.postMeanElements`);
    this.encounter(v.preEncounter, `${path}.preEncounter`);
    this.encounter(v.postEncounter, `${path}.postEncounter`);
    this.diff(v.screeningDiff, `${path}.screeningDiff`);
    this.str(v, 'screeningDiffUnavailableReason', path, true);
  }
}

/**
 * Structural check of a parsed {@link ConjunctionAnalysisState}. Returns every
 * violation as `path: message`; an empty array means the value is valid.
 */
export const validateConjunctionAnalysisState = (value: unknown): string[] => {
  const c = new Checker();

  if (!isRec(value)) {
    return ['$: expected object'];
  }

  if (value.schemaVersion !== CONJUNCTION_ANALYSIS_SCHEMA_VERSION) {
    c.fail('$.schemaVersion', `expected ${CONJUNCTION_ANALYSIS_SCHEMA_VERSION}`);
  }
  c.oneOf(value, 'kind', '$', KINDS);
  c.iso(value, 'generatedAtIso', '$');
  c.iso(value, 'generatedWallClockIso', '$');
  c.str(value, 'appVersion', '$');
  c.iso(value, 'analysisEpochIso', '$');
  c.str(value, 'ricConvention', '$');

  if (Array.isArray(value.objects)) {
    value.objects.forEach((o, i) => {
      c.object(o, `$.objects[${i}]`);
    });
  } else {
    c.fail('$.objects', 'expected array');
  }

  c.encounter(value.encounter, '$.encounter');

  if (Array.isArray(value.relativeGeometry)) {
    value.relativeGeometry.forEach((s, i) => {
      const p = `$.relativeGeometry[${i}]`;

      if (!isRec(s)) {
        c.fail(p, 'expected sample');

        return;
      }
      c.num(s, 'offsetSec', p);
      c.iso(s, 'timeIso', p);
      c.num(s, 'rangeKm', p);
      c.ric(s.ricKm, `${p}.ricKm`);
      c.num(s, 'relativeSpeedKmS', p);
    });
  } else {
    c.fail('$.relativeGeometry', 'expected array');
  }

  if (Array.isArray(value.maneuverOptions)) {
    value.maneuverOptions.forEach((m, i) => {
      c.maneuverOption(m, `$.maneuverOptions[${i}]`);
    });
  } else {
    c.fail('$.maneuverOptions', 'expected array');
  }

  c.diff(value.screeningDiff, '$.screeningDiff');

  const mi = value.missionImpact;

  if (isRec(mi)) {
    c.str(mi, 'sensorName', '$.missionImpact', true);
    if (mi.passWindows !== null && !Array.isArray(mi.passWindows)) {
      c.fail('$.missionImpact.passWindows', 'expected array or null');
    }
    if (!Array.isArray(mi.notes)) {
      c.fail('$.missionImpact.notes', 'expected array');
    }
  } else {
    c.fail('$.missionImpact', 'expected object');
  }

  if (!Array.isArray(value.notes)) {
    c.fail('$.notes', 'expected array');
  }

  return c.errors;
};

/** Type guard over {@link validateConjunctionAnalysisState}. */
export const isConjunctionAnalysisState = (value: unknown): value is ConjunctionAnalysisState => validateConjunctionAnalysisState(value).length === 0;
