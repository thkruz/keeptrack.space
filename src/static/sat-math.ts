/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * satMath.ts an expansion library for the Orbital Object Toolkit (OOTK)
 * providing tailored functions for calculating orbital data.
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

import { keepTrackApi } from '@app/keepTrackApi';
import { vec3 } from 'gl-matrix';
import numeric from 'numeric';
import {
  BaseObject,
  DEG2RAD,
  Degrees,
  DetailedSatellite,
  DetailedSensor,
  EciVec3,
  GreenwichMeanSiderealTime,
  Kilometers,
  KilometersPerSecond,
  MILLISECONDS_TO_DAYS,
  MINUTES_PER_DAY,
  PosVel,
  RAD2DEG,
  RIC,
  Radians,
  SatelliteRecord,
  Sensor,
  Sgp4,
  SpaceObjectType,
  StateVectorSgp4,
  TAU,
  ecf2eci,
  ecfRad2rae,
  eci2ecf,
  eci2lla,
  eci2rae,
} from 'ootk';
import { EciArr3 } from '../interfaces';
import { DISTANCE_TO_SUN, RADIUS_OF_EARTH, RADIUS_OF_SUN } from '../lib/constants';
import { jday, lon2yaw } from '../lib/transforms';
import { Sun } from '../singletons/draw-manager/sun';
import { errorManagerInstance } from '../singletons/errorManager';
import { CoordinateTransforms } from './coordinate-transforms';

if (!global) {
  window._numeric = numeric; // numeric will break if it is not available globally
}

export type StringifiedNumber = `${number}.${number}`;

export enum SunStatus {
  UNKNOWN = -1,
  UMBRAL = 0,
  PENUMBRAL = 1,
  SUN = 2,
}

export abstract class SatMath {
  /**
   * Converts magnitude to decibels.
   * @param magnitude The magnitude to convert.
   */
  static mag2db(magnitude: number) {
    return 10 * Math.log10(magnitude);
  }

  static estimateRcs(length: number, width: number, height: number, shape: string): number {
    // If shape contains the word "sphere", then use the sphere RCS formula
    if (shape.toLowerCase().includes('sphere')) {
      // RCS=πr^2
      const rcs = Math.PI * (length / 2) ** 2;


      return (Math.sqrt(rcs) * 3) / 2;
    }

    // If shape contains the word "cylinder", then use the cylinder RCS formula
    if (shape.toLowerCase().includes('cyl')) {
      // RCS=length*2r
      const minRcs = length * 2 * (width / 2);
      // RCS=πr^2
      const maxRcs = Math.PI * (length / 2) ** 2;
      const rcs = (minRcs + maxRcs) / 2;


      return (Math.sqrt(rcs) * 3) / 2;
    }

    // If shape contains the word "cone", then use the cone RCS formula
    if (shape.toLowerCase().includes('cone')) {
      // PI * r ** 2 / 2
      const rcs = (Math.PI * (width / 2) ** 2) / 2;


      return (Math.sqrt(rcs) * 3) / 2;
    }

    // If shape contains the word "hexagon", then use the hexagon RCS formula
    if (shape.toLowerCase().includes('hex')) {
      const minLength = Math.min(length * width, length * height, width * height);
      const minRcs = (3 * ((Math.sqrt(3) / 2) * minLength ** 2)) / 4;
      const maxLength = Math.max(length * width, length * height, width * height);
      const maxRcs = (3 * ((Math.sqrt(3) / 2) * maxLength ** 2)) / 2;
      const rcs = (minRcs + maxRcs) / 2;


      return (Math.sqrt(rcs) * 3) / 2;
    }

    // Assume everything else is a cube

    /*
     * If shape contains the word "cube", then use the cube RCS formula
     * if (shape.toLowerCase().includes('cube') || shape.toLowerCase().includes('box')) {
     */
    const minRcs = Math.min(length * width, length * height, width * height);
    const maxRcs = Math.max(length * width, length * height, width * height);
    const rcs = (minRcs + maxRcs) / 2;


    return (Math.sqrt(rcs) * 3) / 2;
    // }
  }

  /**
   * Calculates the altitude of a satellite at a given time using its TLE and the current time.
   * @param tle1 The first line of the TLE.
   * @param tle2 The second line of the TLE.
   * @param now The current time.
   * @returns The altitude of the satellite in kilometers.
   */
  static altitudeCheck(satrec: SatelliteRecord, now: Date): Kilometers {
    const { m, gmst } = SatMath.calculateTimeVariables(now, satrec) as {
      gmst: GreenwichMeanSiderealTime;
      m: number;
    };

    let positionEci: EciVec3;

    try {
      const stateVector = Sgp4.propagate(satrec, m);

      positionEci = <EciVec3>stateVector.position;
      if (!stateVector || !positionEci) {
        errorManagerInstance.log(`No ECI position for ${satrec.satnum} at ${now}`);

        return <Kilometers>0;
      }
    } catch (e) {
      errorManagerInstance.log(`Error propagating satrec at ${now}`);

      return <Kilometers>0;
    }

    return SatMath.getAlt(positionEci, gmst);
  }

