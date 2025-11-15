/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * CameraBehaviorFactory.ts - Factory for creating camera behavior instances
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

import type { Camera, CameraType } from '../camera';
import type { ICameraBehavior } from './ICameraBehavior';
import { FixedToEarthBehavior } from './FixedToEarthBehavior';
import { FixedToSatBehavior } from './FixedToSatBehavior';
import { FpsBehavior } from './FpsBehavior';
import { PlanetariumBehavior } from './PlanetariumBehavior';
import { SatelliteBehavior } from './SatelliteBehavior';
import { AstronomyBehavior } from './AstronomyBehavior';

/**
 * Factory for creating camera behavior instances based on camera type.
 */
export class CameraBehaviorFactory {
  /**
   * Create a camera behavior instance for the given camera type.
   * @param type The camera type to create a behavior for
   * @param camera The camera instance that will use this behavior
   * @returns The appropriate camera behavior instance
   */
  static create(type: CameraType, camera: Camera): ICameraBehavior {
    // Import CameraType enum dynamically to avoid circular dependency
    const CameraType = require('../camera').CameraType;

    switch (type) {
      case CameraType.FIXED_TO_EARTH:
        return new FixedToEarthBehavior(camera);

      case CameraType.FIXED_TO_SAT:
        return new FixedToSatBehavior(camera);

      case CameraType.FPS:
        return new FpsBehavior(camera);

      case CameraType.PLANETARIUM:
        return new PlanetariumBehavior(camera);

      case CameraType.SATELLITE:
        return new SatelliteBehavior(camera);

      case CameraType.ASTRONOMY:
        return new AstronomyBehavior(camera);

      case CameraType.CURRENT:
        // CURRENT means keep the existing behavior - this shouldn't normally be called
        throw new Error('Cannot create behavior for CameraType.CURRENT - this is a meta-type');

      default:
        // Default to Fixed to Earth
        return new FixedToEarthBehavior(camera);
    }
  }
}
