/**
 * Pure, dependency-free eclipse test for orbit-line vertices.
 *
 * The orbit cruncher worker imports this, so it MUST stay free of DOM, WebGL
 * and ServiceLocator imports.
 *
 * Model: a cylindrical umbra of Earth's equatorial radius aligned with the
 * Sun direction (the same cheap test SODA uses). It ignores penumbra and the
 * shadow cone's taper, which is fine for a visual cue on the selected orbit.
 *
 * Frames: the cruncher's positions are TEME and the Sun vector comes from
 * ootk's `Sun.eci()` (J2000). The ~0.3 deg frame offset in 2026 is far below
 * what the dimmed arc can show.
 */

/** Earth's equatorial radius (km), the radius of the shadow cylinder. */
export const ECLIPSE_CYLINDER_RADIUS_KM = 6378.1366;

const CYLINDER_RADIUS_SQ_ = ECLIPSE_CYLINDER_RADIUS_KM * ECLIPSE_CYLINDER_RADIUS_KM;

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * Brightness multiplier for an orbit-line vertex.
 * @param rEci Vertex position in ECI/TEME (km).
 * @param sunUnit Unit vector from Earth toward the Sun (same frame).
 * @param alpha Multiplier to return when the vertex is in shadow.
 * @returns `alpha` inside the shadow cylinder, otherwise 1.
 */
export const eclipseFactor = (rEci: Vec3Like, sunUnit: Vec3Like, alpha: number): number => {
  const along = rEci.x * sunUnit.x + rEci.y * sunUnit.y + rEci.z * sunUnit.z;

  if (along >= 0) {
    return 1;
  }

  // offAxis^2 = |r|^2 - along^2; compare squared to skip the sqrt.
  const offAxisSq = rEci.x * rEci.x + rEci.y * rEci.y + rEci.z * rEci.z - along * along;

  return offAxisSq < CYLINDER_RADIUS_SQ_ ? alpha : 1;
};
