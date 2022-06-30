import { DEG2RAD, MINUTES_PER_DAY, TAU } from '@app/js/lib/constants';
import { Sgp4 } from 'ootk';
import { SatRec } from 'satellite.js';
import { keepTrackApi } from '../../api/keepTrackApi';
import { lookanglesRow, SatObject, SensorObject } from '../../api/keepTrackTypes';
import { getRae } from '../calc/getRae';
import { checkIsInView } from '../lookangles/checkIsInView';

export const findBestPass = (sat: SatObject, sensors: SensorObject[]): lookanglesRow[] => {
  const { timeManager, uiManager } = keepTrackApi.programs;

  // Check if there is a sensor
  if (sensors.length <= 0 || !sensors[0] || typeof sensors[0].obsminaz == 'undefined') {
    uiManager.toast(`Sensor's format incorrect. Did you select a sensor first?`, 'critical');
    return [];
  }
  sensors[0].observerGd = {
    // Array to calculate look angles in propagate()
    lat: sensors[0].lat * DEG2RAD,
    lon: sensors[0].lon * DEG2RAD,
    alt: sensors[0].alt,
  };

  // TOOD: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
  const sensor = sensors[0];

  const simulationTime = timeManager.simulationTimeObj;
  let offset = 0;

  var satrec = Sgp4.createSatrec(sat.TLE1, sat.TLE2); // perform and store sat init calcs
  var lookanglesTable = []; // Iniially no rows to the table

  let looksInterval = 5;
  let looksLength = 7;

  // Setup flags for passes
  let score = 0;
  let sAz = <string | null>null;
  let sEl = <string | null>null;
  let srng = <string | null>null;
  let sTime = <Date | null>null;
  let passMinrng = sensor.obsmaxrange; // This is set each look to find minimum rng (start at max rng)
  let passMaxEl = 0;
  let start3 = false;
  let stop3 = false;

  let orbitalPeriod = MINUTES_PER_DAY / ((satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

  const _propagateBestPass = (now: Date, satrecIn: SatRec): lookanglesRow => {
    let aer = getRae(now, satrecIn, sensor);
    let isInFOV = checkIsInView(sensor, aer);

    if (isInFOV) {
      // Previous Pass to Calculate first line of coverage
      const now1 = timeManager.getOffsetTimeObj(offset - looksInterval * 1000, simulationTime);
      let aer1 = getRae(now1, satrecIn, sensor);

      let isInFOV1 = checkIsInView(sensor, aer1);
      if (!isInFOV1) {
        // if it starts around 3
        if (aer.el <= 3.5) {
          start3 = true;
        }

        // First Line of Coverage
        sTime = now;
        sAz = aer.az.toFixed(0);
        sEl = aer.el.toFixed(1);
        srng = aer.rng.toFixed(0);
      } else {
        // Next Pass to Calculate Last line of coverage
        let _now1 = timeManager.getOffsetTimeObj(offset + looksInterval * 1000, simulationTime);
        aer1 = getRae(_now1, satrecIn, sensor);

        isInFOV1 = checkIsInView(sensor, aer1);
        if (!isInFOV1) {
          // if it stops around 3
          stop3 = aer.el <= 3.5;

          // Skip pass if satellite is in track right now
          if (sTime == null) {
            return {
              sortTime: null,
              scc: null,
              score: null,
              startDate: null,
              startTime: null,
              startAz: null,
              startEl: null,
              startrng: null,
              stopDate: null,
              stopTime: null,
              stopAz: null,
              stopEl: null,
              stoprng: null,
              tic: null,
              minrng: null,
              passMaxEl: null,
            };
          }

          score = Math.min((((now.getTime() - sTime.getTime()) / 1000 / 60) * 10) / 8, 10); // 8 minute pass is max score
          let elScore = Math.min((passMaxEl / 50) * 10, 10); // 50 el or above is max score

          // elScore -= Math.max((passMaxEl - 50) / 5, 0); // subtract points for being over 50 el
          elScore *= start3 && stop3 ? 2 : 1; // Double points for start and stop at 3
          score += elScore;
          score += Math.min((10 * 750) / passMinrng, 10); // 750 or less is max score

          // score -= Math.max((750 - passMinrng) / 10, 0); // subtract points for being closer than 750
          let tic = 0;
          tic = (now.getTime() - sTime.getTime()) / 1000 || 0;

          // Last Line of Coverage
          return {
            sortTime: sTime.getTime(),
            scc: satrecIn.satnum,
            score: score,
            startDate: sTime,
            startTime: sTime,
            startAz: sAz,
            startEl: sEl,
            startrng: srng,
            stopDate: now,
            stopTime: now,
            stopAz: aer.az.toFixed(0),
            stopEl: aer.el.toFixed(1),
            stoprng: aer.rng.toFixed(0),
            tic: tic,
            minrng: passMinrng.toFixed(0),
            passMaxEl: passMaxEl.toFixed(1),
          };
        }
      }
      // Do this for any pass in coverage
      if (passMaxEl < aer.el) passMaxEl = aer.el;
      if (passMinrng > aer.rng) passMinrng = aer.rng;
    }
    return {
      sortTime: null,
      scc: null,
      score: null,
      startDate: null,
      startTime: null,
      startAz: null,
      startEl: null,
      startrng: null,
      stopDate: null,
      stopTime: null,
      stopAz: null,
      stopEl: null,
      stoprng: null,
      tic: null,
      minrng: null,
      passMaxEl: null,
    };
  };

  for (let i = 0; i < looksLength * 24 * 60 * 60; i += looksInterval) {
    // lookanglesInterval in seconds
    offset = i * 1000; // Offset in seconds (msec * 1000)
    const now = timeManager.getOffsetTimeObj(offset, simulationTime);
    if (lookanglesTable.length <= 5000) {
      // Maximum of 1500 lines in the look angles table
      const _lookanglesRow = _propagateBestPass(now, satrec);
      // If data came back...
      if (_lookanglesRow.score !== null) {
        lookanglesTable.push(_lookanglesRow); // Update the table with looks for this 5 second chunk and then increase table counter by 1

        // Reset flags for next pass
        score = 0;
        sAz = null;
        sEl = null;
        srng = null;
        sTime = null;
        passMinrng = sensor.obsmaxrange; // This is set each look to find minimum rng
        passMaxEl = 0;
        start3 = false;
        stop3 = false;
        // Jump 3/4th to the next orbit
        i = i + orbitalPeriod * 60 * 0.75; // NOSONAR
      }
    }
  }

  return lookanglesTable;
};
