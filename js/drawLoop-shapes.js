/* global

  gl
  shadersReady
  cruncherReady
  orbitDisplay

 */

// FOVBubble
(function () {
  function FOVBubble () {
    this.vertBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(72), gl.STREAM_DRAW);
  }
  FOVBubble.prototype.set = function () {
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
      -100.0, 100.0, -100.0
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(buf), gl.STREAM_DRAW);
  };
  FOVBubble.prototype.draw = function () {
    if (!shadersReady || !cruncherReady) return;
    var bubbleShader = orbitDisplay.getPathShader();

    gl.useProgram(bubbleShader);
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.uniform4fv(bubbleShader.uColor, [0.0, 1.0, 1.0, 0.2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.vertexAttribPointer(bubbleShader.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 24); // Mode, First Vertex, Number of Vertex
    gl.enable(gl.BLEND);
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
  Line.prototype.draw = function () {
    var shader = orbitDisplay.getPathShader();
    gl.useProgram(shader);
    gl.uniform4fv(shader.uColor, [1.0, 0.0, 1.0, 1.0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf);
    gl.vertexAttribPointer(shader.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 2);
  };

  window.Line = Line;
})();
