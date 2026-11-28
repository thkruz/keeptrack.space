/**
 * Night-as-day lighting rule, shared by every Earth surface and atmosphere shader.
 *
 * Turning the night off lights every point as if the Sun stood at least
 * {@link NIGHT_AS_DAY_SUN_ELEVATION_DEG} above the horizon there. Per point the Sun cosine c (the cosine
 * of the Sun's angle from the local zenith, i.e. the sine of its elevation) becomes
 *
 *   max(c, floor)
 *
 * with floor = sin(45 degrees). Where the real Sun is higher than 45 degrees the day side is unchanged;
 * below that the surface is lit evenly, so there is no dim band near the old terminator.
 */

/** Elevation of the virtual Sun over every point whose real Sun is lower. */
export const NIGHT_AS_DAY_SUN_ELEVATION_DEG = 45;

/** The virtual Sun's cosine from the local zenith, sin(elevation). Also the `minSunCosine` the atmosphere hook receives. */
export const NIGHT_AS_DAY_SUN_COSINE = Math.sin((NIGHT_AS_DAY_SUN_ELEVATION_DEG * Math.PI) / 180);

/**
 * CPU mirror of the GLSL `nightAsDaySun`. `floorCos` of 0 (or less) means the rule is off and the real
 * cosine, negative values included, is returned unchanged.
 */
export const nightAsDaySunCosine = (cosine: number, floorCos: number): number => {
  if (floorCos <= 0) {
    return cosine;
  }

  return Math.max(cosine, floorCos);
};

/** GLSL for the rule above; include once per shader. */
export const NIGHT_AS_DAY_GLSL = /* glsl */ `
const float NIGHT_AS_DAY_SUN_COS = ${NIGHT_AS_DAY_SUN_COSINE.toFixed(8)};

// Sun cosine from the local zenith with the night-as-day floor applied (floorCos <= 0 leaves c unchanged).
float nightAsDaySun(float c, float floorCos) {
  if (floorCos <= 0.0) {
    return c;
  }
  return max(c, floorCos);
}

// Sun direction at a point with local up 'up' and real Sun direction 'sun'. A Sun lower than the floor is raised
// toward the zenith on its own azimuth until its cosine is the floor; the direction is continuous where the real
// Sun crosses the floor. floorCos <= 0 returns 'sun' unchanged. Used by the volumetric clouds and the ground
// cloud shadows, so both put the Sun in the same place.
vec3 nightAsDaySunDir(vec3 up, vec3 sun, float floorCos) {
  float c = dot(up, sun);
  float ce = nightAsDaySun(c, floorCos);
  if (ce == c) { return sun; }
  vec3 tg = sun - up * c;
  float tl = length(tg);
  tg = tl > 1e-5 ? tg / tl : normalize(cross(up, abs(up.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)));
  return up * ce + tg * sqrt(max(1.0 - ce * ce, 0.0));
}
`;
