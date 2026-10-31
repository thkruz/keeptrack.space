import type { EmbedCatalog } from './embed-catalog';
import type { EmbedEngine, EngineLine, EngineSurfaceSpec } from './embed-engine';
import { type EmbedColor, EmbedError, type EmbedGroundTrackOptions, type EmbedLatLon, type ObjectRef } from './embed-types';

/** How often tracks check whether they need recomputing. */
export const TRACK_TICK_MS = 250;
/**
 * Minimum wall-clock gap between two recomputes of the same track caused by simulation time moving.
 * At 1x a track redraws every stepSec of sim time (30 s). At several hundred x the track would be stale
 * every frame, so redraws are capped at one per 400 ms per object (about 181 propagations each).
 * Element changes (upserts, TLE edits) and option changes bypass the cap.
 */
export const TRACK_MIN_RECOMPUTE_MS = 400;
const DEFAULT_STEP_SEC = 30;
const MAX_SAMPLES = 20_000;
const DEFAULT_COLOR: EmbedColor = [0.3, 1, 0.5, 1];

type Target = { refs: ObjectRef[] } | 'host';

interface TrackEntry {
  id: number;
  sig: string;
  centerMs: number;
  lastComputeWall: number;
  past: EngineLine | null;
  future: EngineLine | null;
}

interface ResolvedOptions extends EmbedGroundTrackOptions {
  stepSec: number;
}

function isColor(c: unknown): c is EmbedColor {
  return Array.isArray(c) && c.length === 4 && c.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1);
}

/** Sub-satellite ground tracks, drawn as Earth-fixed surface lines (past solid, future dashed by default). */
export class EmbedTracks {
  private target_: Target | null = null;
  private options_: ResolvedOptions = { pastMin: 0, futureMin: 0, stepSec: DEFAULT_STEP_SEC };
  private readonly entries_ = new Map<number, TrackEntry>();
  private timer_: ReturnType<typeof setInterval> | null = null;
  /** Wall-clock source, replaceable in tests. */
  now_: () => number = () => Date.now();
  /** Resolves an object's drawn color (setObjectStyle); falls back to a default. */
  colorFor: (id: number) => EmbedColor | undefined = () => undefined;

  constructor(
    private readonly engine_: EmbedEngine,
    private readonly catalog_: EmbedCatalog
  ) {}

  start(): void {
    if (this.timer_ === null) {
      this.timer_ = setInterval(() => this.tick(), TRACK_TICK_MS);
    }
  }

  stop(): void {
    if (this.timer_ !== null) {
      clearInterval(this.timer_);
      this.timer_ = null;
    }
  }

  set(refs: ObjectRef[] | 'host' | null, options?: EmbedGroundTrackOptions): void {
    if (refs === null) {
      this.clear();

      return;
    }
    if (!options || !Number.isFinite(options.pastMin) || !Number.isFinite(options.futureMin) || options.pastMin < 0 || options.futureMin < 0) {
      throw new EmbedError('INVALID_ARGUMENT', 'setGroundTracks needs options.pastMin and options.futureMin (minutes, >= 0)');
    }
    const stepSec = options.stepSec ?? DEFAULT_STEP_SEC;

    if (!Number.isFinite(stepSec) || stepSec < 1) {
      throw new EmbedError('INVALID_ARGUMENT', 'stepSec must be at least 1');
    }
    if (((options.pastMin + options.futureMin) * 60) / stepSec > MAX_SAMPLES) {
      throw new EmbedError('INVALID_ARGUMENT', `Track would exceed ${MAX_SAMPLES} samples; raise stepSec or shorten the window`);
    }
    for (const style of [options.past, options.future]) {
      if (style?.color !== undefined && !isColor(style.color)) {
        throw new EmbedError('INVALID_ARGUMENT', 'track color must be [r, g, b, a] with each channel 0..1');
      }
    }
    let target: Target;

    if (refs === 'host') {
      target = 'host';
    } else {
      if (!Array.isArray(refs)) {
        throw new EmbedError('INVALID_ARGUMENT', "setGroundTracks expects an array of object refs, 'host' or null");
      }
      for (const ref of refs) {
        if (this.catalog_.resolveRef(ref) === null) {
          throw new EmbedError('OBJECT_NOT_FOUND', 'Ground track object not found');
        }
      }
      target = { refs: [...refs] };
    }
    this.clear();
    this.target_ = target;
    this.options_ = { ...options, stepSec };
    this.tick(true);
  }

  /** Remove every track and stop tracking. */
  clear(): void {
    for (const id of [...this.entries_.keys()]) {
      this.drop_(id);
    }
    this.target_ = null;
  }

