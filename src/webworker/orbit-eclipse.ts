/**
 * Pure, dependency-free eclipse test for orbit-line vertices.
 *
 * The orbit cruncher worker imports this, so it MUST stay free of DOM, WebGL
 * and ServiceLocator imports.
 *
 * Model: a cylindrical umbra of the WGS84 ellipsoid aligned with the Sun
 * direction (the same cheap test SODA uses, on an ellipsoid instead of a
 * sphere). The test runs in scaled space, where z is multiplied by a/b so the
 * ellipsoid becomes a sphere of radius a; that affine map keeps lines parallel,
 * so the ellipsoid's shadow cylinder maps onto the sphere's. It ignores penumbra
 * and the shadow cone's taper, which is fine for a visual cue on the selected orbit.
 *
 * Frames: the cruncher's positions are TEME and the Sun vector comes from
 * ootk's `Sun.eci()` (J2000). The ~0.3 deg frame offset in 2026 is far below
 * what the dimmed arc can show. The polar axis is taken as z in both.
 */

/** WGS84 equatorial semi-axis (km), the radius of the shadow cylinder in scaled space. */
export const ECLIPSE_CYLINDER_RADIUS_KM = 6378.137;

/** WGS84 polar semi-axis (km), a * (1 - f) with f = 1 / 298.257223563. */
export const ECLIPSE_POLAR_RADIUS_KM = ECLIPSE_CYLINDER_RADIUS_KM * (1 - 1 / 298.257223563);

const Z_SCALE_ = ECLIPSE_CYLINDER_RADIUS_KM / ECLIPSE_POLAR_RADIUS_KM;
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
  // Scaled space: z * a/b turns the ellipsoid into a sphere of radius a.
  const rz = rEci.z * Z_SCALE_;
  const sz = sunUnit.z * Z_SCALE_;
  const sunLen = Math.sqrt(sunUnit.x * sunUnit.x + sunUnit.y * sunUnit.y + sz * sz);
  const along = (rEci.x * sunUnit.x + rEci.y * sunUnit.y + rz * sz) / sunLen;

  if (along >= 0) {
    return 1;
  }

  // offAxis^2 = |r|^2 - along^2; compare squared to skip the sqrt.
  const offAxisSq = rEci.x * rEci.x + rEci.y * rEci.y + rz * rz - along * along;

  return offAxisSq < CYLINDER_RADIUS_SQ_ ? alpha : 1;
};
