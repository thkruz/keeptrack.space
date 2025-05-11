import { Component } from '@app/doris/components/component';
import { Doris } from '@app/doris/doris';
import { GlUtils } from '@app/doris/webgl/gl-utils';
import { GLSL3 } from '@app/doris/webgl/material';
import { Mesh } from '@app/doris/webgl/mesh';
import { ShaderMaterial } from '@app/doris/webgl/shader-material';
import { SphereGeometry } from '@app/doris/webgl/sphere-geometry';
import { SettingsManager } from '@app/settings/settings';
import { mat3, mat4 } from 'gl-matrix';
import { DEG2RAD } from 'ootk';
import { keepTrackApi } from './../../keepTrackApi';
/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

export class SkyBoxSphere extends Component {
  private readonly DRAW_RADIUS = 220000;
  private readonly NUM_HEIGHT_SEGS = 16;
  private readonly NUM_WIDTH_SEGS = 16;

  private gl_: WebGL2RenderingContext;
  private isTexturesReady_: boolean;
  private isReadyBoundaries_ = false;
  private isReadyConstellations_ = false;
  private isReadyGraySkybox_ = false;
  private isReadyMilkyWay_ = false;
  private readonly normalMatrix_ = mat3.create();
  private textureBoundaries_ = <WebGLTexture><unknown>null;
  private textureConstellations_ = <WebGLTexture><unknown>null;
  private textureGraySkybox_: WebGLTexture;
  private textureMilkyWay_ = <WebGLTexture><unknown>null;
  private mesh_: Mesh;


  async initialize(): Promise<void> {
    this.gl_ = Doris.getInstance().getRenderer().gl;

    const geometry = new SphereGeometry(this.gl_, {
      radius: this.DRAW_RADIUS,
      widthSegments: this.NUM_WIDTH_SEGS,
      heightSegments: this.NUM_HEIGHT_SEGS,
    });

    await this.initTextures_();
    const material = new ShaderMaterial(this.gl_, {
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

    this.mesh_ = new Mesh(this.gl_, geometry, material, {
      name: 'skybox',
      precision: 'highp',
      disabledUniforms: {
        modelMatrix: true,
        normalMatrix: true,
        viewMatrix: true,
        cameraPosition: true,
      },
    });
    // Set the local matrix based on the geometry
    mat4.copy(this.node.transform.localMatrix, this.mesh_.geometry.localMvMatrix);
    mat4.rotateZ(this.node.transform.localMatrix, this.node.transform.localMatrix, -90 * DEG2RAD);
    this.mesh_.geometry.initVao(this.mesh_.program);
  }

  update(): void {
    this.node.transform.setPosition(this.node.parent!.transform.getPosition());
    mat4.translate(
      this.node.transform.worldMatrix,
      this.node.transform.worldMatrix,
      [-this.node.transform.position[0], -this.node.transform.position[1], this.node.transform.position[2]],
    );
    mat3.normalFromMat4(this.normalMatrix_, this.node.transform.worldMatrix);
  }

  render(tgtBuffer = null as WebGLFramebuffer | null): void {
    if (!this.isInitialized_) {
      return;
    }
    if (!this.isTexturesReady_ || settingsManager.isDisableSkybox) {
      return;
    }

    // Make sure there is something to draw
    if (!settingsManager.isDrawMilkyWay && !settingsManager.isDrawConstellationBoundaries && !settingsManager.isDrawNasaConstellations && !settingsManager.isGraySkybox) {
      return;
    }

    const gl = this.gl_;

    this.mesh_.program.use();
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }

    this.setUniforms_(gl);

    gl.bindVertexArray(this.mesh_.geometry.vao);
    gl.blendFunc(gl.ONE_MINUS_SRC_COLOR, gl.ONE_MINUS_SRC_COLOR);
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    gl.drawElements(gl.TRIANGLES, this.mesh_.geometry.indexLength, gl.UNSIGNED_SHORT, 0);

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(null);
  }

  private setUniforms_(gl: WebGL2RenderingContext) {
    gl.uniformMatrix3fv(this.mesh_.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniformMatrix4fv(this.mesh_.material.uniforms.modelViewMatrix, false, this.node.transform.worldMatrix);
    gl.uniformMatrix4fv(this.mesh_.material.uniforms.projectionMatrix, false, keepTrackApi.getMainCamera().projectionCameraMatrix);

    if (!settingsManager.isDrawMilkyWay && !settingsManager.isDrawConstellationBoundaries && !settingsManager.isDrawNasaConstellations) {
      gl.uniform1i(this.mesh_.material.uniforms.u_texMilkyWay, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.textureGraySkybox_);
      gl.uniform1f(this.mesh_.material.uniforms.u_fMilkyWay, 2);
    } else {
      if (settingsManager.isDrawMilkyWay) {
        gl.uniform1i(this.mesh_.material.uniforms.u_texMilkyWay, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay_);
      }

      if (settingsManager.isDrawConstellationBoundaries) {
        gl.uniform1i(this.mesh_.material.uniforms.u_texBoundaries, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textureBoundaries_);
      } else {
        gl.uniform1i(this.mesh_.material.uniforms.u_texMilkyWay, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay_);
      }

      if (settingsManager.isDrawNasaConstellations) {
        gl.uniform1i(this.mesh_.material.uniforms.u_texConstellations, 2);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textureConstellations_);
      } else {
        gl.uniform1i(this.mesh_.material.uniforms.u_texMilkyWay, 2);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.textureMilkyWay_);
      }

      /*
       * Figure out how bright the milky way should be to make the blending consistent
       * The more textures that are on the brighter the milky way needs to be
       */
      let milkyWayMul: 6 | 4 | 2 | 0;
      const factor1 = settingsManager.isDrawMilkyWay ? 1 : 0;
      const factor2 = settingsManager.isDrawConstellationBoundaries ? 1 : 0;
      const factor3 = settingsManager.isDrawNasaConstellations ? 1 : 0;
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

      gl.uniform1f(this.mesh_.material.uniforms.u_fMilkyWay, milkyWayMul);
    }
  }

