/* eslint-disable camelcase */
/* eslint-disable no-useless-escape */

class Atmosphere {
  gl: any;
  earth: any;
  glm: any;
  numLatSegs: number;
  numLonSegs: number;
  drawPosition: number[];
  loaded: boolean;
  program: any;
  buffers: any;
  vao: any;
  nMatrix: any;
  mvMatrix: any;
  settingsManager: { enableLimitedUI: any; isDrawLess: any; atmosphereSize: any; };
  shaderCode: { frag: string; vert: string; };
  constructor(gl: any, earth: any, settingsManager: { enableLimitedUI: any; isDrawLess: any; atmosphereSize: any;}, glm: any) {
    // Move to the code the creates the moon?
    if (settingsManager.enableLimitedUI || settingsManager.isDrawLess) return;

    // Setup References to World
    this.gl = gl;
    this.earth = earth;
    this.glm = glm;
    this.settingsManager = settingsManager;

    this.shaderCode = {
      frag: `#version 300 es
          precision highp float;        
    
          uniform vec3 u_lightDirection;
          in vec3 v_normal;
          in float v_dist;
  
          out vec4 fragColor;
    
          void main () {
              float sunAmount = max(dot(v_normal, u_lightDirection), 0.1);
              float darkAmount = max(dot(v_normal, -u_lightDirection), 0.0);
              float a4 = pow(1.3 - v_dist / 2.0, 1.1) * 2.0;
              float r = 1.0 - sunAmount;
              float g = max(1.0 - sunAmount, 0.75) - darkAmount;
              float b = max(sunAmount, 0.8) - darkAmount;
              float a1 = min(sunAmount, 0.8) * 2.0;
              float a2 = min(pow(darkAmount / 1.15, 2.0),0.2);
              float a3 = pow(v_dist,2.0) * -1.0 + 1.2;
              float a = min(a1 - a2, a3) * a4;
              fragColor    = vec4(vec3(r,g,b), a);
          }
          `,
      vert: `#version 300 es
          in vec3 position;
          in vec3 normal;
    
          uniform mat4 u_pMatrix;
          uniform mat4 u_camMatrix;
          uniform mat4 u_mvMatrix;
          uniform mat3 u_nMatrix;
    
          out vec3 v_normal;
          out float v_dist;
    
          void main(void) {
              vec4 position1 = u_camMatrix * u_mvMatrix * vec4(position, 1.0);
              vec4 position0 = u_camMatrix * u_mvMatrix * vec4(vec3(0.0,0.0,0.0), 1.0);
              gl_Position = u_pMatrix * position1;
              v_dist = distance(position0.xz,position1.xz) \/ ${settingsManager.atmosphereSize}.0;
              v_normal = normalize( u_nMatrix * normal );
          }
          `,
    };

    this.numLatSegs = 64;
    this.numLonSegs = 64;

    // We draw the moon way closer than it actually is because of depthBuffer issues
    // Each draw loop we will scale the real position so it is consistent
    this.drawPosition = [0, 0, 0];

    // Create a gl program from the vert/frag shaders and geometry buffers
    this.init(gl);

    this.loaded = true;
  }

