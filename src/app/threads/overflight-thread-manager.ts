/**
 * Thread manager for the Overflight web worker.
 * Provides typed start/cancel methods and routes chunked results, progress,
 * completion, and errors back through callbacks. Mirrors the best-pass thread
 * manager's request/response pattern.
 */

import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import type { ZoneDefinition } from '@app/plugins-pro/overflight/overflight-pass-math';
import type { OverflightResult } from '@app/plugins-pro/overflight/overflight-search';
import {
  OfWorkerMsgType,
  OfWorkerOutMsgType,
  type OfMsgStart,
  type OfOutChunk,
  type OfOutError,
  type OfOutProgress,
  type OfSatData,
  type OfWorkerOutMsg,
} from '@app/webworker/overflight-messages';

export interface OverflightCallbacks {
  onChunk: (results: OverflightResult[]) => void;
  onProgress: (processed: number, total: number) => void;
  onComplete: () => void;
  onError: (message: string) => void;
}

export interface OverflightParams {
  sats: OfSatData[];
  zone: ZoneDefinition;
  startMs: number;
  durationSec: number;
  intervalSec: number;
}

export class OverflightThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/overflightWorker.js';

  private currentRunId_ = 0;
  private callbacks_: OverflightCallbacks | null = null;

  protected onMessage(event: MessageEvent): void {
    if (event.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = event.data as OfWorkerOutMsg;

    // Discard stale messages from cancelled/superseded runs.
    if (data.runId !== this.currentRunId_ || !this.callbacks_) {
      return;
    }

    switch (data.typ) {
      case OfWorkerOutMsgType.CHUNK:
        this.callbacks_.onChunk((data as OfOutChunk).results);
        break;
      case OfWorkerOutMsgType.PROGRESS:
        this.callbacks_.onProgress((data as OfOutProgress).processed, (data as OfOutProgress).total);
        break;
      case OfWorkerOutMsgType.COMPLETE:
        this.callbacks_.onComplete();
        this.callbacks_ = null;
        break;
      case OfWorkerOutMsgType.ERROR:
        this.callbacks_.onError((data as OfOutError).message);
        this.callbacks_ = null;
        break;
      default:
        break;
    }
  }

  /** Start a new search, cancelling any in-progress run. Returns the new runId. */
  startOverflight(params: OverflightParams, callbacks: OverflightCallbacks): number {
    this.currentRunId_++;
    this.callbacks_ = callbacks;

    const msg: OfMsgStart = {
      typ: OfWorkerMsgType.START,
      runId: this.currentRunId_,
      sats: params.sats,
      zone: params.zone,
      startMs: params.startMs,
      durationSec: params.durationSec,
      intervalSec: params.intervalSec,
    };

    this.postMessage(msg);

    return this.currentRunId_;
  }

  /** Cancel the current run. */
  cancelOverflight(): void {
    this.postMessage({
      typ: OfWorkerMsgType.CANCEL,
      runId: this.currentRunId_,
    });
    this.callbacks_ = null;
  }
}
