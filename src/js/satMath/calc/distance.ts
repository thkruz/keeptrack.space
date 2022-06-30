import { EciPos } from '@app/js/api/keepTrackTypes';

export const distance = (obj1: EciPos, obj2: EciPos): number => {
  const distX = Math.pow(obj1.x - obj2.x, 2);
  const distY = Math.pow(obj1.y - obj2.y, 2);
  const distZ = Math.pow(obj1.z - obj2.z, 2);
  const distAbs = Math.sqrt(distX + distY + distZ);
  return distAbs;
};
