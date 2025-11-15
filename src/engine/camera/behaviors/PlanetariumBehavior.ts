/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * PlanetariumBehavior.ts - Camera behavior for planetarium view from a sensor
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

import { DEG2RAD, Degrees } from '@ootk/src/main';
import { mat4 } from 'gl-matrix';
import { BaseCameraBehavior } from './BaseCameraBehavior';
import type { SensorPosition } from './ICameraBehavior';

/**
 * Planetarium camera behavior.
 * Shows the view from a ground-based sensor looking up at the sky.
 */
export class PlanetariumBehavior extends BaseCameraBehavior {
  draw(sensorPos: SensorPosition | null): void {
    if (!sensorPos) {
      throw new Error('Sensor Position is required for Planetarium mode');
    }

    /*
     * Pitch is the opposite of the angle to the latitude
     * Yaw is 90 degrees to the left of the angle to the longitude
     */
    this.state.fpsPitch = <Degrees>(-1 * sensorPos.lat * DEG2RAD);
    this.state.fpsRotate = <Degrees>((90 - sensorPos.lon) * DEG2RAD - sensorPos.gmst);

    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, this.state.fpsPitch, [1, 0, 0]);
    mat4.rotate(this.matrixWorldInverse, this.matrixWorldInverse, this.state.fpsRotate, [0, 0, 1]);
    mat4.translate(this.matrixWorldInverse, this.matrixWorldInverse, [-sensorPos.x, -sensorPos.y, -sensorPos.z]);
  }

  validate(sensorPos: SensorPosition | null): boolean {
    // Planetarium mode requires a sensor to be selected
    return sensorPos !== null;
  }
}
