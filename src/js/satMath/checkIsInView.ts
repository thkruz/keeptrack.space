import { SensorObject } from '../api/keepTrackTypes';

// TODO: Future Idea
/*
// satellite.createManeuverAnalyst = (satId, incVariation, meanmoVariation, rascVariation) => {
//   const { timeManager, satSet } = keepTrackApi.programs;
//   // TODO This needs rewrote from scratch to bypass the satcruncher
//   var mainsat = satSet.getSat(satId);
//   var origsat = mainsat;
//   // Launch Points are the Satellites Current Location
//   var TEARR = mainsat.getTEARR();
//   var launchLat, launchLon, alt;
//   launchLat = satellite.degreesLat(TEARR.lat);
//   launchLon = satellite.degreesLong(TEARR.lon);
//   alt = TEARR.alt;
//   var upOrDown = mainsat.getDirection();
//   var currentEpoch = satellite.currentEpoch(timeManager.simulationTimeObj);
//   mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);
//   var TLEs;
//   // Ignore argument of perigee for round orbits OPTIMIZE
//   if (mainsat.apogee - mainsat.perigee < 300) {
//     TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.simulationTimeObj);
//   } else {
//     TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.simulationTimeObj, alt);
//   }
//   var TLE1 = TLEs[0];
//   var TLE2 = TLEs[1];
//   //   var breakupSearchString = '';
//   satId = satSet.getIdFromObjNum(80000);
//   var sat = satSet.getSat(satId);
//   sat = origsat;
//   let iTLE1 = '1 ' + 80000 + TLE1.substr(7);
//   let iTLEs;
//   // Ignore argument of perigee for round orbits OPTIMIZE
//   if (sat.apogee - sat.perigee < 300) {
//     iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.simulationTimeObj, 0, rascVariation);
//   } else {
//     iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.simulationTimeObj, alt, rascVariation);
//   }
//   iTLE1 = iTLEs[0];
//   let iTLE2 = iTLEs[1];
//   // For the first 30
//   var inc = TLE2.substr(8, 8);
//   inc = (parseFloat(inc) + incVariation).toPrecision(7);
//   inc = inc.split('.');
//   inc[0] = inc[0].substr(-3, 3);
//   if (inc[1]) {
//     inc[1] = inc[1].substr(0, 4);
//   } else {
//     inc[1] = '0000';
//   }
//   inc = (inc[0] + '.' + inc[1]).toString();
//   inc = stringPad.padEmpty(inc, 8);
//   // For the second 30
//   var meanmo: any = iTLE2.substr(52, 10);
//   meanmo = (parseFloat(meanmo) * meanmoVariation).toPrecision(10);
//   // meanmo = parseFloat(meanmo - (0.005 / 10) + (0.01 * ((meanmoIterat + 1) / 10))).toPrecision(10);
//   meanmo = meanmo.split('.');
//   meanmo[0] = meanmo[0].substr(-2, 2);
//   if (meanmo[1]) {
//     meanmo[1] = meanmo[1].substr(0, 8);
//   } else {
//     meanmo[1] = '00000000';
//   }
//   meanmo = (meanmo[0] + '.' + meanmo[1]).toString();
//   iTLE2 = '2 ' + 80000 + ' ' + inc + ' ' + iTLE2.substr(17, 35) + meanmo + iTLE2.substr(63);
//   sat = satSet.getSat(satId);
//   sat.TLE1 = iTLE1;
//   sat.TLE2 = iTLE2;
//   sat.active = true;
//   if (satellite.altitudeCheck(iTLE1, iTLE2, timeManager.simulationTimeObj) > 1) {
//     satSet.satCruncher.postMessage({
//       type: 'satEdit',
//       id: satId,
//       TLE1: iTLE1,
//       TLE2: iTLE2,
//     });
//     // TODO: This belongs in main or uiManager
//     // orbitManager.updateOrbitBuffer(satId, true, iTLE1, iTLE2);
//   } else {
//     console.debug('Breakup Generator Failed');
//     return false;
//   }
//   // breakupSearchString += mainsat.sccNum + ',Analyst Sat';
//   // uiManager.doSearch(breakupSearchString);
//   return true;
// };
// satellite.findChangeOrbitToDock = (sat, sat2, propOffset, propLength) => {
//   const { satSet } = keepTrackApi.programs;
//   let closestInc = 0;
//   let closestRaan = 0;
//   let closestMeanMo = 1;
//   let minDistArray = {
//     dist: 1000000,
//   };
//   for (let incTemp = -1; incTemp <= 1; incTemp++) {
//     for (let raanTemp = -1; raanTemp <= 1; raanTemp++) {
//       for (let meanMoTemp = 0.95; meanMoTemp <= 1.05; meanMoTemp += 0.05) {
//         if (satellite.createManeuverAnalyst(sat.id, incTemp, meanMoTemp, raanTemp)) {
//           let minDistArrayTemp = satellite.findClosestApproachTime(satSet.getSatFromObjNum(80000), sat2, propOffset, propLength);
//           if (minDistArrayTemp.dist < minDistArray.dist) {
//             minDistArray = minDistArrayTemp;
//             // let closestInc = incTemp;
//             // let closestRaan = raanTemp;
//             // let closestMeanMo = meanMoTemp;
//             // console.log(`Distance: ${minDistArray.dist}`);
//             // console.log(`Time: ${minDistArray.time}`);
//             // console.log(satSet.getSatFromObjNum(80000));
//           }
//         }
//       }
//     }
//   }

//   console.log(`${sat.inclination + closestInc}`);
//   console.log(`${sat.raan + closestRaan}`);
//   console.log(`${sat.meanMotion * closestMeanMo}`);
//   satellite.createManeuverAnalyst(sat.id, closestInc, closestMeanMo, closestRaan);
// };
*/
export const checkIsInView = (sensor: SensorObject, rae: { rng: number; az: number; el: number }): boolean => {
  const { az, el, rng } = rae;

  if (sensor.obsminaz > sensor.obsmaxaz) {
    if (
      ((az >= sensor.obsminaz || az <= sensor.obsmaxaz) && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
      ((az >= sensor.obsminaz2 || az <= sensor.obsmaxaz2) && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
    ) {
      return true;
    } else {
      return false;
    }
  } else {
    if (
      (az >= sensor.obsminaz && az <= sensor.obsmaxaz && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
      (az >= sensor.obsminaz2 && az <= sensor.obsmaxaz2 && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
    ) {
      return true;
    } else {
      return false;
    }
  }
};
