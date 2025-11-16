/**
 * /////////////////////////////////////////////////////////////////////////////
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

import { Milliseconds } from '@app/engine/ootk/src/main';


/**
 * Performance optimization and resource limit settings
 */
export class PerformanceSettings {
  // Performance Mode
  lowPerf = false;
  /**
   * Determines whether the application should use a reduced-draw mode.
   * If true, the application will use a less resource-intensive method of rendering.
   * If false, the application will use the default rendering method.
   */
  isDrawLess = false;

  // Preallocated Limits
  /**
   * Preallocate the maximum number of analyst satellites that can be manipulated
   *
   * NOTE: This mainly applies to breakup scenarios
   */
  maxAnalystSats = 10000;
  /**
   * Preallocate the maximum number of field of view marker dots that can be displayed
   */
  maxFieldOfViewMarkers = 1;
  /**
   * Preallocate the maximum number of missiles that can be displayed
   *
   * NOTE: New attack scenarios are limited to this number
   */
  maxMissiles = 500;
  /**
   * Preallocate the maximum number of labels that can be displayed
   *
   * Set mobileMaxLabels and desktopMaxLabels instead of this directly
   */
  maxLabels = 0; // 20000;
  /** Maximum number of OEM satellites to load */
  maxOemSatellites: number = 10;
  maxNotionalDebris = 100000;

  // FPS Throttling
  /**
   * Minimum time between draw calls in milliseconds
   *
   * 20 FPS = 50ms
   * 30 FPS = 33.33ms
   * 60 FPS = 16.67ms
   */
  minimumDrawDt = <Milliseconds>0.0;
  /**
   * Minimum fps or sun/moon are skipped
   */
  fpsThrottle1 = 0;
  /**
   * Minimum fps or satellite velocities are ignored
   */
  fpsThrottle2 = 10;

  // Dot Rendering
  dotsOnScreen = 0;
  /**
   * This is an override for how many dot colors are calculated per draw loop.
   * Higher numbers will make the dots more accurate, but will slow down the simulation.
   */
  dotsPerColor: number;

  // Canvas
  /** Used to disable the canvas for debugging purposes */
  isDisableCanvas = false;

  // Workers
  /**
   * Global flag for determining if the cruncher's loading is complete
   */
  cruncherReady = false;
  positionCruncher: Worker | null = null;
  orbitCruncher: Worker | null = null;
}

export const defaultPerformanceSettings = new PerformanceSettings();
