import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject } from '@app/js/api/keepTrackTypes';
import { SpaceObjectType } from '@app/js/api/SpaceObjectType';
import * as glm from '@app/js/lib/external/gl-matrix.js';
import { mat4 } from 'gl-matrix';
import { addSatExtraFunctions } from '../satSet';

export const getSatVel = () => (keepTrackApi.programs.dotsManager.velocityData ? keepTrackApi.programs.dotsManager.velocityData : new Float32Array());
export const getSatInView = () => (keepTrackApi.programs.dotsManager.inViewData ? keepTrackApi.programs.dotsManager.inViewData : new Int8Array());
export const getSatInSun = () => (keepTrackApi.programs.dotsManager.inSunData ? keepTrackApi.programs.dotsManager.inSunData : new Int8Array());
export const getSatExtraOnly = (i: number): SatObject | null => {
  const { satSet } = keepTrackApi.programs;
  return !satSet.satData || !satSet.satData[i] ? null : satSet.satData[i];
};
export const getSatFromObjNum = (objNum: number): SatObject => {
  const { satSet } = keepTrackApi.programs;
  return satSet.getSat(satSet.getIdFromObjNum(objNum));
};
export const getIdFromIntlDes = (intlDes: string) => {
  const { satSet } = keepTrackApi.programs;
  return typeof satSet.cosparIndex[`${intlDes}`] !== 'undefined' ? satSet.cosparIndex[`${intlDes}`] : null;
};
export const getIdFromStarName = (starName: string) => {
  const { satSet, dotsManager } = keepTrackApi.programs;
  const i = satSet.satData
    .slice(dotsManager.starIndex1, dotsManager.starIndex2)
    .findIndex((object: SatObject) => object?.type === SpaceObjectType.STAR && object?.name === starName);
  return i === -1 ? null : i + dotsManager.starIndex1;
};
export const getSensorFromSensorName = (sensorName: string): number => {
  const { satSet } = keepTrackApi.programs;
  return satSet.satData.findIndex(
    // Find the first static object that isn't a missile or a star
    (object: SatObject) => (object?.static && !object?.missile && object?.type !== SpaceObjectType.STAR ? object.name === sensorName : false) // Test
  );
};
export const getScreenCoords = (i: number, pMatrix: mat4, camMatrix: mat4, pos?: { x: number; y: number; z: number }) => {
  const screenPos = { x: 0, y: 0, z: 0, error: false };
  try {
    const { satSet } = keepTrackApi.programs;
    if (!pos) pos = satSet.getSatPosOnly(i).position;
    const posVec4 = <[number, number, number, number]>(<any>glm.vec4.fromValues(pos.x, pos.y, pos.z, 1));

    glm.vec4.transformMat4(<any>posVec4, posVec4, camMatrix);
    glm.vec4.transformMat4(<any>posVec4, posVec4, pMatrix);

    screenPos.x = posVec4[0] / posVec4[3];
    screenPos.y = posVec4[1] / posVec4[3];
    screenPos.z = posVec4[2] / posVec4[3];

    screenPos.x = (screenPos.x + 1) * 0.5 * window.innerWidth;
    screenPos.y = (-screenPos.y + 1) * 0.5 * window.innerHeight;

    screenPos.error = !(screenPos.x >= 0 && screenPos.y >= 0 && screenPos.z >= 0 && screenPos.z <= 1);
  } catch {
    screenPos.error = true;
  }
  return screenPos;
};

export const getIdFromObjNum = (objNum: number, isExtensiveSearch = true): number => {
  const { satSet } = keepTrackApi.programs;
  if (typeof satSet.sccIndex?.[`${objNum}`] !== 'undefined') {
    return satSet.sccIndex[`${objNum}`];
  } else if (isExtensiveSearch) {
    for (let i = 0; i < satSet.satData.length; i++) {
      if (parseInt(satSet.satData[i].sccNum) == objNum) return i;
    }
  }
  return null;
};
export const getSatPosOnly = (i: number): SatObject => {
  const { dotsManager, satSet } = keepTrackApi.programs;
  if (!satSet.satData) return null;
  if (!satSet.satData[i]) return null;

  if (satSet.gotExtraData) {
    satSet.satData[i].position = {
      x: dotsManager.positionData[i * 3],
      y: dotsManager.positionData[i * 3 + 1],
      z: dotsManager.positionData[i * 3 + 2],
    };
  }

  return satSet.satData[i];
};
export const getIdFromEci = (eci: { x: number; y: number; z: number }): number => {
  const { dotsManager, satSet } = keepTrackApi.programs;
  for (let id = 0; id < satSet.orbitalSats; id++) {
    const x = dotsManager.positionData[id * 3];
    const y = dotsManager.positionData[id * 3 + 1];
    const z = dotsManager.positionData[id * 3 + 2];
    if (x > eci.x - 100 && x < eci.x + 100) {
      if (y > eci.y - 100 && y < eci.y + 100) {
        if (z > eci.z - 100 && z < eci.z + 100) {
          return id;
        }
      }
    }
  }
  return -1;
};

// prettier-ignore
export const getSat = (i: number): SatObject => { // NOSONAR
  const { satSet } = keepTrackApi.programs;
  if (!satSet.satData || !satSet.satData[i]) return null;
  const { dotsManager } = keepTrackApi.programs;

  if (satSet.gotExtraData && dotsManager.velocityData) {
    satSet.satData[i].velocity ??= { total: 0, x: 0, y: 0, z: 0 };

    // TODO: This is to accomadate the old end of world .json files that used velocity = 0
    satSet.satData[i].velocity = <any>satSet.satData[i].velocity === 0 ? { total: 0, x: 0, y: 0, z: 0 } : satSet.satData[i].velocity;

    satSet.satData[i].velocity.x = dotsManager.velocityData[i * 3] || 0;
    satSet.satData[i].velocity.y = dotsManager.velocityData[i * 3 + 1] || 0;
    satSet.satData[i].velocity.z = dotsManager.velocityData[i * 3 + 2] || 0;
    satSet.satData[i].velocity.total = Math.sqrt(satSet.satData[i].velocity.x ** 2 + satSet.satData[i].velocity.y ** 2 + satSet.satData[i].velocity.z ** 2);
    satSet.satData[i].position = {
      x: dotsManager.positionData[i * 3],
      y: dotsManager.positionData[i * 3 + 1],
      z: dotsManager.positionData[i * 3 + 2],
    };
  }

  if (satSet.satData[i].type === SpaceObjectType.STAR) return satSet.satData[i];

  // Add Functions One Time
  addSatExtraFunctions(i);

  return satSet.satData[i];
};
