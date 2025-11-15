/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * FixedToEarthBehavior.ts - Camera behavior for fixed-to-earth viewing
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

import { Milliseconds, Radians, TAU } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { BaseCameraBehavior } from './BaseCameraBehavior';
import type { SensorPosition } from './ICameraBehavior';

/**
 * Fixed-to-Earth camera behavior.
 * This is the default camera mode that pivots around Earth with Earth at the center.
 */
export class FixedToEarthBehavior extends BaseCameraBehavior {
  update(_dt: Milliseconds): void {
    // Sync earth-centered angles with camera angles
    this.state.earthCenteredPitch = this.state.camPitch;
    this.state.earthCenteredYaw = this.state.camYaw;
    if (this.state.earthCenteredYaw < 0) {
      this.state.earthCenteredYaw = <Radians>(this.state.earthCenteredYaw + TAU);
    }
  }

  draw(_sensorPos: SensorPosition | null): void {
    /*
     * mat4 commands are run in reverse order:
     * 4. Rotate the camera around the new local origin
     * 3. Adjust for panning
     * 2. Back away from the earth in the Y direction (depth)
     * 1. Rotate around the earth (0,0,0)
     */

    // 4. Rotate the camera around the new local origin
    mat4.rotateX(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.pitch);
    mat4.rotateY(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.roll);
    mat4.rotateZ(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.yaw);

    // 3. Adjust for panning
    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [this.state.panCurrent.x, this.state.panCurrent.y, this.state.panCurrent.z]);

    // 2. Back away from the earth in the Y direction (depth)
    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [0, this.calcDistanceBasedOnZoom(), 0]);

    // 1. Rotate around the earth (0,0,0)
    mat4.rotateX(this.matrixWorldInverse, this.matrixWorldInverse, this.state.earthCenteredPitch);
    mat4.rotateZ(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.earthCenteredYaw);
  }
}
