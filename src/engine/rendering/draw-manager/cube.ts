import { BufferAttribute } from '@app/engine/rendering/buffer-attribute';
import { WebGlProgramHelper } from '@app/engine/rendering/webgl-program';
import { mat3, mat4, vec3, vec4 } from 'gl-matrix';
import { BaseObject, EciVec3, Kilometers } from '@ootk/src/main';
import { GlUtils } from '../gl-utils';
import { glsl } from '@app/engine/utils/development/formatter';

/* eslint-disable no-useless-escape */
/* eslint-disable camelcase */

export class Box {
  drawSizeW = <Kilometers>0; // Disabled by default
  drawSizeU = <Kilometers>0; // Disabled by default
  drawSizeV = <Kilometers>0; // Disabled by default

  /**
   * Sets the size of the cube.
   * @param {Kilometers} u - The distance from the center of the object to the outside of the box along the radial axis.
   * @param {Kilometers} v - The distance from the center of the object to the outside of the box along the in-track axis.
   * @param {Kilometers} w - The distance from the center of the object to the outside of the box along the cross-track axis.
   */
  setCubeSize(u: Kilometers, v: Kilometers, w: Kilometers) {
    /*
     * When scaling the cube our axis aren't correct. They are labeled as u, v, w but they are actually v, w, u.
     * So we need to swap them around.
     */

    // intrack, crosstrack, radial

    this.drawSizeV = <Kilometers>(u * 2);
    this.drawSizeW = <Kilometers>(v * 2);
    this.drawSizeU = <Kilometers>(w * 2);
  }

  private attribs_ = {
    a_position: new BufferAttribute({
      location: 0,
      vertices: 3,
      offset: 0,
      stride: Float32Array.BYTES_PER_ELEMENT * 6,
    }),
    a_normal: new BufferAttribute({
      location: 1,
      vertices: 3,
      offset: Float32Array.BYTES_PER_ELEMENT * 3,
      stride: Float32Array.BYTES_PER_ELEMENT * 6,
    }),
  };

  private buffers_ = {
    vertCount: 0,
    combinedBuf: null as unknown as WebGLBuffer,
    vertPosBuf: null as unknown as WebGLBuffer,
    vertNormBuf: null as unknown as WebGLBuffer,
    vertIndexBuf: null as unknown as WebGLBuffer,
  };

  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  private mvMatrix_: mat4;
  private nMatrix_ = mat3.create();
  private program_: WebGLProgram;

  private textureMap_ = {
    src: <string><unknown>null,
    texture: <WebGLTexture><unknown>null,
  };

  private uniforms_ = {
    u_nMatrix: <WebGLUniformLocation><unknown>null,
    u_pMatrix: <WebGLUniformLocation><unknown>null,
    u_camMatrix: <WebGLUniformLocation><unknown>null,
    u_mvMatrix: <WebGLUniformLocation><unknown>null,
    u_color: <WebGLUniformLocation><unknown>null,
  };

  private color_ = [0.5, 0.5, 0.5, 0.5]; // Set color to gray with alpha

  private vao: WebGLVertexArrayObject;

  drawPosition = [0, 0, 0] as vec3;
  eci: EciVec3;

  setColor(color: vec4) {
    this.color_[0] = color[0];
    this.color_[1] = color[1];
    this.color_[2] = color[2];
    this.color_[3] = color[3];
  }

  draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer = null as WebGLFramebuffer | null) {
    if (!this.isLoaded_) {
      return;
    }
    if (this.drawPosition[0] === 0 && this.drawPosition[1] === 0 && this.drawPosition[2] === 0) {
      return;
    }

    const gl = this.gl_;

    gl.useProgram(this.program_);
    if (tgtBuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);
    }

    // Set the uniforms
    gl.uniformMatrix3fv(this.uniforms_.u_nMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniform4fv(this.uniforms_.u_color, this.color_);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.buffers_.vertCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    // Disable alpha blending
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  forceLoaded() {
    this.isLoaded_ = true;
  }

  init(gl: WebGL2RenderingContext): void {
    this.gl_ = gl;
    this.textureMap_.src = `${settingsManager.installDirectory}textures/moon-1024.jpg`;

    this.initProgram_();
    this.initBuffers_();
    this.initVao_();
    this.isLoaded_ = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(obj: BaseObject | null, _selectedDate?: Date) {
    if (!this.isLoaded_) {
      return;
    }
    if (!obj?.position) {
      this.drawPosition[0] = 0;
      this.drawPosition[1] = 0;
      this.drawPosition[2] = 0;

      return;
    }

    this.drawPosition[0] = obj.position.x;
    this.drawPosition[1] = obj.position.y;
    this.drawPosition[2] = obj.position.z;

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);
    mat4.translate(this.mvMatrix_, this.mvMatrix_, this.drawPosition);

    // Calculate a position to look at along the satellite's velocity vector
    const lookAtPos = [obj.position.x + obj.velocity.x, obj.position.y + obj.velocity.y, obj.position.z + obj.velocity.z];

    // Normalize an up vector to the satellite's position from the center of the earth
    const up = vec3.normalize(vec3.create(), this.drawPosition);

    mat4.targetTo(this.mvMatrix_, this.drawPosition, lookAtPos, up);

    // Scale the cube to the correct size
    mat4.scale(this.mvMatrix_, this.mvMatrix_, [this.drawSizeU, this.drawSizeV, this.drawSizeW]);

    // Calculate the normal matrix
    mat3.normalFromMat4(this.nMatrix_, this.mvMatrix_);
  }

  private initBuffers_() {
    const { combinedArray, vertIndex } = GlUtils.cube();

    this.buffers_.vertCount = vertIndex.length;
    this.buffers_.combinedBuf = GlUtils.createArrayBuffer(this.gl_, new Float32Array(combinedArray));
    this.buffers_.vertIndexBuf = GlUtils.createElementArrayBuffer(this.gl_, new Uint16Array(vertIndex));
  }

  private initProgram_() {
    const gl = this.gl_;

    this.program_ = new WebGlProgramHelper(gl, this.shaders_.vert, this.shaders_.frag).program;
    this.gl_.useProgram(this.program_);

    // Assign Attributes
    GlUtils.assignAttributes(this.attribs_, gl, this.program_, ['a_position', 'a_normal']);
    GlUtils.assignUniforms(this.uniforms_, gl, this.program_, ['u_pMatrix', 'u_camMatrix', 'u_mvMatrix', 'u_nMatrix', 'u_color']);
  }

  private initVao_() {
    const gl = this.gl_;
    // Make New Vertex Array Objects

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers_.combinedBuf);
    gl.enableVertexAttribArray(this.attribs_.a_position.location);
    gl.vertexAttribPointer(this.attribs_.a_position.location, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 6, 0);

    gl.enableVertexAttribArray(this.attribs_.a_normal.location);
    gl.vertexAttribPointer(this.attribs_.a_normal.location, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 6, Float32Array.BYTES_PER_ELEMENT * 3);

    // Select the vertex indicies buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers_.vertIndexBuf);

    gl.bindVertexArray(null);
  }

  private shaders_ = {
    frag: glsl`#version 300 es
      precision mediump float;
      in vec3 v_normal;
      out vec4 fragColor;
      uniform vec4 u_color;

      void main(void) {
        fragColor = vec4(u_color.rgb * u_color.a, u_color.a);
      }
    `,
    vert: glsl`#version 300 es
      uniform mat4 u_pMatrix;
      uniform mat4 u_camMatrix;
      uniform mat4 u_mvMatrix;
      uniform mat3 u_nMatrix;

      in vec3 a_position;
      in vec3 a_normal;

      out vec3 v_normal;

      void main(void) {
          vec4 position = u_mvMatrix * vec4(a_position, 1.0);
          gl_Position = u_pMatrix * u_camMatrix * position;
          v_normal = u_nMatrix * a_normal;
      }
      `,
  };
}
