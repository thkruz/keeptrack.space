import { CatalogManager, SatCruncherMessageData, SatObject, Singletons, UserSettings } from '../interfaces';
import { GlUtils } from '../static/gl-utils';
/* eslint-disable camelcase */
/* eslint-disable no-useless-escape */
import { mat4 } from 'gl-matrix';
import { Kilometers } from 'ootk';
import { keepTrackContainer } from '../container';
import { CameraType, mainCameraInstance } from './camera';
import { StandardColorSchemeManager } from './color-scheme-manager';
import { DrawManager } from './draw-manager';

declare module '@app/js/interfaces' {
  interface SatShader {
    minSize: number;
    maxSize: number;
  }

  interface SatCruncherMessageData {
    satPos: Float32Array;
    satVel: Float32Array;
    satInView: Int8Array;
    satInSun: Int8Array;
  }
}

export class DotsManager {
  private isAlternateVelocity = false;
  private lastDrawDt = 0;
  public inViewData: Int8Array;
  public inSunData: Int8Array;
  // We draw the picking object bigger than the actual dot to make it easier to select objects
  // glsl code - keep as a string
  private pickingDotSize_ = '16.0'; // TODO: Move to settings file
  public isReady: boolean;
  private pickingColorData: number[] = []; // Array for which colors go to which ids
  private sizeBufferOneTime: any;
  public sizeData: Int8Array;
  public starIndex1: number;
  public starIndex2: number;
  public positionData: Float32Array;
  public velocityData: Float32Array;
  private satDataLenInDraw_: number;
  private orbitalSats3_: number;
  private drawI_: number;
  programs = {
    dots: {
      program: <WebGLProgram>null,
      attribs: {
        a_position: 0,
        a_color: 0,
        a_star: 0,
        a_pickable: 0,
      },
      uniforms: {
        u_pMvCamMatrix: <WebGLUniformLocation>null,
        u_minSize: <WebGLUniformLocation>null,
        u_maxSize: <WebGLUniformLocation>null,
      },
    },
    picking: {
      program: <WebGLProgram>null,
      attribs: {
        a_position: 0,
        a_color: 0,
        a_pickable: 0,
      },
      uniforms: {
        u_pMvCamMatrix: <WebGLUniformLocation>null,
        u_minSize: <WebGLUniformLocation>null,
        u_maxSize: <WebGLUniformLocation>null,
      },
    },
  };

  shaders_ = null;

  public pickingFrameBuffer: WebGLFramebuffer;
  public pickingTexture: WebGLTexture;
  public pickingRenderBuffer: WebGLRenderbuffer;
  public pickReadPixelBuffer: Uint8Array;
  private positionBufferOneTime_ = false;
  private settings_: UserSettings;
  public buffers = {
    position: <WebGLBuffer>null,
    size: <WebGLBuffer>null,
    color: <WebGLBuffer>null,
    pickability: <WebGLBuffer>null,
  };

  public pickingBuffers = {
    position: <WebGLBuffer>null,
    color: <WebGLBuffer>null,
    pickability: <WebGLBuffer>null,
  };

  init(settings: UserSettings) {
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    this.settings_ = settings;

    this.initShaders_();
    this.initProgram();

    // Make buffers for satellite positions and size -- color and pickability are created in ColorScheme class
    this.buffers.position = drawManagerInstance.gl.createBuffer();
    this.buffers.size = drawManagerInstance.gl.createBuffer();

    this.initProgramPicking();
  }

  /**
   * We need to share the color buffer between the color manager and the dots manager
   * TODO: colorManager should be part of dots manager
   */
  public initColorBuffer(colorBuffer: WebGLBuffer) {
    this.buffers.color = colorBuffer;
  }

