/**
 * Pure, dependency-free anchor-relative orbit math, shared by the orbit-cruncher
 * worker, the orbit manager, and their tests.
 *
 * Orbit-line vertices are stored RELATIVE to a float64 anchor so full orbital
 * magnitudes (~42164 km at GEO, where one float32 ULP is ~4 m) never touch
 * float32. Absolute float32 orbit buffers re-rolled that ~4 m rounding every
 * constant-redraw frame, which made zoomed-in ECF orbit and missile lines
 * visibly shiver. See OrbitManager.orbitAnchors_ and the ecefToEciCS vertex
 * shader for the full rationale.
 *
 * This module MUST stay free of DOM/WebGL/service imports: the orbit-cruncher
 * web worker imports it, and the unit tests exercise it without a browser.
 */

/**
 * Rotate an ECEF vector to ECI about +Z using precomputed cos/sin. Mirrors the
 * `ecefToEciCS` helper in the line-manager vertex shader. cos/sin are passed in
 * (computed in float64 by the caller) because uploading the raw GMST angle to a
 * float32 uniform quantizes it to ~4.8e-7 rad - about one frame of Earth
 * rotation at 1x - jittering the rotation of full-magnitude vectors.
 */
export const rotateEcefToEciZ = (x: number, y: number, z: number, cosGmst: number, sinGmst: number): [number, number, number] => [
  x * cosGmst - y * sinGmst,
  x * sinGmst + y * cosGmst,
  z,
];

/**
 * Rebase a flat `[x, y, z, alpha, ...]` path onto its first vertex: that vertex
 * becomes the anchor (kept in float64) and every vertex is written into a fresh
 * `Float32Array` relative to it. The subtraction happens here in float64 -
 * BEFORE the float32 quantization - so near-anchor vertices keep sub-millimetre
 * precision. Alpha is copied through untouched.
 *
 * A non-finite first vertex falls back to a zero anchor (so the buffer stays an
 * absolute copy) rather than poisoning every vertex with NaN.
 */
export const rebaseToAnchor = (points: ArrayLike<number>): { pointsOut: Float32Array; anchor: [number, number, number] } => {
  const pointsOut = new Float32Array(points.length);
  const anchor: [number, number, number] = [points[0], points[1], points[2]];

  if (!Number.isFinite(anchor[0]) || !Number.isFinite(anchor[1]) || !Number.isFinite(anchor[2])) {
    anchor[0] = 0;
    anchor[1] = 0;
    anchor[2] = 0;
  }

  for (let i = 0; i < points.length; i += 4) {
    pointsOut[i] = points[i] - anchor[0];
    pointsOut[i + 1] = points[i + 1] - anchor[1];
    pointsOut[i + 2] = points[i + 2] - anchor[2];
    pointsOut[i + 3] = points[i + 3];
  }

  return { pointsOut, anchor };
};
