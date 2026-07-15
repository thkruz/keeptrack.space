import { SatCruncherMessageData, SensorObjectCruncher } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { Degrees, Kilometers, SpaceObjectType } from '@app/engine/ootk/src/main';
import { Satellite } from '@app/engine/ootk/src/objects';
import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { MarkerMode, PosCruncherMsgType } from '@app/webworker/position-cruncher-messages';

export class SatCruncherThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/positionCruncher.js';

  private currentSeqNum_ = 0;

  // ─── Typed Send Methods ─────────────────────────────────────────────

  sendCatalogData(dat: string, fieldOfViewSetLength: number, isLowPerf?: boolean): void {
    this.currentSeqNum_++;
    this.postMessage({
      typ: PosCruncherMsgType.OBJ_DATA,
      dat,
      fieldOfViewSetLength,
      isLowPerf,
      seqNum: this.currentSeqNum_,
    });
  }

  sendTimeSync(staticOffset: number, dynamicOffsetEpoch: number, propRate: number): void {
    this.postMessage({
      typ: PosCruncherMsgType.OFFSET,
      staticOffset,
      dynamicOffsetEpoch,
      propRate,
    });
  }

  sendSatEdit(id: number, tle1: string, tle2: string, active?: boolean): void {
    this.postMessage({
      typ: PosCruncherMsgType.SAT_EDIT,
      id,
      tle1,
      tle2,
      active,
    });
  }

  sendNewMissile(data: {
    id: number;
    active: boolean;
    type?: number;
    latList: Degrees[];
    lonList: Degrees[];
    altList: Kilometers[];
    startTime: number;
  }): void {
    this.postMessage({
      typ: PosCruncherMsgType.NEW_MISSILE,
      ...data,
    });
  }

  sendSensorUpdate(sensors: Partial<SensorObjectCruncher>[]): void {
    this.postMessage({
      typ: PosCruncherMsgType.SENSOR,
      sensor: sensors,
    });
  }

  sendSunlightViewToggle(enabled: boolean): void {
    this.postMessage({
      typ: PosCruncherMsgType.SUNLIGHT_VIEW,
      isSunlightView: enabled,
    });
  }

  sendMarkerUpdate(fieldOfViewSetLength?: number, markerMode?: MarkerMode): void {
    this.postMessage({
      typ: PosCruncherMsgType.UPDATE_MARKERS,
      fieldOfViewSetLength,
      markerMode,
    });
  }

  sendSatelliteSelected(ids: number[]): void {
    this.postMessage({
      typ: PosCruncherMsgType.SATELLITE_SELECTED,
      satelliteSelected: ids,
    });
  }

  // ─── Incoming Message Handler ───────────────────────────────────────

  protected onMessage({ data: mData }: { data: SatCruncherMessageData }) {
    if (!mData) {
      return;
    }

    // Discard stale messages from old catalog
    if (typeof mData.seqNum === 'number' && mData.seqNum < this.currentSeqNum_) {
      return;
    }

    if (mData.badObjectId) {
      if (mData.badObjectId >= 0) {
        // Mark the satellite as inactive
        const id = mData.badObjectId;

        if (id !== null) {
          const sat = ServiceLocator.getCatalogManager().objectCache[id];

          if (!sat || !(sat instanceof Satellite)) {
            errorManagerInstance.debug(`Received badObjectId ${id} which does not correspond to a valid satellite.`);

            return;
          }

          sat.active = false;
          /*
           * (<any>window).decayedSats = (<any>window).decayedSats || [];
           * (<any>window).decayedSats.push(this.satData[id].sccNum);
           */
          errorManagerInstance.debug(`Object ${mData.badObjectId} is inactive due to bad TLE\nSatellite ${sat.sccNum}\n${sat.tle1}\n${sat.tle2}`);
        }
      } else {
        /*
         * console.debug(`Bad sat number: ${mData.badObjectId}`);
         * How are we getting a negative number? There is a bug somewhere...
         */
      }
    }

    if (mData?.extraUpdate) {
      return;
    }

    this.updateCruncherBuffers_(mData);

    // Run any callbacks for a normal position cruncher message
    EventBus.getInstance().emit(EventBusEvent.onCruncherMessage);

    // Only do this once after satData, positionData, and velocityData are all received/processed from the cruncher
    const dotsManager = ServiceLocator.getDotsManager();

    if (
      !settingsManager.cruncherReady &&
      ServiceLocator.getCatalogManager().objectCache &&
      dotsManager.positionData &&
      dotsManager.velocityData &&
      // An empty boot (noCatalogOnLoad: reserved analyst slots + markers only)
      // legitimately has all-zero positions until the first satellite is loaded
      // or injected — requiring non-zero data would deadlock startup there.
      (settingsManager.noCatalogOnLoad || !SatCruncherThreadManager.isPositionDataAllZeros_(dotsManager.positionData))
    ) {
      this.onCruncherReady_();
    }
  }

  private updateCruncherBuffers_(mData: SatCruncherMessageData): void {
    ServiceLocator.getDotsManager().updateCruncherBuffers(mData);
    const catalogManager = ServiceLocator.getCatalogManager();

    if (typeof mData?.sensorMarkerArray !== 'undefined' && mData?.sensorMarkerArray?.length !== 0) {
      catalogManager.sensorMarkerArray = mData.sensorMarkerArray;
    }

    const highestMarkerNumber = catalogManager.sensorMarkerArray?.[catalogManager.sensorMarkerArray?.length - 1] || 0;

    settingsManager.dotsOnScreen = Math.max(catalogManager.numObjects - settingsManager.maxFieldOfViewMarkers, highestMarkerNumber);
  }

  /**
   * Quick check that position data has at least some non-zero entries.
   * After a catalog swap, the worker may send the newly-allocated (all-zero) position
   * array before propagation has filled it with real positions.  Accepting such data
   * would trigger onCruncherReady prematurely.  We sample a few entries to avoid the
   * cost of scanning the entire array.
   *
   * Note: sequence number tracking (seqNum) provides the primary guard against stale
   * catalog data. This check remains as a secondary safeguard.
   */
  private static isPositionDataAllZeros_(positionData: Float32Array): boolean {
    if (positionData.length === 0) {
      return true;
    }

    // Sample up to 10 evenly-spaced positions (each position is 3 floats)
    const posCount = Math.floor(positionData.length / 3);
    const step = Math.max(1, Math.floor(posCount / 10));

    for (let p = 0; p < posCount; p += step) {
      const idx = p * 3;

      if (positionData[idx] !== 0 || positionData[idx + 1] !== 0 || positionData[idx + 2] !== 0) {
        return false;
      }
    }

    return true;
  }

  private onCruncherReady_() {
    const stars = ServiceLocator.getCatalogManager().objectCache.filter((sat) => sat?.type === SpaceObjectType.STAR);

    if (stars.length > 0) {
      stars.sort((a, b) => Number(a.id) - Number(b.id));
      // this is the smallest id
      ServiceLocator.getDotsManager().starIndex1 = Number(stars[0].id);
      // this is the largest id
      ServiceLocator.getDotsManager().starIndex2 = Number(stars[stars.length - 1].id);
      ServiceLocator.getDotsManager().updateSizeBuffer();
    }

    ServiceLocator.getCatalogManager().buildOrbitDensityMatrix_();

    // Run any functions registered with the API
    EventBus.getInstance().emit(EventBusEvent.onCruncherReady);

    settingsManager.cruncherReady = true;
    this.isReady_ = true;
  }
}
