import { mat3, vec3 } from 'gl-matrix';
import { DetailedSatellite, PosVel } from '@ootk/src/main';

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
    sat: DetailedSatellite | PosVel,
    reference: DetailedSatellite | PosVel,
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
}
