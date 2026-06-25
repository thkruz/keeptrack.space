/**
 * Thread manager for the Proximity Ops web worker.
 *
 * Provides typed start/cancel methods and routes streamed progress, the single
 * completion result, or an error back through callbacks. Mirrors the overflight
 * thread manager's request/response pattern, with a runId guard so a superseded
 * run's late messages are discarded.
 */

import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import type { ProximityOpsEvent, ProxSatData, RpoSearchMode, RpoSearchParams } from '@app/plugins/proximity-ops/proximity-ops-core';
import {
  RpoWorkerMsgType,
  RpoWorkerOutMsgType,
  type RpoMsgStart,
  type RpoOutComplete,
  type RpoOutError,
  type RpoOutProgress,
  type RpoWorkerOutMsg,
} from '@app/webworker/proximity-ops-messages';

export interface ProximityOpsCallbacks {
  onProgress: (done: number, total: number) => void;
  onComplete: (events: ProximityOpsEvent[]) => void;
  onError: (message: string) => void;
}

export interface ProximityOpsThreadParams {
  mode: RpoSearchMode;
  sats: ProxSatData[];
  params: RpoSearchParams;
}

export class ProximityOpsThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/proximityOpsWorker.js';

  private currentRunId_ = 0;
  private callbacks_: ProximityOpsCallbacks | null = null;

  protected onMessage(event: MessageEvent): void {
    if (event.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = event.data as RpoWorkerOutMsg;

    // Discard stale messages from cancelled/superseded runs.
    if (data.runId !== this.currentRunId_ || !this.callbacks_) {
      return;
    }

    switch (data.typ) {
      case RpoWorkerOutMsgType.PROGRESS:
        this.callbacks_.onProgress((data as RpoOutProgress).done, (data as RpoOutProgress).total);
        break;
      case RpoWorkerOutMsgType.COMPLETE:
        this.callbacks_.onComplete((data as RpoOutComplete).events);
        this.callbacks_ = null;
        break;
      case RpoWorkerOutMsgType.ERROR:
        this.callbacks_.onError((data as RpoOutError).message);
        this.callbacks_ = null;
        break;
      default:
        break;
    }
  }

  /** Start a new survey, superseding any in-progress run. Returns the new runId. */
  startSurvey(params: ProximityOpsThreadParams, callbacks: ProximityOpsCallbacks): number {
    this.currentRunId_++;
    this.callbacks_ = callbacks;

    const msg: RpoMsgStart = {
      typ: RpoWorkerMsgType.START,
      runId: this.currentRunId_,
      mode: params.mode,
      sats: params.sats,
      params: params.params,
    };

    this.postMessage(msg);

    return this.currentRunId_;
  }

  /** Cancel the current run (its result, if any, will be discarded). */
  cancelSurvey(): void {
    this.postMessage({
      typ: RpoWorkerMsgType.CANCEL,
      runId: this.currentRunId_,
    });
    this.callbacks_ = null;
  }
}