  init(gl: { createProgram: () => any; createShader: (arg0: any) => any; VERTEX_SHADER: any; shaderSource: (arg0: any, arg1: string) => void; compileShader: (arg0: any) => void; FRAGMENT_SHADER: any; attachShader: (arg0: any, arg1: any) => void; linkProgram: (arg0: any) => void; getProgramParameter: (arg0: any, arg1: any) => any; LINK_STATUS: any; getProgramInfoLog: (arg0: any) => any; getAttribLocation: (arg0: any, arg1: string) => any; getUniformLocation: (arg0: any, arg1: string) => any; createBuffer: () => any; bindBuffer: (arg0: any, arg1: any) => void; ARRAY_BUFFER: any; bufferData: (arg0: any, arg1: Float32Array | Uint16Array, arg2: any) => void; STATIC_DRAW: any; ELEMENT_ARRAY_BUFFER: any; createVertexArray: () => any; bindVertexArray: (arg0: any) => void; enableVertexAttribArray: (arg0: any) => void; vertexAttribPointer: (arg0: any, arg1: number, arg2: any, arg3: boolean, arg4: number, arg5: number) => void; FLOAT: any; }): void {
    const program = gl.createProgram();
    program.vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(program.vertShader, this.shaderCode.vert);
    gl.compileShader(program.vertShader);

    program.fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(program.fragShader, this.shaderCode.frag);
    gl.compileShader(program.fragShader);

    gl.attachShader(program, program.vertShader);
    gl.attachShader(program, program.fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var info = gl.getProgramInfoLog(program);
      throw new Error('Could not compile WebGL program. \n\n' + info);
    }
    this.program = program;

    // Assign Attributes
    this.program.aVertexPosition = gl.getAttribLocation(this.program, 'position');
    this.program.aVertexNormal = gl.getAttribLocation(this.program, 'normal');
    this.program.u_pMatrix = gl.getUniformLocation(this.program, 'u_pMatrix');
    this.program.u_camMatrix = gl.getUniformLocation(this.program, 'u_camMatrix');
    this.program.u_mvMatrix = gl.getUniformLocation(this.program, 'u_mvMatrix');
    this.program.u_nMatrix = gl.getUniformLocation(this.program, 'u_nMatrix');
    this.program.u_lightDirection = gl.getUniformLocation(this.program, 'u_lightDirection');

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

        vertPos.push(x * this.settingsManager.atmosphereSize);
        vertPos.push(y * this.settingsManager.atmosphereSize);
        vertPos.push(z * this.settingsManager.atmosphereSize);
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

    // Select the vertex position buffer
    // Enable the attribute
    // Set the attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertPosBuf);
    gl.enableVertexAttribArray(this.program.aVertexPosition);
    gl.vertexAttribPointer(this.program.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    // Select the vertex normals buffer
    // Enable the attribute
    // Set the attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vertNormBuf);
    gl.enableVertexAttribArray(this.program.aVertexNormal);
    gl.vertexAttribPointer(this.program.aVertexNormal, 3, gl.FLOAT, false, 0, 0);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.vertIndexBuf);

    gl.bindVertexArray(null);
  }

  draw(pMatrix: any, cameraManager: { camPitch: any; camMatrix: any; }): void {
    if (!this.loaded) return;
    const gl = this.gl;

    // Enable blending and ignore depth test (especially on self)
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Change to the atmosphere shader
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Set the uniforms
    this.update(cameraManager.camPitch);
    gl.uniformMatrix3fv(this.program.u_nMatrix, false, this.nMatrix);
    gl.uniformMatrix4fv(this.program.u_mvMatrix, false, this.mvMatrix);
    gl.uniformMatrix4fv(this.program.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.program.u_camMatrix, false, cameraManager.camMatrix);
    gl.uniform3fv(this.program.u_lightDirection, this.earth.lightDirection);

    // Draw everythign to screen
    gl.drawElements(gl.TRIANGLES, this.buffers.vertCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    // Disable blending and reeneable depth test
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
  }

  update(camPitch: number): void {
    // Start with an empyy model view matrix
    this.mvMatrix = this.glm.mat4.create();

    this.glm.mat4.identity(this.mvMatrix);
    // Rotate model view matrix to prevent lines showing as camera rotates
    this.glm.mat4.rotateY(this.mvMatrix, this.mvMatrix, 90 * (Math.PI / 180) - camPitch);
    // Scale the atmosphere to 0,0,0 - needed?
    this.glm.mat4.translate(this.mvMatrix, this.mvMatrix, [0, 0, 0]);
    // Calculate normals
    this.nMatrix = this.glm.mat3.create();
    this.glm.mat3.normalFromMat4(this.nMatrix, this.mvMatrix);
  }  
}

export { Atmosphere };
