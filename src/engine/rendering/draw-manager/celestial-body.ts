/**
 * Base class for rendering non-Earth celestial bodies (Moon, Mars, etc.)
 */
import { Scene } from '@app/engine/core/scene';
import { GLSL3 } from '@app/engine/rendering/material';
import { Mesh } from '@app/engine/rendering/mesh';
import { ShaderMaterial } from '@app/engine/rendering/shader-material';
import { SphereGeometry } from '@app/engine/rendering/sphere-geometry';
import { glsl } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { keepTrackApi } from '../../../keepTrackApi';
import { DepthManager } from '../depth-manager';
import { GlUtils } from '../gl-utils';

export abstract class CelestialBody {
  protected readonly RADIUS: number;
  protected readonly NUM_HEIGHT_SEGS: number;
  protected readonly NUM_WIDTH_SEGS: number;

  protected gl_: WebGL2RenderingContext;
  protected isLoaded_ = false;
  protected modelViewMatrix_ = null as unknown as mat4;
  protected readonly normalMatrix_ = mat3.create();

  position = [0, 0, 0] as vec3;
  rotation = [0, 0, 0] as vec3;
  mesh: Mesh;

  abstract getName(): string;
  abstract getTexturePath(): string;
  abstract updatePosition(simTime: Date): void;

  async init(gl: WebGL2RenderingContext): Promise<void> {
    try {
      this.gl_ = gl;
      const geometry = new SphereGeometry(gl, {
        radius: this.RADIUS,
        widthSegments: this.NUM_HEIGHT_SEGS,
        heightSegments: this.NUM_WIDTH_SEGS,
      });
      const texture = await GlUtils.initTexture(gl, this.getTexturePath());
      const material = new ShaderMaterial(gl, {
        uniforms: {
          sampler: null as unknown as WebGLUniformLocation,
          sunPos: null as unknown as WebGLUniformLocation,
        },
        map: texture,
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

  draw(sunPosition: vec3, tgtBuffer: WebGLFramebuffer | null = null) {
    if (!this.isLoaded_) {
      return;
    }
    const gl = this.gl_;

    this.mesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    this.setUniforms_(gl, sunPosition);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mesh.material.map);
    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  protected setUniforms_(gl: WebGL2RenderingContext, sunPosition: vec3) {
    gl.uniformMatrix3fv(this.mesh.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.modelViewMatrix, false, this.modelViewMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.projectionMatrix, false, keepTrackApi.getRenderer().projectionCameraMatrix);
    gl.uniform3fv(this.mesh.material.uniforms.sunPos, vec3.fromValues(sunPosition[0] * 100, sunPosition[1] * 100, sunPosition[2] * 100));
    gl.uniform1f(this.mesh.material.uniforms.drawPosition, Math.sqrt(this.position[0] ** 2 + this.position[1] ** 2 + this.position[2] ** 2));
    gl.uniform1i(this.mesh.material.uniforms.sampler, 0);
    gl.uniform3fv(this.mesh.material.uniforms.cameraPosition, keepTrackApi.getMainCamera().getForwardVector());
    gl.uniform1f(this.mesh.material.uniforms.logDepthBufFC, DepthManager.getConfig().logDepthBufFC);
  }

  update(simTime: Date) {
    if (!this.isLoaded_) {
      return;
    }
    this.updatePosition(simTime);
    this.modelViewMatrix_ = mat4.clone(this.mesh.geometry.localMvMatrix);
    if (settingsManager.centerBody !== this.getName()) {
      mat4.translate(this.modelViewMatrix_, this.modelViewMatrix_, this.position);
      const worldShift = Scene.getInstance().worldShift;

      mat4.translate(this.modelViewMatrix_, this.modelViewMatrix_, vec3.fromValues(worldShift[0], worldShift[1], worldShift[2]));
    }
    mat4.rotateX(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[0]);
    mat4.rotateY(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[1]);
    mat4.rotateZ(this.modelViewMatrix_, this.modelViewMatrix_, this.rotation[2]);
    mat3.normalFromMat4(this.normalMatrix_, this.modelViewMatrix_);
  }

  protected readonly shaders = {
    frag: glsl`
      uniform sampler2D sampler;
      uniform vec3 sunPos;
      in vec2 v_texcoord;
      in vec3 v_normal;
      in vec3 vVertToCamera;
      out vec4 fragColor;
      void main(void) {
        vec3 fragToCamera = normalize(vVertToCamera);
        if (dot(fragToCamera, v_normal) < 0.0) {
          discard;
        }
        vec3 lightDirection = sunPos - vec3(0.0,0.0,0.0);
        lightDirection = normalize(lightDirection);
        float lightFromBody = max(dot(v_normal, lightDirection), 0.0) * 1.0;
        vec3 litTexColor = texture(sampler, v_texcoord).rgb * (vec3(0.0025, 0.0025, 0.0025) + lightFromBody);
        fragColor = vec4(litTexColor, 1.0);
        ${DepthManager.getLogDepthFragCode()}
      }
    `,
    vert: glsl`
      uniform float drawPosition;
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
