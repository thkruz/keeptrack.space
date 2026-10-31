import type { EmbedCatalog } from './embed-catalog';
import type { EmbedEngine, EngineLine, EngineSurfaceSpec } from './embed-engine';
import { accessAngleDeg, circleRing, ellipseRing, greatCirclePath, markerStrips } from './embed-geo';
import type { EmbedSensors } from './embed-sensors';
import {
  type EmbedCircleOverlay,
  type EmbedColor,
  type EmbedEllipseOverlay,
  EmbedError,
  type EmbedFootprintOverlay,
  type EmbedLatLon,
  type EmbedMarkerOverlay,
  type EmbedOverlay,
  type EmbedPolylineOverlay,
} from './embed-types';

/** How often moving overlays (footprints, access circles) check for a redraw. */
export const SURFACE_TICK_MS = 250;
/** Minimum wall-clock gap between redraws of one moving overlay. */
export const SURFACE_MIN_REDRAW_MS = 200;
/** A moving overlay redraws once sim time has moved this far from its last draw (either direction). */
export const SURFACE_REDRAW_SIM_MS = 2000;

export type SurfaceOverlay = EmbedFootprintOverlay | EmbedCircleOverlay | EmbedMarkerOverlay | EmbedEllipseOverlay | EmbedPolylineOverlay;

export const SURFACE_TYPES = new Set(['footprint', 'circle', 'marker', 'ellipse', 'polyline']);

const DEFAULT_COLORS: Record<string, EmbedColor> = {
  footprint: [1, 0.8, 0.2, 1],
  circle: [0.3, 0.8, 1, 1],
  marker: [1, 0.3, 0.3, 1],
  ellipse: [1, 0.5, 0.1, 1],
  polyline: [1, 1, 1, 1],
};

interface SurfaceRecord {
  id: string;
  overlay: SurfaceOverlay;
  color: EmbedColor;
  dashed: boolean;
  /** Engine object whose motion drives this overlay, if any. */
  objectId: number | null;
  sensorId: string | null;
  line: EngineLine | null;
  drawnSimMs: number;
  drawnWall: number;
  sig: string;
}

function isColor(c: unknown): c is EmbedColor {
  return Array.isArray(c) && c.length === 4 && c.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1);
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function checkLatLon(p: unknown, what: string): asserts p is EmbedLatLon {
  const q = p as EmbedLatLon | null;

  if (!q || !finite(q.lat) || !finite(q.lon) || q.lat < -90 || q.lat > 90) {
    throw new EmbedError('INVALID_ARGUMENT', `${what} needs finite lat (-90..90) and lon`);
  }
}

/**
 * Footprint, circle, marker, ellipse and polyline overlays, drawn as Earth-fixed surface lines.
 * Fill is not supported: shapes are always outlines (a one-time console warning is logged when fill is requested).
 * Labels on markers are not drawn (the engine has no surface text facility).
 */
export class EmbedSurfaceOverlays {
  private readonly records_ = new Map<string, SurfaceRecord>();
  private timer_: ReturnType<typeof setInterval> | null = null;
  private warnedFill_ = false;
  now_: () => number = () => Date.now();

  constructor(
    private readonly engine_: EmbedEngine,
    private readonly catalog_: EmbedCatalog,
    private readonly sensors_: EmbedSensors,
    private readonly nextId_: () => string
  ) {}

  start(): void {
    if (this.timer_ === null) {
      this.timer_ = setInterval(() => this.tick(), SURFACE_TICK_MS);
    }
  }

  stop(): void {
    if (this.timer_ !== null) {
      clearInterval(this.timer_);
      this.timer_ = null;
    }
  }

  has(id: string): boolean {
    return this.records_.has(id);
  }

  list(): string[] {
    return [...this.records_.keys()];
  }

