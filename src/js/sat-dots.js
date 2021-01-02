/* eslint-disable no-useless-escape */
import * as glm from '@app/js/lib/gl-matrix.js';
import * as twgl from 'twgl.js';

class SatDots {
  constructor(gl, pMatrix, cameraManager, timeManager, satSet) {
    this.gl = gl;
    this.cameraManager = cameraManager;
    this.timeManager = timeManager;
    this.satSet = satSet;
    this.satColorBuf = satSet.satColorBuf;

    this.starBufData = satSet.starBufData;

    this.setupShaders();
    this.programInfo = twgl.createProgramInfo(gl, [this.shaders.vert, this.shaders.frag]);

    // populate GPU mem buffers, now that we know how many sats there are
    this.bufferInfo = twgl.createBufferInfoFromArrays(gl, {
      aPos: this.satSet.satPos,
      aStar: {
        numComponents: 1,
        data: this.starBufData,
      },
    });

    // Add the color buffer manually
    this.bufferInfo.attribs.aColor = {
      buffer: this.satColorBuf,
      normalize: false,
      numComponents: 4,
      offset: 0,
      stride: 0,
      type: gl.FLOAT,
    };

    this.uniforms = {
      minSize: settingsManager.satShader.minSize,
      maxSize: settingsManager.satShader.maxSize,
      uMvMatrix: glm.mat4.create(), // Do we need this?
      uCamMatrix: cameraManager.camMatrix,
      uPMatrix: pMatrix,
    };

    this.uniformsPlanetarium = {
      minSize: settingsManager.satShader.minSizePlanetarium,
      maxSize: settingsManager.satShader.maxSizePlanetarium,
      uMvMatrix: glm.mat4.create(), // Do we need this?
      uCamMatrix: cameraManager.camMatrix,
      uPMatrix: pMatrix,
    };

    this.loaded = true;
  }

  // eslint-disable-next-line class-methods-use-this
  draw(pMatrix, camMatrix) {
    if (!this.loaded) return; // Fix this later
    const gl = this.gl;
    const cameraManager = this.cameraManager;

    this.uPMatrix = pMatrix;
    this.uniforms.uCamMatrix = camMatrix;

    this.updatePositions();

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.depthMask(false);

    gl.useProgram(this.programInfo.program);
    twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);

    if (cameraManager.cameraType.current == cameraManager.cameraType.planetarium) {
      twgl.setUniforms(this.programInfo, this.uniforms);
    } else {
      twgl.setUniforms(this.programInfo, this.uniformsPlanetarium);
    }

    twgl.drawBufferInfo(gl, this.bufferInfo);

    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // // now pickbuffer stuff......
    // gl.useProgram(gl.pickShaderProgram);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, gl.pickFb);
    // //  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // gl.uniformMatrix4fv(gl.pickShaderProgram.uMvMatrix, false, glm.mat4.create());
    // gl.uniformMatrix4fv(gl.pickShaderProgram.uCamMatrix, false, camMatrix);
    // gl.uniformMatrix4fv(gl.pickShaderProgram.uPMatrix, false, pMatrix);

    // gl.enableVertexAttribArray(gl.pickShaderProgram.aColor);
    // gl.bindBuffer(gl.ARRAY_BUFFER, pickColorBuf);
    // gl.vertexAttribPointer(gl.pickShaderProgram.aColor, 3, gl.FLOAT, false, 0, 0);

    // gl.bindBuffer(gl.ARRAY_BUFFER, pickableBuf);
    // gl.enableVertexAttribArray(gl.pickShaderProgram.aPickable);
    // gl.vertexAttribPointer(gl.pickShaderProgram.aPickable, 1, gl.FLOAT, false, 0, 0);

