/**
 * Thread manager for the Az/Range Heatmap web worker.
 *
 * Spawns up to 8 workers (capped by `navigator.hardwareConcurrency`) and
 * partitions the satellite catalog evenly across them. Each worker runs the
 * full time window over its slice of satellites so all workers finish in
 * roughly the same wall-clock time. PARTIAL and RESULT messages are merged
 * element-wise before forwarding to the plugin callbacks.
 *
 * Node/test fallback: when `isThisNode()` is true the base-class single-worker
 * stub path is used instead.
 */

import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import { isThisNode } from '@app/engine/utils/isThisNode';
import {
  AzRangeMsgType,
  AzRangeOutMsgType,
  type AzRangeMsgStart,
  type AzRangeOutError,
  type AzRangeOutPartial,
  type AzRangeOutResult,
  type AzRangeTleEntry,
  type AzRangeWorkerOutMsg,
} from '@app/webworker/az-range-heatmap-messages';

export interface AzRangeCallbacks {
  onPartial: (partial: AzRangeOutPartial) => void;
  onResult: (result: AzRangeOutResult) => void;
  onError: (message: string) => void;
}

export interface AzRangeParams {
  tleData: AzRangeTleEntry[];
  sensorLat: number;
  sensorLon: number;
  sensorAlt: number;
  sensorMaxRng: number;
  startTimeMs: number;
  durationSec: number;
  stepSec: number;
  elevationDeg: number;
  marginDeg: number;
  numAzBins: number;
  numRngBins: number;
  fovMinAz: number;
  fovMaxAz: number;
  fovMinAz2?: number;
  fovMaxAz2?: number;
}

