// Shaders should NOT be modified
/* eslint-disable no-useless-escape */

import * as glm from '@app/js/lib/external/gl-matrix.js';
import { MILLISECONDS_PER_DAY, RAD2DEG } from '@app/js/lib/constants.js';
import { A } from '@app/js/lib/external/meuusjs.js';
import { satellite } from '@app/js/lib/lookangles.js';

let mvMatrixEmpty = glm.mat4.create();
let nMatrixEmpty = glm.mat3.create();
const NUM_LAT_SEGS = 64;
const NUM_LON_SEGS = 64;
const RADIUS_OF_DRAW_SUN = 6000;
const SUN_SCALAR_DISTANCE = 220000;
var gl, earth, timeManager;

let vertPosBuf, vertNormBuf, vertIndexBuf; // GPU mem buffers, data and stuff?
let mvMatrix;
let nMatrix;
let sunShader;
let sunMaxDist;

var sun = {};
sun.sunvar = {};
sun.pos = [0, 0, 0];
sun.pos2 = [0, 0, 0];
sun.shader = {
  frag: `#version 300 es
    precision highp float;
    uniform vec3 uLightDirection;

    in vec3 vNormal;    
    in float vDist2;

    out vec4 fragColor;

    void main(void) {
        // Hide the Back Side of the Sphere to prevent duplicate suns
        float a = max(dot(vNormal, -uLightDirection), 0.1);                        
        // Set colors
        float r = 1.0 * a;
        float g = 1.0 * a;
        float b = 0.9 * a;

        if (vDist2 > 1.0) {
        discard;
        }

        fragColor = vec4(vec3(r,g,b), a);
    }  
    `,
  vert: `#version 300 es
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;

    uniform mat4 uPMatrix;
    uniform mat4 uCamMatrix;
    uniform mat4 uMvMatrix;
    uniform mat3 uNormalMatrix;
    uniform float uSunDis;

    out vec3 vNormal;    
    out float vDist2;

    void main(void) {
        vec4 position = uMvMatrix * vec4(aVertexPosition / 1.6, 1.0);        
        gl_Position = uPMatrix * uCamMatrix * position;         
        vDist2 = distance(position.xyz,vec3(0.0,0.0,0.0)) / uSunDis;
        vNormal = uNormalMatrix * aVertexNormal;
    }
  `,
};

sun.init = async (glRef, earthRef, timeManagerRef) => {
  try {
    gl = glRef;
    earth = earthRef;
    timeManager = timeManagerRef;
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
      // console.log('LAT: ' + latAngle * RAD2DEG + ' , Z: ' + z);
      // var i = 0;
      for (let lon = 0; lon <= NUM_LON_SEGS; lon++) {
        // add an extra vertex for texture funness
        var lonAngle = ((Math.PI * 2) / NUM_LON_SEGS) * lon;
        var x = Math.cos(lonAngle) * diskRadius;
        var y = Math.sin(lonAngle) * diskRadius;
        // console.log('i: ' + i + '    LON: ' + lonAngle * RAD2DEG + ' X: ' + x + ' Y: ' + y)

        // mercator cylindrical projection (simple angle interpolation)
        var v = 1 - lat / NUM_LAT_SEGS;
        var u = 0.5 + lon / NUM_LON_SEGS; // may need to change to move map
        // console.log('u: ' + u + ' v: ' + v);
        // normals: should just be a vector from center to point (aka the point itself!

        vertPos.push(x * RADIUS_OF_DRAW_SUN);
        vertPos.push(y * RADIUS_OF_DRAW_SUN);
        vertPos.push(z * RADIUS_OF_DRAW_SUN);
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
    sun.vertCount = vertIndex.length;

    vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

    vertNormBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

    vertIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);

    sun.setupGodrays(gl);

    sun.loaded = true;
  } catch (error) {
    /* istanbul ignore next */
    console.error(error);
  }
};

