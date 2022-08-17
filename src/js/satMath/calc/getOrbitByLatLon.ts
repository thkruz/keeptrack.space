import { SatObject } from '@app/js/api/keepTrackTypes';
import { RAD2DEG } from '@app/js/lib/constants';
import { stringPad } from '@app/js/lib/helpers';
import { EciVec3, SatelliteRecord } from 'ootk';
import { satellite } from '../satMath';
import { calculateTimeVariables } from './calculateTimeVariables';

enum PropagationOptions {
  MeanAnomaly = 1,
  RightAscensionOfAscendingNode = 2,
  ArgumentOfPerigee = 3,
}

enum PropagationResults {
  Near = 0,
  Success = 1,
  Error = 2,
  Far = 3,
}

// prettier-ignore
export const getOrbitByLatLon = (
  sat: SatObject,
  goalLat: number,
  goalLon: number,
  goalDirection: 'N' | 'S',
  now: Date,
  goalAlt?: number,
  raanOffset?: number
): [string, string] => { // NOSONAR
  let newMeana: string = null;
  let newArgPer: string = null;
  goalAlt = goalAlt || null;
  raanOffset = raanOffset || 0;

  let lastLat: number = null;
  let currentDirection: 'N' | 'S';

  // Parse some values used in creating new TLEs
  const intl = sat.TLE1.substr(9, 8);
  const epochyr = sat.TLE1.substr(18, 2);
  const epochday = sat.TLE1.substr(20, 12);
  const meanmo = sat.TLE2.substr(52, 11);
  const inc = stringPad.pad0((sat.inclination * RAD2DEG).toFixed(4), 8);
  const ecen = sat.eccentricity.toFixed(7).substr(2, 7);
  // Disregarding the first and second derivatives of mean motion
  // Just keep whatever was in the original TLE
  const TLE1Ending = sat.TLE1.substr(32, 39);

  // //////////////////////////////////////////////////////////////////////////////
  // //////////////////////////////////////////////////////////////////////////////
  // These four functions get called during the bottom loop

  /**
   * Rotating the mean anomaly adjusts the latitude (and longitude) of the satellite.
   * @param {number} meana - This is the mean anomaly (where it is along the orbital plane)
   * @returns {PropagationResults} This number tells the main loop what to do next
   */
  const meanaCalc = (meana: number) => {
    let satrec = sat.satrec || <SatelliteRecord>satellite.twoline2satrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs

    meana = meana / 10;
    const meanaStr = stringPad.pad0(meana.toFixed(4), 8);

    const raan = stringPad.pad0((sat.raan * RAD2DEG).toFixed(4), 8);

    const argPe = newArgPer ? stringPad.pad0((parseFloat(newArgPer) / 10).toFixed(4), 8) : stringPad.pad0((sat.argPe * RAD2DEG).toFixed(4), 8);

    const _TLE1Ending = sat.TLE1.substr(32, 39);
    const TLE1 = '1 ' + sat.sccNum + 'U ' + intl + ' ' + epochyr + epochday + _TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
    const TLE2 = '2 ' + sat.sccNum + ' ' + inc + ' ' + raan + ' ' + ecen + ' ' + argPe + ' ' + meanaStr + ' ' + meanmo + '    10';

    satrec = satellite.twoline2satrec(TLE1, TLE2);
    const results = getOrbitByLatLonPropagate(now, satrec, PropagationOptions.MeanAnomaly);
    if (results === PropagationResults.Success) {
      sat.TLE1 = TLE1;
      sat.TLE2 = TLE2;
      newMeana = meanaStr;
    }
    return results;
  };

  /**
   * We need to adjust the argument of perigee to align a HEO orbit with the desired launch location
   * @param {string} argPe - This is the guess for the argument of perigee (where the lowest part of the orbital plane is)
   * @returns {PropagationResults} This number tells the main loop what to do next
   */
  const argPerCalc = (argPe: string): PropagationResults => {
    const meana = newMeana;
    const raan = stringPad.pad0((sat.raan * RAD2DEG).toFixed(4), 8);
    argPe = stringPad.pad0((parseFloat(argPe) / 10).toFixed(4), 8);

    // Create the new TLEs
    const TLE1 = '1 ' + sat.sccNum + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending;
    const TLE2 = '2 ' + sat.sccNum + ' ' + inc + ' ' + raan + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

    // Calculate the orbit
    const satrec = <SatelliteRecord>satellite.twoline2satrec(TLE1, TLE2);

    // Check the orbit
    const results = getOrbitByLatLonPropagate(now, satrec, PropagationOptions.ArgumentOfPerigee);
    if (results === PropagationResults.Success) {
      sat.TLE1 = TLE1;
      sat.TLE2 = TLE2;
      newArgPer = argPe;
    }
    return results;
  };

  /**
   * Rotating the mean anomaly adjusts the latitude (and longitude) of the satellite.
   * @param {number} raan - This is the right ascension of the ascending node (where it rises above the equator relative to a specific star)
   * @param {number} raanOffsetIn - This allows the main thread to send a guess of the raan
   * @returns {PropagationResults} This number tells the main loop what to do next
   */
  const raanCalc = (raan: number, raanOffsetIn: number): PropagationResults => {
    const origRaan = raan;
    raan = raan / 100;
    raan = raan > 360 ? raan - 360 : raan;

    const raanStr = stringPad.pad0(raan.toFixed(4), 8);

    // If we adjusted argPe use the new one - otherwise use the old one
    const argPe = newArgPer ? stringPad.pad0((parseFloat(newArgPer) / 10).toFixed(4), 8) : stringPad.pad0((sat.argPe * RAD2DEG).toFixed(4), 8);

    const TLE1 = '1 ' + sat.sccNum + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
    const TLE2 = '2 ' + sat.sccNum + ' ' + inc + ' ' + raanStr + ' ' + ecen + ' ' + argPe + ' ' + newMeana + ' ' + meanmo + '    10';

    const satrec = <SatelliteRecord>satellite.twoline2satrec(TLE1, TLE2);
    const results = getOrbitByLatLonPropagate(now, satrec, PropagationOptions.RightAscensionOfAscendingNode);

    // If we have a good guess of the raan, we can use it, but need to apply the offset to the original raan
    if (results === PropagationResults.Success) {
      raan = origRaan / 100 + raanOffsetIn;
      raan = raan > 360 ? raan - 360 : raan;
      raan = raan < 0 ? raan + 360 : raan;

      const _raanStr = stringPad.pad0(raan.toFixed(4), 8);

      const _TLE2 = '2 ' + sat.sccNum + ' ' + inc + ' ' + _raanStr + ' ' + ecen + ' ' + argPe + ' ' + newMeana + ' ' + meanmo + '    10';

      sat.TLE1 = TLE1;
      sat.TLE2 = _TLE2;
    }
    return results;
  };

  const getOrbitByLatLonPropagate = (nowIn: Date, satrec: SatelliteRecord, type: PropagationOptions): PropagationResults => {
    const { m, gmst } = calculateTimeVariables(nowIn, satrec);
    const positionEci = <EciVec3>satellite.sgp4(satrec, m).position;
    if (isNaN(positionEci.x) || isNaN(positionEci.y) || isNaN(positionEci.z)) {
      return PropagationResults.Error;
    }
    const gpos = satellite.eciToGeodetic(positionEci, gmst);

    let { lat, lon, alt } = gpos;
    lat = satellite.degreesLat(lat);
    lon = satellite.degreesLong(lon);

    // Set it the first time
    lastLat = lastLat ? lastLat : lat;

    if (type === PropagationOptions.MeanAnomaly) {
      if (lat === lastLat) {
        return 0; // Not enough movement, skip this
      }

      if (lat > lastLat) {
        currentDirection = 'N';
      }
      if (lat < lastLat) {
        currentDirection = 'S';
      }

      lastLat = lat;
    }

    if (type === PropagationOptions.MeanAnomaly && lat > goalLat - 0.15 && lat < goalLat + 0.15) {
      return PropagationResults.Success;
    }

    if (type === PropagationOptions.RightAscensionOfAscendingNode && lon > goalLon - 0.15 && lon < goalLon + 0.15) {
      return PropagationResults.Success;
    }

    if (type === PropagationOptions.ArgumentOfPerigee && alt > goalAlt - 30 && alt < goalAlt + 30) {
      return PropagationResults.Success;
    }

    // If current latitude greater than 11 degrees off rotate meanA faster
    if (type === PropagationOptions.MeanAnomaly && !(lat > goalLat - 11 && lat < goalLat + 11)) {
      return PropagationResults.Far;
    }

    // If current longitude greater than 11 degrees off rotate raan faster
    if (type === PropagationOptions.RightAscensionOfAscendingNode && !(lon > goalLon - 11 && lon < goalLon + 11)) {
      return PropagationResults.Far;
    }

    // If current altitude greater than 100 km off rotate augPerigee faster
    if (type === PropagationOptions.ArgumentOfPerigee && (alt < goalAlt - 100 || alt > goalAlt + 100)) {
      return PropagationResults.Far;
    }

    return PropagationResults.Near;
  };
  // //////////////////////////////////////////////////////////////////////////////
  // //////////////////////////////////////////////////////////////////////////////

  let argPerCalcResults: PropagationResults;
  let meanACalcResults: PropagationResults;
  let raanCalcResults: PropagationResults;
  /** Rotate Mean Anomaly 0.1 Degree at a Time for Up To 520 Degrees */
  for (let i = 0; i < 520 * 10; i += 1) {
    meanACalcResults = meanaCalc(i);
    if (meanACalcResults === PropagationResults.Success) {
      if (currentDirection !== goalDirection) {
        // Move 2 Degrees ahead in the orbit to prevent being close on the next lattiude check
        // This happens when the goal latitude is near the poles
        i += 20; // NOSONAR
      } else {
        break; // Stop changing the Mean Anomaly
      }
    }
    if (meanACalcResults === PropagationResults.Far) {
      i += 100; // NOSONAR
    }
  }

  if (meanACalcResults !== PropagationResults.Success) {
    return ['Error', 'Failed to find a solution for Mean Anomaly'];
  }

  // ===== Argument of Perigee Loop =====
  // Applies to eccentric orbits
  if (goalAlt) {
    // Don't Bother Unless Specifically Requested
    meanACalcResults = 0; // Reset meanACalcResults
    for (let i = 0; i < 360 * 10; i += 1) {
      /** Rotate ArgPer 0.1 Degree at a Time for Up To 400 Degrees */
      argPerCalcResults = argPerCalc(i.toString());
      if (argPerCalcResults === PropagationResults.Success) {
        // DEBUG:
        // console.log('Found Correct Alt');
        if (meanACalcResults === PropagationResults.Success) {
          // DEBUG:
          // console.log('Found Correct Lat');

          // DEBUG:
          // console.log('Up Or Down: ' + upOrDown);
          if (currentDirection === goalDirection) {
            // If Object is moving in the goal direction (upOrDown)
            break; // Stop changing ArgPer
          }
        } else {
          // DEBUG:
          // console.log('Found Wrong Lat');
        }
      } else {
        // DEBUG:
        // console.log('Failed Arg of Per Calc');
      }
      if (argPerCalcResults === PropagationResults.Far) {
        // Change ArgPer faster
        i += 5 * 10; // NOSONAR
      }
      if (argPerCalcResults === PropagationResults.Error) {
        return ['Error', 'Failed to find a solution for Argument of Perigee'];
      }

      // ===== Mean Anomaly Loop =====
      for (let j = 0; j < 520 * 10; j += 1) {
        /** Rotate Mean Anomaly 0.1 Degree at a Time for Up To 400 Degrees */
        meanACalcResults = meanaCalc(j);
        if (meanACalcResults === PropagationResults.Success) {
          if (currentDirection !== goalDirection) {
            // If Object is moving opposite of the goal direction (upOrDown)
            // Move 2 Degrees ahead in the orbit to prevent being close on the next lattiude check
            j = j + 20; // NOSONAR
          } else {
            break; // Stop changing the Mean Anomaly
          }
        }
        j = meanACalcResults === PropagationResults.Far ? j + 100 : j; // NOSONAR
        if (meanACalcResults === PropagationResults.Error) {
          return ['Error', ''];
        }
      }
    }

    if (argPerCalcResults !== PropagationResults.Success) {
      return ['Error', 'Failed to find a solution for Argument of Perigee'];
    }
  }

  // ===== Right Ascension Loop =====
  for (let i = 0; i < 520 * 100; i += 1) {
    // 520 degress in 0.01 increments TODO More precise?
    raanCalcResults = raanCalc(i, raanOffset);
    if (raanCalcResults === PropagationResults.Success) {
      break;
    }
    if (raanCalcResults === PropagationResults.Far) {
      i += 10 * 100; // NOSONAR
    }
  }

  if (raanCalcResults !== PropagationResults.Success) {
    return ['Error', 'Failed to find a solution for Right Ascension of Ascending Node'];
  }

  return [sat.TLE1, sat.TLE2];
};
