import { OemSatellite } from '@app/app/objects/oem-satellite';
import { EciArr3 } from '@app/engine/core/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { vec3, vec4 } from 'gl-matrix';
import { DetailedSatellite } from 'ootk';
import { Line } from './line';

export class SatToRefLine extends Line {
  private sat: DetailedSatellite | OemSatellite;
  private ref2_: vec3;

  constructor(sat: DetailedSatellite | OemSatellite, ref2: vec3, color: vec4) {
    super();
    this.sat = sat;
    this.ref2_ = ref2;

    this.validateColor(color);
    this.color_ = color;
  }

  update(): void {
    const posData = keepTrackApi.getDotsManager().positionData;
    const position = {
      x: posData[this.sat.id * 3],
      y: posData[this.sat.id * 3 + 1],
      z: posData[this.sat.id * 3 + 2],
    };
    const satArr = [position.x, position.y, position.z] as EciArr3;

    this.updateVertBuf([satArr, this.ref2_ as EciArr3]);
  }
}
