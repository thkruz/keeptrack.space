import * as satellite from 'satellite.js';
import { SensorObjectCruncher } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';

// //////////////////////////////////////////////////////////////////////////////
// Typing
// //////////////////////////////////////////////////////////////////////////////
export interface SatCacheObject extends satellite.SatRec {
  id?: number;
  isimp: boolean;
  apogee: number;
  isRadarData: any;
  static: boolean;
  marker: any;
  type: SpaceObjectType;
  lat: number;
  lon: number;
  alt: number;
  missile: any;
  active: any;
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
  latitude: <number | null>null,
  longitude: 0,
  height: 0,
};

export const emptySensor: SensorObjectCruncher = {
  observerGd: {
    latitude: null,
    longitude: 0,
    height: 0,
  },
  alt: null,
  country: '',
  lat: null,
  lon: null,
  name: '',
  obsmaxaz: 0,
  obsmaxel: 0,
  obsmaxrange: 0,
  obsminaz: 0,
  obsminel: 0,
  obsminrange: 0,
  shortName: '',
  staticNum: 0,
  sun: '',
  volume: false,
  zoom: '',
};

export type RangeAzEl = {
  azimuth: satellite.Radians;
  elevation: satellite.Radians;
  rangeSat: number;
};

export interface PositionCruncherIncomingMsg {
  data: any;
}
