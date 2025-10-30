import { SatCruncherMessageData } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { SpaceObjectType } from '@app/engine/ootk/src/main';
import { DetailedSatellite } from '@app/engine/ootk/src/objects';
import { WebWorkerThreadManager } from '@app/engine/threads/web-worker-thread';
import { errorManagerInstance } from '@app/engine/utils/errorManager';

export class SatCruncherThreadManager extends WebWorkerThreadManager {
  readonly WEB_WORKER_CODE: string = 'js/positionCruncher.js';

  protected onMessage({ data: mData }: { data: SatCruncherMessageData }) {
    if (!mData) {
      return;
    }

    if (mData.badObjectId) {
      if (mData.badObjectId >= 0) {
        // Mark the satellite as inactive
        const id = mData.badObjectId;

        if (id !== null) {
          const sat = ServiceLocator.getCatalogManager().objectCache[id] as DetailedSatellite;

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
    if (
      !settingsManager.cruncherReady &&
      ServiceLocator.getCatalogManager().objectCache &&
      ServiceLocator.getDotsManager().positionData &&
      ServiceLocator.getDotsManager().velocityData
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

  private onCruncherReady_() {
    const stars = ServiceLocator.getCatalogManager().objectCache.filter((sat) => sat?.type === SpaceObjectType.STAR);

    if (stars.length > 0) {
      stars.sort((a, b) => a.id - b.id);
      // this is the smallest id
      ServiceLocator.getDotsManager().starIndex1 = stars[0].id;
      // this is the largest id
      ServiceLocator.getDotsManager().starIndex2 = stars[stars.length - 1].id;
      ServiceLocator.getDotsManager().updateSizeBuffer();
    }

    ServiceLocator.getCatalogManager().buildOrbitDensityMatrix_();

    // Run any functions registered with the API
    EventBus.getInstance().emit(EventBusEvent.onCruncherReady);

    settingsManager.cruncherReady = true;
    this.isReady_ = true;
  }
}
