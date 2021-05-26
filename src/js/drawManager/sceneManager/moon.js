/* eslint-disable camelcase */
/* eslint-disable no-useless-escape */

// eslint-disable-next-line max-classes-per-file
import * as glm from '@app/js/lib/external/gl-matrix.js';
import { RAD2DEG } from '@app/js/lib/constants.js';
import { SunCalc } from '@app/js/lib/suncalc.js';
import { satellite } from '@app/js/lib/lookangles.js';

class Moon {
  static textureSrc = 'textures/moon-1024.jpg';

  constructor(gl, sun) {
    // Move to the code the creates the moon?
    if (settingsManager.enableLimitedUI || settingsManager.isDrawLess) return;

    // Setup References to World
    this.gl = gl;
    this.sun = sun;

    this.numLatSegs = 32;
    this.numLonSegs = 32;
    this.drawRadius = 4000;
    this.scalarDistance = 200000;

    // We draw the moon way closer than it actually is because of depthBuffer issues
    // Each draw loop we will scale the real position so it is consistent
    this.drawPosition = [0, 0, 0];

    // Create a gl program from the vert/frag shaders and geometry buffers
    this.init(gl);

    this.loaded = true;
  }

  init(gl) {
    const program = gl.createProgram();
    program.vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(program.vertShader, Moon.shaderCode.vert);
    gl.compileShader(program.vertShader);

    program.fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(program.fragShader, Moon.shaderCode.frag);
    gl.compileShader(program.fragShader);

    gl.attachShader(program, program.vertShader);
    gl.attachShader(program, program.fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var info = gl.getProgramInfoLog(program);
      throw new Error('Could not compile WebGL program. \n\n' + info);
    }
    this.program = program;

    const textureMap = {};
    textureMap.isReady = false;
    textureMap.texture = gl.createTexture();
    textureMap.img = new Image();
    textureMap.img.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, textureMap.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureMap.img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);

      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);

      textureMap.isReady = true;
    };
    textureMap.img.src = Moon.textureSrc;

    this.textureMap = textureMap;

    // Assign Attributes
    this.program.a_position = gl.getAttribLocation(this.program, 'position');
    this.program.a_normal = gl.getAttribLocation(this.program, 'normal');
    this.program.a_texcoord = gl.getAttribLocation(this.program, 'texcoord');
    this.program.u_pMatrix = gl.getUniformLocation(this.program, 'u_pMatrix');
    this.program.u_camMatrix = gl.getUniformLocation(this.program, 'u_camMatrix');
    this.program.u_mvMatrix = gl.getUniformLocation(this.program, 'u_mvMatrix');
    this.program.u_nMatrix = gl.getUniformLocation(this.program, 'u_nMatrix');
    this.program.u_sunPos = gl.getUniformLocation(this.program, 'u_sunPos');
    this.program.u_drawPosition = gl.getUniformLocation(this.program, 'u_drawPosition');
    this.program.u_sampler = gl.getUniformLocation(this.program, 'u_sampler');

    // generate a uvsphere bottom up, CCW order
    var vertPos = [];
    var vertNorm = [];
    var texCoord = [];
    for (let lat = 0; lat <= this.numLatSegs; lat++) {
      var latAngle = (Math.PI / this.numLatSegs) * lat - Math.PI / 2;
      var diskRadius = Math.cos(Math.abs(latAngle));
      var z = Math.sin(latAngle);
      // console.log('LAT: ' + latAngle * RAD2DEG + ' , Z: ' + z);
      // var i = 0;
      for (let lon = 0; lon <= this.numLonSegs; lon++) {
        // add an extra vertex for texture funness
        var lonAngle = ((Math.PI * 2) / this.numLonSegs) * lon;
        var x = Math.cos(lonAngle) * diskRadius;
        var y = Math.sin(lonAngle) * diskRadius;
        // console.log('i: ' + i + '    LON: ' + lonAngle * RAD2DEG + ' X: ' + x + ' Y: ' + y)

        // mercator cylindrical projection (simple angle interpolation)
        var v = 1 - lat / this.numLatSegs;
        var u = 0.5 + lon / this.numLonSegs; // may need to change to move map
        // console.log('u: ' + u + ' v: ' + v);
        // normals: should just be a vector from center to point (aka the point itself!

        vertPos.push(x * this.drawRadius);
        vertPos.push(y * this.drawRadius);
        vertPos.push(z * this.drawRadius);
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
    for (let lat = 0; lat < this.numLatSegs; lat++) {
      // this is for each QUAD, not each vertex, so <
      for (let lon = 0; lon < this.numLonSegs; lon++) {
        var blVert = lat * (this.numLonSegs + 1) + lon; // there's this.numLonSegs + 1 verts in each horizontal band
        var brVert = blVert + 1;
        var tlVert = (lat + 1) * (this.numLonSegs + 1) + lon;
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
    this.buffers = {};
    this.buffers.vertCount = vertIndex.length;

    this.buffers.texCoordBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texCoordBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoord), gl.STATIC_DRAW);

    this.buffers.vertPosBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

    this.buffers.vertNormBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);

    this.buffers.vertIndexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.vertIndexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertIndex), gl.STATIC_DRAW);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.texCoordBuf);
    gl.enableVertexAttribArray(this.program.a_texcoord);
    gl.vertexAttribPointer(this.program.a_texcoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertPosBuf);
    gl.enableVertexAttribArray(this.program.a_position);
    gl.vertexAttribPointer(this.program.a_position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertNormBuf);
    gl.enableVertexAttribArray(this.program.a_normal);
    gl.vertexAttribPointer(this.program.a_normal, 3, gl.FLOAT, false, 0, 0);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.vertIndexBuf);

    gl.bindVertexArray(null);
  }

  draw(pMatrix, camMatrix) {
    // Move this to the draw loop?
    if (!this.loaded) return;
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Set the uniforms
    this.update(this.sun);
    gl.uniformMatrix3fv(this.program.u_nMatrix, false, this.nMatrix);
    gl.uniformMatrix4fv(this.program.u_mvMatrix, false, this.mvMatrix);
    gl.uniformMatrix4fv(this.program.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.program.u_camMatrix, false, camMatrix);
    gl.uniform3fv(this.program.u_sunPos, this.sun.pos2);
    gl.uniform1f(this.program.u_drawPosition, Math.sqrt(this.drawPosition[0] ** 2 + this.drawPosition[1] ** 2 + this.drawPosition[2] ** 2));

    gl.uniform1i(this.program.u_sampler, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textureMap.texture);

    gl.drawElements(gl.TRIANGLES, this.buffers.vertCount, gl.UNSIGNED_SHORT, 0);
  }

  update(sun) {
    // Calculate RAE
    this.rae = SunCalc.getMoonPosition(sun.now, 0, 0);

    // RAE2ECF and then ECF2ECI
    this.position = satellite.ecfToEci(satellite.lookAnglesToEcf(180 + this.rae.azimuth * RAD2DEG, this.rae.altitude * RAD2DEG, this.rae.distance, 0, 0, 0), sun.sunvar.gmst);

    const scaleFactor = this.scalarDistance / Math.max(Math.max(Math.abs(this.position.x), Math.abs(this.position.y)), Math.abs(this.position.z));
    this.drawPosition[0] = this.position.x * scaleFactor;
    this.drawPosition[1] = this.position.y * scaleFactor;
    this.drawPosition[2] = this.position.z * scaleFactor;

    this.mvMatrix = glm.mat4.create();
    this.nMatrix = glm.mat3.create();
    glm.mat4.identity(this.mvMatrix);
    glm.mat4.translate(this.mvMatrix, this.mvMatrix, this.drawPosition);
    glm.mat3.normalFromMat4(this.nMatrix, this.mvMatrix);
  }

  static shaderCode = {
    frag: `#version 300 es
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif
  
      uniform sampler2D u_sampler;
      uniform vec3 u_sunPos;

      in vec2 v_texcoord;
      in vec3 v_normal;
      in float v_dist;

      out vec4 fragColor;
  
      void main(void) {
          // Sun is shining opposite of its direction from the center of the earth
          vec3 lightDirection = u_sunPos - vec3(0.0,0.0,0.0);

          // Normalize this to a max of 1.0
          lightDirection = normalize(lightDirection);
  
          // Smooth the light across the sphere
          float lightFromSun = max(dot(v_normal, lightDirection), 0.0)  * 1.0;
          
          // Calculate the color by merging the texture with the light
          vec3 litTexColor = texture(u_sampler, v_texcoord).rgb * (vec3(0.0025, 0.0025, 0.0025) + lightFromSun);
  
          // Don't draw the back of the sphere
          if (v_dist > 1.0) {
            discard;
          }
  
          fragColor = vec4(litTexColor, 1.0);
      }
      `,
    vert: `#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat3 u_nMatrix;
      uniform float u_drawPosition;
      
      in vec3 position;
      in vec2 texcoord;
      in vec3 normal;
    
      out vec2 v_texcoord;
      out vec3 v_normal;
      out float v_dist;
  
      void main(void) {
          vec4 position = u_mvMatrix * vec4(position, 1.0);
          gl_Position = u_pMatrix * u_camMatrix * position;

          // Ratio of the vertex distance compared to the center of the sphere
          // This lets us figure out which verticies are on the back half
          v_dist = distance(position.xyz,vec3(0.0,0.0,0.0)) \/ u_drawPosition;
          
          v_texcoord = texcoord;
          v_normal = u_nMatrix * normal;
      }
      `,
  };
}

export { Moon };
