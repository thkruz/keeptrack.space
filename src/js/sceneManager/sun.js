// Shaders should NOT be modified
/* eslint-disable no-useless-escape */

import * as glm from '@app/js/lib/gl-matrix.js';
import { A } from '@app/js/lib/meuusjs.js';
import { mathValue } from '@app/js/helpers.js';
import { satellite } from '@app/js/lookangles.js';
import { timeManager } from '@app/js/timeManager.js';

let mvMatrixEmpty = glm.mat4.create();
let nMatrixEmpty = glm.mat3.create();
let NUM_LAT_SEGS = 64;
let NUM_LON_SEGS = 64;
var gl, earth;

let vertPosBuf, vertNormBuf, vertIndexBuf; // GPU mem buffers, data and stuff?
let vertCount;
let mvMatrix;
let nMatrix;
let sunShader;
let sunMaxDist;

var sun = {};
sun.sunvar = {};
sun.pos = [0, 0, 0];
sun.pos2 = [0, 0, 0];
sun.shader = {
  frag: `
    precision mediump float;
    uniform vec3 uLightDirection;

    varying vec3 vNormal;
    varying float vDist;
    varying float vDist2;

    void main(void) {
        // Hide the Back Side of the Sphere to prevent duplicate suns
        float darkAmount = max(dot(vNormal, -uLightDirection), 0.1);
        // Create blur effect
        float a = pow(vDist \/ 2.0 * -1.0 + 1.1, 10.0) * darkAmount;
        // Set colors
        float r = 1.0 * a;
        float g = 1.0 * a;
        float b = 0.4 * a;

        if (vDist2 > 1.0) {
        discard;
        // r = 0.0;
        // g = 1.0;
        // b = 0.0;
        // a = 1.0;
        }

        gl_FragColor = vec4(vec3(r,g,b), a);
    }
    `,
  vert: `
    attribute vec3 aVertexPosition;
    attribute vec3 aVertexNormal;

    uniform mat4 uPMatrix;
    uniform mat4 uCamMatrix;
    uniform mat4 uMvMatrix;
    uniform mat3 uNormalMatrix;
    uniform float uSunDis;

    varying vec3 vNormal;
    varying float vDist;
    varying float vDist2;

    void main(void) {
        vec4 position = uMvMatrix * vec4(aVertexPosition, 1.0);
        vec4 position0 = uCamMatrix * uMvMatrix * vec4(vec3(0.0,0.0,0.0), 1.0);
        vec4 position1 = uCamMatrix * position;
        gl_Position = uPMatrix * position1;
        vDist = distance(position0.xz,position1.xz) \/ ${mathValue.RADIUS_OF_DRAW_SUN}.0;
        vDist2 = distance(position.xyz,vec3(0.0,0.0,0.0)) \/ uSunDis;
        vNormal = uNormalMatrix * aVertexNormal;
    }`,
};

