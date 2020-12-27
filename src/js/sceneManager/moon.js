/** @format */
/* eslint-disable no-useless-escape */

import * as glm from '@app/js/lib/gl-matrix.js';
import { SunCalc } from '@app/js/lib/suncalc.js';
import { gl } from '@app/js/main.js';
import { mathValue } from '@app/js/helpers.js';
import { satellite } from '@app/js/lookangles.js';
import { sun } from '@app/js/sceneManager/sun.js';

let mvMatrixEmpty = glm.mat4.create();
let nMatrixEmpty = glm.mat3.create();

let moon = {};
let NUM_LAT_SEGS = 32;
let NUM_LON_SEGS = 32;

let vertPosBuf, vertNormBuf, texCoordBuf, vertIndexBuf; // GPU mem buffers, data and stuff?
let vertCount;
let mvMatrix;
let nMatrix;
let moonShader;
moon.pos = [0, 0, 0];
moon.shader = {
  frag: `
    precision mediump float;

    uniform vec3 uLightDirection;
    varying vec2 vUv;
    varying vec3 vNormal;

    uniform sampler2D uSampler;
    uniform vec3 uSunPos;

    varying float vDist;

    void main(void) {
        // Moon Position - Sun Position
        vec3 LightDirection = uSunPos - vec3(0.0,0.0,0.0);
        LightDirection = normalize(LightDirection);

        float diffuse = max(dot(vNormal, LightDirection), 0.0);
        vec3 ambientLight = vec3(0.05,0.05,0.05);

        vec3 litTexColor = texture2D(uSampler, vUv).rgb * (ambientLight + diffuse * 1.5);

        if (vDist > 1.0) {
        discard;
        // litTexColor = vec3(1.0,0.0,0.0);
        }

        gl_FragColor = vec4(litTexColor, 1.0);
    }
    `,
  vert: `
    attribute vec3 aVertexPosition;

    attribute vec2 aTexCoord;
    attribute vec3 aVertexNormal;

    uniform mat4 uPMatrix;
    uniform mat4 uCamMatrix;
    uniform mat4 uMvMatrix;
    uniform mat3 uNormalMatrix;
    uniform float uMoonDis;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying float vDist;

    void main(void) {
        vec4 position = uMvMatrix * vec4(aVertexPosition, 1.0);
        gl_Position = uPMatrix * uCamMatrix * position;
        vDist = distance(position.xyz,vec3(0.0,0.0,0.0)) \/ uMoonDis;
        vUv = aTexCoord;

        vNormal = uNormalMatrix * aVertexNormal;
    }
    `,
};

var texture;
var texLoaded = false;

var onImageLoaded = () => {
  if (texLoaded) {
    moon.loaded = true;
  }
};

moon.getXYZ = () => {
  // sun.sunvar.gmst and sun.now get calculated before the moon on each draw loop
  // reusing them speeds up the draw loop

  moon.moonPos = SunCalc.getMoonPosition(sun.now, 0, 0);
  moon.position = satellite.ecfToEci(satellite.lookAnglesToEcf(180 + moon.moonPos.azimuth * mathValue.RAD2DEG, moon.moonPos.altitude * mathValue.RAD2DEG, moon.moonPos.distance, 0, 0, 0), sun.sunvar.gmst);

  return {
    x: moon.position.x,
    y: moon.position.y,
    z: moon.position.z,
  };
};

