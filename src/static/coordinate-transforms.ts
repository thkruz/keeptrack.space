import { EciArr3, SatObject, SensorObject } from '@app/js/interfaces';
import { mat3, vec3 } from 'gl-matrix';
import { Degrees, EciVec3, Kilometers, Radians, Transforms } from 'ootk';
import { DEG2RAD, RAD2DEG } from '../lib/constants';
import { SatMath } from './sat-math';

/**
 * This class provides static methods for converting between different coordinate systems used in satellite tracking.
 */
export abstract class CoordinateTransforms {
  /**
   * Converts satellite position and velocity vectors from ECI to RIC reference frame.
   * @param {SatObject} sat - Object containing satellite position and velocity vectors in ECI reference frame.
   * @param {SatObject} reference - Object containing reference satellite position and velocity vectors in ECI reference frame.
   * @returns {Object} Object containing satellite position and velocity vectors in RIC reference frame.
   */
  public static sat2ric(
    sat: SatObject | { position: EciVec3; velocity: EciVec3 },
    reference: SatObject | { position: EciVec3; velocity: EciVec3 }
  ): { position: vec3; velocity: vec3 } {
    const { position, velocity } = sat;
    const r = vec3.fromValues(position.x, position.y, position.z);
    const v = vec3.fromValues(velocity.x, velocity.y, velocity.z);
    const ru = vec3.normalize(vec3.create(), r);
    const h = vec3.cross(vec3.create(), r, v);
    const cu = vec3.normalize(vec3.create(), h);
    const iu = vec3.cross(vec3.create(), cu, ru);
    const matrix = mat3.fromValues(ru[0], iu[0], cu[0], ru[1], iu[1], cu[1], ru[2], iu[2], cu[2]);

    const { position: refPosition, velocity: refVelocity } = reference;
    const dp = vec3.sub(vec3.create(), r, [refPosition.x, refPosition.y, refPosition.z]);
    const dv = vec3.sub(vec3.create(), v, [refVelocity.x, refVelocity.y, refVelocity.z]);

    return {
      position: vec3.transformMat3(vec3.create(), dp, matrix),
      velocity: vec3.transformMat3(vec3.create(), dv, matrix),
    };
  }

  /**
   * Converts RAE (Right Ascension, Azimuth, Elevation) coordinates to ECEF (Earth-Centered, Earth-Fixed) coordinates.
   * @param {Degrees} az - Azimuth angle in degrees.
   * @param {Degrees} el - Elevation angle in degrees.
   * @param {Kilometers} rng - Range in kilometers.
   * @param {Radians} lat - Latitude in radians.
   * @param {Radians} lon - Longitude in radians.
   * @param {Kilometers} alt - Altitude in kilometers.
   * @returns {Object} Object containing ECEF coordinates in kilometers.
   */
  public static rae2ecf(az: Degrees, el: Degrees, rng: Kilometers, lat: Radians, lon: Radians, alt: Kilometers): { x: Kilometers; y: Kilometers; z: Kilometers } {
    // site ecef in meters
    const geodeticCoords: any = {
      lat: lat,
      lon: lon,
      alt: alt,
    };

    if (rng < 0) throw new Error('Range cannot be negative');

    const site = Transforms.lla2ecf(geodeticCoords);
    const sitex = site.x;
    const sitey = site.y;
    const sitez = site.z;

    // some needed calculations
    const slat = Math.sin(lat);
    const slon = Math.sin(lon);
    const clat = Math.cos(lat);
    const clon = Math.cos(lon);

    const azRad = <Radians>(az * DEG2RAD);
    const elRad = <Radians>(el * DEG2RAD);

    // az,el,rng to sez convertion
    const south = -rng * Math.cos(elRad) * Math.cos(azRad);
    const east = rng * Math.cos(elRad) * Math.sin(azRad);
    const zenith = rng * Math.sin(elRad);

    const x = slat * clon * south + -slon * east + clat * clon * zenith + sitex;
    const y = slat * slon * south + clon * east + clat * slon * zenith + sitey;
    const z = -clat * south + slat * zenith + sitez;

    return { x: <Kilometers>x, y: <Kilometers>y, z: <Kilometers>z };
  }

  /**
   * Converts ECI coordinates to latitude, longitude and altitude.
   * @param {EciVec3} position - ECI coordinates of the satellite.
   * @param {Date} simulationTime - Current date and time.
   * @returns {Object} Object containing latitude, longitude and altitude in degrees and kilometers respectively.
   */
  public static eci2lla(position: EciVec3, simulationTime: Date): { lat: Degrees; lon: Degrees; alt: Kilometers } {
    const { gmst } = SatMath.calculateTimeVariables(simulationTime);
    var latLon = Transforms.eci2lla(position, gmst);
    let lat = <Degrees>(latLon.lat * RAD2DEG);
    let lon = <Degrees>(latLon.lon * RAD2DEG);

    // Normalize
    lon = lon > 180 ? <Degrees>(lon - 360) : lon;
    lon = lon < -180 ? <Degrees>(lon + 360) : lon;
    return {
      lat: <Degrees>lat,
      lon: <Degrees>lon,
      alt: <Kilometers>latLon.alt,
    };
  }

  /**
   * Converts ECI coordinates to RAE (Right Ascension, Azimuth, Elevation) coordinates.
   * @param {Date} now - Current date and time.
   * @param {EciArr3} eci - ECI coordinates of the satellite.
   * @param {SensorObject} sensor - Sensor object containing observer's geodetic coordinates.
   * @returns {Object} Object containing azimuth, elevation and range in degrees and kilometers respectively.
   */
  public static eci2rae(now: Date, eci: EciArr3, sensor: SensorObject): { az: Degrees; el: Degrees; rng: Kilometers } {
    now = new Date(now);
    const { gmst } = SatMath.calculateTimeVariables(now);

    let positionEcf = Transforms.eci2ecf(<EciVec3>{ x: eci[0], y: eci[1], z: eci[2] }, gmst); // positionEci.position is called positionEci originally
    let lookAngles = Transforms.ecf2rae(sensor.observerGd, positionEcf);
    let az = lookAngles.az * RAD2DEG;
    let el = lookAngles.el * RAD2DEG;
    let rng = lookAngles.rng;
    return { az: az as Degrees, el: el as Degrees, rng: rng as Kilometers };
  }
}
