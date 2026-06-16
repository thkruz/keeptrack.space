/**
 * Thread manager for the TOCA/POCA web worker.
 *
 * Provides typed start/cancel methods and routes the single completion result
 * (or an error) back through callbacks. Mirrors the best-pass / debris-screening
 * thread managers' request/response pattern, with a runId guard so a superseded
 * run's late result is discarded.
 */

import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import {
  TpWorkerMsgType,
  TpWorkerOutMsgType,
  type TpMsgStart,
  type TpOutComplete,
  type TpOutError,
  type TpSatData,
  type TpWorkerOutMsg,
} from '@app/webworker/toca-poca-messages';
import type { TocaPocaEventRow } from '@app/plugins-pro/toca-poca-plugin/toca-poca-core';

export interface TocaPocaCallbacks {
  onComplete: (events: TocaPocaEventRow[], closestDistanceKm: number | null, totalFound: number) => void;
  onError: (message: string) => void;
}

export interface TocaPocaParams {
  primary: TpSatData;
  target: TpSatData;
  baseTimeMs: number;
  windowMinutes: number;
  stepSeconds: number;
  maxEvents: number;
  maxDistanceKm: number | null;
}

export class TocaPocaThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/tocaPocaWorker.js';

  private currentRunId_ = 0;
  private callbacks_: TocaPocaCallbacks | null = null;

  protected onMessage(event: MessageEvent): void {
    if (event.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = event.data as TpWorkerOutMsg;

    // Discard stale messages from cancelled/superseded runs.
    if (data.runId !== this.currentRunId_ || !this.callbacks_) {
      return;
    }

    switch (data.typ) {
      case TpWorkerOutMsgType.COMPLETE:
        this.callbacks_.onComplete(
          (data as TpOutComplete).events,
          (data as TpOutComplete).closestDistanceKm,
          (data as TpOutComplete).totalFound,
        );
        this.callbacks_ = null;
        break;
      case TpWorkerOutMsgType.ERROR:
        this.callbacks_.onError((data as TpOutError).message);
        this.callbacks_ = null;
        break;
      default:
        break;
    }
  }

  /** Start a new search, superseding any in-progress run. Returns the new runId. */
  startSearch(params: TocaPocaParams, callbacks: TocaPocaCallbacks): number {
    this.currentRunId_++;
    this.callbacks_ = callbacks;

    const msg: TpMsgStart = {
      typ: TpWorkerMsgType.START,
      runId: this.currentRunId_,
      primary: params.primary,
      target: params.target,
      baseTimeMs: params.baseTimeMs,
      windowMinutes: params.windowMinutes,
      stepSeconds: params.stepSeconds,
      maxEvents: params.maxEvents,
      maxDistanceKm: params.maxDistanceKm,
    };

    this.postMessage(msg);

    return this.currentRunId_;
  }

  /** Cancel the current run (its result, if any, will be discarded). */
  cancelSearch(): void {
    this.postMessage({
      typ: TpWorkerMsgType.CANCEL,
      runId: this.currentRunId_,
    });
    this.callbacks_ = null;
  }
}
