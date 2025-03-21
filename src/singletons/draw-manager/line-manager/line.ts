/* eslint-disable camelcase */
import { EciArr3 } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { vec4 } from 'gl-matrix';
import { GlUtils } from '../../../static/gl-utils';
import { LineManager } from '../line-manager';

export type LineColor = typeof LineColors[keyof typeof LineColors] | vec4;

export const LineColors = {
  RED: [1.0, 0.0, 0.0, 1.0] as vec4,
  ORANGE: [1.0, 0.5, 0.0, 1.0] as vec4,
  YELLOW: [1.0, 1.0, 0.0, 1.0] as vec4,
  GREEN: [0.0, 1.0, 0.0, 1.0] as vec4,
  BLUE: [0.0, 0.0, 1.0, 1.0] as vec4,
  CYAN: [0.0, 1.0, 1.0, 1.0] as vec4,
  PURPLE: [1.0, 0.0, 1.0, 1.0] as vec4,
  WHITE: [1.0, 1.0, 1.0, 1.0] as vec4,
};

/**
 * A line with a start and end point.
 *
 * It requires a precompiled shader program and its attributes to work.
 */
export abstract class Line {
  private readonly vertBuf_: WebGLBuffer;
  protected color_: vec4;
  protected isDraw_ = true;
  /** This flag is set to true when the line is no longer needed. The garbage collector will handle removing it */
  isGarbage = false;

  constructor() {
    const gl = keepTrackApi.getRenderer().gl;

    this.vertBuf_ = gl.createBuffer();
    GlUtils.bindBufferStreamDraw(gl, this.vertBuf_, new Float32Array(6));
  }

  /**
   * This assumes that LineManager.drawFirst has already run and LineManager.drawLast will run after all lines are drawn.
   */
  draw(lineManager: LineManager): void {
    if (!this.isDraw_) {
      return;
    }

    const gl = keepTrackApi.getRenderer().gl;

    gl.uniform4fv(lineManager.uniforms_.u_color, this.color_);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf_);
    gl.vertexAttribPointer(lineManager.attribs.a_position.location, 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.LINES, 0, 2);
  }

  abstract update(): void;

  updateVertBuf(pt1: EciArr3, pt2: EciArr3) {
    const gl = keepTrackApi.getRenderer().gl;

    GlUtils.bindBufferStreamDraw(gl, this.vertBuf_, new Float32Array([pt1[0], pt1[1], pt1[2], pt2[0], pt2[1], pt2[2]]));
  }

  protected validateColor(color: vec4): void {
    if (color[0] < 0 || color[0] > 1 || color[1] < 0 || color[1] > 1 || color[2] < 0 || color[2] > 1 || color[3] < 0 || color[3] > 1) {
      throw new Error('Invalid color');
    }
  }
}
