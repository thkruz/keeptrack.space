/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * satMath.ts an expansion library for the Orbital Object Toolkit (OOTK)
 * providing tailored functions for calculating orbital data.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General License for more details.
 *
 * You should have received a copy of the GNU Affero General License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { vec3 } from 'gl-matrix';
import numeric from 'numeric';
import { Degrees, EciVec3, GreenwichMeanSiderealTime, Kilometers, Radians, SatelliteRecord, Sgp4, Transforms } from 'ootk';
import { EciArr3, SatObject, SensorObject } from '../interfaces';
import { DEG2RAD, DISTANCE_TO_SUN, MILLISECONDS2DAYS, MINUTES_PER_DAY, RAD2DEG, RADIUS_OF_EARTH, RADIUS_OF_SUN, TAU } from '../lib/constants';
import { dateFormat } from '../lib/dateFormat';
import { jday, lon2yaw } from '../lib/transforms';
import { Sun } from '../singletons/draw-manager/sun';
import { errorManagerInstance } from '../singletons/errorManager';
import { SatMathApi } from '../singletons/sat-math-api';
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

    // If shape contains the word "cube", then use the cube RCS formula
    // if (shape.toLowerCase().includes('cube') || shape.toLowerCase().includes('box')) {
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
    const { m, gmst } = SatMath.calculateTimeVariables(now, satrec);

    let positionEci: EciVec3;
    try {
      const stateVector = Sgp4.propagate(satrec, m);
      positionEci = <EciVec3>stateVector.position;
      if (!stateVector || !positionEci) {
        console.error('No ECI position for', satrec.satnum, 'at', now);
        return <Kilometers>0;
      }
    } catch (e) {
      console.error('Error propagating satrec at', now);
      return <Kilometers>0;
    }

    return SatMath.getAlt(positionEci, gmst);
  }

  /**
   * Calculates whether a satellite is in the sun's shadow (umbra), in the penumbra, or in sunlight.
   * @param sat The satellite object.
   * @param sunECI The position of the sun in ECI coordinates.
   * @returns A value indicating whether the satellite is in the sun's shadow (umbra), in the penumbra, or in sunlight.
   */
  static calculateIsInSun(sat: SatObject, sunECI: EciVec3): SunStatus {
    if (typeof sat.position == 'undefined') return SunStatus.UNKNOWN;
    if (!sunECI) return SunStatus.UNKNOWN;

    // NOTE: Code is mashed to save memory when used on the whole catalog
    // Position needs to be relative to satellite NOT ECI
    // var distSatEarthX = Math.pow(-sat.position.x, 2);
    // var distSatEarthY = Math.pow(-sat.position.y, 2);
    // var distSatEarthZ = Math.pow(-sat.position.z, 2);
    // var distSatEarth = Math.sqrt(distSatEarthX + distSatEarthY + distSatEarthZ);
    // var semiDiamEarth = Math.asin(RADIUS_OF_EARTH/distSatEarth) * RAD2DEG;
    const semiDiamEarth = Math.asin(RADIUS_OF_EARTH / Math.sqrt(Math.pow(-sat.position.x, 2) + Math.pow(-sat.position.y, 2) + Math.pow(-sat.position.z, 2))) * RAD2DEG;

    // Position needs to be relative to satellite NOT ECI
    // var distSatSunX = Math.pow(-sat.position.x + sunECI.x, 2);
    // var distSatSunY = Math.pow(-sat.position.y + sunECI.y, 2);
    // var distSatSunZ = Math.pow(-sat.position.z + sunECI.z, 2);
    // var distSatSun = Math.sqrt(distSatSunX + distSatSunY + distSatSunZ);
    // var semiDiamSun = Math.asin(RADIUS_OF_SUN/distSatSun) * RAD2DEG;
    const semiDiamSun =
      Math.asin(RADIUS_OF_SUN / Math.sqrt(Math.pow(-sat.position.x + sunECI.x, 2) + Math.pow(-sat.position.y + sunECI.y, 2) + Math.pow(-sat.position.z + sunECI.z, 2))) * RAD2DEG;

    // Angle between earth and sun
    const theta =
      Math.acos(
        <number>numeric.dot([-sat.position.x, -sat.position.y, -sat.position.z], [-sat.position.x + sunECI.x, -sat.position.y + sunECI.y, -sat.position.z + sunECI.z]) /
          (Math.sqrt(Math.pow(-sat.position.x, 2) + Math.pow(-sat.position.y, 2) + Math.pow(-sat.position.z, 2)) *
            Math.sqrt(Math.pow(-sat.position.x + sunECI.x, 2) + Math.pow(-sat.position.y + sunECI.y, 2) + Math.pow(-sat.position.z + sunECI.z, 2)))
      ) * RAD2DEG;

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
  static calculateTimeVariables(now: Date, satrec?: SatelliteRecord): { gmst: GreenwichMeanSiderealTime; m: number; j: number } {
    const j =
      jday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()) +
      now.getUTCMilliseconds() * MILLISECONDS2DAYS;
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
    return <Radians>(lon2yaw(CoordinateTransforms.eci2lla(position, selectedDate).lon, selectedDate) + 180 * DEG2RAD);
  }

  /**
   * Calculates the visual magnitude of a satellite as seen from a sensor at a given time.
   * @param sat The satellite object.
   * @param sensor The sensor object.
   * @param propTime The time at which to calculate the visual magnitude.
   * @param sun The Sun object.
   * @returns The visual magnitude of the satellite.
   */
  static calculateVisMag(sat: SatObject, sensor: SensorObject, propTime: Date, sun: Sun): number {
    let rae: {
      az: Degrees;
      el: Degrees;
      rng: Kilometers;
    };

    if (sat.position.x > 0) {
      const { gmst } = SatMath.calculateTimeVariables(propTime);
      const ecf = Transforms.eci2ecf(sat.position, gmst);
      const rae_ = Transforms.ecf2rae(sensor.observerGd, ecf);
      rae = { az: (rae_.az * RAD2DEG) as Degrees, el: (rae_.el * RAD2DEG) as Degrees, rng: rae_.rng };
    } else {
      rae = SatMath.getRae(propTime, sat.satrec, sensor);
    }

    const distanceToSatellite = rae.rng; //This is in KM

    let phaseAngle = Math.acos(
      <number>numeric.dot([-sat.position.x, -sat.position.y, -sat.position.z], [sat.position.x + sun.eci.x, -sat.position.y + sun.eci.y, -sat.position.z + sun.eci.z]) /
        (Math.sqrt(Math.pow(-sat.position.x, 2) + Math.pow(-sat.position.y, 2) + Math.pow(-sat.position.z, 2)) *
          Math.sqrt(Math.pow(-sat.position.x + sun.eci.x, 2) + Math.pow(-sat.position.y + sun.eci.y, 2) + Math.pow(-sat.position.z + sun.eci.z, 2)))
    );

    // The object is likely eclipsing the sun
    if (isNaN(phaseAngle)) {
      return 30;
    }

    //standard magnitude
    // DEBUG:
    // if (!sat.vmag) console.debug('No standard magnitude in the database defaulting to 8');
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
  static checkIsInView(sensor: SensorObject, rae: { rng: number; az: number; el: number }): boolean {
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
   * Finds the closest approach time between two satellites based on their positions and velocities.
   * @param sat1 The first satellite object.
   * @param sat2 The second satellite object.
   * @param propLength The length of time to propagate the satellite positions (in seconds). Defaults to 1 day (1440 * 60 seconds).
   * @returns An object containing the offset time (in milliseconds), the distance between the satellites (in kilometers), and the relative position and velocity vectors in RIC coordinates.
   */
  static findClosestApproachTime(
    sat1: SatObject,
    sat2: SatObject,
    propLength?: number
  ): {
    offset: number;
    dist: number;
    ric: { position: [number, number, number]; velocity: [number, number, number] };
  } {
    let offset = 0;
    propLength ??= 1440 * 60; // 1 Day
    let minDist = 1000000;
    let result = {
      offset: null,
      dist: null,
      ric: null,
    };

    sat1.satrec = Sgp4.createSatrec(sat1.TLE1, sat1.TLE2); // perform and store sat init calcs
    sat2.satrec = Sgp4.createSatrec(sat2.TLE1, sat2.TLE2); // perform and store sat init calcs

    for (let t = 0; t < propLength; t++) {
      offset = t * 1000; // Offset in seconds (msec * 1000)

      sat1 = <SatObject>{ ...sat1, ...SatMath.getEci(sat1, new Date(Date.now() + offset)) };
      sat2 = <SatObject>{ ...sat2, ...SatMath.getEci(sat2, new Date(Date.now() + offset)) };
      const pv = CoordinateTransforms.sat2ric(sat1, sat2);
      const dist = Math.sqrt(pv.position[0] ** 2 + pv.position[1] ** 2 + pv.position[2] ** 2);
      if (dist < minDist && !(pv.position[0] === 0 && pv.position[1] === 0 && pv.position[2] === 0)) {
        minDist = dist;
        result = {
          offset,
          dist: dist,
          ric: pv,
        };
      }
    }

    return result;
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
      alt = Transforms.eci2lla(positionEci, gmst).alt;
      if (isNaN(alt)) return <Kilometers>0;
    } catch (e) {
      return <Kilometers>0; // Auto fail the altitude check
    }

    return <Kilometers>alt;
  }

  /**
   * Calculates the azimuth and elevation angles between two satellites based on their positions and velocities.
   * @param sat1 The first satellite object.
   * @param sat2 The second satellite object.
   * @returns An object containing the azimuth and elevation angles between the two satellites.
   * @throws An error if either satellite's position or velocity is undefined.
   */
  static getAngleBetweenTwoSatellites(sat1: SatObject, sat2: SatObject): { az: number; el: number } {
    const { position: pos1, velocity: vel1 } = sat1;
    const { position: pos2, velocity: vel2 } = sat2;

    // Check if positions are identical
    if (pos1.x === pos2.x && pos1.y === pos2.y && pos1.z === pos2.z) {
      return { az: 0, el: 0 };
    }

    if (typeof pos1 === 'undefined') throw new Error('Sat1 position is undefined');
    if (typeof pos2 === 'undefined') throw new Error('Sat2 position is undefined');
    if (typeof vel1 === 'undefined') throw new Error('Sat1 velocity is undefined');
    if (typeof vel2 === 'undefined') throw new Error('Sat2 velocity is undefined');

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
   * Calculates the direction of a satellite's movement based on its current position and position 5 and 10 seconds in the future.
   * @param sat The satellite object.
   * @param simulationTime The current simulation time.
   * @returns A string indicating the direction of the satellite's movement ('N' for north, 'S' for south, or 'Error' if there was an error in the calculation).
   */
  static getDirection(sat: SatObject, simulationTime: Date) {
    const FIVE_SECONDS = 5000;
    const fiveSecLaterTime = new Date(simulationTime.getTime() + FIVE_SECONDS);
    const fiveSecLaterPos = SatMath.getEci(sat, fiveSecLaterTime).position || { x: <Kilometers>0, y: <Kilometers>0, z: <Kilometers>0 };

    if (fiveSecLaterPos) {
      const nowLat = CoordinateTransforms.eci2lla(sat.position, simulationTime).lat;
      const futLat = CoordinateTransforms.eci2lla(<EciVec3>fiveSecLaterPos, fiveSecLaterTime).lat;

      if (nowLat < futLat) return 'N';
      if (nowLat > futLat) return 'S';
    }

    const tenSecLaterTime = new Date(simulationTime.getTime() + FIVE_SECONDS * 2);
    const tenSecLaterPos = SatMath.getEci(sat, tenSecLaterTime).position || { x: <Kilometers>0, y: <Kilometers>0, z: <Kilometers>0 };

    if (tenSecLaterPos) {
      const nowLat = CoordinateTransforms.eci2lla(sat.position, simulationTime).lat;
      const futLat = CoordinateTransforms.eci2lla(<EciVec3>tenSecLaterPos, tenSecLaterTime).lat;

      if (nowLat < futLat) return 'N';
      if (nowLat > futLat) return 'S';
    }

    console.warn('Sat Direction Calculation Error - By Pole?');
    return 'Error';
  }

  /**
   * Calculates the ECF (Earth Centered Fixed) coordinates for a given number of points along a satellite's current orbit.
   * @param sat The satellite object.
   * @param points The number of points to calculate along the orbit.
   * @param getOffsetTimeObj A function that returns a Date object with the specified offset from the current simulation time.
   * @returns An array of objects containing the ECF coordinates for each point along the orbit.
   */
  static getEcfOfCurrentOrbit(sat: SatObject, points: number, getOffsetTimeObj: (offset: number) => Date): { x: number; y: number; z: number }[] {
    return SatMath.getOrbitPoints(sat, points, getOffsetTimeObj, (params: { eciPts: EciVec3; angle: number }) => Transforms.ecf2eci(params.eciPts, params.angle));
  }

  /**
   * Calculates the ECI (Earth Centered Inertial) coordinates for a given number of points along a satellite's current orbit.
   * @param sat The satellite object.
   * @param points The number of points to calculate along the orbit.
   * @param getOffsetTimeObj A function that returns a Date object with the specified offset from the current simulation time.
   * @returns An array of objects containing the ECI coordinates for each point along the orbit.
   */
  static getEciOfCurrentOrbit(sat: SatObject, points: number, getOffsetTimeObj: (offset: number) => Date): { x: number; y: number; z: number }[] {
    return SatMath.getOrbitPoints(sat, points, getOffsetTimeObj, (params: { eciPts: EciVec3 }) => params.eciPts);
  }

  /**
   * Calculates the latitude, longitude, altitude, and time for a given number of points along a satellite's current orbit.
   * @param sat The satellite object.
   * @param points The number of points to calculate along the orbit.
   * @param getOffsetTimeObj A function that returns a Date object with the specified offset from the current simulation time.
   * @returns An array of objects containing the latitude, longitude, altitude, and time for each point along the orbit.
   */
  static getLlaOfCurrentOrbit(sat: SatObject, points: number, getOffsetTimeObj: (offset: number) => Date): { lat: number; lon: number; alt: number; time: number }[] {
    return SatMath.getOrbitPoints(sat, points, getOffsetTimeObj, (params: { eciPts: EciVec3; offset: number }) => {
      const now = getOffsetTimeObj(params.offset);
      const { gmst } = SatMath.calculateTimeVariables(now);
      const lla = Transforms.eci2lla(params.eciPts, gmst);
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
  static getRicOfCurrentOrbit(sat: SatObject, sat2: SatObject, points: number, getOffsetTimeObj: (offset: number) => Date, orbits?: number): { x: number; y: number; z: number }[] {
    return SatMath.getOrbitPoints(
      sat,
      points,
      getOffsetTimeObj,
      (params: { eciPts: EciVec3; eciPts2: EciVec3; offset: number }) => {
        sat = { ...sat, ...(<SatObject>{ position: params.eciPts }) };
        sat2 = { ...sat2, ...(<SatObject>{ position: params.eciPts2 }) };
        const ric = CoordinateTransforms.sat2ric(sat, sat2).position;
        return { x: ric[0], y: ric[1], z: ric[2] };
      },
      sat2,
      orbits
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
    sat: SatObject,
    points: number,
    getOffsetTimeObj: (offset: number) => Date,
    transformFunc: (params: { eciPts: EciVec3; eciPts2: EciVec3; angle: number; offset: number }) => T,
    sat2?: SatObject,
    orbits = 1
  ): T[] {
    let orbitPoints = [];
    for (let i = 0; i < points; i++) {
      let offset = ((i * sat.period * orbits) / points) * 60 * 1000; // Offset in seconds (msec * 1000)
      const now = getOffsetTimeObj(offset);
      const angle = (-i * (sat.period / points) * TAU) / sat.period;
      const eciPts = <EciVec3>SatMath.getEci(sat, now).position;
      if (!eciPts) {
        errorManagerInstance.debug(`No ECI position for ${sat.sccNum} at ${now}`);
        continue;
      }

      let eciPts2: EciVec3;
      if (sat2) {
        eciPts2 = <EciVec3>SatMath.getEci(sat2, now).position;
        if (!eciPts2) {
          errorManagerInstance.debug(`No ECI position for ${sat2.sccNum} at ${now}`);
          continue;
        }
      }

      orbitPoints.push(transformFunc({ eciPts, eciPts2, angle, offset }));
    }
    return orbitPoints;
  }

  /**
   * Calculates the ECI (Earth Centered Inertial) coordinates of a satellite at a given time using its TLE (Two-Line Element) set.
   * @param sat The satellite object containing the TLE set.
   * @param now The time at which to calculate the ECI coordinates.
   * @returns An object containing the ECI coordinates and velocity of the satellite at the given time.
   */
  static getEci(sat: SatObject, now: Date) {
    try {
      const { m } = SatMath.calculateTimeVariables(now, sat.satrec);
      return Sgp4.propagate(sat.satrec, m);
    } catch {
      return { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 } };
    }
  }

  /**
   * Calculates the latitude, longitude, time, and whether a satellite is in view for a given time and satellite object.
   * @param now The current time.
   * @param sat The satellite object.
   * @param sensor The sensor object.
   * @returns An object containing the latitude, longitude, time, and whether the satellite is in view.
   */
  static getLlaTimeView(now: Date, sat: SatObject, sensor: SensorObject): { lat: number; lon: number; time: string; inView: boolean } {
    const { m, gmst } = SatMath.calculateTimeVariables(now, sat.satrec);
    const positionEci = <EciVec3>Sgp4.propagate(sat.satrec, m).position;

    if (!positionEci) {
      console.error('No ECI position for', sat.sccNum, 'at', now);
      return { lat: 0, lon: 0, time: 'Invalid', inView: false };
    }

    const gpos = Transforms.eci2lla(positionEci, gmst);
    const lat = Transforms.getDegLat(gpos.lat);
    const lon = Transforms.getDegLon(gpos.lon);
    const time = dateFormat(now, 'isoDateTime', true);

    const positionEcf = Transforms.eci2ecf(positionEci, gmst);
    const lookAngles = Transforms.ecf2rae(sensor.observerGd, positionEcf);
    const az = lookAngles.az * RAD2DEG;
    const el = lookAngles.el * RAD2DEG;
    const rng = lookAngles.rng;
    const inView = SatMath.checkIsInView(sensor, { az, el, rng });

    return { lat, lon, time, inView };
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
    sensor: SensorObject,
    isHideToasts = false
  ): {
    az: Degrees;
    el: Degrees;
    rng: Kilometers;
  } {
    const { gmst, m } = SatMath.calculateTimeVariables(now, satrec);
    const positionEci = <EciVec3>Sgp4.propagate(satrec, m).position;
    if (!positionEci) {
      if (!isHideToasts) {
        errorManagerInstance.info(`No ECI position for ${satrec.satnum} at ${now}`);
      }
      return { az: <Degrees>null, el: <Degrees>null, rng: <Kilometers>null };
    }
    const positionEcf = Transforms.eci2ecf(positionEci, gmst);
    sensor.observerGd ??= { lat: <Radians>(sensor.lat * DEG2RAD), lon: <Radians>(sensor.lon * DEG2RAD), alt: sensor.alt };

    const lookAngles = Transforms.ecf2rae(sensor.observerGd, positionEcf);
    const az = <Degrees>(lookAngles.az * RAD2DEG);
    const el = <Degrees>(lookAngles.el * RAD2DEG);
    const rng = <Kilometers>lookAngles.rng;
    return { az, el, rng };
  }

  /**
    Calculates the direction of the sun in the sky based on the Julian date.
    The function returns an array of three numbers representing the x, y, and z components of the sun's direction vector.
   * @param jd Julian Day
   * @returns ECI position of the Sun
   */
  static getSunDirection(jd: number): EciArr3 {
    if (!jd) throw new Error('Julian date is required');

    const n = jd - 2451545;
    let L = 280.46 + 0.9856474 * n; // mean longitude of sun
    let g = 357.528 + 0.9856003 * n; // mean anomaly
    L = L % 360.0;
    g = g % 360.0;

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

    return [x, y, z];
  }

  /**
   * Calculates the inertial azimuth of a satellite given its latitude and inclination.
   * @param lat - The latitude of the satellite in degrees.
   * @param inc - The inclination of the satellite in degrees.
   * @returns The inertial azimuth of the satellite in degrees.
   */
  static calcInertAz(lat: Degrees, inc: Degrees): Degrees {
    const phi = lat * DEG2RAD;
    const i = inc * DEG2RAD;

    const az = Math.asin(Math.cos(i) / Math.cos(phi));

    return <Degrees>(az * RAD2DEG);
  }

  /**
   * Calculates the inclination angle of a satellite from its launch azimuth and latitude.
   * @param lat - The latitude of the observer in degrees.
   * @param az - The launch azimuth angle of the satellite in degrees clockwise from north.
   * @returns The inclination angle of the satellite in degrees.
   */
  static calcIncFromAz(lat: number, az: number): number {
    const phi = lat * DEG2RAD;
    const beta = az * DEG2RAD;

    const inc = Math.acos(Math.sin(beta) * Math.cos(phi));

    return <Degrees>(inc * RAD2DEG);
  }

  /**
   * Returns an object containing the latitude, longitude, time, and whether the satellite is in view for a given satellite and index.
   * @param sat The satellite object.
   * @param i The index of the point to calculate.
   * @param pointPerOrbit The number of points to calculate per orbit (optional, defaults to 256).
   * @returns An object containing the latitude, longitude, time, and whether the satellite is in view.
   */
  static map(sat: SatObject, i: number, getOffsetTimeObj: (offset: number) => Date, pointPerOrbit: number): { time: string; lat: number; lon: number; inView: boolean } {
    let offset = ((i * sat.period) / pointPerOrbit) * 60 * 1000; // Offset in seconds (msec * 1000)
    const now = getOffsetTimeObj(offset);
    return SatMathApi.getLlaTimeView(now, sat);
  }
}
