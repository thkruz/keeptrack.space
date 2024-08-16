import { EciArr3 } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { vec3, vec4 } from 'gl-matrix';
import { DetailedSatellite } from 'ootk';
import { Line } from './line';

export class SatToRefLine extends Line {
  private sat: DetailedSatellite;
  private ref2_: vec3;

  constructor(sat: DetailedSatellite, ref2: vec3, color: vec4) {
    super();
    this.sat = sat;
    this.ref2_ = ref2;

    this.validateColor(color);
    this.color_ = color;
  }

  update(): void {
    const eci = this.sat.eci(keepTrackApi.getTimeManager().simulationTimeObj);
    const eciArr = [eci.position.x, eci.position.y, eci.position.z] as EciArr3;

    this.updateVertBuf(eciArr, this.ref2_ as EciArr3);
  }
}
