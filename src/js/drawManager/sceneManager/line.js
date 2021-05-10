class Line {
  #gl = null;
  #shader = null;

  constructor(gl, shader) {
    this.#gl = gl;
    this.#shader = shader;
    this.vertBuf = this.#gl.createBuffer();
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.vertBuf);
    this.#gl.bufferData(this.#gl.ARRAY_BUFFER, new Float32Array(6), this.#gl.STREAM_DRAW);
  }

  set(pt1, pt2) {
    var buf = [];
    buf.push(pt1[0]);
    buf.push(pt1[1]);
    buf.push(pt1[2]);
    buf.push(pt2[0]);
    buf.push(pt2[1]);
    buf.push(pt2[2]);
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.vertBuf);
    this.#gl.bufferData(this.#gl.ARRAY_BUFFER, new Float32Array(buf), this.#gl.STREAM_DRAW);
  }

  draw(color) {
    this.#gl.bindFramebuffer(this.#gl.FRAMEBUFFER, null);
    this.#gl.useProgram(this.#shader);
    if (typeof color == 'undefined') color = [1.0, 0.0, 1.0, 1.0];
    try {
      this.#gl.uniform4fv(this.#shader.uColor, color);
    } catch (e) {
      /* istanbul ignore next */
      this.#gl.uniform4fv(this.#shader.uColor, [1.0, 0.0, 1.0, 1.0]);
    }
    this.#gl.bindBuffer(this.#gl.ARRAY_BUFFER, this.vertBuf);
    this.#gl.vertexAttribPointer(this.#shader.aPos, 3, this.#gl.FLOAT, false, 0, 0);
    this.#gl.enableVertexAttribArray(this.#shader.aPos);
    this.#gl.drawArrays(this.#gl.LINES, 0, 2);

    this.#gl.disableVertexAttribArray(this.#shader.aColor);

    this.#gl.disable(this.#gl.BLEND);
    this.#gl.enable(this.#gl.DEPTH_TEST);
  }
}

export { Line };