  /** Remove tracks of freed engine objects. */
  dropForObjectIds(ids: number[]): void {
    for (const id of ids) {
      this.drop_(id);
    }
  }

  /** Engine ids that currently have a track. */
  trackedIds(): number[] {
    return [...this.entries_.keys()];
  }

  /** Recompute everything now (call after upserts so tracks follow new elements without waiting for a tick). */
  invalidate(): void {
    this.tick(true);
  }

  private drop_(id: number): void {
    const entry = this.entries_.get(id);

    if (!entry) {
      return;
    }
    for (const line of [entry.past, entry.future]) {
      if (line) {
        this.engine_.removeLine(line);
      }
    }
    this.entries_.delete(id);
  }

  private targetIds_(): number[] {
    if (this.target_ === null) {
      return [];
    }
    const ids = new Set<number>();

    if (this.target_ === 'host') {
      for (const info of this.catalog_.listHostObjects()) {
        const id = info.hostId === undefined ? null : this.catalog_.resolveRef({ hostId: info.hostId });

        if (id !== null) {
          ids.add(id);
        }
      }
    } else {
      for (const ref of this.target_.refs) {
        const id = this.catalog_.resolveRef(ref);

        if (id !== null) {
          ids.add(id);
        }
      }
    }

    return [...ids];
  }

  /** One scheduling pass. `force` ignores the wall-clock cap (used on set and after upserts). */
  tick(force = false): void {
    if (this.target_ === null) {
      return;
    }
    const wanted = this.targetIds_();

    for (const id of [...this.entries_.keys()]) {
      if (!wanted.includes(id)) {
        this.drop_(id);
      }
    }
    const nowMs = this.engine_.getTimeMs();
    const wall = this.now_();
    const stepMs = this.options_.stepSec * 1000;

    for (const id of wanted) {
      const data = this.engine_.getObjectData(id);
      const sig = data ? `${data.tle1 ?? ''}|${data.tle2 ?? ''}` : '';
      let entry = this.entries_.get(id);

      if (!entry) {
        entry = { id, sig: '', centerMs: Number.NaN, lastComputeWall: -Infinity, past: null, future: null };
        this.entries_.set(id, entry);
      }
      const sigChanged = sig !== entry.sig || Number.isNaN(entry.centerMs);
      const timeStale = nowMs < entry.centerMs || nowMs - entry.centerMs > stepMs;

      if (!sigChanged && !timeStale) {
        continue;
      }
      if (!sigChanged && !force && wall - entry.lastComputeWall < TRACK_MIN_RECOMPUTE_MS) {
        continue;
      }
      this.compute_(entry, nowMs, sig, wall);
    }
  }

  private compute_(entry: TrackEntry, nowMs: number, sig: string, wall: number): void {
    const { pastMin, futureMin, stepSec } = this.options_;
    const stepMs = stepSec * 1000;
    const nPast = Math.ceil((pastMin * 60) / stepSec);
    const nFuture = Math.ceil((futureMin * 60) / stepSec);
    const past: EmbedLatLon[][] = [[]];
    const future: EmbedLatLon[][] = [[]];

    for (let k = -nPast; k <= nFuture; k++) {
      const pos = this.engine_.getPosition(entry.id, nowMs + k * stepMs);

      if (!pos) {
        // Propagation failed (decayed): break the strip instead of joining across the gap.
        if (k <= 0) {
          past.push([]);
        }
        if (k >= 0) {
          future.push([]);
        }
        continue;
      }
      const pt = { lat: pos.lla.lat, lon: pos.lla.lon };

      if (k <= 0) {
        past[past.length - 1].push(pt);
      }
      if (k >= 0) {
        future[future.length - 1].push(pt);
      }
    }
    const base = this.colorFor(entry.id) ?? DEFAULT_COLOR;
    const pastSpec: EngineSurfaceSpec = { strips: past, color: this.options_.past?.color ?? base, dashed: this.options_.past?.dashed ?? false };
    const futureSpec: EngineSurfaceSpec = { strips: future, color: this.options_.future?.color ?? base, dashed: this.options_.future?.dashed ?? true };

    entry.past = this.upsertLine_(entry.past, pastSpec);
    entry.future = this.upsertLine_(entry.future, futureSpec);
    entry.centerMs = nowMs;
    entry.sig = sig;
    entry.lastComputeWall = wall;
  }

  private upsertLine_(line: EngineLine | null, spec: EngineSurfaceSpec): EngineLine | null {
    if (line && this.engine_.isLineAlive(line)) {
      this.engine_.updateSurfaceLine(line, spec);

      return line;
    }

    return this.engine_.addSurfaceLine(spec);
  }
}
