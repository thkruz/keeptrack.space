/* eslint-disable max-lines */
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

import { ServiceLocator } from '@app/engine/core/service-locator';
import { CelestialBody } from '@app/engine/rendering/draw-manager/celestial-bodies/celestial-body';
import { Earth } from '@app/engine/rendering/draw-manager/earth';
import {
  BaseObject,
  DEG2RAD,
  Degrees,
  estimateRcs as ootkEstimateRcs,
  GreenwichMeanSiderealTime,
  Kilometers,
  KilometersPerSecond,
  linearDistance,
  mag2db as ootkMag2db,
  MILLISECONDS_TO_DAYS,
  MINUTES_PER_DAY,
  PosVel,
  RAD2DEG,
  relativeVelocity as ootkRelativeVelocity,
  Radians,
  Satellite,
  SatelliteRecord,
  Sgp4,
  SpaceObjectType,
  StateVectorSgp4,
  Sun as OotkSun,
  SunStatus,
  TAU,
  TemeVec3,
  Vector3D,
  ecef2eci,
  ecefRad2rae,
  eci2ecef,
  eci2lla,
  eci2rae,
  RIC,
} from '@ootk/src/main';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { vec3 } from 'gl-matrix';
import numeric from 'numeric';
import { EciArr3 } from '../../engine/core/interfaces';
import type { Sun } from '../../engine/rendering/draw-manager/sun';
import { DISTANCE_TO_SUN } from '../../engine/utils/constants';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { jday, lon2yaw } from '../../engine/utils/transforms';

if (!global) {
  window._numeric = numeric; // numeric will break if it is not available globally
}

export type StringifiedNumber = `${number}.${number}`;

// Re-export SunStatus from ootk for backward compatibility
export { SunStatus } from '@ootk/src/main';

export abstract class SatMath {
  /**
   * Converts magnitude to decibels.
   * @param magnitude The magnitude to convert.
   * @deprecated Use mag2db() from ootk instead.
   */
  static mag2db(magnitude: number) {
    if (magnitude <= 0) {
      return NaN; // KeepTrack returns NaN instead of throwing
    }

    return ootkMag2db(magnitude);
  }

  /**
   * Estimates the Radar Cross Section (RCS) of an object based on its dimensions and shape.
   * @deprecated Use estimateRcs() from ootk instead.
   */
  static estimateRcs(length: number, width: number, height: number, shape: string): number {
    return ootkEstimateRcs(length, width, height, shape);
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

    let positionEci: TemeVec3;

    try {
      const stateVector = Sgp4.propagate(satrec, m);

      positionEci = <TemeVec3>stateVector.position;
      if (!stateVector || !positionEci) {
        errorManagerInstance.log(`No ECI position for ${satrec.satnum} at ${now}`);

        return <Kilometers>0;
      }
    } catch {
      errorManagerInstance.log(`Error propagating satrec at ${now}`);

      return <Kilometers>0;
    }

    return SatMath.getAlt(positionEci, gmst);
  }

