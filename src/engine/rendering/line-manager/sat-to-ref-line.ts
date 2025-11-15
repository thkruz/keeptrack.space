import { OemSatellite } from '@app/app/objects/oem-satellite';
import { EciArr3 } from '@app/engine/core/interfaces';
import { DetailedSatellite } from '@ootk/src/main';
import { vec3, vec4 } from 'gl-matrix';
import { Line } from './line';
import { ServiceLocator } from '@app/engine/core/service-locator';

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
    const posData = ServiceLocator.getDotsManager().positionData;
    const position = {
      x: posData[this.sat.id * 3],
      y: posData[this.sat.id * 3 + 1],
      z: posData[this.sat.id * 3 + 2],
    };
    const satArr = [position.x, position.y, position.z] as EciArr3;

    this.updateVertBuf([satArr, this.ref2_ as EciArr3]);
  }
}
