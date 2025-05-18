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

import { Component } from '@app/doris/components/component';
import { Doris } from '@app/doris/doris';
import { CoreEngineEvents } from '@app/doris/events/event-types';
import { GlUtils } from '@app/doris/webgl/gl-utils';
import { GLSL3 } from '@app/doris/webgl/material';
import { Mesh } from '@app/doris/webgl/mesh';
import { ShaderMaterial } from '@app/doris/webgl/shader-material';
import { SphereGeometry } from '@app/doris/webgl/sphere-geometry';
import { KeepTrackApiEvents } from '@app/keeptrack/events/event-types';
import { keepTrackApi } from '@app/keepTrackApi';
import { RADIUS_OF_EARTH } from '@app/lib/constants';
import { SettingsManager } from '@app/settings/settings';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { EpochUTC, Sun } from 'ootk';
import { errorManagerInstance } from '../errorManager';
import { OcclusionProgram } from './post-processing';


export enum EarthNightTextureQuality {
  POTATO = '512',
  LOW = '1K',
  MEDIUM = '2k',
  HIGH = '4k',
  ULTRA = '16k',
}

export enum EarthDayTextureQuality {
  POTATO = '512',
  LOW = '1k',
  MEDIUM = '2k',
  HIGH = '4k',
  ULTRA = '16k',
}

export class Earth extends Component {
  private glowDirection_ = 1;
  private glowNumber_ = 0;
  private readonly normalMatrix_: mat3 = mat3.create();
  textureDay: WebGLTexture;
  textureNight: WebGLTexture;
  private textureBump_: WebGLTexture | null = null;
  private textureSpec_: WebGLTexture | null = null;
  private vaoOcclusion_: WebGLVertexArrayObject | null = null;
  isHiResReady = false;
  isUseHiRes = false;
  /** Normalized vector pointing to the sun. */
  lightDirection = <vec3>[0, 0, 0];
  mesh: Mesh;
  imageCache: Record<string, HTMLImageElement> = {};
  /** Cache the last camera position to avoid flickering of the atmosphere on camera controller changes */
  lastCameraPosition_: vec3;

  /**
   * This is run once per session to initialize the earth.
   */
  async initialize(): Promise<void> {
    const gl = Doris.getInstance().getRenderer().gl;

    await this.initTextures_();
    const geometry = new SphereGeometry(gl, {
      radius: RADIUS_OF_EARTH,
      widthSegments: settingsManager.earthNumLatSegs,
      heightSegments: settingsManager.earthNumLonSegs,
    });
    const material = new ShaderMaterial(gl, {
      uniforms: {
        uGlow: <WebGLUniformLocation><unknown>null,
        uIsDrawAtmosphere: <WebGLUniformLocation><unknown>null,
        uIsDrawAurora: <WebGLUniformLocation><unknown>null,
        uLightDirection: <WebGLUniformLocation><unknown>null,
        uDayMap: <WebGLUniformLocation><unknown>null,
        uNightMap: <WebGLUniformLocation><unknown>null,
        uBumpMap: <WebGLUniformLocation><unknown>null,
        uSpecMap: <WebGLUniformLocation><unknown>null,
      },
      vertexShader: this.shaders_.vert,
      fragmentShader: this.shaders_.frag,
      glslVersion: GLSL3,
    });

    this.mesh = new Mesh(gl, geometry, material, {
      name: 'earth',
      precision: 'highp',
      disabledUniforms: {
        modelMatrix: true,
        viewMatrix: true,
      },
    });

    // Set the local matrix based on the geometry
    mat4.copy(this.node.transform.localMatrix, this.mesh.geometry.localMvMatrix);

    this.initVaoVisible_();
    this.initVaoOcclusion_();

    Doris.getInstance().on(CoreEngineEvents.RenderOpaque, (_camera, buffer): void => {
      this.render(buffer);
    });
  }