moon.init = function () {
  let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, moon.shader.frag);
  gl.compileShader(fragShader);

  let vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, moon.shader.vert);
  gl.compileShader(vertShader);

  moonShader = gl.createProgram();
  gl.attachShader(moonShader, vertShader);
  gl.attachShader(moonShader, fragShader);
  gl.linkProgram(moonShader);

  moonShader.aVertexPosition = gl.getAttribLocation(moonShader, 'aVertexPosition');
  moonShader.aTexCoord = gl.getAttribLocation(moonShader, 'aTexCoord');
  moonShader.aVertexNormal = gl.getAttribLocation(moonShader, 'aVertexNormal');
  moonShader.uPMatrix = gl.getUniformLocation(moonShader, 'uPMatrix');
  moonShader.uCamMatrix = gl.getUniformLocation(moonShader, 'uCamMatrix');
  moonShader.uMvMatrix = gl.getUniformLocation(moonShader, 'uMvMatrix');
  moonShader.uNormalMatrix = gl.getUniformLocation(moonShader, 'uNormalMatrix');
  moonShader.uSunPos = gl.getUniformLocation(moonShader, 'uSunPos');
  moonShader.uMoonDis = gl.getUniformLocation(moonShader, 'uMoonDis');
  moonShader.uSampler = gl.getUniformLocation(moonShader, 'uSampler');

  texture = gl.createTexture();
  var img = new Image();
  img.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    // console.log('moon.js loaded texture');

    let moonXYZ = moon.getXYZ();
    let moonMaxDist = Math.max(Math.max(Math.abs(moonXYZ.x), Math.abs(moonXYZ.y)), Math.abs(moonXYZ.z));
    moon.pos[0] = (moonXYZ.x / moonMaxDist) * mathValue.MOON_SCALAR_DISTANCE;
    moon.pos[1] = (moonXYZ.y / moonMaxDist) * mathValue.MOON_SCALAR_DISTANCE;
    moon.pos[2] = (moonXYZ.z / moonMaxDist) * mathValue.MOON_SCALAR_DISTANCE;

    texLoaded = true;
    onImageLoaded();
  };
  img.src = 'textures/moon-1024.jpg';

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

      vertPos.push(x * mathValue.RADIUS_OF_DRAW_MOON);
      vertPos.push(y * mathValue.RADIUS_OF_DRAW_MOON);
      vertPos.push(z * mathValue.RADIUS_OF_DRAW_MOON);
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

  texCoordBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STATIC_DRAW);

  vertIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);
};

moon.draw = function (pMatrix, camMatrix) {
  if (!moon.loaded) return;
  // Switch Vertex Array Objects
  // gl.bindVertexArray(moon.vao);

  // Needed because geocentric earth
  moon.moonPos = SunCalc.getMoonPosition(sun.now, 0, 0);
  moon.position = satellite.ecfToEci(satellite.lookAnglesToEcf(180 + moon.moonPos.azimuth * mathValue.RAD2DEG, moon.moonPos.altitude * mathValue.RAD2DEG, moon.moonPos.distance, 0, 0, 0), sun.sunvar.gmst);

  moon.moonXYZ = {
    x: moon.position.x,
    y: moon.position.y,
    z: moon.position.z,
  };

  moon.moonMaxDist = Math.max(Math.max(Math.abs(moon.moonXYZ.x), Math.abs(moon.moonXYZ.y)), Math.abs(moon.moonXYZ.z));
  moon.pos[0] = (moon.moonXYZ.x / moon.moonMaxDist) * mathValue.MOON_SCALAR_DISTANCE;
  moon.pos[1] = (moon.moonXYZ.y / moon.moonMaxDist) * mathValue.MOON_SCALAR_DISTANCE;
  moon.pos[2] = (moon.moonXYZ.z / moon.moonMaxDist) * mathValue.MOON_SCALAR_DISTANCE;

  mvMatrix = mvMatrixEmpty;
  glm.mat4.identity(mvMatrix);
  glm.mat4.translate(mvMatrix, mvMatrix, moon.pos);

  nMatrix = nMatrixEmpty;
  glm.mat3.normalFromMat4(nMatrix, mvMatrix);

  // gl.enable(gl.CULL_FACE);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.useProgram(moonShader);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.uniformMatrix3fv(moonShader.uNormalMatrix, false, nMatrix);
  gl.uniformMatrix4fv(moonShader.uMvMatrix, false, mvMatrix);
  gl.uniformMatrix4fv(moonShader.uPMatrix, false, pMatrix);
  gl.uniformMatrix4fv(moonShader.uCamMatrix, false, camMatrix);
  gl.uniform3fv(moonShader.uSunPos, sun.pos2);
  gl.uniform1f(moonShader.uMoonDis, Math.sqrt(moon.pos[0] ** 2 + moon.pos[1] ** 2 + moon.pos[2] ** 2));

  gl.uniform1i(moonShader.uSampler, 0); // point sampler to TEXTURE0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture); // bind texture to TEXTURE0

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
  gl.enableVertexAttribArray(moonShader.aTexCoord);
  gl.vertexAttribPointer(moonShader.aTexCoord, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
  gl.enableVertexAttribArray(moonShader.aVertexPosition);
  gl.vertexAttribPointer(moonShader.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
  gl.enableVertexAttribArray(moonShader.aVertexNormal);
  gl.vertexAttribPointer(moonShader.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
  gl.drawElements(gl.TRIANGLES, vertCount, gl.UNSIGNED_SHORT, 0);

  gl.disableVertexAttribArray(moonShader.aTexCoord);
  gl.disableVertexAttribArray(moonShader.aVertexPosition);
  gl.disableVertexAttribArray(moonShader.aVertexNormal);

  // gl.disable(gl.CULL_FACE);

  // Done Drawing
  return true;
};
export { moon };
