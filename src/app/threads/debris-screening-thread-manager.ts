/**
 * Thread manager for the debris screening web worker.
 * Extends WebWorkerThreadManager and provides typed send methods
 * for starting/cancelling screening runs and handling chunked results.
 */

import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import {
  type DsMsgStartScreening,
  type DsOutChunk,
  type DsOutComplete,
  type DsOutError,
  type DsOutProgress,
  type DsResultRow,
  type DsSatelliteData,
  DsWorkerMsgType,
  type DsWorkerOutMsg,
  DsWorkerOutMsgType,
} from '@app/webworker/debris-screening-messages';

export interface DsScreeningCallbacks {
  onChunk: (results: DsResultRow[], processedCount: number, totalCandidates: number) => void;
  onComplete: (totalResults: number, totalCandidates: number) => void;
  onError: (message: string) => void;
  onProgress: (phase: string, candidateCount: number) => void;
}

/**
 * A secondary with an optional screening window of its own. When both bounds
 * are set, the worker assesses this secondary over [windowStartMs, windowEndMs]
 * (clamped to the run window) instead of the whole run window. A caller that
 * has already located the approaches (a pre-filter) can send the same object
 * several times with one short window per approach. Without the fields the
 * run window applies, which is the single-primary behaviour.
 */
export interface DsSecondaryData extends DsSatelliteData {
  windowStartMs?: number;
  windowEndMs?: number;
}

export interface DsScreeningParams {
  primary: DsSatelliteData;
  secondaries: DsSecondaryData[];
  startTimeMs: number;
  endTimeMs: number;
  searchStepSize: number;
  uVal: number;
  vVal: number;
  wVal: number;
  batchSize?: number;
  covarianceConfidenceLevel: number;
}

export class DebrisScreeningThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/debrisScreeningWorker.js';

  private currentRunId_ = 0;
  private callbacks_: DsScreeningCallbacks | null = null;

  protected onMessage(event: MessageEvent) {
    // Handle 'ready' string message from base class
    if (event.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = event.data as DsWorkerOutMsg;

    // Discard stale messages from old runs
    if (data.runId !== this.currentRunId_) {
      return;
    }

    if (!this.callbacks_) {
      return;
    }

    switch (data.typ) {
      case DsWorkerOutMsgType.CHUNK:
        this.callbacks_.onChunk((data as DsOutChunk).results, (data as DsOutChunk).processedCount, (data as DsOutChunk).totalCandidates);
        break;
      case DsWorkerOutMsgType.COMPLETE:
        this.callbacks_.onComplete((data as DsOutComplete).totalResults, (data as DsOutComplete).totalCandidates);
        this.callbacks_ = null;
        break;
      case DsWorkerOutMsgType.ERROR:
        this.callbacks_.onError((data as DsOutError).message);
        this.callbacks_ = null;
        break;
      case DsWorkerOutMsgType.PROGRESS:
        this.callbacks_.onProgress((data as DsOutProgress).phase, (data as DsOutProgress).candidateCount);
        break;
      default:
        break;
    }
  }

  /**
   * Start a new screening run. Cancels any in-progress run.
   * Returns the runId for the new run.
   */
  startScreening(params: DsScreeningParams, callbacks: DsScreeningCallbacks): number {
    this.currentRunId_++;
    this.callbacks_ = callbacks;

    const msg: DsMsgStartScreening = {
      typ: DsWorkerMsgType.START_SCREENING,
      runId: this.currentRunId_,
      primary: params.primary,
      secondaries: params.secondaries,
      startTimeMs: params.startTimeMs,
      endTimeMs: params.endTimeMs,
      searchStepSize: params.searchStepSize,
      uVal: params.uVal,
      vVal: params.vVal,
      wVal: params.wVal,
      batchSize: params.batchSize ?? 15,
      covarianceConfidenceLevel: params.covarianceConfidenceLevel,
    };

    this.postMessage(msg);

    return this.currentRunId_;
  }

  /**
   * Cancel the current screening run.
   */
  cancelScreening(): void {
    this.postMessage({
      typ: DsWorkerMsgType.CANCEL,
      runId: this.currentRunId_,
    });
    this.callbacks_ = null;
  }
}
