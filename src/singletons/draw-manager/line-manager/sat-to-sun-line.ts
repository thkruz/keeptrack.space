import { EciArr3 } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { DetailedSatellite } from 'ootk';
import { Line, LineColors } from './line';

export class SatToSunLine extends Line {
  private sat: DetailedSatellite;

  constructor(sat: DetailedSatellite) {
    super();
    this.sat = sat;
    this.color_ = LineColors.ORANGE;
  }

  update(): void {
    const eci = this.sat.eci(keepTrackApi.getTimeManager().simulationTimeObj);
    const eciArr = [eci.position.x, eci.position.y, eci.position.z] as EciArr3;

    this.updateVertBuf(eciArr, keepTrackApi.getScene().sun.position as EciArr3);
  }
}
