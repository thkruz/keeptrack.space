/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * sat-math-api.ts contains the `SatMathApi` singleton class, which provides a
 * wrapper around the `SatMath` class. It is used to provide a more convenient
 * interface for the `SatMath` class.
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

import { Degrees, DetailedSatellite, Kilometers } from '@ootk/src/main';
import { SatMath } from '../../app/analysis/sat-math';
import { ServiceLocator } from '../core/service-locator';

/**
 * `SatMathApi` is a singleton class that provides a wrapper around the `SatMath` class.
 * It is used to provide a more convenient interface for the `SatMath` class.
 *
 * All access to `SatMath` using singletons from `Container.getInstance()` should be done
 * through this class.
 */
export class SatMathApi {
  static getEcfOfCurrentOrbit(sat: DetailedSatellite, points: number) {
    const cb = (offset: number) => ServiceLocator.getTimeManager().getOffsetTimeObj(offset);


    return SatMath.getEcfOfCurrentOrbit(sat, points, cb);
  }

  static getEciOfCurrentOrbit(sat: DetailedSatellite, points: number) {
    const cb = (offset: number) => ServiceLocator.getTimeManager().getOffsetTimeObj(offset);


    return SatMath.getEciOfCurrentOrbit(sat, points, cb);
  }

  /**
   * Retrieves the LLA (Latitude, Longitude, Altitude) coordinates of the current orbit for a given satellite.
   *
   * @param sat - The detailed satellite object.
   * @param points - The number of points to calculate along the orbit.
   * @returns An array of LLA coordinates representing the current orbit in latitude, longitude, altitude, and time.
   */
  static getLlaOfCurrentOrbit(sat: DetailedSatellite, points: number) {
    const cb = (offset: number) => ServiceLocator.getTimeManager().getOffsetTimeObj(offset);


    return SatMath.getLlaOfCurrentOrbit(sat, points, cb) as { lat: Degrees; lon: Degrees; alt: Kilometers; time: number }[];
  }

  static getRicOfCurrentOrbit(sat: DetailedSatellite, sat2: DetailedSatellite, points: number, orbits = 1) {
    const cb = (offset: number) => ServiceLocator.getTimeManager().getOffsetTimeObj(offset);


    return SatMath.getRicOfCurrentOrbit(sat, sat2, points, cb, orbits);
  }
}

export const satMathApi = new SatMathApi();
