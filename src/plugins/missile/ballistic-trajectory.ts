/**
 * Analytic (Keplerian) ballistic missile trajectory.
 *
 * The rocket-integration solver in {@link MissileSimulation} was tuned for ICBMs and
 * has a high minimum-range floor: fired at a short regional target it cannot depress
 * the arc enough, so it overshoots, reaches near-orbital velocity, and truncates its
 * own coordinate table (the old IRBM/SRBM scenarios were full of NaN tails). This
 * module sidesteps that entirely by producing the trajectory in closed form.
 *
 * The path is the vacuum minimum-energy ellipse between two points on a spherical,
 * non-rotating Earth (focus at Earth's center). That is the physically correct shape
 * a ballistic missile flies on a minimum-energy shot, and it is well-behaved at every
 * range: ~122 km apogee for a 430 km SRBM, ~1200 km for a 9400 km ICBM. It always
 * lands exactly on the target and never diverges, so it is the trajectory source the
 * scenario generator uses for scripted raids.
 *
 * Output matches {@link MissileTrajectory}: 1 Hz samples (one per second of flight),
 * which is the cadence the position cruncher assumes (index -> seconds).
 */
import { Degrees, Kilometers } from '@ootk/src/main';
import { MissileTrajectory } from './missile-types';

const EARTH_RADIUS_KM = 6371;
const MU_KM3_S2 = 398_600.4418; // Earth gravitational parameter (km^3/s^2)
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Options controlling the shape of the analytic trajectory. */
export interface BallisticOptions {
  /**
   * Loft multiplier on the minimum-energy apogee (1 = minimum energy). Values > 1
   * raise the arc (a lofted shot); values in (0,1) depress it. Clamped to keep the
   * trajectory physical. Defaults to 1.
   */
  loftFactor?: number;
}

/** Convert geodetic lat/lon (deg) to an ECEF unit vector. */
const toUnitVec = (latDeg: number, lonDeg: number): [number, number, number] => {
  const lat = latDeg * DEG2RAD;
  const lon = lonDeg * DEG2RAD;
  const cosLat = Math.cos(lat);

  return [cosLat * Math.cos(lon), cosLat * Math.sin(lon), Math.sin(lat)];
};

/** Convert an ECEF unit vector back to geodetic lat/lon (deg). */
const toLatLon = (v: [number, number, number]): [number, number] => {
  const [x, y, z] = v;

  return [Math.asin(Math.max(-1, Math.min(1, z))) * RAD2DEG, Math.atan2(y, x) * RAD2DEG];
};

/** Spherical linear interpolation between two unit vectors by fraction f, given their angle. */
const slerp = (a: [number, number, number], b: [number, number, number], f: number, omega: number): [number, number, number] => {
  if (omega < 1e-9) {
    return a;
  }
  const s = Math.sin(omega);
  const wa = Math.sin((1 - f) * omega) / s;
  const wb = Math.sin(f * omega) / s;

  return [wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2]];
};

/**
 * Semi-major axis of the ellipse through both surface points as a function of
 * eccentricity, for a trajectory whose apogee sits at the midpoint. Derived from the
 * orbit equation r = a(1-e^2)/(1 + e*cos(nu)) evaluated at the surface true anomaly
 * nu = 180deg - beta (where beta is the half-range central angle).
 */
const semiMajorForEccentricity = (e: number, cosBeta: number): number => (EARTH_RADIUS_KM * (1 - e * cosBeta)) / (1 - e * e);

/**
 * Find the minimum-energy eccentricity for a given half-range angle. Minimum launch
 * energy == minimum semi-major axis, so this minimizes {@link semiMajorForEccentricity}
 * over e in (0,1) with a coarse scan refined by a local bisection.
 */
const minEnergyEccentricity = (cosBeta: number): number => {
  let best = 0.5;
  let bestA = Infinity;

  for (let e = 0.01; e < 0.999; e += 0.01) {
    const a = semiMajorForEccentricity(e, cosBeta);

    if (a < bestA) {
      bestA = a;
      best = e;
    }
  }

  // Refine around the coarse minimum.
  let lo = Math.max(0.001, best - 0.01);
  let hi = Math.min(0.999, best + 0.01);

  for (let iter = 0; iter < 40; iter++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;

    if (semiMajorForEccentricity(m1, cosBeta) < semiMajorForEccentricity(m2, cosBeta)) {
      hi = m2;
    } else {
      lo = m1;
    }
  }

  return (lo + hi) / 2;
};