  add(overlay: SurfaceOverlay): string {
    if (overlay.color !== undefined && !isColor(overlay.color)) {
      throw new EmbedError('INVALID_ARGUMENT', 'color must be [r, g, b, a] with each channel 0..1');
    }
    const rec: SurfaceRecord = {
      id: this.nextId_(),
      overlay,
      color: overlay.color ?? DEFAULT_COLORS[overlay.type],
      dashed: 'dashed' in overlay && overlay.dashed === true,
      objectId: null,
      sensorId: null,
      line: null,
      drawnSimMs: Number.NaN,
      drawnWall: -Infinity,
      sig: '',
    };

    this.validate_(rec);
    if ('fill' in overlay && overlay.fill && !this.warnedFill_) {
      this.warnedFill_ = true;
      console.warn('KeepTrack embed: overlay fill is not supported; drawing the outline only');
    }
    const strips = this.strips_(rec);

    rec.line = this.engine_.addSurfaceLine({ strips: strips ?? [], color: rec.color, dashed: rec.dashed });
    if (!rec.line) {
      throw new EmbedError('INVALID_ARGUMENT', 'The engine cannot draw surface overlays');
    }
    this.markDrawn_(rec);
    this.records_.set(rec.id, rec);

    return rec.id;
  }

  private validate_(rec: SurfaceRecord): void {
    const o = rec.overlay;

    switch (o.type) {
      case 'footprint':
        rec.objectId = this.catalog_.resolveRef(o.object);
        if (rec.objectId === null) {
          throw new EmbedError('OBJECT_NOT_FOUND', 'Footprint object not found');
        }
        if (!finite(o.minElDeg) || o.minElDeg < -90 || o.minElDeg > 90) {
          throw new EmbedError('INVALID_ARGUMENT', 'minElDeg must be -90..90');
        }
        break;
      case 'circle': {
        if ('sensor' in o.center) {
          if (!this.sensors_.has(o.center.sensor)) {
            throw new EmbedError('SENSOR_NOT_FOUND', `No host sensor '${String(o.center.sensor)}'`);
          }
          rec.sensorId = o.center.sensor;
        } else {
          checkLatLon(o.center, 'Circle center');
        }
        if ('accessOf' in o.radius) {
          rec.objectId = this.catalog_.resolveRef(o.radius.accessOf);
          if (rec.objectId === null) {
            throw new EmbedError('OBJECT_NOT_FOUND', 'Circle accessOf object not found');
          }
          if (!finite(o.radius.minElDeg) || o.radius.minElDeg < -90 || o.radius.minElDeg > 90) {
            throw new EmbedError('INVALID_ARGUMENT', 'minElDeg must be -90..90');
          }
        } else if (!finite(o.radius?.deg) || o.radius.deg <= 0 || o.radius.deg >= 180) {
          throw new EmbedError('INVALID_ARGUMENT', 'radius.deg must be between 0 and 180');
        }
        break;
      }
      case 'marker':
        checkLatLon(o.position, 'Marker position');
        if (o.shape !== undefined && !['dot', 'diamond', 'ring', 'cross'].includes(o.shape)) {
          throw new EmbedError('INVALID_ARGUMENT', 'marker shape must be dot, diamond, ring or cross');
        }
        break;
      case 'ellipse':
        checkLatLon(o.center, 'Ellipse center');
        if (!finite(o.semiMajorKm) || !finite(o.semiMinorKm) || o.semiMajorKm <= 0 || o.semiMinorKm <= 0 || !finite(o.bearingDeg)) {
          throw new EmbedError('INVALID_ARGUMENT', 'ellipse needs positive semiMajorKm and semiMinorKm and a finite bearingDeg');
        }
        break;
      case 'polyline':
        if (!Array.isArray(o.points) || o.points.length < 2) {
          throw new EmbedError('INVALID_ARGUMENT', 'polyline needs at least two points');
        }
        for (const p of o.points) {
          checkLatLon(p, 'Polyline point');
        }
        break;
      default:
        break;
    }
  }

