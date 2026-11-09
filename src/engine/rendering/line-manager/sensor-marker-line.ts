import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { CameraType } from '@app/engine/camera/camera-type';
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
    let eciArr2 = [eci.x * scale, eci.y * scale, eci.z * scale] as EciArr3;

    // The flat map drops altitude, so a radial marker collapses to a zero-length (invisible) line.
    // Draw it as a tick pointing north along the surface instead.
    if (ServiceLocator.getMainCamera()?.cameraType === CameraType.FLAT_MAP) {
      eciArr2 = SensorMarkerLine.northTip_(eci, this.lengthKm_ / magnitude);
    }

    this.updateVertBuf([eciArr, eciArr2]);
  }

  /** The point `angleRad` of arc due north of `eci`, at the same radius. */
  private static northTip_(eci: { x: number; y: number; z: number }, angleRad: number): EciArr3 {
    const r = Math.hypot(eci.x, eci.y, eci.z);
    const rx = eci.x / r;
    const ry = eci.y / r;
    const rz = eci.z / r;
    // east = zhat x rhat (degenerate at the poles; fall back to +x)
    let ex = -ry;
    let ey = rx;
    const eMag = Math.hypot(ex, ey);

    if (eMag < 1e-9) {
      ex = 1;
      ey = 0;
    } else {
      ex /= eMag;
      ey /= eMag;
    }
    // north = rhat x east
    const nx = -rz * ey;
    const ny = rz * ex;
    const nz = rx * ey - ry * ex;
    const c = Math.cos(angleRad);
    const sn = Math.sin(angleRad);

    return [r * (c * rx + sn * nx), r * (c * ry + sn * ny), r * (c * rz + sn * nz)] as EciArr3;
  }

  getDescription(): LineDescription {
    return { kind: 'sensorMarker', detail: this.detail_ };
  }
}
