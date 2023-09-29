import { UserSettings } from '@app/js/interfaces';
import { keepTrackApi } from '@app/js/keepTrackApi';
import { DEG2RAD, RADIUS_OF_EARTH } from '@app/js/lib/constants';
import { SettingsManager } from '@app/js/settings/settings';
import { CameraType, mainCameraInstance } from '@app/js/singletons/camera';
import { GlUtils } from '@app/js/static/gl-utils';
import { SplashScreen } from '@app/js/static/splash-screen';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { GreenwichMeanSiderealTime } from 'ootk';
import { OcclusionProgram } from './post-processing';

declare module '@app/js/interfaces' {
  interface UserSettings {
    blueImages: boolean;
    earthNumLatSegs: number;
    earthNumLonSegs: number;
    hiresImages: boolean;
    hiresNoCloudsImages: boolean;
    installDirectory: string;
    isBlackEarth: boolean;
    isMobileModeEnabled: boolean;
    nasaImages: boolean;
    politicalImages: boolean;
    smallImages: boolean;
    trusatImages: boolean;
    vectorImages: boolean;
  }
}

// TODO: #316 Implement VAO for earth
export class Earth {
  private attribs_ = {
    aVertexPosition: 0,
    aVertexNormal: 0,
    aTexCoord: 0,
  };

  private buffers_ = {
    combinedBuf: <WebGLBuffer>null,
    vertIndexBuf: <WebGLBuffer>null,
  };

  private vaoVisible_: WebGLVertexArrayObject;
  private vaoOcclusion_: WebGLVertexArrayObject;

  private gl_: WebGL2RenderingContext;
  private glowDirection = 1;
  private glowNumber = 0;
  private isLoaded_ = false;
  private isReadyBump_ = false;
  private isReadyDay_ = false;
  private isReadyNight_ = false;
  private isReadySpec_ = false;
  private mvMatrix_: mat4;
  private nMatrix_: mat3 = mat3.create();
  private program_: WebGLProgram = <WebGLProgram>null;
  private settings_: SettingsManager;

  // This helps with reducing garbage collection
  private sunvar_ = {
    n: 0,
    L: 0,
    g: 0,
    ecLon: 0,
    t: 0,
    obliq: 0,
    ob: 0,
  };

  private textureBump_: WebGLTexture;
  private textureDay_: WebGLTexture;
  private textureNight_: WebGLTexture;
  private textureSpec_: WebGLTexture;
  private uniforms_ = {
    uZoomModifier: <WebGLUniformLocation>null,
    uGlow: <WebGLUniformLocation>null,
    uAmbientLightColor: <WebGLUniformLocation>null,
    uDirectionalLightColor: <WebGLUniformLocation>null,
    uIsDrawAtmosphere: <WebGLUniformLocation>null,
    uIsDrawAurora: <WebGLUniformLocation>null,
    uLightDirection: <WebGLUniformLocation>null,
    uSampler: <WebGLUniformLocation>null,
    uNightSampler: <WebGLUniformLocation>null,
    uBumpMap: <WebGLUniformLocation>null,
    uSpecMap: <WebGLUniformLocation>null,
    uCamPos: <WebGLUniformLocation>null,
    uPMatrix: <WebGLUniformLocation>null,
    uCamMatrix: <WebGLUniformLocation>null,
    uMvMatrix: <WebGLUniformLocation>null,
    uNormalMatrix: <WebGLUniformLocation>null,
  };

  private vertCount_: number;

  public isHiResReady: boolean;
  public isUseHiRes: boolean;
  public lightDirection = <vec3>[0, 0, 0];

  /**
   * Determines the url to the bump map based on the settings.
   */
  public static getSrcBump(settings: UserSettings): string {
    if (!settings.installDirectory) throw new Error('settings.installDirectory is undefined');

    let src = `${settings.installDirectory}textures/earthbump8k.jpg`;
    if (settings.smallImages) src = `${settings.installDirectory}textures/earthbump256.jpg`;
    if (settings.isMobileModeEnabled) src = `${settings.installDirectory}textures/earthbump4k.jpg`;

    return src;
  }

