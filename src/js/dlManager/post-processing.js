// Shaders should NOT be modified
/* eslint-disable no-useless-escape */

// Post Processing Manager
const pPM = {};
pPM.init = (gl) => {
  pPM.gl = gl;

  pPM.programs = {};
  pPM.programs.hdr = pPM.createProgram(pPM.shaderCode.hdr.vert, pPM.shaderCode.hdr.frag);
  pPM.programs.hdr = pPM.setupHdr(gl, pPM.programs.hdr);

  pPM.programs.occlusion = pPM.createProgram(pPM.shaderCode.occlusion.vert, pPM.shaderCode.occlusion.frag);
  pPM.programs.occlusion = pPM.setupOcclusion(gl, pPM.programs.occlusion);

  pPM.programs.gaussian = pPM.createProgram(pPM.shaderCode.gaussian.vert, pPM.shaderCode.gaussian.frag);
  pPM.programs.gaussian = pPM.setupGaussian(gl, pPM.programs.gaussian);

  pPM.frameBufferInfos = {};
  pPM.frameBufferInfos.one = pPM.createFrameBufferInfo(gl.drawingBufferWidth, gl.drawingBufferHeight);
  pPM.frameBufferInfos.two = pPM.createFrameBufferInfo(gl.drawingBufferWidth, gl.drawingBufferHeight);

  pPM.curBuffer = pPM.frameBufferInfos.one.frameBuffer;
};

pPM.createProgram = (vertCode, fragCode) => {
  const gl = pPM.gl;
  const program = gl.createProgram();
  program.vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(program.vertShader, vertCode);
  gl.compileShader(program.vertShader);

  program.fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(program.fragShader, fragCode);
  gl.compileShader(program.fragShader);

  gl.attachShader(program, program.vertShader);
  gl.attachShader(program, program.fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    var info = gl.getProgramInfoLog(program);
    throw new Error('Could not compile WebGL program. \n\n' + info);
  }
  return program;
};

pPM.setupHdr = (gl, program) => {
  program.attr = {
    position: gl.getAttribLocation(program, 'a_position'),
    texCoord: gl.getAttribLocation(program, 'a_texCoord'),
  };
  program.uniform = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    canvas: gl.getUniformLocation(program, 'u_canvas'),
  };
  program.uniformSetup = () => null;
  return program;
};

pPM.setupGaussian = (gl, program) => {
  program.attr = {
    position: gl.getAttribLocation(program, 'a_position'),
    texCoord: gl.getAttribLocation(program, 'a_texCoord'),
  };
  program.uniform = {
    resolution: gl.getUniformLocation(program, 'u_resolution'),
    canvas: gl.getUniformLocation(program, 'u_canvas'),
    radius: gl.getUniformLocation(program, 'u_radius'),
    dir: gl.getUniformLocation(program, 'u_dir'),
  };
  program.uniformValues = {
    radius: 10,
    dir: {
      x: 1.0,
      y: 0.0,
    },
  };
  program.uniformSetup = (program) => {
    gl.uniform1f(program.uniform.radius, program.uniformValues.radius);
    gl.uniform2f(program.uniform.dir, program.uniformValues.dir.x, program.uniformValues.dir.y);
  };
  return program;
};

pPM.setupOcclusion = (gl, program) => {
  program.attr = {
    position: gl.getAttribLocation(program, 'a_position'),
  };
  program.uniform = {
    uPMatrix: gl.getUniformLocation(program, 'uPMatrix'),
    uCamMatrix: gl.getUniformLocation(program, 'uCamMatrix'),
    uMvMatrix: gl.getUniformLocation(program, 'uMvMatrix'),
  };
  program.attrSetup = (program, vertPosBuf, stride) => {
    stride = stride || 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertPosBuf);
    gl.enableVertexAttribArray(program.attr.position);
    gl.vertexAttribPointer(program.attr.position, 3, gl.FLOAT, false, stride, 0);
  };
  program.attrOff = (program) => {
    gl.disableVertexAttribArray(program.attr.position);
  };
  program.uniformSetup = (program, mvMatrix, pMatrix, camMatrix) => {
    gl.uniformMatrix4fv(program.uniform.uMvMatrix, false, mvMatrix);
    gl.uniformMatrix4fv(program.uniform.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(program.uniform.uCamMatrix, false, camMatrix);
  };
  return program;
};

