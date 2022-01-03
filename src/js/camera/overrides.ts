import { camera } from './camera';

export const setCamAngleSnappedOnSat = (val: boolean) => (camera.camAngleSnappedOnSat = val);
export const setCamZoomSnappedOnSat = (val: boolean) => (camera.camZoomSnappedOnSat = val);
export const setIsScreenPan = (val: boolean) => (camera.isScreenPan = val);
export const setIsWorldPan = (val: boolean) => (camera.isWorldPan = val);
export const setIsPanReset = (val: boolean) => (camera.isPanReset = val);
export const setIsLocalRotateRoll = (val: boolean) => (camera.isLocalRotateRoll = val);
export const setIsLocalRotateYaw = (val: boolean) => (camera.isLocalRotateYaw = val);
export const setIsLocalRotateOverride = (val: boolean) => (camera.isLocalRotateOverride = val);
export const setFtsRotateReset = (val: boolean) => (camera.ftsRotateReset = val);
