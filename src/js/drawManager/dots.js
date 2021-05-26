/* eslint-disable no-useless-escape */
import * as glm from '@app/js/lib/external/gl-matrix.js';
import { mat4 } from 'gl-matrix';

class Dots {
  constructor(gl) {
    // We draw the picking object bigger than the actual dot to make it easier to select objects
    // glsl code - keep as a string
    this.pickingDotSize = '16.0';

    // This is so you don't have to pass references so often -- bad? not sure
    this.gl = gl;

    // Make this so we don't have to recreate it
    this.emptyMat4 = glm.mat4.create();

    // Create our shaders using the strings from settingsManager
    this.setupShaders();

    // Create a program for drawing the dots and setup its attributes/uniforms
    this.createDrawProgram(gl);
    // Create a program for drawing pickable dots and setup its attributes/uniforms
    this.createPickingProgram(gl);

    // Make buffers for satellite positions and size -- color and pickability are created in ColorScheme class
    this.positionBuffer = gl.createBuffer();
    this.sizeBuffer = gl.createBuffer();

    this.loaded = true;
  }

  updatePMvCamMatrix = (pMatrix, cameraManager) => {
    this.pMvCamMatrix = glm.mat4.create();
    mat4.mul(this.pMvCamMatrix, this.pMvCamMatrix, pMatrix);
    mat4.mul(this.pMvCamMatrix, this.pMvCamMatrix, cameraManager.camMatrix);
  };

