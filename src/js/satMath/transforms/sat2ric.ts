import { ReadonlyMat3, vec3 } from 'gl-matrix';
import { SatObject } from '../../api/keepTrackTypes';
import { mat3 } from '../../lib/external/gl-matrix';

/**
 * @param {SatObject} sat - Satellite Object of interest
 * @param {SatObject} reference - Satellite Object to use as reference
 * @returns { {position: vec3, velocity: vec3} } Position and velocity of the satellite in RIC
 */

export const sat2ric = (sat: SatObject, reference: SatObject): { position: vec3; velocity: vec3 } => {
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
    position: vec3.transformMat3(vec3.create(), dp, <ReadonlyMat3>(<unknown>matrix)),
    velocity: vec3.transformMat3(vec3.create(), dv, <ReadonlyMat3>(<unknown>matrix)),
  };
};
