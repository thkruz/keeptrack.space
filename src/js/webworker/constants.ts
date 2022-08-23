import * as Ootk from 'ootk';
import { SensorObjectCruncher } from '../api/keepTrackTypes';
import { SpaceObjectType } from '../api/SpaceObjectType';

// //////////////////////////////////////////////////////////////////////////////
// Typing
// //////////////////////////////////////////////////////////////////////////////

export interface SatCacheObject extends Ootk.SatelliteRecord {
  dec: number;
  ra: number;
  id?: number;
  isimp: number;
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
  lat: <number | null>null,
  lon: 0,
  alt: 0,
};

export const emptySensor: SensorObjectCruncher = {
  observerGd: {
    lat: null,
    lon: 0,
    alt: 0,
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

type Radians = number;

export type RangeAzEl = {
  az: Radians;
  el: Radians;
  rng: number;
};

export interface PositionCruncherIncomingMsg {
  data: any;
}
