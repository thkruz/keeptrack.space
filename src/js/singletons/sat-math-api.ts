/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * sat-math-api.ts contains the `SatMathApi` singleton class, which provides a
 * wrapper around the `SatMath` class. It is used to provide a more convenient
 * interface for the `SatMath` class.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2023 Heather Kruczek
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

import { SatObject } from '@app/js/interfaces';
import { keepTrackApi } from '../keepTrackApi';
import { SatMath } from '../static/sat-math';

/**
 * `SatMathApi` is a singleton class that provides a wrapper around the `SatMath` class.
 * It is used to provide a more convenient interface for the `SatMath` class.
 *
 * All access to `SatMath` using singletons from `keepTrackContainer` should be done
 * through this class.
 */
export class SatMathApi {
  static getEcfOfCurrentOrbit(sat: SatObject, points: number) {
    const cb = (offset: number) => keepTrackApi.getTimeManager().getOffsetTimeObj(offset);
    return SatMath.getEcfOfCurrentOrbit(sat, points, cb);
  }

  static getEciOfCurrentOrbit(sat: SatObject, points: number) {
    const cb = (offset: number) => keepTrackApi.getTimeManager().getOffsetTimeObj(offset);
    return SatMath.getEciOfCurrentOrbit(sat, points, cb);
  }

  static getLlaOfCurrentOrbit(sat: SatObject, points: number) {
    const cb = (offset: number) => keepTrackApi.getTimeManager().getOffsetTimeObj(offset);
    return SatMath.getLlaOfCurrentOrbit(sat, points, cb);
  }

  static getLlaTimeView(now: Date, sat: SatObject): { lat: number; lon: number; time: string; inView: boolean } {
    const sensor = keepTrackApi.getSensorManager().currentSensors[0];
    return SatMath.getLlaTimeView(now, sat, sensor);
  }

  static getRicOfCurrentOrbit(sat: SatObject, sat2: SatObject, points: number, orbits = 1) {
    const cb = (offset: number) => keepTrackApi.getTimeManager().getOffsetTimeObj(offset);
    return SatMath.getRicOfCurrentOrbit(sat, sat2, points, cb, orbits);
  }

  static map(sat: SatObject, i: number, pointPerOrbit = 256): { time: string; lat: number; lon: number; inView: boolean } {
    const cb = (offset: number) => keepTrackApi.getTimeManager().getOffsetTimeObj(offset);
    return SatMath.map(sat, i, cb, pointPerOrbit);
  }
}

export const satMathApi = new SatMathApi();
