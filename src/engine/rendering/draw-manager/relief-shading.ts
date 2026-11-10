import { glsl } from '@app/engine/utils/development/formatter';

/**
 * Shared GLSL for terrain relief shading from an equirectangular height map
 * (Earth's and the Moon's bump maps).
 *
 * `reliefNormal(N, p, uv, heightMap, heightScale)` returns a per-pixel surface
 * normal that the sun can light, so ridges, craters and valleys shade with sun
 * angle. The height map's UV gradient is carried onto the sphere with a
 * screen-derivative cotangent frame, so no tangent attributes are needed.
 *
 * - `N`: normalized smooth (geometric) normal, same space as `p`.
 * - `p`: fragment position in the same space as `N` (view space here).
 * - `heightScale`: scene length units for a height-map value of 1.0, with any
 *   exaggeration applied. 0 or less returns `N` untouched (relief off).
 *
 * Callers should light only the day side with the result and keep the smooth
 * normal for the terminator, so relief cannot light the night side.
 */
export const RELIEF_NORMAL_GLSL = glsl`
    vec3 reliefNormal(vec3 N, vec3 p, vec2 uv, sampler2D heightMap, float heightScale) {
      if (heightScale <= 0.0) {
        return N;
      }

      vec3 dp1 = dFdx(p);
      vec3 dp2 = dFdy(p);
      vec2 duv1 = dFdx(uv);
      vec2 duv2 = dFdy(uv);

      // Antimeridian seam (u wraps 1 -> 0 inside a pixel quad) and the poles:
      // derivatives are meaningless there, fall back to the smooth normal.
      if (abs(duv1.x) + abs(duv2.x) > 0.25) {
        return N;
      }

      vec3 dp2perp = cross(dp2, N);
      vec3 dp1perp = cross(N, dp1);
      float det = dot(dp1, dp2perp);
      if (abs(det) < 1.0e-12) {
        return N;
      }

      // Surface gradients of u and v (1 / scene length units).
      vec3 gradU = (dp2perp * duv1.x + dp1perp * duv2.x) / det;
      vec3 gradV = (dp2perp * duv1.y + dp1perp * duv2.y) / det;

      // Central differences over at least one texel, widened to the pixel
      // footprint so the slope stays correct when the map is minified.
      vec2 texel = 1.0 / vec2(textureSize(heightMap, 0));
      vec2 d = max(texel, max(abs(duv1), abs(duv2)));
      // Wrap u by hand: some meshes run u past 1.0 (the color map repeats there),
      // and a non-power-of-two height map is clamped, so u > 1 would read the
      // last column and smear it into horizontal streaks.
      vec2 st = vec2(fract(uv.x), uv.y);
      float hL = texture(heightMap, vec2(fract(st.x - d.x), st.y)).r;
      float hR = texture(heightMap, vec2(fract(st.x + d.x), st.y)).r;
      float hD = texture(heightMap, st - vec2(0.0, d.y)).r;
      float hU = texture(heightMap, st + vec2(0.0, d.y)).r;

      float dhdu = (hR - hL) / (2.0 * d.x) * heightScale;
      float dhdv = (hU - hD) / (2.0 * d.y) * heightScale;

      return normalize(N - (dhdu * gradU + dhdv * gradV));
    }
`;