  /**
   * Calculates whether a satellite is in the sun's shadow (umbra), in the penumbra, or in sunlight.
   * @param obj The satellite object.
   * @param sunECI The position of the sun in ECI coordinates.
   * @returns A value indicating whether the satellite is in the sun's shadow (umbra), in the penumbra, or in sunlight.
   */
  static calculateIsInSun(obj: BaseObject | StateVectorSgp4, sunECI: EciVec3): SunStatus {
    let x: Kilometers;
    let y: Kilometers;
    let z: Kilometers;

    if (!obj) {
      return SunStatus.UNKNOWN;
    }


    if (obj instanceof BaseObject) {
      if (!obj?.position) {
        return SunStatus.UNKNOWN;
      }
      if (!sunECI) {
        return SunStatus.UNKNOWN;
      }

      x = obj.position.x;
      y = obj.position.y;
      z = obj.position.z;

    } else if ((typeof obj.position === 'boolean' || (
      obj.position &&
      typeof obj.position.x === 'number' &&
      typeof obj.position.y === 'number' &&
      typeof obj.position.z === 'number'
    )) &&
      (typeof obj.velocity === 'boolean' || (
        obj.velocity &&
        typeof obj.velocity.x === 'number' &&
        typeof obj.velocity.y === 'number' &&
        typeof obj.velocity.z === 'number'
      )) && typeof obj.position !== 'boolean') {

      x = obj.position.x as Kilometers;
      y = obj.position.y as Kilometers;
      z = obj.position.z as Kilometers;
    } else {
      return SunStatus.UNKNOWN;
    }

    /*
     * NOTE: Code is mashed to save memory when used on the whole catalog
     * Position needs to be relative to satellite NOT ECI
     * const distSatEarthX = Math.pow(-sat.position.x, 2);
     * const distSatEarthY = Math.pow(-sat.position.y, 2);
     * const distSatEarthZ = Math.pow(-sat.position.z, 2);
     * const distSatEarth = Math.sqrt(distSatEarthX + distSatEarthY + distSatEarthZ);
     * const semiDiamEarth = Math.asin(RADIUS_OF_EARTH/distSatEarth) * RAD2DEG;
     */
    const semiDiamEarth = Math.asin(RADIUS_OF_EARTH / Math.sqrt((-x) ** 2 + (-y) ** 2 + (-z) ** 2)) * RAD2DEG;

    /*
     * Position needs to be relative to satellite NOT ECI
     * const distSatSunX = Math.pow(-sat.position.x + sunECI.x, 2);
     * const distSatSunY = Math.pow(-sat.position.y + sunECI.y, 2);
     * const distSatSunZ = Math.pow(-sat.position.z + sunECI.z, 2);
     * const distSatSun = Math.sqrt(distSatSunX + distSatSunY + distSatSunZ);
     * const semiDiamSun = Math.asin(RADIUS_OF_SUN/distSatSun) * RAD2DEG;
     */
    const semiDiamSun =
      Math.asin(RADIUS_OF_SUN / Math.sqrt((-x + sunECI.x) ** 2 + (-y + sunECI.y) ** 2 + (-z + sunECI.z) ** 2)) * RAD2DEG;

    // Angle between earth and sun
    const theta = Math.acos(
      <number>numeric.dot([-x, -y, -z], [-x + sunECI.x, -y + sunECI.y, -z + sunECI.z]) /
      (Math.sqrt((-x) ** 2 + (-y) ** 2 + (-z) ** 2) * Math.sqrt((-x + sunECI.x) ** 2 + (-y + sunECI.y) ** 2 + (-z + sunECI.z) ** 2))) * RAD2DEG;

    if (semiDiamEarth > semiDiamSun && theta < semiDiamEarth - semiDiamSun) {
      return SunStatus.UMBRAL;
    }

    if (semiDiamSun > semiDiamEarth || theta < semiDiamSun - semiDiamEarth || (Math.abs(semiDiamEarth - semiDiamSun) < theta && theta < semiDiamEarth + semiDiamSun)) {
      return SunStatus.PENUMBRAL;
    }

    return SunStatus.SUN;
  }

  /**
   * Calculates the GMST, M, and J variables for a given date and optional satellite record.
   * @param now The date for which to calculate the variables.
   * @param satrec Optional satellite record to calculate the M variable.
   * @returns An object containing the GMST, M, and J variables.
   */
  static calculateTimeVariables(now: Date, satrec?: SatelliteRecord): { gmst: GreenwichMeanSiderealTime; m: number | null; j: number } {
    const j =
      jday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()) +
      now.getUTCMilliseconds() * MILLISECONDS_TO_DAYS;
    const gmst = Sgp4.gstime(j);