  drawGpuPickingFrameBuffer(pMvCamMatrix: mat4, mouseX: number, mouseY: number) {
    if (!this.isReady || !settingsManager.cruncherReady) return;
    const colorSchemeManagerInstance = keepTrackContainer.get<StandardColorSchemeManager>(Singletons.ColorSchemeManager);
    if (!colorSchemeManagerInstance.colorBuffer) return;
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    const gl = drawManagerInstance.gl;

    gl.useProgram(this.programs.picking.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFrameBuffer);

    gl.uniformMatrix4fv(this.programs.picking.uniforms.u_pMvCamMatrix, false, pMvCamMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.vertexAttribPointer(this.programs.picking.attribs.a_position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.pickingBuffers.color);
    gl.enableVertexAttribArray(this.programs.picking.attribs.a_color);
    gl.vertexAttribPointer(this.programs.picking.attribs.a_color, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManagerInstance.pickableBuffer);
    gl.enableVertexAttribArray(this.programs.picking.attribs.a_pickable);
    gl.vertexAttribPointer(this.programs.picking.attribs.a_pickable, 1, gl.UNSIGNED_BYTE, false, 0, 0);

    // no reason to render 100000s of pixels when
    // we're only going to read one
    if (!settingsManager.isMobileModeEnabled) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(mouseX, gl.drawingBufferHeight - mouseY, 1, 1);
    }

    // Should not be relying on sizeData -- but temporary
    gl.drawArrays(gl.POINTS, 0, settingsManager.dotsOnScreen); // draw pick

    if (!settingsManager.isMobileModeEnabled) {
      gl.disable(gl.SCISSOR_TEST);
    }
  }

  draw(pMvCamMatrix: mat4, tgtBuffer: WebGLFramebuffer) {
    if (!this.isReady || !settingsManager.cruncherReady) return;
    const colorSchemeManagerInstance = keepTrackContainer.get<StandardColorSchemeManager>(Singletons.ColorSchemeManager);
    if (!colorSchemeManagerInstance.colorBuffer) return;
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    const gl = drawManagerInstance.gl;

    gl.useProgram(this.programs.dots.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    gl.uniformMatrix4fv(this.programs.dots.uniforms.u_pMvCamMatrix, false, pMvCamMatrix);

    if (mainCameraInstance.cameraType == CameraType.PLANETARIUM) {
      gl.uniform1f(this.programs.dots.uniforms.u_minSize, this.settings_.satShader.minSizePlanetarium);
      gl.uniform1f(this.programs.dots.uniforms.u_maxSize, this.settings_.satShader.maxSizePlanetarium);
    } else {
      gl.uniform1f(this.programs.dots.uniforms.u_minSize, this.settings_.satShader.minSize);
      gl.uniform1f(this.programs.dots.uniforms.u_maxSize, this.settings_.satShader.maxSize);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);

    // Buffering data here reduces the need to bind the buffer twice!

    // Either allocate and assign the data to the buffer
    if (!this.positionBufferOneTime_) {
      gl.bufferData(gl.ARRAY_BUFFER, this.positionData, gl.DYNAMIC_DRAW);
      this.positionBufferOneTime_ = true;
    } else {
      // Or just update it if we have already allocated it - the length won't change
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positionData);
    }

    gl.vertexAttribPointer(this.programs.dots.attribs.a_position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManagerInstance.colorBuffer);
    gl.enableVertexAttribArray(this.programs.dots.attribs.a_color);
    gl.vertexAttribPointer(this.programs.dots.attribs.a_color, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
    gl.enableVertexAttribArray(this.programs.dots.attribs.a_star);
    gl.vertexAttribPointer(this.programs.dots.attribs.a_star, 1, gl.UNSIGNED_BYTE, false, 0, 0);

    // DEBUG:
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.depthMask(false);

    // Should not be relying on sizeData -- but temporary
    gl.drawArrays(gl.POINTS, 0, settingsManager.dotsOnScreen);

    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // Draw GPU Picking Overlay -- This is what lets us pick a satellite
    this.drawGpuPickingFrameBuffer(pMvCamMatrix, mainCameraInstance.mouseX, mainCameraInstance.mouseY);
  }

  initProgram() {
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    const gl = drawManagerInstance.gl;
    this.programs.dots.program = GlUtils.createProgramFromCode(gl, this.shaders_.dots.vert, this.shaders_.dots.frag);
    gl.useProgram(this.programs.dots.program);

    GlUtils.assignAttributes(this.programs.dots.attribs, gl, this.programs.dots.program, ['a_position', 'a_color', 'a_star']);
    GlUtils.assignUniforms(this.programs.dots.uniforms, gl, this.programs.dots.program, ['u_minSize', 'u_maxSize', 'u_pMvCamMatrix']);
  }

  initProgramPicking() {
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    const gl = drawManagerInstance.gl;
    this.programs.picking.program = GlUtils.createProgramFromCode(gl, this.shaders_.picking.vert, this.shaders_.picking.frag);

    GlUtils.assignAttributes(this.programs.picking.attribs, gl, this.programs.picking.program, ['a_position', 'a_color', 'a_pickable']);
    GlUtils.assignUniforms(this.programs.picking.uniforms, gl, this.programs.picking.program, ['u_pMvCamMatrix']);

    this.pickingFrameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFrameBuffer);

    this.pickingTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.pickingTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    this.pickingRenderBuffer = gl.createRenderbuffer(); // create RB to store the depth buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickingRenderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickingTexture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickingRenderBuffer);

    this.pickReadPixelBuffer = new Uint8Array(4);
  }

