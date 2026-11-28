import { CLOUD_DETAIL_ROTATIONS, CLOUD_EVOLUTION } from './cloud-evolution';
import { NIGHT_AS_DAY_GLSL } from './night-as-day';

const f = (x: number) => (Number.isInteger(x) ? `${x}.0` : `${x}`);
/** GLSL mat3 (column major) for a row-major TS matrix, so `M * p` matches the TS twin. */
const mat3 = (m: readonly number[]) => `mat3(${[0, 3, 6, 1, 4, 7, 2, 5, 8].map((i) => m[i].toFixed(9)).join(', ')})`;

/** Painted cloud opacity = smoothstep(LO, HI, map density); see PAINTED_CLOUDS_GLSL for the measured histogram. */
export const PAINTED_CLOUD_OPACITY_LO = 0.08;
export const PAINTED_CLOUD_OPACITY_HI = 0.65;

/** TS twin of paintedCloudOpacity in PAINTED_CLOUDS_GLSL. */
export const paintedCloudOpacity = (density: number): number => {
  const t = Math.min(1, Math.max(0, (density - PAINTED_CLOUD_OPACITY_LO) / (PAINTED_CLOUD_OPACITY_HI - PAINTED_CLOUD_OPACITY_LO)));

  return t * t * (3 - 2 * t);
};

/**
 * Cloud evolution (cloud-evolution.ts is the TS twin, with the design notes): erodes painted coverage by date with a
 * threshold cut shaped by real cloud borrowed from the map itself; never adds any.
 * cloudEvolutionCoverage(map, p, c, phase, strength): `map` the cloud map (red = coverage), `p` the unit direction in
 * the Earth-fixed frame, `c` the coverage 0..1, `phase` cloudEvolutionPhase(tDays) from the CPU (double precision; a
 * float32 day count steps every 168.75 s). Nothing in it depends on the camera: the borrowed detail is read at a fixed
 * ground resolution, so the mask is the same under any camera move (W6).
 * Strength 0 returns `c` unchanged and reads nothing. Exported so a plugin cloud layer can include the same string.
 */