  /**
   * This is run once per frame to update the earth.
   */
  update(): void {
    const pos = Sun.position(EpochUTC.fromDateTime(keepTrackApi.getTimeManager().simulationTimeObj));
    const gmst = keepTrackApi.getTimeManager().gmst;

    this.lightDirection = [pos.x, pos.y, pos.z];
    vec3.normalize(<vec3>(<unknown>this.lightDirection), <vec3>(<unknown>this.lightDirection));

    // Set the local matrix based on the geometry
    mat4.copy(this.node.transform.worldMatrix, this.mesh.geometry.localMvMatrix);
    // Rotate the earth based on the GMST
    mat4.rotateZ(this.node.transform.worldMatrix, this.node.transform.worldMatrix, gmst);

    mat3.normalFromMat4(this.normalMatrix_, this.node.transform.worldMatrix);

    // Update the aurora glow
    this.glowNumber_ += 0.0025 * this.glowDirection_;
    this.glowDirection_ = this.glowNumber_ > 1 ? -1 : this.glowDirection_;
    this.glowDirection_ = this.glowNumber_ < 0 ? 1 : this.glowDirection_;

    this.lastCameraPosition_ = keepTrackApi.getMainCamera().getForwardVector();
  }

  /**
   * This is run once per frame to render the earth.
   */
  render(tgtBuffer: WebGLFramebuffer | null) {
    if (!this.isInitialized_) {
      return;
    }
    this.drawColoredEarth_(tgtBuffer);
    this.drawBlackGpuPickingEarth_();
  }

  /**
   * This is run once per frame to render the earth in godrays buffer.
   */
  renderOcclusion(pMatrix: mat4, viewMatrix: mat4, occlusionPrgm: OcclusionProgram, tgtBuffer: WebGLFramebuffer): void {
    if (settingsManager.isDisableGodrays) {
      return;
    }

    const gl = Doris.getInstance().getRenderer().gl;
    // Change to the earth shader

    gl.useProgram(occlusionPrgm.program);
    // Change to the main drawing buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    occlusionPrgm.attrSetup(this.mesh.geometry.getCombinedBuffer());

    // Set the uniforms
    occlusionPrgm.uniformSetup(this.node.transform.localMatrix, pMatrix, viewMatrix);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.geometry.getIndex());
    gl.drawElements(gl.TRIANGLES, this.mesh.geometry.indexLength, gl.UNSIGNED_SHORT, 0);