  public getIdFromEci(eci: { x: number; y: number; z: number }, maxDots = this.positionData.length): number | null {
    let possibleMatches: { id: number; distance: number }[] = [];

    // loop through all the satellites
    for (let id = 0; id < maxDots; id++) {
      const x = this.positionData[id * 3];
      const y = this.positionData[id * 3 + 1];
      const z = this.positionData[id * 3 + 2];
      if (x > eci.x - 100 && x < eci.x + 100) {
        if (y > eci.y - 100 && y < eci.y + 100) {
          if (z > eci.z - 100 && z < eci.z + 100) {
            // if within 1km of the satellite, return it
            if (Math.sqrt((x - eci.x) ** 2 + (y - eci.y) ** 2 + (z - eci.z) ** 2) < 1) return id;

            // otherwise, add it to the list of possible matches
            possibleMatches.push({ id, distance: Math.sqrt((x - eci.x) ** 2 + (y - eci.y) ** 2 + (z - eci.z) ** 2) });
          }
        }
      }
    }

    // if there are possible matches, return the closest one
    if (possibleMatches.length > 0) {
      possibleMatches.sort((a, b) => a.distance - b.distance);
      return possibleMatches[0].id;
    }

    return null;
  }

  private initShaders_() {
    this.shaders_ = {
      dots: {
        frag: `#version 300 es
            precision mediump float;

            in vec4 vColor;
            in float vStar;
            in float vDist;

            out vec4 fragColor;

            float when_lt(float x, float y) {
            return max(sign(y - x), 0.0);
            }
            float when_ge(float x, float y) {
            return 1.0 - when_lt(x, y);
            }

            void main(void) {

            vec2 ptCoord = gl_PointCoord * 2.0 - vec2(1.0, 1.0);
            float r = 0.0;
            float alpha = 0.0;
            // If not a star and not on the ground
            r += (${settingsManager.satShader.blurFactor1} - min(abs(length(ptCoord)), 1.0)) * when_lt(vDist, 200000.0) * when_ge(vDist, 6421.0);
            alpha += (2.0 * r + ${settingsManager.satShader.blurFactor2}) * when_lt(vDist, 200000.0) * when_ge(vDist, 6421.0);

            // If on the ground
            r += (${settingsManager.satShader.blurFactor1} - min(abs(length(ptCoord)), 1.0)) * when_lt(vDist, 6421.0);
            alpha += (2.0 * r + ${settingsManager.satShader.blurFactor2}) * when_lt(vDist, 6471.0);

            // If a star
            r += (${settingsManager.satShader.blurFactor3} - min(abs(length(ptCoord)), 1.0)) * when_ge(vDist, 200000.0);
            alpha += (2.0 * r - ${settingsManager.satShader.blurFactor4}) * when_ge(vDist, 200000.0);

            alpha = min(alpha, 1.0);
            if (alpha == 0.0) discard;
            fragColor = vec4(vColor.rgb, vColor.a * alpha);

            // Reduce Flickering from Depth Fighting
            gl_FragDepth = gl_FragCoord.z * 0.99999975;
            }
          `,
        vert: `#version 300 es
          in vec3 a_position;
          in vec4 a_color;
          in float a_star;

          uniform float u_minSize;
          uniform float u_maxSize;

          uniform mat4 u_pMvCamMatrix;

          out vec4 vColor;
          out float vStar;
          out float vDist;

          float when_lt(float x, float y) {
              return max(sign(y - x), 0.0);
          }
          float when_ge(float x, float y) {
              return 1.0 - when_lt(x, y);
          }

          void main(void) {
              vec4 position = u_pMvCamMatrix * vec4(a_position, 1.0);
              float drawSize = 0.0;
              float dist = distance(vec3(0.0, 0.0, 0.0),a_position.xyz);

              // Satellite
              drawSize +=
              when_lt(a_star, 0.5) *
              (min(max(pow(${settingsManager.satShader.distanceBeforeGrow} \/ position.z, 2.1), u_minSize * 0.9), u_maxSize) * 1.0);

              // Something on the ground
              drawSize +=
              when_ge(a_star, 0.5) * when_lt(dist, 6421.0) *
              (min(max(pow(${settingsManager.satShader.distanceBeforeGrow} \/ position.z, 2.1), u_minSize * 0.75), u_maxSize) * 1.0);

              // Star or Searched Object
              drawSize +=
              when_ge(a_star, 0.5) * when_ge(dist, 6421.0) *
              (min(max(${settingsManager.satShader.starSize} * 100000.0 \/ dist, ${settingsManager.satShader.starSize}),${settingsManager.satShader.starSize} * 1.0));

              gl_PointSize = drawSize;
              gl_Position = position;
              vColor = a_color;
              vStar = a_star * 1.0;
              vDist = dist;
          }
        `,
      },
      picking: {
        vert: `#version 300 es
                in vec3 a_position;
                in vec3 a_color;
                in float a_pickable;

                uniform mat4 u_pMvCamMatrix;

                out vec3 vColor;

                void main(void) {
                vec4 position = u_pMvCamMatrix * vec4(a_position, 1.0);
                gl_Position = position;
                gl_PointSize = ${this.pickingDotSize_} * a_pickable;
                vColor = a_color * a_pickable;
                }
            `,
        frag: `#version 300 es
                precision mediump float;

                in vec3 vColor;

                out vec4 fragColor;

                void main(void) {
                    fragColor = vec4(vColor, 1.0);
                }
            `,
      },
    };
  }