sun.init = function (glRef, earthRef) {
  gl = glRef;
  earth = earthRef;
  // Make New Vertex Array Objects
  // sun.vao = gl.createVertexArray();
  // gl.bindVertexArray(sun.vao);

  let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, sun.shader.frag);
  gl.compileShader(fragShader);

  let vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, sun.shader.vert);
  gl.compileShader(vertShader);

  sunShader = gl.createProgram();
  gl.attachShader(sunShader, vertShader);
  gl.attachShader(sunShader, fragShader);
  gl.linkProgram(sunShader);

  sunShader.aVertexPosition = gl.getAttribLocation(sunShader, 'aVertexPosition');
  sunShader.aTexCoord = gl.getAttribLocation(sunShader, 'aTexCoord');
  sunShader.aVertexNormal = gl.getAttribLocation(sunShader, 'aVertexNormal');
  sunShader.uPMatrix = gl.getUniformLocation(sunShader, 'uPMatrix');
  sunShader.uCamMatrix = gl.getUniformLocation(sunShader, 'uCamMatrix');
  sunShader.uMvMatrix = gl.getUniformLocation(sunShader, 'uMvMatrix');
  sunShader.uNormalMatrix = gl.getUniformLocation(sunShader, 'uNormalMatrix');
  sunShader.uLightDirection = gl.getUniformLocation(sunShader, 'uLightDirection');
  sunShader.uSunDis = gl.getUniformLocation(sunShader, 'uSunDis');

  // generate a uvsphere bottom up, CCW order
  var vertPos = [];
  var vertNorm = [];
  var texCoord = [];
  for (let lat = 0; lat <= NUM_LAT_SEGS; lat++) {
    var latAngle = (Math.PI / NUM_LAT_SEGS) * lat - Math.PI / 2;
    var diskRadius = Math.cos(Math.abs(latAngle));
    var z = Math.sin(latAngle);
    // console.log('LAT: ' + latAngle * mathValue.RAD2DEG + ' , Z: ' + z);
    // var i = 0;
    for (let lon = 0; lon <= NUM_LON_SEGS; lon++) {
      // add an extra vertex for texture funness
      var lonAngle = ((Math.PI * 2) / NUM_LON_SEGS) * lon;
      var x = Math.cos(lonAngle) * diskRadius;
      var y = Math.sin(lonAngle) * diskRadius;
      // console.log('i: ' + i + '    LON: ' + lonAngle * mathValue.RAD2DEG + ' X: ' + x + ' Y: ' + y)

      // mercator cylindrical projection (simple angle interpolation)
      var v = 1 - lat / NUM_LAT_SEGS;
      var u = 0.5 + lon / NUM_LON_SEGS; // may need to change to move map
      // console.log('u: ' + u + ' v: ' + v);
      // normals: should just be a vector from center to point (aka the point itself!

      vertPos.push(x * mathValue.RADIUS_OF_DRAW_SUN);
      vertPos.push(y * mathValue.RADIUS_OF_DRAW_SUN);
      vertPos.push(z * mathValue.RADIUS_OF_DRAW_SUN);
      texCoord.push(u);
      texCoord.push(v);
      vertNorm.push(x);
      vertNorm.push(y);
      vertNorm.push(z);

      // i++;
    }
  }

  // ok let's calculate vertex draw orders.... indiv triangles
  var vertIndex = [];
  for (let lat = 0; lat < NUM_LAT_SEGS; lat++) {
    // this is for each QUAD, not each vertex, so <
    for (let lon = 0; lon < NUM_LON_SEGS; lon++) {
      var blVert = lat * (NUM_LON_SEGS + 1) + lon; // there's NUM_LON_SEGS + 1 verts in each horizontal band
      var brVert = blVert + 1;
      var tlVert = (lat + 1) * (NUM_LON_SEGS + 1) + lon;
      var trVert = tlVert + 1;
      // console.log('bl: ' + blVert + ' br: ' + brVert +  ' tl: ' + tlVert + ' tr: ' + trVert);
      vertIndex.push(blVert);
      vertIndex.push(brVert);
      vertIndex.push(tlVert);

      vertIndex.push(tlVert);
      vertIndex.push(trVert);
      vertIndex.push(brVert);
    }
  }
  vertCount = vertIndex.length;

  vertPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

  vertNormBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

  vertIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);

  sun.loaded = true;
};
sun.draw = function (pMatrix, camMatrix) {
  if (!sun.loaded) return;

  // Switch Vertex Array Objects
  // gl.bindVertexArray(sun.vao);

  // #### sun.getXYZ ###
  // Get Time
  if (timeManager.propRate === 0) {
    timeManager.propTimeVar.setTime(Number(timeManager.propRealTime) + timeManager.propOffset);
  } else {
    timeManager.propTimeVar.setTime(Number(timeManager.propRealTime) + timeManager.propOffset + (Number(timeManager.now) - Number(timeManager.propRealTime)) * timeManager.propRate);
  }
  sun.now = timeManager.propTimeVar;

  sun.sunvar.j = timeManager.jday(
    sun.now.getUTCFullYear(),
    sun.now.getUTCMonth() + 1, // NOTE:, this function requires months in range 1-12.
    sun.now.getUTCDate(),
    sun.now.getUTCHours(),
    sun.now.getUTCMinutes(),
    sun.now.getUTCSeconds()
  );
  sun.sunvar.j += sun.now.getUTCMilliseconds() * mathValue.MILLISECONDS_PER_DAY;
  sun.sunvar.gmst = satellite.gstime(sun.sunvar.j);
  sun.sunvar.jdo = new A.JulianDay(sun.sunvar.j); // now
  sun.sunvar.coord = A.EclCoord.fromWgs84(0, 0, 0);

  // AZ / EL Calculation
  sun.sunvar.tp = A.Solar.topocentricPosition(sun.sunvar.jdo, sun.sunvar.coord, false);
  sun.sunvar.azimuth = sun.sunvar.tp.hz.az * mathValue.RAD2DEG + (180 % 360);
  sun.sunvar.elevation = (sun.sunvar.tp.hz.alt * mathValue.RAD2DEG) % 360;

  // Range Calculation
  var T = new A.JulianDay(A.JulianDay.dateToJD(sun.now)).jdJ2000Century();
  sun.sunvar.g = (A.Solar.meanAnomaly(T) * 180) / Math.PI;
  sun.sunvar.g = sun.sunvar.g % 360.0;
  sun.sunvar.R = 1.00014 - 0.01671 * Math.cos(sun.sunvar.g) - 0.00014 * Math.cos(2 * sun.sunvar.g);
  sun.sunvar.range = (sun.sunvar.R * 149597870700) / 1000; // au to km conversion

  // RAE to ECI
  sun.eci = satellite.ecfToEci(satellite.lookAnglesToEcf(sun.sunvar.azimuth, sun.sunvar.elevation, sun.sunvar.range, 0, 0, 0), sun.sunvar.gmst);

  sun.realXyz = { x: sun.eci.x, y: sun.eci.y, z: sun.eci.z };
  // #### sun.getXYZ ###

  sunMaxDist = Math.max(Math.max(Math.abs(sun.realXyz.x), Math.abs(sun.realXyz.y)), Math.abs(sun.realXyz.z));
  sun.pos[0] = (sun.realXyz.x / sunMaxDist) * mathValue.SUN_SCALAR_DISTANCE;
  sun.pos[1] = (sun.realXyz.y / sunMaxDist) * mathValue.SUN_SCALAR_DISTANCE;
  sun.pos[2] = (sun.realXyz.z / sunMaxDist) * mathValue.SUN_SCALAR_DISTANCE;
  sun.pos2[0] = sun.pos[0] * 100;
  sun.pos2[1] = sun.pos[1] * 100;
  sun.pos2[2] = sun.pos[2] * 100;

  mvMatrix = mvMatrixEmpty;
  glm.mat4.identity(mvMatrix);

  glm.mat4.translate(mvMatrix, mvMatrix, sun.pos);
  // Keep the back of the sun sphere directly behind the front of the
  // sun sphere so there is only one sun
  // Depricated with use of fragment discard
  // glm.mat4.rotateX(mvMatrix, mvMatrix, -camPitch);
  // glm.mat4.rotateZ(mvMatrix, mvMatrix, -camYaw);

  nMatrix = nMatrixEmpty;
  glm.mat3.normalFromMat4(nMatrix, mvMatrix);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.useProgram(sunShader);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.uniformMatrix3fv(sunShader.uNormalMatrix, false, nMatrix);
  gl.uniformMatrix4fv(sunShader.uMvMatrix, false, mvMatrix);
  gl.uniformMatrix4fv(sunShader.uPMatrix, false, pMatrix);
  gl.uniformMatrix4fv(sunShader.uCamMatrix, false, camMatrix);
  gl.uniform3fv(sunShader.uLightDirection, earth.lightDirection);
  gl.uniform1f(sunShader.uSunDis, Math.sqrt(sun.pos[0] ** 2 + sun.pos[1] ** 2 + sun.pos[2] ** 2));

  gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
  gl.enableVertexAttribArray(sunShader.aVertexPosition);
  gl.vertexAttribPointer(sunShader.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
  gl.enableVertexAttribArray(sunShader.aVertexNormal);
  gl.vertexAttribPointer(sunShader.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
  gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

  // gl.disable(gl.BLEND);
  return true;
};

export { sun };
