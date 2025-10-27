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

import { keepTrackApi } from '@app/keepTrackApi';
import { RADIUS_OF_EARTH } from '@app/lib/constants';
import { GlUtils } from '@app/static/gl-utils';
import { GLSL3 } from '@app/static/material';
import { Mesh } from '@app/static/mesh';
import { ShaderMaterial } from '@app/static/shader-material';
import { SphereGeometry } from '@app/static/sphere-geometry';
import { SplashScreen } from '@app/static/splash-screen';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { EpochUTC, Sun } from 'ootk';
import { errorManagerInstance } from '../errorManager';
import { PersistenceManager, StorageKey } from '../persistence-manager';
import { OcclusionProgram } from './post-processing';

export enum EarthDayTextureQuality {
  POTATO = '512',
  LOW = '1k',
  MEDIUM = '2k',
  HIGH = '4k',
  ULTRA = '16k',
}

export enum EarthNightTextureQuality {
  POTATO = '512',
  LOW = '1K',
  MEDIUM = '2k',
  HIGH = '4k',
  ULTRA = '16k',
}

export enum EarthSpecTextureQuality {
  OFF = 'off',
  POTATO = '512',
  LOW = '1K',
  MEDIUM = '2k',
  HIGH = '4k',
  ULTRA = '16k',
}

export enum EarthBumpTextureQuality {
  OFF = 'off',
  LOW = '256',
  MEDIUM = '4k',
  HIGH = '8k',
}

export enum EarthCloudTextureQuality {
  OFF = 'off',
  POTATO = '512',
  LOW = '1K',
  MEDIUM = '2k',
  HIGH = '4k',
  ULTRA = '8k',
}

export enum EarthPoliticalTextureQuality {
  OFF = 'off',
  POTATO = '1K',
  LOW = '2K',
  MEDIUM = '4k',
  HIGH = '8k',
  ULTRA = '16k',
}

export enum EarthTextureStyle {
  BLUE_MARBLE = 'earthmap',
  FLAT = 'flat',
}

export enum AtmosphereSettings {
  OFF = 0,
  WHITE = 1,
  COLORFUL = 2,
}