  /**
   * Determines the url to the day texture based on the settings.
   */
  public static getSrcDay(settings: UserSettings): string {
    if (!settings.installDirectory) throw new Error('settings.installDirectory is undefined');

    let src = `${settings.installDirectory}textures/earthmap512.jpg`;

    return src;
  }

  /**
   * Determines the url to the high resolution day texture based on the settings.
   */
  public static getSrcHiResDay(settings: UserSettings): string {
    if (!settings.installDirectory) throw new Error('settings.installDirectory is undefined');
    let src = `${settings.installDirectory}textures/earthmap4k.jpg`;
    if (settings.smallImages) src = `${settings.installDirectory}textures/earthmap512.jpg`;
    if (settings.nasaImages) src = `${settings.installDirectory}textures/mercator-tex.jpg`;
    if (settings.trusatImages) src = `${settings.installDirectory}textures/trusatvector-4096.jpg`;
    if (settings.blueImages) src = `${settings.installDirectory}textures/world_blue-2048.png`;
    if (settings.vectorImages) src = `${settings.installDirectory}textures/dayearthvector-4096.jpg`;
    if (settings.politicalImages) src = `${settings.installDirectory}textures/political8k-gray.jpg`;
    if (settings.hiresImages) src = `${settings.installDirectory}textures/earthmapclouds16k.jpg`;
    if (settings.hiresNoCloudsImages) src = `${settings.installDirectory}textures/earthmap16k.jpg`;
    return src;
  }

  /**
   * Determines the url to the high resolution night texture based on the settings.
   */
  public static getSrcHiResNight(settings: UserSettings): string {
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
  public static getSrcNight(settings: UserSettings): string {
    if (!settings.installDirectory) throw new Error('settings.installDirectory is undefined');

    let src = `${settings.installDirectory}textures/earthlights512.jpg`;

    return src;
  }

  /**
   * Determines the url to the specular map based on the settings.
   */
  public static getSrcSpec(settings: UserSettings): string {
    if (!settings.installDirectory) throw new Error('settings.installDirectory is undefined');

    let src = `${settings.installDirectory}textures/earthspec8k.jpg`;
    if (settings.smallImages) src = `${settings.installDirectory}textures/earthspec256.jpg`;
    if (settings.isMobileModeEnabled) src = `${settings.installDirectory}textures/earthspec4k.jpg`;

    return src;
  }

  public draw(pMatrix: mat4, tgtBuffer: WebGLFramebuffer, altNightTexBind?: (gl: WebGL2RenderingContext, textureNight: WebGLTexture, textureDay: WebGLTexture) => void) {
    if (!this.isLoaded_) return;
    this.drawColoredEarth_(tgtBuffer, pMatrix, altNightTexBind);
    this.drawBlackGpuPickingEarth_();
  }

  public drawOcclusion(pMatrix: mat4, camMatrix: mat4, occlusionPrgm: OcclusionProgram, tgtBuffer: WebGLFramebuffer): void {
    const gl = this.gl_;
    // Change to the earth shader
    gl.useProgram(occlusionPrgm.program);
    // Change to the main drawing buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    occlusionPrgm.attrSetup(this.buffers_.combinedBuf);

    // Set the uniforms
    occlusionPrgm.uniformSetup(this.mvMatrix_, pMatrix, camMatrix);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);
    gl.drawElements(gl.TRIANGLES, this.vertCount_, gl.UNSIGNED_SHORT, 0);

    // DEBUG:
    // occlusionPrgm.attrOff(occlusionPrgm);
  }

  public forceLoaded(): void {
    this.isLoaded_ = true;
  }

  public async init(settings: SettingsManager, gl?: WebGL2RenderingContext): Promise<void> {
    try {
      if (!gl && !this.gl_) throw new Error('No WebGL context found');
      this.gl_ ??= gl;
      this.settings_ = settings;

      this.initProgram_();
      this.initTextures_();
      this.initBuffers_();
      this.initVao_();
    } catch (error) {
      console.debug(error);
    }
  }