    // gl.drawArrays(gl.POINTS, 0, satData.length); // draw pick
  }

  // eslint-disable-next-line class-methods-use-this
  updatePositions() {
    if (!this.loaded) return; // Fix this later
    this.drawDivisor = Math.max(this.timeManager.propRate, 0.001);
    this.timeManager.setDrawDt(Math.min(this.timeManager.dt / 1000.0, 1.0 / this.drawDivisor));
    // Skip Velocity Math if FPS is hurting
    // 1000 / dt = fps
    if (1000 / this.timeManager.dt > settingsManager.fpsThrottle2) {
      this.timeManager.setDrawDt(this.timeManager.drawDt * this.timeManager.propRate); // Adjust drawDt correspond to the propagation rate
      this.satSet.satDataLenInDraw = this.satSet.satData.length;
      if (!settingsManager.lowPerf && this.timeManager.drawDt > settingsManager.minimumDrawDt) {
        this.satSet.satDataLenInDraw -= settingsManager.maxFieldOfViewMarkers + settingsManager.maxRadarData;
        this.satSet.satDataLenInDraw3 = this.satSet.satDataLenInDraw * 3;
        this.satSet.orbitalSats3 = this.satSet.orbitalSats * 3;
        for (this.drawI = 0; this.drawI < this.satSet.satDataLenInDraw3; this.drawI++) {
          if (this.drawI > this.satSet.orbitalSats3) {
            this.satSet.satPos[this.drawI] += this.satSet.satVel[this.drawI] * this.timeManager.drawDt;
          } else {
            this.satSet.satPos[this.drawI] += this.satSet.satVel[this.drawI] * this.timeManager.drawDt;
          }
        }
      }
    }
    // assuming arrays.position has already been updated with new data.
    twgl.setAttribInfoBufferFromArray(this.gl, this.bufferInfo.attribs.aPos, this.satSet.satPos);
  }

  setupShaders() {
    this.shaders = {
      frag: `
          ${settingsManager.desktopOnlySatShaderFix1}
          precision mediump float;

          varying vec4 vColor;
          varying float vStar;
          varying float vDist;

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
          alpha += (pow(2.0 * r + ${settingsManager.satShader.blurFactor2}, 3.0)) * when_lt(vDist, 200000.0) * when_ge(vDist, 6421.0);

          // If on the ground
          r += (${settingsManager.satShader.blurFactor1} - min(abs(length(ptCoord)), 1.0)) * when_lt(vDist, 6421.0);
          alpha += (pow(2.0 * r + ${settingsManager.satShader.blurFactor2}, 3.0)) * when_lt(vDist, 6471.0);

          // If a star
          r += (${settingsManager.satShader.blurFactor3} - min(abs(length(ptCoord)), 1.0)) * when_ge(vDist, 200000.0);
          alpha += (pow(2.0 * r + ${settingsManager.satShader.blurFactor4}, 3.0)) * when_ge(vDist, 200000.0);

          alpha = min(alpha, 1.0);
          if (alpha == 0.0) discard;
          gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
          // Reduce Flickering from Depth Fighting
          ${settingsManager.desktopOnlySatShaderFix2}
          }
        `,
      vert: `
        attribute vec3 aPos;
        attribute vec4 aColor;
        attribute float aStar;

        uniform float minSize;
        uniform float maxSize;

        uniform mat4 uCamMatrix;
        uniform mat4 uMvMatrix;
        uniform mat4 uPMatrix;

        varying vec4 vColor;
        varying float vStar;
        varying float vDist;

        float when_lt(float x, float y) {
            return max(sign(y - x), 0.0);
        }
        float when_ge(float x, float y) {
            return 1.0 - when_lt(x, y);
        }

        void main(void) {
            vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(aPos, 1.0);
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
  }
}

// radarDataLen = radarDataManager.radarData.length;
//     if (radarDataLen > 0) {
//       // Get Time
//       if (timeManager.propRate === 0) {
//         timeManager.propTimeVar.setTime(Number(timeManager.propRealTime) + timeManager.propOffset);
//       } else {
//         timeManager.propTimeVar.setTime(Number(timeManager.propRealTime) + timeManager.propOffset + (Number(timeManager.now) - Number(timeManager.propRealTime)) * timeManager.propRate);
//       }
//       drawPropTime = timeManager.propTimeVar * 1;

//       // Find the First Radar Return Time
//       if (radarDataManager.drawT1 == 0) {
//         for (rrI = 0; rrI < radarDataLen; rrI++) {
//           if (radarDataManager.radarData[rrI].t > timeManager.now - 3000) {
//             radarDataManager.drawT1 = rrI;
//             break;
//           }
//         }
//       }

//       isDidOnce = false;
//       for (drawI = radarDataManager.drawT1; drawI < radarDataLen; drawI++) {
//         // Don't Exceed Max Radar Data Allocation
//         // if (drawI > settingsManager.maxRadarData) break;

//         if (radarDataManager.radarData[drawI].t >= drawPropTime - 3000 && radarDataManager.radarData[drawI].t <= drawPropTime + 3000) {
//           if (!isDidOnce) {
//             radarDataManager.drawT1 = drawI;
//             isDidOnce = true;
//           }
//           // Skip if Already done
//           if (satPos[(radarDataManager.satDataStartIndex + drawI) * 3] !== 0) continue;

//           // Update Radar Marker Position
//           satPos[(radarDataManager.satDataStartIndex + drawI) * 3] = radarDataManager.radarData[drawI].x;
//           satPos[(radarDataManager.satDataStartIndex + drawI) * 3 + 1] = radarDataManager.radarData[drawI].y;
//           satPos[(radarDataManager.satDataStartIndex + drawI) * 3 + 2] = radarDataManager.radarData[drawI].z;
//           // NOTE: satVel could be added later
//         } else {
//           // Reset all positions outside time window
//           satPos[(radarDataManager.satDataStartIndex + drawI) * 3] = 0;
//           satPos[(radarDataManager.satDataStartIndex + drawI) * 3 + 1] = 0;
//           satPos[(radarDataManager.satDataStartIndex + drawI) * 3 + 2] = 0;
//         }

//         if (radarDataManager.radarData[drawI].t > drawPropTime + 3000) {
//           break;
//         }
//       }
//     }

/*
// Note: This won't work as is but is kept as a reference
satSet.changeShaders = (newShaders) => {
  gl.detachShader(dotShader, vertShader);
  gl.detachShader(dotShader, fragShader);
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

  gl.attachShader(dotShader, vertShader);
  gl.attachShader(dotShader, fragShader);
  gl.linkProgram(dotShader);
  dotShader.aPos = gl.getAttribLocation(dotShader, 'aPos');
  dotShader.aColor = gl.getAttribLocation(dotShader, 'aColor');
  dotShader.aStar = gl.getAttribLocation(dotShader, 'aStar');
  dotShader.minSize = gl.getUniformLocation(dotShader, 'minSize');
  dotShader.maxSize = gl.getUniformLocation(dotShader, 'maxSize');
  dotShader.uMvMatrix = gl.getUniformLocation(dotShader, 'uMvMatrix');
  dotShader.uCamMatrix = gl.getUniformLocation(dotShader, 'uCamMatrix');
  dotShader.uPMatrix = gl.getUniformLocation(dotShader, 'uPMatrix');
};
*/

export { SatDots };
