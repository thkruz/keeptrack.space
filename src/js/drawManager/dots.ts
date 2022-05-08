/* eslint-disable no-useless-escape */
import * as glm from 'gl-matrix';
import { Camera, DotsManager, DrawProgram, PickingProgram, TimeManager } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';
import { ColorSchemeManager } from '../colorManager/colorSchemeManager';
import { DEG2RAD, GROUND_BUFFER_DISTANCE, RADIUS_OF_EARTH } from '../lib/constants';
import { objectManager } from '../objectManager/objectManager';
import { calculateTimeVariables } from '../satMath/satMath';

export const init = (gl: WebGL2RenderingContext) => {
  // We draw the picking object bigger than the actual dot to make it easier to select objects
  // glsl code - keep as a string
  dotsManager.pickingDotSize = '16.0';

  // dotsManager is so you don't have to pass references so often -- bad? not sure
  dotsManager.gl = gl;

  // Make dotsManager so we don't have to recreate it
  dotsManager.emptyMat4 = glm.mat4.create();

  // Create our shaders using the strings from settingsManager
  setupShaders();

  // Create a program for drawing the dots and setup its attributes/uniforms
  createDrawProgram(gl);
  // Create a program for drawing pickable dots and setup its attributes/uniforms
  createPickingProgram(gl);

  // Make buffers for satellite positions and size -- color and pickability are created in ColorScheme class
  dotsManager.positionBuffer = gl.createBuffer();
  dotsManager.sizeBuffer = gl.createBuffer();

  dotsManager.loaded = true;
};

export const updatePMvCamMatrix = (pMatrix: glm.mat4, mainCamera: Camera) => {
  dotsManager.pMvCamMatrix = glm.mat4.create();
  glm.mat4.mul(dotsManager.pMvCamMatrix, dotsManager.pMvCamMatrix, pMatrix);
  glm.mat4.mul(dotsManager.pMvCamMatrix, dotsManager.pMvCamMatrix, mainCamera.camMatrix);
};

export const draw = (mainCamera: Camera, colorSchemeManager: ColorSchemeManager, tgtBuffer: WebGLFramebuffer) => {
  if (!dotsManager.loaded || !settingsManager.cruncherReady) return;
  if (!colorSchemeManager.colorBuffer) return;
  const gl = dotsManager.gl;

  gl.useProgram(dotsManager.drawProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
  gl.uniformMatrix4fv(dotsManager.drawProgram.pMvCamMatrix, false, dotsManager.pMvCamMatrix);

  if (mainCamera.cameraType.current == mainCamera.cameraType.Planetarium) {
    gl.uniform1f(dotsManager.drawProgram.minSize, settingsManager.satShader.minSizePlanetarium);
    gl.uniform1f(dotsManager.drawProgram.maxSize, settingsManager.satShader.maxSizePlanetarium);
  } else {
    gl.uniform1f(dotsManager.drawProgram.minSize, settingsManager.satShader.minSize);
    gl.uniform1f(dotsManager.drawProgram.maxSize, settingsManager.satShader.maxSize);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, dotsManager.positionBuffer);

  // Buffering data here reduces the need to bind the buffer twice!

  // Either allocate and assign the data to the buffer
  if (!dotsManager.positionBufferOneTime) {
    gl.bufferData(gl.ARRAY_BUFFER, dotsManager.positionData, gl.DYNAMIC_DRAW);
    dotsManager.positionBufferOneTime = true;
  } else {
    // Or just update it if we have already allocated it - the length won't change
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dotsManager.positionData);
  }

  gl.vertexAttribPointer(dotsManager.drawProgram.aPos, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManager.colorBuffer);
  gl.enableVertexAttribArray(dotsManager.drawProgram.aColor);
  gl.vertexAttribPointer(dotsManager.drawProgram.aColor, 4, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, dotsManager.sizeBuffer);
  gl.enableVertexAttribArray(dotsManager.drawProgram.aStar);
  gl.vertexAttribPointer(dotsManager.drawProgram.aStar, 1, gl.FLOAT, false, 0, 0);

  // DEBUG:
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  gl.depthMask(false);

  // Should not be relying on sizeData -- but temporary
  gl.drawArrays(gl.POINTS, 0, settingsManager.dotsOnScreen);

  gl.depthMask(true);
  gl.disable(gl.BLEND);
};

