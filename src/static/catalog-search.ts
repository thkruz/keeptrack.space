/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * catalog-search.ts provides static methods for filtering and searching through an
 * array of satellite data.
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

import { BaseObject, CatalogSource, Degrees, DetailedSatellite, Minutes, SpaceObjectType } from 'ootk';
import { SatMath } from './sat-math';

/**
 * The CatalogSearch class provides static methods for filtering and searching through an array of satellite data.
 * It includes methods for filtering by various properties such as 'bus', 'country', 'shape', and 'objectName'.
 * It also includes methods for finding satellites in a similar orbit to a given satellite and finding reentry objects.
 *
 * @example
 * // Filtering by 'bus'
 * const filteredByBus = CatalogSearch.bus(satData, 'busValue');
 *
 * // Filtering by 'country'
 * const filteredByCountry = CatalogSearch.country(satData, /USA/);
 *
 * // Finding objects by orbit
 * const similarOrbitObjects = CatalogSearch.findObjsByOrbit(satData, DetailedSatellite, 2, 5, 0);
 *
 * // Finding reentry objects
 * const reentryObjects = CatalogSearch.findReentry(satData, 100);
 *
 * // Filtering by 'objectName'
 * const filteredByObjectName = CatalogSearch.objectName(satData, /Satellite/);
 *
 * // Filtering by 'shape'
 * const filteredByShape = CatalogSearch.shape(satData, 'shapeValue');
 */
export class CatalogSearch {
  /**
   * Filters the given array of DetailedSatellite based on the 'bus' property.
   *
   * @param satData - The array of DetailedSatellite to filter.
   * @param text - The value to compare the 'bus' property of each DetailedSatellite against.
   * @returns An array of DetailedSatellite where the 'bus' property matches the given text.
   */
  static bus(satData: DetailedSatellite[], text: string): DetailedSatellite[] {
    return this.byProp(satData, 'bus', text);
  }

  /**
   * Filters the satellite data based on the country name.
   *
   * @static
   * @param {DetailedSatellite[]} satData - The array of satellite data to filter.
   * @param {RegExp} regex - The regular expression to match against the country name.
   * @returns {DetailedSatellite[]} The filtered array of satellite data.
   */
  static country(satData: DetailedSatellite[], regex: RegExp): DetailedSatellite[] {
    return satData.filter((sat) => typeof sat.name === 'string' && sat.country.match(regex));
  }

  /**
   * This static method finds satellite objects that are in a similar orbit to a given satellite.
   * It does this by filtering the provided array of satellite data based on the period, inclination, and RAAN of the given satellite.
   * The method uses a margin of error for the inclination and RAAN values to allow for slight differences in orbits.
   *
   * If periodMargin is set to 0, the method will use a 10% margin of error for the period value.
   *
   * @param {DetailedSatellite[]} satData - An array of satellite objects to search through.
   * @param {DetailedSatellite} sat - The satellite object to compare other satellites to.
   * @param {Degrees} [incMargin=2] - The margin of error for the inclination value in degrees.
   * @param {Degrees} [raanMargin=5] - The margin of error for the RAAN value in degrees.
   * @param {Minutes} [periodMargin=0] - The margin of error for the period value in minutes.
   *
   * @returns {number[]} - An array of satellite IDs that are in a similar orbit to the given satellite.
   */
  static findObjsByOrbit(
    satData: DetailedSatellite[],
    sat: DetailedSatellite,
    incMargin: Degrees = <Degrees>2,
    raanMargin: Degrees = <Degrees>5,
    periodMargin: Minutes = <Minutes>0,
  ): number[] {
    const INC_MARGIN = incMargin;
    const RAAN_MARGIN = raanMargin;

    const maxPeriod = periodMargin === 0 ? sat.period * 1.1 : sat.period + periodMargin;
    const minPeriod = periodMargin === 0 ? sat.period * 0.9 : sat.period - periodMargin;

    const maxInclination = sat.inclination + INC_MARGIN;
    const minInclination = sat.inclination - INC_MARGIN;

    const now = new Date();
    const normalizedSatRaan = SatMath.normalizeRaan(sat, now);
    let maxRaan = normalizedSatRaan + RAAN_MARGIN;
    let minRaan = normalizedSatRaan - RAAN_MARGIN;

    if (normalizedSatRaan >= 360 - RAAN_MARGIN) {
      maxRaan -= 360;
    }
    if (normalizedSatRaan <= RAAN_MARGIN) {
      minRaan += 360;
    }


    return satData
      .filter((s) => {
        // Skip static objects
        if (s.isStatic()) {
          return false;
        }

        // Check inclination bounds
        if (s.inclination < minInclination || s.inclination > maxInclination) {
          return false;
        }

        // Check period bounds
        if (s.period < minPeriod || s.period > maxPeriod) {
          return false;
        }

        const normalizedSearchRaan = SatMath.normalizeRaan(s, now);

        // Handle RAAN wraparound case
        if (normalizedSatRaan > 360 - RAAN_MARGIN || normalizedSatRaan < RAAN_MARGIN) {
          return normalizedSearchRaan > minRaan || normalizedSearchRaan < maxRaan;
        }

        // Check RAAN bounds (normal case)
        return !(normalizedSearchRaan < minRaan || normalizedSearchRaan > maxRaan);
      })
      .map((s) => s.id);
  }


