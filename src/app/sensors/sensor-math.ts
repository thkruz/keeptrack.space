import { SatPassTimes } from '@app/engine/core/interfaces';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import {
  BaseObject,
  DEG2RAD,
  Degrees,
  DetailedSatellite,
  DetailedSensor,
  EciVec3,
  EpochUTC,
  Kilometers,
  MINUTES_PER_DAY,
  RfSensor,
  SatelliteRecord,
  Sgp4,
  SpaceObjectType,
  Sun,
  TAU,
  calcGmst,
  ecfRad2rae,
  eci2ecf,
  eci2lla,
  lla2eci,
} from '@ootk/src/main';
import { dateFormat } from '../../engine/utils/dateFormat';
import { SatMath, SunStatus } from '../analysis/sat-math';
import { ServiceLocator } from '@app/engine/core/service-locator';

export enum TearrType {
  RISE,
  SET,
  MAX_EL,
  RISE_AND_MAX_EL,
  MAX_EL_AND_SET,
  UNKNOWN,
}

export type TearrData = {
  objName?: string;
  rng: Kilometers | null;
  az: Degrees | null;
  el: Degrees | null;
  time: string;
  type?: TearrType;
  inView?: boolean;
  alt?: Kilometers;
  lat?: Degrees;
  lon?: Degrees;
  visible?: boolean;
};