  getCurrentPosition(i: number) {
    return {
      x: <Kilometers>this.positionData[i * 3],
      y: <Kilometers>this.positionData[i * 3 + 1],
      z: <Kilometers>this.positionData[i * 3 + 2],
    };
  }

  updatePositionBuffer() {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const satSetLen = catalogManagerInstance.satData.length;
    const selectedSat = catalogManagerInstance.selectedSat;
    // Don't update positions until positionCruncher finishes its first loop and creates data in position and velocity data arrays
    if (!this.positionData || !this.velocityData) {
      return;
    }

    /*
      // If we have radar data -- let's update that first
      if (catalogManagerInstance.radarDataManager.radarData.length > 0) {
        // Get Time
        if (timeManager.propRate === 0) {
          timeManager.simulationTimeObj.setTime(Number(timeManager.dynamicOffsetEpoch) + timeManager.propOffset);
        } else {
          timeManager.simulationTimeObj.setTime(Number(timeManager.dynamicOffsetEpoch) + timeManager.propOffset + (Number(timeManager.realTime) - Number(timeManager.dynamicOffsetEpoch)) * timeManager.propRate);
        }
        drawPropTime = timeManager.simulationTimeObj * 1;

      // DEBUG:
      // Find the First Radar Return Time
      if (catalogManagerInstance.radarDataManager.drawT1 == 0) {
        for (rrI = 0; rrI < radarDataLen; rrI++) {
          if (catalogManagerInstance.radarDataManager.radarData[rrI].t > timeManager.realTime - 3000) {
            catalogManagerInstance.radarDataManager.drawT1 = rrI;
            break;
          }
        }
      }

      isDidOnce = false;
      for (this.drawI = catalogManagerInstance.radarDataManager.drawT1; this.drawI < radarDataLen; this.drawI++) {
        // Don't Exceed Max Radar Data Allocation
        // if (this.drawI > settingsManager.maxRadarData) break;

        if (catalogManagerInstance.radarDataManager.radarData[this.drawI].t >= drawPropTime - 3000 && catalogManagerInstance.radarDataManager.radarData[this.drawI].t <= drawPropTime + 3000) {
          if (!isDidOnce) {
            catalogManagerInstance.radarDataManager.drawT1 = this.drawI;
            isDidOnce = true;
          }
          // Skip if Already done
          if (this.positionData[(catalogManagerInstance.radarDataManager.satDataStartIndex + this.drawI) * 3] !== 0) continue;

          // Update Radar Marker Position
          this.positionData[(catalogManagerInstance.radarDataManager.satDataStartIndex + this.drawI) * 3] = catalogManagerInstance.radarDataManager.radarData[this.drawI].x;
          this.positionData[(catalogManagerInstance.radarDataManager.satDataStartIndex + this.drawI) * 3 + 1] = catalogManagerInstance.radarDataManager.radarData[this.drawI].y;
          this.positionData[(catalogManagerInstance.radarDataManager.satDataStartIndex + this.drawI) * 3 + 2] = catalogManagerInstance.radarDataManager.radarData[this.drawI].z;
          // NOTE: satVel could be added later
        } else {
          // Reset all positions outside time window
          this.positionData[(catalogManagerInstance.radarDataManager.satDataStartIndex + this.drawI) * 3] = 0;
          this.positionData[(catalogManagerInstance.radarDataManager.satDataStartIndex + this.drawI) * 3 + 1] = 0;
          this.positionData[(catalogManagerInstance.radarDataManager.satDataStartIndex + this.drawI) * 3 + 2] = 0;
        }

        if (catalogManagerInstance.radarDataManager.radarData[this.drawI].t > drawPropTime + 3000) {
          break;
        }
      }
    */
    this.satDataLenInDraw_ = satSetLen;
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    if (!settingsManager.lowPerf && drawManagerInstance.dtAdjusted > settingsManager.minimumDrawDt) {
      // Don't Interpolate Static Objects
      this.satDataLenInDraw_ -= settingsManager.maxFieldOfViewMarkers + settingsManager.maxRadarData;
      // Flat Array of X, Y, and Z so times by 3
      this.satDataLenInDraw_ = this.satDataLenInDraw_ * 3;
      // Do we want to treat non-satellites different?
      this.orbitalSats3_ = catalogManagerInstance.orbitalSats * 3;

      // Interpolate position since last draw by adding the velocity
      // NOTE: We were using satDataLenInDraw3 but markers don't have velocity and neither do missiles (3 DOF as of 7/4/2022)
      if (this.isAlternateVelocity) {
        // Update half of the positions based on velocity
        for (this.drawI_ = 0; this.drawI_ < Math.ceil(this.orbitalSats3_ / 2); this.drawI_++) {
          this.positionData[this.drawI_] += this.velocityData[this.drawI_] * (drawManagerInstance.dtAdjusted + this.lastDrawDt);
        }
        // If you updated the selected sat, undo it
        if (selectedSat * 3 < Math.ceil(this.orbitalSats3_ / 2)) {
          this.positionData[selectedSat * 3] -= this.velocityData[selectedSat * 3] * (drawManagerInstance.dtAdjusted + this.lastDrawDt);
          this.positionData[selectedSat * 3 + 1] -= this.velocityData[selectedSat * 3 + 1] * (drawManagerInstance.dtAdjusted + this.lastDrawDt);
          this.positionData[selectedSat * 3 + 2] -= this.velocityData[selectedSat * 3 + 2] * (drawManagerInstance.dtAdjusted + this.lastDrawDt);
        }
        this.isAlternateVelocity = false;
        this.lastDrawDt = drawManagerInstance.dtAdjusted;
      } else {
        // Update half of the positions based on velocity
        for (this.drawI_ = Math.floor(this.orbitalSats3_ / 2); this.drawI_ < this.orbitalSats3_; this.drawI_++) {
          this.positionData[this.drawI_] += this.velocityData[this.drawI_] * (drawManagerInstance.dtAdjusted + this.lastDrawDt);
        }
        // If you updated the selected sat, undo it
        if (selectedSat * 3 >= Math.floor(this.orbitalSats3_ / 2)) {
          this.positionData[selectedSat * 3] -= this.velocityData[selectedSat * 3] * (drawManagerInstance.dtAdjusted + this.lastDrawDt);
          this.positionData[selectedSat * 3 + 1] -= this.velocityData[selectedSat * 3 + 1] * (drawManagerInstance.dtAdjusted + this.lastDrawDt);
          this.positionData[selectedSat * 3 + 2] -= this.velocityData[selectedSat * 3 + 2] * (drawManagerInstance.dtAdjusted + this.lastDrawDt);
        }
        this.isAlternateVelocity = true;
        this.lastDrawDt = drawManagerInstance.dtAdjusted;
      }

      // Always do the selected satellite in the most accurate way
      this.positionData[selectedSat * 3] += this.velocityData[selectedSat * 3] * drawManagerInstance.dtAdjusted;
      this.positionData[selectedSat * 3 + 1] += this.velocityData[selectedSat * 3 + 1] * drawManagerInstance.dtAdjusted;
      this.positionData[selectedSat * 3 + 2] += this.velocityData[selectedSat * 3 + 2] * drawManagerInstance.dtAdjusted;

      // TODO: WebWorker for this?
      // const { gmst } = calculateTimeVariables(timeManager.simulationTimeObj);
      // catalogManagerInstance.staticSet
      //   .filter((object) => object.static && !object.marker && object.type !== SpaceObjectType.STAR)
      //   .forEach((object) => {
      //     const cosLat = Math.cos(object.lat * DEG2RAD);
      //     const sinLat = Math.sin(object.lat * DEG2RAD);
      //     const cosLon = Math.cos(object.lon * DEG2RAD + gmst);
      //     const sinLon = Math.sin(object.lon * DEG2RAD + gmst);
      //     this.positionData[object.id * 3] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + object.alt) * cosLat * cosLon; // 6371 is radius of earth
      //     this.positionData[object.id * 3 + 1] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + object.alt) * cosLat * sinLon;
      //     this.positionData[object.id * 3 + 2] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + object.alt) * sinLat;
      //   });
    }
  }

