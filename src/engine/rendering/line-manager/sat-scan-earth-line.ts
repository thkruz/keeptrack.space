import { EciArr3 } from '@app/engine/core/interfaces';
import { Degrees, DetailedSatellite, ecf2rae, eci2ecf, Kilometers, lla2ecf } from '@ootk/src/main';
import { vec4 } from 'gl-matrix';
import { Line, LineColors } from './line';
import { ServiceLocator } from '@app/engine/core/service-locator';

export class SatScanEarthLine extends Line {
  private sat: DetailedSatellite;
  private lat_: Degrees = -90 as Degrees;
  private lon_: Degrees = 0 as Degrees;

  constructor(sat: DetailedSatellite, color: vec4 = LineColors.GREEN) {
    super();
    this.sat = sat;

    this.validateColor(color);
    this.color_ = color;
  }

  update(): void {
    const eci = this.sat.eci(ServiceLocator.getTimeManager().simulationTimeObj);
    const eciArr = [eci.position.x, eci.position.y, eci.position.z] as EciArr3;

    let t = 0;

    while (t < 1000) {
      this.updateLongitude_();
      this.updateLatitude_();

      const lla = { lat: this.lat_, lon: this.lon_, alt: <Kilometers>0.05 };
      const ecf = eci2ecf(this.sat.position, 0);
      const rae = ecf2rae(lla, ecf);
      const el = rae.el;

      if (el > settingsManager.lineScanMinEl) {
        const pos = lla2ecf(lla);
        const eciArr2 = [pos.x, pos.y, pos.z] as EciArr3;

        this.updateVertBuf([eciArr, eciArr2]);
        break;
      }

      this.adjustLatitude_();

      t++;
    }
  }

  private updateLongitude_(): void {
    this.lon_ = <Degrees>(this.lon_ + settingsManager.lineScanSpeedSat);
    if (this.lon_ > 180) {
      this.lon_ = <Degrees>-180;
    }
  }

  private updateLatitude_(): void {
    if (this.lon_ >= 0 && this.lon_ < settingsManager.lineScanSpeedSat) {
      this.lat_ = <Degrees>(this.lat_ + settingsManager.lineScanSpeedSat);
    }
    if (this.lat_ > 90) {
      this.lat_ = <Degrees>-90;
    }
  }

  private adjustLatitude_(): void {
    if (this.lat_ === -90) {
      this.lat_ = <Degrees>(this.lat_ + settingsManager.lineScanSpeedSat);
    }
    if (this.lat_ === 90) {
      this.lat_ = <Degrees>-90;
    }
  }
}
