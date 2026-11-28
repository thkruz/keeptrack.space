import { SettingsManager } from '../../settings/settings';
import { glsl } from '../utils/development/formatter';
import { BODY_GLYPH_WORDS, BodyGlyph } from './body-glyph';
import { DepthManager } from './depth-manager';
import { WGS84_GLSL } from './shaders/wgs84-glsl';

/**
 * Rendering style for the core satellite dot, selected live via the
 * `u_dotStyle` uniform (settingsManager.satShader.dotStyle).
 */
export enum DotStyle {
  /** Legacy soft-edged glow (default) */
  SoftGlow = 0,
  /** Crisp anti-aliased solid disc */
  Disc = 1,
  /** Hollow ring / donut */
  Ring = 2,
  /** Diamond (rotated square) */
  Diamond = 3,
  /** Axis-aligned square */
  Square = 4,
}

/**
 * Per-dot status codes stored in the DotsManager size buffer (Int8Array).
 * The vertex shaders only care that any status >= 0.5 renders at star size
 * (so all legacy `a_size >= 0.5` checks keep working); the fragment shaders
 * use the exact code to draw identification markers around the dot.
 */
export enum DotStatus {
  /** Regular dot, distance-based sizing */
  None = 0,
  /** Plain big dot (planets) - no marker */
  Big = 1,
  /** Search result / current group member - thin ring */
  Searched = 2,
  /** Currently selected object - reticle */
  Selected = 3,
  /** Currently hovered object - halo */
  Hover = 4,
}

/**
 * Shared GLSL library for dot core styles and status identification markers.
 * Interpolated into both the base dots fragment shader and the pro symbology
 * fragment shader so the two can never drift apart. Every function returns a
 * 0..1 coverage value; callers multiply by vColor.a and never discard.
 */