  /**
   * Updates the size buffer used for rendering the dots.
   * @param bufferLen The length of the buffer.
   * @param selectedSat The index of the selected satellite.
   */
  updateSizeBuffer(bufferLen: number = 3, selectedSat: number = -1) {
    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    const gl = drawManagerInstance.gl;

    if (!this.sizeBufferOneTime) {
      this.sizeData = new Int8Array(bufferLen);
    }

    // This has to happen first because it resets things to 0
    for (let i = 0; i < bufferLen; i++) {
      // Stars are always bigger
      if (i >= this.starIndex1 && i <= this.starIndex1) {
        this.sizeData[i] = 1.0;
      } else {
        this.sizeData[i] = 0.0;
      }
    }

    if (selectedSat !== -1) {
      this.sizeData[selectedSat] = 1.0;
    }

    // Pretend Satellites that are currently being searched are stars
    // The shaders will display these "stars" like close satellites
    // because the distance from the center of the earth is too close to
    // be a star. dotsManager method is so there are less buffers needed but as
    // computers get faster it should be replaced
    for (const lastSearchResult of settingsManager.lastSearchResults) {
      this.sizeData[lastSearchResult] = 1.0;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
    if (!this.sizeBufferOneTime) {
      gl.bufferData(gl.ARRAY_BUFFER, this.sizeData, gl.DYNAMIC_DRAW);
      this.sizeBufferOneTime = true;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.sizeData);
    }
  }

