/* eslint-disable no-unused-vars */
export declare interface SatObject {
  id: number;
  satId?: number;
  position: { x: number; y: number; z: number };
  static?: boolean;
  missile?: boolean;
  type?: string;
  name?: string;
  intlDes?: string;
  TLE1: string;
  TLE2: string;
  SCC_NUM: string;
  active: boolean;
  C?: string;
  LS?: string;
  LV?: string;
  ON: string;
  OT: number;
  TLE1: string;
  TLE2: string;
  R: string;
  URL?: string;
  O?: string;
  U?: string;
  P?: string;
  LM?: string;
  DM?: string;
  Pw?: string;
  Li?: string | number;
  Con?: string;
  M?: string;
  S1?: string;
  S2?: string;
  S3?: string;
  S4?: string;
  S5?: string;
  S6?: string;
  S7?: string;
  inclination: number;
  lon: number;
  perigee: number;
  apogee: number;
  period: number;
  meanMotion: number;
  semimajorAxis: number;
  eccentricity: number;
  raan: number;
  argPe: number;
  inView: number;
  velocity: {
    total: number;
    x: number;
    y: number;
    z: number;
  };
  getTEARR?: any;
  getAltitude?: any;
  getDirection?: any;
  vmag?: number;
  associates?: any;
  maneuver?: any;
  constellation?: any;
  ORPO?: any;
  FMISSED?: any;
  NOTES?: any;
  TTP?: any;
  isInSun?: any;
  inSun?: any;
  desc?: string;
  marker?: boolean;
  isRadarData?: boolean;
  isInGroup?: boolean;
  missileComplex?: number;
}

export interface SensorObject {
  obsmaxel2?: any;
  obsmaxrange2?: any;
  obsminrange2?: any;
  obsminel2?: any;
  obsmaxaz2?: any;
  obsminaz2?: any;
  alt: number;
  beamwidth?: number;
  changeObjectInterval?: number;
  country: string;
  lat: number;
  linkAehf?: boolean;
  linkWgs?: boolean;
  lon: number;
  name: string;
  alt: number;
  observerGd: {
    lat: number;
    lon: number;
    alt: number;
  };
  obsmaxaz: number;
  obsmaxel: number;
  obsmaxrange: number;
  obsminaz: number;
  obsminel: number;
  obsminrange: number;
  shortName: string;
  staticNum: number;
  sun: string;
  type?: string;
  url?: string;
  volume: boolean;
  zoom: string;
}

export interface Lla {
  lat: number;
  lon: number;
  alt: number;
}

export interface Rae {
  rng: number;
  az: number;
  el: number;
}

export interface InView {
  inView: boolean;
}

export interface EarthObject {
  init: any;
  draw: any;
  program: any;
  update: any;
  drawOcclusion: any;
  earthJ: number;
  earthEra: number;
  lightDirection: any;
  pos: [number, number, number];
  loaded: boolean;
  sunvar: any;
  shader: any;
  specularMap: any;
  imgHiRes: any;
  isHiResReady: boolean;
  nightImgHiRes: any;
  nightImg: any;
  bumpMap: any;
  loadHiResNight: any;
  loadHiRes: any;
  isUseHiRes: boolean;
  lightDirection: [number, number, number];
}

export interface keepTrackApiInterface {
  html: (strings: TemplateStringsArray, ...placeholders: any[]) => string;
  register: (params: { method: string; cbName: string; cb: any }) => void;
  unregister: (params: { method: string; cbName: string }) => void;
  callbacks: any;
  methods: any;
  programs: any;
}
