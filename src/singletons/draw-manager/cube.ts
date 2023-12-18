import { SatObject } from '@app/js/interfaces';
import { BufferAttribute } from '@app/js/static/buffer-attribute';
import { WebGlProgramHelper } from '@app/js/static/webgl-program';
import { mat3, mat4, vec3 } from 'gl-matrix';
import * as Ootk from 'ootk';
import { Kilometers } from 'ootk';
import { keepTrackApi } from '../../keepTrackApi';
import { GlUtils } from '../../static/gl-utils';

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
  public setCubeSize(u: Kilometers, v: Kilometers, w: Kilometers) {
    // When scaling the cube our axis aren't correct. They are labeled as u, v, w but they are actually v, w, u.
    // So we need to swap them around.

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
    combinedBuf: null as WebGLBuffer,
    vertPosBuf: null as WebGLBuffer,
    vertNormBuf: null as WebGLBuffer,
    vertIndexBuf: null as WebGLBuffer,
  };

  private gl_: WebGL2RenderingContext;
  private isLoaded_ = false;
  private mvMatrix_: mat4;
  private nMatrix_ = mat3.create();
  private program_: WebGLProgram;
  private shaders_ = {
    frag: keepTrackApi.glsl`#version 300 es
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif

      in vec3 v_normal;

      out vec4 fragColor;

      void main(void) {
        fragColor = vec4(0.2, 0.0, 0.0, 0.2);
      }
      `,
    vert: keepTrackApi.glsl`#version 300 es
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

  private textureMap_ = {
    src: <string>null,
    texture: <WebGLTexture>null,
  };

  private uniforms_ = {
    u_nMatrix: <WebGLUniformLocation>null,
    u_pMatrix: <WebGLUniformLocation>null,
    u_camMatrix: <WebGLUniformLocation>null,
    u_mvMatrix: <WebGLUniformLocation>null,
  };

  private vao: WebGLVertexArrayObject;

  public drawPosition = [0, 0, 0] as vec3;
  public eci: Ootk.EciVec3;

  public draw(pMatrix: mat4, camMatrix: mat4, tgtBuffer?: WebGLFramebuffer) {
    if (!this.isLoaded_) return;
    if (this.drawPosition[0] === 0 && this.drawPosition[1] === 0 && this.drawPosition[2] === 0) return;

    const gl = this.gl_;

    gl.useProgram(this.program_);
    if (tgtBuffer) gl.bindFramebuffer(gl.FRAMEBUFFER, tgtBuffer);

    // Set the uniforms
    gl.uniformMatrix3fv(this.uniforms_.u_nMatrix, false, this.nMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_mvMatrix, false, this.mvMatrix_);
    gl.uniformMatrix4fv(this.uniforms_.u_pMatrix, false, pMatrix);
    gl.uniformMatrix4fv(this.uniforms_.u_camMatrix, false, camMatrix);

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.buffers_.vertCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);

    // Disable alpha blending
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.BLEND);
  }

  public forceLoaded() {
    this.isLoaded_ = true;
  }

  public async init(gl: WebGL2RenderingContext): Promise<void> {
    this.gl_ = gl;
    this.textureMap_.src = `${settingsManager.installDirectory}textures/moon-1024.jpg`;

    this.initProgram_();
    this.initBuffers_();
    this.initVao_();
    this.isLoaded_ = true;
  }

  public update(sat: SatObject, _selectedDate?: Date) {
    if (!this.isLoaded_) return;
    if (!sat || !sat.position) {
      this.drawPosition[0] = 0;
      this.drawPosition[1] = 0;
      this.drawPosition[2] = 0;
      return;
    }

    this.drawPosition[0] = sat.position.x;
    this.drawPosition[1] = sat.position.y;
    this.drawPosition[2] = sat.position.z;

    this.mvMatrix_ = mat4.create();
    mat4.identity(this.mvMatrix_);
    mat4.translate(this.mvMatrix_, this.mvMatrix_, this.drawPosition);

    // Calculate a position to look at along the satellite's velocity vector
    const lookAtPos = [sat.position.x + sat.velocity.x, sat.position.y + sat.velocity.y, sat.position.z + sat.velocity.z];

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
    GlUtils.assignUniforms(this.uniforms_, gl, this.program_, ['u_pMatrix', 'u_camMatrix', 'u_mvMatrix', 'u_nMatrix']);
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
}