  public async loadHiRes(): Promise<void> {
    try {
      const img = new Image();
      img.onload = () => {
        if (!this.settings_.isBlackEarth) {
          GlUtils.bindImageToTexture(this.gl_, this.textureDay_, img);
        }

        this.isReadyDay_ = true;
        this.isHiResReady = true;
        this.onImageLoaded_();
      };
      img.src = Earth.getSrcHiResDay(this.settings_);

      this.isUseHiRes = true;
    } catch (e) {
      console.debug(e);
    }
  }

  public async loadHiResNight(): Promise<void> {
    try {
      const img = new Image();
      img.onload = () => {
        if (!this.settings_.isBlackEarth) {
          GlUtils.bindImageToTexture(this.gl_, this.textureNight_, img);
        }

        this.isReadyNight_ = true;
        this.onImageLoaded_();
      };
      img.src = Earth.getSrcHiResNight(this.settings_);
    } catch (e) {
      console.debug(e);
    }
  }

  public async reloadEarthTextures() {
    this.init(settingsManager, this.gl_);
    this.loadHiRes();
    this.loadHiResNight();
  }

  public update(gmst: GreenwichMeanSiderealTime, j: number): void {
    this.updateSunCurrentDirection_(j);
    vec3.normalize(<vec3>(<unknown>this.lightDirection), <vec3>(<unknown>this.lightDirection));

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);
    mat4.rotateZ(this.mvMatrix_, this.mvMatrix_, gmst);
    // DEBUG: This allows moving the earth around the scene
    // const offSetPosition = [0,0,0];
    // mat4.translate(this.mvMatrix, this.mvMatrix, offSetPosition);
    // DEBUG: This allows scaling the earth
    // mat4.scale(mvMatrix, mvMatrix, [2,2,2]);
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  private drawBlackGpuPickingEarth_() {
    const gl = this.gl_;
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    // Switch to GPU Picking Shader
    gl.useProgram(dotsManagerInstance.programs.picking.program);
    // Switch to the GPU Picking Frame Buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManagerInstance.pickingFrameBuffer);

    gl.bindVertexArray(this.vaoOcclusion_);
    // // Set Uniforms
    // // gl.uniformMatrix4fv(dotsManagerInstance.pickingProgram.uMvMatrix, false, mvMatrix);
    // // Disable color vertex so that the earth is drawn black
    // gl.disableVertexAttribArray(dotsManagerInstance.programs.picking.attribs.a_color); // IMPORTANT!

    // // Only Enable Position Attribute
    // gl.enableVertexAttribArray(dotsManagerInstance.programs.picking.attribs.a_position);

    // no reason to render 100000s of pixels when
    // we're only going to read one
    if (!this.settings_.isMobileModeEnabled) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(mainCameraInstance.mouseX, gl.drawingBufferHeight - mainCameraInstance.mouseY, 1, 1);
    }

    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);
    gl.drawElements(gl.TRIANGLES, this.vertCount_, gl.UNSIGNED_SHORT, 0);

    if (!this.settings_.isMobileModeEnabled) {
      gl.disable(gl.SCISSOR_TEST);
    }

    gl.bindVertexArray(null);
    // Disable attributes to avoid conflict with other shaders
    // NOTE: This breaks satellite gpu picking.
    // gl.disableVertexAttribArray(dotsManagerInstance.pickingProgram.aPos);
  }

  private drawColoredEarth_(
    tgtBuffer: WebGLFramebuffer,
    pMatrix: mat4,
    altNightTexBind: (gl: WebGL2RenderingContext, textureNight: WebGLTexture, textureDay: WebGLTexture) => void
  ) {
    const gl = this.gl_;
    // Change to the earth shader
    gl.useProgram(this.program_);
    // Change to the main drawing buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    // Set the uniforms
    const uZoomModifier =
      mainCameraInstance.cameraType === CameraType.FIXED_TO_SAT || mainCameraInstance.panCurrent.x !== 0 || mainCameraInstance.panCurrent.y !== 0 || mainCameraInstance.panCurrent.z
        ? mainCameraInstance.zoomLevel()
        : 1.0;

    gl.uniform1f(this.uniforms_.uZoomModifier, uZoomModifier);
    this.glowNumber += 0.0025 * this.glowDirection;
    this.glowDirection = this.glowNumber > 1 ? -1 : this.glowDirection;
    this.glowDirection = this.glowNumber < 0 ? 1 : this.glowDirection;
    gl.uniform1f(this.uniforms_.uGlow, this.glowNumber);
    gl.uniform3fv(this.uniforms_.uCamPos, mainCameraInstance.getForwardVector());
    gl.uniformMatrix3fv(this.uniforms_.uNormalMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.uMvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.uCamMatrix, false, mainCameraInstance.camMatrix);
    gl.uniform3fv(this.uniforms_.uLightDirection, this.lightDirection);
    gl.uniform3fv(this.uniforms_.uAmbientLightColor, [0.1, 0.1, 0.1]); // RGB ambient light
    gl.uniform3fv(this.uniforms_.uDirectionalLightColor, [1.0, 1.0, 1.0]); // RGB directional light
    gl.uniform1f(this.uniforms_.uIsDrawAtmosphere, this.settings_.isDrawAtmosphere ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms_.uIsDrawAurora, this.settings_.isDrawAurora ? 1.0 : 0.0);

    // Set the textures
    this.setTextures(gl, altNightTexBind);

    gl.bindVertexArray(this.vaoVisible_);
    gl.drawElements(gl.TRIANGLES, this.vertCount_, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private initBuffers_(): void {
    const { combinedArray, vertIndex } = GlUtils.createSphere(RADIUS_OF_EARTH, this.settings_.earthNumLatSegs, this.settings_.earthNumLonSegs);
    this.vertCount_ = vertIndex.length;

    this.buffers_.combinedBuf = GlUtils.createArrayBuffer(this.gl_, new Float32Array(combinedArray));
    this.buffers_.vertIndexBuf = GlUtils.createElementArrayBuffer(this.gl_, new Uint16Array(vertIndex));
  }

  private initVao_(): void {
    // Make New Vertex Array Objects
    this.initVaoVisible();

    // Make New Vertex Array Objects for drawBlackGpuPickingEarth_
    this.initVaoOcclusion_();
  }

  private initVaoVisible() {
    const gl = this.gl_;
    const dotsManagerInstance = keepTrackApi.getDotsManager();
    this.vaoVisible_ = gl.createVertexArray();
    gl.bindVertexArray(this.vaoVisible_);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.combinedBuf);
    gl.enableVertexAttribArray(this.attribs_.aVertexPosition);
    gl.vertexAttribPointer(this.attribs_.aVertexPosition, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, 0);
    gl.vertexAttribPointer(dotsManagerInstance.programs.picking.attribs.a_position, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, 0);

    gl.enableVertexAttribArray(this.attribs_.aVertexNormal);
    gl.vertexAttribPointer(this.attribs_.aVertexNormal, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, Float32Array.BYTES_PER_ELEMENT * 3);

    gl.enableVertexAttribArray(this.attribs_.aTexCoord);
    gl.vertexAttribPointer(this.attribs_.aTexCoord, 2, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, Float32Array.BYTES_PER_ELEMENT * 6);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);

    gl.bindVertexArray(null);
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
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.combinedBuf);
    gl.enableVertexAttribArray(dotsManagerInstance.programs.picking.attribs.a_position);
    gl.vertexAttribPointer(this.attribs_.aVertexPosition, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 8, 0);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);

    gl.bindVertexArray(null);
  }

  private initProgram_(): void {
    // Create Program with Two Shaders
    this.program_ = GlUtils.createProgramFromCode(this.gl_, this.shaders_.vert, this.shaders_.frag);
    this.gl_.useProgram(this.program_);

    GlUtils.assignAttributes(this.attribs_, this.gl_, this.program_, ['aVertexPosition', 'aTexCoord', 'aVertexNormal']);
    GlUtils.assignUniforms(this.uniforms_, this.gl_, this.program_, [
      'uZoomModifier',
      'uGlow',
      'uCamPos',
      'uPMatrix',
      'uCamMatrix',
      'uMvMatrix',
      'uNormalMatrix',
      'uLightDirection',
      'uAmbientLightColor',
      'uDirectionalLightColor',
      'uIsDrawAtmosphere',
      'uIsDrawAurora',
      'uSampler',
      'uNightSampler',
      'uBumpMap',
      'uSpecMap',
    ]);
  }

  private initTextureBump_(): void {
    this.isReadyBump_ = false;
    this.textureBump_ = this.gl_.createTexture();
    const img = new Image();
    img.onload = () => {
      if (this.settings_.isDrawBumpMap && !this.settings_.isBlackEarth && !this.settings_.politicalImages) {
        GlUtils.bindImageToTexture(this.gl_, this.textureBump_, img);
      } else {
        // Bind a blank texture
        this.gl_.bindTexture(this.gl_.TEXTURE_2D, this.textureSpec_);
      }

      this.isReadyBump_ = true;
      this.onImageLoaded_();
    };
    img.src = Earth.getSrcBump(this.settings_);

    // DEBUG:
    // `${this.settings_.installDirectory}textures/earthbump1k.jpg`;
  }

  private initTextureDay_(): void {
    SplashScreen.loadStr(SplashScreen.msg.painting);
    this.textureDay_ = this.gl_.createTexture();
    const img = new Image();
    img.onload = () => {
      if (!this.settings_.isBlackEarth) {
        GlUtils.bindImageToTexture(this.gl_, this.textureDay_, img);
      }

      this.isReadyDay_ = true;
      this.onImageLoaded_();
    };
    img.src = Earth.getSrcDay(this.settings_);
  }

  private initTextureNight_(): void {
    this.textureNight_ = this.gl_.createTexture();
    const img = new Image();
    img.onload = () => {
      if (!this.settings_.isBlackEarth) {
        GlUtils.bindImageToTexture(this.gl_, this.textureNight_, img);
      }

      this.isReadyNight_ = true;
      this.onImageLoaded_();
    };
    img.src = Earth.getSrcNight(this.settings_);
  }

  private initTextureSpec_(): void {
    this.isReadySpec_ = false;
    this.textureSpec_ = this.gl_.createTexture();
    const img = new Image();
    img.onload = () => {
      if (this.settings_.isDrawSpecMap && !this.settings_.isBlackEarth && !this.settings_.politicalImages) {
        GlUtils.bindImageToTexture(this.gl_, this.textureSpec_, img);
      } else {
        // Bind a blank texture
        this.gl_.bindTexture(this.gl_.TEXTURE_2D, this.textureSpec_);
      }

      this.isReadySpec_ = true;
      this.onImageLoaded_();
    };
    img.src = Earth.getSrcSpec(this.settings_);

    // DEBUG:
    // `${this.settings_.installDirectory}textures/earthspec1k.jpg`;
  }

  private initTextures_(): void {
    this.initTextureDay_();
    this.initTextureNight_();
    this.initTextureBump_();
    this.initTextureSpec_();
  }

  private onImageLoaded_(): void {
    if (this.isReadyDay_ && this.isReadyNight_ && this.isReadyBump_ && this.isReadySpec_) {
      this.isLoaded_ = true;
    }
  }

  private setTextures(gl: WebGL2RenderingContext, altNightTexBind: (gl: WebGL2RenderingContext, textureNight: WebGLTexture, textureDay: WebGLTexture) => void) {
    // Day Map
    gl.uniform1i(this.uniforms_.uSampler, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textureDay_);

    // Night Map
    gl.uniform1i(this.uniforms_.uNightSampler, 1);
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
    if (this.settings_.isDrawBumpMap) {
      gl.uniform1i(this.uniforms_.uBumpMap, 2);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.textureBump_);
    } else {
      gl.uniform1i(this.uniforms_.uBumpMap, 2);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // Specular Map
    if (this.settings_.isDrawSpecMap) {
      gl.uniform1i(this.uniforms_.uSpecMap, 3);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.textureSpec_);
    } else {
      // Bind a blank texture
      gl.uniform1i(this.uniforms_.uSpecMap, 3);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
  }

  private updateSunCurrentDirection_(j: number): void {
    this.sunvar_.n = j - 2451545;
    this.sunvar_.L = 280.46 + 0.9856474 * this.sunvar_.n; // mean longitude of sun
    this.sunvar_.g = 357.528 + 0.9856003 * this.sunvar_.n; // mean anomaly
    this.sunvar_.L = this.sunvar_.L % 360.0;
    this.sunvar_.g = this.sunvar_.g % 360.0;

    this.sunvar_.ecLon = this.sunvar_.L + 1.915 * Math.sin(this.sunvar_.g * DEG2RAD) + 0.02 * Math.sin(2 * this.sunvar_.g * DEG2RAD);

    this.sunvar_.t = (j - 2451545) / 3652500;

    this.sunvar_.obliq =
      84381.448 -
      4680.93 * this.sunvar_.t -
      1.55 * Math.pow(this.sunvar_.t, 2) +
      1999.25 * Math.pow(this.sunvar_.t, 3) -
      51.38 * Math.pow(this.sunvar_.t, 4) -
      249.67 * Math.pow(this.sunvar_.t, 5) -
      39.05 * Math.pow(this.sunvar_.t, 6) +
      7.12 * Math.pow(this.sunvar_.t, 7) +
      27.87 * Math.pow(this.sunvar_.t, 8) +
      5.79 * Math.pow(this.sunvar_.t, 9) +
      2.45 * Math.pow(this.sunvar_.t, 10);

    this.sunvar_.ob = this.sunvar_.obliq / 3600.0;

    this.lightDirection[0] = Math.cos(this.sunvar_.ecLon * DEG2RAD);
    this.lightDirection[1] = Math.cos(this.sunvar_.ob * DEG2RAD) * Math.sin(this.sunvar_.ecLon * DEG2RAD);
    this.lightDirection[2] = Math.sin(this.sunvar_.ob * DEG2RAD) * Math.sin(this.sunvar_.ecLon * DEG2RAD);
  }

  /**
   * The shaders for the earth.
   *
   * NOTE: Keep these at the bottom of the file to ensure proper syntax highlighting.
   */
  private shaders_ = {
    frag: keepTrackApi.glsl`#version 300 es
    precision highp float;

    uniform float uZoomModifier;
    uniform float uGlow;
    uniform vec3 uAmbientLightColor;
    uniform vec3 uDirectionalLightColor;
    uniform vec3 uLightDirection;
    uniform mat4 uPMatrix;
    uniform float uIsDrawAtmosphere;
    uniform float uIsDrawAurora;

    in vec2 vUv;
    in vec3 vNormal;
    in vec3 vWorldPos;
    in vec3 vVertToCamera;

    out vec4 fragColor;

    uniform sampler2D uSampler;
    uniform sampler2D uNightSampler;
    uniform sampler2D uBumpMap;
    uniform sampler2D uSpecMap;

    const float latitudeCenter = 67.5; // The latitude at which the Aurora Borealis appears
    const float latitudeMargin = 7.0; // The margin around the center latitude where the Aurora Borealis is visible

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
        vec3 dayColor = (uAmbientLightColor + uDirectionalLightColor) * diffuse;
        vec3 dayTexColor = texture(uSampler, vUv).rgb * dayColor;
        vec3 nightColor = 0.5 * texture(uNightSampler, vUv).rgb * pow(1.0 - diffuse, 2.0);

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
    vert: keepTrackApi.glsl`#version 300 es
    precision highp float;
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    in vec2 aTexCoord;

    uniform vec3 uCamPos;
    uniform mat4 uPMatrix;
    uniform mat4 uCamMatrix;
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

        gl_Position = uPMatrix * uCamMatrix * worldPosition;
    }
    `,
  };
}
