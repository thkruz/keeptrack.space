/**
 * Position Cruncher Web Worker Message Types
 *
 * Typed message interfaces for communication between the main thread
 * and the positionCruncher web worker. Follows the same pattern as
 * color-worker-messages.ts.
 */

import { Degrees, Kilometers } from '@ootk/src/main';
import { SensorObjectCruncher } from '../engine/core/interfaces';

// ─── Message Type Enum ──────────────────────────────────────────────────────

export const enum PosCruncherMsgType {
  OBJ_DATA = 0,
  OFFSET = 1,
  SAT_EDIT = 2,
  NEW_MISSILE = 3,
  SENSOR = 4,
  UPDATE_MARKERS = 5,
  SUNLIGHT_VIEW = 6,
  SATELLITE_SELECTED = 7,
  CAMERA_DATA = 8,
}

export enum MarkerMode {
  OFF,
}

// ─── Incoming Messages (Main Thread → Worker) ───────────────────────────────

export interface PosCruncherMsgObjData {
  typ: PosCruncherMsgType.OBJ_DATA;
  dat: string;
  fieldOfViewSetLength: number;
  isLowPerf?: boolean;
  seqNum?: number;
}

export interface PosCruncherMsgOffset {
  typ: PosCruncherMsgType.OFFSET;
  staticOffset: number;
  dynamicOffsetEpoch: number;
  propRate: number;
}

export interface PosCruncherMsgSatEdit {
  typ: PosCruncherMsgType.SAT_EDIT;
  id: number;
  tle1: string;
  tle2: string;
  active?: boolean;
}

export interface PosCruncherMsgNewMissile {
  typ: PosCruncherMsgType.NEW_MISSILE;
  id: number;
  active: boolean;
  type?: number;
  latList: Degrees[];
  lonList: Degrees[];
  altList: Kilometers[];
  startTime: number;
}

export interface PosCruncherMsgSensor {
  typ: PosCruncherMsgType.SENSOR;
  sensor: Partial<SensorObjectCruncher>[];
}

export interface PosCruncherMsgUpdateMarkers {
  typ: PosCruncherMsgType.UPDATE_MARKERS;
  fieldOfViewSetLength?: number;
  markerMode?: MarkerMode;
}

export interface PosCruncherMsgSunlightView {
  typ: PosCruncherMsgType.SUNLIGHT_VIEW;
  isSunlightView: boolean;
}

export interface PosCruncherMsgSatSelected {
  typ: PosCruncherMsgType.SATELLITE_SELECTED;
  satelliteSelected: number[];
}

export interface PosCruncherMsgCameraData {
  typ: PosCruncherMsgType.CAMERA_DATA;
  vpMatrix: Float32Array;
  camPosEci: Float32Array;
  isFrustumCullingEnabled: boolean;
}

export type PosCruncherInMsg =
  | PosCruncherMsgObjData
  | PosCruncherMsgOffset
  | PosCruncherMsgSatEdit
  | PosCruncherMsgNewMissile
  | PosCruncherMsgSensor
  | PosCruncherMsgUpdateMarkers
  | PosCruncherMsgSunlightView
  | PosCruncherMsgSatSelected
  | PosCruncherMsgCameraData;

// ─── Outgoing Messages (Worker → Main Thread) ──────────────────────────────

export interface PosCruncherOutPosition {
  satPos: Float32Array;
  gmst: number;
  satInView?: Int8Array;
  satInSun?: Int8Array;
  sensorMarkerArray?: number[];
  seqNum?: number;
}

export interface PosCruncherOutVelocity {
  satVel: Float32Array;
}

export interface PosCruncherOutExtraData {
  extraUpdate: true;
  extraData: string;
  satId: number;
}

export interface PosCruncherOutBadObject {
  badObjectId: number;
}

export type PosCruncherOutMsg = PosCruncherOutPosition | PosCruncherOutVelocity | PosCruncherOutExtraData | PosCruncherOutBadObject;
