import { glsl } from '@app/engine/utils/development/formatter';

/**
 * Shared GLSL for the WGS84 ellipsoid (a = 6378.137 km, f = 1 / 298.257223563).
 *
 * - `WGS84_A`, `WGS84_B`: equatorial and polar semi-axes in km.
 * - `WGS84_E2`: first eccentricity squared, 2f - f^2.
 * - `WGS84_EP2`: second eccentricity squared, (a^2 - b^2) / b^2.
 * - `float geodeticLatitude(vec3 ecef)`: geodetic latitude in radians of an Earth-fixed
 *   (or Earth-centred inertial, latitude does not depend on longitude) position in km,
 *   by Bowring's formula with a single iteration. Error is under 1e-6 rad for
 *   |height| < 100,000 km; float32 precision limits it before the formula does.
 *
 * Keep {@link geodeticLatitudeGlslMirror} line for line in step with the GLSL; its spec
 * checks the formula against ootk's iterative ECEF-to-geodetic conversion.
 */
export const WGS84_GLSL = glsl`
    const float WGS84_A = 6378.137;
    const float WGS84_B = 6356.7523142;
    const float WGS84_E2 = 0.00669437999014;
    const float WGS84_EP2 = 0.00673949674228;

    float geodeticLatitude(vec3 ecef) {
      float p = length(ecef.xy);
      float theta = atan(ecef.z * WGS84_A, p * WGS84_B);
      float sinTheta = sin(theta);
      float cosTheta = cos(theta);
      float num = ecef.z + WGS84_EP2 * WGS84_B * sinTheta * sinTheta * sinTheta;
      float den = p - WGS84_E2 * WGS84_A * cosTheta * cosTheta * cosTheta;
      return atan(num, den);
    }
  `;

/** The literal constants in {@link WGS84_GLSL}, for the TypeScript mirror and its spec. */
export const WGS84_GLSL_CONSTANTS = {
  A: 6378.137,
  B: 6356.7523142,
  E2: 0.00669437999014,
  EP2: 0.00673949674228,
} as const;

/**
 * Line-for-line TypeScript mirror of the GLSL `geodeticLatitude` in {@link WGS84_GLSL}.
 * @param x - Position x in km (ECEF or ECI)
 * @param y - Position y in km
 * @param z - Position z in km (pole axis)
 * @returns Geodetic latitude in radians
 */
export const geodeticLatitudeGlslMirror = (x: number, y: number, z: number): number => {
  const { A, B, E2, EP2 } = WGS84_GLSL_CONSTANTS;
  const p = Math.hypot(x, y);
  const theta = Math.atan2(z * A, p * B);
  const sinTheta = Math.sin(theta);
  const cosTheta = Math.cos(theta);
  const num = z + EP2 * B * sinTheta * sinTheta * sinTheta;
  const den = p - E2 * A * cosTheta * cosTheta * cosTheta;

  return Math.atan2(num, den);
};