export const drawGpuPickingFrameBuffer = (mainCamera: Camera, colorSchemeManager: ColorSchemeManager) => {
  if (!dotsManager.loaded || !settingsManager.cruncherReady) return;
  if (!colorSchemeManager.colorBuffer) return;
  const gl = dotsManager.gl;

  gl.useProgram(dotsManager.pickingProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManager.pickingFrameBuffer);

  gl.uniformMatrix4fv(dotsManager.pickingProgram.pMvCamMatrix, false, dotsManager.pMvCamMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, dotsManager.positionBuffer);
  gl.vertexAttribPointer(dotsManager.drawProgram.aPos, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, dotsManager.pickingColorBuffer);
  gl.enableVertexAttribArray(dotsManager.pickingProgram.aColor);
  gl.vertexAttribPointer(dotsManager.pickingProgram.aColor, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorSchemeManager.pickableBuffer);
  gl.enableVertexAttribArray(dotsManager.pickingProgram.aPickable);
  gl.vertexAttribPointer(dotsManager.pickingProgram.aPickable, 1, gl.FLOAT, false, 0, 0);

  // no reason to render 100000s of pixels when
  // we're only going to read one
  if (!settingsManager.isMobileModeEnabled) {
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(mainCamera.mouseX, gl.drawingBufferHeight - mainCamera.mouseY, 1, 1);
  }

  // Should not be relying on sizeData -- but temporary
  gl.drawArrays(gl.POINTS, 0, settingsManager.dotsOnScreen); // draw pick

  if (!settingsManager.isMobileModeEnabled) {
    gl.disable(gl.SCISSOR_TEST);
  }
};

