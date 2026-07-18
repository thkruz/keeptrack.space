import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { EciArr3 } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Kilometers } from '@ootk/src/main';
import { vec4 } from 'gl-matrix';
import { Line, LineColors, LineDescription } from './line';

/**
 * A short vertical marker extending straight up from a sensor's location so a
 * whole group of sensors can be spotted on the globe without selecting them.
 * Recomputed from the sensor's ECI position every frame so it tracks Earth
 * rotation.
 */
export class SensorMarkerLine extends Line {
  private readonly sensor_: DetailedSensor;
  private readonly lengthKm_: Kilometers;
  /** Optional grouping label (e.g. the sensor group header) for the line-management UI. */
  private readonly detail_?: string;

  constructor(sensor: DetailedSensor, detail?: string, color: vec4 = LineColors.RED, lengthKm: Kilometers = 750 as Kilometers) {
    super();
    this.sensor_ = sensor;
    this.detail_ = detail;
    this.lengthKm_ = lengthKm;

    this.validateColor(color);
    this.color_ = color;
  }

  update(): void {
    const eci = this.sensor_.eci(ServiceLocator.getTimeManager().simulationTimeObj);
    const eciArr = [eci.x, eci.y, eci.z] as EciArr3;

    // Extend radially away from Earth's center (within ~0.2 deg of the geodetic
    // vertical, which is indistinguishable at marker scale).
    const magnitude = Math.hypot(eci.x, eci.y, eci.z);
    const scale = (magnitude + this.lengthKm_) / magnitude;
    const eciArr2 = [eci.x * scale, eci.y * scale, eci.z * scale] as EciArr3;

    this.updateVertBuf([eciArr, eciArr2]);
  }

  getDescription(): LineDescription {
    return { kind: 'sensorMarker', detail: this.detail_ };
  }
}
