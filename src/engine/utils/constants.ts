/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * The file constants.ts contains a set of constants used in the KeepTrack application.
 * It defines constants related to zooming, radians, degrees, milliseconds, Earth's gravitational
 * constant, minutes, distances of the Sun and Moon from the Earth, and more.
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

import { Kilometers } from '@ootk/src/main';

/**
 * Exponent used for calculating zoom distance.
 */
export const ZOOM_EXP = 3.8;

/**
 * Earths gravitational constant.
 */
export const EARTHS_GRAV_CONST = 6.6725985e-11;

/**
 * The mass of the Earth in kilograms.
 */
export const MASS_OF_EARTH = 5.97378250603408e24;

/**
 * The offset away from the earth when drawing the camera in Planetarium or Astronomy modes.
 */
export const PLANETARIUM_DIST = <Kilometers>3;

/**
 * The radius used to draw the Sun in kilometers.
 * This value is used to scale the Sun's size when rendering it.
 */
export const RADIUS_OF_DRAW_SUN = <Kilometers>9000;

/**
 * The scalar distance used to draw the Sun.
 * This value is used to scale the Sun's size and distance from the Earth.
 */
export const SUN_SCALAR_DISTANCE = <Kilometers>250000;

/**
 * The radius used to draw the Moon in kilometers.
 * This value is used to scale the Moon's size when rendering it.
 */
export const RADIUS_OF_DRAW_MOON = <Kilometers>4000;

/**
 * The scalar distance used to draw the Moon.
 * This value is used to scale the Moon's size and distance from the Earth.
 */
export const MOON_SCALAR_DISTANCE = <Kilometers>200000;

/**
 * Radius of the Earth in kilometers.
 */
export const RADIUS_OF_EARTH = <Kilometers>6371; // Radius of Earth in kilometers

/**
 * Distance objects are placed above earth to avoid z-buffer fighting
 */
export const GROUND_BUFFER_DISTANCE = <Kilometers>2.5;

/**
 * Radius of the Sun in kilometers
 */
export const RADIUS_OF_SUN = <Kilometers>695700;

/**
 * Artificial Star Distance - Lower number Reduces webgl depth buffer
 */
export const STAR_DISTANCE = <Kilometers>250000;

/**
 * Distance from Earth to the Sun in kilometers
 */
export const DISTANCE_TO_SUN = <Kilometers>149597870; // Distance from Earth to the Sun in kilometers

/**
 * Earth's Obliquity in degrees
 */
export const EARTH_OBLIQUITY_DEGREES = 23.438480461241912;

/**
 * Earth's Obliquity in radians
 */
export const EARTH_OBLIQUITY_RADIANS = EARTH_OBLIQUITY_DEGREES * (Math.PI / 180);
