/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * eclipse-types.ts - Type definitions for Eclipse & Solar Analysis Plugin
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

/**
 * Eclipse event types
 */
export enum EclipseEventType {
  ENTER_PENUMBRA = 'enter_penumbra',
  ENTER_UMBRA = 'enter_umbra',
  EXIT_UMBRA = 'exit_umbra',
  EXIT_PENUMBRA = 'exit_penumbra',
}

/**
 * Eclipse event data structure
 */
export interface EclipseEvent {
  /** Event type */
  type: EclipseEventType;
  /** Time of the event */
  time: Date;
  /** Orbit number (starting from 0) */
  orbitNumber: number;
}

/**
 * Eclipse period data structure
 */
export interface EclipsePeriod {
  /** Start time of eclipse */
  startTime: Date;
  /** End time of eclipse */
  endTime: Date;
  /** Duration in milliseconds */
  duration: Milliseconds;
  /** Orbit number */
  orbitNumber: number;
  /** Whether this is umbral (true) or penumbral (false) eclipse */
  isUmbral: boolean;
  /** Maximum depth of eclipse (0-1, where 1 is deepest) */
  maxDepth?: number;
}

/**
 * Eclipse statistics for an orbit or time period
 */
export interface EclipseStatistics {
  /** Total number of eclipse events */
  totalEclipses: number;
  /** Total time in eclipse (milliseconds) */
  totalEclipseTime: Milliseconds;
  /** Total time in umbral shadow (milliseconds) */
  totalUmbralTime: Milliseconds;
  /** Total time in penumbral shadow (milliseconds) */
  totalPenumbralTime: Milliseconds;
  /** Eclipse fraction (0-1) */
  eclipseFraction: number;
  /** Average eclipse duration (milliseconds) */
  averageEclipseDuration: Milliseconds;
  /** Maximum eclipse duration (milliseconds) */
  maxEclipseDuration: Milliseconds;
  /** Minimum eclipse duration (milliseconds) */
  minEclipseDuration: Milliseconds;
}

/**
 * Solar beta angle data point
 */
export interface BetaAngleDataPoint {
  /** Time of measurement */
  time: Date;
  /** Solar beta angle in degrees */
  betaAngle: Degrees;
  /** Orbit number */
  orbitNumber?: number;
}

/**
 * Sun geometry data for target observation
 */
export interface SunGeometry {
  /** Sun phase angle (degrees) - angle between sun-satellite and satellite-target */
  phaseAngle: Degrees;
  /** Sun elevation angle relative to satellite (degrees) */
  sunElevation: Degrees;
  /** Sun azimuth angle relative to satellite (degrees) */
  sunAzimuth: Degrees;
  /** Whether the target is illuminated by the sun */
  isTargetIlluminated: boolean;
  /** Whether the satellite is illuminated by the sun */
  isSatelliteIlluminated: boolean;
}

/**
 * Configuration for eclipse predictions
 */
export interface EclipsePredictionConfig {
  /** Duration to predict forward in hours */
  predictionDurationHours: number;
  /** Time step for calculations in seconds */
  timeStepSeconds: number;
  /** Number of orbits to analyze */
  numberOfOrbits: number;
  /** Include penumbral eclipses */
  includePenumbral: boolean;
}
