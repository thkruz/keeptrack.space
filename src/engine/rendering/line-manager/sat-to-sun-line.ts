import { OemSatellite } from '@app/app/objects/oem-satellite';
import { EciArr3 } from '@app/engine/core/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { DetailedSatellite } from 'ootk';
import { Line, LineColors } from './line';

export class SatToSunLine extends Line {
  private sat: DetailedSatellite | OemSatellite;

  constructor(sat: DetailedSatellite | OemSatellite) {
    super();
    this.sat = sat;
    this.color_ = LineColors.ORANGE;
  }

  update(): void {
    const eci = this.sat.eci(keepTrackApi.getTimeManager().simulationTimeObj);

    if (!eci) {
      this.isGarbage = true;

      return;
    }

    const eciArr = [eci.position.x, eci.position.y, eci.position.z] as EciArr3;

    this.updateVertBuf(eciArr, keepTrackApi.getScene().sun.position as EciArr3);
  }
}