export const createDotStyleGlsl = (settings: SettingsManager): string => glsl`
    // Anti-aliasing half-width: ~1 screen pixel in sprite-normalized units
    float ktAa(float pointSize) {
      return clamp(2.0 / max(pointSize, 1.0), 0.02, 0.3);
    }

    // Legacy soft-glow falloff
    float ktSoftAlpha(vec2 p) {
      float r = (${settings.satShader.blurFactor1} - min(abs(length(p)), 1.0));
      return clamp(2.0 * r + ${settings.satShader.blurFactor2}, 0.0, 1.0);
    }

    float ktDiscAlpha(vec2 p, float radius, float aa) {
      return 1.0 - smoothstep(radius - aa, radius + aa, length(p));
    }

    float ktRingAlpha(vec2 p, float radius, float halfWidth, float aa) {
      float d = abs(length(p) - radius) - halfWidth;
      return 1.0 - smoothstep(-aa, aa, d);
    }

    float ktDiamondAlpha(vec2 p, float size, float aa) {
      float d = (abs(p.x) + abs(p.y)) - size;
      return 1.0 - smoothstep(-aa, aa, d);
    }

    float ktSquareAlpha(vec2 p, float size, float aa) {
      vec2 d2 = abs(p) - vec2(size);
      float d = max(d2.x, d2.y);
      return 1.0 - smoothstep(-aa, aa, d);
    }

    // ---------------------------------------------------------------------
    // Solar-system body glyphs. Each stands in for a body too small to see at
    // this range, and the SHAPE says what kind of thing it is (see BodyGlyph in
    // body-glyph.ts) - color alone cannot, since the dot is already tinted with
    // the body's own color. All return 0..1 coverage over the point sprite and
    // are drawn at "scale", which shrinks when a status marker rings the dot.
    // ---------------------------------------------------------------------

    // Saturn: opaque disc + tilted elliptical ring whose "ears" reach past the
    // disc left/right, exactly like the classic icon.
    float ktRingedAlpha(vec2 p, float scale, float aa) {
      float disc = ktDiscAlpha(p, 0.5 * scale, aa);

      // Rotate 30 degrees, then squash y 3x so the ring becomes an ellipse
      // whose ears reach past the disc while its minor axis hides behind it
      float c = 0.8660254;
      float s = 0.5;
      vec2 q = vec2(c * p.x - s * p.y, (s * p.x + c * p.y) * 3.0);
      // Stretched-space distance overestimates near the minor axis, so widen
      // the AA window (2x) as a compromise between the 1x and 3x gradients
      float ring = 1.0 - smoothstep(-2.0 * aa, 2.0 * aa, abs(length(q) - 0.86 * scale) - 0.09 * scale);

      return max(disc, ring);
    }

    // Terrestrial planet: a plain solid disc. The baseline every other glyph
    // is read against, and the only one with no decoration at all.
    float ktTerrestrialAlpha(vec2 p, float scale, float aa) {
      return ktDiscAlpha(p, 0.62 * scale, aa);
    }

    // Gas giant: a fatter disc with two belts cut out of it. The bands wash out
    // into a plain disc once the sprite is small enough that the AA width
    // swallows them, which is the right way for this to degrade.
    float ktGasGiantAlpha(vec2 p, float scale, float aa) {
      float disc = ktDiscAlpha(p, 0.72 * scale, aa);
      float upper = 1.0 - smoothstep(0.06 * scale - aa, 0.06 * scale + aa, abs(p.y - 0.24 * scale));
      float lower = 1.0 - smoothstep(0.05 * scale - aa, 0.05 * scale + aa, abs(p.y + 0.30 * scale));

      return disc * (1.0 - max(upper, lower));
    }

    // Ice giant: a smaller disc inside an UPRIGHT ring. Uranus' rings really do
    // stand on end, and the 90 degree difference from Saturn's tilt is what
    // separates the two glyphs at a glance.
    float ktIceGiantAlpha(vec2 p, float scale, float aa) {
      float disc = ktDiscAlpha(p, 0.46 * scale, aa);
      // Squash x 3x: the ellipse's long axis is now vertical
      vec2 q = vec2(p.x * 3.0, p.y);
      float ring = 1.0 - smoothstep(-2.0 * aa, 2.0 * aa, abs(length(q) - 0.86 * scale) - 0.09 * scale);

      return max(disc, ring);
    }

    // Dwarf planet: a small disc inside a broken ring - a body that did not
    // clear its neighbourhood. The dashes keep it from reading as the solid
    // search ring, and the core's smaller radius survives even when the dashes
    // blur away at tiny sprite sizes.
    float ktDwarfPlanetAlpha(vec2 p, float scale, float aa) {
      float core = ktDiscAlpha(p, 0.40 * scale, aa);
      float ring = ktRingAlpha(p, 0.80 * scale, 0.07 * scale, aa);
      // 8 segments, 50% duty
      float dash = step(0.5, fract(atan(p.y, p.x) * 4.0 / 3.14159265));

      return max(core, ring * dash);
    }

    // Moon: a crescent, cut by an offset disc.
    float ktMoonAlpha(vec2 p, float scale, float aa) {
      float disc = ktDiscAlpha(p, 0.66 * scale, aa);
      float bite = ktDiscAlpha(p - vec2(0.34 * scale, 0.12 * scale), 0.60 * scale, aa);

      return clamp(disc - bite, 0.0, 1.0);
    }

    // Asteroid: a rock. A disc whose radius wobbles with angle, so it is lumpy
    // and obviously not a planet even when it is only a few pixels across.
    float ktAsteroidAlpha(vec2 p, float scale, float aa) {
      float a = atan(p.y, p.x);
      float r = 0.58 * scale * (1.0 + 0.22 * cos(3.0 * a + 0.8) + 0.12 * cos(5.0 * a - 1.7));

      return 1.0 - smoothstep(r - aa, r + aa, length(p));
    }

    // Deep-space probe: a bus with two solar panels. These share the body dot
    // block but are spacecraft, and at Voyager's range the alternative is a dot
    // indistinguishable from a star.
    float ktSpacecraftAlpha(vec2 p, float scale, float aa) {
      vec2 a = abs(p);
      float bus = ktSquareAlpha(p, 0.30 * scale, aa);
      float panels =
        (1.0 - smoothstep(0.15 * scale - aa, 0.15 * scale + aa, a.y)) *
        (1.0 - smoothstep(0.92 * scale - aa, 0.92 * scale + aa, a.x));

      return max(bus, panels);
    }

    // Dispatch on the packed BodyGlyph class. Unknown classes fall back to the
    // terrestrial disc rather than vanishing.
    float ktBodyGlyphAlpha(int glyph, vec2 p, float scale, float pointSize) {
      float aa = ktAa(pointSize);

      if (glyph == ${BodyGlyph.GasGiant}) {
        return ktGasGiantAlpha(p, scale, aa);
      } else if (glyph == ${BodyGlyph.IceGiant}) {
        return ktIceGiantAlpha(p, scale, aa);
      } else if (glyph == ${BodyGlyph.Ringed}) {
        return ktRingedAlpha(p, scale, aa);
      } else if (glyph == ${BodyGlyph.DwarfPlanet}) {
        return ktDwarfPlanetAlpha(p, scale, aa);
      } else if (glyph == ${BodyGlyph.Moon}) {
        return ktMoonAlpha(p, scale, aa);
      } else if (glyph == ${BodyGlyph.Asteroid}) {
        return ktAsteroidAlpha(p, scale, aa);
      } else if (glyph == ${BodyGlyph.Spacecraft}) {
        return ktSpacecraftAlpha(p, scale, aa);
      }

      return ktTerrestrialAlpha(p, scale, aa);
    }

    // Core dot coverage for the active style. scale < 1 shrinks the core to
    // leave room for a status marker band around it.
    float ktShapeAlpha(int style, vec2 p, float scale, float pointSize) {
      float aa = ktAa(pointSize);

      if (style == ${DotStyle.Disc}) {
        return ktDiscAlpha(p, 0.85 * scale, aa);
      } else if (style == ${DotStyle.Ring}) {
        return ktRingAlpha(p, 0.62 * scale, 0.17 * scale, aa);
      } else if (style == ${DotStyle.Diamond}) {
        return ktDiamondAlpha(p, 0.9 * scale, aa);
      } else if (style == ${DotStyle.Square}) {
        return ktSquareAlpha(p, 0.68 * scale, aa);
      }

      return ktSoftAlpha(p / max(scale, 0.001));
    }

    // Identification marker coverage for a status code (see DotStatus in TS):
    // searched -> thin ring, selected -> reticle (ring + cardinal ticks),
    // hover -> soft halo. Statuses None/Big return 0.
    float ktMarkerAlpha(float status, vec2 p, float pointSize) {
      float aa = ktAa(pointSize);

      if (status > ${DotStatus.Hover - 0.5}) {
        float d = abs(length(p) - 0.78);
        return (1.0 - smoothstep(0.0, 0.3, d)) * 0.85;
      } else if (status > ${DotStatus.Selected - 0.5}) {
        float ring = ktRingAlpha(p, 0.82, 0.05, aa);
        vec2 a = abs(p);
        float tickX = (1.0 - smoothstep(0.08 - aa, 0.08 + aa, a.y)) * step(0.6, a.x);
        float tickY = (1.0 - smoothstep(0.08 - aa, 0.08 + aa, a.x)) * step(0.6, a.y);
        return max(ring, max(tickX, tickY));
      } else if (status > ${DotStatus.Searched - 0.5}) {
        return ktRingAlpha(p, 0.84, 0.05, aa);
      }

      return 0.0;
    }
    `;

