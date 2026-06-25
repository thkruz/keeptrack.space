import { EciArr3 } from '@app/engine/core/interfaces';
import { rae2eci, RaeVec3 } from '@ootk/src/main';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { vec4 } from 'gl-matrix';
import { Line, LineColors, LineDescription } from './line';
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
    const idx = Number(this.sensor.id) * 3;

    // positionData is nulled during catalog swap; resume on next cruncher message
    if (!posData || idx + 2 >= posData.length) {
      return;
    }

    const sensorEciArr = [posData[idx], posData[idx + 1], posData[idx + 2]] as EciArr3;

    const gmst = ServiceLocator.getTimeManager().gmst;

    const raeInEci = rae2eci(this.rae, this.sensor.lla(), gmst);
    const eciArr = [raeInEci.x, raeInEci.y, raeInEci.z] as EciArr3;

    this.isDraw_ = true;

    this.updateVertBuf([eciArr, sensorEciArr]);
  }

  getDescription(): LineDescription {
    return { kind: 'sensorToRae' };
  }
}
