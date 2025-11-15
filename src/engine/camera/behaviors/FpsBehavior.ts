/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * FpsBehavior.ts - Camera behavior for first-person style movement
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

import { Degrees, Milliseconds } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { DEG2RAD } from '@ootk/src/main';
import { BaseCameraBehavior } from './BaseCameraBehavior';
import type { SensorPosition } from './ICameraBehavior';
import type { Camera } from '../camera';

/**
 * FPS (First-Person Shooter) camera behavior.
 * Provides free-flying movement in space with FPS-style controls.
 */
export class FpsBehavior extends BaseCameraBehavior {
  private fpsLastTime_: Milliseconds = <Milliseconds>0;

  constructor(camera: Camera) {
    super(camera);
  }

  /**
   * Update FPS movement based on pitch/yaw/rotate speeds and position changes
   */
  update(dt: Milliseconds): void {
    // Update rotation
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
    if (this.state.fpsRotate > 360) {
      this.state.fpsRotate = <Degrees>(this.state.fpsRotate - 360);
    }
    if (this.state.fpsRotate < 0) {
      this.state.fpsRotate = <Degrees>(this.state.fpsRotate + 360);
    }
    if (this.state.fpsYaw > 360) {
      this.state.fpsYaw = <Degrees>(this.state.fpsYaw - 360);
    }
    if (this.state.fpsYaw < 0) {
      this.state.fpsYaw = <Degrees>(this.state.fpsYaw + 360);
    }

    // Update position based on movement speeds
    const fpsTimeNow = <Milliseconds>Date.now();

    if (this.fpsLastTime_ !== 0) {
      const fpsElapsed = <Milliseconds>(fpsTimeNow - this.fpsLastTime_);

      // Accelerate/decelerate forward speed
      if (this.state.isFPSForwardSpeedLock && this.state.fpsForwardSpeed < 0) {
        this.state.fpsForwardSpeed = Math.max(this.state.fpsForwardSpeed + Math.min(this.state.fpsForwardSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsForwardSpeed);
      } else if (this.state.isFPSForwardSpeedLock && this.state.fpsForwardSpeed > 0) {
        this.state.fpsForwardSpeed = Math.min(this.state.fpsForwardSpeed + Math.max(this.state.fpsForwardSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsForwardSpeed);
      }

      // Accelerate/decelerate side speed
      if (this.state.isFPSSideSpeedLock && this.state.fpsSideSpeed < 0) {
        this.state.fpsSideSpeed = Math.max(this.state.fpsSideSpeed + Math.min(this.state.fpsSideSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsSideSpeed);
      } else if (this.state.isFPSSideSpeedLock && this.state.fpsSideSpeed > 0) {
        this.state.fpsSideSpeed = Math.min(this.state.fpsSideSpeed + Math.max(this.state.fpsSideSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsSideSpeed);
      }

      // Accelerate/decelerate vertical speed
      if (this.state.isFPSVertSpeedLock && this.state.fpsVertSpeed < 0) {
        this.state.fpsVertSpeed = Math.max(this.state.fpsVertSpeed + Math.min(this.state.fpsVertSpeed * -1.02 * fpsElapsed, -0.2), -settingsManager.fpsVertSpeed);
      } else if (this.state.isFPSVertSpeedLock && this.state.fpsVertSpeed > 0) {
        this.state.fpsVertSpeed = Math.min(this.state.fpsVertSpeed + Math.max(this.state.fpsVertSpeed * 1.02 * fpsElapsed, 0.2), settingsManager.fpsVertSpeed);
      }

      // Apply movement (FPS-specific position updates)
      if (this.state.fpsForwardSpeed !== 0) {
        this.state.fpsPos[0] -= Math.sin(this.state.fpsYaw * DEG2RAD) * this.state.fpsForwardSpeed * this.state.fpsRun * fpsElapsed;
        this.state.fpsPos[1] -= Math.cos(this.state.fpsYaw * DEG2RAD) * this.state.fpsForwardSpeed * this.state.fpsRun * fpsElapsed;
        this.state.fpsPos[2] += Math.sin(this.state.fpsPitch * DEG2RAD) * this.state.fpsForwardSpeed * this.state.fpsRun * fpsElapsed;
      }
      if (this.state.fpsVertSpeed !== 0) {
        this.state.fpsPos[2] -= this.state.fpsVertSpeed * this.state.fpsRun * fpsElapsed;
      }
      if (this.state.fpsSideSpeed !== 0) {
        this.state.fpsPos[0] -= Math.cos(-this.state.fpsYaw * DEG2RAD) * this.state.fpsSideSpeed * this.state.fpsRun * fpsElapsed;
        this.state.fpsPos[1] -= Math.sin(-this.state.fpsYaw * DEG2RAD) * this.state.fpsSideSpeed * this.state.fpsRun * fpsElapsed;
      }

      // Apply friction if not locked
      if (!this.state.isFPSForwardSpeedLock) {
        this.state.fpsForwardSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      }
      if (!this.state.isFPSSideSpeedLock) {
        this.state.fpsSideSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      }
      if (!this.state.isFPSVertSpeedLock) {
        this.state.fpsVertSpeed *= Math.min(0.98 * fpsElapsed, 0.98);
      }

      // Zero out very small speeds
      if (this.state.fpsForwardSpeed < 0.01 && this.state.fpsForwardSpeed > -0.01) {
        this.state.fpsForwardSpeed = 0;
      }
      if (this.state.fpsSideSpeed < 0.01 && this.state.fpsSideSpeed > -0.01) {
        this.state.fpsSideSpeed = 0;
      }
      if (this.state.fpsVertSpeed < 0.01 && this.state.fpsVertSpeed > -0.01) {
        this.state.fpsVertSpeed = 0;
      }
    }

    this.fpsLastTime_ = fpsTimeNow;
  }

  draw(_sensorPos: SensorPosition | null): void {
    // Rotate the camera
    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.fpsPitch * DEG2RAD, [1, 0, 0]);
    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, this.state.fpsYaw * DEG2RAD, [0, 0, 1]);

    // Move the camera to the FPS position
    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [this.state.fpsPos[0], this.state.fpsPos[1], -this.state.fpsPos[2]]);
  }

  onEnter(): void {
    // Reset FPS position when entering FPS mode
    this.state.fpsPitch = <Degrees>0;
    this.state.fpsYaw = <Degrees>0;
    this.state.fpsPos[0] = 0;
    this.state.fpsPos[1] = 25000; // Move out from the center of the Earth
    this.state.fpsPos[2] = 0;
  }
}
