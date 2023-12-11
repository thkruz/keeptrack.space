/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * The file constants.ts contains a set of constants used in the KeepTrack application.
 * It defines constants related to zooming, radians, degrees, milliseconds, Earth's gravitational
 * constant, minutes, distances of the Sun and Moon from the Earth, and more.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2023 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General License for more details.
 *
 * You should have received a copy of the GNU Affero General License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { Degrees, Kilometers, Milliseconds, Minutes, Radians } from 'ootk';

/**
 * Exponent used for calculating zoom distance.
 */
export const ZOOM_EXP = 3;

/**
 * Half the number of radians in a circle.
 * @deprecated Use HALF_TAU instead.
 */
export const PI = <Radians>Math.PI;

/**
 * Half the number of radians in a circle.
 */
export const HALF_TAU = <Radians>Math.PI;

/**
 * The number of radians in a circle.
 */
export const TAU = <Radians>(2 * Math.PI);

/**
 * The number of degrees in a radian.
 */
export const DEG2RAD = <Radians>(TAU / 360);

/**
 * The number of radians in a degree.
 */
export const RAD2DEG = <Degrees>(360 / TAU);

/**
 * The number of milliseconds in a day.
 */
export const MILLISECONDS2DAYS = 1.15741e-8;

/**
 * The number of milliseconds in a day.
 */
export const MILLISECONDS_PER_DAY = <Milliseconds>1000 * 60 * 60 * 24;

/**
 * The number of milliseconds in a second.
 */
export const MILLISECONDS_PER_SECOND = <Milliseconds>1000;

/**
 * Earths gravitational constant.
 */
export const EARTHS_GRAV_CONST = 6.6725985e-11;

/**
 * The mass of the Earth in kilograms.
 */
export const MASS_OF_EARTH = 5.97378250603408e24;

/**
 * The number of minutes in a day.
 */
export const MINUTES_PER_DAY = <Minutes>1440;

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
 * The speed of light in meters per second.
 */
export const cMPerSec = 299792458;

/**
 * The speed of light in kilometers per second.
 */
export const cKmPerSec = 299792458 / 1000;

/**
 * The speed of light in kilometers per millisecond.
 */
export const cKmPerMs = 299792458 / 1000 / 1000;

/**
 * Radius of the Earth in kilometers.
 */
export const RADIUS_OF_EARTH = <Kilometers>6371; // Radius of Earth in kilometers

/**
 * Distance objects are placed above earth to avoid z-buffer fighting
 */
export const GROUND_BUFFER_DISTANCE = <Kilometers>1;

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
