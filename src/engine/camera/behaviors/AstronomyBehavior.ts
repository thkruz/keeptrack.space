/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * AstronomyBehavior.ts - Camera behavior for astronomy view from a sensor
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { DEG2RAD, Degrees, Milliseconds } from '@ootk/src/main';
import { mat4, vec3 } from 'gl-matrix';
import { BaseCameraBehavior } from './BaseCameraBehavior';
import type { SensorPosition } from './ICameraBehavior';

/**
 * Astronomy camera behavior.
 * Similar to Planetarium but with additional rotation controls for astronomical observation.
 */
export class AstronomyBehavior extends BaseCameraBehavior {
  private normUp_ = vec3.create();

  /**
   * Update rotation angles based on camera movement
   */
  update(dt: Milliseconds): void {
    // Update FPS-style pitch/yaw/rotate
    this.state.fpsPitch = <Degrees>(this.state.fpsPitch - 20 * this.state.camPitchSpeed * dt);
    this.state.fpsYaw = <Degrees>(this.state.fpsYaw - 20 * this.state.camYawSpeed * dt);
    this.state.fpsRotate = <Degrees>(this.state.fpsRotate - 20 * this.state.camRotateSpeed * dt);

    // Prevent over-rotation
    if (this.state.fpsPitch > 90) {
      this.state.fpsPitch = <Degrees>90;
    }
    if (this.state.fpsPitch < -90) {
      this.state.fpsPitch = <Degrees>-90;
    }
  }

  validate(sensorPos: SensorPosition | null): boolean {
    // Astronomy mode requires a sensor to be selected
    return sensorPos !== null;
  }

  draw(sensorPos: SensorPosition | null): void {
    if (!sensorPos) {
      throw new Error('Sensor Position is required for Astronomy mode');
    }

    this.state.fpsPitch = <Degrees>(-1 * sensorPos.lat * DEG2RAD);

    const sensorPosU = vec3.fromValues(-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01);

    this.state.fpsPos[0] = sensorPos.x;
    this.state.fpsPos[1] = sensorPos.y;
    this.state.fpsPos[2] = sensorPos.z;

    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, this.state.fpsPitch + -this.state.fpsPitch * DEG2RAD, [1, 0, 0]);
    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.fpsRotate * DEG2RAD, [0, 1, 0]);
    vec3.normalize(this.normUp_, sensorPosU);
    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.fpsYaw * DEG2RAD, this.normUp_);

    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [-sensorPos.x * 1.01, -sensorPos.y * 1.01, -sensorPos.z * 1.01]);
  }
}
