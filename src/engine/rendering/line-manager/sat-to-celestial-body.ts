import { OemSatellite } from '@app/app/objects/oem-satellite';
import { EciArr3 } from '@app/engine/core/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { Body } from 'astronomy-engine';
import { DetailedSatellite } from 'ootk';
import { CelestialBody } from '../draw-manager/celestial-bodies/celestial-body';
import { Line, LineColors } from './line';

export class SatToCelestialBodyLine extends Line {
  private readonly sat: DetailedSatellite | OemSatellite;
  private readonly body: Body;

  constructor(sat: DetailedSatellite | OemSatellite, body: Body) {
    super();
    this.sat = sat;
    this.body = body;
    this.color_ = LineColors.CYAN;
  }

  update(): void {
    const eci = this.sat.eci(keepTrackApi.getTimeManager().simulationTimeObj);

    if (!eci) {
      this.isGarbage = true;

      return;
    }

    const eciArr = [eci.position.x, eci.position.y, eci.position.z] as EciArr3;

    this.updateVertBuf(eciArr, (keepTrackApi.getScene().planets[this.body] as CelestialBody).position);
  }
}
