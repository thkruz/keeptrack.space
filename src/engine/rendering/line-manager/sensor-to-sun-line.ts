import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { EciArr3 } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Line, LineColors, LineDescription } from './line';

export class SensorToSunLine extends Line {
  private sensor_: DetailedSensor;

  constructor(sensor: DetailedSensor) {
    super();
    this.sensor_ = sensor;

    this.color_ = LineColors.ORANGE;
  }

  update(): void {
    const eci = this.sensor_.eci(ServiceLocator.getTimeManager().simulationTimeObj);
    const eciArr = [eci.x, eci.y, eci.z] as EciArr3;

    this.updateVertBuf([eciArr, ServiceLocator.getScene().sun.position as EciArr3]);
  }

  getDescription(): LineDescription {
    return { kind: 'sensorToSun' };
  }
}
