import type { EmbedContext } from './embed-context';
import type { EmbedEngine, EngineSensor } from './embed-engine';
import { EmbedError, type EmbedSensor } from './embed-types';

/** Prefix that keeps host sensors from ever colliding with catalog or user-made sensors. */
export const HOST_SENSOR_OBJNAME_PREFIX = 'KTEMBED';

interface HostedSensor {
  def: EmbedSensor;
  engineSensor: EngineSensor;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Throws INVALID_ARGUMENT for a malformed sensor definition. */
export function validateSensor(s: unknown): asserts s is EmbedSensor {
  const o = s as Partial<EmbedSensor> | null;

  if (!o || typeof o !== 'object' || typeof o.hostId !== 'string' || o.hostId === '') {
    throw new EmbedError('INVALID_ARGUMENT', 'Each sensor needs a non-empty string hostId');
  }
  if (typeof o.name !== 'string' || o.name === '') {
    throw new EmbedError('INVALID_ARGUMENT', `Sensor '${o.hostId}' needs a name`);
  }
  for (const key of ['lat', 'lon', 'altKm', 'minAz', 'maxAz', 'minEl', 'maxEl', 'minRngKm', 'maxRngKm'] as const) {
    if (!finite(o[key])) {
      throw new EmbedError('INVALID_ARGUMENT', `Sensor '${o.hostId}': ${key} must be a finite number`);
    }
  }
  const { lat, lon, minEl, maxEl, minRngKm, maxRngKm } = o as EmbedSensor;

  if (lat < -90 || lat > 90 || lon < -180 || lon > 360) {
    throw new EmbedError('INVALID_ARGUMENT', `Sensor '${o.hostId}': lat must be -90..90 and lon -180..360`);
  }
  if (minEl > maxEl || minRngKm < 0 || minRngKm >= maxRngKm) {
    throw new EmbedError('INVALID_ARGUMENT', `Sensor '${o.hostId}': need minEl <= maxEl and 0 <= minRngKm < maxRngKm`);
  }
}

/** Host-supplied ground sensors and which of them are active. */
export class EmbedSensors {
  private readonly sensors_ = new Map<string, HostedSensor>();
  /** Active host ids in order (first is primary). */
  private activeIds_: string[] = [];

  constructor(
    private readonly ctx_: EmbedContext,
    private readonly engine_: EmbedEngine
  ) {}

  upsert(sensors: EmbedSensor[]): void {
    if (!Array.isArray(sensors)) {
      throw new EmbedError('INVALID_ARGUMENT', 'upsertSensors expects an array');
    }
    for (const s of sensors) {
      validateSensor(s);
    }
    let touchedActive = false;

    for (const def of sensors) {
      const engineSensor = this.engine_.createSensor(def, `${HOST_SENSOR_OBJNAME_PREFIX}-${def.hostId}`);

      this.sensors_.set(def.hostId, { def: { ...def }, engineSensor });
      touchedActive ||= this.activeIds_.includes(def.hostId);
    }
    // An edited active sensor is a new engine object: put it back in the active set
    if (touchedActive) {
      this.applyActive_();
    }
  }

  /** Returns the hostIds actually removed. */
  remove(hostIds: string[]): string[] {
    if (!Array.isArray(hostIds)) {
      throw new EmbedError('INVALID_ARGUMENT', 'removeSensors expects an array of hostIds');
    }
    const removed: string[] = [];

    for (const id of hostIds) {
      if (this.sensors_.delete(id)) {
        removed.push(id);
      }
    }
    if (removed.length > 0 && this.activeIds_.some((id) => removed.includes(id))) {
      this.activeIds_ = this.activeIds_.filter((id) => !removed.includes(id));
      this.applyActive_();
    }

    return removed;
  }

  setActive(hostIds: string[]): void {
    if (!Array.isArray(hostIds) || hostIds.some((id) => typeof id !== 'string')) {
      throw new EmbedError('INVALID_ARGUMENT', 'setActiveSensors expects an array of hostIds');
    }
    for (const id of hostIds) {
      if (!this.sensors_.has(id)) {
        throw new EmbedError('SENSOR_NOT_FOUND', `No host sensor '${id}'`);
      }
    }
    this.activeIds_ = [...new Set(hostIds)];
    this.applyActive_();
  }

  private applyActive_(): void {
    this.ctx_.runAsHost(() => this.engine_.setActiveSensorSet(this.activeIds_.map((id) => this.sensors_.get(id)!.engineSensor)));
  }

  has(hostId: string): boolean {
    return this.sensors_.has(hostId);
  }

  getEngineSensor(hostId: string): EngineSensor | null {
    return this.sensors_.get(hostId)?.engineSensor ?? null;
  }

  /** The host's definition of a sensor, or null. */
  getDef(hostId: string): EmbedSensor | null {
    return this.sensors_.get(hostId)?.def ?? null;
  }

  /** Engine sensor or SENSOR_NOT_FOUND. */
  require(hostId: string): EngineSensor {
    const s = typeof hostId === 'string' ? this.getEngineSensor(hostId) : null;

    if (!s) {
      throw new EmbedError('SENSOR_NOT_FOUND', `No host sensor '${String(hostId)}'`);
    }

    return s;
  }

  isActive(hostId: string): boolean {
    return this.activeIds_.includes(hostId);
  }
}
