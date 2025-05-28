import { EciArr3 } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { vec4 } from 'gl-matrix';
import { DetailedSensor, rae2eci, RaeVec3 } from 'ootk';
import { Line, LineColors } from './line';

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
    const posData = keepTrackApi.getDotsManager().positionData;
    const id = this.sensor.id;
    const sensorEciArr = [posData[id * 3], posData[id * 3 + 1], posData[id * 3 + 2]] as EciArr3;

    const gmst = keepTrackApi.getTimeManager().gmst;

    const raeInEci = rae2eci(this.rae, this.sensor.lla(), gmst);
    const eciArr = [raeInEci.x, raeInEci.y, raeInEci.z] as EciArr3;

    this.isDraw_ = true;

    this.updateVertBuf(eciArr, sensorEciArr);
  }
}
