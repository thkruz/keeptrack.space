/* eslint-disable camelcase */
import { keepTrackApi } from '@app/keepTrackApi';
import { vec3, vec4 } from 'gl-matrix';
import { GlUtils } from '../gl-utils';
import { LineManager } from '../line-manager';
import { Line } from './line';

/**
 * A line with a start and end point.
 *
 * It requires a precompiled shader program and its attributes to work.
 */
export abstract class Path extends Line {
  private pathLength_: number;
  referenceFrame: 'J2000' | 'TEME' = 'TEME';
  /** This flag is set to true when the line is no longer needed. The garbage collector will handle removing it */
  isGarbage = false;

  constructor(dataPoints = 2) {
    super(dataPoints);
  }

  /**
   * This assumes that LineManager.drawFirst has already run and LineManager.drawLast will run after all lines are drawn.
   */
  draw(gl: WebGL2RenderingContext, lineManager: LineManager): void {
    if (!this.isDraw_) {
      return;
    }

    gl.uniform4fv(lineManager.uniforms_.u_color, this.color_);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf_);
    gl.vertexAttribPointer(lineManager.attribs.a_position.location, 4, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.LINE_STRIP, 0, this.pathLength_);
  }

  abstract update(): void;

  updateVertBuf(points: vec3[]): void {
    const gl = keepTrackApi.getRenderer().gl;

    this.pathLength_ = points.length;
    // we need a vec4 for each point
    const vec4Points = points.map((p) => [p[0], p[1], p[2], 1.0]);

    GlUtils.bindBufferDynamicDraw(gl, this.vertBuf_, new Float32Array(vec4Points.flat()));
  }

  protected validateColor(color: vec4): void {
    if (color[0] < 0 || color[0] > 1 || color[1] < 0 || color[1] > 1 || color[2] < 0 || color[2] > 1 || color[3] < 0 || color[3] > 1) {
      throw new Error('Invalid color');
    }
  }
}
