/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { EciArr3, SolarBody } from '@app/engine/core/interfaces';
import { glsl } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import { DEG2RAD } from '@ootk/src/main';
import { vec3 } from 'gl-matrix';
import { settingsManager } from '../../../../settings/settings';
import { DepthManager } from '../../depth-manager';
import { GlUtils } from '../../gl-utils';
import { GLSL3 } from '../../material';
import { Mesh } from '../../mesh';
import { ShaderMaterial } from '../../shader-material';
import { CelestialBody } from './celestial-body';
// Type-only: venus.ts imports this module for a value, so a value import back would be a cycle.
import type { Venus } from './venus';

/**
 * Venus's mean solid-body radius, km. It lives here rather than in venus.ts because
 * {@link VenusAtmosphere} needs it in a field initializer, and importing a value from
 * venus.ts would close an import cycle (venus.ts already imports this module).
 */
export const VENUS_RADIUS_KM = 6051.8;

/**
 * Altitude of the visible cloud tops, km. About 1% of the radius - enough to read as a
 * distinct shell standing off the surface at close zoom without opening a gap large
 * enough to fly a camera through.
 */
export const VENUS_CLOUD_TOP_ALTITUDE_KM = 65;

/** Sidereal rotation period of the solid body, days. Retrograde, hence the sign flip below. */
export const SURFACE_ROTATION_PERIOD_DAYS = 243.025;

/**
 * Period of the cloud-deck super-rotation, days. Venus's real upper atmosphere laps the
 * planet about every 4.2 days - roughly sixty times faster than the ground under it - which
 * is the whole reason this layer gets its own spin instead of riding the surface matrix.
 * It is a tuning knob: drop it below the physical value to make the motion obvious at 1x
 * time rather than only under fast propagation.
 */
export const CLOUD_ROTATION_PERIOD_DAYS = 0.2;

/**
 * Degrees per day the cloud deck gains on the surface. Negative because both spin
 * retrograde and the clouds do it far faster; the surface term cancels the spin already
 * baked into Venus's own rotation, leaving only the relative motion to add.
 */
const RELATIVE_SPIN_RATE_DEG_PER_DAY = -360 / CLOUD_ROTATION_PERIOD_DAYS + 360 / SURFACE_ROTATION_PERIOD_DAYS;

const MS_PER_DAY = 86400000;
/** Unix ms at 2000-01-01 12:00:00 UTC, the civil instant nearest the J2000 epoch. */
const J2000_UTC_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

/**
 * Semi-transparent cloud shell drawn just above Venus's surface, spinning on its own
 * (much faster) axis rate. Modeled on {@link SaturnRings}: a sibling {@link CelestialBody}
 * that {@link Venus} owns, updates and draws right after itself, rather than a second pass
 * bolted onto the base body.
 *
 * The real deck is opaque; this one is deliberately not, so the surface features stay
 * legible through it and the two rates are visibly turning against each other.
 */
export class VenusAtmosphere extends CelestialBody {
  readonly RADIUS = VENUS_RADIUS_KM + VENUS_CLOUD_TOP_ALTITUDE_KM;
  protected readonly NUM_HEIGHT_SEGS = 64;
  protected readonly NUM_WIDTH_SEGS = 64;

  /**
   * Base opacity of the deck face-on, 0-1. The limb term in the fragment shader takes it
   * the rest of the way to opaque at the edge of the disk.
   */
  opacity = 0.72;

  /** Slight warm cast - Venus's clouds are sulfuric acid, not water vapor. */
  tintColor: [number, number, number] = [1.0, 0.94, 0.82];

  /**
   * Outer attempts at the cloud texture, on top of the retries `GlUtils.initTexture` already
   * does internally. Bounded so a genuinely missing asset doesn't re-fetch every frame.
   */
  private static readonly MAX_TEXTURE_ATTEMPTS_ = 3;

  private readonly venus_: Venus;
  /** True while a cloud-texture fetch is in flight, so {@link draw} only starts one at a time. */
  private isTextureRequested_ = false;
  private textureAttempts_ = 0;

  constructor(venus: Venus) {
    super();
    this.venus_ = venus;
  }

