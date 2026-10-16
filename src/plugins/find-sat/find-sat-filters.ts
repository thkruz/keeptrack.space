/**
 * Pure, DOM-free predicates used by Find Satellite to narrow a catalog list.
 *
 * These are deliberately decoupled from ServiceLocator, the DOM, and the
 * catalog so they can be unit-tested in isolation. The orbital-element filters
 * operate purely on the satellite objects; the look-angle filter takes a
 * caller-supplied resolver so the sensor/time/position lookup stays in the
 * plugin while the filtering logic lives here.
 */
import { Degrees, Hours, Kilometers, Minutes, PayloadStatus, Satellite, SpaceObjectType } from '@ootk/src/main';

/** Range-azimuth-elevation triple as produced by the plugin's resolver. */
export interface LookAngle {
  az: number;
  el: number;
  rng: number;
}

/** Resolves a satellite's current look angle, or null when it cannot be computed. */
export type LookAngleResolver = (sat: Satellite) => LookAngle | null;

/** Keep only objects whose numeric type is in the requested list. */
export const filterByObjType = (sats: Satellite[], objTypes: number[]): Satellite[] => sats.filter((sat) => objTypes.includes(sat.type));

/** Keep satellites whose inclination falls strictly inside (min, max). */
export const filterByInclination = (sats: Satellite[], min: Degrees, max: Degrees): Satellite[] => sats.filter((sat) => sat.inclination < max && sat.inclination > min);

/** Keep satellites whose right ascension falls strictly inside (min, max). */
export const filterByRightAscension = (sats: Satellite[], min: Degrees, max: Degrees): Satellite[] => sats.filter((sat) => sat.rightAscension < max && sat.rightAscension > min);

/** Keep satellites whose argument of perigee falls strictly inside (min, max). */
export const filterByArgOfPerigee = (sats: Satellite[], min: Degrees, max: Degrees): Satellite[] => sats.filter((sat) => sat.argOfPerigee < max && sat.argOfPerigee > min);

/** Keep satellites whose period falls strictly inside (min, max). */
export const filterByPeriod = (sats: Satellite[], min: Minutes, max: Minutes): Satellite[] => sats.filter((sat) => sat.period > min && sat.period < max);

/** Keep satellites whose RCS falls strictly inside (min, max); missing RCS is excluded. */
export const filterByRcs = (sats: Satellite[], min: number, max: number): Satellite[] => sats.filter((sat) => (sat?.rcs ?? -Infinity) > min && (sat?.rcs ?? Infinity) < max);

/**
 * Keep satellites whose TLE age (in hours, relative to `now`) is within
 * [min, max]. A negative minimum is clamped to zero.
 */
export const filterByTleAge = (sats: Satellite[], min: Hours, max: Hours, now: Date): Satellite[] => {
  const clampedMin = min < 0 ? 0 : min;

  return sats.filter((sat) => {
    const ageHours = sat.ageOfElset(now, 'hours');

    return ageHours >= clampedMin && ageHours <= max;
  });
};

/**
 * Keep satellites whose resolved look-angle axis falls within [min, max].
 * Non-satellite/non-missile objects and those the resolver cannot place are
 * dropped.
 */
export const filterByLookAngle = (sats: Satellite[], resolver: LookAngleResolver, axis: keyof LookAngle, min: number, max: number): Satellite[] =>
  sats.filter((sat) => {
    if (!sat.isSatellite() && !sat.isMissile()) {
      return false;
    }

    const rae = resolver(sat);

    if (!rae) {
      return false;
    }

    return rae[axis] >= min && rae[axis] <= max;
  });

/** Keep satellites whose perigee altitude (km) falls within [min, max]; missing perigee is excluded. */
export const filterByPerigee = (sats: Satellite[], min: Kilometers, max: Kilometers): Satellite[] =>
  sats.filter((sat) => typeof sat.perigee === 'number' && sat.perigee >= min && sat.perigee <= max);

/** Keep satellites whose apogee altitude (km) falls within [min, max]; missing apogee is excluded. */
export const filterByApogee = (sats: Satellite[], min: Kilometers, max: Kilometers): Satellite[] =>
  sats.filter((sat) => typeof sat.apogee === 'number' && sat.apogee >= min && sat.apogee <= max);

/** Coarse operational status buckets offered by the Operational Status filter. */
export type OperationalStatus = 'active' | 'inactive' | 'unknown';

/** Every bucket, in display order. */
export const OPERATIONAL_STATUSES: readonly OperationalStatus[] = ['active', 'inactive', 'unknown'];

/**
 * Buckets a catalog object's operational status.
 *
 * Payloads use the catalog `status` field (the same field behind the info
 * box's "Status" row): operational, partially operational, backup/standby,
 * spare and extended mission count as active; non-operational and decayed as
 * inactive; anything else as unknown. Rocket bodies and debris carry no status
 * code but can never be operational, so they are bucketed as inactive.
 */
export const getOperationalStatus = (sat: Satellite): OperationalStatus => {
  if (sat.type === SpaceObjectType.ROCKET_BODY || sat.type === SpaceObjectType.DEBRIS) {
    return 'inactive';
  }

  switch (sat.status) {
    case PayloadStatus.OPERATIONAL:
    case PayloadStatus.PARTIALLY_OPERATIONAL:
    case PayloadStatus.BACKUP_STANDBY:
    case PayloadStatus.SPARE:
    case PayloadStatus.EXTENDED_MISSION:
      return 'active';
    case PayloadStatus.NONOPERATIONAL:
    case PayloadStatus.DECAYED:
      return 'inactive';
    default:
      return 'unknown';
  }
};

/** Keep objects whose operational status bucket is in the requested list. */
export const filterByOperationalStatus = (sats: Satellite[], statuses: OperationalStatus[]): Satellite[] => sats.filter((sat) => statuses.includes(getOperationalStatus(sat)));
