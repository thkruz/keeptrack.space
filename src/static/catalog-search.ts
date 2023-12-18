/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * catalog-search.ts provides static methods for filtering and searching through an
 * array of satellite data.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2023 Heather Kruczek
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

import { SpaceObjectType } from '@app/js/lib/space-object-type';
import { Degrees, Minutes } from 'ootk';
import { SatObject } from '../interfaces';
import { DEG2RAD } from '../lib/constants';
import { CatalogSource } from './catalog-loader';

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
 * const similarOrbitObjects = CatalogSearch.findObjsByOrbit(satData, satObject, 2, 5, 0);
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
   * Filters the given array of SatObject based on the 'bus' property.
   *
   * @param satData - The array of SatObject to filter.
   * @param text - The value to compare the 'bus' property of each SatObject against.
   * @returns An array of SatObject where the 'bus' property matches the given text.
   */
  static bus(satData: SatObject[], text: string): SatObject[] {
    return this.byProp(satData, 'bus', text);
  }

  /**
   * Filters the satellite data based on the country name.
   *
   * @static
   * @param {SatObject[]} satData - The array of satellite data to filter.
   * @param {RegExp} regex - The regular expression to match against the country name.
   * @returns {SatObject[]} The filtered array of satellite data.
   */
  static country(satData: SatObject[], regex: RegExp): SatObject[] {
    return satData.filter((sat) => typeof sat.name === 'string' && sat.country.match(regex));
  }

  /**
   * This static method finds satellite objects that are in a similar orbit to a given satellite.
   * It does this by filtering the provided array of satellite data based on the period, inclination, and RAAN of the given satellite.
   * The method uses a margin of error for the inclination and RAAN values to allow for slight differences in orbits.
   *
   * If periodMargin is set to 0, the method will use a 10% margin of error for the period value.
   *
   * @param {SatObject[]} satData - An array of satellite objects to search through.
   * @param {SatObject} sat - The satellite object to compare other satellites to.
   * @param {Degrees} [incMargin=2] - The margin of error for the inclination value in degrees.
   * @param {Degrees} [raanMargin=5] - The margin of error for the RAAN value in degrees.
   * @param {Minutes} [periodMargin=0] - The margin of error for the period value in minutes.
   *
   * @returns {number[]} - An array of satellite IDs that are in a similar orbit to the given satellite.
   */
  static findObjsByOrbit(satData: SatObject[], sat: SatObject, incMargin: Degrees = <Degrees>2, raanMargin: Degrees = <Degrees>5, periodMargin: Minutes = <Minutes>0): number[] {
    const INC_MARGIN = incMargin * DEG2RAD;
    const RAAN_MARGIN = raanMargin * DEG2RAD;

    const maxPeriod = periodMargin === 0 ? sat.period * 1.1 : sat.period + periodMargin;
    const minPeriod = periodMargin === 0 ? sat.period * 0.9 : sat.period - periodMargin;

    const maxInclination = sat.inclination + INC_MARGIN;
    const minInclination = sat.inclination - INC_MARGIN;
    let maxRaan = sat.raan + RAAN_MARGIN;
    let minRaan = sat.raan - RAAN_MARGIN;

    if (sat.raan >= 360 - RAAN_MARGIN) {
      maxRaan -= 360 * DEG2RAD;
    }
    if (sat.raan <= RAAN_MARGIN) {
      minRaan += 360 * DEG2RAD;
    }

    return satData
      .filter((s) => {
        if (s.static) return false;
        if (s.inclination < minInclination || s.inclination > maxInclination) return false;
        if (sat.raan > 360 - RAAN_MARGIN || sat.raan < RAAN_MARGIN) {
          if (s.raan > maxRaan && s.raan < minRaan) return false;
        } else {
          if (s.raan < minRaan || s.raan > maxRaan) return false;
        }
        if (s.period < minPeriod || s.period > maxPeriod) return false;
        return true;
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
  static findReentry(satData: SatObject[], numReturns = 100): string[] {
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
   * @param satData - An array of satellite objects to filter.
   * @param regex - The regular expression to match against the satellite object names.
   * @returns An array of satellite objects that match the provided regular expression.
   */
  static objectName(satData: SatObject[], regex: RegExp): SatObject[] {
    return satData.filter((sat) => typeof sat.name === 'string' && sat.name.match(regex));
  }

  /**
   * Filters the given array of SatObject by the 'shape' property.
   *
   * @static
   * @param {SatObject[]} satData - The array of SatObject to filter.
   * @param {string} text - The value to match against the 'shape' property of each SatObject.
   * @returns {SatObject[]} The filtered array of SatObject.
   */
  static shape(satData: SatObject[], text: string): SatObject[] {
    return this.byProp(satData, 'shape', text);
  }

  /**
   * Filters the given array of satellite data based on the provided object type.
   *
   * @param satData - An array of satellite objects to be filtered.
   * @param objType - The type of space object to filter the satellite data by.
   * @returns An array of satellite objects that match the provided object type.
   */
  static type(satData: SatObject[], objType: SpaceObjectType): SatObject[] {
    return satData.filter((sat) => sat.type === objType);
  }

  /**
   * Filters the satellite data based on the year.
   *
   * @static
   * @param {SatObject[]} satData - An array of satellite data objects.
   * @param {number} yr - The year to filter the satellite data by.
   * @returns {SatObject[]} An array of satellite data objects that were launched in the specified year.
   */
  static year(satData: SatObject[], yr: number): SatObject[] {
    return satData.filter((sat) => {
      const tleYear = sat?.TLE1?.substring(9, 11) || '-1';
      return parseInt(tleYear) == yr;
    });
  }

  /**
   * Filters the satellite data based on the year.
   *
   * This function filters the given satellite data array and returns only those satellites that were launched in the given year or less.
   * The function uses the Cospar value in TLE1 property of the satellite data to determine the launch year of the satellite.
   *
   * @param satData - An array of SatObject instances representing the satellite data.
   * @param yr - The year to filter the satellite data by. Only satellites launched in this year or earlier will be included in the returned array.
   *
   * @returns An array of SatObject instances representing the satellites that were launched in the given year or earlier.
   */
  static yearOrLess(satData: SatObject[], yr: number) {
    return satData.filter((sat) => {
      if (sat.source === CatalogSource.VIMPEL) return false;

      // 2007 Fengyun 1C ASAT Event
      if (sat.intlDes?.includes('1999-025')) {
        if (sat.intlDes !== '1999-025A') {
          if (yr >= 7 && yr < 57) {
            return true;
          } else {
            return false;
          }
        }
      }

      // 2009 Cosmos Iridium Collision
      if (sat.intlDes?.includes('1993-036') || sat.intlDes?.includes('1997-051')) {
        if (sat.intlDes !== '1993-036A' && sat.intlDes !== '1997-051A') {
          if (yr >= 9 && yr < 57) {
            return true;
          } else {
            return false;
          }
        }
      }

      // 2021 Cosmos 2542 ASAT Event
      if (sat.intlDes?.includes('1982-092')) {
        if (sat.intlDes !== '1982-092A' && sat.intlDes !== '1982-092B') {
          if (yr >= 21 && yr < 57) {
            return true;
          } else {
            return false;
          }
        }
      }

      const tleYear = sat?.TLE1?.substring(9, 11) || '-1';
      if (yr >= 57 && yr < 100) {
        return parseInt(tleYear) <= yr && parseInt(tleYear) >= 57;
      } else {
        return parseInt(tleYear) <= yr || parseInt(tleYear) >= 57;
      }
    });
  }

  /**
   * Filters the given array of SatObject by a specific property and value.
   *
   * @param {SatObject[]} satData - The array of SatObject to filter.
   * @param {string} prop - The property of SatObject to filter by.
   * @param {string} text - The value of the property to match for filtering.
   *
   * @returns {SatObject[]} The filtered array of SatObject where the specified property equals the given text.
   */
  private static byProp(satData: SatObject[], prop: string, text: string): SatObject[] {
    return satData.filter((sat) => sat[prop] === text);
  }
}
