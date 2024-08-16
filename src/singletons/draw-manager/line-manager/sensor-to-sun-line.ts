import { EciArr3 } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { DetailedSensor } from 'ootk';
import { Line, LineColors } from './line';

export class SensorToSunLine extends Line {
  private sensor_: DetailedSensor;

  constructor(sensor: DetailedSensor) {
    super();
    this.sensor_ = sensor;

    this.color_ = LineColors.ORANGE;
  }

  update(): void {
    const eci = this.sensor_.eci(keepTrackApi.getTimeManager().simulationTimeObj);
    const eciArr = [eci.x, eci.y, eci.z] as EciArr3;

    this.updateVertBuf(eciArr, keepTrackApi.getScene().sun.position as EciArr3);
  }
}
