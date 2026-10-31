import type { EmbedCatalog } from './embed-catalog';
import type { EmbedEngine } from './embed-engine';
import type { EmbedSensors } from './embed-sensors';
import { type EmbedAccessWindow, EmbedError, type EmbedLookAngles, type EmbedPosition, type ObjectRef } from './embed-types';

/** Longest window getAccessWindows accepts. */
export const MAX_ACCESS_WINDOW_DAYS = 14;
const MS_PER_DAY = 86_400_000;

/** Data out: positions, look angles, access windows, screenshots. */
export class EmbedData {
  constructor(
    private readonly engine_: EmbedEngine,
    private readonly catalog_: EmbedCatalog,
    private readonly sensors_: EmbedSensors
  ) {}

  private timeOrNow_(timeMs: number | undefined): number {
    if (timeMs === undefined) {
      return this.engine_.getTimeMs();
    }
    if (typeof timeMs !== 'number' || !Number.isFinite(timeMs)) {
      throw new EmbedError('INVALID_ARGUMENT', 'timeMs must be a finite epoch-ms number');
    }

    return timeMs;
  }

  getPosition(ref: ObjectRef, timeMs?: number): EmbedPosition | null {
    const t = this.timeOrNow_(timeMs);
    const id = this.catalog_.resolveRef(ref);

    return id === null ? null : this.engine_.getPosition(id, t);
  }

  getLookAngles(sensorHostId: string, ref: ObjectRef, timeMs?: number): EmbedLookAngles | null {
    const sensor = this.sensors_.require(sensorHostId);
    const t = this.timeOrNow_(timeMs);
    const id = this.catalog_.resolveRef(ref);

    return id === null ? null : this.engine_.getLookAngles(sensor, id, t);
  }

  getAccessWindows(sensorHostId: string, ref: ObjectRef, startMs: number, endMs: number): EmbedAccessWindow[] {
    if (typeof startMs !== 'number' || typeof endMs !== 'number' || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      throw new EmbedError('INVALID_ARGUMENT', 'startMs and endMs must be finite epoch-ms numbers');
    }
    if (endMs <= startMs) {
      throw new EmbedError('INVALID_ARGUMENT', 'endMs must be after startMs');
    }
    if (endMs - startMs > MAX_ACCESS_WINDOW_DAYS * MS_PER_DAY) {
      throw new EmbedError('INVALID_ARGUMENT', `The access window may not exceed ${MAX_ACCESS_WINDOW_DAYS} days`);
    }
    const sensor = this.sensors_.require(sensorHostId);
    const id = this.catalog_.resolveRef(ref);

    if (id === null) {
      throw new EmbedError('OBJECT_NOT_FOUND', 'Object not found');
    }

    return this.engine_.findAccessWindows(sensor, id, startMs, endMs);
  }

  screenshot(): Promise<Blob> {
    return this.engine_.captureFrame();
  }
}
