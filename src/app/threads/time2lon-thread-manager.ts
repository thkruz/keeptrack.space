/**
 * Thread manager for the Time2Lon (Waterfall) web worker.
 * Provides typed start/cancel methods and routes per-satellite line chunks,
 * progress, completion, and errors back through callbacks. The runId discards
 * stale messages from a superseded run, which is what keeps rapid filter changes
 * from rendering out-of-order results. Mirrors the overflight thread manager.
 */

import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import type { Time2LonSatLine } from '@app/plugins/plot-analysis/time2lon-core';
import {
  type T2lMsgStart,
  type T2lOutChunk,
  type T2lOutError,
  type T2lOutProgress,
  type T2lSatData,
  T2lWorkerMsgType,
  type T2lWorkerOutMsg,
  T2lWorkerOutMsgType,
} from '@app/webworker/time2lon-messages';

export interface Time2LonCallbacks {
  onChunk: (line: Time2LonSatLine | null) => void;
  onProgress: (processed: number, total: number) => void;
  onComplete: () => void;
  onError: (message: string) => void;
}

export interface Time2LonParams {
  sats: T2lSatData[];
  nowMs: number;
  samplePoints: number;
  maxTimeMin: number;
}

export class Time2LonThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/time2lonWorker.js';

  private currentRunId_ = 0;
  private callbacks_: Time2LonCallbacks | null = null;

  protected onMessage(event: MessageEvent): void {
    if (event.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = event.data as T2lWorkerOutMsg;

    // Discard stale messages from cancelled/superseded runs.
    if (data.runId !== this.currentRunId_ || !this.callbacks_) {
      return;
    }

    switch (data.typ) {
      case T2lWorkerOutMsgType.CHUNK:
        this.callbacks_.onChunk((data as T2lOutChunk).line);
        break;
      case T2lWorkerOutMsgType.PROGRESS:
        this.callbacks_.onProgress((data as T2lOutProgress).processed, (data as T2lOutProgress).total);
        break;
      case T2lWorkerOutMsgType.COMPLETE:
        this.callbacks_.onComplete();
        this.callbacks_ = null;
        break;
      case T2lWorkerOutMsgType.ERROR:
        this.callbacks_.onError((data as T2lOutError).message);
        this.callbacks_ = null;
        break;
      default:
        break;
    }
  }

  /** Start a new computation, cancelling any in-progress run. Returns the new runId. */
  startTime2Lon(params: Time2LonParams, callbacks: Time2LonCallbacks): number {
    this.currentRunId_++;
    this.callbacks_ = callbacks;

    const msg: T2lMsgStart = {
      typ: T2lWorkerMsgType.START,
      runId: this.currentRunId_,
      sats: params.sats,
      nowMs: params.nowMs,
      samplePoints: params.samplePoints,
      maxTimeMin: params.maxTimeMin,
    };

    this.postMessage(msg);

    return this.currentRunId_;
  }

  /** Cancel the current run. */
  cancelTime2Lon(): void {
    this.postMessage({
      typ: T2lWorkerMsgType.CANCEL,
      runId: this.currentRunId_,
    });
    this.callbacks_ = null;
  }
}
