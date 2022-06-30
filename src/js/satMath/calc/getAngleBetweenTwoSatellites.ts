import { SatObject } from '@app/js/api/keepTrackTypes';
import { RAD2DEG } from '@app/js/lib/constants';
import { vec3 } from 'gl-matrix';

export const getAngleBetweenTwoSatellites = (sat1: SatObject, sat2: SatObject): { az: number; el: number } => {
  const { position: pos1, velocity: vel1 } = sat1;
  const { position: pos2, velocity: vel2 } = sat2;

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
};