  getName(): SolarBody {
    return SolarBody.Venus;
  }

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/venus-atmosphere4k.jpg`;
  }

  useHighestQualityTexture(): void {
    // Only one cloud texture ships, so the quality knob has nothing to switch to.
  }

  /**
   * Builds the shell's geometry and program but deliberately leaves `material.map` null:
   * the cloud texture is 1.5 MB and only ever visible with Venus as the center body, so
   * {@link draw} fetches it on first use instead of racing the catalog at boot.
   */
  init(gl: WebGL2RenderingContext): Promise<void> {
    try {
      this.gl_ = gl;
      const geometry = this.createGeometry_(gl);
      const material = new ShaderMaterial(gl, {
        uniforms: {
          sampler: null as unknown as WebGLUniformLocation,
          sunPos: null as unknown as WebGLUniformLocation,
          tintColor: null as unknown as WebGLUniformLocation,
          opacity: null as unknown as WebGLUniformLocation,
        },
        map: null,
        vertexShader: this.shaders.vert,
        fragmentShader: this.shaders.frag,
        glslVersion: GLSL3,
      });

      this.mesh = new Mesh(gl, geometry, material, {
        name: `${this.getName()}-atmosphere`,
        precision: 'highp',
        disabledUniforms: {
          modelMatrix: true,
          viewMatrix: true,
        },
      });
      this.mesh.geometry.initVao(this.mesh.program);

      this.isLoaded_ = true;
    } catch (e) {
      errorManagerInstance.warn(t7e('errorMsgs.Rendering.atmosphereInitError').replace('{name}', this.getName()), e);
    }

    // Nothing here awaits - the only async work, the cloud texture, is deferred to draw.
    return Promise.resolve();
  }

  /**
   * Fetches the cloud texture the first time the shell is drawn. Deliberately not
   * `CelestialBody.loadTexture`, which swallows the rejection: a transient failure (a dev
   * server rebuilding mid-transfer, a dropped connection) would then leave the deck
   * invisible for the rest of the session with no way back. Clearing the in-flight flag on
   * failure lets a later frame try again, up to {@link MAX_TEXTURE_ATTEMPTS_}.
   */
  private loadTextureOnce_(): void {
    if (this.isTextureRequested_ || this.textureAttempts_ >= VenusAtmosphere.MAX_TEXTURE_ATTEMPTS_) {
      return;
    }
    this.isTextureRequested_ = true;
    this.textureAttempts_ += 1;

    GlUtils.initTexture(this.gl_, this.getTexturePath())
      .then((texture) => {
        this.mesh.material.map = texture;
      })
      .catch((e) => {
        this.isTextureRequested_ = false;
        errorManagerInstance.warn(t7e('errorMsgs.Rendering.atmosphereTextureError').replace('{name}', this.getName()).replace('{attempt}', String(this.textureAttempts_)), e);
      });
  }

  /**
   * Tracks the surface Venus already resolved this frame (Venus updates itself before it
   * updates this shell) and adds the accumulated super-rotation about the polar axis.
   * `rotation[2]` is the spin term the base `update` applies last, after the pole tilt,
   * so adding to it turns the clouds around the same axis the surface turns on.
   */
  updatePosition(simTime: Date): void {
    const venusRotation = this.venus_.rotation;
    const daysPastEpoch = (simTime.getTime() - J2000_UTC_MS) / MS_PER_DAY;
    // Wrap before the radian conversion: thousands of days of 84 deg/day is ~1e6 degrees,
    // and folding that back to one turn keeps the float the shader eventually sees small.
    const superRotationDeg = (RELATIVE_SPIN_RATE_DEG_PER_DAY * daysPastEpoch) % 360;

    this.position = [...this.venus_.position] as EciArr3;
    this.rotation = [venusRotation[0], venusRotation[1], venusRotation[2] + superRotationDeg * DEG2RAD];
  }

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_ || settingsManager.isDisablePlanets || !settingsManager.isDrawAtmosphere) {
      return;
    }

    this.loadTextureOnce_();

    // Nothing to blend until the fetch above lands (and modelViewMatrix_ is only non-null
    // once update has run, which can lag the load by a frame).
    if (!this.mesh.material.map || !this.modelViewMatrix_) {
      return;
    }

    const gl = this.gl_;

    this.mesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    this.setUniforms_(gl, sunPosition);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    /*
     * No depth writes: the shell is transparent, and letting it own depth would hide every
     * satellite and orbit line drawn later inside the 65 km it sticks up.
     */
    gl.depthMask(false);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mesh.material.map);
    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, this.mesh.geometry.indexType, 0);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
    gl.depthMask(true);
  }

  protected setUniforms_(gl: WebGL2RenderingContext, sunPosition: vec3) {
    super.setUniforms_(gl, sunPosition);
    gl.uniform1f(this.mesh.material.uniforms.opacity, this.opacity);
  }

  protected readonly shaders = {
    frag: glsl`
      uniform sampler2D sampler;
      uniform vec3 sunPos;
      uniform vec3 tintColor;
      uniform float opacity;
      in vec2 v_texcoord;
      in vec3 v_normal;
      in vec3 vVertToCamera;
      out vec4 fragColor;
      void main(void) {
        vec3 fragToCamera = normalize(vVertToCamera);
        float facing = dot(fragToCamera, v_normal);
        // Near hemisphere only. The far half of the shell sits behind the surface for most
        // of the disk but pokes out around the limb, where it would blend a second time.
        if (facing <= 0.0) {
          discard;
        }

        vec3 lightDirection = normalize(sunPos - vec3(0.0, 0.0, 0.0));
        float lightFromBody = max(dot(v_normal, lightDirection), 0.0);
        vec3 cloudColor = texture(sampler, v_texcoord).rgb * tintColor * (vec3(0.0025, 0.0025, 0.0025) + lightFromBody);

        // A sight line near the limb crosses far more of the deck than one straight down,
        // so the clouds close up toward the edge of the disk and thin out face-on. That
        // gradient is what reads as a layer standing off the surface rather than a decal.
        float limb = pow(1.0 - facing, 3.0);
        float alpha = clamp(opacity + (1.0 - opacity) * limb, 0.0, 1.0);

        fragColor = vec4(cloudColor, alpha);
        ${DepthManager.getLogDepthFragCode()}
      }
    `,
    vert: glsl`
      out vec2 v_texcoord;
      out vec3 v_normal;
      out vec3 vVertToCamera;
      void main(void) {
        vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
        worldPosition.xyz += worldOffset;
        vVertToCamera = normalize(vec3(cameraPosition) - worldPosition.xyz);
        v_texcoord = uv;
        v_normal = normalMatrix * normal;
        gl_Position = projectionMatrix * worldPosition;
        ${DepthManager.getLogDepthVertCode()}
      }
    `,
  };
}