export const createBaseFragShader = (settings: SettingsManager): string => glsl`#version 300 es
    precision highp float;

    uniform int u_dotStyle;
    uniform bool u_statusMarkers;

    in vec4 vColor;
    in float vSize;
    in float vDist;
    in float vPointSize;
    in float vIsPlanet;
    in float vGlyph;

    out vec4 fragColor;

    ${createDotStyleGlsl(settings)}

    void main(void) {
      vec2 ptCoord = gl_PointCoord * 2.0 - vec2(1.0, 1.0);

      // vGlyph is already the glyph this dot should DRAW - the vertex shader has folded in
      // the solar-system-view gate and the center body's own suppression.
      bool hasGlyph = vGlyph > 0.5;

      // Stars always keep the soft-glow look regardless of dot style. Outer
      // planets also sit beyond 1e8 km, so exclude planets explicitly or
      // Jupiter+ render as stars and lose their glyph and status markers. The
      // deep-space probes are past 1e8 km too and are NOT planets, so their
      // glyph has to veto the star branch on its own.
      bool isStar = vDist > 1.0e8 && vIsPlanet < 0.5 && !hasGlyph;

      // vSize carries the per-dot status code (see DotStatus); markers only
      // exist for statuses above Big so planets stay plain
      float status = (u_statusMarkers && !isStar) ? vSize : 0.0;
      float hasMarker = step(${DotStatus.Big + 0.5}, status);

      // Shrink the core dot when a marker band is drawn around it
      float coreScale = mix(1.0, 0.55, hasMarker);
      float core;

      if (hasGlyph) {
        core = ktBodyGlyphAlpha(int(vGlyph + 0.5), ptCoord, coreScale, vPointSize);
      } else {
        core = isStar ? ktSoftAlpha(ptCoord) : ktShapeAlpha(u_dotStyle, ptCoord, coreScale, vPointSize);
      }
      float marker = hasMarker * ktMarkerAlpha(status, ptCoord, vPointSize);

      // Marker composites on top: white for rings/reticle, dot-tinted for the
      // hover halo. Clamp (not just min) so edge fragments land at exactly 0,
      // never negative: with standard src-alpha blending an alpha-0 fragment is
      // a true no-op, which is visually identical to the old discard but keeps
      // early-Z enabled for the whole draw, so the ~half of the catalog behind
      // the Earth is rejected before fragment shading (a discard anywhere in
      // the shader disables early-Z).
      vec3 markerColor = status > ${DotStatus.Hover - 0.5} ? vColor.rgb : vec3(1.0);
      vec3 rgb = mix(vColor.rgb, markerColor, marker);
      float alpha = clamp(max(core, marker), 0.0, 1.0);

      fragColor = vec4(rgb, vColor.a * alpha);
    }
    `;

