/* global
  gl
  orbitDisplay
*/
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
