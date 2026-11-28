/**
 * Altitude fade of the country-border overlay (political-map.ts), shared by every place that draws it: the Earth
 * surface shader, the tiled Earth and the volumetric cloud cut-out (W6).
 *
 * The overlay is a 4096 x 2048 equirectangular texture: one texel is 40,075 / 4096 = 9.8 km at the equator, and each
 * line is a 1.25-texel core over a 3.1-texel halo (about 12 and 30 km). At 1080p with the default 0.6 rad vertical
 * field of view one screen pixel at the centre spans 5.75e-4 rad, so one texel covers two pixels from about
 * 8,500 km above the ground (9.8 / (2 x 5.75e-4)); below that the lines turn into soft glowing bands (live captures in
 * docs/runs/2026-11-27-lit-2d-clouds/w6-shots: crisp at 8,000 km, glowing halos 15 to 40 px wide at 3,000 and 1,000 km).
 * The overlay is fully drawn above POLITICAL_FADE_FULL_KM, gone below POLITICAL_FADE_ZERO_KM, smoothstep between.
 * The camera altitude is the one the cloud fade uses (above the WGS84 surface under the camera), with or without a
 * satellite lock.
 */
export const POLITICAL_FADE_FULL_KM = 9000;
export const POLITICAL_FADE_ZERO_KM = 3000;

/** Overlay strength 0..1 for a camera `altitudeKm` above the ground. */
export function politicalMapFade(altitudeKm: number): number {
  if (!Number.isFinite(altitudeKm)) {
    return 1;
  }
  const t = Math.min(1, Math.max(0, (altitudeKm - POLITICAL_FADE_ZERO_KM) / (POLITICAL_FADE_FULL_KM - POLITICAL_FADE_ZERO_KM)));

  return t * t * (3 - 2 * t);
}