  /**
   * This method is used to find the reentry objects from the given satellite data.
   * It filters the satellite data based on the type of the object (PAYLOAD, ROCKET_BODY, DEBRIS) and the perigee value.
   * After filtering, it sorts the data in ascending order based on the perigee value.
   * It then returns the SCC numbers of the top 100 objects with the lowest perigee values.
   *
   * @param satData - An array of satellite objects.
   * @param numReturns - The number of objects to return. Defaults to 100.
   *
   * @returns An array of SCC numbers of the top 100 objects with the lowest perigee values.
   */
  static findReentry(satData: DetailedSatellite[], numReturns = 100): string[] {
    return satData
      .filter((sat) => sat.type === SpaceObjectType.PAYLOAD || sat.type === SpaceObjectType.ROCKET_BODY || sat.type === SpaceObjectType.DEBRIS)
      .filter((sat) => sat.perigee > 0)
      .sort((a, b) => a.perigee - b.perigee)
      .slice(0, numReturns)
      .map((sat) => sat.sccNum);
  }

  /**
   * Filters the given array of satellite objects based on the provided regular expression.
   * Only the satellite objects with a name that matches the regular expression are returned.
   *
   * @param objData - An array of satellite objects to filter.
   * @param regex - The regular expression to match against the satellite object names.
   * @returns An array of satellite objects that match the provided regular expression.
   */
  static objectName(objData: BaseObject[], regex: RegExp): BaseObject[] {
    return objData.filter((sat) => typeof sat.name === 'string' && sat.name.match(regex));
  }

  /**
   * Filters the given array of DetailedSatellite by the 'shape' property.
   *
   * @static
   * @param {DetailedSatellite[]} satData - The array of DetailedSatellite to filter.
   * @param {string} text - The value to match against the 'shape' property of each DetailedSatellite.
   * @returns {DetailedSatellite[]} The filtered array of DetailedSatellite.
   */
  static shape(satData: DetailedSatellite[], text: string): DetailedSatellite[] {
    return this.byProp(satData, 'shape', text);
  }

  /**
   * Filters the given array of satellite data based on the provided object type.
   *
   * @param satData - An array of satellite objects to be filtered.
   * @param objType - The type of space object to filter the satellite data by.
   * @returns An array of satellite objects that match the provided object type.
   */
  static type(satData: DetailedSatellite[], objType: SpaceObjectType): DetailedSatellite[] {
    return satData.filter((sat) => sat.type === objType);
  }

  /**
   * Filters the satellite data based on the year.
   *
   * @static
   * @param {DetailedSatellite[]} satData - An array of satellite data objects.
   * @param {number} yr - The year to filter the satellite data by.
   * @returns {DetailedSatellite[]} An array of satellite data objects that were launched in the specified year.
   */
  static year(satData: DetailedSatellite[], yr: number): DetailedSatellite[] {
    return satData.filter((sat) => {
      const tleYear = sat?.tle1?.substring(9, 11) || '-1';

      return parseInt(tleYear) === yr;
    });
  }

  /**
   * Filters the satellite data based on the year.
   *
   * This function filters the given satellite data array and returns only those satellites that were launched in the given year or less.
   * The function uses the Cospar value in tle1 property of the satellite data to determine the launch year of the satellite.
   *
   * @param satData - An array of DetailedSatellite instances representing the satellite data.
   * @param yr - The year to filter the satellite data by. Only satellites launched in this year or earlier will be included in the returned array.
   *
   * @returns An array of DetailedSatellite instances representing the satellites that were launched in the given year or earlier.
   */
  static yearOrLess(satData: DetailedSatellite[], yr: number) {
    return satData.filter((sat) => {
      if (sat.source === CatalogSource.VIMPEL) {
        return false;
      }

      // 2007 Fengyun 1C ASAT Event
      if (sat.intlDes?.includes('1999-025')) {
        if (sat.intlDes !== '1999-025A') {
          if (yr >= 7 && yr < 57) {
            return true;
          }

          return false;

        }
      }

      // 2009 Cosmos Iridium Collision
      if (sat.intlDes?.includes('1993-036') || sat.intlDes?.includes('1997-051')) {
        if (sat.intlDes !== '1993-036A' && sat.intlDes !== '1997-051A') {
          if (yr >= 9 && yr < 57) {
            return true;
          }

          return false;

        }
      }

      // 2021 Cosmos 2542 ASAT Event
      if (sat.intlDes?.includes('1982-092')) {
        if (sat.intlDes !== '1982-092A' && sat.intlDes !== '1982-092B') {
          if (yr >= 21 && yr < 57) {
            return true;
          }

          return false;

        }
      }

      const launchDate = sat?.launchDate !== '' ? sat?.launchDate : null;
      const launchYear = launchDate?.slice(2, 4) ?? sat?.tle1.slice(9, 11) ?? '-1';

      if (yr >= 57 && yr < 100) {
        return parseInt(launchYear) <= yr && parseInt(launchYear) >= 57;
      }

      return parseInt(launchYear) <= yr || parseInt(launchYear) >= 57;

    });
  }

  /**
   * Filters the given array of DetailedSatellite by a specific property and value.
   *
   * @param {DetailedSatellite[]} satData - The array of DetailedSatellite to filter.
   * @param {string} prop - The property of DetailedSatellite to filter by.
   * @param {string} text - The value of the property to match for filtering.
   *
   * @returns {DetailedSatellite[]} The filtered array of DetailedSatellite where the specified property equals the given text.
   */
  private static byProp(satData: DetailedSatellite[], prop: string, text: string): DetailedSatellite[] {
    return satData.filter((sat) => sat[prop] === text);
  }
}
