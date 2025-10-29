import { EciArr3 } from '@app/engine/core/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { DetailedSensor } from '@ootk/src/main';
import { Line, LineColors } from './line';

export class SensorToMoonLine extends Line {
  private sensor_: DetailedSensor;

  constructor(sensor: DetailedSensor) {
    super();
    this.sensor_ = sensor;

    this.color_ = LineColors.WHITE;
  }

  update(): void {
    const eci = this.sensor_.eci(keepTrackApi.getTimeManager().simulationTimeObj);
    const eciArr = [eci.x, eci.y, eci.z] as EciArr3;

    this.updateVertBuf([eciArr, keepTrackApi.getScene().moons.Moon.position]);
  }
}
