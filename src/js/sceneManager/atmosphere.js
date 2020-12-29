/* eslint-disable no-useless-escape */

import * as glm from '@app/js/lib/gl-matrix.js';
import { mathValue } from '@app/js/helpers.js';
import { settingsManager } from '@app/js/keeptrack-head.js';

let mvMatrixEmpty = glm.mat4.create();
let nMatrixEmpty = glm.mat3.create();
var earth, gl;

var atmosphere = {};
atmosphere.lightDirection = [];
// Shader Code
atmosphere.shader = {
  frag: `
  precision mediump float;

  uniform vec3 uLightDirection;
  varying vec3 vNormal;
  varying float vDist;

  void main () {
      float sunAmount = max(dot(vNormal, uLightDirection), 0.1);
      float darkAmount = max(dot(vNormal, -uLightDirection), 0.0);
      float a4 = pow(1.3 - vDist / 2.0, 1.1) * 2.0;
      float r = 1.0 - sunAmount;
      float g = max(1.0 - sunAmount, 0.75) - darkAmount;
      float b = max(sunAmount, 0.8) - darkAmount;
      float a1 = min(sunAmount, 0.8) * 2.0;
      float a2 = min(pow(darkAmount / 1.15, 2.0),0.2);
      float a3 = pow(vDist,2.0) * -1.0 + 1.2;
      float a = min(a1 - a2, a3) * a4;
      gl_FragColor    = vec4(vec3(r,g,b), a);
  }
  `,
  vert: `
  attribute vec3 aVertexPosition;
  attribute vec3 aVertexNormal;

  uniform mat4 uPMatrix;
  uniform mat4 uCamMatrix;
  uniform mat4 uMvMatrix;
  uniform mat3 uNormalMatrix;

  varying vec3 vNormal;
  varying float vDist;

  void main(void) {
      vec4 position1 = uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
      vec4 position0 = uCamMatrix * uMvMatrix * vec4(vec3(0.0,0.0,0.0), 1.0);
      gl_Position = uPMatrix * position1;
      vDist = distance(position0.xz,position1.xz) \/ ${settingsManager.atmosphereSize}.0;
      vNormal = normalize( uNormalMatrix * aVertexNormal );
  }
  `,
};

let vertPosBuf, vertNormBuf, vertIndexBuf;
// Shader Program
let atmosphereShader;

atmosphere.init = function (glRef, earthRef) {
  gl = glRef;
  earth = earthRef;
  // Make Fragment Shader
  let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, atmosphere.shader.frag);
  gl.compileShader(fragShader);

  // Make Vertex Shader
  let vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, atmosphere.shader.vert);
  gl.compileShader(vertShader);

  // Create Program with Two Shaders
  atmosphereShader = gl.createProgram();
  gl.attachShader(atmosphereShader, vertShader);
  gl.attachShader(atmosphereShader, fragShader);
  gl.linkProgram(atmosphereShader);

  // Assign Attributes
  atmosphereShader.aVertexPosition = gl.getAttribLocation(atmosphereShader, 'aVertexPosition');
  atmosphereShader.aVertexNormal = gl.getAttribLocation(atmosphereShader, 'aVertexNormal');

  // Assign Uniforms
  atmosphereShader.uPMatrix = gl.getUniformLocation(atmosphereShader, 'uPMatrix');
  atmosphereShader.uCamMatrix = gl.getUniformLocation(atmosphereShader, 'uCamMatrix');
  atmosphereShader.uMvMatrix = gl.getUniformLocation(atmosphereShader, 'uMvMatrix');
  atmosphereShader.uNormalMatrix = gl.getUniformLocation(atmosphereShader, 'uNormalMatrix');
  atmosphereShader.uLightDirection = gl.getUniformLocation(atmosphereShader, 'uLightDirection');

  // Generate a UV Sphere Bottom Up, CCW order
  let vertPos = [];
  let vertNorm = [];
  for (let lat = 0; lat <= settingsManager.atmospherelatSegs; lat++) {
    let latAngle = (Math.PI / settingsManager.atmospherelatSegs) * lat - Math.PI / 2;
    let diskRadius = Math.cos(Math.abs(latAngle));
    let z = Math.sin(latAngle);
    for (let lon = 0; lon <= settingsManager.atmospherelonSegs; lon++) {
      // add an extra vertex for texture funness
      let lonAngle = ((Math.PI * 2) / settingsManager.atmospherelonSegs) * lon;
      let x = Math.cos(lonAngle) * diskRadius;
      let y = Math.sin(lonAngle) * diskRadius;

      vertPos.push(x * settingsManager.atmosphereSize);
      vertPos.push(y * settingsManager.atmosphereSize);
      vertPos.push(z * settingsManager.atmosphereSize);
      vertNorm.push(x);
      vertNorm.push(y);
      vertNorm.push(z);
    }
  }

  // Calculate Vertex Draw Orders
  let vertIndex = [];
  for (let lat = 0; lat < settingsManager.atmospherelatSegs; lat++) {
    // this is for each QUAD, not each vertex, so <
    for (let lon = 0; lon < settingsManager.atmospherelonSegs; lon++) {
      var blVert = lat * (settingsManager.atmospherelonSegs + 1) + lon; // there's settingsManager.atmospherelonSegs + 1 verts in each horizontal band
      var brVert = blVert + 1;
      var tlVert = (lat + 1) * (settingsManager.atmospherelonSegs + 1) + lon;
      var trVert = tlVert + 1;
      vertIndex.push(blVert);
      vertIndex.push(brVert);
      vertIndex.push(tlVert);

      vertIndex.push(tlVert);
      vertIndex.push(trVert);
      vertIndex.push(brVert);
    }
  }
  atmosphere.vertCount = vertIndex.length;

  // Create Buffer for Vertex Positions
  vertPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

  // Create Buffer for Vertex Normals
  vertNormBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

  // Create Buffer for Vertex Indicies
  vertIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);

  // Let Everyone Know This is Initialized
  atmosphere.loaded = true;
};

