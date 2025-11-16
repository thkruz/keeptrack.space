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

import { Kilometers } from '@app/engine/ootk/src/main';

/**
 * Orbital mechanics and orbit rendering settings
 */
export class OrbitalSettings {
  // Orbit Drawing
  /**
   * Determines whether or not to draw orbits.
   */
  isDrawOrbits = true;
  /**
   * Draw Trailing Orbits
   */
  isDrawTrailingOrbits = false;
  /**
   * Updates Orbit of selected satellite on every draw.
   *
   * Performance hit, but makes it clear what direction the satellite is going
   */
  enableConstantSelectedSatRedraw = true;
  /**
   * Automatically display all of the orbits
   */
  startWithOrbitsDisplayed = false;

  // Orbit Segments
  /**
   * Number of lines to draw when making an orbit
   *
   * Larger numbers will make smoother orbits, but will be more resource intensive
   */
  orbitSegments = 255;
  /** Number of segments to use when drawing OEM orbits */
  oemOrbitSegments = 64;

  // Orbit Limits
  /**
   * @deprecated
   * Maximum number of orbits to display when selecting "all" satellites
   */
  maxOribtsDisplayedDesktopAll = 1000;
  maxOribtsDisplayed = 100000;
  /**
   * The maximum number of orbits to display on mobile devices.
   */
  maxOrbitsDisplayedMobile = 1500;
  /**
   * The maximum number of orbits to be displayed on desktop.
   */
  maxOribtsDisplayedDesktop = 100000;

  // Orbit Styling
  /**
   * Transparency when a group of satellites is selected
   */
  orbitGroupAlpha = 0.5;
  /**
   * How much an orbit fades over time
   *
   * 0.0 = Not Visible
   *
   * 1.0 = No Fade
   */
  orbitFadeFactor = 0.6;

  // ECF Orbits
  /**
   * Show GEO Orbits in ECF vs ECI
   */
  isOrbitCruncherInEcf = true;
  /**
   * If ECF Orbits are drawn, this is the number of orbits to draw.
   */
  numberOfEcfOrbitsToDraw = 1;

  // Covariance
  /**
   * The confidence level to use when drawing Covariance ellipsoids.
   * 1 = 68.27% confidence
   * 2 = 95.45% confidence
   * 3 = 99.73% confidence
   */
  covarianceConfidenceLevel: number = 2;
  /**
   * Flag to determine if the covariance ellipsoid should be drawn.
   */
  isDrawCovarianceEllipsoid = false;

  // Sensor FOV and Lines
  /**
   * Draw Lines from Sensors to Satellites When in FOV
   */
  isDrawInCoverageLines = true;
  /**
   * The distance the a satellites fov cone is drawn away from the earth.
   *
   * This is used to prevent the cone from clipping into the earth.
   *
   * You can adjust this value to make the cone appear closer or further away from the earth.
   *
   * Negative values will cause the cone to clip into the earth, but that may be desired for some use cases.
   */
  coneDistanceFromEarth = 15 as Kilometers;

  // Line Scan
  /**
   * Minimum elevation to draw a line scan
   */
  lineScanMinEl = 5;
  /**
   * The speed at which the scan lines for radars move across the screen
   *
   * About 30 seconds to scan earth (arbitrary)
   *
   * (each draw will be +speed lat/lon)
   */
  lineScanSpeedRadar = 0.25;
  /**
   * The speed at which the scan lines for radars move across the screen
   *
   * About 6 seconds to scan earth (no source, just a guess)
   *
   * (each draw will be +speed lat/lon)
   */
  lineScanSpeedSat = 6;

  // Initial Orbit Determination
  /**
   * Number of steps to fit TLEs in the Initial Orbit plugin
   */
  fitTleSteps = 3; // Increasing this will kill performance
}

export const defaultOrbitalSettings = new OrbitalSettings();
