/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
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

import { keepTrackApi } from '@app/js/keepTrackApi';
import { RADIUS_OF_EARTH } from '@app/js/lib/constants';
import { SettingsManager } from '@app/js/settings/settings';
import { GlUtils } from '@app/js/static/gl-utils';
import { GLSL3 } from '@app/js/static/material';
import { Mesh } from '@app/js/static/mesh';
import { SatMath } from '@app/js/static/sat-math';
import { ShaderMaterial } from '@app/js/static/shader-material';
import { SphereGeometry } from '@app/js/static/sphere-geometry';
import { SplashScreen } from '@app/js/static/splash-screen';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { GreenwichMeanSiderealTime } from 'ootk';
import { OcclusionProgram } from './post-processing';

export class Earth {
  private gl_: WebGL2RenderingContext;
  private glowDirection_ = 1;
  private glowNumber_ = 0;
  private isBumpTextureReady_ = false;
  private isDayTextureReady_ = false;
  private isNightTextureReady_ = false;
  private isSpecularTextureReady_ = false;
  private isTexturesReady_ = false;
  private mvMatrix_: mat4;
  private nMatrix_: mat3 = mat3.create();
  private settings_: SettingsManager;
  private textureBump_: WebGLTexture;
  private textureDay_: WebGLTexture;
  private textureNight_: WebGLTexture;
  private textureSpec_: WebGLTexture;
  private uPCamMatrix_: mat4 = mat4.create();
  private vaoOcclusion_: WebGLVertexArrayObject;
  private vaoVisible_: WebGLVertexArrayObject;
  isHiResReady: boolean;
  isUseHiRes: boolean;
  lightDirection = <vec3>[0, 0, 0];
  mesh: Mesh;

  draw(tgtBuffer: WebGLFramebuffer, altNightTexBind?: (gl: WebGL2RenderingContext, textureNight: WebGLTexture, textureDay: WebGLTexture) => void) {
    if (!this.isTexturesReady_) return;
    this.drawColoredEarth_(tgtBuffer, altNightTexBind);
    this.drawBlackGpuPickingEarth_();
  }