pPM.setupAdditionalUniforms = (program) => {
  program.uniformSetup(program);
};

pPM.createFrameBufferInfo = (width, height) => {
  const gl = pPM.gl;
  const frameBufferInfo = {};
  frameBufferInfo.width = width;
  frameBufferInfo.height = height;

  frameBufferInfo.buffers = {};
  frameBufferInfo.buffers.position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, frameBufferInfo.buffers.position);
  let x1 = 0;
  let x2 = 0 + width;
  let y1 = 0;
  let y2 = 0 + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);

  // provide texture coordinates for the rectangle.
  frameBufferInfo.buffers.texCoord = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, frameBufferInfo.buffers.texCoord);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);

  frameBufferInfo.texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, frameBufferInfo.texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // makes clearing work
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  frameBufferInfo.frameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBufferInfo.frameBuffer);

  frameBufferInfo.renderBuffer = gl.createRenderbuffer(); // create RB to store the depth buffer
  gl.bindRenderbuffer(gl.RENDERBUFFER, frameBufferInfo.renderBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, frameBufferInfo.texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, frameBufferInfo.renderBuffer);
  return frameBufferInfo;
};

pPM.switchFrameBuffer = () => {
  pPM.curBuffer = pPM.curBuffer == pPM.frameBufferInfos.one.frameBuffer ? pPM.frameBufferInfos.two.frameBuffer : pPM.frameBufferInfos.one.frameBuffer;
  pPM.secBuffer = pPM.curBuffer == pPM.frameBufferInfos.one.frameBuffer ? pPM.frameBufferInfos.two.frameBuffer : pPM.frameBufferInfos.one.frameBuffer;
};

pPM.getFrameBufferInfo = (curBuffer) => {
  const frameBufferInfo = curBuffer == pPM.frameBufferInfos.one.frameBuffer ? pPM.frameBufferInfos.one : pPM.frameBufferInfos.two;
  return frameBufferInfo;
};

pPM.clearAll = () => {
  const gl = pPM.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, pPM.frameBufferInfos.one.frameBuffer);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, pPM.frameBufferInfos.two.frameBuffer);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};

pPM.doPostProcessing = (gl, program, curBuffer, tgtBuffer) => {
  gl.useProgram(program);
  // Make sure pPM texture doesn't prevent the rest of the scene from rendering
  gl.depthMask(false);

  pPM.curFbi = pPM.getFrameBufferInfo(curBuffer);

  // Turn on the position attribute
  gl.enableVertexAttribArray(program.attr.position);
  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, pPM.curFbi.buffers.position);
  // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  gl.vertexAttribPointer(program.attr.position, 2, gl.FLOAT, false, 0, 0);

  // Turn on the texcoord attribute
  gl.enableVertexAttribArray(program.attr.texCoord);
  // bind the texcoord buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, pPM.curFbi.buffers.texCoord);
  // Tell the texcoord attribute how to get data out of texcoordBuffer (ARRAY_BUFFER)
  gl.vertexAttribPointer(program.attr.texCoord, 2, gl.FLOAT, false, 0, 0);

  // Load the original image
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, pPM.curFbi.texture);
  gl.uniform1i(program.uniform.canvas, 0);
  // set the resolution
  gl.uniform2f(program.uniform.resolution, gl.canvas.width, gl.canvas.height);

  pPM.setupAdditionalUniforms(program);

  // Draw the new version to the screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Future writing needs to have a depth test
  gl.depthMask(true);
};

