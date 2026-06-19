/**
 * Thread manager for the Neighborhood History web worker.
 * Provides typed start/cancel methods and routes chunked datasets, progress,
 * completion, and errors back through callbacks. Mirrors the overflight thread
 * manager's request/response pattern.
 */

import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import type { OemDataset } from '@app/plugins-pro/neighborhood-history/neighborhood-history-core';
import {
  NhWorkerMsgType,
  NhWorkerOutMsgType,
  type NhFileInput,
  type NhMsgStart,
  type NhOutChunk,
  type NhOutError,
  type NhOutProgress,
  type NhWorkerOutMsg,
} from '@app/webworker/neighborhood-history-messages';

export interface NeighborhoodHistoryCallbacks {
  onChunk: (fileId: number, datasets: OemDataset[]) => void;
  onProgress: (processed: number, total: number) => void;
  onComplete: () => void;
  onError: (message: string) => void;
}

export class NeighborhoodHistoryThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/neighborhoodHistoryWorker.js';

  private currentRunId_ = 0;
  private callbacks_: NeighborhoodHistoryCallbacks | null = null;

  protected onMessage(event: MessageEvent): void {
    if (event.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = event.data as NhWorkerOutMsg;

    // Discard stale messages from cancelled/superseded runs.
    if (data.runId !== this.currentRunId_ || !this.callbacks_) {
      return;
    }

    switch (data.typ) {
      case NhWorkerOutMsgType.CHUNK:
        this.callbacks_.onChunk((data as NhOutChunk).fileId, (data as NhOutChunk).datasets);
        break;
      case NhWorkerOutMsgType.PROGRESS:
        this.callbacks_.onProgress((data as NhOutProgress).processed, (data as NhOutProgress).total);
        break;
      case NhWorkerOutMsgType.COMPLETE:
        this.callbacks_.onComplete();
        this.callbacks_ = null;
        break;
      case NhWorkerOutMsgType.ERROR:
        this.callbacks_.onError((data as NhOutError).message);
        this.callbacks_ = null;
        break;
      default:
        break;
    }
  }

  /** Start a new conversion, cancelling any in-progress run. Returns the new runId. */
  startConversion(files: NhFileInput[], callbacks: NeighborhoodHistoryCallbacks): number {
    this.currentRunId_++;
    this.callbacks_ = callbacks;

    const msg: NhMsgStart = {
      typ: NhWorkerMsgType.START,
      runId: this.currentRunId_,
      files,
    };

    this.postMessage(msg);

    return this.currentRunId_;
  }

  /** Cancel the current run. */
  cancelConversion(): void {
    this.postMessage({
      typ: NhWorkerMsgType.CANCEL,
      runId: this.currentRunId_,
    });
    this.callbacks_ = null;
  }
}
