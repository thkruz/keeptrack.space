import { BaseObject, Degrees, DetailedSatellite, Kilometers, Meters, Milliseconds, Radians, SpaceObjectType, Vec3Flat, ZoomValue } from '@ootk/src/main';
import type { ColorSchemeParams } from '../rendering/color-schemes/color-scheme';

/** Array of ECI Coordinates [x, y, z] */
export type EciArr3 = Vec3Flat<number>;

/** Array of ECF Coordinates [x, y, z] */
export type EcfArr3 = Vec3Flat<number>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<I> = new (...args: any[]) => I;

export interface SatShader {
  blurFactor1: string;
  blurFactor2: string;
  blurFactor3: string;
  blurFactor4: string;
  distanceBeforeGrow: string;
  dynamicSizeScalar: number;
  isUseDynamicSizing: boolean;
  largeObjectMaxZoom: number;
  largeObjectMinZoom: number;
  maxAllowedSize: number;
  maxSizePlanetarium: number;
  minSizePlanetarium: number;
  starSize: string;
}

export enum GetSatType {
  DEFAULT = 0,
  EXTRA_ONLY = 1,
  POSITION_ONLY = 2,
  SKIP_POS_VEL = 3,
}

export type MissileParams = {
  desc: string;
  active: boolean;
  latList: Degrees[];
  lonList: Degrees[];
  altList: Kilometers[];
  timeList: number[];
  startTime: number;
  maxAlt: number;
  country: string;
  launchVehicle: string;
};

export type EChartsData = {
  name: string;
  satId?: number;
  country?: string;
  value?: [number, number, number, string?, string?][];
  data?: [number, number, number?][];
}[];

export type rgbaArray = [number, number, number, number];

export interface SatCruncherMessageData {
  data: {
    typ?: string;
    time?: number;
    propRate?: number;
    staticOffset?: number;
    dynamicOffsetEpoch?: number;
    badSatNumber?: number;
  };
}

export interface SensorObjectCruncher {
  alt: Kilometers;
  beamwidth?: Degrees;
  changeObjectInterval?: Milliseconds;
  country: string;
  lat: Degrees;
  linkAehf?: boolean;
  linkWgs?: boolean;
  lon: Degrees;
  name: string;
  observerGd: {
    lat: Radians;
    lon: Radians;
    alt: Kilometers;
  };
  maxAz: Degrees;
  maxAz2?: Degrees;
  maxEl: Degrees;
  maxEl2?: Degrees;
  maxRng: Kilometers;
  maxRng2?: Kilometers;
  minAz: Degrees;
  minAz2?: Degrees;
  minEl: Degrees;
  minEl2?: Degrees;
  minRng: Kilometers;
  minRng2?: Kilometers;
  shortName: string;
  sensorId: number;
  sun: string;
  type?: SpaceObjectType;
  url?: string;
  volume: boolean;
  zoom: ZoomValue;
  objName: string;
  uiName: string;
  system: string;
  operator: string;
}

export type lookanglesRow = {
  START_DTG: number | string | null;
  SATELLITE_ID: string | null;
  PASS_SCORE: string | null;
  START_DATE: Date | string | null;
  START_TIME: Date | string | null;
  START_AZIMUTH: string | null;
  START_ELEVATION: string | null;
  START_RANGE: string | null;
  STOP_DATE: Date | string | null;
  STOP_TIME: Date | string | null;
  STOP_AZIMTUH: string | null;
  STOP_ELEVATION: string | null;
  STOP_RANGE: string | null;
  TIME_IN_COVERAGE_SECONDS: number | null;
  MINIMUM_RANGE: string | null;
  MAXIMUM_ELEVATION: string | null;
  SENSOR_TO_SUN_AZIMUTH: string | null;
  SENSOR_TO_SUN_ELEVATION: string | null;
};

export type SatPassTimes = {
  sat: DetailedSatellite;
  time: Date;
};

export enum ToastMsgType {
  standby = 'standby',
  normal = 'normal',
  caution = 'caution',
  serious = 'serious',
  critical = 'critical',
  error = 'error',
}

export type GeolocationPosition = {
  coords: {
    latitude: Degrees | number;
    longitude: Degrees | number;
    altitude: Meters | number;
  };
};