/** Solve Kepler's equation M = E - e*sin(E) for the eccentric anomaly E (radians). */
const solveEccentricAnomaly = (M: number, e: number): number => {
  let E = M;

  for (let i = 0; i < 60; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));

    E -= dE;
    if (Math.abs(dE) < 1e-11) {
      break;
    }
  }

  return E;
};

/** True anomaly (radians) from eccentric anomaly. */
const trueAnomalyFromE = (E: number, e: number): number => 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));

/** Eccentric anomaly (radians) from true anomaly. */
const eccentricAnomalyFromNu = (nu: number, e: number): number => 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));

/**
 * Generate a minimum-energy ballistic trajectory between two surface points.
 *
 * Returns 1 Hz samples from launch to impact. The trajectory always terminates exactly
 * at the target, so no downstream range/apogee validation is needed - but callers may
 * still assert list-length parity and a finite, sane apogee (see the unit tests).
 *
 * Throws when the two points are closer than ~1 km apart (degenerate, no arc to fly).
 */
export const generateBallisticTrajectory = (launchLat: number, launchLon: number, targetLat: number, targetLon: number, opts: BallisticOptions = {}): MissileTrajectory => {
  const a3 = toUnitVec(launchLat, launchLon);
  const b3 = toUnitVec(targetLat, targetLon);
  const dot = Math.max(-1, Math.min(1, a3[0] * b3[0] + a3[1] * b3[1] + a3[2] * b3[2]));
  const centralAngle = Math.acos(dot); // total great-circle angle between the points

  if (centralAngle < 1e-4) {
    throw new Error('generateBallisticTrajectory: launch and target are effectively coincident.');
  }

  const beta = centralAngle / 2; // half-range central angle
  const cosBeta = Math.cos(beta);

  let e = minEnergyEccentricity(cosBeta);
  const loft = opts.loftFactor ?? 1;

  // Loft/depress by nudging eccentricity toward the surface points' geometric bound.
  // Higher e (up to just under the value that would dip perigee to the surface point)
  // raises apogee; lower e depresses it. Kept strictly inside (0,1) to stay physical.
  if (loft !== 1) {
    e = Math.max(0.02, Math.min(0.985, e * loft));
  }

  const semiMajor = semiMajorForEccentricity(e, cosBeta);
  const apogeeRadius = semiMajor * (1 + e);
  const apogeeAltitudeKm = apogeeRadius - EARTH_RADIUS_KM;

  // Surface points sit at true anomaly 180deg -/+ beta; the vehicle climbs from the first
  // to apogee (180deg) and descends to the second. Integrate flight time via Kepler.
  const nuStart = Math.PI - beta;
  const nuEnd = Math.PI + beta;
  const eStart = eccentricAnomalyFromNu(nuStart, e);
  const eEnd = eccentricAnomalyFromNu(nuEnd, e);
  const mStart = eStart - e * Math.sin(eStart);
  const mEnd = eEnd - e * Math.sin(eEnd);
  const meanMotion = Math.sqrt(MU_KM3_S2 / semiMajor ** 3); // rad/s
  const flightTimeSec = (mEnd - mStart) / meanMotion;
  const steps = Math.max(2, Math.round(flightTimeSec));

  const latList: Degrees[] = [];
  const lonList: Degrees[] = [];
  const altList: Kilometers[] = [];

  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const M = mStart + (mEnd - mStart) * frac;
    const E = solveEccentricAnomaly(M, e);
    const nu = trueAnomalyFromE(E, e);
    const r = semiMajor * (1 - e * Math.cos(E)); // orbit radius at this point

    // Progress along the ground track is the change in true anomaly (== central angle)
    // from the launch point, as a fraction of the total range angle.
    let groundFrac = (nu - nuStart) / (nuEnd - nuStart);

    groundFrac = Math.max(0, Math.min(1, groundFrac));

    const pos = slerp(a3, b3, groundFrac, centralAngle);
    const [lat, lon] = toLatLon(pos);

    latList.push(lat as Degrees);
    lonList.push(lon as Degrees);
    altList.push(Math.max(0, r - EARTH_RADIUS_KM) as Kilometers);
  }

  return {
    latList,
    lonList,
    altList,
    maxAltitudeKm: apogeeAltitudeKm,
  };
};