sun.setupGodrays = (gl) => {
  sun.godraysProgram = gl.createProgram();
  {
    sun.godraysProgram.vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(sun.godraysProgram.vertShader, sun.godraysShaderCode.vert);
    gl.compileShader(sun.godraysProgram.vertShader);

    sun.godraysProgram.fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(sun.godraysProgram.fragShader, sun.godraysShaderCode.frag);
    gl.compileShader(sun.godraysProgram.fragShader);

    gl.attachShader(sun.godraysProgram, sun.godraysProgram.vertShader);
    gl.attachShader(sun.godraysProgram, sun.godraysProgram.fragShader);
  }
  gl.linkProgram(sun.godraysProgram);

  sun.positionLocation = gl.getAttribLocation(sun.godraysProgram, 'a_position');
  sun.texcoordLocation = gl.getAttribLocation(sun.godraysProgram, 'a_texCoord');

  // lookup uniforms
  sun.uSunPosition = gl.getUniformLocation(sun.godraysProgram, 'u_sunPosition');
  sun.uCanvasSampler = gl.getUniformLocation(sun.godraysProgram, 'uCanvasSampler');
  sun.resolutionLocation = gl.getUniformLocation(sun.godraysProgram, 'u_resolution');

  sun.positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sun.positionBuffer);
  let x1 = 0;
  let x2 = 0 + gl.drawingBufferWidth;
  let y1 = 0;
  let y2 = 0 + gl.drawingBufferHeight;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);

  // provide texture coordinates for the rectangle.
  sun.texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sun.texcoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);

  sun.godraysTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, sun.godraysTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  ////////////////////////////////////////////////////////////////////////
  sun.godraysFrameBuffer = gl.createFramebuffer();
  {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sun.godraysFrameBuffer);

    sun.godraysRenderBuffer = gl.createRenderbuffer(); // create RB to store the depth buffer
    gl.bindRenderbuffer(gl.RENDERBUFFER, sun.godraysRenderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sun.godraysTexture, 0);
  }
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, sun.godraysRenderBuffer);
};

sun.update = () => {
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
  sun.sunvar.j += sun.now.getUTCMilliseconds() * MILLISECONDS_PER_DAY;
  sun.sunvar.gmst = satellite.gstime(sun.sunvar.j);
  sun.sunvar.jdo = new A.JulianDay(sun.sunvar.j); // now
  sun.sunvar.coord = A.EclCoord.fromWgs84(0, 0, 0);

  // AZ / EL Calculation
  sun.sunvar.tp = A.Solar.topocentricPosition(sun.sunvar.jdo, sun.sunvar.coord, false);
  sun.sunvar.azimuth = sun.sunvar.tp.hz.az * RAD2DEG + (180 % 360);
  sun.sunvar.elevation = (sun.sunvar.tp.hz.alt * RAD2DEG) % 360;

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
  sun.pos[0] = (sun.realXyz.x / sunMaxDist) * SUN_SCALAR_DISTANCE;
  sun.pos[1] = (sun.realXyz.y / sunMaxDist) * SUN_SCALAR_DISTANCE;
  sun.pos[2] = (sun.realXyz.z / sunMaxDist) * SUN_SCALAR_DISTANCE;
  sun.pos2[0] = sun.pos[0] * 100;
  sun.pos2[1] = sun.pos[1] * 100;
  sun.pos2[2] = sun.pos[2] * 100;
};

sun.draw = function (pMatrix, camMatrix, tgtBuffer) {
  if (!sun.loaded) return;

  sun.sunScreenPosition = sun.getScreenCoords(pMatrix, camMatrix);

  mvMatrix = mvMatrixEmpty;
  glm.mat4.identity(mvMatrix);

  glm.mat4.translate(mvMatrix, mvMatrix, sun.pos);

  nMatrix = nMatrixEmpty;
  glm.mat3.normalFromMat4(nMatrix, mvMatrix);

  gl.useProgram(sunShader);
  // Draw to the bloom frame buffer for post processing
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

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
  gl.drawElements(gl.TRIANGLES, sun.vertCount, gl.UNSIGNED_SHORT, 0);
};

