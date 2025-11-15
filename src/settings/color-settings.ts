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

import type { ColorSchemeColorMap } from '@app/engine/rendering/color-schemes/color-scheme';
import type { ObjectTypeColorSchemeColorMap } from '@app/engine/rendering/color-schemes/object-type-color-scheme';

/**
 * Color scheme and color-related settings
 */
export class ColorSettings {
  colors: ColorSchemeColorMap & ObjectTypeColorSchemeColorMap;

  /**
   * The default color scheme to use when the application is loaded. This must be a string that matches a class name of one of the available color schemes.
   * Ex. DefaultColorScheme, CelestrakColorScheme, etc.
   */
  defaultColorScheme = 'CelestrakColorScheme';

  colorSchemeInstances = {
    CelestrakColorScheme: {
      enabled: true,
    },
    ObjectTypeColorScheme: {
      enabled: true,
    },
    CountryColorScheme: {
      enabled: true,
    },
    RcsColorScheme: {
      enabled: true,
    },
    ReentryRiskColorScheme: {
      enabled: true,
    },
    MissionColorScheme: {
      enabled: true,
    },
    ConfidenceColorScheme: {
      enabled: true,
    },
    OrbitalPlaneDensityColorScheme: {
      enabled: true,
    },
    SpatialDensityColorScheme: {
      enabled: true,
    },
    SunlightColorScheme: {
      enabled: true,
    },
    GpAgeColorScheme: {
      enabled: true,
    },
    SourceColorScheme: {
      enabled: true,
    },
    VelocityColorScheme: {
      enabled: true,
    },
    StarlinkColorScheme: {
      enabled: true,
    },
    SmallSatColorScheme: {
      enabled: true,
    },
  };

  /**
   * The current legend to display.
   */
  currentLayer = 'CelestrakColorScheme';

  // Object Colors
  /**
   * Color of the dot when hovering over an object.
   */
  hoverColor = <[number, number, number, number]>[1.0, 1.0, 0.0, 1.0]; // Yellow
  /**
   * Color of the dot when selected.
   */
  selectedColor = <[number, number, number, number]>[1.0, 0.0, 0.0, 1.0]; // Red
  selectedColorFallback = <[number, number, number, number]>[0, 0, 0, 0];

  // Orbit Colors
  /**
   * Color of orbits when a group of satellites is selected.
   */
  orbitGroupColor = <[number, number, number, number]>[1.0, 1.0, 0.0, 0.7];
  /**
   * Color of orbit when hovering over an object.
   */
  orbitHoverColor = <[number, number, number, number]>[1.0, 1.0, 0.0, 0.9];
  /**
   * Color of orbit when in view.
   */
  orbitInViewColor = <[number, number, number, number]>[1.0, 1.0, 1.0, 0.7]; // WHITE
  /**
   * Color of orbit when in Planetarium View.
   */
  orbitPlanetariumColor = <[number, number, number, number]>[1.0, 1.0, 1.0, 0.2]; // Transparent White
  /**
   * Color of orbit when selected.
   */
  orbitSelectColor = <[number, number, number, number]>[1.0, 0.0, 0.0, 0.9];
  /**
   * Color of secondary object orbit.
   */
  orbitSelectColor2 = <[number, number, number, number]>[0.0, 0.4, 1.0, 0.9];
}

export const defaultColorSettings = new ColorSettings();
