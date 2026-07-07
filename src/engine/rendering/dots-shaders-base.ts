import { SettingsManager } from '../../settings/settings';
import { glsl } from '../utils/development/formatter';
import { DepthManager } from './depth-manager';

export const createBaseFragShader = (settings: SettingsManager): string => (
    glsl`#version 300 es
    precision highp float;

    in vec4 vColor;
    in float vSize;
    in float vDist;
    in float vPointSize;

    out vec4 fragColor;

    void main(void) {
      vec2 ptCoord = gl_PointCoord * 2.0 - vec2(1.0, 1.0);

      float r = (${settings.satShader.blurFactor1} - min(abs(length(ptCoord)), 1.0));
      float alpha = (2.0 * r + ${settings.satShader.blurFactor2});
      alpha = min(alpha, 1.0);
      if (alpha < 0.01) discard;

      fragColor = vec4(vColor.rgb, vColor.a * alpha);
    }
    `
);

export const createBaseVertShader = (settings: SettingsManager): string => (
    glsl`#version 300 es
    precision highp float;
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

    out vec4 vColor;
    out float vSize;
    out float vDist;
    out float vPointSize;

    float when_lt(float x, float y) {
        return max(sign(y - x), 0.0);
    }
    float when_ge(float x, float y) {
        return 1.0 - when_lt(x, y);
    }

    void main(void) {
        // Skip objects with invalid positions:
        // - NaN from failed propagation (NaN comparisons always false)
        // - Positions inside Earth (< 100 km from center)
        float posLen = length(a_position);
        if (posLen < 100.0 || posLen != posLen) {
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
            float lat = atan(eciPos.z, length(eciPos.xy));
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

        gl_PointSize = drawSize;
        vPointSize = gl_PointSize;
        vColor = a_color;
        vSize = a_size * 1.0;
        vDist = dist;
    }
    `
);
