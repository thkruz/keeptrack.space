import { Milliseconds } from 'ootk';

import { keepTrackApi } from '../keepTrackApi';
import { StandardColorSchemeManager } from './color-scheme-manager';

export class DemoManager {
  private lastTime_ = <Milliseconds>0;
  private readonly UPDATE_INTERVAL_ = <Milliseconds>1000;
  public satellite = 0;

  public update(): void {
    const satData = keepTrackApi.getCatalogManager().getSatsFromSatData();
    const colorSchemeManagerInstance = <StandardColorSchemeManager>(<unknown>keepTrackApi.getColorSchemeManager());

    const realTime = <Milliseconds>Date.now();
    if (realTime - this.lastTime_ < this.UPDATE_INTERVAL_) return;

    this.lastTime_ = realTime;
    this.satellite = this.satellite === satData.length ? 0 : this.satellite;

    for (let i = this.satellite; i < satData.length; i++) {
      const sat = satData[i];
      if (
        colorSchemeManagerInstance.isPayloadOff(sat) ||
        colorSchemeManagerInstance.isRocketBodyOff(sat) ||
        colorSchemeManagerInstance.isDebrisOff(sat) ||
        colorSchemeManagerInstance.isInViewOff(sat) ||
        sat.static ||
        sat.missile
      )
        continue;

      keepTrackApi.getHoverManager().setHoverId(i);
      keepTrackApi.getOrbitManager().setSelectOrbit(i);
      this.satellite = i + 1;
    }
  }
}
