import { OemSatellite } from '@app/app/objects/oem-satellite';
import { EciArr3 } from '@app/engine/core/interfaces';
import { Satellite } from '@ootk/src/main';
import { vec3, vec4 } from 'gl-matrix';
import { Line, LineDescription } from './line';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class SatToRefLine extends Line {
  private sat: Satellite | OemSatellite;
  private ref2_: vec3;

  constructor(sat: Satellite | OemSatellite, ref2: vec3, color: vec4) {
    super();
    this.sat = sat;
    this.ref2_ = ref2;

    this.validateColor(color);
    this.color_ = color;
  }

  update(): void {
    const posData = ServiceLocator.getDotsManager().positionData;
    const idx = Number(this.sat.id) * 3;

    // positionData is nulled during catalog swap; resume on next cruncher message
    if (!posData || idx + 2 >= posData.length) {
      return;
    }

    const position = {
      x: posData[idx],
      y: posData[idx + 1],
      z: posData[idx + 2],
    };
    const satArr = [position.x, position.y, position.z] as EciArr3;

    this.updateVertBuf([satArr, this.ref2_ as EciArr3]);
  }

  getDescription(): LineDescription {
    return { kind: 'satToRef', detail: this.sat.name };
  }
}
