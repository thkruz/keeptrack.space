/* eslint-disable camelcase */
import { SolarBody } from '@app/engine/core/interfaces';
import { Scene } from '@app/engine/core/scene';
import { settingsManager } from '@app/settings/settings';
import { vec3, vec4 } from 'gl-matrix';
import { GlUtils } from '../gl-utils';
import { LineManager } from '../line-manager';
import { Line } from './line';
import { ServiceLocator } from '@app/engine/core/service-locator';

/**
 * A line with a start and end point.
 *
 * It requires a precompiled shader program and its attributes to work.
 */
export abstract class Path extends Line {
  private pathLength_: number;
  isFollowCenterBody = true;
  centerBody = SolarBody.Earth;
  referenceFrame: 'J2000' | 'TEME' = 'TEME';
  /** This flag is set to true when the line is no longer needed. The garbage collector will handle removing it */
  isGarbage = false;

  constructor(dataPoints = 2, centerBody = SolarBody.Earth) {
    super(dataPoints);
    this.centerBody = centerBody;

    if (this.centerBody === SolarBody.Earth) {
      this.referenceFrame = 'TEME';
      this.isFollowCenterBody = true;
    }
  }

  /**
   * This assumes that LineManager.drawFirst has already run and LineManager.drawLast will run after all lines are drawn.
   */
  draw(gl: WebGL2RenderingContext, lineManager: LineManager): void {
    if (!this.isDraw_) {
      return;
    }

    gl.uniform4fv(lineManager.uniforms_.u_color, this.color_);

    // Celestial/orbit paths are stored as absolute inertial positions
    // (heliocentric or ECI/TEME) and their dots render unrotated, so they must
    // ALWAYS draw in ECI - never the GMST-rotated ECF branch. In ECF mode
    // setWorldUniforms leaves u_ecfMode=1 for the whole line pass, which would
    // spin these paths off their bodies; force it (and the anchor override) off.
    gl.uniform1i(lineManager.uniforms_.u_ecfMode, 0);
    gl.uniform1i(lineManager.uniforms_.u_anchorMode, 0);

    const sceneManager = Scene.getInstance();
    const centerBodyEntity = sceneManager.getBodyById(this.centerBody);

    if (this.isFollowCenterBody === false || !centerBodyEntity) {
      gl.uniform3fv(lineManager.uniforms_.worldOffset, [0, 0, 0]);
    } else if (this.centerBody === SolarBody.Earth) {
      gl.uniform3fv(lineManager.uniforms_.worldOffset, sceneManager.worldShift);
    } else {
      gl.uniform3fv(lineManager.uniforms_.worldOffset, centerBodyEntity.position);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf_);
    gl.vertexAttribPointer(lineManager.attribs.a_position.location, 4, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.LINE_STRIP, 0, this.pathLength_);

    // Restore the pass-level ECF mode so a non-Path line drawn after this one is
    // unaffected (the general line pass sets u_ecfMode from isOrbitCruncherInEcf).
    gl.uniform1i(lineManager.uniforms_.u_ecfMode, settingsManager.isOrbitCruncherInEcf ? 1 : 0);
  }

  abstract update(): void;

  updateVertBuf(points: vec3[] | vec4[]): void {
    const gl = ServiceLocator.getRenderer().gl;

    this.pathLength_ = points.length;

    // we need a vec4 for each point
    let newData: Float32Array;

    if (points[0].length === 3) {
      newData = new Float32Array(points.map((p) => [p[0], p[1], p[2], p[3] ?? 1.0]).flat());
    } else {
      newData = new Float32Array(points.flat() as ArrayLike<number>);
    }

    GlUtils.bindBufferDynamicDraw(gl, this.vertBuf_, newData);
  }

  /** Update the vertex buffer directly from a pre-built vec4 Float32Array, bypassing vec3→vec4 conversion. */
  updateVertBufDirect(data: Float32Array, pointCount: number): void {
    const gl = ServiceLocator.getRenderer().gl;

    this.pathLength_ = pointCount;
    GlUtils.bindBufferDynamicDraw(gl, this.vertBuf_, data);
  }

  protected validateColor(color: vec4): void {
    if (color[0] < 0 || color[0] > 1 || color[1] < 0 || color[1] > 1 || color[2] < 0 || color[2] > 1 || color[3] < 0 || color[3] > 1) {
      throw new Error('Invalid color');
    }
  }
}