export class SensorMath {
  /**
   * @deprecated - Use ootk instead
   */
  static getTearData(now: Date, satrec: SatelliteRecord, sensors: DetailedSensor[], isRiseSetLookangles = false, isMaxElFound = false): TearrData {
    // TODO: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
    const sensor = sensors[0];

    const aer = SatMath.getRae(now, satrec, sensor);
    const isInFOV = SatMath.checkIsInView(sensor, aer);

    if (aer.az && aer.el && aer.rng && isInFOV) {
      if (isRiseSetLookangles) {
        // Previous Pass to Calculate first line of coverage
        const now1 = new Date();

        now1.setTime(Number(now) - 1000);
        const aerPrevious = SatMath.getRae(now1, satrec, sensor);
        const isInFOVPrevious = SatMath.checkIsInView(sensor, aerPrevious);
        let isRise = false;

        // Is in FOV and Wasn't Last Time so First Line of Coverage
        if (!isInFOVPrevious) {
          isRise = true;
        }
        // Next Pass to Calculate Last line of coverage
        now1.setTime(Number(now) + 1000);
        const aerNext = SatMath.getRae(now1, satrec, sensor);
        const isInFOVNext = SatMath.checkIsInView(sensor, aerNext);

        // if elevation is going down then it is a peak
        if (!isMaxElFound && aerNext.el && aerNext.el < aer.el) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: aer.rng,
            az: aer.az,
            el: aer.el,
            type: isRise ? TearrType.RISE_AND_MAX_EL : TearrType.MAX_EL,
            inView: isInFOV,
            objName: sensor.objName,
          };
        } else if (isRise) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: aer.rng,
            az: aer.az,
            el: aer.el,
            type: TearrType.RISE,
            inView: isInFOV,
            objName: sensor.objName,
          };
        }

        // Is in FOV and Wont Be Next Time so Last Line of Coverage
        if (!isInFOVNext) {
          return {
            time: dateFormat(now, 'isoDateTime', true),
            rng: aer.rng,
            az: aer.az,
            el: aer.el,
            type: !isMaxElFound ? TearrType.MAX_EL_AND_SET : TearrType.SET,
            inView: isInFOV,
            objName: sensor.objName,
          };
        }


        return {
          time: '',
          rng: null,
          az: null,
          el: null,
          inView: isInFOV,
          objName: sensor.objName,
        };
      }

      // If not rise set look angles just return all the data
      return {
        time: dateFormat(now, 'isoDateTime', true),
        rng: aer.rng,
        az: aer.az,
        el: aer.el,
        inView: isInFOV,
        objName: sensor.objName,
      };
    }

    // If not in FOV return no time to filter out
    return {
      time: '',
      rng: aer.rng,
      az: aer.az,
      el: aer.el,
      inView: isInFOV,
      objName: sensor.objName,
    };
  }

  /**
   * @deprecated - Use ootk instead
   */
  static getTearr(sat: DetailedSatellite, sensors: DetailedSensor[], propTime?: Date): TearrData {
    const timeManagerInstance = ServiceLocator.getTimeManager();

    const tearr = <TearrData>{}; // Most current TEARR data that is set in satellite object and returned.

    const sensorManagerInstance = ServiceLocator.getSensorManager();

    sensors = sensorManagerInstance.verifySensors(sensors);
    // TODO: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
    const sensor = sensors[0];

    // Set default timing settings. These will be changed to find look angles at different times in future.
    const now = typeof propTime !== 'undefined' ? propTime : timeManagerInstance.simulationTimeObj;
    const { m, gmst } = SatMath.calculateTimeVariables(now, sat.satrec);
    const positionEci = <EciVec3>Sgp4.propagate(sat.satrec, m!).position;

    if (!positionEci) {
      errorManagerInstance.debug(`No ECI position for ${sat.satrec.satnum} at ${now}`);
      tearr.alt = <Kilometers>0;
      tearr.lon = <Degrees>0;
      tearr.lat = <Degrees>0;
      tearr.az = <Degrees>0;
      tearr.el = <Degrees>0;
      tearr.rng = <Kilometers>0;
    }

    try {
      const gpos = eci2lla(positionEci, gmst);

      tearr.alt = gpos.alt;
      tearr.lon = gpos.lon;
      tearr.lat = gpos.lat;
      const positionEcf = eci2ecf(positionEci, gmst);
      const lookAngles = ecfRad2rae(sensor.llaRad(), positionEcf);

      tearr.az = lookAngles.az;
      tearr.el = lookAngles.el;
      tearr.rng = lookAngles.rng;
    } catch /* istanbul ignore next */ {
      tearr.alt = <Kilometers>0;
      tearr.lon = <Degrees>0;
      tearr.lat = <Degrees>0;
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

  static distanceString(hoverSat: BaseObject, secondaryObj?: DetailedSensor | DetailedSatellite): string {
    // Sanity Check
    if (!hoverSat || !secondaryObj) {
      return '';
    }

    /*
     * Get Objects
     * const catalogManagerInstance = ServiceLocator.getCatalogManager();
     * hoverSat = catalogManagerInstance.getObject(hoverSat.id);
     * selectedSat = catalogManagerInstance.getObject(selectedSat.id);
     */

    // Validate Objects
    if (!secondaryObj || !hoverSat) {
      return '';
    }
    if (secondaryObj.type === SpaceObjectType.STAR || hoverSat.type === SpaceObjectType.STAR) {
      return '';
    }

    // Calculate Distance
    const distanceApart = SatMath.distance(hoverSat.position, secondaryObj.position).toFixed(2);

    // Calculate if same beam
    let sameBeamStr = '';

    try {
      const sensorManagerInstance = ServiceLocator.getSensorManager();

      if (sensorManagerInstance.currentTEARR?.inView) {
        const sensorManagerInstance = ServiceLocator.getSensorManager();

        const firstSensor = sensorManagerInstance.currentSensors[0];

        if (firstSensor instanceof RfSensor && parseFloat(distanceApart) < sensorManagerInstance.currentTEARR.rng! * Math.sin(DEG2RAD * firstSensor.beamwidth)) {
          if (sensorManagerInstance.currentTEARR.rng! < sensorManagerInstance.currentSensors[0].maxRng && sensorManagerInstance.currentTEARR.rng! > 0) {
            sameBeamStr = ' (Within One Beam)';
          }
        }
      }
    } catch {
      // Intentionally Blank
    }

    return `<br />Range: ${distanceApart} km${sameBeamStr}`;
  }

  static velocityString(hoverSat: BaseObject, secondaryObj?: DetailedSensor | DetailedSatellite): string {
    // Sanity Check
    if (!hoverSat || !secondaryObj) {
      return '';
    }

    // Validate Objects
    if (!secondaryObj || !hoverSat) {
      return '';
    }
    if (secondaryObj.type === SpaceObjectType.STAR || hoverSat.type === SpaceObjectType.STAR) {
      return '';
    }

    // Calculate Velocities
    const velApart = SatMath.velocity(hoverSat.velocity, secondaryObj.velocity).toFixed(3);

    return `<br />Relative velocity: ${velApart} km/s`;
  }

  static getSunTimes(sat: DetailedSatellite, sensors?: DetailedSensor[], searchLength = 2, interval = 30) {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    if (!sat.satrec) {
      errorManagerInstance.debug('No satellite record');

      return;
    }

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
      const eci = <EciVec3>Sgp4.propagate(sat.satrec, m!).position;

      if (!eci) {
        errorManagerInstance.debug(`No ECI position for ${sat.satrec?.satnum} at ${now}`);
        continue;
      }

      const distX = (sunX - eci.x) ** 2;
      const distY = (sunY - eci.y) ** 2;
      const distZ = (sunZ - eci.z) ** 2;
      const dist = Math.sqrt(distX + distY + distZ);

      const positionEcf = eci2ecf(eci, gmst);
      const lookAngles = ecfRad2rae(sensor.llaRad(), positionEcf);
      const { az, el, rng } = lookAngles;

      if (sensor.minAz > sensor.maxAz) {
        if (
          ((az >= sensor.minAz || az <= sensor.maxAz) && el >= sensor.minEl && el <= sensor.maxEl && rng <= sensor.maxRng && rng >= sensor.minRng) ||
          ((az >= sensor.minAz2! || az <= sensor.maxAz2!) && el >= sensor.minEl2! && el <= sensor.maxEl2! && rng <= sensor.maxRng2! && rng >= sensor.minRng2!)
        ) {
          if (dist < minDistanceApart) {
            minDistanceApart = dist;
          }
        }
      } else if (
        (az >= sensor.minAz && az <= sensor.maxAz && el >= sensor.minEl && el <= sensor.maxEl && rng <= sensor.maxRng && rng >= sensor.minRng) ||
        (az >= sensor.minAz2! && az <= sensor.maxAz2! && el >= sensor.minEl2! && el <= sensor.maxEl2! && rng <= sensor.maxRng2! && rng >= sensor.minRng2!)
      ) {
        if (dist < minDistanceApart) {
          minDistanceApart = dist;
        }
      }
    }
  }

  static nextNpasses(sat: DetailedSatellite, sensors: DetailedSensor[], searchLength: number, interval: number, numPasses: number): Date[] {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    sensors = sensorManagerInstance.verifySensors(sensors);
    // TODO: Instead of doing the first sensor this should return an array of TEARRs for all sensors.
    const sensor = sensors[0];

    // If length and interval not set try to use defaults
    searchLength = searchLength || 2;
    interval = interval || 30;
    numPasses = numPasses || 1;

    const passTimesArray = [] as Date[]; // Array of pass times in UTC
    let offset = 0;

    const orbitalPeriod = MINUTES_PER_DAY / ((sat.satrec.no * MINUTES_PER_DAY) / TAU); // Seconds in a day divided by mean motion

    for (let i = 0; i < searchLength * 24 * 60 * 60; i += interval) {
      /*
       * 5second Looks
       * Only pass a maximum of N passes
       */
      if (passTimesArray.length >= numPasses) {
        return passTimesArray;
      }

      offset = i * 1000; // Offset in seconds (msec * 1000)
      const now = timeManagerInstance.getOffsetTimeObj(offset);
      const aer = SatMath.getRae(now, sat.satrec, sensor, true);

      const isInFOV = SatMath.checkIsInView(sensor, aer);

      if (isInFOV) {
        passTimesArray.push(now);
        // Jump 3/4th to the next orbit
        i += orbitalPeriod * 60 * 0.75; // NOSONAR
      }
    }

    return passTimesArray;
  }

  static nextpass(sat: DetailedSatellite, sensors?: DetailedSensor[], searchLength?: number, interval?: number) {
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const sensorManagerInstance = ServiceLocator.getSensorManager();

    sensors = sensorManagerInstance.verifySensors(sensors);
    // Loop through sensors looking for in view times
    const inViewTime = [] as Date[];
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
    }

    return `No Passes in ${searchLength} Days`;

  }

  static nextpassList(satArray: DetailedSatellite[], sensorArray: DetailedSensor[], interval?: number, days = 7): SatPassTimes[] {
    const nextPassArray: SatPassTimes[] = [];
    const nextNPassesCount = settingsManager ? settingsManager.nextNPassesCount : 1;

    for (const sat of satArray) {
      const passes = SensorMath.nextNpasses(sat, sensorArray, days, interval || 30, nextNPassesCount); // Only do 1 day looks

      for (const pass of passes) {
        nextPassArray.push({
          sat,
          time: pass,
        });
      }
    }

    return nextPassArray;
  }

  static checkIfVisibleForOptical(sat: DetailedSatellite, sensor: DetailedSensor, now: Date): boolean {
    const { gmst } = calcGmst(now);
    const sunPos = Sun.position(EpochUTC.fromDateTime(now));
    const sensorPos = lla2eci(sensor.llaRad(), gmst);

    sensor.position = sensorPos;
    const stationInSun = SatMath.calculateIsInSun(sensor, sunPos);
    const satInSun = SatMath.calculateIsInSun(sat, sunPos);

    // For optical sensors: check if the station is in darkness (umbral/penumbral) and the satellite is in sunlight - this means the satellite is visible
    return (stationInSun === SunStatus.UMBRAL || stationInSun === SunStatus.PENUMBRAL) && satInSun === SunStatus.SUN;
  }
}
