/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * ICameraBehavior.ts - Interface for camera behavior strategies
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

import type { BaseObject, GreenwichMeanSiderealTime, Milliseconds } from '@ootk/src/main';

export interface SensorPosition {
  lat: number;
  lon: number;
  gmst: GreenwichMeanSiderealTime;
  x: number;
  y: number;
  z: number;
}

/**
 * Interface for camera behavior strategies.
 * Each camera type (Fixed to Earth, FPS, Planetarium, etc.) implements this interface.
 */
export interface ICameraBehavior {
  /**
   * Update camera-specific logic for this frame.
   * This is called after common update logic (pan, zoom, rotation) has been applied.
   * @param dt Delta time in milliseconds
   */
  update(dt: Milliseconds): void;

  /**
   * Set up the camera's view matrix for rendering.
   * This method modifies the camera's matrixWorldInverse to position the camera correctly.
   * @param sensorPos Optional sensor position data (required for Planetarium/Astronomy modes)
   * @param target Optional space object target (required for satellite-tracking modes)
   */
  draw(sensorPos: SensorPosition | null, target: BaseObject | null): void;

  /**
   * Validate that this camera behavior can be activated.
   * For example, Planetarium mode requires a sensor to be selected.
   * @returns true if the camera behavior can be used, false otherwise
   */
  validate(sensorPos: SensorPosition | null, target: BaseObject | null): boolean;

  /**
   * Called when this behavior becomes active (camera type switches to this behavior).
   * Use this for initialization or state setup.
   */
  onEnter?(): void;

  /**
   * Called when this behavior becomes inactive (camera type switches away from this behavior).
   * Use this for cleanup.
   */
  onExit?(): void;
}