  private async initTextures_(): Promise<void> {
    if (settingsManager.isDrawMilkyWay && !this.isReadyMilkyWay_) {
      const texture = await GlUtils.initTexture(this.gl_, SkyBoxSphere.getSrcMilkyWay_(settingsManager));

      this.textureMilkyWay_ = texture;
      this.isReadyMilkyWay_ = true;
      this.isTexturesReady_ = true;
    }
    if (settingsManager.isDrawConstellationBoundaries && !this.isReadyBoundaries_) {
      const texture = await GlUtils.initTexture(this.gl_, SkyBoxSphere.getSrcBoundaries_(settingsManager));

      this.textureBoundaries_ = texture;
      this.isReadyBoundaries_ = true;
      this.isTexturesReady_ = true;
    }
    if (settingsManager.isDrawNasaConstellations && !this.isReadyConstellations_) {
      const texture = await GlUtils.initTexture(this.gl_, SkyBoxSphere.getSrcConstellations_(settingsManager));

      this.textureConstellations_ = texture;
      this.isReadyConstellations_ = true;
      this.isTexturesReady_ = true;
    }
    if (settingsManager.isGraySkybox && !this.isReadyGraySkybox_) {
      const texture = await GlUtils.initTexture(this.gl_, SkyBoxSphere.getSrcGraySkybox_(settingsManager));

      this.textureGraySkybox_ = texture;
      this.isReadyGraySkybox_ = true;
      this.isTexturesReady_ = true;
    }
  }

  private static getSrcBoundaries_(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('installDirectory is not defined');
    }

    const src = `${settings.installDirectory}textures/skyboxBoundaries8k.jpg`;

    return src;
  }

  private static getSrcConstellations_(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('installDirectory is not defined');
    }

    const src = `${settings.installDirectory}textures/skyboxConstellations8k.jpg`;

    return src;
  }

  private static getSrcGraySkybox_(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('installDirectory is not defined');
    }

    const src = `${settings.installDirectory}textures/skybox1k-gray.jpg`;

    return src;
  }

  private static getSrcMilkyWay_(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('installDirectory is not defined');
    }

    let src = `${settings.installDirectory}textures/skybox4k.jpg`;

    if (!settings.isMobileModeEnabled) {
      src = `${settings.installDirectory}textures/skybox8k.jpg`;
    }

    if (settings.hiresMilkWay) {
      src = `${settings.installDirectory}textures/skybox16k.jpg`;
    }

    return src;
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
        out float v_dist;

        void main(void) {
            vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * worldPosition;

            // This lets us figure out which verticies are on the back half
            v_dist = distance(worldPosition.xyz,vec3(0.0,0.0,0.0));

            v_texcoord = uv;
            v_texcoord.x = 1.0 - v_texcoord.x;
        }
        `,
  };
}
