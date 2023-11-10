import { Milliseconds } from 'ootk';

import { SatObject } from '@app/js/interfaces';
import { keepTrackApi } from '../keepTrackApi';

export class DemoManager {
  private readonly UPDATE_INTERVAL_ = <Milliseconds>3000;
  private readonly IS_RANDOM_ = true;
  private lastTime_ = <Milliseconds>0;
  public satellite = 0;

  public update(): void {
    const satData = keepTrackApi.getCatalogManager().getSatsFromSatData();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    const realTime = <Milliseconds>Date.now();
    if (realTime - this.lastTime_ < this.UPDATE_INTERVAL_) return;

    this.lastTime_ = realTime;
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const activeSats = <SatObject[]>catalogManagerInstance.satData.filter((sat) => (<SatObject>sat).TLE1 && (<SatObject>sat).active);
    const lastSatId = activeSats[activeSats.length - 1].id;

    for (this.satellite; this.satellite < lastSatId; ) {
      if (this.IS_RANDOM_) this.satellite = Math.floor(Math.random() * lastSatId);

      const sat = satData[this.satellite];
      if (
        !sat.TLE1 ||
        colorSchemeManagerInstance.isPayloadOff(sat) ||
        colorSchemeManagerInstance.isRocketBodyOff(sat) ||
        colorSchemeManagerInstance.isDebrisOff(sat) ||
        colorSchemeManagerInstance.isInViewOff(sat) ||
        sat.static ||
        sat.missile
      )
        continue;

      keepTrackApi.getHoverManager().setHoverId(this.satellite);
      keepTrackApi.getOrbitManager().setSelectOrbit(this.satellite);
      this.satellite++;
      break;
    }
  }
}
