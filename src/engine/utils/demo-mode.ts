import { DetailedSatellite, Milliseconds } from '@ootk/src/main';

import { EventBus } from '../events/event-bus';
import { EventBusEvent } from '../events/event-bus-events';
import { ServiceLocator } from '../core/service-locator';

export class DemoManager {
  private static instance: DemoManager;
  private readonly UPDATE_INTERVAL_ = <Milliseconds>3000;
  private readonly IS_RANDOM_ = true;
  private lastTime_ = <Milliseconds>0;
  satellite = 0;

  private constructor() {
    // Singleton
  }

  static getInstance(): DemoManager {
    if (!DemoManager.instance) {
      DemoManager.instance = new DemoManager();
    }

    return DemoManager.instance;
  }

  init() {
    EventBus.getInstance().on(EventBusEvent.endOfDraw, () => this.update());
  }

  update(): void {
    if (!settingsManager.isDemoModeOn || !ServiceLocator.getSensorManager()?.isSensorSelected()) {
      return;
    }

    const satData = ServiceLocator.getCatalogManager().objectCache;
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    const realTime = <Milliseconds>Date.now();

    if (realTime - this.lastTime_ < this.UPDATE_INTERVAL_) {
      return;
    }

    this.lastTime_ = realTime;
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const activeSats = catalogManagerInstance.objectCache.filter((sat) => sat.isSatellite() && sat.active) as DetailedSatellite[];
    const lastSatId = activeSats[activeSats.length - 1].id;

    for (this.satellite; this.satellite < lastSatId;) {
      if (this.IS_RANDOM_) {
        this.satellite = Math.floor(Math.random() * lastSatId);
      }

      const sat = satData[this.satellite] as DetailedSatellite;

      if (
        !sat.isSatellite() ||
        colorSchemeManagerInstance.isPayloadOff(sat) ||
        colorSchemeManagerInstance.isRocketBodyOff(sat) ||
        colorSchemeManagerInstance.isDebrisOff(sat) ||
        colorSchemeManagerInstance.isInViewOff(sat)
      ) {
        continue;
      }

      ServiceLocator.getHoverManager().setHoverId(this.satellite);
      ServiceLocator.getOrbitManager().setSelectOrbit(this.satellite);
      this.satellite++;
      break;
    }
  }
}
