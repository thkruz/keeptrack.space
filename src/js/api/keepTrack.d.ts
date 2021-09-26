export declare interface satObject {
  TLE1: string,
  TLE2: string,
  SCC_NUM: string,
  active: boolean,
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
  longitude: number;
  perigee: number;
  apogee: number;
  period: number;
  meanMotion: number;
  semimajorAxis: number;
  eccentricity: number;
  raan: number;
  argPe: number;
  inview: number;
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
}

export interface sensorObject {
  alt: number;
  beamwidth?: number;
  changeObjectInterval?: number;
  country: string;
  lat: number;
  linkAehf?: boolean;
  linkWgs?: boolean;
  lon: number;
  name: string;
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

export interface Inview {
  inview: boolean;
}

export interface keepTrackApiInterface {
  html: (strings: TemplateStringsArray, ...placeholders: any[]) => string;
  register: (params: { method: string; cbName: string; cb: any }) => void;
  unregister: (params: { method: string; cbName: string }) => void;
  callbacks: any;
  methods: any;
  programs: any;
}