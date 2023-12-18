import { DEG2RAD } from '@app/js/lib/constants';
import { SettingsManager } from '@app/js/settings/settings';
import { GlUtils } from '@app/js/static/gl-utils';
import { GLSL3 } from '@app/js/static/material';
import { Mesh } from '@app/js/static/mesh';
import { ShaderMaterial } from '@app/js/static/shader-material';
import { SphereGeometry } from '@app/js/static/sphere-geometry';
import { mat3, mat4 } from 'gl-matrix';
import { keepTrackApi } from './../../keepTrackApi';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

export class SkyBoxSphere {
  private readonly DRAW_RADIUS = 200000;
  private readonly NUM_HEIGHT_SEGS = 16;
  private readonly NUM_WIDTH_SEGS = 16;

  private gl_: WebGL2RenderingContext;
  private isTexturesReady_: boolean;
  private isReadyBoundaries_ = false;
  private isReadyConstellations_ = false;
  private isReadyGraySkybox_ = false;
  private isReadyMilkyWay_ = false;
  private mvMatrix_ = mat4.create();
  private nMatrix_ = mat3.create();
  private settings_: SettingsManager;
  private textureBoundaries_ = <WebGLTexture>null;
  private textureConstellations_ = <WebGLTexture>null;
  private textureGraySkybox_: WebGLTexture;
  private textureMilkyWay_ = <WebGLTexture>null;
  mesh: Mesh;
  private isLoaded_ = false;

  public static getSrcBoundaries(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('installDirectory is not defined');

    let src = `${settings.installDirectory}textures/skyboxBoundaries8k.jpg`;

    return src;
  }

  public static getSrcConstellations(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('installDirectory is not defined');

    let src = `${settings.installDirectory}textures/skyboxConstellations8k.jpg`;

    return src;
  }

  public static getSrcGraySkybox(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('installDirectory is not defined');

    let src = `${settings.installDirectory}textures/skybox1k-gray.jpg`;

    return src;
  }

  public static getSrcMilkyWay(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('installDirectory is not defined');

    let src = `${settings.installDirectory}textures/skybox8k.jpg`;

    if (settings.hiresMilkWay) {
      src = `${settings.installDirectory}textures/skybox16k.jpg`;
    }

    return src;
  }

  public render(tgtBuffer?: WebGLFramebuffer): void {
    if (!this.isLoaded_) return;
    if (!this.isTexturesReady_ || settingsManager.isDisableSkybox) return;

    // Make sure there is something to draw
    if (!this.settings_.isDrawMilkyWay && !this.settings_.isDrawConstellationBoundaries && !this.settings_.isDrawNasaConstellations && !this.settings_.isGraySkybox) return;

    const gl = this.gl_;

    this.mesh.program.use();
    if (tgtBuffer) gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

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
    gl.uniformMatrix4fv(this.mesh.material.uniforms.projectionMatrix, false, keepTrackApi.getRenderer().projectionCameraMatrix);

    if (!this.settings_.isDrawMilkyWay && !this.settings_.isDrawConstellationBoundaries && !this.settings_.isDrawNasaConstellations) {
      gl.uniform1i(this.mesh.material.uniforms.u_texMilkyWay, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textureGraySkybox_);
      gl.uniform1f(this.mesh.material.uniforms.u_fMilkyWay, 2);
    } else {
      if (this.settings_.isDrawMilkyWay) {
        gl.uniform1i(this.mesh.material.uniforms.u_texMilkyWay, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay_);
      }

      if (this.settings_.isDrawConstellationBoundaries) {
        gl.uniform1i(this.mesh.material.uniforms.u_texBoundaries, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textureBoundaries_);
      } else {
        gl.uniform1i(this.mesh.material.uniforms.u_texMilkyWay, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay_);
      }

      if (this.settings_.isDrawNasaConstellations) {
        gl.uniform1i(this.mesh.material.uniforms.u_texConstellations, 2);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textureConstellations_);
      } else {
        gl.uniform1i(this.mesh.material.uniforms.u_texMilkyWay, 2);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay_);
      }

