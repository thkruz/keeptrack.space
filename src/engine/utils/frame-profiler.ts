/*
 * Ring, GpuTimer, and FrameProfiler are one cohesive unit (a buffer, the GPU
 * query pump it feeds, and the collector that owns both), so they live together.
 */
/* eslint-disable max-classes-per-file */
import { ServiceLocator } from '@app/engine/core/service-locator';

/**
 * Per-frame performance profiler.
 *
 * A singleton that collects fine-grained CPU and GPU timings for the render
 * loop so a slow machine can be diagnosed beyond a single FPS number. It is
 * **disabled by default** and every hook early-returns when off, so the
 * instrumentation sprinkled through the engine costs a branch per call when
 * nobody is profiling.
 *
 * CPU stages are timed with `performance.now()` around single statements and
 * may nest freely. GPU stages use the WebGL2 `EXT_disjoint_timer_query_webgl2`
 * extension (`TIME_ELAPSED_EXT`); because only one such query can be active at
 * a time, GPU hooks must wrap **non-overlapping** leaf draw calls. Results come
 * back a few frames late and are polled once per frame in {@link frameEnd}.
 *
 * The Debug Menu plugin turns this on, reads {@link getSnapshot}, and renders /
 * exports the breakdown.
 */

/** Rolling window length (frames). ~4s at 60fps - long enough to smooth spikes. */
const RING_CAPACITY = 240;
/** Hard cap on unresolved GPU queries so a stalled pipeline can't leak memory. */
const MAX_PENDING_QUERIES = 64;
/** Free-list cap for recycled query objects. */
const QUERY_POOL_CAP = 32;

/** CPU stage identifiers. Kept stable - the UI humanizes them for display. */
export const CpuStage = {
  updateEvent: 'cpu:update-event',
  rendererUpdate: 'cpu:renderer-update',
  primarySat: 'cpu:primary-sat',
  camera: 'cpu:camera',
  sceneUpdate: 'cpu:scene-update',
  orbitsAbove: 'cpu:orbits-above',
  drawSubmit: 'cpu:draw-submit',
} as const;

/** GPU stage identifiers (non-overlapping leaves within one frame). */
export const GpuStage = {
  sun: 'gpu:sun',
  godrays: 'gpu:godrays',
  earth: 'gpu:earth',
  dots: 'gpu:dots',
  picking: 'gpu:picking',
  labels: 'gpu:labels',
  orbits: 'gpu:orbits',
  lines: 'gpu:lines',
  mesh: 'gpu:mesh',
  transparent: 'gpu:transparent',
  fov: 'gpu:fov',
} as const;

/**
 * Top-level CPU stages whose averages sum to a meaningful main-thread total.
 * Excludes the renderer sub-stages (camera/scene/etc.) which are nested inside
 * {@link CpuStage.rendererUpdate} and would double-count.
 */
const TOP_LEVEL_CPU_STAGES = new Set<string>([CpuStage.updateEvent, CpuStage.rendererUpdate, CpuStage.drawSubmit]);

export interface StageStat {
  id: string;
  last: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
  samples: number;
}

export interface ProfilerSnapshot {
  enabled: boolean;
  gpuSupported: boolean;
  frames: number;
  fps: { avg: number; low1: number };
  frameTimeMs: { avg: number; p50: number; p95: number; p99: number; max: number };
  cpu: StageStat[];
  gpu: StageStat[];
  /** Sum of GPU stage averages. Valid because GPU stages never overlap. */
  gpuTotalAvgMs: number;
  /** Sum of the top-level CPU stage averages (no nested double-counting). */
  cpuTopAvgMs: number;
  /** Count of GPU_DISJOINT events - high values mean GPU timings are unreliable. */
  disjointEvents: number;
}

/** Minimal shape of the WebGL2 disjoint timer-query extension. */
interface DisjointTimerExt {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

/** Fixed-capacity circular buffer of samples with cheap stats. */
class Ring {
  private readonly buf_: Float64Array;
  private idx_ = 0;
  private count_ = 0;

  constructor(capacity: number) {
    this.buf_ = new Float64Array(capacity);
  }

  push(value: number): void {
    this.buf_[this.idx_] = value;
    this.idx_ = (this.idx_ + 1) % this.buf_.length;
    if (this.count_ < this.buf_.length) {
      this.count_++;
    }
  }

  clear(): void {
    this.idx_ = 0;
    this.count_ = 0;
  }

  get size(): number {
    return this.count_;
  }

  last(): number {
    if (this.count_ === 0) {
      return 0;
    }
    const i = (this.idx_ - 1 + this.buf_.length) % this.buf_.length;

    return this.buf_[i];
  }

  avg(): number {
    if (this.count_ === 0) {
      return 0;
    }
    let sum = 0;

    for (let i = 0; i < this.count_; i++) {
      sum += this.buf_[i];
    }

    return sum / this.count_;
  }

