import { OemSatellite } from '@app/app/objects/oem-satellite';
import { EciArr3 } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Satellite } from '@ootk/src/main';
import { Line, LineColors, LineDescription } from './line';

export class SatToSunLine extends Line {
  private sat: Satellite | OemSatellite;

  constructor(sat: Satellite | OemSatellite) {
    super();
    this.sat = sat;
    this.color_ = LineColors.ORANGE;
  }

  update(): void {
    const eci = this.sat.eci(ServiceLocator.getTimeManager().simulationTimeObj);

    if (!eci) {
      this.isGarbage = true;

      return;
    }

    const eciArr = [eci.position.x, eci.position.y, eci.position.z] as EciArr3;

    this.updateVertBuf([eciArr, ServiceLocator.getScene().sun.position as EciArr3]);
  }

  getDescription(): LineDescription {
    return { kind: 'satToSun', detail: this.sat.name };
  }
}
