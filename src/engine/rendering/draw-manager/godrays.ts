import { ServiceLocator } from '@app/engine/core/service-locator';
import { BufferAttribute } from '@app/engine/rendering/buffer-attribute';
import { FlatGeometry } from '@app/engine/rendering/flat-geometry';
import { GLSL3 } from '@app/engine/rendering/material';
import { Mesh } from '@app/engine/rendering/mesh';
import { ShaderMaterial } from '@app/engine/rendering/shader-material';
import { RADIUS_OF_SUN } from '@app/engine/utils/constants';
import { glsl } from '@app/engine/utils/development/formatter';
import { mat4, vec2, vec4 } from 'gl-matrix';
import { DepthManager } from '../depth-manager';
import { Sun } from './sun';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

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

export class Godrays {
  mesh: Mesh;
  private sun_: Sun;
  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  /**
   * TODO: Verify we need a render buffer for godrays
   */
  renderBuffer: WebGLRenderbuffer;

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer: WebGLFramebuffer | null) {
    if (!this.isLoaded_ || settingsManager.isDisableGodrays) {
      return;
    }
    // Calculate sun position immediately before drawing godrays
    const screenPosition = this.getScreenCoords_(pMatrix, camMatrix);

    if (isNaN(screenPosition[0]) || isNaN(screenPosition[1])) {
      return;
    }

    const gl = this.gl_;

    // Calculate sun's screen-space radius
    const sunPosArr = [this.sun_.eci.x, this.sun_.eci.y, this.sun_.eci.z];
    const distanceFromSun = ServiceLocator.getMainCamera().getDistFromEntity(sunPosArr);

    // sunRadius is 0.02 at 62e6 km and 1.0 at 10000 km - scale it accordingly
    // with 0.02 being the max size
    let sunRadius = RADIUS_OF_SUN / distanceFromSun * 6250;

    sunRadius = Math.min(Math.max(sunRadius, 0.02), 1.0);

    this.mesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    gl.depthMask(false);

    gl.uniform1i(this.mesh.material.uniforms.u_sampler, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mesh.material.map);
    gl.uniform2f(this.mesh.material.uniforms.u_sunPosition, screenPosition[0], screenPosition[1]);
    gl.uniform2f(this.mesh.material.uniforms.u_resolution, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(this.mesh.material.uniforms.u_sunRadius, sunRadius);

    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);

    // Future writing needs to have a depth test
    gl.depthMask(true);
  }

  init(gl: WebGL2RenderingContext, sun: Sun): void {
    this.gl_ = gl;
    this.sun_ = sun;

    const geometry = new FlatGeometry(this.gl_, {
      attributes: {
        a_position: new BufferAttribute({
          location: 0,
          vertices: 2,
          offset: 0,
          stride: Float32Array.BYTES_PER_ELEMENT * 4,
        }),
        a_texCoord: new BufferAttribute({
          location: 1,
          vertices: 2,
          offset: Float32Array.BYTES_PER_ELEMENT * 2,
          stride: Float32Array.BYTES_PER_ELEMENT * 4,
        }),
      },
    });
    const material = new ShaderMaterial(this.gl_, {
      uniforms: {
        u_sunPosition: <WebGLUniformLocation><unknown>null,
        u_sampler: <WebGLUniformLocation><unknown>null,
        u_resolution: <WebGLUniformLocation><unknown>null,
        u_sunRadius: <WebGLUniformLocation><unknown>null,
      },
      map: gl.createTexture(),
      textureType: 'flat',
      vertexShader: this.shaders_.vert,
      fragmentShader: this.shaders_.frag,
      glslVersion: GLSL3,
    });

    this.mesh = new Mesh(this.gl_, geometry, material, {
      name: 'godrays',
      precision: 'highp',
      disabledUniforms: {
        modelMatrix: true,
        modelViewMatrix: true,
        projectionMatrix: true,
        viewMatrix: true,
        normalMatrix: true,
        cameraPosition: true,
        worldOffset: true,
      },
      disabledAttributes: {
        normal: true,
      },
    });
    this.mesh.geometry.initVao(this.mesh.program);
    this.initFrameBuffer_();

    this.isLoaded_ = true;
  }

  private getScreenCoords_(pMatrix: mat4, camMatrix: mat4): vec2 {
    const posVec4 = vec4.fromValues(this.sun_.position[0], this.sun_.position[1], this.sun_.position[2], 1);

    vec4.transformMat4(posVec4, posVec4, camMatrix);
    vec4.transformMat4(posVec4, posVec4, pMatrix);

    // In 0.0 to 1.0 space
    const screenPosition = <vec2>[posVec4[0] / posVec4[3], posVec4[1] / posVec4[3]];

    screenPosition[0] = (screenPosition[0] + 1) * 0.5; // * window.innerWidth;
    screenPosition[1] = (-screenPosition[1] + 1) * 0.5; // * window.innerHeight;

    return screenPosition;
  }

  private initFrameBuffer_(): void {
    const gl = this.gl_;

    ServiceLocator.getScene().frameBuffers.godrays = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, ServiceLocator.getScene().frameBuffers.godrays);

    this.renderBuffer = gl.createRenderbuffer(); // create RB to store the depth buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.mesh.material.map, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderBuffer);
  }

  /*
   * Instead of a large kernel, use a separable blur or multi-pass radial sampling.
   * Here, we use a wide radial sampling for godrays, which is much cheaper than a huge blur kernel.
   */
  private readonly shaders_ = {
    frag: glsl`
      uniform sampler2D u_sampler;
      uniform vec2 u_sunPosition;
      uniform vec2 u_resolution;
      uniform float u_sunRadius;

      in vec2 v_texCoord;
      out vec4 fragColor;

      float rand(vec2 co){
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }

      void main() {
        int samples = 40;
        float decay = 0.95;
        float exposure = 0.21;
        float density = 0.965;
        float weight = 0.65;

        vec2 lightPositionOnScreen = vec2(u_sunPosition.x, 1.0 - u_sunPosition.y);
        vec2 texCoord = v_texCoord;

        vec2 deltaTexCoord = (texCoord - lightPositionOnScreen.xy);

        float dist = length(deltaTexCoord * vec2(u_resolution.x / u_resolution.y, 1.0));

        // Define sun radius in normalized screen space (now aspect-corrected)
        float margin = 0.15;
        bool sunVisible =
          lightPositionOnScreen.x > -margin && lightPositionOnScreen.x < 1.0 + margin &&
          lightPositionOnScreen.y > -margin && lightPositionOnScreen.y < 1.0 + margin &&
          dist <= 1.5 + margin;

        if (!sunVisible) {
          fragColor = texture(u_sampler, v_texCoord);
          return;
        }

        float softEdge = 0.15; // Transition zone

        // Calculate smooth falloff
        float edgeFactor = smoothstep(u_sunRadius, u_sunRadius + softEdge, dist);

        float noise = 0.0;
        if (dist > u_sunRadius) {
          // Incorporate u_sunPosition.x and u_sunPosition.y into noise calculation
          noise = rand(v_texCoord * u_resolution + float(gl_FragCoord.x + gl_FragCoord.y) + u_sunPosition.x * 100.0 + u_sunPosition.y * 1000.0);
          noise *= edgeFactor; // Fade noise in gradually
        }

        vec4 color = vec4(0.0);
        float illum = 1.0;

        // Add more randomness to the sampling direction and step
        float angle = rand(v_texCoord * 100.0 + gl_FragCoord.xy + u_sunPosition.xy * 50.0) * 6.2831853;
        float sinA = sin(angle) * (0.0002 + rand(v_texCoord * 200.0 + u_sunPosition.xy * 20.0) * 0.0003);
        float cosA = cos(angle) * (0.0002 + rand(v_texCoord * 300.0 + u_sunPosition.xy * 30.0) * 0.0003);
        vec2 randomOffset = vec2(cosA, sinA);

        // Randomize density per pixel
        float densityJitter = density + (rand(v_texCoord * 400.0 + gl_FragCoord.xy + u_sunPosition.xy * 40.0) - 0.5) * 0.05;

        vec2 step = (deltaTexCoord + randomOffset) * densityJitter / float(samples);

        texCoord -= step * noise;

        // Vary starting illumination slightly
        illum *= 1.0 + (rand(v_texCoord * 500.0 + gl_FragCoord.xy + u_sunPosition.xy * 60.0) - 0.5) * 0.1;

        for(int i = 0; i < samples; i++) {
          texCoord -= step;

          // Add random jitter to each sample position
          vec2 jitter = vec2(
            (rand(texCoord * 600.0 + float(i) + u_sunPosition.x * 70.0) - 0.5) * 0.001,
            (rand(texCoord * 700.0 + float(i) + u_sunPosition.y * 80.0) - 0.5) * 0.001
          );
          vec2 sampleCoord = texCoord + jitter;

          if (sampleCoord.x < 0.0 || sampleCoord.x > 1.0 || sampleCoord.y < 0.0 || sampleCoord.y > 1.0) {
            break;
          }

          vec4 sampleColor = texture(u_sampler, sampleCoord);
          sampleColor *= illum * weight;
          color += sampleColor;
          illum *= decay;
        }

        vec4 scene = texture(u_sampler, v_texCoord);
        vec3 rays = 1.0 - exp(-color.rgb * exposure);

        float blendFactor = 0.7 + 0.3 * noise;
        vec3 blended = dist > u_sunRadius ? mix(scene.rgb + rays, rays, blendFactor) : scene.rgb + rays;

        fragColor = vec4(blended, 1.0);

        ${DepthManager.getLogDepthFragCode()}
      }
    `,
    vert: glsl`
      in vec2 a_position;
      in vec2 a_texCoord;

      uniform vec2 u_resolution;

      out vec2 v_texCoord;

      void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;

        gl_Position = vec4(clipSpace, 0, 1);
        v_texCoord = a_texCoord;

        ${DepthManager.getLogDepthVertCode()}
      }
    `,
  };
}
