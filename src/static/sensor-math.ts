import { SatObject, SatPassTimes, SensorObject } from '@app/js/interfaces';
import { Degrees, EciVec3, Kilometers, Radians, SatelliteRecord, Sgp4, SpaceObjectType, Transforms } from 'ootk';
import { keepTrackApi } from '../keepTrackApi';
import { DEG2RAD, MINUTES_PER_DAY, RAD2DEG, TAU } from '../lib/constants';
import { dateFormat } from '../lib/dateFormat';
import { UpdateSatManager } from '../plugins/update-select-box/update-select-box';
import { SatMath } from './sat-math';

export type TearrData = {
  objName: string;
  rng: Kilometers;
  az: Degrees;
  el: Degrees;
  time: string;
  inView?: boolean;
  alt?: Kilometers;
  lat?: Radians;
  lon?: Radians;
};

export class SensorMath {
  static getTearData(now: Date, satrec: SatelliteRecord, sensors: SensorObject[], isRiseSetLookangles = false): TearrData {
    // TODO: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
    const sensor = sensors[0];

    let aer = SatMath.getRae(now, satrec, sensor);
    const isInFOV = SatMath.checkIsInView(sensor, aer);

    if (isInFOV) {
      if (isRiseSetLookangles) {
        // Previous Pass to Calculate first line of coverage
        const now1 = new Date();
        now1.setTime(Number(now) - 1000);
        let aer1 = SatMath.getRae(now1, satrec, sensor);
        let isInFOV1 = SatMath.checkIsInView(sensor, aer1);

        // Is in FOV and Wasn't Last Time so First Line of Coverage
        if (!isInFOV1) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: aer.rng,
            az: aer.az,
            el: aer.el,
            inView: isInFOV,
            objName: sensor.objName,
          };
        } else {
          // Next Pass to Calculate Last line of coverage
          now1.setTime(Number(now) + 1000);
          aer1 = SatMath.getRae(now1, satrec, sensor);
          isInFOV1 = SatMath.checkIsInView(sensor, aer1);

          // Is in FOV and Wont Be Next Time so Last Line of Coverage
          if (!isInFOV1) {
            return {
              time: dateFormat(now, 'isoDateTime', true),
              rng: aer.rng,
              az: aer.az,
              el: aer.el,
              inView: isInFOV,
              objName: sensor.objName,
            };
          }
        }
        return {
          time: '',
          rng: <Kilometers>null,
          az: <Degrees>null,
          el: <Degrees>null,
          inView: isInFOV,
          objName: sensor.objName,
        };
      }
      return {
        time: dateFormat(now, 'isoDateTime', true),
        rng: aer.rng,
        az: aer.az,
        el: aer.el,
        inView: isInFOV,
        objName: sensor.objName,
      };
    }
    return {
      time: '',
      rng: aer.rng,
      az: aer.az,
      el: aer.el,
      inView: isInFOV,
      objName: sensor.objName,
    };
  }

  static getTearr(sat: SatObject, sensors: SensorObject[], propTime?: Date): TearrData {
    const timeManagerInstance = keepTrackApi.getTimeManager();

    const tearr = <TearrData>{}; // Most current TEARR data that is set in satellite object and returned.

    const sensorManagerInstance = keepTrackApi.getSensorManager();
    sensors = sensorManagerInstance.verifySensors(sensors);
    // TODO: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
    const sensor = sensors[0];

    // Set default timing settings. These will be changed to find look angles at different times in future.
    const now = typeof propTime !== 'undefined' ? propTime : timeManagerInstance.simulationTimeObj;
    const { m, gmst } = SatMath.calculateTimeVariables(now, sat.satrec);
    let positionEci = <EciVec3>Sgp4.propagate(sat.satrec, m).position;
    if (!positionEci) {
      console.error('No ECI position for', sat.satrec.satnum, 'at', now);
      tearr.alt = <Kilometers>0;
      tearr.lon = <Radians>0;
      tearr.lat = <Radians>0;
      tearr.az = <Degrees>0;
      tearr.el = <Degrees>0;
      tearr.rng = <Kilometers>0;
    }

    try {
      let gpos = Transforms.eci2lla(positionEci, gmst);
      tearr.alt = <Kilometers>gpos.alt;
      tearr.lon = gpos.lon;
      tearr.lat = gpos.lat;
      let positionEcf = Transforms.eci2ecf(positionEci, gmst);
      let lookAngles = Transforms.ecf2rae(sensor.observerGd, positionEcf);
      tearr.az = <Degrees>(lookAngles.az * RAD2DEG);
      tearr.el = <Degrees>(lookAngles.el * RAD2DEG);
      tearr.rng = <Kilometers>lookAngles.rng;
    } catch /* istanbul ignore next */ {
      tearr.alt = <Kilometers>0;
      tearr.lon = <Radians>0;
      tearr.lat = <Radians>0;
      tearr.az = <Degrees>0;
      tearr.el = <Degrees>0;
      tearr.rng = <Kilometers>0;
    }

    tearr.inView = SatMath.checkIsInView(sensor, {
      az: tearr.az,
      el: tearr.el,
      rng: tearr.rng,
    });
    return tearr;
  }

  static distanceString(hoverSat: SatObject, selectedSat: SatObject): string {
    // Sanity Check
    if (hoverSat == null || selectedSat == null) return '';

    // Get Objects
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    hoverSat = catalogManagerInstance.getSat(hoverSat.id);
    selectedSat = catalogManagerInstance.getSat(selectedSat.id);

    // Validate Objects
    if (selectedSat == null || hoverSat == null) return '';
    if (selectedSat.type === SpaceObjectType.STAR || hoverSat.type === SpaceObjectType.STAR) return '';

    // Calculate Distance
    const distanceApart = SatMath.distance(hoverSat.position, selectedSat.position).toFixed(0);

    // Calculate if same beam
    let sameBeamStr = '';
    try {
      const updateSelectBoxPlugin = <UpdateSatManager>keepTrackApi.getPlugin(UpdateSatManager);
      if (updateSelectBoxPlugin.currentTEARR?.inView) {
        const sensorManagerInstance = keepTrackApi.getSensorManager();

        if (parseFloat(distanceApart) < updateSelectBoxPlugin.currentTEARR?.rng * Math.sin(DEG2RAD * sensorManagerInstance.currentSensors[0].beamwidth)) {
          if (updateSelectBoxPlugin.currentTEARR?.rng < sensorManagerInstance.currentSensors[0].obsmaxrange && updateSelectBoxPlugin.currentTEARR?.rng > 0) {
            sameBeamStr = ' (Within One Beam)';
          }
        }
      }
    } catch {
      // Intentionally Blank
    }

    return '<br />Range: ' + distanceApart + ' km' + sameBeamStr;
  }

  static getSunTimes(sat: SatObject, sensors?: SensorObject[], searchLength = 2, interval = 30) {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    sensors = sensorManagerInstance.verifySensors(sensors);
    // TOOD: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
    const sensor = sensors[0];

    let minDistanceApart = 100000000000; // Arbitrarily large number

    // var minDistTime;
    let offset = 0;
    for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
      // 5second Looks
      offset = i * 1000; // Offset in seconds (msec * 1000)
      const now = timeManagerInstance.getOffsetTimeObj(offset);
      const { m, j, gmst } = SatMath.calculateTimeVariables(now, sat.satrec);

      const [sunX, sunY, sunZ] = SatMath.getSunDirection(j);
      const eci = <EciVec3>Sgp4.propagate(sat.satrec, m).position;
      if (!eci) {
        console.debug('No ECI position for', sat.name, 'at', now);
        continue;
      }

      const distX = Math.pow(sunX - eci.x, 2);
      const distY = Math.pow(sunY - eci.y, 2);
      const distZ = Math.pow(sunZ - eci.z, 2);
      const dist = Math.sqrt(distX + distY + distZ);

      const positionEcf = Transforms.eci2ecf(eci, gmst);
      const lookAngles = Transforms.ecf2rae(sensor.observerGd, positionEcf);

      const az = lookAngles.az * RAD2DEG;
      const el = lookAngles.el * RAD2DEG;
      const rng = lookAngles.rng;

      if (sensor.obsminaz > sensor.obsmaxaz) {
        if (
          ((az >= sensor.obsminaz || az <= sensor.obsmaxaz) && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
          ((az >= sensor.obsminaz2 || az <= sensor.obsmaxaz2) && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
        ) {
          if (dist < minDistanceApart) {
            minDistanceApart = dist;
          }
        }
      } else {
        if (
          (az >= sensor.obsminaz && az <= sensor.obsmaxaz && el >= sensor.obsminel && el <= sensor.obsmaxel && rng <= sensor.obsmaxrange && rng >= sensor.obsminrange) ||
          (az >= sensor.obsminaz2 && az <= sensor.obsmaxaz2 && el >= sensor.obsminel2 && el <= sensor.obsmaxel2 && rng <= sensor.obsmaxrange2 && rng >= sensor.obsminrange2)
        ) {
          if (dist < minDistanceApart) {
            minDistanceApart = dist;
          }
        }
      }
    }
  }

  static nextNpasses(sat: SatObject, sensors: SensorObject[], searchLength: number, interval: number, numPasses: number): Date[] {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    sensors = sensorManagerInstance.verifySensors(sensors);
    // TODO: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
    const sensor = sensors[0];

    // If length and interval not set try to use defaults
    searchLength = searchLength || 2;
    interval = interval || 30;
    numPasses = numPasses || 1;

    let passTimesArray = [];
    let offset = 0;

    const orbitalPeriod = MINUTES_PER_DAY / ((sat.satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion
    for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
      // 5second Looks
      // Only pass a maximum of N passes
      if (passTimesArray.length >= numPasses) {
        return passTimesArray;
      }

      offset = i * 1000; // Offset in seconds (msec * 1000)
      let now = timeManagerInstance.getOffsetTimeObj(offset);
      let aer = SatMath.getRae(now, sat.satrec, sensor, true);

      let isInFOV = SatMath.checkIsInView(sensor, aer);
      if (isInFOV) {
        passTimesArray.push(now);
        // Jump 3/4th to the next orbit
        i = i + orbitalPeriod * 60 * 0.75; // NOSONAR
      }
    }
    return passTimesArray;
  }

  static nextpass(sat: SatObject, sensors?: SensorObject[], searchLength?: number, interval?: number) {
    const timeManagerInstance = keepTrackApi.getTimeManager();
    const sensorManagerInstance = keepTrackApi.getSensorManager();

    sensors = sensorManagerInstance.verifySensors(sensors);
    // Loop through sensors looking for in view times
    const inViewTime = [];
    // If length and interval not set try to use defaults
    searchLength ??= 2;
    interval ??= 30;

    for (const sensor of sensors) {
      let offset = 0;
      for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
        // 5second Looks
        offset = i * 1000; // Offset in seconds (msec * 1000)
        const now = timeManagerInstance.getOffsetTimeObj(offset);
        const aer = SatMath.getRae(now, sat.satrec, sensor, true);

        const isInFOV = SatMath.checkIsInView(sensor, aer);
        if (isInFOV) {
          inViewTime.push(now);
          break;
        }
      }
    }
    // If there are in view times find the earlierst and return it formatted
    if (inViewTime.length > 0) {
      inViewTime.sort((a, b) => a.getTime() - b.getTime());
      return dateFormat(inViewTime[0], 'isoDateTime', true);
    } else {
      return 'No Passes in ' + searchLength + ' Days';
    }
  }

  static nextpassList(satArray: SatObject[], interval?: number, days = 7): SatPassTimes[] {
    let nextPassArray: SatPassTimes[] = [];
    const nextNPassesCount = settingsManager ? settingsManager.nextNPassesCount : 1;
    for (const sat of satArray) {
      const passes = SensorMath.nextNpasses(sat, null, days, interval || 30, nextNPassesCount); // Only do 1 day looks
      for (const pass of passes) {
        nextPassArray.push({
          sat: sat,
          time: pass,
        });
      }
    }
    return nextPassArray;
  }
}
