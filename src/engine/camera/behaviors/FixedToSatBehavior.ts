/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * FixedToSatBehavior.ts - Camera behavior for fixed-to-satellite viewing
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

import { BaseObject, Kilometers, Milliseconds, SpaceObjectType } from '@ootk/src/main';
import { mat4, vec3 } from 'gl-matrix';
import { RADIUS_OF_EARTH } from '@app/engine/utils/constants';
import { alt2zoom } from '@app/engine/utils/transforms';
import { normalizeAngle } from '@app/engine/utils/transforms';
import { keepTrackApi } from '@app/keepTrackApi';
import { settingsManager } from '@app/settings/settings';
import { BaseCameraBehavior } from './BaseCameraBehavior';
import type { SensorPosition } from './ICameraBehavior';

/**
 * Fixed-to-Satellite camera behavior.
 * Pivots around a selected satellite, keeping it centered in view.
 */
export class FixedToSatBehavior extends BaseCameraBehavior {
  update(_dt: Milliseconds): void {
    // Sync FTS angles with camera angles
    this.state.camPitch = normalizeAngle(this.state.camPitch);
    this.state.ftsPitch = this.state.camPitch;
    this.state.ftsYaw = this.state.camYaw;
  }

  validate(_sensorPos: SensorPosition | null, target: BaseObject | null): boolean {
    // Cannot track invalid targets or stars
    if (!target || target.id === -1 || target.type === SpaceObjectType.STAR) {
      return false;
    }

    return true;
  }

  draw(_sensorPos: SensorPosition | null, target: BaseObject | null): void {
    if (!target) {
      return;
    }

    // Ensure we don't zoom in too close to the satellite
    // Get position relative to center body
    const centerBody = keepTrackApi.getScene().getBodyById(settingsManager.centerBody)!;
    const centerBodyPosition = centerBody.position;
    const relativePosition = {
      x: target.position.x - centerBodyPosition[0] as Kilometers,
      y: target.position.y - centerBodyPosition[1] as Kilometers,
      z: target.position.z - centerBodyPosition[2] as Kilometers,
    };

    // Calculate satellite altitude: distance from center minus radius
    const distanceFromCenter = Math.sqrt(relativePosition.x ** 2 + relativePosition.y ** 2 + relativePosition.z ** 2);
    const satAlt = <Kilometers>(distanceFromCenter - (centerBody.RADIUS as Kilometers));

    if (this.calcDistanceBasedOnZoom() < satAlt + RADIUS_OF_EARTH + settingsManager.minDistanceFromSatellite) {
      this.state.zoomTarget = alt2zoom(satAlt, settingsManager.minZoomDistance, settingsManager.maxZoomDistance, settingsManager.minDistanceFromSatellite);
      this.state.zoomLevel = this.state.zoomTarget;
    }

    /*
     * mat4 commands are run in reverse order:
     * 1. Move to the satellite position
     * 2. Twist the camera around Z-axis
     * 3. Pitch the camera around X-axis (this may have moved because of the Z-axis rotation)
     * 4. Back away from the satellite
     * 5. Adjust for panning
     * 6. Rotate the camera FPS style
     */

    // 6. Rotate the camera FPS style
    mat4.rotateX(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.pitch);
    mat4.rotateY(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.roll);
    mat4.rotateZ(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.localRotateCurrent.yaw);

    // 5. Adjust for panning
    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [this.state.panCurrent.x, this.state.panCurrent.y, this.state.panCurrent.z]);

    // 4. Back away from the satellite
    // Calculate target position distance from Earth
    const targetPosition = vec3.fromValues(target.position.x, target.position.y, target.position.z);
    const targetDistance = vec3.length(targetPosition);

    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [
      0,
      this.calcDistanceBasedOnZoom() - targetDistance,
      0,
    ]);

    // 3 & 2. Pitch and twist the camera
    mat4.rotateX(this.matrixWorldInverse, this.matrixWorldInverse, this.state.ftsPitch);
    mat4.rotateZ(this.matrixWorldInverse, this.matrixWorldInverse, -this.state.ftsYaw);
  }
}
