import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { getUnique } from '@app/js/lib/helpers';
import { Sgp4 } from 'ootk';
import { getEci } from '../calc/getEci';

export const findCloseObjects = () => {
  const { satSet } = keepTrackApi.programs;
  const searchRadius = 50; // km

  let csoList = [];
  let satList = <SatObject[]>[];

  // Loop through all the satellites
  for (let i = 0; i < satSet.numSats; i++) {
    // Get the satellite
    const sat = satSet.getSat(i);
    // Avoid unnecessary errors
    if (typeof sat.TLE1 == 'undefined') continue;
    // Only look at satellites in LEO
    if (sat.apogee > 5556) continue;
    // Find where the satellite is right now
    sat.satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs)
    sat.position = getEci(sat, new Date()).position;
    // If it fails, skip it
    if (sat.position === { x: 0, y: 0, z: 0 }) continue;
    // Add the satellite to the list
    satList.push(sat);
  }

  // Remove duplicates
  satList = getUnique(satList);

  // Loop through all the satellites with valid positions
  for (let i = 0; i < satList.length; i++) {
    let sat1 = satList[i];
    let pos1 = sat1.position;

    // Calculate the area around the satellite
    let posXmin = pos1.x - searchRadius;
    let posXmax = pos1.x + searchRadius;
    let posYmin = pos1.y - searchRadius;
    let posYmax = pos1.y + searchRadius;
    let posZmin = pos1.z - searchRadius;
    let posZmax = pos1.z + searchRadius;

    // Loop through the list again
    for (let j = 0; j < satList.length; j++) {
      // Get the second satellite
      let sat2 = satList[j];
      // Skip the same satellite
      if (sat1 == sat2) continue;
      // Get the second satellite's position
      let pos2 = sat2.position;
      // Check to see if the second satellite is in the search area
      if (pos2.x < posXmax && pos2.x > posXmin && pos2.y < posYmax && pos2.y > posYmin && pos2.z < posZmax && pos2.z > posZmin) {
        // Add the second satellite to the list if it is close
        csoList.push({ sat1: sat1, sat2: sat2 });
      }
    }
  }

  let csoListUnique = getUnique(csoList);

  const csoStrArr = []; // Clear CSO List

  // Loop through the possible CSOs
  for (let i = 0; i < csoListUnique.length; i++) {
    // Calculate the first CSO's position 30 minutes later
    let sat = csoListUnique[i].sat1;
    let eci = getEci(sat, new Date(Date.now() + 1000 * 60 * 30));
    if (eci.position === { x: 0, y: 0, z: 0 }) continue;
    csoListUnique[i].sat1.position = eci.position;

    // Calculate the second CSO's position 30 minutes later
    sat = csoListUnique[i].sat2;
    eci = getEci(sat, new Date(Date.now() + 1000 * 60 * 30));
    if (eci.position === { x: 0, y: 0, z: 0 }) continue;
    sat.position = eci.position;
    csoListUnique[i].sat2.position = eci.position;
  }

  // Loop through the CSOs
  for (let i = 0; i < csoListUnique.length; i++) {
    // Check the first CSO
    let sat1 = csoListUnique[i].sat1;
    let pos1 = sat1.position;
    if (typeof pos1 == 'undefined') continue;

    // Calculate the area around the CSO
    let posXmin = pos1.x - searchRadius;
    let posXmax = pos1.x + searchRadius;
    let posYmin = pos1.y - searchRadius;
    let posYmax = pos1.y + searchRadius;
    let posZmin = pos1.z - searchRadius;
    let posZmax = pos1.z + searchRadius;

    // Get the second CSO object
    let sat2 = csoListUnique[i].sat2;
    let pos2 = sat2.position;
    if (typeof pos2 == 'undefined') continue;

    // If it is still in the search area, add it to the list
    if (pos2.x < posXmax && pos2.x > posXmin && pos2.y < posYmax && pos2.y > posYmin && pos2.z < posZmax && pos2.z > posZmin) {
      csoStrArr.push(sat1.sccNum);
      csoStrArr.push(sat2.sccNum);
    }
  }

  // Generate the search string
  const csoListUniqueArr = Array.from(new Set(csoStrArr));
  let searchStr = '';
  for (let i = 0; i < csoListUniqueArr.length; i++) {
    if (i == csoListUniqueArr.length - 1) {
      searchStr += csoListUniqueArr[i];
    } else {
      searchStr += csoListUniqueArr[i] + ',';
    }
  }

  return searchStr; // csoListUnique;
};