  /**
   * Calculates whether a satellite is in the sun's shadow (umbra), in the penumbra, or in sunlight.
   * Uses ootk's Sun.lightingRatio() for accurate eclipse calculations.
   * @param obj The satellite object.
   * @param sunECI The position of the sun in ECI coordinates.
   * @returns A value indicating whether the satellite is in the sun's shadow (umbra), in the penumbra, or in sunlight.
   */
  static calculateIsInSun(obj: BaseObject | StateVectorSgp4, sunECI: TemeVec3): SunStatus {
    if (!obj) {
      return SunStatus.UNKNOWN;
    }

    // Extract position from various object types
    let x: Kilometers;
    let y: Kilometers;
    let z: Kilometers;

    // Check for StateVectorSgp4 (has position property directly)
    if ('position' in obj && typeof obj.position !== 'boolean' && obj.position) {
      if (!sunECI) {
        return SunStatus.UNKNOWN;
      }

      x = obj.position.x;
      y = obj.position.y;
      z = obj.position.z;
    } else if (obj instanceof BaseObject && (obj as unknown as { position?: TemeVec3 }).position) {
      const pos = (obj as unknown as { position: TemeVec3 }).position;

      if (!sunECI) {
        return SunStatus.UNKNOWN;
      }

      x = pos.x;
      y = pos.y;
      z = pos.z;
    } else {
      return SunStatus.UNKNOWN;
    }

    // Convert to Vector3D for ootk's Sun.lightingRatio
    const satPos = new Vector3D(x, y, z);
    const sunPos = new Vector3D(sunECI.x, sunECI.y, sunECI.z);

    // Use ootk's lighting ratio calculation
    const ratio = OotkSun.lightingRatio(satPos, sunPos);

    // Map ratio to SunStatus:
    // 0.0 = fully eclipsed (umbra)
    // 0.0 < ratio < 1.0 = partial illumination (penumbra)
    // 1.0 = fully illuminated (sun)
    if (ratio === 0) {
      return SunStatus.UMBRAL;
    }
    if (ratio < 1) {
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
  static calculateNadirYaw(position: TemeVec3, selectedDate: Date): Radians {
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
  static calculateVisMag(sat: Satellite, sensor: DetailedSensor, propTime: Date, sun: Sun): number {
    let rae: {
      az: Degrees | null;
      el: Degrees | null;
      rng: Kilometers | null;
    };

    if (sat.position.x > 0) {
      rae = eci2rae(propTime, sat.position, sensor);
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
  static checkIsInView(sensor: DetailedSensor, rae: { rng: Kilometers | null; az: Degrees | null; el: Degrees | null }): boolean {
    const { az, el, rng } = rae;

    if (az === null || el === null || rng === null) {
      return false;
    }

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
   * @deprecated Use linearDistance() from ootk instead.
   */
  static distance(obj1: TemeVec3, obj2: TemeVec3): Kilometers {
    return linearDistance(obj1, obj2);
  }

  /**
   * Calculates the velocity between two objects in ECI coordinates.
   * @param obj1 The first object's velocity in ECI coordinates.
   * @param obj2 The second object's velocity in ECI coordinates.
   * @returns The velocity between the two objects in kilometers/s.
   */
  /**
   * Calculates the relative velocity between two objects.
   * @deprecated Use relativeVelocity() from ootk instead.
   */
  static velocity(obj1: TemeVec3<KilometersPerSecond>, obj2: TemeVec3<KilometersPerSecond>): KilometersPerSecond {
    return ootkRelativeVelocity(obj1, obj2);
  }


  /**
   * Finds the closest approach time between two satellites based on their positions and velocities.
   * @param sat1 The first satellite object.
   * @param sat2 The second satellite object.
   * @param propLength The length of time to propagate the satellite positions (in seconds). Defaults to 1 day (1440 * 60 seconds).
   * @returns An object containing the offset time (in milliseconds), the distance between the satellites (in kilometers), and the relative position and velocity vectors in RIC
   * coordinates.
   */
  /**
   * @deprecated Use sat1.findClosestApproach(sat2, startDate, duration, stepSize) instead.
   */
  static findClosestApproachTime(
    sat1: Satellite,
    sat2: Satellite,
    propLength?: number,
  ): {
    offset: number;
    dist: number;
    ric: { position: [number, number, number]; velocity: [number, number, number] };
  } {
    propLength ??= 1440 * 60; // 1 Day (in seconds)

    const result = sat1.findClosestApproach(sat2, new Date(), propLength, 1);

    // Adapt result format for backward compatibility
    return {
      offset: result.offset,
      dist: result.distance,
      ric: {
        position: [result.ric.position.x, result.ric.position.y, result.ric.position.z],
        velocity: [result.ric.velocity.x, result.ric.velocity.y, result.ric.velocity.z],
      },
    };
  }

  /**
   * Calculates the altitude of a satellite given its position in ECI coordinates and the Greenwich Mean Sidereal Time (GMST).
   * @param positionEci The position of the satellite in ECI coordinates.
   * @param gmst The Greenwich Mean Sidereal Time (GMST).
   * @returns The altitude of the satellite in kilometers.
   * If the altitude calculation fails, returns 0.
   */
  static getAlt(positionEci: TemeVec3, gmst: GreenwichMeanSiderealTime, radius?: Kilometers): Kilometers {
    let alt: number;

    try {
      if (!radius) {
        alt = eci2lla(positionEci, gmst).alt;
      } else {
        alt = Math.sqrt(positionEci.x ** 2 + positionEci.y ** 2 + positionEci.z ** 2) - radius;
      }

      if (isNaN(alt)) {
        return <Kilometers>0;
      }
    } catch {
      return 0 as Kilometers; // Auto fail the altitude check
    }

    return alt as Kilometers;
  }

  static getPositionFromCenterBody(position: TemeVec3, centerBody?: Earth | CelestialBody): TemeVec3 {
    centerBody ??= ServiceLocator.getScene().getBodyById(settingsManager.centerBody)!;

    const centerBodyPosition = centerBody.position;

    return {
      x: position.x - centerBodyPosition[0] as Kilometers,
      y: position.y - centerBodyPosition[1] as Kilometers,
      z: position.z - centerBodyPosition[2] as Kilometers,
    };
  }

  static estimateRcsUsingHistoricalData(satInput: Satellite): number | null {
    const historicRcs: number[] = [];
    const catalogManager = ServiceLocator.getCatalogManager();
    const objectCache = catalogManager.objectCache;

    for (const obj of objectCache) {
      if (!obj.isSatellite()) {
        continue;
      }

      const sat = obj as Satellite;

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
   * @deprecated Use sat1.angleTo(sat2, date) instead. Note: this method uses pre-propagated positions,
   * while the ootk method propagates to the specified date.
   */
  static getAngleBetweenTwoSatellites(sat1: Satellite, sat2: Satellite): { az: number; el: number } {
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
   * Calculates the angle between 2 satellites and the Sun.
   * @deprecated Use sat1.sunAngleTo(sat2, sunPosition, date) instead. Note: this method uses pre-propagated
   * positions, while the ootk method propagates to the specified date.
   */
  static getAngleBetweenSatellitesAndSun(sat1: Satellite, sat2: Satellite, sunVec: TemeVec3): number {
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
  /**
   * @deprecated Use sat.getDirection() instead.
   */
  static getDirection(sat: Satellite, simulationTime: Date): string {
    try {
      return sat.getDirection(simulationTime);
    } catch (e) {
      errorManagerInstance.log(`Sat Direction Calculation Error: ${e}`);

      return 'Error';
    }
  }

  /**
   * Calculates the ECF (Earth Centered Fixed) coordinates for a given number of points along a satellite's current orbit.
   * @param sat The satellite object.
   * @param points The number of points to calculate along the orbit.
   * @param getOffsetTimeObj A function that returns a Date object with the specified offset from the current simulation time.
   * @returns An array of objects containing the ECF coordinates for each point along the orbit.
   */
  static getEcfOfCurrentOrbit(sat: Satellite, points: number, getOffsetTimeObj: (offset: number) => Date): { x: number; y: number; z: number }[] {
    return SatMath.getOrbitPoints(sat, points, getOffsetTimeObj, (params: { eciPts: TemeVec3; angle: number }) => ecef2eci(params.eciPts, params.angle));
  }

  /**
   * Calculates the ECI (Earth Centered Inertial) coordinates for a given number of points along a satellite's current orbit.
   * @param sat The satellite object.
   * @param points The number of points to calculate along the orbit.
   * @param getOffsetTimeObj A function that returns a Date object with the specified offset from the current simulation time.
   * @returns An array of objects containing the ECI coordinates for each point along the orbit.
   */
  static getEciOfCurrentOrbit(sat: Satellite, points: number, getOffsetTimeObj: (offset: number) => Date): { x: number; y: number; z: number }[] {
    return SatMath.getOrbitPoints(sat, points, getOffsetTimeObj, (params: { eciPts: TemeVec3 }) => params.eciPts);
  }

  /**
   * Calculates the latitude, longitude, altitude, and time for a given number of points along a satellite's current orbit.
   * @param sat The satellite object.
   * @param points The number of points to calculate along the orbit.
   * @param getOffsetTimeObj A function that returns a Date object with the specified offset from the current simulation time.
   * @returns An array of objects containing the latitude, longitude, altitude, and time for each point along the orbit.
   */
  static getLlaOfCurrentOrbit(sat: Satellite, points: number, getOffsetTimeObj: (offset: number) => Date): { lat: number; lon: number; alt: number; time: number }[] {
    return SatMath.getOrbitPoints(sat, points, getOffsetTimeObj, (params: { eciPts: TemeVec3; offset: number }) => {
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
    sat: Satellite,
    sat2: Satellite,
    points: number,
    getOffsetTimeObj: (offset: number) => Date,
    orbits?: number,
  ): { x: number; y: number; z: number }[] {
    return SatMath.getOrbitPoints(
      sat,
      points,
      getOffsetTimeObj,
      (params: { eciPts: TemeVec3; eciPts2: TemeVec3; velPts: TemeVec3<KilometersPerSecond>; velPts2: TemeVec3<KilometersPerSecond>; offset: number }) => {
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
        const ric = RIC.fromPosVel(sat, sat2).position;


        return { x: ric.x, y: ric.y, z: ric.z };
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
    sat: Satellite,
    points: number,
    getOffsetTimeObj: (offset: number) => Date,
    transformFunc: (params: { eciPts: TemeVec3; eciPts2: TemeVec3; velPts: TemeVec3<KilometersPerSecond>; velPts2: TemeVec3<KilometersPerSecond>; angle: number; offset: number }) => T,
    sat2?: Satellite,
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

      let eciPts2 = { x: 0, y: 0, z: 0 } as TemeVec3;
      let velPts2 = { x: 0, y: 0, z: 0 } as TemeVec3<KilometersPerSecond>;

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
  static getEci(sat: Satellite, now: Date): PosVel {
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
    sensor: DetailedSensor,
    isHideToasts = false,
  ): {
    az: Degrees | null;
    el: Degrees | null;
    rng: Kilometers | null;
  } {
    const { gmst, m } = SatMath.calculateTimeVariables(now, satrec) as { gmst: GreenwichMeanSiderealTime; m: number };
    const positionEci = <TemeVec3>Sgp4.propagate(satrec, m).position;

    if (!positionEci) {
      if (!isHideToasts) {
        errorManagerInstance.info(`No ECI position for ${satrec.satnum} at ${now}`);
      }

      return { az: null, el: null, rng: null };
    }
    const positionEcf = eci2ecef(positionEci, gmst);

    return ecefRad2rae(sensor.llaRad(), positionEcf);
  }

  /**
   * Calculates the direction of the sun in the sky based on the Julian date.
   * The function returns an array of three numbers representing the x, y, and z components of the sun's direction vector.
   * @param jd Julian Day
   * @returns ECI position of the Sun
   * @deprecated For new code, use Sun.position(epoch) from ootk which returns a Vector3D.
   * This function is retained for caching compatibility with KeepTrack's scene.
   */
  static getSunDirection(jd: number): EciArr3 {
    if (!jd) {
      throw new Error('Julian date is required');
    }

    // Get the sun from the scene to access the cache
    const sun = ServiceLocator.getScene().sun;

    if (jd === sun?.sunDirectionCache.jd) {
      return sun.sunDirectionCache.sunDirection;
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
    if (sun) {
      sun.sunDirectionCache = { jd, sunDirection: [x, y, z] };
    }

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
  /**
   * @deprecated Use sat.normalizeRaan() instead.
   */
  static normalizeRaan(sat: Satellite, now: Date): number {
    return sat.normalizeRaan(now);
  }

  /**
   * @deprecated Use sat.getNodalPrecessionRate() instead.
   */
  static getNodalPrecessionRate(s: Satellite): number {
    return s.getNodalPrecessionRate();
  }

  /**
   * Calculates the angle between 2 satellites and the Sun
   * @param hoverSat The first satellite object.
   * @param secondaryObj The second satellite object.
   * @returns The sun angle in deg.
   */
  static sunAngle(hoverSat: BaseObject, secondaryObj?: DetailedSensor | Satellite): Degrees {
    // Validate Objects
    if (!secondaryObj || !hoverSat) {
      return NaN as Degrees;
    }
    if (secondaryObj.type === SpaceObjectType.STAR || hoverSat.type === SpaceObjectType.STAR) {
      return NaN as Degrees;
    }

    // Calculate Sun Angle
    const sunEci = ServiceLocator.getScene().sun.eci;
    const angle = this.getAngleBetweenSatellitesAndSun(hoverSat as Satellite, secondaryObj as Satellite, sunEci);

    return angle * RAD2DEG as Degrees;
  }

  /**
     * Calculate the angle between Sun, Satellite, and Earth with vertex at the
     * satellite: angle(Sun - Satellite - Earth).
     *
     * This computes the angle between the vector from the satellite to the Sun
     * and the vector from the satellite to the Earth (Earth is at origin).
     */
  static sunSatEarthAngle(satPos: TemeVec3<Kilometers>, sunPos: TemeVec3<Kilometers>): number {
    // Vector from satellite to Sun
    const s2sunX = sunPos.x - satPos.x;
    const s2sunY = sunPos.y - satPos.y;
    const s2sunZ = sunPos.z - satPos.z;

    // Vector from satellite to Earth (Earth at origin -> -satPos)
    const s2earthX = -satPos.x;
    const s2earthY = -satPos.y;
    const s2earthZ = -satPos.z;

    const mag1 = Math.hypot(s2sunX, s2sunY, s2sunZ);
    const mag2 = Math.hypot(s2earthX, s2earthY, s2earthZ);

    if (mag1 === 0 || mag2 === 0) {
      return NaN;
    }

    const dot = s2sunX * s2earthX + s2sunY * s2earthY + s2sunZ * s2earthZ;
    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    return (angle * 180) / Math.PI;
  }
}
