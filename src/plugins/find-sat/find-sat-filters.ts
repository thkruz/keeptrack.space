/**
 * Pure, DOM-free predicates used by Find Satellite to narrow a catalog list.
 *
 * These are deliberately decoupled from ServiceLocator, the DOM, and the
 * catalog so they can be unit-tested in isolation. The orbital-element filters
 * operate purely on the satellite objects; the look-angle filter takes a
 * caller-supplied resolver so the sensor/time/position lookup stays in the
 * plugin while the filtering logic lives here.
 */
import { Degrees, Hours, Minutes, Satellite } from '@ootk/src/main';

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
