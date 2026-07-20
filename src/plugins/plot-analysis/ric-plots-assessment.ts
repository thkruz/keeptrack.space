/**
 * ric-plots-assessment.ts - Pure classifier for the relationship between the
 * primary and secondary satellite shown in the RIC plot.
 *
 * Mirrors the neighborhood-watch `classifyStatus` pattern: a side-effect-free
 * function with named thresholds, returning a typed category plus the metrics
 * that drove it so the UI can show the reasoning. DOM-free and t7e-free (the
 * plugin resolves the labels).
 */

/** Relationship of the secondary satellite to the primary. */
export type RicRelationship = 'closely-spaced' | 'co-orbital' | 'co-planar' | 'unrelated' | 'unknown';

export interface RicAssessmentInput {
  /** Primary orbit (degrees / minutes). */
  inc1: number;
  raan1: number;
  period1: number;
  /** Secondary orbit (degrees / minutes). */
  inc2: number;
  raan2: number;
  period2: number;
  /** Largest secondary-to-primary range over the plotted window (km). */
  maxRangeKm: number;
}

export interface RicAssessment {
  relationship: RicRelationship;
  /** Dihedral angle between the two orbit planes (degrees). */
  planeAngleDeg: number;
  /** Period difference as a percent of the mean period. */
  periodDiffPct: number;
  /** Largest range over the window (km), echoed for display. */
  maxRangeKm: number;
}

/** Stays within this range over the whole window -> physically bound together. */
const CLOSELY_SPACED_MAX_RANGE_KM = 100;
/** Orbit planes within this dihedral angle count as the same plane. */
const CO_PLANAR_ANGLE_DEG = 2;
/** Periods within this percent of each other count as the same orbit size. */
const CO_ORBITAL_PERIOD_PCT = 2;

const DEG2RAD = Math.PI / 180;

/**
 * Dihedral angle (degrees) between two orbit planes, from each orbit's
 * angular-momentum unit vector n = [sin i sin Ω, -sin i cos Ω, cos i].
 */
export const planeAngleDeg = (inc1: number, raan1: number, inc2: number, raan2: number): number => {
  const i1 = inc1 * DEG2RAD;
  const o1 = raan1 * DEG2RAD;
  const i2 = inc2 * DEG2RAD;
  const o2 = raan2 * DEG2RAD;

  const n1 = [Math.sin(i1) * Math.sin(o1), -Math.sin(i1) * Math.cos(o1), Math.cos(i1)];
  const n2 = [Math.sin(i2) * Math.sin(o2), -Math.sin(i2) * Math.cos(o2), Math.cos(i2)];

  const dot = n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2];
  const clamped = Math.min(1, Math.max(-1, dot));

  return Math.acos(clamped) / DEG2RAD;
};

/**
 * Classify the secondary relative to the primary.
 * - `closely-spaced`: stays within {@link CLOSELY_SPACED_MAX_RANGE_KM} the whole window.
 * - `co-orbital`: same plane and same period (bound, periodic relative motion).
 * - `co-planar`: same plane but a different period/altitude.
 * - `unrelated`: planes differ.
 */
export const assessRelationship = (input: RicAssessmentInput): RicAssessment => {
  const { inc1, raan1, period1, inc2, raan2, period2, maxRangeKm } = input;

  const finite = [inc1, raan1, period1, inc2, raan2, period2].every((v) => Number.isFinite(v));
  const planeAngle = finite ? planeAngleDeg(inc1, raan1, inc2, raan2) : NaN;
  const meanPeriod = (period1 + period2) / 2;
  const periodDiffPct = finite && meanPeriod > 0 ? (Math.abs(period1 - period2) / meanPeriod) * 100 : NaN;

  const base = { planeAngleDeg: planeAngle, periodDiffPct, maxRangeKm };

  if (!finite) {
    return { ...base, relationship: 'unknown' };
  }

  if (Number.isFinite(maxRangeKm) && maxRangeKm < CLOSELY_SPACED_MAX_RANGE_KM) {
    return { ...base, relationship: 'closely-spaced' };
  }

  if (planeAngle < CO_PLANAR_ANGLE_DEG) {
    return {
      ...base,
      relationship: periodDiffPct < CO_ORBITAL_PERIOD_PCT ? 'co-orbital' : 'co-planar',
    };
  }

  return { ...base, relationship: 'unrelated' };
};
