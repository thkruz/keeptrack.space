import type { EmbedCatalog } from './embed-catalog';
import type { EmbedContext } from './embed-context';
import type { EmbedData } from './embed-data';
import type { EmbedEngine } from './embed-engine';
import { EmbedError, type EmbedEventMap, type ObjectRef } from './embed-types';

/** Upper bound for the stream rate; higher values are clamped, not rejected. */
export const MAX_STREAM_HZ = 10;

interface Target {
  id: number;
  hostId?: string;
  norad?: string;
}

/**
 * `positions` events for a set of objects. A wall-clock timer ticks at `hz`; a tick emits only when the simulation
 * time moved since the last emit, so a paused clock is silent (the first emit after start, and after any time
 * change, always goes out). Targets are resolved once and refreshed through invalidate(); a tick allocates only the
 * payload.
 */
export class EmbedStream {
  private timer_: ReturnType<typeof setInterval> | null = null;
  private refs_: ObjectRef[] | 'host' = 'host';
  private targets_: Target[] = [];
  private isDirty_ = true;
  private lastEmittedMs_ = Number.NaN;

  constructor(
    private readonly ctx_: EmbedContext,
    private readonly engine_: EmbedEngine,
    private readonly catalog_: EmbedCatalog,
    private readonly data_: EmbedData
  ) {}

  get isActive(): boolean {
    return this.timer_ !== null;
  }

  set(stream: { refs: ObjectRef[] | 'host'; hz: number } | null): void {
    this.stop();
    if (stream === null) {
      return;
    }
    if (!stream || typeof stream !== 'object' || (stream.refs !== 'host' && !Array.isArray(stream.refs))) {
      throw new EmbedError('INVALID_ARGUMENT', "setPositionStream expects { refs: ObjectRef[] | 'host', hz } or null");
    }
    if (typeof stream.hz !== 'number' || !Number.isFinite(stream.hz) || stream.hz <= 0) {
      throw new EmbedError('INVALID_ARGUMENT', 'hz must be a positive number');
    }
    const hz = Math.min(stream.hz, MAX_STREAM_HZ);

    this.refs_ = stream.refs === 'host' ? 'host' : [...stream.refs];
    this.isDirty_ = true;
    this.lastEmittedMs_ = Number.NaN;
    this.tick_();
    this.timer_ = setInterval(() => this.tick_(), 1000 / hz);
  }

  stop(): void {
    if (this.timer_ !== null) {
      clearInterval(this.timer_);
      this.timer_ = null;
    }
  }

  /** The catalog changed: re-resolve targets on the next tick. */
  invalidate(): void {
    this.isDirty_ = true;
  }

  private resolve_(): void {
    this.isDirty_ = false;
    const targets: Target[] = [];

    if (this.refs_ === 'host') {
      for (const info of this.catalog_.listHostObjects()) {
        const id = info.hostId === undefined ? null : this.catalog_.resolveRef({ hostId: info.hostId });

        if (id !== null) {
          targets.push({ id, hostId: info.hostId, norad: info.norad });
        }
      }
    } else {
      for (const ref of this.refs_) {
        const id = this.catalog_.resolveRef(ref);
        const info = id === null ? null : this.catalog_.infoForId(id);

        if (id !== null && info) {
          targets.push({ id, ...(info.hostId !== undefined && { hostId: info.hostId }), norad: info.norad });
        }
      }
    }
    this.targets_ = targets;
  }

  private tick_(): void {
    const timeMs = this.engine_.getTimeMs();

    if (timeMs === this.lastEmittedMs_) {
      return;
    }
    if (this.isDirty_) {
      this.resolve_();
    }
    try {
      this.data_.propagator.assertReady();
    } catch {
      // Propagator still loading: skip this tick without consuming the time step
      return;
    }
    const objects: EmbedEventMap['positions']['objects'] = [];

    for (const target of this.targets_) {
      const position = this.engine_.getPosition(target.id, timeMs);

      if (!position) {
        continue;
      }
      objects.push(target.hostId === undefined ? { norad: target.norad, lla: position.lla } : { hostId: target.hostId, norad: target.norad, lla: position.lla });
    }
    this.lastEmittedMs_ = timeMs;
    this.ctx_.emit('positions', { timeMs, objects });
  }
}
