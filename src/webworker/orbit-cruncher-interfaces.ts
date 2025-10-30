import { Degrees, Kilometers, SatelliteRecord } from '@app/engine/ootk/src/main';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';

/**
 * Message Types for communication with the Orbit Cruncher Worker
 * These must match those in orbitCruncher.ts
 */

export enum OrbitCruncherMsgType {
  INIT,
  UPDATE,
  CHANGE_ORBIT_TYPE,
  MISSILE_UPDATE,
  SATELLITE_UPDATE,
  SETTINGS_UPDATE,
  RESPONSE_READY,
  RESPONSE_DATA
}
export interface OrbitCruncherInMsgInit {
  type: OrbitCruncherMsgType.INIT;
  orbitFadeFactor?: number;
  objData: string;
  numSegs: number;
  numberOfOrbitsToDraw?: number;
}

export interface CruncherInMsgTimeSync {
  type: CruncerMessageTypes.OFFSET,
  staticOffset: number,
  dynamicOffsetEpoch: number,
  propRate: number,
}

export interface OrbitCruncherInMsgOffset {
  type: OrbitCruncherMsgType.UPDATE;
  dynamicOffsetEpoch: number;
  staticOffset: number;
  propRate: number;
}

export interface OrbitCruncherInMsgSatelliteUpdate {
  type: OrbitCruncherMsgType.SATELLITE_UPDATE;
  id: number;
  dynamicOffsetEpoch: number;
  staticOffset: number;
  propRate: number;
  tle1?: string;
  tle2?: string;
  isEcfOutput: boolean;
}
export interface OrbitCruncherInMsgMissileUpdate {
  type: OrbitCruncherMsgType.MISSILE_UPDATE;
  id: number;
  dynamicOffsetEpoch: number;
  staticOffset: number;
  propRate: number;
  latList?: Degrees[];
  lonList?: Degrees[];
  altList?: Kilometers[];
  isEcfOutput: boolean;
}
export interface OrbitCruncherInMsgChangeOrbitType {
  type: OrbitCruncherMsgType.CHANGE_ORBIT_TYPE;
  orbitType: OrbitDrawTypes;
}

export interface OrbitCruncherInMsgSettingsUpdate {
  type: OrbitCruncherMsgType.SETTINGS_UPDATE;
  numberOfOrbitsToDraw: number;
}

export enum OrbitDrawTypes {
  ORBIT,
  TRAIL
}

export interface OrbitCruncherOutMsgPoints {
  type: OrbitCruncherMsgType.RESPONSE_DATA;
  pointsOut: Float32Array;
  satId: number;
}

export interface OrbitCruncherOutMsgReady {
  type: OrbitCruncherMsgType.RESPONSE_READY;
}
export type OrbitCruncherInMsgs = OrbitCruncherInMsgInit | OrbitCruncherInMsgSatelliteUpdate |
  OrbitCruncherInMsgMissileUpdate | CruncherInMsgTimeSync |
  OrbitCruncherInMsgChangeOrbitType | OrbitCruncherInMsgSettingsUpdate;

export interface OrbitCruncherOtherObject {
  // Placeholder for non-satellite, non-missile objects
  ignore: true;
}

export interface OrbitCruncherSatelliteObject {
  satrec: SatelliteRecord;
  tle1: string;
  tle2: string;
}

export interface OrbitCruncherMissileObject {
  missile: true;
  latList: Degrees[];
  lonList: Degrees[];
  altList: Kilometers[];
}

export type OrbitCruncherCachedObject = OrbitCruncherOtherObject | OrbitCruncherSatelliteObject | OrbitCruncherMissileObject;