export class Earth {
  private gl_: WebGL2RenderingContext;
  private glowDirection_ = 1;
  private glowNumber_ = 0;
  private modelViewMatrix_: mat4;
  private readonly normalMatrix_: mat3 = mat3.create();
  textureDay: Record<string, WebGLTexture> = {
    [settingsManager.earthTextureStyle + EarthDayTextureQuality.POTATO]: <WebGLTexture>(<unknown>null),
    [settingsManager.earthTextureStyle + EarthDayTextureQuality.LOW]: <WebGLTexture>(<unknown>null),
    [settingsManager.earthTextureStyle + EarthDayTextureQuality.MEDIUM]: <WebGLTexture>(<unknown>null),
    [settingsManager.earthTextureStyle + EarthDayTextureQuality.HIGH]: <WebGLTexture>(<unknown>null),
    [settingsManager.earthTextureStyle + EarthDayTextureQuality.ULTRA]: <WebGLTexture>(<unknown>null),
  };
  textureNight: Record<string, WebGLTexture> = {
    [settingsManager.earthTextureStyle + EarthNightTextureQuality.POTATO]: <WebGLTexture>(<unknown>null),
    [settingsManager.earthTextureStyle + EarthNightTextureQuality.LOW]: <WebGLTexture>(<unknown>null),
    [settingsManager.earthTextureStyle + EarthNightTextureQuality.MEDIUM]: <WebGLTexture>(<unknown>null),
    [settingsManager.earthTextureStyle + EarthNightTextureQuality.HIGH]: <WebGLTexture>(<unknown>null),
    [settingsManager.earthTextureStyle + EarthNightTextureQuality.ULTRA]: <WebGLTexture>(<unknown>null),
  };
  textureSpec: Record<EarthSpecTextureQuality, WebGLTexture> = {
    [EarthSpecTextureQuality.OFF]: <WebGLTexture>(<unknown>null),
    [EarthSpecTextureQuality.POTATO]: <WebGLTexture>(<unknown>null),
    [EarthSpecTextureQuality.LOW]: <WebGLTexture>(<unknown>null),
    [EarthSpecTextureQuality.MEDIUM]: <WebGLTexture>(<unknown>null),
    [EarthSpecTextureQuality.HIGH]: <WebGLTexture>(<unknown>null),
    [EarthSpecTextureQuality.ULTRA]: <WebGLTexture>(<unknown>null),
  };
  textureBump: Record<EarthBumpTextureQuality, WebGLTexture> = {
    [EarthBumpTextureQuality.OFF]: <WebGLTexture>(<unknown>null),
    [EarthBumpTextureQuality.LOW]: <WebGLTexture>(<unknown>null),
    [EarthBumpTextureQuality.MEDIUM]: <WebGLTexture>(<unknown>null),
    [EarthBumpTextureQuality.HIGH]: <WebGLTexture>(<unknown>null),
  };
  texturePolitical: Record<EarthPoliticalTextureQuality, WebGLTexture> = {
    [EarthPoliticalTextureQuality.OFF]: <WebGLTexture>(<unknown>null),
    [EarthPoliticalTextureQuality.POTATO]: <WebGLTexture>(<unknown>null),
    [EarthPoliticalTextureQuality.LOW]: <WebGLTexture>(<unknown>null),
    [EarthPoliticalTextureQuality.MEDIUM]: <WebGLTexture>(<unknown>null),
    [EarthPoliticalTextureQuality.HIGH]: <WebGLTexture>(<unknown>null),
    [EarthPoliticalTextureQuality.ULTRA]: <WebGLTexture>(<unknown>null),
  };
  textureClouds: Record<EarthCloudTextureQuality, WebGLTexture> = {
    [EarthCloudTextureQuality.OFF]: <WebGLTexture>(<unknown>null),
    [EarthCloudTextureQuality.POTATO]: <WebGLTexture>(<unknown>null),
    [EarthCloudTextureQuality.LOW]: <WebGLTexture>(<unknown>null),
    [EarthCloudTextureQuality.MEDIUM]: <WebGLTexture>(<unknown>null),
    [EarthCloudTextureQuality.HIGH]: <WebGLTexture>(<unknown>null),
    [EarthCloudTextureQuality.ULTRA]: <WebGLTexture>(<unknown>null),
  };
  private vaoOcclusion_: WebGLVertexArrayObject;
  isHiResReady: boolean;
  isUseHiRes: boolean;
  /** Normalized vector pointing to the sun. */
  lightDirection = <vec3>[0, 0, 0];
  mesh: Mesh;
  imageCache: Record<string, HTMLImageElement> = {};
  cloudPosition_: number = Math.random() * 8192; // Randomize the cloud position

  private readonly BUMP_SRC_BASE = 'earthbump';
  private readonly SPEC_SRC_BASE = 'earthspec';
  private readonly POLITICAL_SRC_BASE = 'boundaries';
  private readonly CLOUDS_SRC_BASE = 'clouds';

  /**
   * This is run once per frame to render the earth.
   */
  draw(tgtBuffer: WebGLFramebuffer | null) {
    this.drawColoredEarth_(tgtBuffer);
    this.drawBlackGpuPickingEarth_();
  }

  changeEarthTextureStyle(style: EarthTextureStyle) {
    settingsManager.earthTextureStyle = style;
    // Reinit the current textures
    this.initTextures_();

    PersistenceManager.getInstance().saveItem(StorageKey.LAST_MAP, style);
  }

