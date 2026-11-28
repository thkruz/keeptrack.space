/**
 * Earthshine for satellite meshes: sunlight reflected by the Earth onto a satellite.
 *
 * Everything here is CPU side and per object. The mesh shader receives a direction (toward the
 * Earth's centre), a strength and a colour, and applies a wrapped hemispherical term; the Earth
 * texture is never sampled.
 */

export interface EarthshineResult {
  /** Unit ECI direction from the satellite to the Earth's centre (nadir). */
  direction: [number, number, number];
  /** Scalar light strength, 0 when there is no earthshine. */
  strength: number;
  /** Linear RGB tint of the reflected light. */
  color: [number, number, number];
}

/** Mean Earth Bond albedo. */
export const EARTH_ALBEDO = 0.3;
/** Mean Earth radius in km (the position unit used by the mesh manager). */
export const EARTH_RADIUS_KM = 6371;
/** Fixed artistic gain; the user setting multiplies it. */
export const EARTHSHINE_ARTISTIC_GAIN = 3.0;
/** Cool blue-white tint of earthshine over the sunlit disc. */
export const EARTHSHINE_COLOR_DAY: readonly [number, number, number] = [0.85, 0.92, 1.0];
/** Warmer tint over the terminator (low sun, reddened light). */
export const EARTHSHINE_COLOR_TERMINATOR: readonly [number, number, number] = [1.0, 0.82, 0.62];
/** Sun cosine at the nadir point at or below which the Earth below gives no light. */
export const NADIR_COS_OFF = -0.1;
/** Sun cosine at the nadir point at or above which the Earth below is fully bright. */
export const NADIR_COS_FULL = 0.5;

const smoothstep_ = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));

  return t * t * (3 - 2 * t);
};

const OFF: EarthshineResult = { direction: [0, 0, -1], strength: 0, color: [EARTHSHINE_COLOR_DAY[0], EARTHSHINE_COLOR_DAY[1], EARTHSHINE_COLOR_DAY[2]] };

/**
 * @param position Satellite ECI position relative to the Earth's centre, km.
 * @param sunDirection Unit ECI direction from the Earth to the Sun.
 * @param gain User gain (`settingsManager.meshEarthshineStrength`); 0 disables the effect.
 */
export const computeEarthshine = (position: ArrayLike<number>, sunDirection: ArrayLike<number>, gain: number): EarthshineResult => {
  const r = Math.hypot(position[0], position[1], position[2]);

  if (!(gain > 0) || !(r > 0) || !Number.isFinite(r)) {
    return { ...OFF, direction: [...OFF.direction] };
  }

  const nadir: [number, number, number] = [-position[0] / r, -position[1] / r, -position[2] / r];
  // Cosine between the sub-satellite point's surface normal and the Sun.
  const cosSun = -(nadir[0] * sunDirection[0] + nadir[1] * sunDirection[1] + nadir[2] * sunDirection[2]);
  const lit = smoothstep_(NADIR_COS_OFF, NADIR_COS_FULL, cosSun);
  // Closer to the terminator the surface is dimmer per area and the light is warmer.
  const warm = 1 - smoothstep_(0.05, 0.5, cosSun);
  const view = Math.min(1, (EARTH_RADIUS_KM / r) ** 2);
  const strength = EARTH_ALBEDO * view * lit * EARTHSHINE_ARTISTIC_GAIN * gain;
  const color: [number, number, number] = [
    EARTHSHINE_COLOR_DAY[0] + (EARTHSHINE_COLOR_TERMINATOR[0] - EARTHSHINE_COLOR_DAY[0]) * warm,
    EARTHSHINE_COLOR_DAY[1] + (EARTHSHINE_COLOR_TERMINATOR[1] - EARTHSHINE_COLOR_DAY[1]) * warm,
    EARTHSHINE_COLOR_DAY[2] + (EARTHSHINE_COLOR_TERMINATOR[2] - EARTHSHINE_COLOR_DAY[2]) * warm,
  ];

  return { direction: nadir, strength, color };
};
