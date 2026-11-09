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

/** Fill: the outline is strips[0] (a closed ring); triangles fan out from `center`. Alpha is a fraction of the line alpha. */
export interface SurfaceFill {
  center: SurfacePoint;
  alphaScale?: number;
}

/** Fill sits just under the outline so the two never z-fight. */
export const SURFACE_FILL_LIFT_KM = 4;
/** Largest angle between fill rings; keeps a flat triangle's sag under the lift so the Earth mesh never hides it. */
const FILL_RING_STEP_DEG = 3;
const FILL_MAX_RINGS = 30;
const FILL_RIM_STEP_DEG = 2;
export const SURFACE_FILL_ALPHA_SCALE = 0.25;

const toUnit = (p: SurfacePoint): [number, number, number] => {
  const v = SurfaceLine.toEcef(p, 0);
  const n = Math.hypot(v[0], v[1], v[2]) || 1;

  return [v[0] / n, v[1] / n, v[2] / n];
};

/**
 * Triangle list (x, y, z, 1 per vertex, ECEF km) covering a star-shaped ring around `center`. Concentric rings
 * between the center and the outline keep each triangle small enough to follow the sphere.
 */
export function buildFillTriangles(center: SurfacePoint, ring: SurfacePoint[], liftKm = SURFACE_FILL_LIFT_KM): number[] {
  // A closed ring repeats its first point; drop the duplicate so the last wedge is not degenerate.
  const pts = ring.length > 1 && ring[0].lat === ring[ring.length - 1].lat && ring[0].lon === ring[ring.length - 1].lon ? ring.slice(0, -1) : ring;

  if (pts.length < 3) {
    return [];
  }
  const c = toUnit(center);
  const base = pts.map(toUnit);
  // Resample the rim so neighbouring ring points are at most FILL_RIM_STEP_DEG apart (a wide wedge would sag under the Earth mesh).
  const units: [number, number, number][] = [];

  for (let i = 0; i < base.length; i++) {
    const a = base[i];
    const b = base[(i + 1) % base.length];
    const ang = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
    const parts = Math.max(1, Math.ceil((ang * 180) / Math.PI / FILL_RIM_STEP_DEG));

    for (let j = 0; j < parts; j++) {
      const f = j / parts;
      const x = a[0] + (b[0] - a[0]) * f;
      const y = a[1] + (b[1] - a[1]) * f;
      const z = a[2] + (b[2] - a[2]) * f;
      const n = Math.hypot(x, y, z) || 1;

      units.push([x / n, y / n, z / n]);
    }
  }
  let maxAngle = 0;

  for (const u of units) {
    maxAngle = Math.max(maxAngle, Math.acos(Math.min(1, Math.max(-1, c[0] * u[0] + c[1] * u[1] + c[2] * u[2]))));
  }
  const rings = Math.max(1, Math.min(FILL_MAX_RINGS, Math.ceil((maxAngle * 180) / Math.PI / FILL_RING_STEP_DEG)));
  const r = RADIUS_OF_EARTH + liftKm;
  const at = (i: number, k: number): [number, number, number] => {
    const f = k / rings;
    const u = units[i % units.length];
    const x = c[0] + (u[0] - c[0]) * f;
    const y = c[1] + (u[1] - c[1]) * f;
    const z = c[2] + (u[2] - c[2]) * f;
    const n = Math.hypot(x, y, z) || 1;

    return [(x / n) * r, (y / n) * r, (z / n) * r];
  };
  const out: number[] = [];
  const push = (v: [number, number, number]): void => {
    out.push(v[0], v[1], v[2], 1);
  };

  for (let i = 0; i < units.length; i++) {
    for (let k = 1; k <= rings; k++) {
      const a = at(i, k - 1);
      const b = at(i + 1, k - 1);
      const c2 = at(i, k);
      const d = at(i + 1, k);

      if (k > 1) {
        push(a);
        push(b);
        push(c2);
      }
      push(b);
      push(d);
      push(c2);
    }
  }

  return out;
}

/**
 * Earth-fixed polylines lying on the Earth surface. Vertices are stored in ECEF, so the shader's ECF
 * branch rotates them with the Earth in the globe view, and its geodetic reprojection (with antimeridian
 * discard) draws them in the flat map. Each strip is drawn as its own line strip; a dashed line is
 * emitted as short separate segments.
 *
 * An optional translucent fill (SurfaceFill) is drawn under the outline as a triangle fan of sphere-following rings.
 */
export class SurfaceLine extends Line {
  private drawCalls_: { mode: 'strip' | 'lines'; first: number; count: number }[] = [];
  private fillBuf_: WebGLBuffer | null = null;
  private fillCount_ = 0;
  private fillAlphaScale_ = SURFACE_FILL_ALPHA_SCALE;

  constructor(strips: SurfacePoint[][], color: vec4, dashed: boolean, fill?: SurfaceFill) {
    super();
    this.validateColor(color);
    this.color_ = color;
    this.setStrips(strips, dashed, fill);
  }

  /** Vertices queued for the fill pass (0 = no fill). */
  get fillVertexCount(): number {
    return this.fillCount_;
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

  setStrips(strips: SurfacePoint[][], dashed: boolean, fill?: SurfaceFill): void {
    const data: number[] = [];

    this.setFill_(strips, fill);

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

  private setFill_(strips: SurfacePoint[][], fill?: SurfaceFill): void {
    const tris = fill && strips[0] ? buildFillTriangles(fill.center, strips[0]) : [];
    const gl = ServiceLocator.getRenderer().gl;

    this.fillAlphaScale_ = fill?.alphaScale ?? SURFACE_FILL_ALPHA_SCALE;
    this.fillCount_ = tris.length / 4;
    if (this.fillCount_ === 0) {
      return;
    }
    this.fillBuf_ ??= gl.createBuffer();
    GlUtils.bindBufferDynamicDraw(gl, this.fillBuf_, new Float32Array(tris));
  }

  update(): void {
    // Static in ECEF; the shader applies Earth rotation.
  }

  draw(gl: WebGL2RenderingContext, lineManager: LineManager): void {
    if (!this.isDraw_ || (this.drawCalls_.length === 0 && this.fillCount_ === 0)) {
      return;
    }

    // ECEF vertices: force ECF mode with absolute vertices, then restore the pass-level mode.
    gl.uniform1i(lineManager.uniforms_.u_ecfMode, 1);
    gl.uniform1i(lineManager.uniforms_.u_anchorMode, 0);

    if (this.fillCount_ > 0 && this.fillBuf_) {
      const c = this.getDrawColor_();

      gl.uniform4fv(lineManager.uniforms_.u_color, [c[0], c[1], c[2], c[3] * this.fillAlphaScale_]);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fillBuf_);
      gl.vertexAttribPointer(lineManager.attribs.a_position.location, 4, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, this.fillCount_);
    }

    gl.uniform4fv(lineManager.uniforms_.u_color, this.getDrawColor_());
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuf_);
    gl.vertexAttribPointer(lineManager.attribs.a_position.location, 4, gl.FLOAT, false, 0, 0);

    for (const call of this.drawCalls_) {
      gl.drawArrays(call.mode === 'strip' ? gl.LINE_STRIP : gl.LINES, call.first, call.count);
    }

    gl.uniform1i(lineManager.uniforms_.u_ecfMode, settingsManager.isOrbitCruncherInEcf ? 1 : 0);
  }
}