  /**
   * Initializes the buffers required for rendering the dots and picking.
   * @param colorBuffer The color buffer to be shared between the color manager and the dots manager.
   */
  initBuffers(colorBuffer: WebGLBuffer) {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    this.setupPickingBuffer(catalogManagerInstance.satData.length);
    this.updateSizeBuffer(catalogManagerInstance.satData.length, catalogManagerInstance.selectedSat);
    this.initColorBuffer(colorBuffer);
  }

  /**
   * Sets up the picking buffer with colors assigned to ids in hex order.
   * @param satDataLen The length of the satellite data.
   */
  setupPickingBuffer(satDataLen = 1): void {
    // assign colors to ids in hex order
    let byteR: number, byteG: number, byteB: number; // reuse color variables
    for (let i = 0; i < satDataLen; i++) {
      byteR = (i + 1) & 0xff;
      byteG = ((i + 1) & 0xff00) >> 8;
      byteB = ((i + 1) & 0xff0000) >> 16;

      // Normalize colors to 1 and flatten them
      this.pickingColorData.push(byteR / 255.0);
      this.pickingColorData.push(byteG / 255.0);
      this.pickingColorData.push(byteB / 255.0);
    }

    const drawManagerInstance = keepTrackContainer.get<DrawManager>(Singletons.DrawManager);
    this.pickingBuffers.color = GlUtils.createArrayBuffer(drawManagerInstance.gl, new Float32Array(this.pickingColorData));
  }