export class AzRangeHeatmapThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/azRangeHeatmapWorker.js';

  private currentRunId_ = 0;
  private callbacks_: AzRangeCallbacks | null = null;

  /** Browser fleet; empty in the Node/test path (uses base-class worker_ instead). */
  private fleet_: Worker[] = [];

  // Aggregation state for the current run
  private pendingWorkers_ = 0;
  private aggregateBins_: number[][] = [];
  private aggregateSatNums_: string[][][] = [];
  private latestPartialBins_: (number[][] | null)[] = [];
  private maxStepsProcessed_ = 0;
  private curNumAzBins_ = 0;
  private curNumRngBins_ = 0;
  private curMaxRng_ = 0;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  override init(workerStub?: Worker): void {
    if (isThisNode()) {
      super.init(workerStub);

      return;
    }

    const hwCores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 4) : 4;
    const n = Math.min(Math.max(1, hwCores), 8);

    for (let i = 0; i < n; i++) {
      const idx = i;
      const w = new Worker(`./${this.WEB_WORKER_CODE}`);

      w.onmessage = (e: MessageEvent) => this.handleWorkerMessage_(idx, e);
      w.onerror = (e: ErrorEvent) => {
        if (!this.callbacks_) {
          return;
        }
        this.callbacks_.onError(e.message || 'Worker error');
        this.callbacks_ = null;
      };
      this.fleet_.push(w);
    }

    this.isReady_ = true;
  }

  override terminate(): void {
    for (const w of this.fleet_) {
      w.terminate();
    }
    this.fleet_ = [];
    super.terminate();
  }

  // ── Node/test shim ─────────────────────────────────────────────────────────

  /** Routes base-class onMessage calls (Node single-worker path) into the same handler. */
  protected override onMessage(event: MessageEvent): void {
    this.handleWorkerMessage_(0, event);
  }

  // ── Message routing ────────────────────────────────────────────────────────

  private handleWorkerMessage_(workerIdx: number, event: MessageEvent): void {
    if (event.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = event.data as AzRangeWorkerOutMsg;

    if (!('runId' in data) || data.runId !== this.currentRunId_ || !this.callbacks_) {
      return;
    }

    switch (data.typ) {
      case AzRangeOutMsgType.PARTIAL:
        this.mergePartial_(workerIdx, data as AzRangeOutPartial);
        break;
      case AzRangeOutMsgType.RESULT:
        this.mergeResult_(data as AzRangeOutResult);
        break;
      case AzRangeOutMsgType.ERROR:
        this.callbacks_.onError((data as AzRangeOutError).message);
        this.callbacks_ = null;
        break;
      default:
        break;
    }
  }

  // ── Partial aggregation ────────────────────────────────────────────────────

  private mergePartial_(workerIdx: number, partial: AzRangeOutPartial): void {
    this.latestPartialBins_[workerIdx] = partial.bins;

    // Advance monotonically — workers run at slightly different speeds so the
    // reported step count can oscillate if we forward each worker's own count.
    this.maxStepsProcessed_ = Math.max(this.maxStepsProcessed_, partial.stepsProcessed);

    const merged = this.sumBinArrays_(this.latestPartialBins_);

    this.callbacks_?.onPartial({
      ...partial,
      bins: merged,
      stepsProcessed: this.maxStepsProcessed_,
    });
  }

  // ── Result aggregation ─────────────────────────────────────────────────────

  private mergeResult_(result: AzRangeOutResult): void {
    // Each worker's bins are already normalized (÷ numSteps). Summing across
    // workers is correct because satellite slices are disjoint.
    for (let az = 0; az < this.curNumAzBins_; az++) {
      for (let rng = 0; rng < this.curNumRngBins_; rng++) {
        this.aggregateBins_[az][rng] += result.bins[az][rng];

        for (const s of result.binSatNums[az][rng]) {
          this.aggregateSatNums_[az][rng].push(s);
        }
      }
    }

    this.pendingWorkers_--;

    if (this.pendingWorkers_ === 0) {
      this.callbacks_?.onResult({
        typ: AzRangeOutMsgType.RESULT,
        runId: this.currentRunId_,
        bins: this.aggregateBins_,
        numAzBins: this.curNumAzBins_,
        numRngBins: this.curNumRngBins_,
        maxRng: this.curMaxRng_,
        binSatNums: this.aggregateSatNums_,
      });
      this.callbacks_ = null;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private sumBinArrays_(partials: (number[][] | null)[]): number[][] {
    const result: number[][] = Array.from({ length: this.curNumAzBins_ }, () =>
      new Array(this.curNumRngBins_).fill(0),
    );

    for (const bins of partials) {
      if (!bins) {
        continue;
      }

      for (let az = 0; az < this.curNumAzBins_; az++) {
        for (let rng = 0; rng < this.curNumRngBins_; rng++) {
          result[az][rng] += bins[az][rng];
        }
      }
    }

    return result;
  }

  private splitArray_<T>(arr: T[], n: number): T[][] {
    const size = Math.ceil(arr.length / n);

    return Array.from({ length: n }, (_, i) => arr.slice(i * size, (i + 1) * size)).filter(
      (chunk) => chunk.length > 0,
    );
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  start(params: AzRangeParams, callbacks: AzRangeCallbacks): number {
    this.currentRunId_++;
    this.callbacks_ = callbacks;

    const activeWorkers: Worker[] =
      this.fleet_.length > 0 ? this.fleet_ : this.worker_ ? [this.worker_] : [];

    this.curNumAzBins_ = params.numAzBins;
    this.curNumRngBins_ = params.numRngBins;
    this.curMaxRng_ = params.sensorMaxRng;

    const chunks = this.splitArray_(params.tleData, activeWorkers.length);

    this.pendingWorkers_ = chunks.length;
    this.maxStepsProcessed_ = 0;
    this.aggregateBins_ = Array.from({ length: params.numAzBins }, () =>
      new Array(params.numRngBins).fill(0),
    );
    this.aggregateSatNums_ = Array.from({ length: params.numAzBins }, () =>
      Array.from({ length: params.numRngBins }, (): string[] => []),
    );
    this.latestPartialBins_ = new Array(chunks.length).fill(null);

    chunks.forEach((chunk, i) => {
      const msg: AzRangeMsgStart = {
        typ: AzRangeMsgType.START,
        runId: this.currentRunId_,
        ...params,
        tleData: chunk,
      };
      activeWorkers[i].postMessage(msg);
    });

    return this.currentRunId_;
  }

  cancel(): void {
    const activeWorkers: Worker[] =
      this.fleet_.length > 0 ? this.fleet_ : this.worker_ ? [this.worker_] : [];

    for (const w of activeWorkers) {
      w.postMessage({ typ: AzRangeMsgType.CANCEL, runId: this.currentRunId_ });
    }
    this.callbacks_ = null;
  }
}