  /** Ascending copy of the populated slots (order-independent stats only). */
  sorted(): number[] {
    const out: number[] = [];

    for (let i = 0; i < this.count_; i++) {
      out.push(this.buf_[i]);
    }
    out.sort((a, b) => a - b);

    return out;
  }
}

/** Percentile from an already-ascending array (nearest-rank). */
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) {
    return 0;
  }
  const rank = Math.round((p / 100) * (sortedAsc.length - 1));
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, rank));

  return sortedAsc[idx];
}

interface PendingQuery {
  stage: string;
  query: WebGLQuery;
}

/**
 * Manages a pool of `TIME_ELAPSED_EXT` queries. Only one query is active at any
 * moment (the extension forbids overlap); results are drained in submission
 * order a few frames later.
 */
class GpuTimer {
  private gl_: WebGL2RenderingContext | null = null;
  private ext_: DisjointTimerExt | null = null;
  private supported_ = false;
  private activeStage_: string | null = null;
  private readonly pending_: PendingQuery[] = [];
  private readonly free_: WebGLQuery[] = [];
  disjointEvents = 0;

  get supported(): boolean {
    return this.supported_;
  }

  /** Lazily grabs the live context + extension. Safe to call repeatedly. */
  init(): void {
    if (this.gl_) {
      return;
    }
    try {
      const gl = ServiceLocator.getRenderer()?.gl ?? null;

      if (!gl) {
        return;
      }
      this.gl_ = gl;
      this.ext_ = gl.getExtension('EXT_disjoint_timer_query_webgl2') as DisjointTimerExt | null;
      this.supported_ = this.ext_ !== null && typeof this.ext_.TIME_ELAPSED_EXT === 'number';
    } catch {
      this.supported_ = false;
    }
  }

  begin(stage: string): void {
    if (!this.supported_ || !this.gl_ || !this.ext_) {
      return;
    }
    // Never overlap a TIME_ELAPSED query - a misplaced hook must not corrupt state.
    if (this.activeStage_ !== null) {
      return;
    }
    const query = this.free_.pop() ?? this.gl_.createQuery();

    if (!query) {
      return;
    }
    this.gl_.beginQuery(this.ext_.TIME_ELAPSED_EXT, query);
    this.activeStage_ = stage;
    this.pending_.push({ stage, query });
  }

  end(stage: string): void {
    if (!this.supported_ || !this.gl_ || !this.ext_ || this.activeStage_ !== stage) {
      return;
    }
    this.gl_.endQuery(this.ext_.TIME_ELAPSED_EXT);
    this.activeStage_ = null;
  }

  /** Resolves completed queries, feeding each stage's elapsed ms to `sink`. */
  poll(sink: (stage: string, ms: number) => void): void {
    if (!this.supported_ || !this.gl_ || !this.ext_) {
      return;
    }
    const gl = this.gl_;

    // Recover a query left open by an early return / throw between begin and end.
    if (this.activeStage_ !== null) {
      try {
        gl.endQuery(this.ext_.TIME_ELAPSED_EXT);
      } catch {
        // Context may be lost; nothing to recover.
      }
      this.activeStage_ = null;
    }

    if (gl.getParameter(this.ext_.GPU_DISJOINT_EXT)) {
      // A disjoint event invalidates all in-flight timings.
      this.disjointEvents++;
      for (const p of this.pending_) {
        this.recycle_(p.query);
      }
      this.pending_.length = 0;

      return;
    }

    // Queries resolve in submission order, so drain from the front.
    while (this.pending_.length > 0) {
      const head = this.pending_[0];

      if (!gl.getQueryParameter(head.query, gl.QUERY_RESULT_AVAILABLE)) {
        break;
      }
      const ns = gl.getQueryParameter(head.query, gl.QUERY_RESULT) as number;

      sink(head.stage, ns / 1e6);
      this.recycle_(head.query);
      this.pending_.shift();
    }

    if (this.pending_.length > MAX_PENDING_QUERIES) {
      const dropped = this.pending_.splice(0, this.pending_.length - MAX_PENDING_QUERIES);

      for (const p of dropped) {
        this.recycle_(p.query);
      }
    }
  }

  dispose(): void {
    const gl = this.gl_;

    if (gl && this.ext_) {
      if (this.activeStage_ !== null) {
        try {
          gl.endQuery(this.ext_.TIME_ELAPSED_EXT);
        } catch {
          // ignore
        }
        this.activeStage_ = null;
      }
      for (const p of this.pending_) {
        gl.deleteQuery(p.query);
      }
      for (const q of this.free_) {
        gl.deleteQuery(q);
      }
    }
    this.pending_.length = 0;
    this.free_.length = 0;
  }

  private recycle_(query: WebGLQuery): void {
    if (this.free_.length < QUERY_POOL_CAP) {
      this.free_.push(query);
    } else {
      this.gl_?.deleteQuery(query);
    }
  }
}

export class FrameProfiler {
  private static instance_: FrameProfiler | null = null;

