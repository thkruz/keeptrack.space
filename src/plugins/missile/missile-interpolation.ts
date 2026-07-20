/**
 * Smooth sampling of a ballistic missile trajectory.
 *
 * Missile trajectories are stored as parallel lat/lon/alt lists with one sample
 * per second. Reading the nearest integer-second sample makes the rendered dot
 * jump once per second (a visible staircase). This interpolates linearly between
 * the two bounding samples by the fractional elapsed time so the motion is
 * continuous. Pure and DOM-free so it is shared by the position-cruncher worker
 * (the rendered dots) and `MissileObject.eci()` (info box / camera follow).
 */

export interface InterpolatedSample {
  lat: number;
  lon: number;
  alt: number;
}

/**
 * Interpolate a 1-second-sampled trajectory at an arbitrary time.
 *
 * Clamps outside the trajectory: before launch holds at the pad (sample 0), after
 * impact holds at the final sample. Longitude is blended along the shorter arc so
 * the (rare) antimeridian crossing does not spin the dot the long way around.
 *
 * @param latList Per-second latitudes (deg).
 * @param lonList Per-second longitudes (deg).
 * @param altList Per-second altitudes (km).
 * @param startTimeMs Launch time (ms since epoch); sample 0 is at this instant.
 * @param nowMs Current time (ms since epoch).
 */
export const interpolateMissileSample = (latList: number[], lonList: number[], altList: number[], startTimeMs: number, nowMs: number): InterpolatedSample => {
  const lastIdx = altList.length - 1;
  const elapsedSec = Math.max(0, Math.min((nowMs - startTimeMs) / 1000, lastIdx));
  const i0 = Math.floor(elapsedSec);
  const i1 = Math.min(i0 + 1, lastIdx);
  const frac = elapsedSec - i0;

  let lonStep = lonList[i1] - lonList[i0];

  if (lonStep > 180) {
    lonStep -= 360;
  } else if (lonStep < -180) {
    lonStep += 360;
  }

  return {
    lat: latList[i0] + (latList[i1] - latList[i0]) * frac,
    lon: lonList[i0] + lonStep * frac,
    alt: altList[i0] + (altList[i1] - altList[i0]) * frac,
  };
};

export interface OrbitLineSegment {
  /** Trajectory sample index of the line vertex at the start of the bracketing segment. */
  i0: number;
  /** Trajectory sample index of the line vertex at the end of the bracketing segment. */
  i1: number;
  /** Fraction (0-1) of the way from `i0` to `i1` for the requested time. */
  frac: number;
}

/**
 * Locate the orbit-line segment that brackets a continuous trajectory time.
 *
 * The orbit cruncher draws a missile trajectory as `numSegments` straight chords
 * whose vertices are the trajectory samples at `round(length * k / numSegments)`
 * (see `orbitCruncher.drawMissileSegment_`). With the default 255 segments a long
 * flight is sub-sampled ~7:1, so a dot interpolated between *adjacent* samples
 * follows the true curve and visibly leaves the coarse chord near apogee (peak
 * curvature). Interpolating along the chord returned here instead keeps the dot
 * exactly on the rendered line.
 *
 * @param length Number of trajectory samples (`altList.length`).
 * @param numSegments Orbit line resolution (`settingsManager.orbitSegments`).
 * @param elapsedIdx Continuous trajectory index (`(nowMs - startTimeMs) / 1000`).
 */
export const orbitLineSegment = (length: number, numSegments: number, elapsedIdx: number): OrbitLineSegment => {
  const lastIdx = length - 1;
  const clamped = Math.max(0, Math.min(elapsedIdx, lastIdx));

  // Segment index whose start vertex falls at or before `clamped`.
  let k = Math.floor((clamped / length) * numSegments);

  k = Math.max(0, Math.min(k, numSegments - 1));

  const i0 = Math.min(Math.round((length * k) / numSegments), lastIdx);
  const i1 = Math.min(Math.round((length * (k + 1)) / numSegments), lastIdx);
  const frac = i1 > i0 ? Math.max(0, Math.min((clamped - i0) / (i1 - i0), 1)) : 0;

  return { i0, i1, frac };
};
