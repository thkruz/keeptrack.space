/* global

  gl
  shadersReady
  cruncherReady
  orbitManager

 */

// FOVBubble

var fovBubbleShader;

(function () {
  function FOVBubble () {
    let fragShaderCode = `
    precision mediump float;

    uniform vec3 uLightDirection;
    varying vec3  vNormal;

    void main () {
      float directionalLightAmount = max(dot(vNormal, uLightDirection), 0.0);
      gl_FragColor    = vec4( ${settingsManager.atmosphereColor}, max(directionalLightAmount,0.025));
    }`;

    let vertShaderCode = `
      attribute vec3 aVertexPosition;
      attribute vec3 aVertexNormal;

      uniform mat4 uPMatrix;
      uniform mat4 uCamMatrix;
      uniform mat4 uMvMatrix;
      uniform mat3 uNormalMatrix;

      varying vec3 vNormal;

      void main(void) {
        gl_Position = uPMatrix * uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
        vNormal = normalize( uNormalMatrix * aVertexNormal );
      }`;

    var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragShaderCode);
    gl.compileShader(fragShader);

    var vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertShaderCode);
    gl.compileShader(vertShader);

    fovBubbleShader = gl.createProgram();
    gl.attachShader(fovBubbleShader, vertShader);
    gl.attachShader(fovBubbleShader, fragShader);
    gl.linkProgram(fovBubbleShader);

    this.vertBuf = gl.createBuffer();
    this.vertexCount = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(72), gl.STREAM_DRAW);
  }
  FOVBubble.prototype.set = function () {
    var camPos = getCamPos();

    var buf = [
      // Front face
      -100.0, -100.0, 100.0,
      100.0, -100.0, 100.0,
      100.0, 100.0, 100.0,
      -100.0, 100.0, 100.0,

      // Back face
      -100.0, -100.0, -100.0,
      -100.0, 100.0, -100.0,
      100.0, 100.0, -100.0,
      100.0, 100.0, -100.0,

      // Top face
      -100.0, 100.0, -100.0,
      -100.0, 100.0, 100.0,
      100.0, 100.0, 100.0,
      100.0, 100.0, -100.0,

      // Bottom face
      -100.0, -100.0, -100.0,
      100.0, -100.0, -100.0,
      100.0, -100.0, 100.0,
      -100.0, -100.0, 100.0,

      // Right face
      100.0, -100.0, -100.0,
      100.0, 100.0, -100.0,
      100.0, 100.0, 100.0,
      100.0, -100.0, 100.0,

      // Left face
      -100.0, -100.0, -100.0,
      -100.0, -100.0, 100.0,
      -100.0, 100.0, 100.0,
      -100.0, 100.0, -100.0,
    ];

    this.vertexCount = buf.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buf), gl.STREAM_DRAW);
  };
  FOVBubble.prototype.draw = function () {
    if (!settingsManager.shadersReady || !settingsManager.cruncherReady) return;
    var bubbleShader = orbitManager.getPathShader();

    gl.useProgram(bubbleShader);
    // Disable depth test
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.uniform4fv(bubbleShader.uColor, [0.0, 1.0, 1.0, 1.0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.vertexAttribPointer(bubbleShader.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawElements(gl.TRIANGLES, this.vertexCount, gl.UNSIGNED_SHORT, 0);

    // RESET GL for EARTH
  };

  window.FOVBubble = FOVBubble;
})();

// Line
(function () {
  function Line () {
    this.vertBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(6), gl.STREAM_DRAW);
  }
  Line.prototype.set = function (pt1, pt2) {
    var buf = [];
    buf.push(pt1[0]);
    buf.push(pt1[1]);
    buf.push(pt1[2]);
    buf.push(pt2[0]);
    buf.push(pt2[1]);
    buf.push(pt2[2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buf), gl.STREAM_DRAW);
  };
  Line.prototype.draw = function (color) {
    var shader = orbitManager.getPathShader();
    gl.useProgram(shader);
    if (typeof color == 'undefined') color = [1.0, 0.0, 1.0, 1.0];
    try {
      gl.uniform4fv(shader.uColor, color);
    }
    catch (e) {
      gl.uniform4fv(shader.uColor, [1.0, 0.0, 1.0, 1.0]);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.vertexAttribPointer(shader.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 2);
  };

  window.Line = Line;
})();
