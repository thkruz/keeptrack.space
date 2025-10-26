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

import { SolarBody } from '@app/engine/core/interfaces';
import { glsl } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { DEG2RAD, EciVec3 } from '@ootk/src/main';
import { BackdatePosition as backdatePosition, Body, KM_PER_AU, RotationAxis as rotationAxis } from 'astronomy-engine';
import { vec3 } from 'gl-matrix';
import { settingsManager } from '../../../../settings/settings';
import { DepthManager } from '../../depth-manager';
import { GlUtils } from '../../gl-utils';
import { GLSL3 } from '../../material';
import { Mesh } from '../../mesh';
import { RingGeometry } from '../../ring-geometry';
import { ShaderMaterial } from '../../shader-material';
import { CelestialBody } from './celestial-body';
import { Uranus } from './uranus';

// TODO: Uranus doesn't occlude the sun yet!

export enum UranusRingsTextureQuality {
  HIGH = '2k',
  ULTRA = '1k'
}

export class UranusRings extends CelestialBody {
  readonly RADIUS = 69911;
  protected readonly NUM_HEIGHT_SEGS = 256;
  protected readonly NUM_WIDTH_SEGS = 256;
  private readonly uranus_: Uranus;
  eci: EciVec3;

  constructor(uranus_: Uranus) {
    super();
    this.uranus_ = uranus_;
    this.meanDistanceToSun = uranus_.meanDistanceToSun;
    this.orbitalPeriod = uranus_.orbitalPeriod;
  }

  async init(gl: WebGL2RenderingContext): Promise<void> {
    try {
      this.gl_ = gl;
      const geometry = new RingGeometry(gl, {
        innerRadius: 37500,
        outerRadius: 50700,
        thetaSegments: this.NUM_WIDTH_SEGS,
        phiSegments: this.NUM_HEIGHT_SEGS,
        thetaStart: 0,
        thetaLength: Math.PI * 2,
        isSkipTexture: false,
      });
      const texture = await GlUtils.initTexture(gl, this.getTexturePath());
      const alphaTexture = await GlUtils.initTexture(gl, this.getAlphaPath());
      const material = new ShaderMaterial(gl, {
        uniforms: {
          sampler: null as unknown as WebGLUniformLocation,
          alphaMap: null as unknown as WebGLUniformLocation,
          sunPos: null as unknown as WebGLUniformLocation,
          uranusPos: null as unknown as WebGLUniformLocation, // new
          uranusRadius: null as unknown as WebGLUniformLocation, // new
        },
        map: texture,
        alphaMap: alphaTexture,
        vertexShader: this.shaders.vert,
        fragmentShader: this.shaders.frag,
        glslVersion: GLSL3,
      });

      this.mesh = new Mesh(gl, geometry, material, {
        name: this.getName(),
        precision: 'highp',
        disabledUniforms: {
          modelMatrix: true,
          viewMatrix: true,
        },
      });
      this.mesh.geometry.initVao(this.mesh.program);
      this.isLoaded_ = true;
    } catch (e) {
      errorManagerInstance.warn(`Error initializing ${this.getName()}:`, e);
    }
  }

  getTexturePath(): string {
    return `${settingsManager.installDirectory}textures/uranus-rings${UranusRingsTextureQuality.ULTRA}.jpg`;
  }

  useHighestQualityTexture(): void {
    // Do nothing for now
  }

  getAlphaPath(): string {
    return `${settingsManager.installDirectory}textures/uranus-rings-alpha${UranusRingsTextureQuality.ULTRA}.png`;
  }

  getName(): SolarBody {
    return SolarBody.Uranus;
  }

  updatePosition(simTime: Date): void {
    const pos = backdatePosition(simTime, SolarBody.Earth as unknown as Body, SolarBody.Uranus as unknown as Body, false);
    const ros = rotationAxis(SolarBody.Uranus as unknown as Body, simTime);

    this.position = [pos.x * KM_PER_AU, pos.y * KM_PER_AU, pos.z * KM_PER_AU];
    this.rotation = [0, (ros.dec - 90) * DEG2RAD, ros.spin * DEG2RAD];
  }

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_) {
      return;
    }
    const gl = this.gl_;

    this.mesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    this.setUniforms_(gl, sunPosition);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mesh.material.map);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.mesh.material.alphaMap);
    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  protected setUniforms_(gl: WebGL2RenderingContext, sunPosition: vec3) {
    super.setUniforms_(gl, sunPosition);
    gl.uniform1i(this.mesh.material.uniforms.alphaMap, 1);
    gl.uniform3fv(this.mesh.material.uniforms.uranusPos, [0, 0, 0]); // [x, y, z] in world units
    gl.uniform1f(this.mesh.material.uniforms.uranusRadius, this.uranus_.radius); // in world units
  }

  protected readonly shaders = {
    frag: glsl`
        uniform sampler2D sampler;
        uniform sampler2D alphaMap;

        uniform vec3 uranusPos;
        uniform float uranusRadius;
        uniform vec3 sunPos;

        in vec2 v_texcoord;
        in vec3 v_normal;
        in vec3 vVertToCamera;
        in vec3 v_worldPosition;

        out vec4 fragColor;

        void main(void) {
          vec3 fragToCamera = normalize(vVertToCamera);
          vec3 lightDirection = sunPos - vec3(0.0,0.0,0.0);
          lightDirection = normalize(lightDirection);
          float lightFromBody = max(dot(v_normal, lightDirection), 0.0);

          // Improved color and lighting for visual quality
          vec3 texColor = texture(sampler, v_texcoord).rgb;
          float alpha = texture(alphaMap, v_texcoord).r;
          // Smooth alpha threshold to reduce aliasing at ring edges
          float alphaSmooth = smoothstep(0.01, 0.08, alpha);
          if (alphaSmooth < 0.01) {
            alphaSmooth = 0.0;
          }

          // Subtle rim lighting for ring edges
          float rim = pow(1.0 - dot(fragToCamera, v_normal), 2.0) * 0.25;

          // Calculate world position of fragment
          vec3 fragWorldPos = v_worldPosition.xyz;

          // Vector from fragment to sun
          vec3 fragToSun = normalize(sunPos - fragWorldPos);

          // Vector from fragment to Uranus center
          vec3 fragToUranus = uranusPos - fragWorldPos;

          // Project fragToUranus onto fragToSun
          float proj = dot(fragToUranus, fragToSun);

          // Closest point on the sun-ray to Uranus's center
          vec3 closestPoint = fragWorldPos + fragToSun * proj;

          // Distance from Uranus's center to this closest point
          float distToUranus = length(uranusPos - closestPoint);

          // If distToUranus < uranusRadius and proj > 0, fragment is in shadow
          float shadow = (distToUranus < uranusRadius && proj > 0.0) ? 0.0 : 1.0;

          // Much darker like the planet, apply shadow
          vec3 litTexColor = texColor * (vec3(0.0025, 0.0025, 0.0025) + lightFromBody) * shadow;

          fragColor = vec4(litTexColor, alphaSmooth);
          ${DepthManager.getLogDepthFragCode()}
        }
      `,
    vert: glsl`
        uniform float drawPosition;
        out vec2 v_texcoord;
        out vec3 v_normal;
        out vec3 vVertToCamera;
        out vec3 v_worldPosition;
        void main(void) {
          vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
          worldPosition.xyz += worldOffset;
          vVertToCamera = normalize(vec3(cameraPosition) - worldPosition.xyz);
          v_texcoord = uv;
          v_normal = normalMatrix * normal;
          v_worldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * worldPosition;
          ${DepthManager.getLogDepthVertCode()}
        }
      `,
  };
}