  drawOcclusion(pMatrix: mat4, camMatrix: mat4, occlusionPrgm: OcclusionProgram, tgtBuffer: WebGLFramebuffer): void {
    const gl = this.gl_;
    // Change to the earth shader
    gl.useProgram(occlusionPrgm.program);
    // Change to the main drawing buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    occlusionPrgm.attrSetup(this.mesh.geometry.getCombinedBuffer());

    // Set the uniforms
    occlusionPrgm.uniformSetup(this.mvMatrix_, pMatrix, camMatrix);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.geometry.getIndex());
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);

    // DEBUG:
    // occlusionPrgm.attrOff(occlusionPrgm);
  }

  forceLoaded(): void {
    this.isTexturesReady_ = true;
  }

  async init(settings: SettingsManager, gl?: WebGL2RenderingContext): Promise<void> {
    try {
      if (!gl && !this.gl_) throw new Error('No WebGL context found');
      this.gl_ ??= gl;
      this.settings_ = settings;

      this.initTextures_();
      const geometry = new SphereGeometry(this.gl_, {
        radius: RADIUS_OF_EARTH,
        widthSegments: this.settings_.earthNumLatSegs,
        heightSegments: this.settings_.earthNumLonSegs,
        isSkipTexture: false,
        attributes: {
          aVertexPosition: 0,
          aVertexNormal: 0,
          aTexCoord: 0,
        },
      });
      const material = new ShaderMaterial(this.gl_, {
        uniforms: {
          uGlow: <WebGLUniformLocation>null,
          uIsDrawAtmosphere: <WebGLUniformLocation>null,
          uIsDrawAurora: <WebGLUniformLocation>null,
          uLightDirection: <WebGLUniformLocation>null,
          uDayMap: <WebGLUniformLocation>null,
          uNightMap: <WebGLUniformLocation>null,
          uBumpMap: <WebGLUniformLocation>null,
          uSpecMap: <WebGLUniformLocation>null,
          uCamPos: <WebGLUniformLocation>null,
          uPCamMatrix: <WebGLUniformLocation>null,
          uMvMatrix: <WebGLUniformLocation>null,
          uNormalMatrix: <WebGLUniformLocation>null,
        },
        vertexShader: this.shaders_.vert,
        fragmentShader: this.shaders_.frag,
        glslVersion: GLSL3,
      });
      this.mesh = new Mesh(this.gl_, geometry, material);

      this.initVaoVisible();
      this.initVaoOcclusion_();
    } catch (error) {
      console.debug(error);
    }
  }

  async loadHiRes(texture: WebGLTexture, src: string): Promise<void> {
    try {
      const img = new Image();
      img.onload = () => {
        if (!this.settings_.isBlackEarth) {
          GlUtils.bindImageToTexture(this.gl_, texture, img);
        }

        this.isDayTextureReady_ = true;
        this.isHiResReady = true;
        this.onImageLoaded_();
      };
      img.src = src;

      this.isUseHiRes = true;
    } catch (e) {
      console.debug(e);
    }
  }

  reloadEarthHiResTextures() {
    this.init(settingsManager, this.gl_);
    this.loadHiRes(this.textureDay_, Earth.getSrcHiResDay_(this.settings_));
    this.loadHiRes(this.textureNight_, Earth.getSrcHiResNight_(this.settings_));
  }

  update(gmst: GreenwichMeanSiderealTime, j: number): void {
    this.lightDirection = SatMath.getSunDirection(j);
    vec3.normalize(<vec3>(<unknown>this.lightDirection), <vec3>(<unknown>this.lightDirection));

    this.mvMatrix_ = mat4.copy(mat4.create(), this.mesh.geometry.localMvMatrix);
    mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, gmst);
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);

    // Update the aurora glow
    this.glowNumber_ += 0.0025 * this.glowDirection_;
    this.glowDirection_ = this.glowNumber_ > 1 ? -1 : this.glowDirection_;
    this.glowDirection_ = this.glowNumber_ < 0 ? 1 : this.glowDirection_;
  }

  /**
   * Determines the url to the bump map based on the settings.
   */
  private static getSrcBump_(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('settings.installDirectory is undefined');

    let src = `${settings.installDirectory}textures/earthbump8k.jpg`;
    if (settings.smallImages || settings.isMobileModeEnabled) src = `${settings.installDirectory}textures/earthbump256.jpg`;
    // if (settings.isMobileModeEnabled) src = `${settings.installDirectory}textures/earthbump4k.jpg`;

    return src;
  }

  /**
   * Determines the url to the day texture based on the settings.
   */
  private static getSrcDay_(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('settings.installDirectory is undefined');

    let src = `${settings.installDirectory}textures/earthmap512.jpg`;

    return src;
  }

  /**
   * Determines the url to the high resolution day texture based on the settings.
   */
  private static getSrcHiResDay_(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('settings.installDirectory is undefined');
    let src = `${settings.installDirectory}textures/earthmap4k.jpg`;
    if (settings.smallImages) src = `${settings.installDirectory}textures/earthmap512.jpg`;
    if (settings.nasaImages) src = `${settings.installDirectory}textures/mercator-tex.jpg`;
    if (settings.trusatImages) src = `${settings.installDirectory}textures/trusatvector-4096.jpg`;
    if (settings.blueImages) src = `${settings.installDirectory}textures/world_blue-2048.png`;
    if (settings.vectorImages) src = `${settings.installDirectory}textures/dayearthvector-4096.jpg`;
    if (settings.politicalImages) src = `${settings.installDirectory}textures/political8k-gray.jpg`;
    if (settings.hiresImages) src = `${settings.installDirectory}textures/earthmap16k.jpg`;
    if (settings.hiresNoCloudsImages) src = `${settings.installDirectory}textures/earthmap16k.jpg`;
    return src;
  }

  /**
   * Determines the url to the high resolution night texture based on the settings.
   */
  private static getSrcHiResNight_(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('settings.installDirectory is undefined');

    let src = `${settings.installDirectory}textures/earthlights4k.jpg`;
    if (settings.vectorImages) src = `${settings.installDirectory}textures/dayearthvector-4096.jpg`;
    if (settings.politicalImages) src = `${settings.installDirectory}textures/political8k-gray-night.jpg`;
    if (settings.hiresImages || settings.hiresNoCloudsImages) src = `${settings.installDirectory}textures/earthlights16k.jpg`;

    return src;
  }

  /**
   * Determines the url to the night texture based on the settings.
   */
  private static getSrcNight_(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('settings.installDirectory is undefined');

    let src = `${settings.installDirectory}textures/earthlights512.jpg`;

    return src;
  }

  /**
   * Determines the url to the specular map based on the settings.
   */
  private static getSrcSpec_(settings: SettingsManager): string {
    if (!settings.installDirectory) throw new Error('settings.installDirectory is undefined');

    let src = `${settings.installDirectory}textures/earthspec8k.jpg`;
    if (settings.smallImages || settings.isMobileModeEnabled) src = `${settings.installDirectory}textures/earthspec256.jpg`;
    // if (settings.isMobileModeEnabled) src = `${settings.installDirectory}textures/earthspec4k.jpg`;

    return src;
  }

  private drawBlackGpuPickingEarth_() {
    const gl = this.gl_;
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    // Switch to GPU Picking Shader
    gl.useProgram(dotsManagerInstance.programs.picking.program);
    // Switch to the GPU Picking Frame Buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManagerInstance.pickingFrameBuffer);

    gl.bindVertexArray(this.vaoOcclusion_);

    // no reason to render 100000s of pixels when
    // we're only going to read one
    if (!this.settings_.isMobileModeEnabled) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(
        keepTrackApi.getMainCamera().mouseX,
        gl.drawingBufferHeight - keepTrackApi.getMainCamera().mouseY,
        keepTrackApi.getDotsManager().PICKING_READ_PIXEL_BUFFER_SIZE,
        keepTrackApi.getDotsManager().PICKING_READ_PIXEL_BUFFER_SIZE
      );
    }

    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);

    if (!this.settings_.isMobileModeEnabled) {
      gl.disable(gl.SCISSOR_TEST);
    }

    gl.bindVertexArray(null);
    // Disable attributes to avoid conflict with other shaders
    // NOTE: This breaks satellite gpu picking.
    // gl.disableVertexAttribArray(dotsManagerInstance.pickingProgram.aPos);
  }

  private drawColoredEarth_(tgtBuffer: WebGLFramebuffer, altNightTexBind: (gl: WebGL2RenderingContext, textureNight: WebGLTexture, textureDay: WebGLTexture) => void) {
    const gl = this.gl_;
    // Change to the earth shader
    gl.useProgram(this.mesh.program);
    // Change to the main drawing buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    // Set the uniforms
    gl.uniform1f(this.mesh.material.uniforms.uGlow, this.glowNumber_);
    gl.uniform3fv(this.mesh.material.uniforms.uCamPos, keepTrackApi.getMainCamera().getForwardVector());
    gl.uniformMatrix3fv(this.mesh.material.uniforms.uNormalMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.uMvMatrix, false, this.mvMatrix_);
    mat4.mul(this.uPCamMatrix_, keepTrackApi.getDrawManager().pMatrix, keepTrackApi.getMainCamera().camMatrix);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.uPCamMatrix, false, this.uPCamMatrix_);
    gl.uniform3fv(this.mesh.material.uniforms.uLightDirection, this.lightDirection);
    gl.uniform1f(this.mesh.material.uniforms.uIsDrawAtmosphere, this.settings_.isDrawAtmosphere ? 1.0 : 0.0);
    gl.uniform1f(this.mesh.material.uniforms.uIsDrawAurora, this.settings_.isDrawAurora ? 1.0 : 0.0);

    // Set the textures
    this.setTextures_(gl, altNightTexBind);

    gl.bindVertexArray(this.vaoVisible_);
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private initTextureBump_(): void {
    this.isBumpTextureReady_ = false;
    this.textureBump_ = this.gl_.createTexture();
    const img = new Image();
    img.onload = () => {
      if (this.settings_.isDrawBumpMap && !this.settings_.isBlackEarth && !this.settings_.politicalImages) {
        GlUtils.bindImageToTexture(this.gl_, this.textureBump_, img);
      } else {
        // Bind a blank texture
        this.gl_.bindTexture(this.gl_.TEXTURE_2D, this.textureSpec_);
      }

      this.isBumpTextureReady_ = true;
      this.onImageLoaded_();
    };
    img.src = Earth.getSrcBump_(this.settings_);
  }

  private initTextureDay_(): void {
    SplashScreen.loadStr(SplashScreen.msg.painting);
    this.textureDay_ = this.gl_.createTexture();
    const img = new Image();
    img.onload = () => {
      if (!this.settings_.isBlackEarth) {
        GlUtils.bindImageToTexture(this.gl_, this.textureDay_, img);
      }

      this.isDayTextureReady_ = true;
      this.onImageLoaded_();
    };
    img.src = Earth.getSrcDay_(this.settings_);
  }

  private initTextureNight_(): void {
    this.textureNight_ = this.gl_.createTexture();
    const img = new Image();
    img.onload = () => {
      if (!this.settings_.isBlackEarth) {
        GlUtils.bindImageToTexture(this.gl_, this.textureNight_, img);
      }

      this.isNightTextureReady_ = true;
      this.onImageLoaded_();
    };
    img.src = Earth.getSrcNight_(this.settings_);
  }

  private initTextureSpec_(): void {
    this.isSpecularTextureReady_ = false;
    this.textureSpec_ = this.gl_.createTexture();
    const img = new Image();
    img.onload = () => {
      if (this.settings_.isDrawSpecMap && !this.settings_.isBlackEarth && !this.settings_.politicalImages) {
        GlUtils.bindImageToTexture(this.gl_, this.textureSpec_, img);
      } else {
        // Bind a blank texture
        this.gl_.bindTexture(this.gl_.TEXTURE_2D, this.textureSpec_);
      }

      this.isSpecularTextureReady_ = true;
      this.onImageLoaded_();
    };
    img.src = Earth.getSrcSpec_(this.settings_);

    // DEBUG:
    // `${this.settings_.installDirectory}textures/earthspec1k.jpg`;
  }

  private initTextures_(): void {
    this.initTextureDay_();
    this.initTextureNight_();
    this.initTextureBump_();
    this.initTextureSpec_();
  }

  private initVaoOcclusion_() {
    const gl = this.gl_;
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    this.vaoOcclusion_ = gl.createVertexArray();
    gl.bindVertexArray(this.vaoOcclusion_);

    gl.bindBuffer(gl.ARRAY_BUFFER, dotsManagerInstance.pickingBuffers.color);
    // Disable color vertex so that the earth is drawn black
    // TODO: Figure out why this is in the earth class
    gl.disableVertexAttribArray(dotsManagerInstance.programs.picking.attribs.a_color); // IMPORTANT!

    // Only Enable Position Attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.geometry.getCombinedBuffer());
    gl.enableVertexAttribArray(dotsManagerInstance.programs.picking.attribs.a_position);
    gl.vertexAttribPointer(this.mesh.geometry.attributes.aVertexPosition, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, 0);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.geometry.getIndex());

    gl.bindVertexArray(null);
  }

  private initVaoVisible() {
    const gl = this.gl_;
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    this.vaoVisible_ = gl.createVertexArray();
    gl.bindVertexArray(this.vaoVisible_);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.geometry.getCombinedBuffer());
    gl.enableVertexAttribArray(this.mesh.geometry.attributes.aVertexPosition);
    gl.vertexAttribPointer(this.mesh.geometry.attributes.aVertexPosition, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, 0);
    gl.vertexAttribPointer(dotsManagerInstance.programs.picking.attribs.a_position, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, 0);

    gl.enableVertexAttribArray(this.mesh.geometry.attributes.aVertexNormal);
    gl.vertexAttribPointer(this.mesh.geometry.attributes.aVertexNormal, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, Float32Array.BYTES_PER_ELEMENT * 3);

    gl.enableVertexAttribArray(this.mesh.geometry.attributes.aTexCoord);
    gl.vertexAttribPointer(this.mesh.geometry.attributes.aTexCoord, 2, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, Float32Array.BYTES_PER_ELEMENT * 6);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.geometry.getIndex());

    gl.bindVertexArray(null);
  }

  private onImageLoaded_(): void {
    if (this.isDayTextureReady_ && this.isNightTextureReady_ && this.isBumpTextureReady_ && this.isSpecularTextureReady_) {
      this.isTexturesReady_ = true;
    }
  }

  private setTextures_(gl: WebGL2RenderingContext, altNightTexBind: (gl: WebGL2RenderingContext, textureNight: WebGLTexture, textureDay: WebGLTexture) => void) {
    // Day Map
    gl.uniform1i(this.mesh.material.uniforms.uDayMap, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textureDay_);

    // Night Map
    gl.uniform1i(this.mesh.material.uniforms.uNightMap, 1);
    gl.activeTexture(gl.TEXTURE1);

    // If there are no callbacks, just use the night texture
    if (!altNightTexBind) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureNight_);
    } else {
      // If there are callbacks use those to determine which texture to use
      // This is primarily used for the night mode toggle
      altNightTexBind(gl, this.textureNight_, this.textureDay_);
    }

    // Bump Map
    gl.uniform1i(this.mesh.material.uniforms.uBumpMap, 2);
    gl.activeTexture(gl.TEXTURE2);
    if (this.settings_.isDrawBumpMap) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureBump_);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // Specular Map
    gl.uniform1i(this.mesh.material.uniforms.uSpecMap, 3);
    gl.activeTexture(gl.TEXTURE3);
    if (this.settings_.isDrawSpecMap) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureSpec_);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }

  /**
   * The shaders for the earth.
   *
   * NOTE: Keep these at the bottom of the file to ensure proper syntax highlighting.
   */
  private shaders_ = {
    frag: keepTrackApi.glsl`
    precision highp float;

    uniform float uGlow;
    uniform vec3 uLightDirection;
    uniform float uIsDrawAtmosphere;
    uniform float uIsDrawAurora;

    in vec2 vUv;
    in vec3 vNormal;
    in vec3 vWorldPos;
    in vec3 vVertToCamera;

    out vec4 fragColor;

    uniform sampler2D uDayMap;
    uniform sampler2D uNightMap;
    uniform sampler2D uBumpMap;
    uniform sampler2D uSpecMap;

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
        float diffuse = max(dot(vNormal, uLightDirection), 0.0);

      //.................................................
      // Bump mapping
        vec3 bumpTexColor = texture(uBumpMap, vUv).rgb * diffuse * 0.4;

        //................................................
        // Specular lighting
        vec3 specLightColor = texture(uSpecMap, vUv).rgb * diffuse * 0.1;

        //................................................
        // Final color
        vec3 dayColor = (ambientLightColor + directionalLightColor) * diffuse;
        vec3 dayTexColor = texture(uDayMap, vUv).rgb * dayColor;
        vec3 nightColor = 0.5 * texture(uNightMap, vUv).rgb * pow(1.0 - diffuse, 2.0);

        fragColor = vec4(dayTexColor + nightColor + bumpTexColor + specLightColor, 1.0);

        // ...............................................
        // Atmosphere

        if (uIsDrawAtmosphere > 0.5) {
          float sunAmount = max(dot(vNormal, uLightDirection), 0.1);
          float darkAmount = max(dot(vNormal, -uLightDirection), 0.0);
          float r = 1.0 - sunAmount;
          float g = max(1.0 - sunAmount, 0.85) - darkAmount;
          float b = max(sunAmount, 0.9) - darkAmount;
          vec3 atmosphereColor = vec3(r,g,b);

          float fragToCameraAngle = (1.0 - dot(fragToCamera, vNormal));
          fragToCameraAngle = pow(fragToCameraAngle, 3.8); //Curve the change, Make the fresnel thinner

          fragColor.rgb += (atmosphereColor * fragToCameraAngle * smoothstep(0.25, 0.5, fragToLightAngle));
        } else {
          // Draw thin white line around the Earth no matter what fragToLightAngle is
          float fragToCameraAngle = (1.0 - dot(fragToCamera, vNormal));
          fragToCameraAngle = pow(fragToCameraAngle, 7.0); //Curve the change, Make the fresnel thinner
          fragColor.rgb += vec3(1.0, 1.0, 1.0) * fragToCameraAngle;
        }

        // ...............................................
        // Aurora
        if (uIsDrawAurora > 0.5) {
          float latitude = vUv.y * 180.0 - 90.0; // Convert texture coordinate to latitude (-90 to 90)
          // if (latitude >= latitudeMin && latitude <= latitudeMax || latitude >= -latitudeMin && latitude <= -latitudeMax){
            float noise = uGlow;

            // Calculate the intensity of the Aurora Borealis at the current latitude
            float auroraIntensity = calculateAuroraIntensity(abs(latitude), noise / 2.0);

            // Calculate the strength of the Aurora Borealis based on the Sun direction. It should only be visible on the dark side of the Earth
            float auroraStrength = max(dot(vNormal, -uLightDirection), 0.0) * (0.75 + (noise / 10.0));

            // Combine the Earth color and the Aurora Borealis color based on the intensity and strength
            vec3 auroraColor = vec3(0.0, 0.8, 0.55 + noise / 20.0); // Color of the Aurora Borealis

            fragColor.rgb += auroraColor * auroraIntensity * auroraStrength;
        }
        // }
    }
    `,
    vert: keepTrackApi.glsl`
    precision highp float;
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    in vec2 aTexCoord;

    uniform vec3 uCamPos;
    uniform mat4 uPCamMatrix;
    uniform mat4 uMvMatrix;
    uniform mat3 uNormalMatrix;

    out vec2 vUv;
    out vec3 vNormal;
    out vec3 vWorldPos;
    out vec3 vVertToCamera;

    void main(void) {
        vec4 worldPosition = uMvMatrix * vec4(aVertexPosition, 1.0);
        vWorldPos = worldPosition.xyz;
        vNormal = uNormalMatrix * aVertexNormal;
        vUv = aTexCoord;
        vVertToCamera = normalize(vec3(uCamPos) - worldPosition.xyz);

        gl_Position = uPCamMatrix * worldPosition;
    }
    `,
  };
}