  /** Geometry for a record; null when a moving overlay cannot be placed right now. */
  private strips_(rec: SurfaceRecord): EmbedLatLon[][] | null {
    const o = rec.overlay;

    switch (o.type) {
      case 'footprint':
        return this.accessRing_(rec.objectId as number, o.minElDeg);
      case 'circle': {
        let center: EmbedLatLon;

        if ('sensor' in o.center) {
          const def = this.sensors_.getDef(o.center.sensor);

          if (!def) {
            return null;
          }
          center = { lat: def.lat, lon: def.lon };
        } else {
          center = o.center;
        }
        if ('accessOf' in o.radius) {
          const pos = this.engine_.getPosition(rec.objectId as number, this.engine_.getTimeMs());

          return pos ? [circleRing(center, accessAngleDeg(pos.lla.altKm, o.radius.minElDeg))] : null;
        }

        return [circleRing(center, o.radius.deg)];
      }
      case 'marker':
        return markerStrips(o.position, o.shape ?? 'dot');
      case 'ellipse':
        return [ellipseRing(o.center, o.semiMajorKm, o.semiMinorKm, o.bearingDeg)];
      case 'polyline':
        return [greatCirclePath(o.points, o.closed === true)];
      default:
        return null;
    }
  }

  private accessRing_(objectId: number, minElDeg: number): EmbedLatLon[][] | null {
    const pos = this.engine_.getPosition(objectId, this.engine_.getTimeMs());

    if (!pos) {
      return null;
    }

    return [circleRing({ lat: pos.lla.lat, lon: pos.lla.lon }, accessAngleDeg(pos.lla.altKm, minElDeg))];
  }

  private objectSig_(rec: SurfaceRecord): string {
    const data = rec.objectId === null ? null : this.engine_.getObjectData(rec.objectId);

    return data ? `${data.tle1 ?? ''}|${data.tle2 ?? ''}` : '';
  }

  private markDrawn_(rec: SurfaceRecord): void {
    rec.drawnSimMs = this.engine_.getTimeMs();
    rec.drawnWall = this.now_();
    rec.sig = this.objectSig_(rec);
  }

  /** Redraw moving overlays when sim time moved at least SURFACE_REDRAW_SIM_MS (any direction) or elements changed. */
  tick(force = false): void {
    const simMs = this.engine_.getTimeMs();
    const wall = this.now_();

    for (const rec of this.records_.values()) {
      if (rec.objectId === null) {
        continue;
      }
      const sigChanged = this.objectSig_(rec) !== rec.sig;
      const timeMoved = Math.abs(simMs - rec.drawnSimMs) >= SURFACE_REDRAW_SIM_MS;

      if (!sigChanged && !timeMoved) {
        continue;
      }
      if (!sigChanged && !force && wall - rec.drawnWall < SURFACE_MIN_REDRAW_MS) {
        continue;
      }
      const strips = this.strips_(rec) ?? [];
      const spec: EngineSurfaceSpec = { strips, color: rec.color, dashed: rec.dashed };

      if (rec.line && this.engine_.isLineAlive(rec.line)) {
        this.engine_.updateSurfaceLine(rec.line, spec);
      } else {
        rec.line = this.engine_.addSurfaceLine(spec);
      }
      this.markDrawn_(rec);
    }
  }

  remove(id: string): boolean {
    const rec = this.records_.get(id);

    if (!rec) {
      return false;
    }
    if (rec.line) {
      this.engine_.removeLine(rec.line);
    }
    this.records_.delete(id);

    return true;
  }

  clear(): void {
    for (const id of [...this.records_.keys()]) {
      this.remove(id);
    }
  }

  dropForObjectIds(ids: number[]): void {
    for (const rec of [...this.records_.values()]) {
      if (rec.objectId !== null && ids.includes(rec.objectId)) {
        this.remove(rec.id);
      }
    }
  }

  dropForSensors(hostIds: string[]): void {
    for (const rec of [...this.records_.values()]) {
      if (rec.sensorId !== null && hostIds.includes(rec.sensorId)) {
        this.remove(rec.id);
      }
    }
  }
}

export function isSurfaceOverlay(o: EmbedOverlay): o is SurfaceOverlay {
  return !!o && SURFACE_TYPES.has((o as { type: string }).type);
}
