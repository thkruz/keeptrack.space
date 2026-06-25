/**
 * Thread manager for the close objects (conjunction) search web worker.
 * Extends WebWorkerThreadManager and provides typed send methods for starting
 * and cancelling a search and handling the streamed results.
 */

import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import {
  CoWorkerMsgType,
  CoWorkerOutMsgType,
  type CoMsgStartSearch,
  type CoOutComplete,
  type CoOutError,
  type CoOutTcaChunk,
  type CoOutVerified,
  type CoResultRow,
  type CoSatelliteData,
  type CoTcaUpdate,
  type CoWorkerOutMsg,
} from '@app/webworker/close-objects-messages';

export interface CoSearchCallbacks {
  /** Verified pairs (no TCA yet) for a fast first paint of the table. */
  onVerified: (results: CoResultRow[]) => void;
  /** A batch of TCA results to patch onto the painted rows, plus progress. */
  onTcaChunk: (updates: CoTcaUpdate[], processed: number, total: number) => void;
  /** Signals the search finished; tcaCount pairs received a TCA search. */
  onComplete: (tcaCount: number) => void;
  onError: (message: string) => void;
}

export interface CoSearchParams {
  sats: CoSatelliteData[];
  pairs: [number, number][];
  searchRadiusKm: number;
  minMissDistanceKm: number;
  simEpochMs: number;
  verifyOffsetMs: number;
  tcaWindowMs: number;
  coarseStepMs: number;
  tolMs: number;
  maxTcaPairs: number;
}

export class CloseObjectsThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/closeObjectsWorker.js';

  private currentRunId_ = 0;
  private callbacks_: CoSearchCallbacks | null = null;

  protected onMessage(event: MessageEvent) {
    // Handle 'ready' string message from base class
    if (event.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = event.data as CoWorkerOutMsg;

    // Discard stale messages from superseded runs
    if (data.runId !== this.currentRunId_) {
      return;
    }

    if (!this.callbacks_) {
      return;
    }

    switch (data.typ) {
      case CoWorkerOutMsgType.VERIFIED:
        this.callbacks_.onVerified((data as CoOutVerified).results);
        break;
      case CoWorkerOutMsgType.TCA_CHUNK:
        this.callbacks_.onTcaChunk(
          (data as CoOutTcaChunk).updates,
          (data as CoOutTcaChunk).processed,
          (data as CoOutTcaChunk).total,
        );
        break;
      case CoWorkerOutMsgType.COMPLETE:
        this.callbacks_.onComplete((data as CoOutComplete).tcaCount);
        this.callbacks_ = null;
        break;
      case CoWorkerOutMsgType.ERROR:
        this.callbacks_.onError((data as CoOutError).message);
        this.callbacks_ = null;
        break;
      default:
        break;
    }
  }

  /**
   * Start a new search run. Supersedes any in-progress run.
   * @returns The runId for the new run.
   */
  startSearch(params: CoSearchParams, callbacks: CoSearchCallbacks): number {
    this.currentRunId_++;
    this.callbacks_ = callbacks;

    const msg: CoMsgStartSearch = {
      typ: CoWorkerMsgType.START_SEARCH,
      runId: this.currentRunId_,
      sats: params.sats,
      pairs: params.pairs,
      searchRadiusKm: params.searchRadiusKm,
      minMissDistanceKm: params.minMissDistanceKm,
      simEpochMs: params.simEpochMs,
      verifyOffsetMs: params.verifyOffsetMs,
      tcaWindowMs: params.tcaWindowMs,
      coarseStepMs: params.coarseStepMs,
      tolMs: params.tolMs,
      maxTcaPairs: params.maxTcaPairs,
    };

    this.postMessage(msg);

    return this.currentRunId_;
  }

  /** Cancel the current search run. */
  cancelSearch(): void {
    this.postMessage({
      typ: CoWorkerMsgType.CANCEL,
      runId: this.currentRunId_,
    });
    this.callbacks_ = null;
  }
}