    const m = satrec ? (j - satrec.jdsatepoch) * MINUTES_PER_DAY : null;

    return { gmst, m, j };
  }

  /**
   * Calculates the nadir yaw angle of a satellite at a given date.
   * @param sat - The satellite object.
   * @param selectedDate - The selected date.
   * @returns The nadir yaw angle in radians.
   */
  static calculateNadirYaw(position: EciVec3, selectedDate: Date): Radians {
    const gmst = SatMath.calculateTimeVariables(selectedDate).gmst;


    return <Radians>(lon2yaw(eci2lla(position, gmst).lon, selectedDate) + 180 * DEG2RAD);
  }

  /**
   * Calculates the visual magnitude of a satellite as seen from a sensor at a given time.
   * @param sat The satellite object.
   * @param sensor The sensor object.
   * @param propTime The time at which to calculate the visual magnitude.
   * @param sun The Sun object.
   * @returns The visual magnitude of the satellite.
   */
  static calculateVisMag(sat: DetailedSatellite, sensor: Sensor, propTime: Date, sun: Sun): number {
    let rae: {
      az: Degrees | null;
      el: Degrees | null;
      rng: Kilometers | null;
    };

    if (sat.position.x > 0) {
      rae = eci2rae(propTime, sat.position, sensor as unknown as Sensor);
    } else {
      rae = SatMath.getRae(propTime, sat.satrec, sensor);
    }

    const distanceToSatellite = rae.rng; // This is in KM

    if (!distanceToSatellite) {
      throw new Error('Distance to satellite is null');
    }

    const phaseAngle = Math.acos(
      <number>numeric.dot([-sat.position.x, -sat.position.y, -sat.position.z], [sat.position.x + sun.eci.x, -sat.position.y + sun.eci.y, -sat.position.z + sun.eci.z]) /
      (Math.sqrt((-sat.position.x) ** 2 + (-sat.position.y) ** 2 + (-sat.position.z) ** 2) *
        Math.sqrt((-sat.position.x + sun.eci.x) ** 2 + (-sat.position.y + sun.eci.y) ** 2 + (-sat.position.z + sun.eci.z) ** 2)),
    );

    // The object is likely eclipsing the sun
    if (isNaN(phaseAngle)) {
      return 30;
    }

    /*
     * standard magnitude
     *  DEBUG:
     *  if (!sat.vmag) console.debug('No standard magnitude in the database defaulting to 8');
     */
    const intrinsicMagnitude = sat.vmag || 8;

    const term2 = 5.0 * Math.log10(distanceToSatellite / 1000);

    const arg = Math.sin(phaseAngle) + (Math.PI - phaseAngle) * Math.cos(phaseAngle);
    const term3 = -2.5 * Math.log10(arg);

    return intrinsicMagnitude + term2 + term3;
  }

  /**
   * Checks if a satellite is within the field of view of a sensor.
   * @param sensor The sensor object.
   * @param rae An object containing the range, azimuth, and elevation of the satellite in RAE coordinates.
   * @returns A boolean indicating whether the satellite is within the field of view of the sensor.
   */
  static checkIsInView(sensor: Sensor, rae: { rng: Kilometers; az: Degrees; el: Degrees }): boolean {
    const { az, el, rng } = rae;

    if (sensor.minAz > sensor.maxAz) {
      if (
        ((az >= sensor.minAz || az <= sensor.maxAz) && el >= sensor.minEl && el <= sensor.maxEl && rng <= sensor.maxRng && rng >= sensor.minRng) ||
        ((az >= (sensor.minAz2 as number) || az <= (sensor.maxAz2 as number)) && el >= (sensor.minEl2 as number) &&
          el <= (sensor.maxEl2 as number) && rng <= (sensor.maxRng2 as number) && rng >= (sensor.minRng2 as number))
      ) {
        return true;
      }

      return false;

    }
    if (
      (az >= sensor.minAz && az <= sensor.maxAz && el >= sensor.minEl && el <= sensor.maxEl && rng <= sensor.maxRng && rng >= sensor.minRng) ||
      (az >= (sensor.minAz2 as number) && az <= (sensor.maxAz2 as number) && el >= (sensor.minEl2 as number) &&
        el <= (sensor.maxEl2 as number) && rng <= (sensor.maxRng2 as number) && rng >= (sensor.minRng2 as number))
    ) {
      return true;
    }

    return false;


  }

  /**
   * Calculates the distance between two objects in ECI coordinates.
   * @param obj1 The first object's ECI coordinates.
   * @param obj2 The second object's ECI coordinates.
   * @returns The distance between the two objects in kilometers.
   */
  static distance(obj1: EciVec3, obj2: EciVec3): Kilometers {
    return <Kilometers>Math.sqrt((obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2 + (obj1.z - obj2.z) ** 2);
  }

  /**
   * Calculates the velocity between two objects in ECI coordinates.
   * @param obj1 The first object's velocity in ECI coordinates.
   * @param obj2 The second object's velocity in ECI coordinates.
   * @returns The velocity between the two objects in kilometers/s.
   */
  static velocity(obj1: EciVec3<KilometersPerSecond>, obj2: EciVec3<KilometersPerSecond>): KilometersPerSecond {
    return <KilometersPerSecond>Math.sqrt((obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2 + (obj1.z - obj2.z) ** 2);
  }


  /**
   * Finds the closest approach time between two satellites based on their positions and velocities.
   * @param sat1 The first satellite object.
   * @param sat2 The second satellite object.
   * @param propLength The length of time to propagate the satellite positions (in seconds). Defaults to 1 day (1440 * 60 seconds).
   * @returns An object containing the offset time (in milliseconds), the distance between the satellites (in kilometers), and the relative position and velocity vectors in RIC
   * coordinates.
   */
  static findClosestApproachTime(
    sat1: DetailedSatellite,
    sat2: DetailedSatellite,
    propLength?: number,
  ): {
    offset: number;
    dist: number;
    ric: { position: [number, number, number]; velocity: [number, number, number] };
  } {
    let offset = 0;

    propLength ??= 1440 * 60; // 1 Day
    let minDist = 1000000;
    let result = {
      offset: <number | null>null,
      dist: <number | null>null,
      ric: <StateVectorSgp4 | null>null,
    };

    for (let t = 0; t < propLength; t++) {
      offset = t * 1000; // Offset in seconds (msec * 1000)

      const ric = RIC.fromJ2000(sat1.toJ2000(new Date(Date.now() + offset)), sat2.toJ2000(new Date(Date.now() + offset)));

      if (ric.range < minDist && !(ric.position.x === 0 && ric.position.y === 0 && ric.position.z === 0)) {
        minDist = ric.range;
        result = {
          offset,
          dist: ric.range,
          ric: { position: ric.position, velocity: ric.velocity },
        };
      }
    }

    if (result.dist === null) {
      throw new Error('No closest approach found');
    }

    return result as unknown as {
      offset: number;
      dist: number;
      ric: { position: [number, number, number]; velocity: [number, number, number] };
    };
  }

  /**
   * Calculates the altitude of a satellite given its position in ECI coordinates and the Greenwich Mean Sidereal Time (GMST).
   * @param positionEci The position of the satellite in ECI coordinates.
   * @param gmst The Greenwich Mean Sidereal Time (GMST).
   * @returns The altitude of the satellite in kilometers.
   * If the altitude calculation fails, returns 0.
   */
  static getAlt(positionEci: EciVec3, gmst: GreenwichMeanSiderealTime): Kilometers {
    let alt: number;

    try {
      alt = eci2lla(positionEci, gmst).alt;
      if (isNaN(alt)) {
        return <Kilometers>0;
      }
    } catch (e) {
      return <Kilometers>0; // Auto fail the altitude check
    }

    return <Kilometers>alt;
  }

  static estimateRcsUsingHistoricalData(satInput: DetailedSatellite): number | null {
    const historicRcs: number[] = [];
    const catalogManager = keepTrackApi.getCatalogManager();
    const objectCache = catalogManager.objectCache;

    for (const obj of objectCache) {
      if (!obj.isSatellite()) {
        continue;
      }

      const sat = obj as DetailedSatellite;

      if (sat.bus === satInput.bus && sat.bus !== 'Unknown' && sat.rcs && sat.rcs > 0) {
        historicRcs.push(sat.rcs);
        continue;
      }

      if (typeof sat.name !== 'string') {
        continue;
      }

      const name = sat.name.toLowerCase().split(' ')[0];
      const satName = satInput.name.toLowerCase().split(' ')[0];
      const minLength = Math.min(name.length, satName.length);
      const maxLength = Math.max(name.length, satName.length);
      let matchCount = 0;

      for (let i = 0; i < minLength; i++) {
        if (name[i] === satName[i]) {
          matchCount++;
        }
      }

      if (matchCount / maxLength > 0.85 && sat.rcs && sat.rcs > 0) {
        historicRcs.push(sat.rcs);
      }
    }

    if (historicRcs.length === 0) {
      return null;
    }

    return historicRcs.map((rcs_) => rcs_).reduce((a, b) => a + b, 0) / historicRcs.length;
  }

  /**
   * Calculates the azimuth and elevation angles between two satellites based on their positions and velocities.
   * @param sat1 The first satellite object.
   * @param sat2 The second satellite object.
   * @returns An object containing the azimuth and elevation angles between the two satellites.
   * @throws An error if either satellite's position or velocity is undefined.
   */
  static getAngleBetweenTwoSatellites(sat1: DetailedSatellite, sat2: DetailedSatellite): { az: number; el: number } {
    const { position: pos1, velocity: vel1 } = sat1;
    const { position: pos2, velocity: vel2 } = sat2;

    // Check if positions are identical
    if (pos1.x === pos2.x && pos1.y === pos2.y && pos1.z === pos2.z) {
      return { az: 0, el: 0 };
    }

    if (typeof pos1 === 'undefined') {
      throw new Error('Sat1 position is undefined');
    }
    if (typeof pos2 === 'undefined') {
      throw new Error('Sat2 position is undefined');
    }
    if (typeof vel1 === 'undefined') {
      throw new Error('Sat1 velocity is undefined');
    }
    if (typeof vel2 === 'undefined') {
      throw new Error('Sat2 velocity is undefined');
    }

    const r1 = vec3.fromValues(pos1.x, pos1.y, pos1.z);
    const r2 = vec3.fromValues(pos2.x, pos2.y, pos2.z);
    const v1 = vec3.fromValues(vel1.x, vel1.y, vel1.z);
    const v2 = vec3.fromValues(vel2.x, vel2.y, vel2.z);
    const r = vec3.sub(vec3.create(), r1, r2);
    const v = vec3.sub(vec3.create(), v1, v2);
    const rcrossv = vec3.cross(vec3.create(), r, v);
    const rcrossvmag = vec3.length(rcrossv);

    const az = Math.atan2(rcrossv[1], rcrossv[0]) * RAD2DEG;
    const el = Math.asin(rcrossv[2] / rcrossvmag) * RAD2DEG;

    return { az, el };
  }

  /**
   * Calculates the angle between 2 satellites and the Sun
   * @param sat1 The first satellite object.
   * @param sat2 The second satellite object.
   * @param sunVec The sun ECI vector.
   * @returns The sun angle in rad.
   * @throws An error if either satellite's position or velocity is undefined.
   */
  static getAngleBetweenSatellitesAndSun(sat1: DetailedSatellite, sat2: DetailedSatellite, sunVec: EciVec3): number {
    const { position: pos1 } = sat1;
    const { position: pos2 } = sat2;

    // Check if positions are identical
    if (pos1.x === pos2.x && pos1.y === pos2.y && pos1.z === pos2.z) {
      return NaN;
    }
    // Sanity checks
    if (typeof pos1 === 'undefined') {
      throw new Error('Sat1 position is undefined');
    }
    if (typeof pos2 === 'undefined') {
      throw new Error('Sat2 position is undefined');
    }

    // Compute sat to sun vectors
    const sat2ToSun = vec3.fromValues(sunVec.x - pos2.x, sunVec.y - pos2.y, sunVec.z - pos2.z);
    const sat2ToSat1 = vec3.fromValues(pos1.x - pos2.x, pos1.y - pos2.y, pos1.z - pos2.z);

    return vec3.angle(sat2ToSun, sat2ToSat1);
  }

  /**
   * Calculates the direction of a satellite's movement based on its current position and position 5 and 10 seconds in the future.
   * @param sat The satellite object.
   * @param simulationTime The current simulation time.
   * @returns A string indicating the direction of the satellite's movement ('N' for north, 'S' for south, or 'Error' if there was an error in the calculation).
   */
  static getDirection(sat: DetailedSatellite, simulationTime: Date) {
    const gmst = SatMath.calculateTimeVariables(simulationTime).gmst;

    const FIVE_SECONDS = 5000;
    const fiveSecLaterTime = new Date(simulationTime.getTime() + FIVE_SECONDS);
    const fiveSecLaterPos = SatMath.getEci(sat, fiveSecLaterTime).position || { x: <Kilometers>0, y: <Kilometers>0, z: <Kilometers>0 };
    const gmstFiveSecLater = SatMath.calculateTimeVariables(fiveSecLaterTime).gmst;

    if (fiveSecLaterPos) {
      const nowLat = eci2lla(sat.position, gmst).lat;
      const futLat = eci2lla(<EciVec3>fiveSecLaterPos, gmstFiveSecLater).lat;

      if (nowLat < futLat) {
        return 'N';
      }
      if (nowLat > futLat) {
        return 'S';
      }
    }

    const tenSecLaterTime = new Date(simulationTime.getTime() + FIVE_SECONDS * 2);
    const tenSecLaterPos = SatMath.getEci(sat, tenSecLaterTime).position || { x: <Kilometers>0, y: <Kilometers>0, z: <Kilometers>0 };
    const gmstTenSecLater = SatMath.calculateTimeVariables(tenSecLaterTime).gmst;

    if (tenSecLaterPos) {
      const nowLat = eci2lla(sat.position, gmst).lat;
      const futLat = eci2lla(<EciVec3>tenSecLaterPos, gmstTenSecLater).lat;

      if (nowLat < futLat) {
        return 'N';
      }
      if (nowLat > futLat) {
        return 'S';
      }
    }

    errorManagerInstance.log('Sat Direction Calculation Error - By Pole?');

    return 'Error';
  }

  /**
   * Calculates the ECF (Earth Centered Fixed) coordinates for a given number of points along a satellite's current orbit.
   * @param sat The satellite object.
   * @param points The number of points to calculate along the orbit.
   * @param getOffsetTimeObj A function that returns a Date object with the specified offset from the current simulation time.
   * @returns An array of objects containing the ECF coordinates for each point along the orbit.
   */
  static getEcfOfCurrentOrbit(sat: DetailedSatellite, points: number, getOffsetTimeObj: (offset: number) => Date): { x: number; y: number; z: number }[] {
    return SatMath.getOrbitPoints(sat, points, getOffsetTimeObj, (params: { eciPts: EciVec3; angle: number }) => ecf2eci(params.eciPts, params.angle));
  }

  /**
   * Calculates the ECI (Earth Centered Inertial) coordinates for a given number of points along a satellite's current orbit.
   * @param sat The satellite object.
   * @param points The number of points to calculate along the orbit.
   * @param getOffsetTimeObj A function that returns a Date object with the specified offset from the current simulation time.
   * @returns An array of objects containing the ECI coordinates for each point along the orbit.
   */
  static getEciOfCurrentOrbit(sat: DetailedSatellite, points: number, getOffsetTimeObj: (offset: number) => Date): { x: number; y: number; z: number }[] {
    return SatMath.getOrbitPoints(sat, points, getOffsetTimeObj, (params: { eciPts: EciVec3 }) => params.eciPts);
  }

  /**
   * Calculates the latitude, longitude, altitude, and time for a given number of points along a satellite's current orbit.
   * @param sat The satellite object.
   * @param points The number of points to calculate along the orbit.
   * @param getOffsetTimeObj A function that returns a Date object with the specified offset from the current simulation time.
   * @returns An array of objects containing the latitude, longitude, altitude, and time for each point along the orbit.
   */
  static getLlaOfCurrentOrbit(sat: DetailedSatellite, points: number, getOffsetTimeObj: (offset: number) => Date): { lat: number; lon: number; alt: number; time: number }[] {
    return SatMath.getOrbitPoints(sat, points, getOffsetTimeObj, (params: { eciPts: EciVec3; offset: number }) => {
      const now = getOffsetTimeObj(params.offset);
      const { gmst } = SatMath.calculateTimeVariables(now);
      const lla = eci2lla(params.eciPts, gmst);


      return { ...lla, ...{ time: now.getTime() } };
    });
  }

  /**
   * Returns an array of RIC coordinates for a given satellite and a reference satellite over a given number of orbits
   * @param sat The satellite to calculate RIC coordinates for
   * @param sat2 The reference satellite to calculate RIC coordinates relative to
   * @param points The number of RIC coordinates to calculate
   * @param getOffsetTimeObj A function that returns a Date object with the specified offset from the current simulation time
   * @param orbits The number of orbits to calculate RIC coordinates for (default is 1)
   * @returns An array of RIC coordinates for the given satellite and reference satellite
   */
  static getRicOfCurrentOrbit(
    sat: DetailedSatellite,
    sat2: DetailedSatellite,
    points: number,
    getOffsetTimeObj: (offset: number) => Date,
    orbits?: number,
  ): { x: number; y: number; z: number }[] {
    return SatMath.getOrbitPoints(
      sat,
      points,
      getOffsetTimeObj,
      (params: { eciPts: EciVec3; eciPts2: EciVec3; velPts: EciVec3<KilometersPerSecond>; velPts2: EciVec3<KilometersPerSecond>; offset: number }) => {
        const vel1 = {
          total: 0,
          ...params.velPts,
        };
        const vel2 = {
          total: 0,
          ...params.velPts2,
        };

        sat.position = params.eciPts;
        sat.velocity = vel1;
        sat2.position = params.eciPts2;
        sat2.velocity = vel2;
        const ric = CoordinateTransforms.sat2ric(sat, sat2).position;


        return { x: ric[0], y: ric[1], z: ric[2] };
      },
      sat2,
      orbits,
    );
  }

  /**
   * Calculates the points along a satellite's current orbit.
   * @param sat The satellite object.
   * @param points The number of points to calculate along the orbit.
   * @param getOffsetTimeObj A function that returns a Date object with an offset from the current time.
   * @param transformFunc A function that transforms the ECI coordinates to the desired output format.
   * @param sat2 The reference satellite to calculate RIC coordinates relative to
   * @param orbits The number of orbits to calculate coordinates for (default is 1). Mainly used for RIC calculations.
   * @returns An array of objects containing the transformed coordinates for each point along the orbit.
   */
  private static getOrbitPoints<T>(
    sat: DetailedSatellite,
    points: number,
    getOffsetTimeObj: (offset: number) => Date,
    transformFunc: (params: { eciPts: EciVec3; eciPts2: EciVec3; velPts: EciVec3<KilometersPerSecond>; velPts2: EciVec3<KilometersPerSecond>; angle: number; offset: number }) => T,
    sat2?: DetailedSatellite,
    orbits = 1,
  ): T[] {
    const orbitPoints: T[] = [];

    for (let i = 0; i < points; i++) {
      const offset = ((i * sat.period * orbits) / points) * 60 * 1000; // Offset in seconds (msec * 1000)
      const now = getOffsetTimeObj(offset);
      const angle = (-i * (sat.period / points) * TAU) / sat.period;
      const eciPts = SatMath.getEci(sat, now).position;
      const velPts = SatMath.getEci(sat, now).velocity;

      if (!eciPts) {
        errorManagerInstance.debug(`No ECI position for ${sat.sccNum} at ${now}`);
        continue;
      }

      let eciPts2 = { x: 0, y: 0, z: 0 } as EciVec3;
      let velPts2 = { x: 0, y: 0, z: 0 } as EciVec3<KilometersPerSecond>;

      if (sat2) {
        eciPts2 = SatMath.getEci(sat2, now).position;
        velPts2 = SatMath.getEci(sat2, now).velocity;
        if (!eciPts2) {
          errorManagerInstance.debug(`No ECI position for ${sat2.sccNum} at ${now}`);
          continue;
        }
      }

      orbitPoints.push(transformFunc({ eciPts, velPts, eciPts2, velPts2, angle, offset }));
    }

    return orbitPoints;
  }

  /**
   * Calculates the ECI (Earth Centered Inertial) coordinates of a satellite at a given time using its TLE (Two-Line Element) set.
   * @param sat The satellite object containing the TLE set.
   * @param now The time at which to calculate the ECI coordinates.
   * @returns An object containing the ECI coordinates and velocity of the satellite at the given time.
   */
  static getEci(sat: DetailedSatellite, now: Date): PosVel {
    try {
      const { m } = SatMath.calculateTimeVariables(now, sat.satrec) as { m: number };
      const sv = Sgp4.propagate(sat.satrec, m);

      if (!sv.position || !sv.velocity) {
        return { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } } as PosVel;
      }

      return sv as PosVel;
    } catch {
      return { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } } as PosVel;
    }
  }

  /**
   * Calculates the azimuth, elevation, and range of a satellite relative to a sensor at a given time.
   * @param now The current time.
   * @param satrec The satellite record.
   * @param sensor The sensor object.
   * @returns An object containing the azimuth, elevation, and range of the satellite relative to the sensor.
   */
  static getRae(
    now: Date,
    satrec: SatelliteRecord,
    sensor: Sensor,
    isHideToasts = false,
  ): {
    az: Degrees | null;
    el: Degrees | null;
    rng: Kilometers | null;
  } {
    const { gmst, m } = SatMath.calculateTimeVariables(now, satrec) as { gmst: GreenwichMeanSiderealTime; m: number };
    const positionEci = <EciVec3>Sgp4.propagate(satrec, m).position;

    if (!positionEci) {
      if (!isHideToasts) {
        errorManagerInstance.info(`No ECI position for ${satrec.satnum} at ${now}`);
      }

      return { az: null, el: null, rng: null };
    }
    const positionEcf = eci2ecf(positionEci, gmst);

    return ecfRad2rae(sensor.llaRad(), positionEcf);
  }

  /**
   *Calculates the direction of the sun in the sky based on the Julian date.
   *The function returns an array of three numbers representing the x, y, and z components of the sun's direction vector.
   * @param jd Julian Day
   * @returns ECI position of the Sun
   */
  static getSunDirection(jd: number): EciArr3 {
    if (!jd) {
      throw new Error('Julian date is required');
    }
    if (jd === keepTrackApi.getScene().sun.sunDirectionCache.jd) {
      return keepTrackApi.getScene().sun.sunDirectionCache.sunDirection;
    }

    const n = jd - 2451545;
    let L = 280.46 + 0.9856474 * n; // mean longitude of sun
    let g = 357.528 + 0.9856003 * n; // mean anomaly

    L %= 360.0;
    g %= 360.0;

    const ecLon = L + 1.915 * Math.sin(g * DEG2RAD) + 0.02 * Math.sin(2 * g * DEG2RAD);

    const t = (jd - 2451545) / 3652500;

    const obliq =
      84381.448 -
      4680.93 * t -
      1.55 * t ** 2 +
      1999.25 * t ** 3 -
      51.38 * t ** 4 -
      249.67 * t ** 5 -
      39.05 * t ** 6 +
      7.12 * t ** 7 +
      27.87 * t ** 8 +
      5.79 * t ** 9 +
      2.45 * t ** 10;

    const ob = obliq / 3600.0;

    const x = DISTANCE_TO_SUN * Math.cos(ecLon * DEG2RAD);
    const y = DISTANCE_TO_SUN * Math.cos(ob * DEG2RAD) * Math.sin(ecLon * DEG2RAD);
    const z = DISTANCE_TO_SUN * Math.sin(ob * DEG2RAD) * Math.sin(ecLon * DEG2RAD);

    // Update cache
    keepTrackApi.getScene().sun.sunDirectionCache = { jd, sunDirection: [x, y, z] };

    return [x, y, z];
  }

  /**
   * Normalizes the Right Ascension of the Ascending Node (RAAN) for a given satellite.
   *
   * This function calculates the normalized RAAN by accounting for the nodal precession rate
   * and the number of days since the satellite's epoch. The resulting RAAN is adjusted to
   * ensure it stays within the 0-360 degree range.
   *
   * @param sat - The detailed satellite object containing its orbital parameters.
   * @param now - The current date used to calculate the number of days since the satellite's epoch.
   * @returns The normalized RAAN value within the 0-360 degree range.
   */
  static normalizeRaan(sat: DetailedSatellite, now: Date): number {
    const precessionRate = this.getNodalPrecessionRate(sat);
    const daysSinceEpoch = sat.ageOfElset(now);
    let normalizedRaan = sat.rightAscension + (precessionRate * daysSinceEpoch);

    // Ensure RAAN stays within 0-360 range
    normalizedRaan = ((normalizedRaan % 360) + 360) % 360;

    return normalizedRaan;
  }

  /**
   * Calculates the nodal precession rate of a satellite.
   *
   * @param {DetailedSatellite} s - The satellite object containing its orbital parameters.
   * @returns {number} The nodal precession rate in degrees per day.
   *
   * @remarks
   * The nodal precession rate is influenced by the Earth's oblateness (J2), the satellite's
   * semi-major axis, eccentricity, inclination, and orbital period. This function converts
   * the inclination from degrees to radians and the semi-major axis from kilometers to meters
   * before performing the calculation.
   *
   * @example
   * ```typescript
   * const satellite = {
   *   period: 90, // in minutes
   *   semiMajorAxis: 7000, // in kilometers
   *   eccentricity: 0.001,
   *   inclination: 98.7 // in degrees
   * };
   * const precessionRate = getNodalPrecessionRate(satellite);
   * console.log(precessionRate); // Output: nodal precession rate in degrees per day
   * ```
   */
  static getNodalPrecessionRate(s: DetailedSatellite): number {
    const Re = 6378137; // Earth radius in meters
    const J2 = 1.082626680e-3; // Earth's second dynamic form factor
    const period = s.period * 60; // Convert period from minutes to seconds
    const omega = (2 * Math.PI) / period; // Angular velocity in rad/s
    const a = s.semiMajorAxis * 1000; // Convert semi-major axis from km to meters
    const e = s.eccentricity;
    const i = s.inclination * Math.PI / 180; // Convert inclination to radians

    // Calculate precession rate in rad/s
    const omegaP = (-3 / 2) * (Re / a) ** 2 / (1 - e * e) ** 2 * J2 * omega * Math.cos(i);

    // Convert to degrees per day
    return omegaP * (180 / Math.PI) * 86400;
  }

  /**
   * Calculates the angle between 2 satellites and the Sun
   * @param hoverSat The first satellite object.
   * @param secondaryObj The second satellite object.
   * @returns The sun angle in deg.
   */
  static sunAngle(hoverSat: BaseObject, secondaryObj?: DetailedSensor | DetailedSatellite): Degrees {
    // Validate Objects
    if (!secondaryObj || !hoverSat) {
      return NaN as Degrees;
    }
    if (secondaryObj.type === SpaceObjectType.STAR || hoverSat.type === SpaceObjectType.STAR) {
      return NaN as Degrees;
    }

    // Calculate Sun Angle
    const sunEci = keepTrackApi.getScene().sun.eci;
    const angle = this.getAngleBetweenSatellitesAndSun(hoverSat as DetailedSatellite, secondaryObj as DetailedSatellite, sunEci);

    return angle * RAD2DEG as Degrees;
  }
}
