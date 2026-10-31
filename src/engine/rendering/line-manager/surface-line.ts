import { ServiceLocator } from '@app/engine/core/service-locator';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { settingsManager } from '@app/settings/settings';
import { vec4 } from 'gl-matrix';
import { GlUtils } from '../gl-utils';
import { LineManager } from '../line-manager';
import { Line } from './line';

/** One vertex of a surface line, degrees. */
export interface SurfacePoint {
  lat: number;
  lon: number;
}

/** Height above the sphere the Earth mesh is drawn on; keeps the line clear of the surface in the depth buffer. */
export const SURFACE_LINE_LIFT_KM = 6;
/** Dash pattern, in samples: this many segments drawn, this many skipped. */
const DASH_ON = 2;
const DASH_OFF = 2;

/**
 * Earth-fixed polylines lying on the Earth surface. Vertices are stored in ECEF, so the shader's ECF
 * branch rotates them with the Earth in the globe view, and its geodetic reprojection (with antimeridian
 * discard) draws them in the flat map. Each strip is drawn as its own line strip; a dashed line is
 * emitted as short separate segments.
 *
 * Fill is deliberately not supported (outline only).
 */
export class SurfaceLine extends Line {
  private drawCalls_: { mode: 'strip' | 'lines'; first: number; count: number }[] = [];

  constructor(strips: SurfacePoint[][], color: vec4, dashed: boolean) {
    super();
    this.validateColor(color);
    this.color_ = color;
    this.setStrips(strips, dashed);
  }

  /** Spherical ECEF vector for a lat/lon in degrees. */
  static toEcef(p: SurfacePoint, liftKm = SURFACE_LINE_LIFT_KM): [number, number, number] {
    const lat = (p.lat * Math.PI) / 180;
    const lon = (p.lon * Math.PI) / 180;
    const r = RADIUS_OF_EARTH + liftKm;

    return [r * Math.cos(lat) * Math.cos(lon), r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat)];
  }

  setColor(color: vec4): void {
    this.validateColor(color);
    this.color_ = color;
  }

  setStrips(strips: SurfacePoint[][], dashed: boolean): void {
    const data: number[] = [];

    this.drawCalls_ = [];
    for (const strip of strips) {
      if (strip.length < 2) {
        continue;
      }
      const first = data.length / 4;

      if (!dashed) {
        for (const p of strip) {
          data.push(...SurfaceLine.toEcef(p), 1);
        }
        this.drawCalls_.push({ mode: 'strip', first, count: strip.length });
        continue;
      }
      for (let i = 0; i < strip.length - 1; i++) {
        if (i % (DASH_ON + DASH_OFF) < DASH_ON) {
          data.push(...SurfaceLine.toEcef(strip[i]), 1, ...SurfaceLine.toEcef(strip[i + 1]), 1);
        }
      }
      const count = data.length / 4 - first;

      if (count > 0) {
        this.drawCalls_.push({ mode: 'lines', first, count });
      }
    }
    const gl = ServiceLocator.getRenderer().gl;

    GlUtils.bindBufferDynamicDraw(gl, this.vertBuf_, new Float32Array(data.length > 0 ? data : [0, 0, 0, 0]));
  }

  update(): void {
    // Static in ECEF; the shader applies Earth rotation.
  }

  draw(gl: WebGL2RenderingContext, lineManager: LineManager): void {
    if (!this.isDraw_ || this.drawCalls_.length === 0) {
      return;
    }

    gl.uniform4fv(lineManager.uniforms_.u_color, this.getDrawColor_());
    // ECEF vertices: force ECF mode with absolute vertices, then restore the pass-level mode.
    gl.uniform1i(lineManager.uniforms_.u_ecfMode, 1);
    gl.uniform1i(lineManager.uniforms_.u_anchorMode, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf_);
    gl.vertexAttribPointer(lineManager.attribs.a_position.location, 4, gl.FLOAT, false, 0, 0);

    for (const call of this.drawCalls_) {
      gl.drawArrays(call.mode === 'strip' ? gl.LINE_STRIP : gl.LINES, call.first, call.count);
    }

    gl.uniform1i(lineManager.uniforms_.u_ecfMode, settingsManager.isOrbitCruncherInEcf ? 1 : 0);
  }
}
