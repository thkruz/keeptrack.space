import { EciArr3 } from '@app/engine/core/interfaces';
import { Degrees, DetailedSensor, ecf2eci, rae2ecf } from '@ootk/src/main';
import { vec4 } from 'gl-matrix';
import { Line, LineColors } from './line';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class SensorScanHorizonLine extends Line {
  private sensor: DetailedSensor;
  private az_: Degrees = -90 as Degrees;
  private minAz_: Degrees;
  private maxAz_: Degrees;

  constructor(sensor: DetailedSensor, face = 1, faces = 2, color: vec4 = LineColors.CYAN) {
    super();
    this.sensor = sensor;
    this.az_ = sensor.minAz;

    const maxAz = sensor.maxAz > sensor.minAz ? sensor.maxAz : sensor.maxAz - 360;
    const minAz = sensor.minAz;
    const azRange = maxAz - minAz;

    this.minAz_ = minAz + (azRange / faces) * (face - 1) as Degrees;
    this.maxAz_ = minAz + (azRange / faces) * (face) as Degrees;

    this.validateColor(color);
    this.color_ = color;
  }

  update(): void {
    const eci = this.sensor.eci(ServiceLocator.getTimeManager().simulationTimeObj);
    const eciArr = [eci.x, eci.y, eci.z] as EciArr3;

    this.updateAzimuth_();
    const eciArr2 = this.calculateEciPosition_();

    this.updateVertBuf([eciArr, eciArr2]);
  }

  private updateAzimuth_(): void {
    this.az_ = <Degrees>(this.az_ + settingsManager.lineScanSpeedRadar);
    // Normalize azimuth
    if (this.az_ > 360) {
      this.az_ = <Degrees>0;
    }
    // Is azimuth outside of FOV?
    if (
      (this.maxAz_ > this.minAz_ && this.az_ > this.maxAz_) ||
      (this.maxAz_ < this.minAz_ &&
        this.az_ > this.maxAz_ &&
        this.az_ < this.minAz_)
    ) {
      // Reset it
      this.az_ = this.minAz_;
    }
  }

  private calculateEciPosition_(): EciArr3 {
    const lla = this.sensor.lla();


    const eci = ecf2eci(
      rae2ecf(
        {
          rng: this.sensor.maxRng,
          az: this.az_,
          el: this.sensor.minEl,
        },
        {
          lat: lla.lat,
          lon: lla.lon,
          alt: lla.alt + 30,
        },
      ),
      ServiceLocator.getTimeManager().gmst,
    );

    return [eci.x, eci.y, eci.z] as EciArr3;
  }
}