atmosphere.update = (camPitch) => {
  // This should be called in sun before everyone else gets updated
  // sun.currentDirection();

  // Normalize light direction (should be done in earth)
  // glm.vec3.normalize(earth.lightDirection, earth.lightDirection);

  // Start with an empyy model view matrix
  atmosphere.mvMatrix = mvMatrixEmpty;
  glm.mat4.identity(atmosphere.mvMatrix);
  // Rotate model view matrix to prevent lines showing as camera rotates
  glm.mat4.rotateY(atmosphere.mvMatrix, atmosphere.mvMatrix, 90 * mathValue.DEG2RAD - camPitch);
  // Scale the atmosphere to 0,0,0 - needed?
  glm.mat4.translate(atmosphere.mvMatrix, atmosphere.mvMatrix, [0, 0, 0]);
  // Calculate normals
  atmosphere.nMatrix = nMatrixEmpty;
  glm.mat3.normalFromMat4(atmosphere.nMatrix, atmosphere.mvMatrix);
};

atmosphere.draw = function (pMatrix, camMatrix) {
  if (!atmosphere.loaded) return;

  // Enable blending and ignore depth test (especially on self)
  gl.enable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Change to the atmosphere shader
  gl.useProgram(atmosphereShader);
  // Change to the main drawing buffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // Set the uniforms
  gl.uniformMatrix3fv(atmosphereShader.uNormalMatrix, false, atmosphere.nMatrix);
  gl.uniformMatrix4fv(atmosphereShader.uMvMatrix, false, atmosphere.mvMatrix);
  gl.uniformMatrix4fv(atmosphereShader.uPMatrix, false, pMatrix);
  gl.uniformMatrix4fv(atmosphereShader.uCamMatrix, false, camMatrix);
  gl.uniform3fv(atmosphereShader.uLightDirection, earth.lightDirection);

  // Select the vertex position buffer
  // Enable the attribute
  // Set the attribute
  gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
  gl.enableVertexAttribArray(atmosphereShader.aVertexPosition);
  gl.vertexAttribPointer(atmosphereShader.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

  // Select the vertex normals buffer
  // Enable the attribute
  // Set the attribute
  gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
  gl.enableVertexAttribArray(atmosphereShader.aVertexNormal);
  gl.vertexAttribPointer(atmosphereShader.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

  // Select the vertex indicies buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
  // Draw everythign to screen
  gl.drawElements(gl.TRIANGLES, atmosphere.vertCount, gl.UNSIGNED_SHORT, 0);

  // Disable attributes to avoid conflict with other shaders
  gl.disableVertexAttribArray(atmosphereShader.aVertexPosition);
  gl.disableVertexAttribArray(atmosphereShader.aVertexNormal);

  // Disable blending and reeneable depth test
  gl.disable(gl.BLEND);
  gl.enable(gl.DEPTH_TEST);
  return true;
};

export { atmosphere };