      // Figure out how bright the milky way should be to make the blending consistent
      // The more textures that are on the brighter the milky way needs to be
      let milkyWayMul: 6 | 4 | 2 | 0;
      const factor1 = this.settings_.isDrawMilkyWay ? 1 : 0;
      const factor2 = this.settings_.isDrawConstellationBoundaries ? 1 : 0;
      const factor3 = this.settings_.isDrawNasaConstellations ? 1 : 0;
      const sum = factor1 + factor2 + factor3;
      if (sum === 3) milkyWayMul = 6;
      else if (sum === 2) milkyWayMul = 4;
      else if (sum === 1) milkyWayMul = 2;
      else milkyWayMul = 0;

      gl.uniform1f(this.mesh.material.uniforms.u_fMilkyWay, milkyWayMul);
    }
  }

  public async init(settings: SettingsManager, gl: WebGL2RenderingContext): Promise<void> {
    this.gl_ = gl;
    this.settings_ = settings;

    const geometry = new SphereGeometry(gl, {
      radius: this.DRAW_RADIUS,
      widthSegments: this.NUM_WIDTH_SEGS,
      heightSegments: this.NUM_HEIGHT_SEGS,
    });
    this.initTextures_();
    const material = new ShaderMaterial(gl, {
      uniforms: {
        u_texMilkyWay: <WebGLUniformLocation>null,
        u_texBoundaries: <WebGLUniformLocation>null,
        u_texConstellations: <WebGLUniformLocation>null,
        u_fMilkyWay: <WebGLUniformLocation>null,
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
        viewMatrix: true,
        cameraPosition: true,
      },
    });
    this.mesh.geometry.initVao(this.mesh.program);
    this.isLoaded_ = true;
  }

  public update(): void {
    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);

    const cameraPos = keepTrackApi.getMainCamera().getCameraPosition();
    mat4.translate(this.mvMatrix_, this.mvMatrix_, cameraPos);

    mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, -90 * DEG2RAD);
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  private initTextures_(): void {
    if (this.settings_.isDrawMilkyWay && !this.isReadyMilkyWay_) {
      GlUtils.initTexture(this.gl_, SkyBoxSphere.getSrcMilkyWay(this.settings_)).then((texture) => {
        this.textureMilkyWay_ = texture;
        this.isReadyMilkyWay_ = true;
        this.isTexturesReady_ = true;
      });
    }
    if (this.settings_.isDrawConstellationBoundaries && !this.isReadyBoundaries_) {
      GlUtils.initTexture(this.gl_, SkyBoxSphere.getSrcBoundaries(this.settings_)).then((texture) => {
        this.textureBoundaries_ = texture;
        this.isReadyBoundaries_ = true;
        this.isTexturesReady_ = true;
      });
    }
    if (this.settings_.isDrawNasaConstellations && !this.isReadyConstellations_) {
      GlUtils.initTexture(this.gl_, SkyBoxSphere.getSrcConstellations(this.settings_)).then((texture) => {
        this.textureConstellations_ = texture;
        this.isReadyConstellations_ = true;
        this.isTexturesReady_ = true;
      });
    }
    if (this.settings_.isGraySkybox && !this.isReadyGraySkybox_) {
      GlUtils.initTexture(this.gl_, SkyBoxSphere.getSrcGraySkybox(this.settings_)).then((texture) => {
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
    frag: keepTrackApi.glsl`
        uniform sampler2D u_texMilkyWay;
        uniform sampler2D u_texBoundaries;
        uniform sampler2D u_texConstellations;

        uniform float u_fMilkyWay;

        in vec2 v_texcoord;
        in vec3 v_normal;
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
        }
        `,
    vert: keepTrackApi.glsl`
        out vec2 v_texcoord;
        out vec3 v_normal;
        out float v_dist;

        void main(void) {
            vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * worldPosition;

            // This lets us figure out which verticies are on the back half
            v_dist = distance(worldPosition.xyz,vec3(0.0,0.0,0.0));

            v_texcoord = uv;
            v_texcoord.x = 1.0 - v_texcoord.x;
            v_normal = normalMatrix * normal;
        }
        `,
  };
}