  static getInstance(): FrameProfiler {
    this.instance_ ??= new FrameProfiler();

    return this.instance_;
  }

  private enabled_ = false;
  private readonly gpu_ = new GpuTimer();
  private readonly frameTime_ = new Ring(RING_CAPACITY);
  private readonly cpuRings_ = new Map<string, Ring>();
  private readonly gpuRings_ = new Map<string, Ring>();
  private readonly cpuStart_ = new Map<string, number>();
  private readonly cpuFrameSum_ = new Map<string, number>();
  private frames_ = 0;

  get enabled(): boolean {
    return this.enabled_;
  }

  get gpuSupported(): boolean {
    return this.gpu_.supported;
  }

  setEnabled(on: boolean): void {
    if (on === this.enabled_) {
      return;
    }
    this.enabled_ = on;
    if (on) {
      this.reset();
      this.gpu_.init();
    } else {
      this.gpu_.dispose();
    }
  }

  reset(): void {
    this.frameTime_.clear();
    this.cpuRings_.clear();
    this.gpuRings_.clear();
    this.cpuStart_.clear();
    this.cpuFrameSum_.clear();
    this.frames_ = 0;
    this.gpu_.disjointEvents = 0;
  }

  /** Called once at the top of the frame with the frame delta (ms). */
  frameStart(dt: number): void {
    if (!this.enabled_) {
      return;
    }
    if (dt > 0) {
      this.frameTime_.push(dt);
    }
    this.frames_++;
  }

  /** Called once at the end of the frame: flush CPU sums, resolve GPU queries. */
  frameEnd(): void {
    if (!this.enabled_) {
      return;
    }
    for (const [stage, sum] of this.cpuFrameSum_) {
      this.ringFor_(this.cpuRings_, stage).push(sum);
    }
    this.cpuFrameSum_.clear();
    this.gpu_.poll((stage, ms) => {
      this.ringFor_(this.gpuRings_, stage).push(ms);
    });
  }

  beginCpu(stage: string): void {
    if (!this.enabled_) {
      return;
    }
    this.cpuStart_.set(stage, performance.now());
  }

  endCpu(stage: string): void {
    if (!this.enabled_) {
      return;
    }
    const start = this.cpuStart_.get(stage);

    if (typeof start !== 'number') {
      return;
    }
    const elapsed = performance.now() - start;

    this.cpuFrameSum_.set(stage, (this.cpuFrameSum_.get(stage) ?? 0) + elapsed);
  }

  beginGpu(stage: string): void {
    if (!this.enabled_) {
      return;
    }
    this.gpu_.begin(stage);
  }

  endGpu(stage: string): void {
    if (!this.enabled_) {
      return;
    }
    this.gpu_.end(stage);
  }

  getSnapshot(): ProfilerSnapshot {
    const frameSorted = this.frameTime_.sorted();
    const frameAvg = this.frameTime_.avg();
    const frameP99 = percentile(frameSorted, 99);
    const cpu = this.collectStats_(this.cpuRings_);
    const gpu = this.collectStats_(this.gpuRings_);
    const gpuTotalAvgMs = gpu.reduce((sum, s) => sum + s.avg, 0);
    const cpuTopAvgMs = cpu
      .filter((s) => TOP_LEVEL_CPU_STAGES.has(s.id))
      .reduce((sum, s) => sum + s.avg, 0);

    return {
      enabled: this.enabled_,
      gpuSupported: this.gpu_.supported,
      frames: this.frames_,
      fps: {
        avg: frameAvg > 0 ? 1000 / frameAvg : 0,
        low1: frameP99 > 0 ? 1000 / frameP99 : 0,
      },
      frameTimeMs: {
        avg: frameAvg,
        p50: percentile(frameSorted, 50),
        p95: percentile(frameSorted, 95),
        p99: frameP99,
        max: frameSorted.at(-1) ?? 0,
      },
      cpu,
      gpu,
      gpuTotalAvgMs,
      cpuTopAvgMs,
      disjointEvents: this.gpu_.disjointEvents,
    };
  }

  private collectStats_(map: Map<string, Ring>): StageStat[] {
    const stats: StageStat[] = [];

    for (const [id, ring] of map) {
      if (ring.size === 0) {
        continue;
      }
      const sorted = ring.sorted();

      stats.push({
        id,
        last: ring.last(),
        avg: ring.avg(),
        min: sorted[0],
        max: sorted.at(-1) ?? 0,
        p95: percentile(sorted, 95),
        samples: ring.size,
      });
    }
    // Biggest average first - the panel wants the bottleneck on top.
    stats.sort((a, b) => b.avg - a.avg);

    return stats;
  }

  private ringFor_(map: Map<string, Ring>, stage: string): Ring {
    let ring = map.get(stage);

    if (!ring) {
      ring = new Ring(RING_CAPACITY);
      map.set(stage, ring);
    }

    return ring;
  }
}
