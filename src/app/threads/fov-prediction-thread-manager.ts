/**
 * Thread manager for the FOV Prediction web worker.
 * Sends catalog + sensor data, receives per-satellite "minutes to next FOV entry" results.
 */

import type { SensorObjectCruncher } from '@app/engine/core/interfaces';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import { FovPredMsgType, type FovPredOutMsg, FovPredOutMsgType } from '@app/webworker/fov-prediction-messages';

export class FovPredictionThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/fovPredictionWorker.js';

  private minutesToEntry_: Float32Array | null = null;
  private onProgress_: ((progress: number) => void) | null = null;

  get minutesToEntry(): Float32Array | null {
    return this.minutesToEntry_;
  }

  protected onMessage(event: MessageEvent): void {
    if (event.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = event.data as FovPredOutMsg;

    switch (data.typ) {
      case FovPredOutMsgType.FULL_SWEEP_COMPLETE:
      case FovPredOutMsgType.INCREMENTAL_UPDATE:
      case FovPredOutMsgType.PRIORITY_SWEEP_COMPLETE:
        this.minutesToEntry_ = data.minutesToEntry;
        EventBus.getInstance().emit(EventBusEvent.onFovPredictionReady);
        break;
      case FovPredOutMsgType.PROGRESS:
        if (this.onProgress_) {
          this.onProgress_(data.progress);
        }
        break;
      default:
        break;
    }
  }

  /**
   * Start a full sweep with the given catalog and sensor configuration.
   */
  sendInit(catalogJson: string, sensors: SensorObjectCruncher[], simTimeMs: number, priorityIndices?: number[], maxLookaheadMin = 120, sweepStepMin = 1): void {
    this.minutesToEntry_ = null;
    this.postMessage({
      typ: FovPredMsgType.INIT,
      catalogJson,
      sensors,
      simTimeMs,
      maxLookaheadMin,
      sweepStepMin,
      priorityIndices,
    });
  }

  /**
   * Update simulation time for cache invalidation.
   */
  sendTimeUpdate(simTimeMs: number): void {
    this.postMessage({
      typ: FovPredMsgType.UPDATE_TIME,
      simTimeMs,
    });
  }

  /**
   * Cancel current computation.
   */
  cancel(): void {
    this.postMessage({
      typ: FovPredMsgType.CANCEL,
    });
    this.minutesToEntry_ = null;
  }

  /**
   * Consume the latest minutesToEntry results (returns and clears).
   */
  consumeMinutesToEntry(): Float32Array | null {
    const data = this.minutesToEntry_;

    this.minutesToEntry_ = null;

    return data;
  }

  /**
   * Set a callback for progress updates during initial sweep.
   */
  setProgressCallback(cb: ((progress: number) => void) | null): void {
    this.onProgress_ = cb;
  }
}