  /**
   * This is run once per frame to render the earth in godrays buffer.
   */
  drawOcclusion(pMatrix: mat4, camMatrix: mat4, occlusionPrgm: OcclusionProgram, tgtBuffer: WebGLFramebuffer): void {
    if (settingsManager.isDisableGodrays) {
      return;
    }

    const gl = this.gl_;
    // Change to the earth shader

    gl.useProgram(occlusionPrgm.program);
    // Change to the main drawing buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    occlusionPrgm.attrSetup(this.mesh.geometry.getCombinedBuffer());

    // Set the uniforms
    occlusionPrgm.uniformSetup(this.modelViewMatrix_, pMatrix, camMatrix);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.geometry.getIndex());
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);

    /*
     * DEBUG:
     * occlusionPrgm.attrOff(occlusionPrgm);
     */
  }

  /**
   * This is run once per session to initialize the earth.
   */
  init(gl?: WebGL2RenderingContext): void {
    try {
      if (!gl && !this.gl_) {
        throw new Error('No WebGL context found');
      }
      this.gl_ ??= gl!;

      settingsManager.earthBumpTextureQuality ??= EarthBumpTextureQuality.OFF;
      settingsManager.earthSpecTextureQuality ??= EarthSpecTextureQuality.OFF;
      settingsManager.earthDayTextureQuality ??= EarthDayTextureQuality.MEDIUM;
      settingsManager.earthNightTextureQuality ??= EarthNightTextureQuality.MEDIUM;
      settingsManager.earthPoliticalTextureQuality ??= EarthPoliticalTextureQuality.OFF;
      settingsManager.earthCloudTextureQuality ??= EarthCloudTextureQuality.OFF;

      this.initTextures_();

      // We only need to make the mesh once
      if (!this.mesh) {
        const geometry = new SphereGeometry(this.gl_, {
          radius: RADIUS_OF_EARTH,
          widthSegments: settingsManager.earthNumLatSegs,
          heightSegments: settingsManager.earthNumLonSegs,
        });
        const material = new ShaderMaterial(this.gl_, {
          uniforms: {
            uIsAmbientLighting: <WebGLUniformLocation>(<unknown>null),
            uGlow: <WebGLUniformLocation>(<unknown>null),
            uZoomLevel: <WebGLUniformLocation>(<unknown>null),
            uisGrayScale: <WebGLUniformLocation>(<unknown>null),
            uCloudPosition: <WebGLUniformLocation>(<unknown>null),
            uAtmosphereType: <WebGLUniformLocation>(<unknown>null),
            uIsDrawAurora: <WebGLUniformLocation>(<unknown>null),
            uLightDirection: <WebGLUniformLocation>(<unknown>null),
            uDayMap: <WebGLUniformLocation>(<unknown>null),
            uNightMap: <WebGLUniformLocation>(<unknown>null),
            uBumpMap: <WebGLUniformLocation>(<unknown>null),
            uSpecMap: <WebGLUniformLocation>(<unknown>null),
            uPoliticalMap: <WebGLUniformLocation>(<unknown>null),
            uCloudsMap: <WebGLUniformLocation>(<unknown>null),
          },
          vertexShader: this.shaders_.vert,
          fragmentShader: this.shaders_.frag,
          glslVersion: GLSL3,
        });

        this.mesh = new Mesh(this.gl_, geometry, material, {
          name: 'earth',
          precision: 'highp',
          disabledUniforms: {
            modelMatrix: true,
            viewMatrix: true,
          },
        });

        this.initVaoVisible_();
        this.initVaoOcclusion_();
      }
    } catch (error) {
      errorManagerInstance.debug(error);
    }
  }

  /**
   * This is run once per frame to update the earth.
   */
  update(): void {
    const gmst = keepTrackApi.getTimeManager().gmst;
    const pos = Sun.position(EpochUTC.fromDateTime(keepTrackApi.getTimeManager().simulationTimeObj));

    this.lightDirection = [pos.x, pos.y, pos.z];
    vec3.normalize(<vec3>(<unknown>this.lightDirection), <vec3>(<unknown>this.lightDirection));

    this.modelViewMatrix_ = mat4.copy(mat4.create(), this.mesh.geometry.localMvMatrix);
    mat4.rotateZ(this.modelViewMatrix_, this.modelViewMatrix_, gmst);
    mat3.normalFromMat4(this.normalMatrix_, this.modelViewMatrix_);

    // Update the aurora glow
    this.glowNumber_ += 0.0025 * this.glowDirection_;
    this.glowDirection_ = this.glowNumber_ > 1 ? -1 : this.glowDirection_;
    this.glowDirection_ = this.glowNumber_ < 0 ? 1 : this.glowDirection_;

    // Update the cloud position
    this.cloudPosition_ += 0.00000025 * keepTrackApi.getTimeManager().propRate; // Slowly drift the clouds, but enough to see the effect
    this.cloudPosition_ = this.cloudPosition_ > 8192 ? 0 : this.cloudPosition_; // Reset the cloud position when it reaches 8192 - the width of the texture
  }

  private getSrc_(base: string, resolution: string, extension = 'jpg'): string {
    if (!settingsManager.installDirectory) {
      throw new Error('settingsManager.installDirectory is undefined');
    }

    let src = `${settingsManager.installDirectory}textures/${base}${resolution}.${extension}`;

    if (settingsManager.smallImages || settingsManager.isMobileModeEnabled) {
      src = `${settingsManager.installDirectory}textures/${base}512.${extension}`;
    }

    return src;
  }

  /**
   * This is run once per frame to render a black earth in the GPU picking buffer.
   */
  private drawBlackGpuPickingEarth_() {
    const gl = this.gl_;
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    // Switch to GPU Picking Shader
    gl.useProgram(dotsManagerInstance.programs.picking.program);
    // Switch to the GPU Picking Frame Buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, keepTrackApi.getScene().frameBuffers.gpuPicking);

    gl.bindVertexArray(this.vaoOcclusion_);

    gl.uniformMatrix4fv(dotsManagerInstance.programs.picking.uniforms.u_pMvCamMatrix, false, keepTrackApi.getRenderer().projectionCameraMatrix);

    /*
     * no reason to render 100000s of pixels when
     * we're only going to read one
     */
    if (!settingsManager.isMobileModeEnabled) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(
        keepTrackApi.getMainCamera().mouseX,
        gl.drawingBufferHeight - keepTrackApi.getMainCamera().mouseY,
        keepTrackApi.getDotsManager().PICKING_READ_PIXEL_BUFFER_SIZE,
        keepTrackApi.getDotsManager().PICKING_READ_PIXEL_BUFFER_SIZE
      );
    }

    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);

    if (!settingsManager.isMobileModeEnabled) {
      gl.disable(gl.SCISSOR_TEST);
    }

    gl.bindVertexArray(null);
    /*
     * Disable attributes to avoid conflict with other shaders
     * NOTE: This breaks satellite gpu picking.
     * gl.disableVertexAttribArray(dotsManagerInstance.pickingProgram.aPos);
     */
  }

  /**
   * This is run once per frame to render the earth.
   */
  private drawColoredEarth_(tgtBuffer: WebGLFramebuffer | null) {
    const gl = this.gl_;

    this.mesh.program.use();
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    this.setUniforms_(gl);
    this.setTextures_(gl);

    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindVertexArray(this.mesh.geometry.vao);
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  /**
   * This is run once per frame to set the uniforms for the earth.
   */
  private setUniforms_(gl: WebGL2RenderingContext) {
    gl.uniformMatrix4fv(this.mesh.material.uniforms.projectionMatrix, false, keepTrackApi.getRenderer().projectionCameraMatrix);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.modelViewMatrix, false, this.modelViewMatrix_);
    gl.uniformMatrix3fv(this.mesh.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniform3fv(this.mesh.material.uniforms.cameraPosition, keepTrackApi.getMainCamera().getForwardVector());

    gl.uniform1f(this.mesh.material.uniforms.uIsAmbientLighting, settingsManager.isEarthAmbientLighting ? 1.0 : 0.0);
    gl.uniform1f(this.mesh.material.uniforms.uGlow, this.glowNumber_);
    gl.uniform1f(this.mesh.material.uniforms.uZoomLevel, keepTrackApi.getMainCamera().zoomLevel() ?? 1);
    gl.uniform1f(this.mesh.material.uniforms.uisGrayScale, settingsManager.isEarthGrayScale ? 1.0 : 0.0);
    gl.uniform1f(this.mesh.material.uniforms.uCloudPosition, this.cloudPosition_);
    gl.uniform3fv(this.mesh.material.uniforms.uLightDirection, this.lightDirection);
    gl.uniform1f(this.mesh.material.uniforms.uAtmosphereType, settingsManager.isDrawAtmosphere);
    gl.uniform1f(this.mesh.material.uniforms.uIsDrawAurora, settingsManager.isDrawAurora ? 1.0 : 0.0);
  }

  private initTextures_(): void {
    const sm = settingsManager;

    sm.earthTextureStyle ??= EarthTextureStyle.BLUE_MARBLE;

    if (!this.textureDay[sm.earthTextureStyle + sm.earthDayTextureQuality]) {
      SplashScreen.loadStr(SplashScreen.msg.painting);
      this.textureDay[sm.earthTextureStyle + sm.earthDayTextureQuality] = this.gl_.createTexture();
      GlUtils.initTexture(this.gl_, `${this.getSrc_(sm.earthTextureStyle, sm.earthDayTextureQuality)}`).then((texture) => {
        this.textureDay[sm.earthTextureStyle + sm.earthDayTextureQuality] = texture;
      });
    }
    if (!this.textureNight[sm.earthTextureStyle + sm.earthNightTextureQuality]) {
      this.textureNight[sm.earthTextureStyle + sm.earthNightTextureQuality] = this.gl_.createTexture();
      const nightTextureStyle = `${sm.earthTextureStyle}-night`;

      GlUtils.initTexture(this.gl_, `${this.getSrc_(nightTextureStyle, sm.earthNightTextureQuality)}`)
        .then((texture) => {
          this.textureNight[sm.earthTextureStyle + sm.earthNightTextureQuality] = texture;
        })
        .catch(() => {
          delete this.textureNight[sm.earthTextureStyle + sm.earthNightTextureQuality];
        });
    }
    if (!this.textureBump[sm.earthBumpTextureQuality] && sm.earthBumpTextureQuality && sm.earthBumpTextureQuality !== EarthBumpTextureQuality.OFF) {
      this.textureBump[sm.earthBumpTextureQuality] = this.gl_.createTexture();
      GlUtils.initTexture(this.gl_, `${this.getSrc_(this.BUMP_SRC_BASE, sm.earthBumpTextureQuality)}`).then((texture) => {
        this.textureBump[sm.earthBumpTextureQuality] = texture;
      });
    }
    if (!this.textureSpec[sm.earthSpecTextureQuality] && sm.earthSpecTextureQuality && sm.earthSpecTextureQuality !== EarthSpecTextureQuality.OFF) {
      this.textureSpec[sm.earthSpecTextureQuality] = this.gl_.createTexture();
      GlUtils.initTexture(this.gl_, `${this.getSrc_(this.SPEC_SRC_BASE, sm.earthSpecTextureQuality)}`).then((texture) => {
        this.textureSpec[sm.earthSpecTextureQuality] = texture;
      });
    }
    if (!this.texturePolitical[sm.earthPoliticalTextureQuality] && sm.earthPoliticalTextureQuality && sm.earthPoliticalTextureQuality !== EarthPoliticalTextureQuality.OFF) {
      this.texturePolitical[sm.earthPoliticalTextureQuality] = this.gl_.createTexture();
      GlUtils.initTexture(this.gl_, `${this.getSrc_(this.POLITICAL_SRC_BASE, sm.earthPoliticalTextureQuality, 'png')}`).then((texture) => {
        this.texturePolitical[sm.earthPoliticalTextureQuality] = texture;
      });
    }
    if (!this.textureClouds[sm.earthCloudTextureQuality] && sm.earthCloudTextureQuality && sm.earthCloudTextureQuality !== EarthCloudTextureQuality.OFF) {
      this.textureClouds[sm.earthCloudTextureQuality] = this.gl_.createTexture();
      GlUtils.initTexture(this.gl_, `${this.getSrc_(this.CLOUDS_SRC_BASE, sm.earthCloudTextureQuality)}`).then((texture) => {
        this.textureClouds[sm.earthCloudTextureQuality] = texture;
      });
    }
  }

  /**
   * This is run once per session to initialize the earth occulsion vao.
   */
  private initVaoOcclusion_() {
    const gl = this.gl_;
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    this.vaoOcclusion_ = gl.createVertexArray();
    gl.bindVertexArray(this.vaoOcclusion_);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.geometry.getCombinedBuffer());

    /*
     * gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.pickingBuffers.color);
     * Disable color vertex so that the earth is drawn black
     * TODO: Figure out why this is in the earth class
     */
    gl.disableVertexAttribArray(dotsManagerInstance.programs.picking.attribs.a_color.location); // IMPORTANT!

    // Only Enable Position Attribute
    gl.enableVertexAttribArray(dotsManagerInstance.programs.picking.attribs.a_position.location);
    this.mesh.geometry.attributes.position.bindToArrayBuffer(gl);
    gl.vertexAttribPointer(dotsManagerInstance.programs.picking.attribs.a_position.location, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, 0);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.geometry.getIndex());

    gl.bindVertexArray(null);
  }

  /**
   * This is run once per session to initialize the earth vao.
   */
  private initVaoVisible_() {
    const gl = this.gl_;

    this.mesh.geometry.vao = gl.createVertexArray();
    gl.bindVertexArray(this.mesh.geometry.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.geometry.getCombinedBuffer());
    gl.enableVertexAttribArray(this.mesh.geometry.attributes.position.location);
    this.mesh.geometry.attributes.position.bindToArrayBuffer(gl);

    gl.enableVertexAttribArray(this.mesh.geometry.attributes.normal.location);
    this.mesh.geometry.attributes.normal.bindToArrayBuffer(gl);

    gl.enableVertexAttribArray(this.mesh.geometry.attributes.uv.location);
    this.mesh.geometry.attributes.uv.bindToArrayBuffer(gl);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.geometry.getIndex());

    gl.bindVertexArray(null);
  }

  /**
   * This is run once per frame to set the textures for the earth.
   */
  private setTextures_(gl: WebGL2RenderingContext) {
    // Day Map
    gl.uniform1i(this.mesh.material.uniforms.uDayMap, 0);
    gl.activeTexture(gl.TEXTURE0);
    if (this.textureDay[settingsManager.earthTextureStyle + settingsManager.earthDayTextureQuality] && !settingsManager.isBlackEarth) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureDay[settingsManager.earthTextureStyle + settingsManager.earthDayTextureQuality]);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // Night Map
    gl.uniform1i(this.mesh.material.uniforms.uNightMap, 1);
    gl.activeTexture(gl.TEXTURE1);

    if (
      (!this.textureNight[settingsManager.earthTextureStyle + settingsManager.earthNightTextureQuality] &&
        !this.textureDay[settingsManager.earthTextureStyle + settingsManager.earthNightTextureQuality]) ||
      settingsManager.isBlackEarth
    ) {
      gl.bindTexture(gl.TEXTURE_2D, null);
    } else if (!settingsManager.isDrawNightAsDay && this.textureNight[settingsManager.earthTextureStyle + settingsManager.earthNightTextureQuality]) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureNight[settingsManager.earthTextureStyle + settingsManager.earthNightTextureQuality]);
    } else if (this.textureDay[settingsManager.earthTextureStyle + settingsManager.earthNightTextureQuality] && !settingsManager.isBlackEarth) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureDay[settingsManager.earthTextureStyle + settingsManager.earthNightTextureQuality]);
    }

    // Bump Map
    gl.uniform1i(this.mesh.material.uniforms.uBumpMap, 2);
    gl.activeTexture(gl.TEXTURE2);
    if (settingsManager.isDrawBumpMap && this.textureBump[settingsManager.earthBumpTextureQuality]) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureBump[settingsManager.earthBumpTextureQuality]);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // Specular Map
    gl.uniform1i(this.mesh.material.uniforms.uSpecMap, 3);
    gl.activeTexture(gl.TEXTURE3);
    if (settingsManager.isDrawSpecMap && this.textureSpec[settingsManager.earthSpecTextureQuality]) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureSpec[settingsManager.earthSpecTextureQuality]);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // Political Map
    gl.uniform1i(this.mesh.material.uniforms.uPoliticalMap, 4);
    gl.activeTexture(gl.TEXTURE4);
    if (settingsManager.isDrawPoliticalMap && this.texturePolitical[settingsManager.earthPoliticalTextureQuality]) {
      gl.bindTexture(gl.TEXTURE_2D, this.texturePolitical[settingsManager.earthPoliticalTextureQuality]);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // Clouds Map
    gl.uniform1i(this.mesh.material.uniforms.uCloudsMap, 5);
    gl.activeTexture(gl.TEXTURE5);
    if (settingsManager.isDrawCloudsMap && this.textureClouds[settingsManager.earthCloudTextureQuality]) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureClouds[settingsManager.earthCloudTextureQuality]);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }

  /**
   * The shaders for the earth.
   *
   * NOTE: Keep these at the bottom of the file to ensure proper syntax highlighting.
   */
  private readonly shaders_ = {
    frag: keepTrackApi.glsl`
    precision highp float;

    uniform float uIsAmbientLighting;
    uniform float uGlow;
    uniform float uCloudPosition;
    uniform vec3 uLightDirection;
    uniform float uAtmosphereType;
    uniform float uIsDrawAurora;
    uniform float uZoomLevel;
    uniform float uisGrayScale;

    in vec2 vUv;
    in vec3 vNormal;
    in vec3 vWorldPos;
    in vec3 vVertToCamera;

    out vec4 fragColor;

    uniform sampler2D uDayMap;
    uniform sampler2D uNightMap;
    uniform sampler2D uBumpMap;
    uniform sampler2D uSpecMap;
    uniform sampler2D uPoliticalMap;
    uniform sampler2D uCloudsMap;

    const float latitudeCenter = 67.5; // The latitude at which the Aurora Borealis appears
    const float latitudeMargin = 7.0; // The margin around the center latitude where the Aurora Borealis is visible
    const vec3 directionalLightColor = vec3(1.0, 1.0, 1.0);
    const vec3 ambientLightColor = vec3(0.1, 0.1, 0.1);

    // Function to calculate the intensity of the Aurora Borealis at a given latitude
    float calculateAuroraIntensity(float latitude, float noise) {
      // Aurora should be visible mainly between latitudeCenter - latitudeMargin and latitudeCenter + latitudeMargin
      float intensity = (step(latitudeCenter - (latitudeMargin + noise), latitude) - step(latitudeCenter + (latitudeMargin + noise), latitude)) * 0.5;
      // Smooth intensity from lattitudeCenter outward
      intensity = smoothstep(0.0, 1.0, 1.0 - abs(latitude - latitudeCenter) / (latitudeMargin + noise)) * intensity;
      return intensity;
    }

    void main(void) {
      float fragToLightAngle = dot( vNormal, uLightDirection ) * 0.5 + 0.5; //Remake -1 > 1 to 0 > 1
      vec3 fragToCamera = normalize(vVertToCamera);

      // .................................................
      // Diffuse lighting
      float diffuse = 0.0;
      if (uIsAmbientLighting > 0.5) {
        diffuse = max(dot(vNormal, uLightDirection), 0.0);
      }

      //.................................................
      // Bump mapping
      vec3 bumpTexColor = textureLod(uBumpMap, vUv, -1.0).rgb * diffuse * 0.4;

      //................................................
      // Specular lighting
      vec3 specLightColor = textureLod(uSpecMap, vUv, -1.0).rgb * diffuse * 0.1;

      //................................................
      // Final color
      vec3 dayColor = (ambientLightColor + directionalLightColor) * diffuse;
      vec3 dayTexColor = textureLod(uDayMap, vUv, -1.0).rgb * dayColor;
      vec3 nightColor = 0.5 * textureLod(uNightMap, vUv, -1.0).rgb * pow(1.0 - diffuse, 2.0);

      fragColor = vec4(dayTexColor + nightColor + bumpTexColor + specLightColor, 1.0);

      // Political map (Draw before clouds and atmosphere)
      fragColor += textureLod(uPoliticalMap, vUv, 1.0);

      // ................................................
      // Clouds
      // Add the clouds to the fragColor
      // Slowly drift the clouds to the left
        vec2 uv = vUv;
        uv.x -= uCloudPosition;

        vec3 cloudsColor = textureLod(uCloudsMap, uv, -1.0).rgb;
        fragColor.rgb += cloudsColor * 0.8 * pow(uZoomLevel, 2.5);

      // ...............................................
      // Atmosphere

      // If 2 then draw the colorful atmosphere
      if (uAtmosphereType > 1.5 && uAtmosphereType < 2.5) {
        float sunAmount = max(dot(vNormal, uLightDirection), 0.1);
        float darkAmount = max(dot(vNormal, -uLightDirection), 0.0);
        float r = 1.0 - sunAmount;
        float g = max(1.0 - sunAmount, 0.85) - darkAmount;
        float b = max(sunAmount, 0.9) - darkAmount;
        vec3 atmosphereColor = vec3(r,g,b);

        float fragToCameraAngle = (1.0 - dot(fragToCamera, vNormal));
        fragToCameraAngle = pow(fragToCameraAngle, 3.8); //Curve the change, Make the fresnel thinner

        fragColor.rgb += (atmosphereColor * fragToCameraAngle * smoothstep(0.25, 0.5, fragToLightAngle));
      } else if (uAtmosphereType > 0.5 && uAtmosphereType < 1.5) {
        // If 1 then draw the white atmosphere
        // Draw thin white line around the Earth no matter what fragToLightAngle is
        float fragToCameraAngle = (1.0 - dot(fragToCamera, vNormal));
        fragToCameraAngle = pow(fragToCameraAngle, 7.0); //Curve the change, Make the fresnel thinner
        fragColor.rgb += vec3(1.0, 1.0, 1.0) * fragToCameraAngle;
      } // If 0 then no atmosphere

      // Gray scale the color
      if (uisGrayScale > 0.5) {
        float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
        fragColor.rgb = vec3(gray);
      }

      // ...............................................
      // Aurora
      if (uIsDrawAurora > 0.5) {
        float latitude = vUv.y * 180.0 - 90.0; // Convert texture coordinate to latitude (-90 to 90)
        float noise = uGlow;

        // Calculate the intensity of the Aurora Borealis at the current latitude
        float auroraIntensity = calculateAuroraIntensity(abs(latitude), noise / 2.0);

        // Calculate the strength of the Aurora Borealis based on the Sun direction. It should only be visible on the dark side of the Earth
        float auroraStrength = max(dot(vNormal, -uLightDirection), 0.0) * (0.75 + (noise / 10.0));

        // Combine the Earth color and the Aurora Borealis color based on the intensity and strength
        vec3 auroraColor = vec3(0.0, 0.8, 0.55 + noise / 20.0); // Color of the Aurora Borealis

        fragColor.rgb += auroraColor * auroraIntensity * auroraStrength;
      }

    }
    `,
    vert: keepTrackApi.glsl`
    out vec2 vUv;
    out vec3 vNormal;
    out vec3 vWorldPos;
    out vec3 vVertToCamera;

    void main(void) {
        vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vNormal = normalMatrix * normal;
        vUv = uv;
        vVertToCamera = normalize(vec3(cameraPosition) - worldPosition.xyz);

        gl_Position = projectionMatrix * worldPosition;
    }
    `,
  };
}