sun.godraysPostProcessing = (gl, tgtBuffer) => {
  gl.useProgram(sun.godraysProgram);

  // Draw the new version to the screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

  // Make sure this texture doesn't prevent the rest of the scene from rendering
  gl.depthMask(false);

  // Turn on the position attribute
  gl.enableVertexAttribArray(sun.positionLocation);
  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, sun.positionBuffer);
  // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  gl.vertexAttribPointer(sun.positionLocation, 2, gl.FLOAT, false, 0, 0);

  // Turn on the texcoord attribute
  gl.enableVertexAttribArray(sun.texcoordLocation);
  // bind the texcoord buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, sun.texcoordBuffer);
  // Tell the texcoord attribute how to get data out of texcoordBuffer (ARRAY_BUFFER)
  gl.vertexAttribPointer(sun.texcoordLocation, 2, gl.FLOAT, false, 0, 0);

  // Load the original image
  gl.uniform1i(sun.uCanvasSampler, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sun.godraysTexture);
  // Identify where the sun is in the picture
  gl.uniform2f(sun.uSunPosition, sun.sunScreenPosition.x, sun.sunScreenPosition.y);
  // set the resolution
  gl.uniform2f(sun.resolutionLocation, gl.canvas.width, gl.canvas.height);

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Future writing needs to have a depth test
  gl.depthMask(true);
};

sun.getScreenCoords = (pMatrix, camMatrix) => {
  const posVec4 = glm.vec4.fromValues(sun.pos[0], sun.pos[1], sun.pos[2], 1);

  glm.vec4.transformMat4(posVec4, posVec4, camMatrix);
  glm.vec4.transformMat4(posVec4, posVec4, pMatrix);

  // In 0.0 to 1.0 space
  sun.sunScreenPositionArray = {};
  sun.sunScreenPositionArray.x = posVec4[0] / posVec4[3];
  sun.sunScreenPositionArray.y = posVec4[1] / posVec4[3];
  // sun.sunScreenPositionArray.z = posVec4[2] / posVec4[3];

  sun.sunScreenPositionArray.x = (sun.sunScreenPositionArray.x + 1) * 0.5; // * window.innerWidth;
  sun.sunScreenPositionArray.y = (-sun.sunScreenPositionArray.y + 1) * 0.5; // * window.innerHeight;

  return sun.sunScreenPositionArray;
};

sun.godraysShaderCode = {
  frag: `#version 300 es    
    precision mediump float;

    // our texture
    uniform sampler2D uCanvasSampler;

    uniform vec2 u_sunPosition;
    
    // the texCoords passed in from the vertex shader.
  in vec2 v_texCoord;

  out vec4 fragColor;
    
    void main() {
      float decay=1.0;
      float exposure=1.0;
      float density=1.0;
      float weight=0.021;
      vec2 lightPositionOnScreen = vec2(u_sunPosition.x,1.0 - u_sunPosition.y);      
      vec2 texCoord = v_texCoord;

      /// samples will describe the rays quality, you can play with
      const int samples = 75;      

      vec2 deltaTexCoord = (v_texCoord - lightPositionOnScreen.xy);
      deltaTexCoord *= 1.0 / float(samples) * density;
      float illuminationDecay = 1.0;
    vec4 color = texture(uCanvasSampler, texCoord.xy);
      
      for(int i= 0; i <= samples ; i++)
      {
          if(samples < i) {
            break;
          }
          texCoord -= deltaTexCoord;
        vec4 texSample = texture(uCanvasSampler, texCoord);
        texSample *= illuminationDecay * weight;
        color += texSample;
          illuminationDecay *= decay;
      }
        color *= exposure;
    fragColor = color;
    }
  `,
  vert: `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;

    uniform vec2 u_resolution;
    
    out vec2 v_texCoord;
    
    void main() {
      // convert the rectangle from pixels to 0.0 to 1.0
      vec2 zeroToOne = a_position / u_resolution;
    
      // convert from 0->1 to 0->2
      vec2 zeroToTwo = zeroToOne * 2.0;
    
      // convert from 0->2 to -1->+1 (clipspace)
      vec2 clipSpace = zeroToTwo - 1.0;
    
      gl_Position = vec4(clipSpace, 0, 1);
    
      // pass the texCoord to the fragment shader
      // The GPU will interpolate this value between points.
      v_texCoord = a_texCoord;
    }
  `,
};

export { sun };