/**
 * Vertex-side lookup for the packed body-glyph table. Interpolated into the base and symbology
 * vertex shaders so the unpacking can never drift from {@link packBodyGlyphs}.
 *
 * Declares `u_bodyGlyph` itself - every shader that includes this MUST therefore have the
 * uniform assigned (`GlUtils.assignUniforms` throws on a uniform it cannot find).
 */
export const createBodyGlyphLookupGlsl = (): string => glsl`
    uniform int u_bodyGlyph[${BODY_GLYPH_WORDS}];

    // The BodyGlyph class for a slot in the body block (gl_VertexID - u_planetIdx1), or
    // BodyGlyph.None for anything outside it. Four bits per body, eight bodies per word.
    int ktBodyGlyphAt(int slot) {
      if (slot < 0 || slot >= ${BODY_GLYPH_WORDS * 8}) {
        return ${BodyGlyph.None};
      }

      return (u_bodyGlyph[slot >> 3] >> ((slot & 7) * 4)) & 15;
    }
    `;

export const createBaseVertShader = (settings: SettingsManager): string => glsl`#version 300 es
    precision highp float;
    ${WGS84_GLSL}
    in vec3 a_position;
    in vec4 a_color;
    in float a_size;

    uniform float u_minSize;
    uniform float u_maxSize;
    uniform float u_starMinSize;
    uniform vec3 worldOffset;
    uniform mat4 u_pMvCamMatrix;
    uniform float logDepthBufFC;
    uniform bool u_flatMapMode;
    uniform float u_gmst;
    uniform float u_currentGmst;
    uniform float u_earthRadius;
    uniform float u_flatMapCenterX;
    uniform float u_flatMapZoom;
    uniform bool u_polarViewMode;
    uniform vec3 u_sensorEcef;
    uniform mat3 u_ecefToEnu;
    uniform float u_polarRadius;
    uniform float u_polarZoom;
    uniform vec3 u_camPos;
    uniform int u_starIdx1;
    uniform int u_starIdx2;
    uniform int u_planetIdx1;
    uniform int u_planetIdx2;
    uniform bool u_planetGlyph;
    uniform int u_hiddenBodyIdx;

    out vec4 vColor;
    out float vSize;
    out float vDist;
    out float vPointSize;
    out float vIsPlanet;
    out float vGlyph;

    ${createBodyGlyphLookupGlsl()}

    float when_lt(float x, float y) {
        return max(sign(y - x), 0.0);
    }
    float when_ge(float x, float y) {
        return 1.0 - when_lt(x, y);
    }

    void main(void) {
        // Solar-system bodies and deep-space probes share one contiguous index block, and
        // which of the two a dot is comes out of the glyph table rather than a second range.
        // Set first so every early-return path leaves the varyings defined.
        int bodySlot = (gl_VertexID >= u_planetIdx1 && gl_VertexID <= u_planetIdx2) ? gl_VertexID - u_planetIdx1 : -1;
        int glyph = ktBodyGlyphAt(bodySlot);
        // Planet treatment (origin-cull exemption, star exclusion) covers every celestial body
        // in the block but not the probes, which are spacecraft. Derived from the glyph the
        // body HAS, not the one it draws, so it holds for the center body too.
        float isPlanet = (glyph > ${BodyGlyph.None} && glyph != ${BodyGlyph.Spacecraft}) ? 1.0 : 0.0;
        float glyphDrawn = (glyph > ${BodyGlyph.None} && u_planetGlyph) ? float(glyph) : 0.0;

        vIsPlanet = isPlanet;
        vGlyph = glyphDrawn;

        /*
         * Drop the center body's dot entirely while its own mesh is on screen (DotsManager
         * only names it then, and passes -1 otherwise). The dot sits at the mesh's exact
         * center, so it is a marker for the thing you are already looking at: a planet's
         * sphere buries it, but a probe framed at 84 m is thin booms and the dot showed
         * straight through the gaps. Must match the picking shader or it stays an invisible
         * click target.
         *
         * Compared as an ABSOLUTE vertex id, never a slot: slots are -1 outside the body
         * block, so a slot comparison also matched every star and satellite the moment there
         * was nothing to hide. gl_VertexID is never negative, so -1 can match nothing.
         */
        if (gl_VertexID == u_hiddenBodyIdx) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
            vColor = vec4(0.0);
            vSize = 0.0;
            vDist = 0.0;
            vPointSize = 0.0;
            return;
        }

        // Skip objects with invalid positions:
        // - NaN from failed propagation (NaN comparisons always false)
        // - Positions inside Earth (< 100 km from center)
        // Planet dots are exempt from the near-origin cull: Earth's own planet
        // dot legitimately sits AT the ECI origin (Earth-centered frame), and
        // in planet-centered views the worldOffset moves it on-screen. The pro
        // symbology shader has no such cull, so this keeps the builds in parity.
        float posLen = length(a_position);
        if ((posLen < 100.0 && isPlanet < 0.5) || posLen != posLen) {
            gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
            gl_PointSize = 0.0;
            vColor = vec4(0.0);
            vSize = 0.0;
            vDist = 0.0;
            vPointSize = 0.0;
            return;
        }

        vec3 eciPos = a_position + worldOffset;
        vec4 position;

        if (u_flatMapMode) {
            float PI = 3.14159265359;
            float eciDist = length(eciPos);

            // Filter out stars and distant objects
            if (eciDist > 1.0e7) {
                gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                gl_PointSize = 0.0;
                vColor = vec4(0.0);
                vSize = 0.0;
                vDist = eciDist;
                vPointSize = 0.0;
                return;
            }

            float lon = atan(eciPos.y, eciPos.x) - u_gmst;
            lon = mod(lon + PI, 2.0 * PI) - PI;
            float lat = geodeticLatitude(eciPos);
            float alt = eciDist - u_earthRadius;
            vec3 flatPos = vec3(lon * u_earthRadius, lat * u_earthRadius, alt * 0.001);

            // Wrap X to nearest copy of camera center for seamless scrolling
            float mapW = 2.0 * PI * u_earthRadius;
            flatPos.x = u_flatMapCenterX + mod(flatPos.x - u_flatMapCenterX + mapW * 0.5, mapW) - mapW * 0.5;

            position = u_pMvCamMatrix * vec4(flatPos, 1.0);
        } else if (u_polarViewMode) {
            float PI = 3.14159265359;
            float eciDist = length(eciPos);

            if (eciDist > 1.0e7) {
                gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                gl_PointSize = 0.0;
                vColor = vec4(0.0);
                vSize = 0.0;
                vDist = eciDist;
                vPointSize = 0.0;
                return;
            }

            // ECI to ECEF — use u_currentGmst (main-thread, frame-accurate)
            // instead of u_gmst (from cruncher worker, may lag during rapid time changes)
            float cg = cos(u_currentGmst);
            float sg = sin(u_currentGmst);
            vec3 ecef = vec3(
                eciPos.x * cg + eciPos.y * sg,
               -eciPos.x * sg + eciPos.y * cg,
                eciPos.z
            );

            // ECEF to ENU (sensor-relative)
            vec3 d = ecef - u_sensorEcef;
            vec3 enu = u_ecefToEnu * d;

            // ENU to azimuth/elevation
            float az = atan(enu.x, enu.y);
            float el = atan(enu.z, length(enu.xy));

            // Cull below-horizon satellites
            if (el < 0.0) {
                gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                gl_PointSize = 0.0;
                vColor = vec4(0.0);
                vSize = 0.0;
                vDist = eciDist;
                vPointSize = 0.0;
                return;
            }

            // Polar projection: zenith at center, horizon at edge
            float r = (PI / 2.0 - el) / (PI / 2.0);
            vec3 polarPos = vec3(
                r * sin(az) * u_polarRadius,
                r * cos(az) * u_polarRadius,
                0.0
            );

            position = u_pMvCamMatrix * vec4(polarPos, 1.0);
        } else {
            // Rotate stale ground-object ECI positions to match current Earth rotation
            float groundDist = length(a_position.xyz);
            if (groundDist < 6421.0) {
                float deltaGmst = u_currentGmst - u_gmst;
                float cosD = cos(deltaGmst);
                float sinD = sin(deltaGmst);
                eciPos = vec3(
                    a_position.x * cosD - a_position.y * sinD + worldOffset.x,
                    a_position.x * sinD + a_position.y * cosD + worldOffset.y,
                    a_position.z + worldOffset.z
                );
            }
            // Stars are fixed directions on the celestial sphere, not positions:
            // re-anchor the star shell to the camera so it never parallaxes. The
            // shell sits a fixed 3e10 km from the ECI origin, so without this the
            // camera can pass outside it when parked at a deep-space probe like
            // Voyager 1 (~2.5e10 km out). Must match the picking shader.
            if (gl_VertexID >= u_starIdx1 && gl_VertexID <= u_starIdx2) {
                eciPos = a_position + u_camPos;
            }
            // Pull the dot toward the camera (fraction of range, capped) so the
            // Earth sphere cannot slice through the screen-facing sprite when a
            // dot sits on or just above the surface. Ray-aligned: no parallax
            // shift, only the depth changes. The cap keeps the pull from growing
            // with zoom-out and dragging back-of-Earth dots through the limb.
            // Must match the picking shader.
            vec3 toCam = u_camPos - eciPos;
            float pullDist = min(length(toCam) * ${settings.satShader.depthPullFactor}, float(${settings.satShader.depthPullMaxKm}));
            eciPos += normalize(toCam) * pullDist;
            position = u_pMvCamMatrix * vec4(eciPos, 1.0);
        }

        gl_Position = position;

        ${DepthManager.getLogDepthVertCode()}

        float dist = distance(vec3(0.0, 0.0, 0.0), a_position.xyz);

        if (u_flatMapMode) {
          // Large dots (searched/selected, a_size>=0.5) shrink when zoomed in so they don't obscure the map
          // Small dots (regular satellites) keep a fixed minimum size
          float isBig = step(0.5, a_size);
          float bigSize = float(${settings.satShader.starSize}) / sqrt(u_flatMapZoom);
          float flatSize = mix(u_minSize, max(bigSize, 3.0), isBig);
          gl_PointSize = max(flatSize, 1.0);
          vPointSize = gl_PointSize;
          vColor = a_color;
          vSize = a_size * 1.0;
          vDist = dist;
          return;
        }

        if (u_polarViewMode) {
          float zoomScale = sqrt(u_polarZoom);
          float polarSize = mix(u_minSize, float(${settings.satShader.starSize}), step(0.5, a_size));
          gl_PointSize = polarSize * zoomScale;
          vPointSize = gl_PointSize;
          vColor = a_color;
          vSize = a_size * 1.0;
          vDist = dist;
          return;
        }

        float drawSize = 0.0;
        float baseSize = pow(${settings.satShader.distanceBeforeGrow} \/ position.z, 2.1);

        // Use star min size for objects beyond 1e8 km (stars), regular min size for satellites
        float effectiveMinSize = mix(u_minSize, u_starMinSize, step(1.0e8, dist));

        // Satellite / Star
        drawSize +=
        when_lt(a_size, 0.5) *
        (min(max(baseSize, effectiveMinSize), u_maxSize) * 1.0);

        // Something on the ground
        drawSize +=
        when_lt(a_size, 0.5) * when_lt(dist, 6421.0) *
        (min(max(baseSize, u_minSize * 0.5), u_maxSize) * 1.0);

        // Searched Object
        drawSize += when_ge(a_size, 0.5) * ${settings.satShader.starSize};

        // Bodies render a bolder glyph, so give the sprite room to draw it - but only
        // when the glyph is actually drawn, or a plain body dot would be 40% too big
        drawSize *= 1.0 + 0.4 * step(0.5, glyphDrawn);

        gl_PointSize = drawSize;
        vPointSize = gl_PointSize;
        vColor = a_color;
        vSize = a_size * 1.0;
        vDist = dist;
    }
    `;
