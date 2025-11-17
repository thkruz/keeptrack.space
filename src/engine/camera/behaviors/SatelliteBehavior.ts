/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * SatelliteBehavior.ts - Camera behavior that follows a satellite's velocity vector
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

import { DEG2RAD, Degrees, Milliseconds, SpaceObjectType, BaseObject } from '@ootk/src/main';
import { mat4, quat, vec3 } from 'gl-matrix';
import { BaseCameraBehavior } from './BaseCameraBehavior';
import type { SensorPosition } from './ICameraBehavior';

/**
 * Satellite-following camera behavior.
 * Camera tracks behind the satellite along its velocity vector.
 */
export class SatelliteBehavior extends BaseCameraBehavior {
  private normForward_ = vec3.create();
  private normLeft_ = vec3.create();
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

  validate(_sensorPos: SensorPosition | null, target: BaseObject | null): boolean {
    // Satellite mode requires a valid target that is not a star
    return target !== null && target.id !== -1 && target.type !== SpaceObjectType.STAR;
  }

  draw(_sensorPos: SensorPosition | null, target: BaseObject | null): void {
    if (!target) {
      return;
    }

    const targetPositionTemp = vec3.fromValues(-target.position.x, -target.position.y, -target.position.z);

    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, targetPositionTemp);
    vec3.normalize(this.normUp_, targetPositionTemp);
    vec3.normalize(this.normForward_, [target.velocity.x, target.velocity.y, target.velocity.z]);
    vec3.transformQuat(this.normLeft_, this.normUp_, quat.fromValues(this.normForward_[0], this.normForward_[1], this.normForward_[2], 90 * DEG2RAD));
    const targetNextPosition = vec3.fromValues(target.position.x + target.velocity.x, target.position.y + target.velocity.y, target.position.z + target.velocity.z);

    mat4.lookAt(this.matrixWorldInverse, targetNextPosition, targetPositionTemp, this.normUp_);

    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [target.position.x, target.position.y, target.position.z]);

    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, this.state.fpsPitch * DEG2RAD, this.normLeft_);
    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.fpsYaw * DEG2RAD, this.normUp_);

    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, targetPositionTemp);
  }
}