  /**
   * Updates the position and velocity of a satellite object based on the data stored in the `positionData` and `velocityData` arrays.
   * @param sat The satellite object to update.
   * @param i The index of the satellite in the `positionData` and `velocityData` arrays.
   */
  public updatePosVel(sat: SatObject, i: number): void {
    if (!this.velocityData) return;

    sat.velocity = { total: 0, x: 0, y: 0, z: 0 };

    sat.velocity.x = this.velocityData[i * 3] || 0;
    sat.velocity.y = this.velocityData[i * 3 + 1] || 0;
    sat.velocity.z = this.velocityData[i * 3 + 2] || 0;
    sat.velocity.total = Math.sqrt(sat.velocity.x ** 2 + sat.velocity.y ** 2 + sat.velocity.z ** 2);
    sat.position = {
      x: <Kilometers>this.positionData[i * 3],
      y: <Kilometers>this.positionData[i * 3 + 1],
      z: <Kilometers>this.positionData[i * 3 + 2],
    };
  }

  /**
   * Updates the position, velocity, in-view and in-sun data buffers with the data received from the SatCruncher worker.
   * @param mData The data received from the SatCruncher worker.
   */
  public updateCruncherBuffers(mData: SatCruncherMessageData) {
    if (mData.satPos) {
      if (typeof this.positionData == 'undefined') {
        this.positionData = new Float32Array(mData.satPos);
        this.isReady = true;
      } else {
        this.positionData.set(mData.satPos, 0);
      }
    }

    if (mData.satVel) {
      if (typeof this.velocityData == 'undefined') {
        this.velocityData = new Float32Array(mData.satVel);
      } else {
        this.velocityData.set(mData.satVel, 0);
      }
    }

    if (mData.satInView?.length > 0) {
      if (typeof this.inViewData == 'undefined' || this.inViewData.length !== mData.satInView.length) {
        this.inViewData = new Int8Array(mData.satInView);
      } else {
        this.inViewData.set(mData.satInView, 0);
      }
    }

    if (mData.satInSun?.length > 0) {
      if (typeof this.inSunData == 'undefined' || this.inSunData.length !== mData.satInSun.length) {
        this.inSunData = new Int8Array(mData.satInSun);
      } else {
        this.inSunData.set(mData.satInSun, 0);
      }
    }
  }

  public getSatVel() {
    return this.velocityData ? this.velocityData : new Float32Array();
  }

  public getSatInView() {
    return this.inViewData ? this.inViewData : new Int8Array();
  }

  public getSatInSun() {
    return this.inSunData ? this.inSunData : new Int8Array();
  }

  public resetSatInView() {
    this.inViewData = new Int8Array(this.inViewData.length);
    this.inViewData.fill(0);
  }

  public resetSatInSun() {
    this.inSunData = new Int8Array(this.inSunData.length);
    this.inSunData.fill(0);
  }
}
