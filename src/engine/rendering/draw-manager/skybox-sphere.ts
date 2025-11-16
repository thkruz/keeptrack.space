import { GlUtils } from '@app/engine/rendering/gl-utils';
import { GLSL3 } from '@app/engine/rendering/material';
import { Mesh } from '@app/engine/rendering/mesh';
import { ShaderMaterial } from '@app/engine/rendering/shader-material';
import { SphereGeometry } from '@app/engine/rendering/sphere-geometry';
import { glsl } from '@app/engine/utils/development/formatter';
import { SettingsManager } from '@app/settings/settings';
import { DEG2RAD } from '@ootk/src/main';
import { mat3, mat4 } from 'gl-matrix';
import { DepthManager } from '../depth-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

export enum MilkyWayTextureQuality {
  OFF = 'off',
  LOW = '1k',
  MEDIUM = '4k',
  HIGH = '8k',
  ULTRA = '16k'
}

export class SkyBoxSphere {
  private readonly DRAW_RADIUS = 3.5e10; // 10 billion km
  private readonly NUM_HEIGHT_SEGS = 16;
  private readonly NUM_WIDTH_SEGS = 16;

  private gl_: WebGL2RenderingContext;
  private isTexturesReady_: boolean;
  private isReadyBoundaries_ = false;
  private isReadyConstellations_ = false;
  private isReadyGraySkybox_ = false;
  private mvMatrix_ = mat4.create();
  private nMatrix_ = mat3.create();
  private settings_: SettingsManager;
  private textureBoundaries_ = <WebGLTexture><unknown>null;
  private textureConstellations_ = <WebGLTexture><unknown>null;
  private textureGraySkybox_: WebGLTexture;
  mesh: Mesh;
  private isLoaded_ = false;
  DEFAULT_RESOLUTION = MilkyWayTextureQuality.MEDIUM;
  MILKYWAY_SRC_BASE = 'skybox';
  textureMilkyWay: Record<MilkyWayTextureQuality, WebGLTexture> = {
    [MilkyWayTextureQuality.OFF]: <WebGLTexture><unknown>null,
    [MilkyWayTextureQuality.LOW]: <WebGLTexture><unknown>null,
    [MilkyWayTextureQuality.MEDIUM]: <WebGLTexture><unknown>null,
    [MilkyWayTextureQuality.HIGH]: <WebGLTexture><unknown>null,
    [MilkyWayTextureQuality.ULTRA]: <WebGLTexture><unknown>null,
  };

  static getSrcBoundaries(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('installDirectory is not defined');
    }

    const src = `${settings.installDirectory}textures/skyboxBoundaries8k.jpg`;