  // eslint-disable-next-line class-methods-use-this
  draw(pMatrix, cameraManager, colorScheme, tgtBuffer) {
    if (!this.loaded || !settingsManager.cruncherReady) return;
    const gl = this.gl;

    gl.useProgram(this.drawProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    gl.uniformMatrix4fv(this.drawProgram.pMvCamMatrix, false, this.pMvCamMatrix);

    if (cameraManager.cameraType.current == cameraManager.cameraType.planetarium) {
      gl.uniform1f(this.drawProgram.minSize, settingsManager.satShader.minSizePlanetarium);
      gl.uniform1f(this.drawProgram.maxSize, settingsManager.satShader.maxSizePlanetarium);
    } else {
      gl.uniform1f(this.drawProgram.minSize, settingsManager.satShader.minSize);
      gl.uniform1f(this.drawProgram.maxSize, settingsManager.satShader.maxSize);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

    // Buffering data here reduces the need to bind the buffer twice!

    // Either allocate and assign the data to the buffer
    if (!this.positionBufferOneTime) {
      gl.bufferData(gl.ARRAY_BUFFER, this.positionData, gl.DYNAMIC_DRAW);
      this.positionBufferOneTime = true;
    } else {
      // Or just update it if we have already allocated it - the length won't change
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positionData);
    }

    gl.vertexAttribPointer(this.drawProgram.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorScheme.colorBuffer);
    gl.enableVertexAttribArray(this.drawProgram.aColor);
    gl.vertexAttribPointer(this.drawProgram.aColor, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
    gl.enableVertexAttribArray(this.drawProgram.aStar);
    gl.vertexAttribPointer(this.drawProgram.aStar, 1, gl.FLOAT, false, 0, 0);

    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.depthMask(false);

    // Should not be relying on sizeData -- but temporary
    gl.drawArrays(gl.POINTS, 0, settingsManager.dotsOnScreen);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  // eslint-disable-next-line class-methods-use-this
  drawGpuPickingFrameBuffer(pMatrix, cameraManager, colorScheme) {
    if (!this.loaded || !settingsManager.cruncherReady) return;
    const gl = this.gl;

    gl.useProgram(this.pickingProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFrameBuffer);

    gl.uniformMatrix4fv(this.pickingProgram.pMvCamMatrix, false, this.pMvCamMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(this.drawProgram.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.pickingColorBuffer);
    gl.enableVertexAttribArray(this.pickingProgram.aColor);
    gl.vertexAttribPointer(this.pickingProgram.aColor, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorScheme.pickableBuffer);
    gl.enableVertexAttribArray(this.pickingProgram.aPickable);
    gl.vertexAttribPointer(this.pickingProgram.aPickable, 1, gl.FLOAT, false, 0, 0);

    // no reason to render 100000s of pixels when
    // we're only going to read one
    if (!settingsManager.isMobileModeEnabled) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(cameraManager.mouseX, gl.drawingBufferHeight - cameraManager.mouseY, 1, 1);
    }

    // Should not be relying on sizeData -- but temporary
    gl.drawArrays(gl.POINTS, 0, settingsManager.dotsOnScreen); // draw pick

    if (!settingsManager.isMobileModeEnabled) {
      gl.disable(gl.SCISSOR_TEST);
    }
  }

  setupShaders() {
    this.drawShaderCode = {
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
        in vec3 aPos;
        in vec4 aColor;
        in float aStar;

        uniform float minSize;
        uniform float maxSize;

        uniform mat4 pMvCamMatrix;

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
            vec4 position = pMvCamMatrix * vec4(aPos, 1.0);
            float drawSize = 0.0;
            float dist = distance(vec3(0.0, 0.0, 0.0),aPos.xyz);

            // Satellite
            drawSize +=
            when_lt(aStar, 0.5) *
            (min(max(pow(${settingsManager.satShader.distanceBeforeGrow} \/ position.z, 2.1), minSize * 0.9), maxSize) * 1.0);

            // Something on the ground
            drawSize +=
            when_ge(aStar, 0.5) * when_lt(dist, 6421.0) *
            (min(max(pow(${settingsManager.satShader.distanceBeforeGrow} \/ position.z, 2.1), minSize * 0.75), maxSize) * 1.0);

            // Star or Searched Object
            drawSize +=
            when_ge(aStar, 0.5) * when_ge(dist, 6421.0) *
            (min(max(${settingsManager.satShader.starSize} * 100000.0 \/ dist, ${settingsManager.satShader.starSize}),${settingsManager.satShader.starSize} * 1.0));

            gl_PointSize = drawSize;
            gl_Position = position;
            vColor = aColor;
            vStar = aStar * 1.0;
            vDist = dist;
        }
      `,
    };
    this.pickingShaderCode = {
      vert: `#version 300 es
              in vec3 aPos;
              in vec3 aColor;
              in float aPickable;
      
              uniform mat4 pMvCamMatrix;
      
              out vec3 vColor;
      
              void main(void) {
              vec4 position = pMvCamMatrix * vec4(aPos, 1.0);
              gl_Position = position;
              gl_PointSize = ${this.pickingDotSize} * aPickable;
              vColor = aColor * aPickable;
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
    };
  }

  createDrawProgram(gl) {
    this.drawProgram = gl.createProgram();

    this.drawProgram.vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(this.drawProgram.vertShader, this.drawShaderCode.vert);
    gl.compileShader(this.drawProgram.vertShader);

    this.drawProgram.fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(this.drawProgram.fragShader, this.drawShaderCode.frag);
    gl.compileShader(this.drawProgram.fragShader);

    gl.attachShader(this.drawProgram, this.drawProgram.vertShader);
    gl.attachShader(this.drawProgram, this.drawProgram.fragShader);
    gl.linkProgram(this.drawProgram);

    if (!gl.getProgramParameter(this.drawProgram, gl.LINK_STATUS)) {
      var info = gl.getProgramInfoLog(this.drawProgram);
      throw new Error('Could not compile WebGL program. \n\n' + info);
    }

    this.drawProgram.aPos = gl.getAttribLocation(this.drawProgram, 'aPos');
    this.drawProgram.aColor = gl.getAttribLocation(this.drawProgram, 'aColor');
    this.drawProgram.aStar = gl.getAttribLocation(this.drawProgram, 'aStar');
    this.drawProgram.minSize = gl.getUniformLocation(this.drawProgram, 'minSize');
    this.drawProgram.maxSize = gl.getUniformLocation(this.drawProgram, 'maxSize');
    this.drawProgram.pMvCamMatrix = gl.getUniformLocation(this.drawProgram, 'pMvCamMatrix');
  }

  createPickingProgram(gl) {
    this.pickingProgram = gl.createProgram();

    this.pickingProgram.vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(this.pickingProgram.vertShader, this.pickingShaderCode.vert);
    gl.compileShader(this.pickingProgram.vertShader);

    this.pickingProgram.fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(this.pickingProgram.fragShader, this.pickingShaderCode.frag);
    gl.compileShader(this.pickingProgram.fragShader);

    gl.attachShader(this.pickingProgram, this.pickingProgram.vertShader);
    gl.attachShader(this.pickingProgram, this.pickingProgram.fragShader);
    gl.linkProgram(this.pickingProgram);

    this.pickingProgram.aPos = gl.getAttribLocation(this.pickingProgram, 'aPos');
    this.pickingProgram.aColor = gl.getAttribLocation(this.pickingProgram, 'aColor');
    this.pickingProgram.aPickable = gl.getAttribLocation(this.pickingProgram, 'aPickable');
    this.pickingProgram.pMvCamMatrix = gl.getUniformLocation(this.pickingProgram, 'pMvCamMatrix');

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

  // eslint-disable-next-line class-methods-use-this
  updatePositionBuffer(satSetLen, orbitalSats, timeManager) {
    // Don't update positions until positionCruncher finishes its first loop and creates data in position and velocity data arrays
    if (!this.positionData || !this.velocityData) return;

    // If we have radar data -- let's update that first
    // if (satSet.radarDataManager.radarData.length > 0) {
    //   // Get Time
    //   if (timeManager.propRate === 0) {
    //     timeManager.propTimeVar.setTime(Number(timeManager.propRealTime) + timeManager.propOffset);
    //   } else {
    //     timeManager.propTimeVar.setTime(Number(timeManager.propRealTime) + timeManager.propOffset + (Number(timeManager.now) - Number(timeManager.propRealTime)) * timeManager.propRate);
    //   }
    //   drawPropTime = timeManager.propTimeVar * 1;

    //   // Find the First Radar Return Time
    //   if (satSet.radarDataManager.drawT1 == 0) {
    //     for (rrI = 0; rrI < radarDataLen; rrI++) {
    //       if (satSet.radarDataManager.radarData[rrI].t > timeManager.now - 3000) {
    //         satSet.radarDataManager.drawT1 = rrI;
    //         break;
    //       }
    //     }
    //   }

    //   isDidOnce = false;
    //   for (this.drawI = satSet.radarDataManager.drawT1; this.drawI < radarDataLen; this.drawI++) {
    //     // Don't Exceed Max Radar Data Allocation
    //     // if (this.drawI > settingsManager.maxRadarData) break;

    //     if (satSet.radarDataManager.radarData[this.drawI].t >= drawPropTime - 3000 && satSet.radarDataManager.radarData[this.drawI].t <= drawPropTime + 3000) {
    //       if (!isDidOnce) {
    //         satSet.radarDataManager.drawT1 = this.drawI;
    //         isDidOnce = true;
    //       }
    //       // Skip if Already done
    //       if (this.positionData[(satSet.radarDataManager.satDataStartIndex + this.drawI) * 3] !== 0) continue;

    //       // Update Radar Marker Position
    //       this.positionData[(satSet.radarDataManager.satDataStartIndex + this.drawI) * 3] = satSet.radarDataManager.radarData[this.drawI].x;
    //       this.positionData[(satSet.radarDataManager.satDataStartIndex + this.drawI) * 3 + 1] = satSet.radarDataManager.radarData[this.drawI].y;
    //       this.positionData[(satSet.radarDataManager.satDataStartIndex + this.drawI) * 3 + 2] = satSet.radarDataManager.radarData[this.drawI].z;
    //       // NOTE: satVel could be added later
    //     } else {
    //       // Reset all positions outside time window
    //       this.positionData[(satSet.radarDataManager.satDataStartIndex + this.drawI) * 3] = 0;
    //       this.positionData[(satSet.radarDataManager.satDataStartIndex + this.drawI) * 3 + 1] = 0;
    //       this.positionData[(satSet.radarDataManager.satDataStartIndex + this.drawI) * 3 + 2] = 0;
    //     }

    //     if (satSet.radarDataManager.radarData[this.drawI].t > drawPropTime + 3000) {
    //       break;
    //     }
    //   }
    // }

    this.drawDivisor = Math.max(timeManager.propRate, 0.001);
    timeManager.setDrawDt(Math.min(timeManager.dt / 1000.0, 1.0 / this.drawDivisor));
    // Skip Velocity Math if FPS is hurting
    // 1000 / dt = fps
    if (1000 / timeManager.dt > settingsManager.fpsThrottle2) {
      timeManager.setDrawDt(timeManager.drawDt * timeManager.propRate); // Adjust drawDt correspond to the propagation rate
      this.satDataLenInDraw = satSetLen;
      if (!settingsManager.lowPerf && timeManager.drawDt > settingsManager.minimumDrawDt) {
        // Don't Interpolate Static Objects
        this.satDataLenInDraw -= settingsManager.maxFieldOfViewMarkers + settingsManager.maxRadarData;
        // Flat Array of X, Y, and Z so times by 3
        this.satDataLenInDraw3 = this.satDataLenInDraw * 3;
        // Do we want to treat non-satellites different?
        this.orbitalSats3 = orbitalSats * 3;

        // Interpolate position since last draw by adding the velocity
        for (this.drawI = 0; this.drawI < this.satDataLenInDraw3; this.drawI++) {
          if (this.drawI > this.orbitalSats3) {
            this.positionData[this.drawI] += this.velocityData[this.drawI] * timeManager.drawDt;
          } else {
            this.positionData[this.drawI] += this.velocityData[this.drawI] * timeManager.drawDt;
          }
        }
      }
    }
  }

  updateSizeBuffer(satData) {
    const gl = this.gl;
    if (!this.sizeBufferOneTime) {
      this.sizeData = new Float32Array(satData.length);
    }

    for (let i = 0; i < satData.length; i++) {
      // Stars are always bigger
      if (i >= this.starIndex1 && i <= this.starIndex2) {
        this.sizeData[i] = 1.0;
      } else {
        this.sizeData[i] = 0.0;
      }
    }
    // Pretend Satellites that are currently being searched are stars
    // The shaders will display these "stars" like close satellites
    // because the distance from the center of the earth is too close to
    // be a star. This method is so there are less buffers needed but as
    // computers get faster it should be replaced
    for (let i = 0; i < settingsManager.lastSearchResults.length; i++) {
      this.sizeData[settingsManager.lastSearchResults[i]] = 1.0;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
    if (!this.sizeBufferOneTime) {
      gl.bufferData(gl.ARRAY_BUFFER, this.sizeData, gl.DYNAMIC_DRAW);
      this.sizeBufferOneTime = true;
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.sizeData);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  setupPickingBuffer(satData) {
    const gl = this.gl;

    // Array for which colors go to which ids
    this.pickingColorData = [];
    // Make a buffer
    this.pickingColorBuffer = gl.createBuffer();

    // loop assinging random colors to ids
    let byteR, byteG, byteB; // reuse color variables
    for (let i = 0; i < satData.length; i++) {
      byteR = (i + 1) & 0xff;
      byteG = ((i + 1) & 0xff00) >> 8;
      byteB = ((i + 1) & 0xff0000) >> 16;

      // Normalize colors to 1 and flatten them
      this.pickingColorData.push(byteR / 255.0);
      this.pickingColorData.push(byteG / 255.0);
      this.pickingColorData.push(byteB / 255.0);
    }

    // Switch to the pick buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pickingColorBuffer);

    // Setup the colorpicking data -- this doesnt change
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.pickingColorData), gl.STATIC_DRAW);
  }
}

/*
  // Note: This won't work as is but is kept as a reference
  satSet.changeShaders = (newShaders) => {
    gl.detachShader(this.drawProgram, vertShader);
    gl.detachShader(this.drawProgram, fragShader);
    switch (newShaders) {
      case 'var':
        gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex-var.glsl'));
        break;
      case 12:
        gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex-12.glsl'));
        break;
      case 6:
        gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex-6.glsl'));
        break;
      case 2:
        gl.shaderSource(vertShader, shaderLoader.getShaderCode('dot-vertex-2.glsl'));
        break;
    }
    gl.compileShader(vertShader);

    gl.shaderSource(fragShader, shaderLoader.getShaderCode('dot-fragment.glsl'));
    gl.compileShader(fragShader);

    gl.attachShader(this.drawProgram, vertShader);
    gl.attachShader(this.drawProgram, fragShader);
    gl.linkProgram(this.drawProgram);
    this.drawProgram.aPos = gl.getAttribLocation(this.drawProgram, 'aPos');
    this.drawProgram.aColor = gl.getAttribLocation(this.drawProgram, 'aColor');
    this.drawProgram.aStar = gl.getAttribLocation(this.drawProgram, 'aStar');
    this.drawProgram.minSize = gl.getUniformLocation(this.drawProgram, 'minSize');
    this.drawProgram.maxSize = gl.getUniformLocation(this.drawProgram, 'maxSize');
    this.drawProgram.uMvMatrix = gl.getUniformLocation(this.drawProgram, 'uMvMatrix');
    this.drawProgram.uCamMatrix = gl.getUniformLocation(this.drawProgram, 'uCamMatrix');
    this.drawProgram.pMvCamMatrix = gl.getUniformLocation(this.drawProgram, 'pMvCamMatrix');
  };
*/

export { Dots };