export const setupShaders = () => {
  dotsManager.drawShaderCode = {
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
  dotsManager.pickingShaderCode = {
    vert: `#version 300 es
            in vec3 aPos;
            in vec3 aColor;
            in float aPickable;
    
            uniform mat4 pMvCamMatrix;
    
            out vec3 vColor;
    
            void main(void) {
            vec4 position = pMvCamMatrix * vec4(aPos, 1.0);
            gl_Position = position;
            gl_PointSize = ${dotsManager.pickingDotSize} * aPickable;
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
};

export const createDrawProgram = (gl: WebGL2RenderingContext) => {
  dotsManager.drawProgram = <DrawProgram>gl.createProgram();

  dotsManager.drawProgram.vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(dotsManager.drawProgram.vertShader, dotsManager.drawShaderCode.vert);
  gl.compileShader(dotsManager.drawProgram.vertShader);

  dotsManager.drawProgram.fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(dotsManager.drawProgram.fragShader, dotsManager.drawShaderCode.frag);
  gl.compileShader(dotsManager.drawProgram.fragShader);

  gl.attachShader(dotsManager.drawProgram, dotsManager.drawProgram.vertShader);
  gl.attachShader(dotsManager.drawProgram, dotsManager.drawProgram.fragShader);
  gl.linkProgram(dotsManager.drawProgram);

  if (!gl.getProgramParameter(dotsManager.drawProgram, gl.LINK_STATUS)) {
    var info = gl.getProgramInfoLog(dotsManager.drawProgram);
    throw new Error('Could not compile WebGL program. \n\n' + info);
  }

  dotsManager.drawProgram.aPos = gl.getAttribLocation(dotsManager.drawProgram, 'aPos');
  dotsManager.drawProgram.aColor = gl.getAttribLocation(dotsManager.drawProgram, 'aColor');
  dotsManager.drawProgram.aStar = gl.getAttribLocation(dotsManager.drawProgram, 'aStar');
  dotsManager.drawProgram.minSize = gl.getUniformLocation(dotsManager.drawProgram, 'minSize');
  dotsManager.drawProgram.maxSize = gl.getUniformLocation(dotsManager.drawProgram, 'maxSize');
  dotsManager.drawProgram.pMvCamMatrix = gl.getUniformLocation(dotsManager.drawProgram, 'pMvCamMatrix');
};

export const createPickingProgram = (gl: WebGL2RenderingContext) => {
  dotsManager.pickingProgram = <PickingProgram>gl.createProgram();

  dotsManager.pickingProgram.vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(dotsManager.pickingProgram.vertShader, dotsManager.pickingShaderCode.vert);
  gl.compileShader(dotsManager.pickingProgram.vertShader);

  dotsManager.pickingProgram.fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(dotsManager.pickingProgram.fragShader, dotsManager.pickingShaderCode.frag);
  gl.compileShader(dotsManager.pickingProgram.fragShader);

  gl.attachShader(dotsManager.pickingProgram, dotsManager.pickingProgram.vertShader);
  gl.attachShader(dotsManager.pickingProgram, dotsManager.pickingProgram.fragShader);
  gl.linkProgram(dotsManager.pickingProgram);

  dotsManager.pickingProgram.aPos = gl.getAttribLocation(dotsManager.pickingProgram, 'aPos');
  dotsManager.pickingProgram.aColor = gl.getAttribLocation(dotsManager.pickingProgram, 'aColor');
  dotsManager.pickingProgram.aPickable = gl.getAttribLocation(dotsManager.pickingProgram, 'aPickable');
  dotsManager.pickingProgram.pMvCamMatrix = gl.getUniformLocation(dotsManager.pickingProgram, 'pMvCamMatrix');

  dotsManager.pickingFrameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, dotsManager.pickingFrameBuffer);

  dotsManager.pickingTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, dotsManager.pickingTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  dotsManager.pickingRenderBuffer = gl.createRenderbuffer(); // create RB to store the depth buffer
  gl.bindRenderbuffer(gl.RENDERBUFFER, dotsManager.pickingRenderBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dotsManager.pickingTexture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, dotsManager.pickingRenderBuffer);

  dotsManager.pickReadPixelBuffer = new Uint8Array(4);
};

export const updatePositionBuffer = (satSetLen: number, orbitalSats: number, timeManager: TimeManager) => {
  // Don't update positions until positionCruncher finishes its first loop and creates data in position and velocity data arrays
  if (!dotsManager.positionData || !dotsManager.velocityData) return;

  // If we have radar data -- let's update that first
  // if (satSet.radarDataManager.radarData.length > 0) {
  //   // Get Time
  //   if (timeManager.propRate === 0) {
  //     timeManager.simulationTimeObj.setTime(Number(timeManager.dynamicOffsetEpoch) + timeManager.propOffset);
  //   } else {
  //     timeManager.simulationTimeObj.setTime(Number(timeManager.dynamicOffsetEpoch) + timeManager.propOffset + (Number(timeManager.realTime) - Number(timeManager.dynamicOffsetEpoch)) * timeManager.propRate);
  //   }
  //   drawPropTime = timeManager.simulationTimeObj * 1;

  // DEBUG:
  //   // Find the First Radar Return Time
  //   if (satSet.radarDataManager.drawT1 == 0) {
  //     for (rrI = 0; rrI < radarDataLen; rrI++) {
  //       if (satSet.radarDataManager.radarData[rrI].t > timeManager.realTime - 3000) {
  //         satSet.radarDataManager.drawT1 = rrI;
  //         break;
  //       }
  //     }
  //   }

  //   isDidOnce = false;
  //   for (dotsManager.drawI = satSet.radarDataManager.drawT1; dotsManager.drawI < radarDataLen; dotsManager.drawI++) {
  //     // Don't Exceed Max Radar Data Allocation
  //     // if (dotsManager.drawI > settingsManager.maxRadarData) break;

  //     if (satSet.radarDataManager.radarData[dotsManager.drawI].t >= drawPropTime - 3000 && satSet.radarDataManager.radarData[dotsManager.drawI].t <= drawPropTime + 3000) {
  //       if (!isDidOnce) {
  //         satSet.radarDataManager.drawT1 = dotsManager.drawI;
  //         isDidOnce = true;
  //       }
  //       // Skip if Already done
  //       if (dotsManager.positionData[(satSet.radarDataManager.satDataStartIndex + dotsManager.drawI) * 3] !== 0) continue;

  //       // Update Radar Marker Position
  //       dotsManager.positionData[(satSet.radarDataManager.satDataStartIndex + dotsManager.drawI) * 3] = satSet.radarDataManager.radarData[dotsManager.drawI].x;
  //       dotsManager.positionData[(satSet.radarDataManager.satDataStartIndex + dotsManager.drawI) * 3 + 1] = satSet.radarDataManager.radarData[dotsManager.drawI].y;
  //       dotsManager.positionData[(satSet.radarDataManager.satDataStartIndex + dotsManager.drawI) * 3 + 2] = satSet.radarDataManager.radarData[dotsManager.drawI].z;
  //       // NOTE: satVel could be added later
  //     } else {
  //       // Reset all positions outside time window
  //       dotsManager.positionData[(satSet.radarDataManager.satDataStartIndex + dotsManager.drawI) * 3] = 0;
  //       dotsManager.positionData[(satSet.radarDataManager.satDataStartIndex + dotsManager.drawI) * 3 + 1] = 0;
  //       dotsManager.positionData[(satSet.radarDataManager.satDataStartIndex + dotsManager.drawI) * 3 + 2] = 0;
  //     }

  //     if (satSet.radarDataManager.radarData[dotsManager.drawI].t > drawPropTime + 3000) {
  //       break;
  //     }
  //   }
  // }

  dotsManager.drawDivisor = Math.max(timeManager.propRate, 0.001);
  timeManager.drawDt = Math.min(timeManager.dt / 1000.0, 1.0 / dotsManager.drawDivisor);
  timeManager.drawDt *= timeManager.propRate; // Adjust drawDt correspond to the propagation rate
  dotsManager.satDataLenInDraw = satSetLen;
  if (!settingsManager.lowPerf && timeManager.drawDt > settingsManager.minimumDrawDt) {
    // Don't Interpolate Static Objects
    dotsManager.satDataLenInDraw -= settingsManager.maxFieldOfViewMarkers + settingsManager.maxRadarData;
    // Flat Array of X, Y, and Z so times by 3
    dotsManager.satDataLenInDraw3 = dotsManager.satDataLenInDraw * 3;
    // Do we want to treat non-satellites different?
    dotsManager.orbitalSats3 = orbitalSats * 3;

    // Interpolate position since last draw by adding the velocity
    for (dotsManager.drawI = 0; dotsManager.drawI < dotsManager.satDataLenInDraw3; dotsManager.drawI++) {
      dotsManager.positionData[dotsManager.drawI] += dotsManager.velocityData[dotsManager.drawI] * timeManager.drawDt;
    }

    const { gmst } = calculateTimeVariables(timeManager.simulationTimeObj);
    objectManager.staticSet
      .filter((object) => object.static && !object.marker && object.type !== SpaceObjectType.STAR)
      .forEach((object) => {
        const cosLat = Math.cos(object.lat * DEG2RAD);
        const sinLat = Math.sin(object.lat * DEG2RAD);
        const cosLon = Math.cos(object.lon * DEG2RAD + gmst);
        const sinLon = Math.sin(object.lon * DEG2RAD + gmst);
        dotsManager.positionData[object.id * 3] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + object.alt) * cosLat * cosLon; // 6371 is radius of earth
        dotsManager.positionData[object.id * 3 + 1] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + object.alt) * cosLat * sinLon;
        dotsManager.positionData[object.id * 3 + 2] = (RADIUS_OF_EARTH + GROUND_BUFFER_DISTANCE + object.alt) * sinLat;
      });
  }
};

export const updateSizeBuffer = (bufferLen: number = 3) => {
  const gl = dotsManager.gl;
  if (!dotsManager.sizeBufferOneTime) {
    dotsManager.sizeData = new Float32Array(bufferLen);
  }

  for (let i = 0; i < bufferLen; i++) {
    // Stars are always bigger
    if (i >= dotsManager.starIndex1 && i <= dotsManager.starIndex2) {
      dotsManager.sizeData[i] = 1.0;
    } else {
      dotsManager.sizeData[i] = 0.0;
    }
  }
  // Pretend Satellites that are currently being searched are stars
  // The shaders will display these "stars" like close satellites
  // because the distance from the center of the earth is too close to
  // be a star. dotsManager method is so there are less buffers needed but as
  // computers get faster it should be replaced
  for (const lastSearchResult of settingsManager.lastSearchResults) {
    dotsManager.sizeData[lastSearchResult] = 1.0;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, dotsManager.sizeBuffer);
  if (!dotsManager.sizeBufferOneTime) {
    gl.bufferData(gl.ARRAY_BUFFER, dotsManager.sizeData, gl.DYNAMIC_DRAW);
    dotsManager.sizeBufferOneTime = true;
  } else {
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dotsManager.sizeData);
  }
};

export const setupPickingBuffer = (satDataLen = 1) => {
  const gl = dotsManager.gl;

  // Array for which colors go to which ids
  dotsManager.pickingColorData = [];
  // Make a buffer
  dotsManager.pickingColorBuffer = gl.createBuffer();

  // loop assinging random colors to ids
  let byteR, byteG, byteB; // reuse color variables
  for (let i = 0; i < satDataLen; i++) {
    byteR = (i + 1) & 0xff;
    byteG = ((i + 1) & 0xff00) >> 8;
    byteB = ((i + 1) & 0xff0000) >> 16;

    // Normalize colors to 1 and flatten them
    dotsManager.pickingColorData.push(byteR / 255.0);
    dotsManager.pickingColorData.push(byteG / 255.0);
    dotsManager.pickingColorData.push(byteB / 255.0);
  }

  // Switch to the pick buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, dotsManager.pickingColorBuffer);

  // Setup the colorpicking data -- dotsManager doesnt change
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dotsManager.pickingColorData), gl.STATIC_DRAW);
};

export const dotsManager = <DotsManager>(<unknown>{
  init: init,
  updatePMvCamMatrix: updatePMvCamMatrix,
  drawGpuPickingFrameBuffer: drawGpuPickingFrameBuffer,
  setupShaders: setupShaders,
  draw: draw,
  createDrawProgram: createDrawProgram,
  createPickingProgram: createPickingProgram,
  updatePositionBuffer: updatePositionBuffer,
  updateSizeBuffer: updateSizeBuffer,
  setupPickingBuffer: setupPickingBuffer,
});
