/**
 * Message types and interfaces for communication between main thread
 * and the color cruncher web worker.
 */

import { ColorDataArrays } from './color-data-arrays';

export const enum ColorWorkerMsgType {
  /** Send full catalog typed arrays to worker */
  INIT_CATALOG = 0,
  /** Change active color scheme */
  UPDATE_SCHEME = 1,
  /** Update filter settings */
  UPDATE_FILTERS = 2,
  /** Send latest inView / inSun / velocity data from position cruncher */
  UPDATE_DYNAMIC = 3,
  /** Send group membership ids (or null to clear) */
  UPDATE_GROUP = 4,
  /** Update settings flags (camera type, show flags, etc.) */
  UPDATE_SETTINGS = 5,
  /** Send color scheme params (density arrays, year/jday) */
  UPDATE_PARAMS = 6,
  /** Force full recolor */
  FORCE_RECOLOR = 7,
  /** Update objectTypeFlags for the current scheme */
  UPDATE_OBJ_TYPE_FLAGS = 8,
  /** Update color theme values */
  UPDATE_COLOR_THEME = 9,
}

/** Filter state — mirrors settingsManager.filter booleans */
export interface FilterState {
  // Object type filters
  debris: boolean;
  operationalPayloads: boolean;
  nonOperationalPayloads: boolean;
  rocketBodies: boolean;
  unknownType: boolean;
  notionalSatellites: boolean;
  // Orbital regime filters
  vLEOSatellites: boolean;
  lEOSatellites: boolean;
  mEOSatellites: boolean;
  hEOSatellites: boolean;
  gEOSatellites: boolean;
  xGEOSatellites: boolean;
  // Country filters
  unitedStates: boolean;
  unitedKingdom: boolean;
  france: boolean;
  germany: boolean;
  japan: boolean;
  china: boolean;
  india: boolean;
  russia: boolean;
  uSSR: boolean;
  southKorea: boolean;
  australia: boolean;
  otherCountries: boolean;
  // Source filters
  vimpelSatellites: boolean;
  celestrakSatellites: boolean;
  celestrakSupSatellites: boolean;
  satnogsSatellites: boolean;
  starlinkSatellites: boolean;
}

/** Global settings that affect coloring */
export interface SettingsFlags {
  cameraType: number; // CameraType enum value
  isShowPayloads: boolean;
  isShowRocketBodies: boolean;
  isShowDebris: boolean;
  isDisableLaunchSites: boolean;
  isDisableSensors: boolean;
  isSensorManagerLoaded: boolean;
  sensorType: number; // SpaceObjectType of current sensor (0 if none)
  maxZoomDistance: number;
  isMissileSimulatorEnabled: boolean;
}

/** Incoming message from main thread → worker */
export interface ColorWorkerInMsg {
  typ: ColorWorkerMsgType;
  seqNum?: number; // Sequence number for catalog version tracking

  // INIT_CATALOG
  catalogData?: ColorDataArrays;

  // UPDATE_SCHEME
  schemeId?: string;
  isGroupScheme?: boolean;

  // UPDATE_FILTERS
  filterSettings?: FilterState;

  // UPDATE_DYNAMIC
  inViewData?: Int8Array;
  inSunData?: Int8Array;
  satVel?: Float32Array;
  dotsOnScreen?: number;

  // UPDATE_GROUP
  groupIds?: number[] | null;

  // UPDATE_SETTINGS
  settingsFlags?: SettingsFlags;

  // UPDATE_PARAMS
  params?: {
    year: number;
    jday: number;
    orbitDensity: { minAltitude: number; maxAltitude: number; count: number; density: number }[];
    orbitDensityMax: number;
    orbitalPlaneDensity: number[][];
    orbitalPlaneDensityMax: number;
  };

  // UPDATE_OBJ_TYPE_FLAGS
  objectTypeFlags?: Record<string, boolean>;

  // UPDATE_COLOR_THEME
  colorTheme?: Record<string, number[]>;
}

/** Outgoing message from worker → main thread */
export interface ColorWorkerOutMsg {
  colorData: Float32Array;
  pickableData: Int8Array;
  seqNum: number;
}
