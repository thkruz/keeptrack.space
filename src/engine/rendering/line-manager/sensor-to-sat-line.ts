import { OemSatellite } from '@app/app/objects/oem-satellite';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { EciArr3 } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { eci2rae, Satellite } from '@ootk/src/main';
import { vec4 } from 'gl-matrix';
import { Line, LineColors, LineDescription } from './line';

export class SensorToSatLine extends Line {
  sat: Satellite | OemSatellite;
  sensor: DetailedSensor;
  private isDrawFovOnly_ = false;
  private isDrawSelectedOnly_ = false;

  constructor(sensor: DetailedSensor, sat: Satellite | OemSatellite, color?: vec4) {
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
    const posData = ServiceLocator.getDotsManager().positionData;
    const idx = Number(this.sat.id) * 3;

    // positionData is nulled during catalog swap; resume on next cruncher message
    if (!posData || idx + 2 >= posData.length) {
      return;
    }

    const eciArr = [posData[idx], posData[idx + 1], posData[idx + 2]] as EciArr3;

    const sensorEci = this.sensor.eci(ServiceLocator.getTimeManager().simulationTimeObj);
    const sensorEciArr = [sensorEci.x, sensorEci.y, sensorEci.z] as EciArr3;

    this.isDraw_ = true;

    if (this.isDrawFovOnly_) {
      let isInFov = false;

      if (this.sat instanceof OemSatellite) {
        const rae = eci2rae(ServiceLocator.getTimeManager().simulationTimeObj, this.sat.position, this.sensor);

        isInFov = this.sensor.isRaeInFov(rae.az, rae.el, rae.rng);
      } else if (this.sat instanceof Satellite) {
        isInFov = this.sensor.isSatInFov(this.sat, ServiceLocator.getTimeManager().simulationTimeObj);
      }

      if (!isInFov) {
        this.isDraw_ = false;
        this.isGarbage = true;
      }
    }

    if (this.isDrawSelectedOnly_) {
      if (this.sat.id !== PluginRegistry.getPlugin(SelectSatManager)?.selectedSat) {
        this.isDraw_ = false;
        this.isGarbage = true;
      }
    }

    this.updateVertBuf([eciArr, sensorEciArr]);
  }

  getDescription(): LineDescription {
    return { kind: 'sensorToSat', detail: this.sat.name };
  }
}