export interface SensorGeolocation {
  alt: Kilometers | null;
  lat: Degrees | null;
  lon: Degrees | null;
  maxaz: Degrees | null;
  maxel: Degrees | null;
  maxrange: Kilometers | null;
  minaz: Degrees | null;
  minel: Degrees | null;
  minrange: Kilometers | null;
}

export interface ObjectTypeFlags {
  age1: boolean;
  age2: boolean;
  age3: boolean;
  age4: boolean;
  age5: boolean;
  age6: boolean;
  age7: boolean;
  countryCIS: boolean;
  countryOther: boolean;
  countryPRC: boolean;
  countryUS: boolean;
  debris: boolean;
  densityHi: boolean;
  densityLow: boolean;
  densityMed: boolean;
  densityOther: boolean;
  densityPayload: boolean;
  facility: boolean;
  inFOV: boolean;
  inViewAlt: boolean;
  missile: boolean;
  missileInview: boolean;
  payload: boolean;
  pink: boolean;
  rcsLarge: boolean;
  rcsMed: boolean;
  rcsSmall: boolean;
  rcsUnknown: boolean;
  rocketBody: boolean;
  satGEO: boolean;
  satHi: boolean;
  satLEO: boolean;
  satLow: boolean;
  satMed: boolean;
  satSmall: boolean;
  sensor: boolean;
  starHi: boolean;
  starLow: boolean;
  starMed: boolean;
  velocityFast: boolean;
  velocityMed: boolean;
  velocitySlow: boolean;
}

export enum Pickable {
  Yes = 1,
  No = 0,
}

export enum MenuMode {
  BASIC,
  ADVANCED,
  ANALYSIS,
  EXPERIMENTAL,
  SETTINGS,
  ALL,
}

export type ColorInformation = {
  color: [number, number, number, number];
  marker?: boolean;
  pickable: Pickable;
};

export interface ColorRuleParams {
  satInSun?: Int8Array;
  satInView?: Int8Array;
}

export type ColorRuleSet = (obj: BaseObject, params?: ColorSchemeParams) => ColorInformation;

/**
 ***********************************************************
 * Singletons
 *
 * Using these interfaces will allow us to create replaceable
 * singletons. In the future, we can create new classes that
 * implement these interfaces and replace the singletons with
 * the new classes. Example: A new class that implements the
 * CatalogManager interface but is more resource intensive
 * for better accuracy.
 *
 * *********************************************************
 */

export enum Singletons {
  CatalogManager = 'CatalogManager',
  OrbitManager = 'OrbitManager',
  GroupsManager = 'GroupManager',
  UiManager = 'UiManager',
  ColorSchemeManager = 'ColorScheme',
  HoverManager = 'HoverManager',
  LineManager = 'LineManager',
  StarManager = 'StarManager',
  TimeManager = 'TimeManager',
  WebGLRenderer = 'DrawManager',
  DotsManager = 'DotsManager',
  SensorManager = 'SensorManager',
  SelectSatManager = 'SelectSatManager',
  InputManager = 'InputManager',
  SoundManager = 'SoundManager',
  SensorMath = 'SensorMathManager',
  MainCamera = 'MainCamera',
  PersistenceManager = 'PersistenceManager',
  Scene = 'Scene',
  MeshManager = 'MeshManager',
}
export enum SolarBody {
  Sun = 'Sun',
  Mercury = 'Mercury',
  Venus = 'Venus',
  Earth = 'Earth',
  Moon = 'Moon',
  Mars = 'Mars',
  Jupiter = 'Jupiter',
  Saturn = 'Saturn',
  Uranus = 'Uranus',
  Neptune = 'Neptune',
  Pluto = 'Pluto',
  Makemake = 'Makemake',
  Eris = 'Eris',
  Haumea = 'Haumea',
  Ceres = 'Ceres',
  Io = 'Io',
  Europa = 'Europa',
  Ganymede = 'Ganymede',
  Callisto = 'Callisto',
  Titan = 'Titan',
  Rhea = 'Rhea',
  Iapetus = 'Iapetus',
  Dione = 'Dione',
  Tethys = 'Tethys',
  Enceladus = 'Enceladus'
}
