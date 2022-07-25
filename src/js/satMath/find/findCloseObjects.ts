import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { EciPos, SatObject } from '@app/js/api/keepTrackTypes';
import { getUnique } from '@app/js/lib/helpers';
import { getEci } from '../calc/getEci';

let searchStrCache: string;
export const findCloseObjects = () => {
  if (searchStrCache) return searchStrCache;
  const { satSet } = keepTrackApi.programs;
  const searchRadius = 50; // km

  let csoList = [];
  let satList = <SatObject[]>[];

  // Loop through all the satellites
  for (let i = 0; i < satSet.orbitalSats; i++) {
    // Get the satellite
    const sat = satSet.getSat(i);
    // Avoid unnecessary errors
    if (typeof sat.TLE1 == 'undefined') continue;
    // Only look at satellites in LEO
    // if (sat.apogee > 5556) continue;
    // Find where the satellite is right now
    if (typeof sat.position === 'undefined') {
      sat.position = <EciPos>getEci(sat, new Date()).position || { x: 0, y: 0, z: 0 };
    }
    // If it fails, skip it
    if (isNaN(sat.position.x) || isNaN(sat.position.y) || isNaN(sat.position.z)) continue;
    if (sat.position === { x: 0, y: 0, z: 0 }) continue;
    // Add the satellite to the list
    satList.push(sat);
  }

  // Remove duplicates
  satList = getUnique(satList);

  // Sort satList by position.x property
  satList.sort((a, b) => a.position.x - b.position.x);

  // Loop through all the satellites with valid positions
  let i = 0;
  const satListLen = satList.length;
  for (i = 0; i < satListLen; i++) {
    const sat1 = satList[i];
    const pos1 = sat1.position;

    // Calculate the area around the satellite
    const posXmin = pos1.x - searchRadius;
    const posXmax = pos1.x + searchRadius;
    const posYmin = pos1.y - searchRadius;
    const posYmax = pos1.y + searchRadius;
    const posZmin = pos1.z - searchRadius;
    const posZmax = pos1.z + searchRadius;

    // Loop through the list again
    let j = 0;
    for (j = Math.max(0, i - 200); j < satListLen; j++) {
      const sat2 = satList[j]; // Get the second satellite
      if (sat1 == sat2) continue; // Skip the same satellite
      const pos2 = sat2.position; // Get the second satellite's position

      // Satellites are in order of x position so once we exceed the maxX, we can stop
      if (pos2.x > posXmax) break;
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

  // Dont need to do this math more than once
  searchStrCache = searchStr;
  return searchStr; // csoListUnique;
};
