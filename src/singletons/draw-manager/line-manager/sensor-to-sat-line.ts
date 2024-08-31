import { EciArr3 } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { vec4 } from 'gl-matrix';
import { DetailedSatellite, DetailedSensor } from 'ootk';
import { Line, LineColors } from './line';

export class SensorToSatLine extends Line {
  sat: DetailedSatellite;
  sensor: DetailedSensor;
  private isDrawFovOnly_ = false;
  private isDrawSelectedOnly_ = false;

  constructor(sensor: DetailedSensor, sat: DetailedSatellite, color?: vec4) {
    super();
    this.sat = sat;
    this.sensor = sensor;
    this.color_ = color || LineColors.GREEN;
  }

  setDrawFovOnly(drawFovOnly: boolean): void {
    this.isDrawFovOnly_ = drawFovOnly;
  }

  setDrawSelectedOnly(drawSelectedOnly: boolean): void {
    this.isDrawSelectedOnly_ = drawSelectedOnly;
  }

  update(): void {
    const posData = keepTrackApi.getDotsManager().positionData;
    const id = this.sat.id;
    const eciArr = [posData[id * 3], posData[id * 3 + 1], posData[id * 3 + 2]] as EciArr3;

    const sensorEci = this.sensor.eci(keepTrackApi.getTimeManager().simulationTimeObj);
    const sensorEciArr = [sensorEci.x, sensorEci.y, sensorEci.z] as EciArr3;

    this.isDraw_ = true;

    if (this.isDrawFovOnly_) {
      const isInFov = this.sensor.isSatInFov(this.sat, keepTrackApi.getTimeManager().simulationTimeObj);

      if (!isInFov) {
        this.isDraw_ = false;
        this.isGarbage = true;
      }
    }

    if (this.isDrawSelectedOnly_) {
      if (this.sat.id !== keepTrackApi.getPlugin(SelectSatManager).selectedSat) {
        this.isDraw_ = false;
        this.isGarbage = true;
      }
    }

    this.updateVertBuf(eciArr, sensorEciArr);
  }
}
