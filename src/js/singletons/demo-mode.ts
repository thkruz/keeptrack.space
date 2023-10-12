import { CatalogManager, Singletons } from '@app/js/interfaces';
import { Milliseconds } from 'ootk';
import { keepTrackContainer } from '../container';
import { StandardOrbitManager } from './orbitManager';

import { keepTrackApi } from '../keepTrackApi';
import { StandardColorSchemeManager } from './color-scheme-manager';

export class DemoManager {
  private lastTime_ = <Milliseconds>0;
  private readonly UPDATE_INTERVAL_ = <Milliseconds>1000;
  public satellite = 0;

  public update(): void {
    const catalogManagerInstance = keepTrackContainer.get<CatalogManager>(Singletons.CatalogManager);
    const orbitManagerInstance = keepTrackContainer.get<StandardOrbitManager>(Singletons.OrbitManager);
    const colorSchemeManagerInstance = keepTrackContainer.get<StandardColorSchemeManager>(Singletons.ColorSchemeManager);

    const realTime = <Milliseconds>Date.now();
    if (realTime - this.lastTime_ < this.UPDATE_INTERVAL_) return;

    this.lastTime_ = realTime;
    this.satellite = this.satellite === catalogManagerInstance.satData.length ? 0 : this.satellite;

    for (let i = this.satellite; i < catalogManagerInstance.satData.length; i++) {
      const sat = catalogManagerInstance.satData[i];
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
      orbitManagerInstance.setSelectOrbit(i);
      this.satellite = i + 1;
    }
  }
}
