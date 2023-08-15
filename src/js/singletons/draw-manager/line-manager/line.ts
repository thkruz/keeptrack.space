/* eslint-disable camelcase */
import { EciArr3 } from '@app/js/interfaces';
import { vec4 } from 'gl-matrix';
import { GlUtils } from '../../../static/gl-utils';

/**
 * A line with a start and end point.
 *
 * It requires a precompiled shader program and its attributes to work.
 */
export class Line {
  private attribs_ = {
    a_position: 0,
  };

  private gl_: WebGL2RenderingContext;
  private uniforms_: { u_color: WebGLUniformLocation; u_camMatrix: WebGLUniformLocation; u_mvMatrix: WebGLUniformLocation; u_pMatrix: WebGLUniformLocation };
  private vertBuf_: WebGLBuffer;

  constructor(
    gl: WebGL2RenderingContext,
    attribs: {
      a_position: number;
    },
    uniforms: {
      u_color: WebGLUniformLocation;
      u_camMatrix: WebGLUniformLocation;
      u_mvMatrix: WebGLUniformLocation;
      u_pMatrix: WebGLUniformLocation;
    }
  ) {
    this.gl_ = gl;
    this.attribs_ = attribs;
    this.uniforms_ = uniforms;

    this.vertBuf_ = gl.createBuffer();
    GlUtils.bindBufferStreamDraw(gl, this.vertBuf_, new Float32Array(6));
  }

  /**
   * This assumes that LineManager.drawFirst has already run and LineManager.drawLast will run after all lines are drawn.
   */
  public draw(color = <vec4>[1.0, 1.0, 1.0, 1.0]) {
    if (color[0] < 0 || color[0] > 1 || color[1] < 0 || color[1] > 1 || color[2] < 0 || color[2] > 1 || color[3] < 0 || color[3] > 1) {
      throw new Error('Invalid color');
    }

    const gl = this.gl_;
    gl.uniform4fv(this.uniforms_.u_color, color);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf_);
    gl.vertexAttribPointer(this.attribs_.a_position, 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.LINES, 0, 2); // Draw
  }

  public set(pt1: EciArr3, pt2: EciArr3) {
    GlUtils.bindBufferStreamDraw(this.gl_, this.vertBuf_, new Float32Array([pt1[0], pt1[1], pt1[2], pt2[0], pt2[1], pt2[2]]));
  }
}