pPM.shaderCode = {
  hdr: {
    frag: `
    precision mediump float;

    // our texture
    uniform sampler2D u_canvas;

    // the texCoords passed in from the vertex shader.
    varying vec2 v_texCoord;
    
    void main() {
      gl_FragColor = texture2D(u_canvas, v_texCoord);
    }
  `,
    vert: `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;

    uniform vec2 u_resolution;
    
    varying vec2 v_texCoord;
    
    void main() {
      // convert the rectangle from pixels to 0.0 to 1.0
      vec2 zeroToOne = a_position / u_resolution;
    
      // convert from 0->1 to 0->2
      vec2 zeroToTwo = zeroToOne * 2.0;
    
      // convert from 0->2 to -1->+1 (clipspace)
      vec2 clipSpace = zeroToTwo - 1.0;
    
      gl_Position = vec4(clipSpace, 0, 1);
    
      // pass the texCoord to the fragment shader
      // The GPU will interpolate pPM value between points.
      v_texCoord = a_texCoord;
    }
  `,
  },
  gaussian: {
    frag: `
    precision highp float;

    // our texture
    uniform sampler2D u_canvas;
    uniform vec2 u_resolution;
    uniform float u_radius;
    uniform vec2 u_dir;

    // the texCoords passed in from the vertex shader.
    varying vec2 v_texCoord;
    
    void main() {
      //this will be our RGBA sum
      vec4 sum = vec4(0.0);
      
      //our original texcoord for this fragment
      vec2 tc = v_texCoord;
      
      //the amount to blur, i.e. how far off center to sample from 
      //1.0 -> blur by one pixel
      //2.0 -> blur by two pixels, etc.
      float blur = u_radius / u_resolution[0];
        
      //the direction of our blur
      //(1.0, 0.0) -> x-axis blur
      //(0.0, 1.0) -> y-axis blur
      float hstep = u_dir[0];
      float vstep = u_dir[1];
        
      //apply blurring, using a 9-tap filter with predefined gaussian weights
        
      sum += texture2D(u_canvas, vec2(tc.x - 4.0*blur*hstep, tc.y - 4.0*blur*vstep)) * 0.0162162162;
      sum += texture2D(u_canvas, vec2(tc.x - 3.0*blur*hstep, tc.y - 3.0*blur*vstep)) * 0.0540540541;
      sum += texture2D(u_canvas, vec2(tc.x - 2.0*blur*hstep, tc.y - 2.0*blur*vstep)) * 0.1216216216;
      sum += texture2D(u_canvas, vec2(tc.x - 1.0*blur*hstep, tc.y - 1.0*blur*vstep)) * 0.1945945946;
      
      sum += texture2D(u_canvas, vec2(tc.x, tc.y)) * 0.2270270270;
      
      sum += texture2D(u_canvas, vec2(tc.x + 1.0*blur*hstep, tc.y + 1.0*blur*vstep)) * 0.1945945946;
      sum += texture2D(u_canvas, vec2(tc.x + 2.0*blur*hstep, tc.y + 2.0*blur*vstep)) * 0.1216216216;
      sum += texture2D(u_canvas, vec2(tc.x + 3.0*blur*hstep, tc.y + 3.0*blur*vstep)) * 0.0540540541;
      sum += texture2D(u_canvas, vec2(tc.x + 4.0*blur*hstep, tc.y + 4.0*blur*vstep)) * 0.0162162162;
    
      //discard alpha for our simple demo, multiply by vertex color and return
      gl_FragColor = vec4(sum.rgb, 1.0);
    }
  `,
    vert: `
    precision highp float;

    attribute vec2 a_position;
    attribute vec2 a_texCoord;

    uniform vec2 u_resolution;
    
    varying vec2 v_texCoord;
    
    void main() {
      // convert the rectangle from pixels to 0.0 to 1.0
      vec2 zeroToOne = a_position / u_resolution;
    
      // convert from 0->1 to 0->2
      vec2 zeroToTwo = zeroToOne * 2.0;
    
      // convert from 0->2 to -1->+1 (clipspace)
      vec2 clipSpace = zeroToTwo - 1.0;
    
      gl_Position = vec4(clipSpace, 0, 1);
    
      // pass the texCoord to the fragment shader
      // The GPU will interpolate pPM value between points.
      v_texCoord = a_texCoord;
    }
  `,
  },
  occlusion: {
    vert: `
              attribute vec3 a_position;
      
              uniform mat4 uCamMatrix;
              uniform mat4 uMvMatrix;
              uniform mat4 uPMatrix;
      
              void main(void) {
              vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(a_position, 1.0);
              gl_Position = position;
              }
          `,
    frag: `
              precision mediump float;
      
              void main(void) {
                  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
              }
          `,
  },
};

export { pPM };
