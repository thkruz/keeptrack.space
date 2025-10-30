import { Degrees, Kilometers, Radians, SatelliteRecord, ZoomValue } from '@ootk/src/main';
import { SensorObjectCruncher } from '../engine/core/interfaces';
import { CruncerMessageTypes, MarkerMode } from './positionCruncher';

// Typing

// TODO: This should be multiple classes
export interface PosCruncherCachedObject {
  // All
  active: boolean;
  // Satellite
  apogee?: Kilometers;
  perigee?: Kilometers;
  isimp?: boolean;
  isUpdated?: boolean;
  satrec?: SatelliteRecord;
  // Sensor
  lat?: Degrees;
  lon?: Degrees;
  alt?: Kilometers;
  // Missiles
  latList?: Degrees[];
  lonList?: Degrees[];
  altList?: Kilometers[];
  startTime?: number;
  lastTime?: number;
  // Stars
  ra?: Radians;
  dec?: Radians;
  // Markers
  isMarker?: boolean;
}

export type PositionCruncherOutgoingMsg = {
  satInView?: Int8Array;
  satInSun?: Int8Array;
  sensorMarkerArray?: number[];
  satPos?: Float32Array;
  satVel?: Float32Array;
};
export type oneOrZero = 0 | 1;

// Code
export const defaultGd = {
  lat: <Radians>null,
  lon: <Radians>0,
  alt: <Kilometers>0,
};

export const emptySensor: SensorObjectCruncher = {
  observerGd: {
    lat: <Radians>null,
    lon: <Radians>0,
    alt: <Kilometers>0,
  },
  alt: null,
  country: '',
  lat: null,
  lon: null,
  name: '',
  maxAz: <Degrees>0,
  maxEl: <Degrees>0,
  maxRng: <Kilometers>0,
  minAz: <Degrees>0,
  minEl: <Degrees>0,
  minRng: <Kilometers>0,
  shortName: '',
  sensorId: 0,
  sun: '',
  volume: false,
  zoom: ZoomValue.MAX,
  system: '',
  operator: '',
  uiName: '',
  objName: '',
};

export interface PositionCruncherIncomingMsg {
  data: {
    tle1: string;
    tle2: string;
    dat: string; // JSON string
    typ: CruncerMessageTypes;
    staticOffset?: number;
    dynamicOffsetEpoch?: number;
    propRate?: number;
    id?: number;
    satelliteSelected?: number[];
    selectedSatFOV?: number;
    isSunlightView?: boolean;
    isLowPerf?: boolean;
    fieldOfViewSetLength?: number;
    sensor?: SensorObjectCruncher[];
    markerMode?: MarkerMode;
  };
}
