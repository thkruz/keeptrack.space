/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * BaseCameraBehavior.ts - Base class for camera behavior strategies
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

import type { Camera } from '../camera';
import type { ICameraBehavior, SensorPosition } from './ICameraBehavior';
import type { DetailedSatellite, Milliseconds } from '@ootk/src/main';
import type { MissileObject } from '@app/app/data/catalog-manager/MissileObject';

/**
 * Base class for camera behaviors.
 * Provides access to the parent Camera instance and its state.
 */
export abstract class BaseCameraBehavior implements ICameraBehavior {
  constructor(protected camera: Camera) {}

  /**
   * Get the camera's state object for reading/writing
   */
  protected get state() {
    return this.camera.state;
  }

  /**
   * Get the camera's matrixWorldInverse for modification
   */
  protected get matrixWorldInverse() {
    return this.camera.matrixWorldInverse;
  }

  /**
   * Get camera's public methods
   */
  protected get calcDistanceBasedOnZoom() {
    return this.camera.calcDistanceBasedOnZoom.bind(this.camera);
  }

  protected get getZoomFromDistance() {
    return this.camera.getZoomFromDistance.bind(this.camera);
  }

  /**
   * Default update does nothing - override in subclasses if needed
   */
  update(_dt: Milliseconds): void {
    // Default: no camera-specific update logic
  }

  /**
   * Draw must be implemented by subclasses
   */
  abstract draw(sensorPos: SensorPosition | null, target: DetailedSatellite | MissileObject | null): void;

  /**
   * Default validation always returns true - override in subclasses if needed
   */
  validate(_sensorPos: SensorPosition | null, _target: DetailedSatellite | MissileObject | null): boolean {
    return true;
  }

  /**
   * Optional lifecycle hooks
   */
  onEnter?(): void;
  onExit?(): void;
}
