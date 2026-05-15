/**
 * Thread manager for the color cruncher web worker.
 * Extends WebWorkerThreadManager and provides typed send methods
 * for each message type.
 */

import { ColorDataArrays } from '@app/engine/rendering/color-worker/color-data-arrays';
import {
  ColorWorkerMsgType,
  ColorWorkerOutMsg,
  FilterState,
  SettingsFlags,
} from '@app/engine/rendering/color-worker/color-worker-messages';
import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { errorManagerInstance } from '@app/engine/utils/errorManager';

export class ColorCruncherThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/colorCruncher.js';

  private pendingColorData_: Float32Array | null = null;
  private pendingPickableData_: Int8Array | null = null;
  private currentSeqNum_ = 0;

  protected onMessage(event: MessageEvent) {
    // Handle 'ready' string message from base class
    if (event.data === 'ready') {
      this.isReady_ = true;

      return;
    }

    const data = event.data as ColorWorkerOutMsg;

    if (data.colorData && data.pickableData) {
      // Discard stale messages from old catalog
      if (data.seqNum < this.currentSeqNum_) {
        return;
      }

      this.pendingColorData_ = data.colorData;
      this.pendingPickableData_ = data.pickableData;
      EventBus.getInstance().emit(EventBusEvent.onColorBufferReady);
    }
  }

  /**
   * Consume the latest color/pickable buffers from the worker.
   * Returns null if no new data is available.
   */
  consumeColorData(): { colorData: Float32Array; pickableData: Int8Array } | null {
    if (!this.pendingColorData_ || !this.pendingPickableData_) {
      return null;
    }

    const result = {
      colorData: this.pendingColorData_,
      pickableData: this.pendingPickableData_,
    };

    this.pendingColorData_ = null;
    this.pendingPickableData_ = null;

    return result;
  }

  sendCatalogData(data: ColorDataArrays, seqNum?: number): void {
    if (seqNum !== undefined) {
      this.currentSeqNum_ = seqNum;
    }
    this.postMessage({
      typ: ColorWorkerMsgType.INIT_CATALOG,
      catalogData: data,
      seqNum: this.currentSeqNum_,
    });
  }

  sendSchemeChange(schemeId: string, isGroupScheme: boolean): void {
    this.postMessage({
      typ: ColorWorkerMsgType.UPDATE_SCHEME,
      schemeId,
      isGroupScheme,
    });
  }

  sendFilterUpdate(filter: FilterState): void {
    this.postMessage({
      typ: ColorWorkerMsgType.UPDATE_FILTERS,
      filterSettings: filter,
    });
  }

  sendDynamicUpdate(
    inView: Int8Array | null,
    inSun: Int8Array | null,
    vel: Float32Array | null,
    dotsOnScreenVal?: number,
  ): void {
    const inViewSnap = inView ? new Int8Array(inView) : null;
    const inSunSnap = inSun ? new Int8Array(inSun) : null;
    const velSnap = vel ? new Float32Array(vel) : null;

    const transfer: Transferable[] = [];

    if (inViewSnap) {
      transfer.push(inViewSnap.buffer);
    }
    if (inSunSnap) {
      transfer.push(inSunSnap.buffer);
    }
    if (velSnap) {
      transfer.push(velSnap.buffer);
    }

    try {
      this.postMessage({
        typ: ColorWorkerMsgType.UPDATE_DYNAMIC,
        inViewData: inViewSnap,
        inSunData: inSunSnap,
        satVel: velSnap,
        dotsOnScreen: dotsOnScreenVal,
      }, transfer);
    } catch (error) {
      errorManagerInstance.warn(
        `ColorCruncher dynamic update dropped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  sendGroupUpdate(ids: number[] | null): void {
    this.postMessage({
      typ: ColorWorkerMsgType.UPDATE_GROUP,
      groupIds: ids,
    });
  }

  sendSettingsUpdate(flags: SettingsFlags): void {
    this.postMessage({
      typ: ColorWorkerMsgType.UPDATE_SETTINGS,
      settingsFlags: flags,
    });
  }

  sendParamsUpdate(params: {
    year: number;
    jday: number;
    orbitDensity: { minAltitude: number; maxAltitude: number; count: number }[];
    orbitDensityMax: number;
    orbitalPlaneDensity: number[][];
    orbitalPlaneDensityMax: number;
  }): void {
    this.postMessage({
      typ: ColorWorkerMsgType.UPDATE_PARAMS,
      params,
    });
  }

  sendForceRecolor(): void {
    this.postMessage({
      typ: ColorWorkerMsgType.FORCE_RECOLOR,
    });
  }

  sendObjectTypeFlags(flags: Record<string, boolean>): void {
    this.postMessage({
      typ: ColorWorkerMsgType.UPDATE_OBJ_TYPE_FLAGS,
      objectTypeFlags: flags,
    });
  }

  sendColorTheme(theme: Record<string, number[]>): void {
    this.postMessage({
      typ: ColorWorkerMsgType.UPDATE_COLOR_THEME,
      colorTheme: theme,
    });
  }
}
