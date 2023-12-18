import * as Ootk from 'ootk';
import { Degrees, Kilometers, Radians } from 'ootk';
import { SensorObjectCruncher } from '../interfaces';

// //////////////////////////////////////////////////////////////////////////////
// Typing
// //////////////////////////////////////////////////////////////////////////////

export interface SatCacheObject extends Ootk.SatelliteRecord {
  dec: Radians;
  ra: Radians;
  id?: number;
  isimp: number;
  apogee: Kilometers;
  perigee: Kilometers;
  isRadarData: any;
  static: boolean;
  marker: any;
  isStar: boolean;
  lat: Degrees;
  lon: Degrees;
  alt: Kilometers;
  missile: any;
  active: boolean;
  altList: any;
  startTime: number;
  lastTime: any;
  latList: any;
  lonList: any;
  skip?: boolean;
}
export type PositionCruncherOutgoingMsg = {
  satInView?: Int8Array;
  satInSun?: Int8Array;
  sensorMarkerArray?: number[];
  satPos?: Float32Array;
  satVel?: Float32Array;
};
export type oneOrZero = 0 | 1;

// //////////////////////////////////////////////////////////////////////////////
// Code
// //////////////////////////////////////////////////////////////////////////////
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
  obsmaxaz: <Degrees>0,
  obsmaxel: <Degrees>0,
  obsmaxrange: <Kilometers>0,
  obsminaz: <Degrees>0,
  obsminel: <Degrees>0,
  obsminrange: <Kilometers>0,
  shortName: '',
  staticNum: 0,
  sun: '',
  volume: false,
  zoom: '',
};

export type RangeAzEl = {
  az: Radians;
  el: Radians;
  rng: number;
};

export interface PositionCruncherIncomingMsg {
  data: {
    TLE2: string;
    TLE1: string;
    dat: string; // JSON string
    typ: any;
    staticOffset?: number;
    dynamicOffsetEpoch?: number;
    propRate?: number;
    id?: number;
    satelliteSelected?: number[];
    multiSensor?: boolean;
    setlatlong?: any;
    resetObserverGd?: any;
    selectedSatFOV?: any;
    isShowSatOverfly?: string;
    isSunlightView?: any;
    isSlowCPUModeEnabled?: any;
    isLowPerf?: any;
    fieldOfViewSetLength?: number;
    isShowFOVBubble?: string;
    isShowSurvFence?: string;
    sensor?: SensorObjectCruncher[];
  };
}
