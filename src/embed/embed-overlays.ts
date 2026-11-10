import type { EmbedCatalog } from './embed-catalog';
import type { EmbedEngine, EngineLine, EngineLineSpec } from './embed-engine';
import type { EmbedSensors } from './embed-sensors';
import { EmbedSurfaceOverlays, isSurfaceOverlay } from './embed-surface';
import { type EmbedColor, EmbedError, type EmbedOverlay, type ObjectRef, type OverlayEndpoint } from './embed-types';

/** How often garbage-collected lines are re-created. */
export const OVERLAY_RECONCILE_MS = 500;

type Resolved = { kind: 'object'; id: number } | { kind: 'sensor'; hostId: string };

interface OverlayRecord {
  id: string;
  from: Resolved;
  to: Resolved;
  color?: EmbedColor;
  fovOnly: boolean;
  line: EngineLine | null;
}

function isColor(c: unknown): c is EmbedColor {
  return Array.isArray(c) && c.length === 4 && c.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1);
}

/**
 * Line overlays. Only lines created here are ever removed here, so engine lines (sensor markers, orbit
 * paths, user-made lines) are never touched.
 *
 * The engine drops a line when its sensor is inactive or, for FOV-only lines, the moment the object
 * leaves the FOV. reconcile() re-creates those lines while both endpoints still exist, so an overlay
 * outlives the engine's own garbage collection (re-appearance can lag by one reconcile interval).
 */
export class EmbedOverlays {
  private readonly overlays_ = new Map<string, OverlayRecord>();
  private nextId_ = 1;
  private timer_: ReturnType<typeof setInterval> | null = null;
  /** Footprint, circle, marker, ellipse and polyline overlays (surface geometry). */
  readonly surface: EmbedSurfaceOverlays;

  constructor(
    private readonly engine_: EmbedEngine,
    private readonly catalog_: EmbedCatalog,
    private readonly sensors_: EmbedSensors
  ) {
    this.surface = new EmbedSurfaceOverlays(engine_, catalog_, sensors_, () => `ov-${this.nextId_++}`);
  }

  start(): void {
    if (this.timer_ === null) {
      this.timer_ = setInterval(() => this.reconcile(), OVERLAY_RECONCILE_MS);
    }
    this.surface.start();
  }

  stop(): void {
    if (this.timer_ !== null) {
      clearInterval(this.timer_);
      this.timer_ = null;
    }
    this.surface.stop();
  }

  add(overlay: EmbedOverlay): string {
    if (overlay && isSurfaceOverlay(overlay)) {
      return this.surface.add(overlay);
    }
    if (!overlay || overlay.type !== 'line') {
      throw new EmbedError('INVALID_ARGUMENT', "Overlay type must be 'line', 'footprint', 'circle', 'marker', 'ellipse' or 'polyline'");
    }
    if (overlay.color !== undefined && !isColor(overlay.color)) {
      throw new EmbedError('INVALID_ARGUMENT', 'color must be [r, g, b, a] with each channel 0..1');
    }
    const from = this.resolve_(overlay.from);
    const to = this.resolve_(overlay.to);

    if (from.kind === 'sensor' && to.kind === 'sensor') {
      throw new EmbedError('INVALID_ARGUMENT', 'A line needs at least one object endpoint');
    }
    const record: OverlayRecord = {
      id: `ov-${this.nextId_++}`,
      from,
      to,
      color: overlay.color,
      fovOnly: overlay.fovOnly === true && (from.kind === 'sensor' || to.kind === 'sensor'),
      line: null,
    };

    record.line = this.createLine_(record);
    if (!record.line) {
      throw new EmbedError('INVALID_ARGUMENT', 'The engine cannot draw a line to that object (not a satellite or not loaded)');
    }
    this.overlays_.set(record.id, record);

    return record.id;
  }

  private resolve_(endpoint: OverlayEndpoint): Resolved {
    if (endpoint && typeof endpoint === 'object' && 'sensor' in endpoint) {
      if (!this.sensors_.has(endpoint.sensor)) {
        throw new EmbedError('SENSOR_NOT_FOUND', `No host sensor '${String(endpoint.sensor)}'`);
      }

      return { kind: 'sensor', hostId: endpoint.sensor };
    }
    if (endpoint && typeof endpoint === 'object' && 'object' in endpoint) {
      const id = this.catalog_.resolveRef(endpoint.object as ObjectRef);

      if (id === null) {
        throw new EmbedError('OBJECT_NOT_FOUND', 'Overlay endpoint object not found');
      }

      return { kind: 'object', id };
    }
    throw new EmbedError('INVALID_ARGUMENT', 'Overlay endpoints must be { object: ref } or { sensor: hostId }');
  }

  private createLine_(rec: OverlayRecord): EngineLine | null {
    let spec: EngineLineSpec;

    if (rec.from.kind === 'object' && rec.to.kind === 'object') {
      spec = { kind: 'objToObj', fromId: rec.from.id, toId: rec.to.id, color: rec.color };
    } else {
      const sensorEnd = rec.from.kind === 'sensor' ? rec.from : (rec.to as { kind: 'sensor'; hostId: string });
      const objEnd = rec.from.kind === 'object' ? rec.from : (rec.to as { kind: 'object'; id: number });
      const sensor = this.sensors_.getEngineSensor((sensorEnd as { hostId: string }).hostId);

      if (!sensor) {
        return null;
      }
      spec = { kind: 'sensorToObj', sensor, objectId: (objEnd as { id: number }).id, fovOnly: rec.fovOnly, color: rec.color };
    }

    return this.engine_.addLine(spec);
  }

  remove(id: string): void {
    if (this.surface.remove(id)) {
      return;
    }
    const rec = this.overlays_.get(id);

    if (!rec) {
      return;
    }
    if (rec.line) {
      this.engine_.removeLine(rec.line);
    }
    this.overlays_.delete(id);
  }

  clear(): void {
    this.surface.clear();
    for (const id of [...this.overlays_.keys()]) {
      this.remove(id);
    }
  }

  list(): string[] {
    return [...this.overlays_.keys(), ...this.surface.list()];
  }

  /** Drop overlays touching removed engine objects. */
  dropForObjectIds(ids: number[]): void {
    this.surface.dropForObjectIds(ids);
    for (const rec of [...this.overlays_.values()]) {
      if ((rec.from.kind === 'object' && ids.includes(rec.from.id)) || (rec.to.kind === 'object' && ids.includes(rec.to.id))) {
        this.remove(rec.id);
      }
    }
  }

  /** Drop overlays touching removed host sensors. */
  dropForSensors(hostIds: string[]): void {
    this.surface.dropForSensors(hostIds);
    for (const rec of [...this.overlays_.values()]) {
      if ((rec.from.kind === 'sensor' && hostIds.includes(rec.from.hostId)) || (rec.to.kind === 'sensor' && hostIds.includes(rec.to.hostId))) {
        this.remove(rec.id);
      }
    }
  }

  /** Re-create lines the engine garbage-collected. A sensor line also needs its sensor to be active. */
  reconcile(): void {
    for (const rec of this.overlays_.values()) {
      if (rec.line && this.engine_.isLineAlive(rec.line)) {
        continue;
      }
      let sensorEnd: { kind: 'sensor'; hostId: string } | null = null;

      if (rec.from.kind === 'sensor') {
        sensorEnd = rec.from;
      } else if (rec.to.kind === 'sensor') {
        sensorEnd = rec.to;
      }

      if (sensorEnd && !this.sensors_.isActive(sensorEnd.hostId)) {
        rec.line = null;
        continue;
      }
      rec.line = this.createLine_(rec);
    }
  }
}
