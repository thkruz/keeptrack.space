/**
 * Thread manager for the Best Pass web worker.
 * Provides typed start/cancel methods and routes chunked results, progress,
 * completion, and errors back through callbacks. Mirrors the debris-screening
 * thread manager's request/response pattern.
 */

import type { lookanglesRow, SensorObjectCruncher } from '@app/engine/core/interfaces';
import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import {
  type BpMsgStart,
  type BpOutChunk,
  type BpOutComplete,
  type BpOutError,
  type BpOutProgress,
  type BpSatData,
  BpWorkerMsgType,
  type BpWorkerOutMsg,
  BpWorkerOutMsgType,
} from '@app/webworker/best-pass-messages';

/** Outcome of one satellite, sent with its chunk so it survives a Cancel. */
export interface BestPassChunkInfo {
  satId: string;
  failed: boolean;
  truncated: boolean;
}

export interface BestPassCallbacks {
  onChunk: (passes: lookanglesRow[], info?: BestPassChunkInfo) => void;
  onProgress: (processed: number, total: number) => void;
  onComplete: (truncated: boolean, details?: { failedIds: string[]; truncatedIds: string[] }) => void;
  onError: (message: string) => void;
}

export interface BestPassParams {
  sats: BpSatData[];
  sensors: SensorObjectCruncher[];
  sensorNames: (string | null)[];
  baseTimeMs: number;
  lengthDays: number;
  intervalSec: number;
  maxResults: number;
  includeClippedPasses?: boolean;
  sunEci: { x: number; y: number; z: number };
}

export class BestPassThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/bestPassWorker.js';

  private currentRunId_ = 0;
  private callbacks_: BestPassCallbacks | null = null;

  protected onMessage(event: MessageEvent): void {
    if (event.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = event.data as BpWorkerOutMsg;

    // Discard stale messages from cancelled/superseded runs.
    if (data.runId !== this.currentRunId_ || !this.callbacks_) {
      return;
    }

    switch (data.typ) {
      case BpWorkerOutMsgType.CHUNK:
        {
          const chunk = data as BpOutChunk;

          if (typeof chunk.satId === 'string') {
            this.callbacks_.onChunk(chunk.passes, { satId: chunk.satId, failed: chunk.failed === true, truncated: chunk.truncated === true });
          } else {
            this.callbacks_.onChunk(chunk.passes);
          }
        }
        break;
      case BpWorkerOutMsgType.PROGRESS:
        this.callbacks_.onProgress((data as BpOutProgress).processed, (data as BpOutProgress).total);
        break;
      case BpWorkerOutMsgType.COMPLETE:
        this.callbacks_.onComplete((data as BpOutComplete).truncated, {
          failedIds: (data as BpOutComplete).failedIds ?? [],
          truncatedIds: (data as BpOutComplete).truncatedIds ?? [],
        });
        this.callbacks_ = null;
        break;
      case BpWorkerOutMsgType.ERROR:
        this.callbacks_.onError((data as BpOutError).message);
        this.callbacks_ = null;
        break;
      default:
        break;
    }
  }

  /** Start a new search, cancelling any in-progress run. Returns the new runId. */
  startBestPass(params: BestPassParams, callbacks: BestPassCallbacks): number {
    this.currentRunId_++;
    this.callbacks_ = callbacks;

    const msg: BpMsgStart = {
      typ: BpWorkerMsgType.START,
      runId: this.currentRunId_,
      sats: params.sats,
      sensors: params.sensors,
      sensorNames: params.sensorNames,
      baseTimeMs: params.baseTimeMs,
      lengthDays: params.lengthDays,
      intervalSec: params.intervalSec,
      maxResults: params.maxResults,
      includeClippedPasses: params.includeClippedPasses,
      sunEci: params.sunEci,
    };

    this.postMessage(msg);

    return this.currentRunId_;
  }

  /** Cancel the current run. */
  cancelBestPass(): void {
    this.postMessage({
      typ: BpWorkerMsgType.CANCEL,
      runId: this.currentRunId_,
    });
    this.callbacks_ = null;
  }
}
