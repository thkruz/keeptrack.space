import { EciArr3 } from '@app/engine/core/interfaces';
import { DetailedSensor, rae2eci, RaeVec3 } from '@ootk/src/main';
import { vec4 } from 'gl-matrix';
import { Line, LineColors } from './line';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class SensorToRaeLine extends Line {
  sensor: DetailedSensor;
  rae: RaeVec3;

  constructor(sensor: DetailedSensor, rae: RaeVec3, color?: vec4) {
    super();
    this.rae = rae;
    this.sensor = sensor;
    this.color_ = color || LineColors.GREEN;
  }

  update(): void {
    const posData = ServiceLocator.getDotsManager().positionData;
    const id = this.sensor.id;
    const sensorEciArr = [posData[id * 3], posData[id * 3 + 1], posData[id * 3 + 2]] as EciArr3;

    const gmst = ServiceLocator.getTimeManager().gmst;

    const raeInEci = rae2eci(this.rae, this.sensor.lla(), gmst);
    const eciArr = [raeInEci.x, raeInEci.y, raeInEci.z] as EciArr3;

    this.isDraw_ = true;

    this.updateVertBuf([eciArr, sensorEciArr]);
  }
}