    /*
     * DEBUG:
     * occlusionPrgm.attrOff(occlusionPrgm);
     */
  }

  /**
   * Helper function to load the high resolution earth textures.
   */
  loadHiRes(texture: WebGLTexture, src: string, cb?: (() => void)): void {
    try {
      const gl = Doris.getInstance().getRenderer().gl;
      let img = this.imageCache[src];

      if (!img) {
        img = new Image();

        img.onload = () => {
          if (!settingsManager.isBlackEarth) {
            GlUtils.bindImageToTexture(gl, texture, img);
          }

          this.isHiResReady = true;
          if (cb) {
            cb();
          }
        };
        img.src = src;
        this.imageCache[src] = img;
        this.isUseHiRes = true;
      } else {
        if (!settingsManager.isBlackEarth) {
          GlUtils.bindImageToTexture(gl, texture, img);
        }

        if (cb) {
          cb();
        }
      }

    } catch (e) {
      errorManagerInstance.warn(`Failed to load texture: ${src}`);
    }
  }

  /**
   * This is run once per session to initialize the high resolution earth textures.
   * It can be run multiple times to reload the textures.
   */
  reloadEarthHiResTextures(): void {
    this.initialize();
    this.loadHiRes(this.textureDay, Earth.getSrcHiResDay_(settingsManager));
    this.loadHiRes(this.textureNight, Earth.getSrcHiResNight_(settingsManager));
  }

  /**
   * Determines the url to the bump map based on the settings.
   */
  private static getSrcBump_(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('settings.installDirectory is undefined');
    }

    let src = `${settings.installDirectory}textures/earthbump8k.jpg`;

    if (settings.smallImages || settings.isMobileModeEnabled) {
      src = `${settings.installDirectory}textures/earthbump256.jpg`;
    }
    // if (settings.isMobileModeEnabled) src = `${settings.installDirectory}textures/earthbump4k.jpg`;

    return src;
  }

  /**
   * Determines the url to the day texture based on the settings.
   */
  private static getSrcDay_(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('settings.installDirectory is undefined');
    }

    const src = `${settings.installDirectory}textures/earthmap512.jpg`;

    return src;
  }

  /**
   * Determines the url to the high resolution day texture based on the settings.
   */
  private static getSrcHiResDay_(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('settings.installDirectory is undefined');
    }

    const quality = settings.earthDayTextureQuality;

    let src = `${settings.installDirectory}textures/earthmap${quality}.jpg`;

    if (settings.smallImages) {
      src = `${settings.installDirectory}textures/earthmap512.jpg`;
    }
    if (settings.nasaImages) {
      src = `${settings.installDirectory}textures/mercator-tex.jpg`;
    }
    if (settings.brownEarthImages) {
      src = `${settings.installDirectory}textures/trusatvector-4096.jpg`;
    }
    if (settings.blueImages) {
      src = `${settings.installDirectory}textures/world_blue-2048.png`;
    }
    if (settings.vectorImages) {
      src = `${settings.installDirectory}textures/dayearthvector-4096.jpg`;
    }
    if (settings.politicalImages) {
      src = `${settings.installDirectory}textures/political8k-gray.jpg`;
    }
    if (settings.hiresImages) {
      src = `${settings.installDirectory}textures/earthmap16k.jpg`;
    }
    if (settings.hiresNoCloudsImages) {
      src = `${settings.installDirectory}textures/earthmap16k.jpg`;
    }

    return src;
  }

  /**
   * Determines the url to the high resolution night texture based on the settings.
   */
  private static getSrcHiResNight_(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('settings.installDirectory is undefined');
    }

    const quality = settings.earthNightTextureQuality;

    let src = `${settings.installDirectory}textures/earthlights${quality}.jpg`;

    if (settings.vectorImages) {
      src = `${settings.installDirectory}textures/dayearthvector-4096.jpg`;
    }
    if (settings.politicalImages) {
      src = `${settings.installDirectory}textures/political8k-gray-night.jpg`;
    }
    if (settings.hiresImages || settings.hiresNoCloudsImages) {
      src = `${settings.installDirectory}textures/earthlights16k.jpg`;
    }

    return src;
  }

  /**
   * Determines the url to the night texture based on the settings.
   */
  private static getSrcNight_(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('settings.installDirectory is undefined');
    }

    const src = `${settings.installDirectory}textures/earthlights512.jpg`;

    return src;
  }

  /**
   * Determines the url to the specular map based on the settings.
   */
  private static getSrcSpec_(settings: SettingsManager): string {
    if (!settings.installDirectory) {
      throw new Error('settings.installDirectory is undefined');
    }

    let src = `${settings.installDirectory}textures/earthspec8k.jpg`;

    if (settings.smallImages || settings.isMobileModeEnabled) {
      src = `${settings.installDirectory}textures/earthspec256.jpg`;
    }
    // if (settings.isMobileModeEnabled) src = `${settings.installDirectory}textures/earthspec4k.jpg`;

    return src;
  }

  /**
   * This is run once per frame to render a black earth in the GPU picking buffer.
   */
  private drawBlackGpuPickingEarth_() {
    const gl = Doris.getInstance().getRenderer().gl;
    const dotsManagerInstance = keepTrackApi.getDotsManager();

    // Switch to GPU Picking Shader
    gl.useProgram(dotsManagerInstance.programs.picking.program);
    // Switch to the GPU Picking Frame Buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, keepTrackApi.getDotsManager().gpuPickingFramebuffer);

    gl.bindVertexArray(this.vaoOcclusion_);

    gl.uniformMatrix4fv(dotsManagerInstance.programs.picking.uniforms.u_pMvviewMatrix, false, keepTrackApi.getMainCamera().projectionCameraMatrix);

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
        keepTrackApi.getDotsManager().PICKING_READ_PIXEL_BUFFER_SIZE,
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
    const gl = Doris.getInstance().getRenderer().gl;

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
    gl.uniformMatrix4fv(this.mesh.material.uniforms.projectionMatrix, false, keepTrackApi.getMainCamera().projectionCameraMatrix);
    gl.uniformMatrix4fv(this.mesh.material.uniforms.modelViewMatrix, false, this.node.transform.worldMatrix);
    gl.uniformMatrix3fv(this.mesh.material.uniforms.normalMatrix, false, this.normalMatrix_);
    gl.uniform3fv(this.mesh.material.uniforms.cameraPosition, this.lastCameraPosition_);

    gl.uniform1f(this.mesh.material.uniforms.uGlow, this.glowNumber_);
    gl.uniform3fv(this.mesh.material.uniforms.uLightDirection, this.lightDirection);
    gl.uniform1f(this.mesh.material.uniforms.uIsDrawAtmosphere, settingsManager.isDrawAtmosphere ? 1.0 : 0.0);
    gl.uniform1f(this.mesh.material.uniforms.uIsDrawAurora, settingsManager.isDrawAurora ? 1.0 : 0.0);
  }

  private async initTextures_(): Promise<void> {
    const gl = Doris.getInstance().getRenderer().gl;

    if (!this.textureDay || settingsManager.isBlackEarth) {
      this.textureDay = await GlUtils.initTexture(gl, Earth.getSrcDay_(settingsManager));
    }
    if (!this.textureNight || settingsManager.isBlackEarth) {
      this.textureNight = await GlUtils.initTexture(gl, Earth.getSrcNight_(settingsManager));
    }
    if (!this.textureBump_ || settingsManager.isBlackEarth) {
      this.textureBump_ = await GlUtils.initTexture(gl, Earth.getSrcBump_(settingsManager));
    }
    if (!this.textureSpec_ || settingsManager.isBlackEarth) {
      this.textureSpec_ = await GlUtils.initTexture(gl, Earth.getSrcSpec_(settingsManager));
    }
  }

  /**
   * This is run once per session to initialize the earth occulsion vao.
   */
  private initVaoOcclusion_() {
    const gl = Doris.getInstance().getRenderer().gl;
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
    const gl = Doris.getInstance().getRenderer().gl;

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
    gl.bindTexture(gl.TEXTURE_2D, this.textureDay);

    // Night Map
    gl.uniform1i(this.mesh.material.uniforms.uNightMap, 1);
    gl.activeTexture(gl.TEXTURE1);

    // Handle night texture binding with possible plugin override
    let nightTextureBound = false;

    if (Doris.getInstance().listenerCount(KeepTrackApiEvents.nightToggle) > 0) {
      Doris.getInstance().emit(
        KeepTrackApiEvents.nightToggle,
        gl,
        this.textureNight,
        this.textureDay,
      );

      nightTextureBound = true;
    }

    if (!nightTextureBound) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureNight);
    }

    // Bump Map
    gl.uniform1i(this.mesh.material.uniforms.uBumpMap, 2);
    gl.activeTexture(gl.TEXTURE2);
    if (settingsManager.isDrawBumpMap) {
      gl.bindTexture(gl.TEXTURE_2D, this.textureBump_);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, null);
    }

    // Specular Map
    gl.uniform1i(this.mesh.material.uniforms.uSpecMap, 3);
    gl.activeTexture(gl.TEXTURE3);
    if (settingsManager.isDrawSpecMap) {
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
  private readonly shaders_ = {
    frag: keepTrackApi.glsl`
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