    return src;
  }

  static getSrcConstellations(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('installDirectory is not defined');
    }

    const src = `${settings.installDirectory}textures/skyboxConstellations8k.jpg`;

    return src;
  }

  static getSrcGraySkybox(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('installDirectory is not defined');
    }

    const src = `${settings.installDirectory}textures/skybox1k-gray.jpg`;

    return src;
  }

  private getSrc_(base: string, resolution: string | undefined, extension = 'jpg'): string {
    if (!settingsManager.installDirectory) {
      throw new Error('settingsManager.installDirectory is undefined');
    }

    return `${settingsManager.installDirectory}textures/${base}${resolution ?? this.DEFAULT_RESOLUTION}.${extension}`;
  }

  render(tgtBuffer = null as WebGLFramebuffer | null): void {
    if (!this.isLoaded_) {
      return;
    }
    if (!this.isTexturesReady_ || settingsManager.isDisableSkybox) {
      return;
    }

    // Make sure there is something to draw
    if (!this.settings_.isDrawMilkyWay && !this.settings_.isDrawConstellationBoundaries && !this.settings_.isDrawNasaConstellations && !this.settings_.isGraySkybox) {
      return;
    }

    const gl = this.gl_;

    this.mesh.program.use();
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }

    this.setUniforms_(gl);

    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.blendFunc(gl.ONE_MINUS_SRC_COLOR, gl.ONE_MINUS_SRC_COLOR);
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(null);
  }

  private setUniforms_(gl: WebGL2RenderingContext) {
    gl.uniformMatrix3fv(this.mesh.material.uniforms.normalMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.modelViewMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.projectionMatrix, false, ServiceLocator.getRenderer().projectionCameraMatrix);
    gl.uniform3fv(this.mesh.material.uniforms.worldOffset, ServiceLocator.getMainCamera().getCamPos());

    if (!this.settings_.isDrawMilkyWay && !this.settings_.isDrawConstellationBoundaries && !this.settings_.isDrawNasaConstellations) {
      gl.uniform1i(this.mesh.material.uniforms.u_texMilkyWay, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textureGraySkybox_);
      gl.uniform1f(this.mesh.material.uniforms.u_fMilkyWay, 2);
    } else {
      if (this.settings_.isDrawMilkyWay) {
        gl.uniform1i(this.mesh.material.uniforms.u_texMilkyWay, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay[settingsManager.milkyWayTextureQuality]);
      }

      if (this.settings_.isDrawConstellationBoundaries) {
        gl.uniform1i(this.mesh.material.uniforms.u_texBoundaries, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textureBoundaries_);
      } else {
        gl.uniform1i(this.mesh.material.uniforms.u_texMilkyWay, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay[settingsManager.milkyWayTextureQuality]);
      }

      if (this.settings_.isDrawNasaConstellations) {
        gl.uniform1i(this.mesh.material.uniforms.u_texConstellations, 2);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textureConstellations_);
      } else {
        gl.uniform1i(this.mesh.material.uniforms.u_texMilkyWay, 2);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay[settingsManager.milkyWayTextureQuality]);
      }

      /*
       * Figure out how bright the milky way should be to make the blending consistent
       * The more textures that are on the brighter the milky way needs to be
       */
      let milkyWayMul: 6 | 4 | 2 | 0;
      const factor1 = this.settings_.isDrawMilkyWay ? 1 : 0;
      const factor2 = this.settings_.isDrawConstellationBoundaries ? 1 : 0;
      const factor3 = this.settings_.isDrawNasaConstellations ? 1 : 0;
      const sum = factor1 + factor2 + factor3;

      if (sum === 3) {
        milkyWayMul = 6;
      } else if (sum === 2) {
        milkyWayMul = 4;
      } else if (sum === 1) {
        milkyWayMul = 2;
      } else {
        milkyWayMul = 0;
      }

      gl.uniform1f(this.mesh.material.uniforms.u_fMilkyWay, milkyWayMul);
    }
  }

  init(gl: WebGL2RenderingContext): void {
    this.gl_ = gl;
    this.settings_ = settingsManager;

    const geometry = new SphereGeometry(gl, {
      radius: this.DRAW_RADIUS,
      widthSegments: this.NUM_WIDTH_SEGS,
      heightSegments: this.NUM_HEIGHT_SEGS,
    });

    this.initTextures_();
    const material = new ShaderMaterial(gl, {
      uniforms: {
        u_texMilkyWay: null as unknown as WebGLUniformLocation,
        u_texBoundaries: null as unknown as WebGLUniformLocation,
        u_texConstellations: null as unknown as WebGLUniformLocation,
        u_fMilkyWay: null as unknown as WebGLUniformLocation,
      },
      vertexShader: this.shaders_.vert,
      fragmentShader: this.shaders_.frag,
      glslVersion: GLSL3,
    });

    this.mesh = new Mesh(gl, geometry, material, {
      name: 'skybox',
      precision: 'highp',
      disabledUniforms: {
        modelMatrix: true,
        normalMatrix: true,
        viewMatrix: true,
        cameraPosition: true,
      },
    });
    this.mesh.geometry.initVao(this.mesh.program);

    this.isLoaded_ = true;
  }

  update(): void {
    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);

    mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, -90 * DEG2RAD);
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  private initTextures_(): void {
    const sm = this.settings_;

    sm.milkyWayTextureQuality ??= this.DEFAULT_RESOLUTION;

    if (sm.isDrawMilkyWay && !this.textureMilkyWay[sm.milkyWayTextureQuality] && sm.milkyWayTextureQuality !== MilkyWayTextureQuality.OFF) {
      GlUtils.initTexture(this.gl_, `${this.getSrc_(this.MILKYWAY_SRC_BASE, sm.milkyWayTextureQuality, 'jpg')}`).then((texture) => {
        this.textureMilkyWay[sm.milkyWayTextureQuality] = texture;
        this.isTexturesReady_ = true;
      });
    }
    if (sm.isDrawConstellationBoundaries && !this.isReadyBoundaries_) {
      GlUtils.initTexture(this.gl_, SkyBoxSphere.getSrcBoundaries(sm)).then((texture) => {
        this.textureBoundaries_ = texture;
        this.isReadyBoundaries_ = true;
        this.isTexturesReady_ = true;
      });
    }
    if (sm.isDrawNasaConstellations && !this.isReadyConstellations_) {
      GlUtils.initTexture(this.gl_, SkyBoxSphere.getSrcConstellations(sm)).then((texture) => {
        this.textureConstellations_ = texture;
        this.isReadyConstellations_ = true;
        this.isTexturesReady_ = true;
      });
    }
    if (sm.isGraySkybox && !this.isReadyGraySkybox_) {
      GlUtils.initTexture(this.gl_, SkyBoxSphere.getSrcGraySkybox(sm)).then((texture) => {
        this.textureGraySkybox_ = texture;
        this.isReadyGraySkybox_ = true;
        this.isTexturesReady_ = true;
      });
    }
  }

  /**
   * Custom shaders
   *
   * Keep this at the bottom of the file for glsl color coding
   */
  private shaders_ = {
    frag: glsl`
        uniform sampler2D u_texMilkyWay;
        uniform sampler2D u_texBoundaries;
        uniform sampler2D u_texConstellations;

        uniform float u_fMilkyWay;

        in vec2 v_texcoord;
        in float v_dist;

        out vec4 fragColor;

        void main(void) {
            // Don't draw the front of the sphere
            if (v_dist < 1.0) {
              discard;
            }

            // 20% goes to the boundaries
            vec4 vecBoundaries = texture(u_texBoundaries, v_texcoord) * 0.2;
            // 20% goes to the constellations
            vec4 vecConstellations = texture(u_texConstellations, v_texcoord) * 0.2;
            // 60% goes to the milky way no matter what
            vec4 vecMilkyWay = texture(u_texMilkyWay, v_texcoord) * u_fMilkyWay * 0.1;
            fragColor = vecMilkyWay + vecConstellations + vecBoundaries;

            ${DepthManager.getLogDepthFragCode()}
        }
        `,
    vert: glsl`
        out vec2 v_texcoord;
        out float v_dist;

        void main(void) {
            vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
            worldPosition.xyz += worldOffset;
            gl_Position = projectionMatrix * worldPosition;

            // This lets us figure out which verticies are on the back half
            v_dist = distance(worldPosition.xyz,vec3(0.0,0.0,0.0));

            v_texcoord = uv;
            v_texcoord.x = 1.0 - v_texcoord.x;

            ${DepthManager.getLogDepthVertCode()}
      }
        `,
  };
}