export const CLOUD_EVOLUTION_GLSL = /* glsl */ `
float ceHash(highp vec3 p) {
  highp vec3 q = fract(p * 0.1031);
  q += dot(q, q.zyx + 31.32);
  return fract((q.x + q.y) * q.z);
}

float ceValueNoise(highp vec3 x) {
  highp vec3 i = floor(x);
  highp vec3 fr = x - i;
  vec3 u = fr * fr * (3.0 - 2.0 * fr);
  return mix(
    mix(mix(ceHash(i), ceHash(i + vec3(1,0,0)), u.x), mix(ceHash(i + vec3(0,1,0)), ceHash(i + vec3(1,1,0)), u.x), u.y),
    mix(mix(ceHash(i + vec3(0,0,1)), ceHash(i + vec3(1,0,1)), u.x), mix(ceHash(i + vec3(0,1,1)), ceHash(i + vec3(1,1,1)), u.x), u.y),
    u.z);
}

// Integer hash (lowbias32): exact on every GPU and every shader build.
highp uint ceHashU(highp uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}

// Hash of field index m and component i as a float from 0 up to but excluding 1, with 24 exact bits.
float ceHashK(highp uint m, highp uint i) {
  return float(ceHashU(m * 8u + i) >> 8u) * (1.0 / 16777216.0);
}

// Noise offset of field k. Integer arithmetic (W9): the float hash this replaced, fract(k * 0.1031) near k = 3000,
// gave offsets 0.018 to 0.14 noise cells apart under two legal float32 evaluations (fused or separate multiply-add),
// and the GPU switched between them from frame to frame, so the cut at cloud edges flickered.
highp vec3 ceOffset(float k, float salt) {
  highp uint m = uint(mod(k, 4096.0) + 0.5) % 4096u;
  highp uint s = uint(salt + 0.5);
  return 37.0 * vec3(ceHashK(m, s), ceHashK(m, s + 1u), ceHashK(m, s + 2u));
}

float ceField(highp vec3 p, float k) {
  highp vec3 o = ceOffset(k, 0.0);
  float n1 = ceValueNoise(p * ${f(CLOUD_EVOLUTION.freq1)} + o);
  float n2 = ceValueNoise(p * ${f(CLOUD_EVOLUTION.freq2)} + o.yzx);
  return n1 * ${f(1 - CLOUD_EVOLUTION.w2)} + n2 * ${f(CLOUD_EVOLUTION.w2)};
}

float ceStormField(highp vec3 p, float k) {
  return ceValueNoise(p * ${f(CLOUD_EVOLUTION.stormFreq)} + ceOffset(k, 3.0));
}

// Cross-fade of two independent fields with the spread kept (a plain mix is flatter half way through).
float ceCrossFade(float a, float b, float s) {
  return 0.5 + (mix(a, b, s) - 0.5) / sqrt((1.0 - s) * (1.0 - s) + s * s);
}

// Static synthetic detail (three octaves), the fallback where the borrowed cloud is flat.
float ceSynth(highp vec3 p) {
  float fr = ${f(CLOUD_EVOLUTION.synthFreq)};
  return 0.5 * ceValueNoise(p * fr + vec3(11.3, 7.1, 3.7)) + 0.3 * ceValueNoise(p * (2.0 * fr) + vec3(5.9, 13.4, 1.3))
    + 0.2 * ceValueNoise(p * (4.0 * fr) + vec3(2.2, 4.8, 9.6));
}

// One borrowed read: the map's cloud opacity at the rotated direction q; w gets the 4th power of q's latitude cosine.
float ceBorrow(sampler2D map, vec3 q, float lod, inout float w) {
  float c2 = max(1.0 - q.z * q.z, 1e-4);
  w = c2 * c2;
  vec2 uv = vec2(fract(0.5 + atan(q.y, q.x) / 6.28318530718), 0.5 - asin(clamp(q.z, -1.0, 1.0)) / 3.14159265359);
  return smoothstep(${f(CLOUD_EVOLUTION.detailLo)}, ${f(CLOUD_EVOLUTION.detailHi)}, textureLod(map, uv, lod).r);
}

float cloudEvolutionDetail(sampler2D map, vec3 p) {
  // Fixed ground resolution (cloudDetailLod): independent of the camera, the same on every map size.
  float l = max(0.0, ${f(CLOUD_EVOLUTION.detailLod)} + log2(float(textureSize(map, 0).x) / ${f(CLOUD_EVOLUTION.detailLodMapWidth)}));
  float w0 = 0.0;
  float w1 = 0.0;
  float b0 = ceBorrow(map, ${mat3(CLOUD_DETAIL_ROTATIONS[0])} * p, l, w0);
  float b1 = ceBorrow(map, ${mat3(CLOUD_DETAIL_ROTATIONS[1])} * p, l, w1);
  return ${f(1 - CLOUD_EVOLUTION.synthWeight)} * (w0 * b0 + w1 * b1) / (w0 + w1) + ${f(CLOUD_EVOLUTION.synthWeight)} * ceSynth(p);
}

float cloudEvolutionCoverage(sampler2D map, vec3 p, float c, vec4 phase, float strength) {
  if (strength <= 0.0) return c;
  float n = ceCrossFade(ceField(p, phase.x), ceField(p, phase.x + 1.0), smoothstep(0.0, 1.0, phase.y));
  float m = ceCrossFade(ceStormField(p, phase.z), ceStormField(p, phase.z + 1.0), smoothstep(0.0, 1.0, phase.w));
  float depth = min(1.0, strength / ${f(CLOUD_EVOLUTION.fullDepthStrength)});
  float shift = max(0.0, strength - ${f(CLOUD_EVOLUTION.fullDepthStrength)}) * ${f(CLOUD_EVOLUTION.thresholdPerStrength)};
  float holes = 1.0 - smoothstep(${f(CLOUD_EVOLUTION.lo)} + shift, ${f(CLOUD_EVOLUTION.hi)} + shift, n);
  float storms = 1.0 - smoothstep(${f(CLOUD_EVOLUTION.stormLo)} + shift, ${f(CLOUD_EVOLUTION.stormHi)} + shift, m);
  float e = depth * max(holes, storms);
  if (e <= 0.0) return c;
  // Threshold cut: c kept where the score (c plus borrowed cloud shape) is above the cut, zero below, narrow feather.
  float s = c + ${f(CLOUD_EVOLUTION.detailAmp)} * (cloudEvolutionDetail(map, p) - 0.5);
  float cut = ${f(-0.5 * CLOUD_EVOLUTION.detailAmp - CLOUD_EVOLUTION.feather)} + e * ${f(1 + CLOUD_EVOLUTION.detailAmp + 2 * CLOUD_EVOLUTION.feather)};
  return c * smoothstep(cut - ${f(CLOUD_EVOLUTION.feather)}, cut + ${f(CLOUD_EVOLUTION.feather)}, s);
}

// Unit Earth-fixed direction of an equirectangular uv (no seam at the antimeridian or poles).
vec3 cloudDirFromUv(vec2 uv) {
  float lon = (uv.x - 0.5) * 6.28318530718;
  float lat = (0.5 - uv.y) * 3.14159265359;
  return vec3(cos(lat) * cos(lon), cos(lat) * sin(lon), sin(lat));
}
`;

/**
 * Painted (map) clouds, shared by every Earth surface shader that draws them.
 *
 * The cloud map is a coverage field, not a mask: it is almost never exactly 0, so using it as opacity directly lays a
 * thin neutral veil over the whole ground, and thick cloud (map values around 0.5) stays see-through. Measured on
 * clouds8k.jpg, area weighted (docs/runs/2026-11-27-lit-2d-clouds/w2-histogram.ts): globe p50 43/255, p75 96, p90 146,
 * p99 199; Sahara p95 15, p99 73. The opacity is smoothstep(PAINTED_CLOUD_OPACITY_LO, PAINTED_CLOUD_OPACITY_HI): haze
 * under about 0.1 does not register, and the globe's p90 (0.57) is about 0.95 opaque.
 * A cloud is lit by the same sun term as the ground under it.
 *
 * Includes the night-as-day rule (night-as-day.ts), so a shader that includes this block must not include that one too.
 */
export const PAINTED_CLOUDS_GLSL = /* glsl */ `
${NIGHT_AS_DAY_GLSL}
${CLOUD_EVOLUTION_GLSL}

// Opacity from the map density: thin haze faded out, thick cloud (the map's top tenth) nearly opaque.
float paintedCloudOpacity(float density) {
  return smoothstep(${f(PAINTED_CLOUD_OPACITY_LO)}, ${f(PAINTED_CLOUD_OPACITY_HI)}, density);
}

// Cloud brightness: the sun term the ground receives. Night-as-day lifts the dark side to the virtual
// Sun's term and leaves the lit side as it is.
float paintedCloudLight(float diffuse, float isNightAsDay) {
  float lit = (isNightAsDay > 0.5) ? nightAsDaySun(diffuse, NIGHT_AS_DAY_SUN_COS) : diffuse;
  return max(lit, 0.02);
}
`;
