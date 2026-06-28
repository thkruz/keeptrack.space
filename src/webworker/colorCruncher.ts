/**
 * Color Cruncher Web Worker
 *
 * Computes color (RGBA) and pickability for every object in the catalog,
 * then transfers the buffers back to the main thread for GPU upload.
 *
 * All color scheme logic is ported here as pure functions operating on
 * struct-of-arrays typed data — no class instances or ServiceLocator access.
 */

/* eslint-disable complexity */
/* eslint-disable max-lines */

import { CameraType } from '../engine/camera/camera-type';
import {
  ColorDataArrays,
  CountryCode,
  MissionCategory,
  ObjFlags,
  SourceCode,
} from '../engine/rendering/color-worker/color-data-arrays';
import {
  ColorWorkerInMsg,
  ColorWorkerMsgType,
  FilterState,
  SettingsFlags,
} from '../engine/rendering/color-worker/color-worker-messages';

// ─── Worker State ────────────────────────────────────────────────────────────

let catalogData: ColorDataArrays | null = null;
let catalogSeqNum = 0;

let filterState: FilterState = {
  debris: true,
  operationalPayloads: true,
  nonOperationalPayloads: true,
  rocketBodies: true,
  unknownType: true,
  notionalSatellites: true,
  vLEOSatellites: true,
  lEOSatellites: true,
  mEOSatellites: true,
  hEOSatellites: true,
  gEOSatellites: true,
  xGEOSatellites: true,
  unitedStates: true,
  unitedKingdom: true,
  france: true,
  germany: true,
  japan: true,
  china: true,
  india: true,
  russia: true,
  uSSR: true,
  southKorea: true,
  australia: true,
  otherCountries: true,
  vimpelSatellites: true,
  celestrakSatellites: true,
  celestrakSupSatellites: true,
  satnogsSatellites: true,
  starlinkSatellites: true,
};

let settings: SettingsFlags = {
  cameraType: 0,
  isShowPayloads: true,
  isShowRocketBodies: true,
  isShowDebris: true,
  isDisableLaunchSites: false,
  isDisableSensors: false,
  isSensorManagerLoaded: false,
  sensorType: 0,
  maxZoomDistance: 100000,
  isMissileSimulatorEnabled: true,
};

let inViewData: Int8Array | null = null;
let inSunData: Int8Array | null = null;
let satVel: Float32Array | null = null;
let dotsOnScreen = 0;

let currentSchemeId = 'ObjectTypeColorScheme';
let isGroupScheme = false;
let groupIdSet: Set<number> | null = null;

let objectTypeFlags: Record<string, boolean> = {};
let colorTheme: Record<string, number[]> = {};

let schemeParams = {
  year: 0,
  jday: 0,
  orbitDensity: [] as { minAltitude: number; maxAltitude: number; count: number; density: number }[],
  orbitDensityMax: 0,
  orbitalPlaneDensity: [] as number[][],
  orbitalPlaneDensityMax: 0,
};

// Debounce timer for recalculation
let recalcTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 16; // ~60fps

// ─── SpaceObjectType Constants ───────────────────────────────────────────────
// Mirrored from SpaceObjectType enum to avoid importing non-worker-safe code
const SOT_UNKNOWN = 0;
const SOT_PAYLOAD = 1;
const SOT_ROCKET_BODY = 2;
const SOT_DEBRIS = 3;
const SOT_SPECIAL = 4;
const SOT_INTERGOVERNMENTAL_ORGANIZATION = 10;
const SOT_SUBORBITAL_PAYLOAD_OPERATOR = 11;
const SOT_PAYLOAD_OWNER = 12;
const SOT_METEOROLOGICAL = 13;
const SOT_PAYLOAD_MANUFACTURER = 14;
const SOT_LAUNCH_AGENCY = 15;
const SOT_LAUNCH_SITE = 16;
const SOT_LAUNCH_POSITION = 17;
const SOT_LAUNCH_FACILITY = 18;
const SOT_CONTROL_FACILITY = 19;
const SOT_OBSERVER = 24;
const SOT_NOTIONAL = 29;

// CameraType constants
const CAM_PLANETARIUM = CameraType.PLANETARIUM;
const CAM_ASTRONOMY = CameraType.ASTRONOMY;

// PayloadStatus char codes
const PS_OPERATIONAL = '+'.charCodeAt(0); // 43
const PS_NONOPERATIONAL = '-'.charCodeAt(0); // 45
const PS_UNKNOWN = '?'.charCodeAt(0); // 63

// SunStatus constants
const SUN_UMBRAL = 0;
const SUN_PENUMBRAL = 1;
const SUN_STATUS_SUN = 2;

// Pickable
const PICKABLE_YES = 1;
const PICKABLE_NO = 0;

// ─── Helper: Color Result ────────────────────────────────────────────────────
/** Writes RGBA color and pickable flag into the output arrays at the given index. */
function writeColor(colorData: Float32Array, pickableData: Int8Array, i: number, r: number, g: number, b: number, a: number, pickable: number) {
  const i4 = i * 4;

  colorData[i4] = r;
  colorData[i4 + 1] = g;
  colorData[i4 + 2] = b;
  colorData[i4 + 3] = a;
  pickableData[i] = pickable;
}

/** Writes an RGBA color array and pickable flag into the output arrays at the given index. */
function writeColorArr(colorData: Float32Array, pickableData: Int8Array, i: number, c: number[], pickable: number) {
  const i4 = i * 4;

  colorData[i4] = c[0];
  colorData[i4 + 1] = c[1];
  colorData[i4 + 2] = c[2];
  colorData[i4 + 3] = c[3];
  pickableData[i] = pickable;
}

/** Writes a fully transparent, non-pickable color at the given index. */
function writeTransparent(colorData: Float32Array, pickableData: Int8Array, i: number) {
  writeColor(colorData, pickableData, i, 0, 0, 0, 0, PICKABLE_NO);
}

/** Writes the deselected theme color as a non-pickable entry at the given index. */
function writeDeselected(colorData: Float32Array, pickableData: Int8Array, i: number) {
  const c = colorTheme.deselected;

  if (c) {
    writeColorArr(colorData, pickableData, i, c, PICKABLE_NO);
  } else {
    writeTransparent(colorData, pickableData, i);
  }
}

// ─── Shared Sub-routines ─────────────────────────────────────────────────────

/** Returns true if the object type represents a facility (agency, operator, etc.). */
function isFacilityType(type: number): boolean {
  return type === SOT_INTERGOVERNMENTAL_ORGANIZATION ||
    type === SOT_SUBORBITAL_PAYLOAD_OPERATOR ||
    type === SOT_PAYLOAD_OWNER ||
    type === SOT_METEOROLOGICAL ||
    type === SOT_PAYLOAD_MANUFACTURER ||
    type === SOT_LAUNCH_AGENCY ||
    type === SOT_CONTROL_FACILITY;
}

/** Returns true if the object type represents a launch site or launch facility. */
function isLaunchSiteType(type: number): boolean {
  return type === SOT_LAUNCH_SITE ||
    type === SOT_LAUNCH_POSITION ||
    type === SOT_LAUNCH_FACILITY;
}

/**
 * Port of ColorScheme.checkFacility_() — returns true if it wrote a color
 */
function checkFacility(colorData: Float32Array, pickableData: Int8Array, i: number, type: number): boolean {
  if (isFacilityType(type)) {
    // Agencies/operators are no longer drawn on the globe (and are not loaded
    // into the catalog). Keep them hidden defensively.
    writeDeselected(colorData, pickableData, i);

    return true;
  }

  if (isLaunchSiteType(type)) {
    if (settings.isDisableLaunchSites || objectTypeFlags.facility === false || settings.cameraType === CAM_PLANETARIUM) {
      writeDeselected(colorData, pickableData, i);
    } else {
      writeColorArr(colorData, pickableData, i, colorTheme.facility ?? [0, 0, 1, 1], PICKABLE_YES);
    }

    return true;
  }

  return false;
}

/**
 * Port of ColorScheme.starColor_()
 */
function starColor(colorData: Float32Array, pickableData: Int8Array, i: number): boolean {
  if (!catalogData) {
    return false;
  }

  const vmag = catalogData.vmag[i];

  if (isNaN(vmag)) {
    writeDeselected(colorData, pickableData, i);

    return true;
  }

  const ct = catalogData.starColorTemp[i];

  if (ct > 0) {
    const rgba = colorTempToRgba(ct, vmag);

    if (vmag >= 4.7 && !objectTypeFlags.starLow) {
      writeDeselected(colorData, pickableData, i);

      return true;
    }
    if (vmag >= 3.5 && vmag < 4.7 && !objectTypeFlags.starMed) {
      writeDeselected(colorData, pickableData, i);

      return true;
    }
    if (vmag < 3.5 && !objectTypeFlags.starHi) {
      writeDeselected(colorData, pickableData, i);

      return true;
    }
    writeColor(colorData, pickableData, i, rgba[0], rgba[1], rgba[2], rgba[3], PICKABLE_YES);

    return true;
  }

  if (vmag >= 4.7 && objectTypeFlags.starLow) {
    writeColorArr(colorData, pickableData, i, colorTheme.starLow ?? [0, 0, 0, 1], PICKABLE_YES);
  } else if (vmag >= 3.5 && vmag < 4.7 && objectTypeFlags.starMed) {
    writeColorArr(colorData, pickableData, i, colorTheme.starMed ?? [0, 0, 0, 1], PICKABLE_YES);
  } else if (vmag < 3.5 && objectTypeFlags.starHi) {
    writeColorArr(colorData, pickableData, i, colorTheme.starHi ?? [0, 0, 0, 1], PICKABLE_YES);
  } else {
    writeDeselected(colorData, pickableData, i);
  }

  return true;
}

/** Converts a star's color temperature and visual magnitude to an RGBA color tuple. */
function colorTempToRgba(kelvin: number, vmag: number): [number, number, number, number] {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (temp <= 66) {
    r = 255;
  } else {
    r = Math.max(0, Math.min(255, 329.698727446 * ((temp - 60) ** -0.1332047592)));
  }

  if (temp <= 66) {
    g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
  } else {
    g = Math.max(0, Math.min(255, 288.1221695283 * ((temp - 60) ** -0.0755148492)));
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  }

  const mag = typeof vmag === 'number' ? vmag : 3.0;
  const brightness = Math.max(0.08, Math.min(1.0, 0.65 ** Math.max(0, mag + 1.0)));

  return [r / 255, g / 255, b / 255, brightness];
}

/**
 * Port of ColorScheme.missileColor_()
 */
function missileColor(colorData: Float32Array, pickableData: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const isActive = catalogData.active[i] === 1;

  // Inactive missiles should never be visible or pickable
  if (!isActive) {
    writeTransparent(colorData, pickableData, i);

    return;
  }

  const inView = inViewData ? inViewData[i] === 1 : false;

  if (!inView) {
    if (objectTypeFlags.missile === false) {
      writeDeselected(colorData, pickableData, i);
    } else {
      writeColorArr(colorData, pickableData, i, colorTheme.missile ?? [0, 0, 1, 1], PICKABLE_YES);
    }

    return;
  }

  if (objectTypeFlags.missileInview === false) {
    writeDeselected(colorData, pickableData, i);

    return;
  }

  writeColorArr(colorData, pickableData, i, colorTheme.missileInview ?? [0, 0, 1, 1], PICKABLE_YES);
}

// ─── Filter Check (port of getColorIfDisabledSat_) ──────────────────────────

/** Returns true if the object at index i is hidden by the source/object-type filters. */
function isFilteredBySource_(cd: ColorDataArrays, i: number, type: number, flags: number): boolean {
  if (!filterState.debris && type === SOT_DEBRIS) {
    return true;
  }
  if (!filterState.vimpelSatellites && cd.source[i] === SourceCode.VIMPEL) {
    return true;
  }
  if (!filterState.starlinkSatellites && (flags & ObjFlags.IS_STARLINK)) {
    return true;
  }
  if (!filterState.celestrakSatellites && cd.source[i] === SourceCode.CELESTRAK) {
    return true;
  }
  if (!filterState.celestrakSupSatellites && cd.source[i] === SourceCode.CELESTRAK_SUP) {
    return true;
  }
  if (!filterState.satnogsSatellites && cd.source[i] === SourceCode.SATNOGS) {
    return true;
  }

  return false;
}

/** Returns true if the object at index i is hidden by the country filters. */
function isFilteredByCountry_(country: number): boolean {
  if (!filterState.unitedStates && country === CountryCode.US) {
    return true;
  }
  if (!filterState.unitedKingdom && country === CountryCode.UK) {
    return true;
  }
  if (!filterState.france && country === CountryCode.F) {
    return true;
  }
  if (!filterState.germany && country === CountryCode.D) {
    return true;
  }
  if (!filterState.japan && country === CountryCode.J) {
    return true;
  }
  if (!filterState.china && country === CountryCode.CN) {
    return true;
  }
  if (!filterState.india && country === CountryCode.IN) {
    return true;
  }
  if (!filterState.russia && country === CountryCode.RU) {
    return true;
  }
  if (!filterState.uSSR && country === CountryCode.SU) {
    return true;
  }
  if (!filterState.southKorea && country === CountryCode.KR) {
    return true;
  }
  if (!filterState.australia && country === CountryCode.AU) {
    return true;
  }
  if (!filterState.otherCountries && country === CountryCode.OTHER) {
    return true;
  }

  return false;
}

/** Returns true if the object at index i is hidden by the orbital-regime or payload-status filters. */
function isFilteredByRegime_(cd: ColorDataArrays, i: number, type: number): boolean {
  const apogee = cd.apogee[i];
  const ecc = cd.eccentricity[i];

  if (!filterState.vLEOSatellites && apogee < 400) {
    return true;
  }
  if (!filterState.xGEOSatellites && ((ecc < 0.1 && apogee > 36786) || apogee > 39786)) {
    return true;
  }
  if (!filterState.lEOSatellites && apogee < 6000 && apogee >= 400) {
    return true;
  }

  const status = cd.status[i];

  if (!filterState.operationalPayloads && type === SOT_PAYLOAD &&
    status !== PS_NONOPERATIONAL && status !== PS_UNKNOWN) {
    return true;
  }
  if (!filterState.nonOperationalPayloads && type === SOT_PAYLOAD &&
    (status === PS_NONOPERATIONAL || status === PS_UNKNOWN)) {
    return true;
  }
  if (!filterState.rocketBodies && type === SOT_ROCKET_BODY) {
    return true;
  }
  if (!filterState.unknownType && type === SOT_UNKNOWN) {
    return true;
  }
  if (!filterState.notionalSatellites && type === SOT_NOTIONAL) {
    return true;
  }
  if (!filterState.hEOSatellites && ecc >= 0.1 && apogee <= 39786) {
    return true;
  }
  if (!filterState.mEOSatellites && ecc < 0.1 && apogee >= 6000 && apogee < 34786) {
    return true;
  }
  if (!filterState.gEOSatellites && ecc < 0.1 && apogee >= 34786 && apogee < 36786) {
    return true;
  }

  return false;
}

/** Returns true if the object at index i should be hidden based on current filter settings. */
function isFilteredOut(i: number): boolean {
  if (!catalogData) {
    return false;
  }

  const cd = catalogData;
  const type = cd.type[i];
  const flags = cd.objFlags[i];

  // Only apply filters to satellite-like objects (not stars, sensors, markers, etc.)
  if (flags & (ObjFlags.IS_STAR | ObjFlags.IS_SENSOR | ObjFlags.IS_MARKER | ObjFlags.IS_STATIC)) {
    return false;
  }
  if (flags & ObjFlags.IS_PLANET) {
    return false;
  }

  return isFilteredBySource_(cd, i, type, flags) ||
    isFilteredByCountry_(cd.country[i]) ||
    isFilteredByRegime_(cd, i, type);
}

// ─── Color Scheme Update Functions ───────────────────────────────────────────
// Each function operates on index i, writing to colorData/pickableData.
// Returns void — all output is via the write* helpers.

type SchemeUpdateFn = (cd: Float32Array, pd: Int8Array, i: number) => void;

/**
 * Handles the shared early-return prologue for the ObjectType scheme (planet, OEM, zoom,
 * notional, star, astronomy, facility, marker, sensor, missile, show/hide-by-type).
 * Returns true if a color was written and the caller should return.
 * @param sensorFlagKey objectTypeFlags key gating sensor visibility
 * @param sensorThemeKey colorTheme key for the sensor color
 */
function objectTypePrologue_(
  cd: Float32Array, pd: Int8Array, i: number, flags: number, type: number,
  sensor: { flagKey: string; themeKey: string; fallback: number[] },
): boolean {
  if (!catalogData) {
    return true;
  }

  if (flags & (ObjFlags.IS_PLANET | ObjFlags.IS_OEM)) {
    writeColor(cd, pd, i,
      catalogData.specialColor[i * 4],
      catalogData.specialColor[i * 4 + 1],
      catalogData.specialColor[i * 4 + 2],
      catalogData.specialColor[i * 4 + 3],
      PICKABLE_YES);

    return true;
  }

  if (settings.maxZoomDistance > 2e6) {
    writeDeselected(cd, pd, i);

    return true;
  }

  if (type === SOT_NOTIONAL) {
    writeDeselected(cd, pd, i);

    return true;
  }

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return true;
  }

  if (settings.cameraType === CAM_ASTRONOMY) {
    writeDeselected(cd, pd, i);

    return true;
  }

  if (checkFacility(cd, pd, i, type)) {
    return true;
  }

  if (flags & ObjFlags.IS_MARKER) {
    writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);

    return true;
  }

  if (flags & ObjFlags.IS_SENSOR) {
    if (settings.isDisableSensors || objectTypeFlags[sensor.flagKey] === false || settings.cameraType === CAM_PLANETARIUM) {
      writeDeselected(cd, pd, i);
    } else {
      writeColorArr(cd, pd, i, colorTheme[sensor.themeKey] ?? sensor.fallback, PICKABLE_YES);
    }

    return true;
  }

  if (flags & ObjFlags.IS_MISSILE) {
    missileColor(cd, pd, i);

    return true;
  }

  // Show/hide by type
  if (type === SOT_PAYLOAD && !settings.isShowPayloads) {
    writeDeselected(cd, pd, i);

    return true;
  }
  if (type === SOT_ROCKET_BODY && !settings.isShowRocketBodies) {
    writeDeselected(cd, pd, i);

    return true;
  }
  if (type === SOT_DEBRIS && !settings.isShowDebris) {
    writeDeselected(cd, pd, i);

    return true;
  }

  return false;
}

/**
 * Layer visibility check for the ObjectType scheme. Returns true if the object's layer flag
 * is off in a hide context (not in view / planetarium / observer without vmag), meaning the
 * caller should write deselected and return.
 */
function objectTypeLayerHidden_(type: number, noInView: boolean, isObserver: boolean, noVmag: boolean): boolean {
  const hideCtx = noInView || settings.cameraType === CAM_PLANETARIUM || (isObserver && noVmag);

  if (!hideCtx) {
    return false;
  }

  if (type === SOT_PAYLOAD) {
    return objectTypeFlags.payload === false;
  }
  if (type === SOT_ROCKET_BODY) {
    return objectTypeFlags.rocketBody === false;
  }
  if (type === SOT_DEBRIS) {
    return objectTypeFlags.debris === false;
  }
  if (type === SOT_SPECIAL || type === SOT_UNKNOWN || type === SOT_NOTIONAL) {
    return objectTypeFlags.pink === false;
  }

  return false;
}

/** Picks the final type-based color for the ObjectType scheme. */
function objectTypeFinalColor_(country: number, type: number): number[] {
  if (country === CountryCode.ANALSAT) {
    return colorTheme.analyst ?? [0, 0, 1, 1];
  }
  if (type === SOT_PAYLOAD) {
    return colorTheme.payload ?? [0, 1, 0, 1];
  }
  if (type === SOT_ROCKET_BODY) {
    return colorTheme.rocketBody ?? [1, 0, 0, 1];
  }
  if (type === SOT_DEBRIS) {
    return colorTheme.debris ?? [0.5, 0.5, 0.5, 1];
  }
  if (type === SOT_SPECIAL || type === SOT_UNKNOWN) {
    return colorTheme.pink ?? [1, 0, 1, 1];
  }
  if (type === SOT_NOTIONAL) {
    return colorTheme.notional ?? [0.5, 0.5, 0, 1];
  }

  return colorTheme.unknown ?? [1, 1, 1, 1];
}

/** Colors objects by their space object type (payload, debris, rocket body, etc.). */
function objectTypeScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (objectTypePrologue_(cd, pd, i, flags, type, { flagKey: 'sensor', themeKey: 'sensor', fallback: [0, 0, 1, 1] })) {
    return;
  }

  const inView = inViewData ? inViewData[i] === 1 : false;
  const noInView = !inViewData || inViewData[i] === 0;
  const vmag = catalogData.vmag[i];
  const isObserver = settings.isSensorManagerLoaded && settings.sensorType === SOT_OBSERVER;
  const noVmag = isNaN(vmag);

  if (objectTypeLayerHidden_(type, noInView, isObserver, noVmag)) {
    writeDeselected(cd, pd, i);

    return;
  }

  if (inView && objectTypeFlags.inFOV === false && settings.cameraType !== CAM_PLANETARIUM) {
    writeDeselected(cd, pd, i);

    return;
  }

  if (inView && settings.cameraType !== CAM_PLANETARIUM && !(isObserver && noVmag)) {
    writeColorArr(cd, pd, i, colorTheme.inFOV ?? [0, 0, 1, 1], PICKABLE_YES);

    return;
  }

  writeColorArr(cd, pd, i, objectTypeFinalColor_(catalogData.country[i], type), PICKABLE_YES);
}

/** Colors objects by type, hiding those not in the active group. */
function objectTypeGroupScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  if (groupIdSet && !groupIdSet.has(i)) {
    // Not in group — check star/marker
    const flags = catalogData.objFlags[i];

    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);

      return;
    }
    if (flags & ObjFlags.IS_STAR) {
      starColor(cd, pd, i);

      return;
    }
    writeTransparent(cd, pd, i);

    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (flags & ObjFlags.IS_MISSILE) {
    missileColor(cd, pd, i);

    return;
  }

  let c: number[];

  switch (type) {
    case SOT_PAYLOAD:
      c = colorTheme.payload ?? [0, 1, 0, 1];
      break;
    case SOT_ROCKET_BODY:
      c = colorTheme.rocketBody ?? [1, 0, 0, 1];
      break;
    case SOT_DEBRIS:
      c = colorTheme.debris ?? [0.5, 0.5, 0.5, 1];
      break;
    case SOT_SPECIAL:
      c = colorTheme.payload ?? [0, 1, 0, 1];
      break;
    case SOT_UNKNOWN:
      c = colorTheme.debris ?? [0.5, 0.5, 0.5, 1];
      break;
    default:
      c = colorTheme.payload ?? [0, 1, 0, 1];
      break;
  }

  if (inViewData && inViewData[i] === 1) {
    c = colorTheme.inFOV ?? [0, 0, 1, 1];
  }

  writeColorArr(cd, pd, i, c, PICKABLE_YES);
}

/**
 * Layer visibility check for the CelesTrak scheme. Returns true if the object's layer flag is off
 * in a hide context (not in view / planetarium / observer without vmag), meaning the caller should
 * write deselected and return.
 */
function celestrakLayerHidden_(type: number, isActive: boolean, shouldHide: boolean): boolean {
  if (!shouldHide) {
    return false;
  }

  if (type === SOT_PAYLOAD && isActive) {
    return objectTypeFlags.celestrakDefaultActivePayload === false;
  }
  if (type === SOT_PAYLOAD && !isActive) {
    return objectTypeFlags.celestrakDefaultInactivePayload === false;
  }
  if (type === SOT_UNKNOWN) {
    return objectTypeFlags.celestrakDefaultUnknown === false;
  }
  if (type === SOT_ROCKET_BODY) {
    return objectTypeFlags.celestrakDefaultRocketBody === false;
  }
  if (type === SOT_DEBRIS) {
    return objectTypeFlags.celestrakDefaultDebris === false;
  }

  return false;
}

/** Picks the final CelesTrak status/type-based color and writes it. */
function celestrakFinalColor_(cd: Float32Array, pd: Int8Array, i: number, type: number, isActive: boolean): void {
  if (type === SOT_PAYLOAD) {
    if (!isActive) {
      writeColorArr(cd, pd, i, colorTheme.celestrakDefaultInactivePayload ?? [1, 0.5, 0, 1], PICKABLE_YES);
    } else {
      writeColorArr(cd, pd, i, colorTheme.celestrakDefaultActivePayload ?? [0, 1, 0, 0.85], PICKABLE_YES);
    }

    return;
  }
  if (type === SOT_ROCKET_BODY) {
    writeColorArr(cd, pd, i, colorTheme.celestrakDefaultRocketBody ?? [1, 0, 0, 1], PICKABLE_YES);

    return;
  }
  if (type === SOT_DEBRIS) {
    writeColorArr(cd, pd, i, colorTheme.celestrakDefaultDebris ?? [0.5, 0.5, 0.5, 0.9], PICKABLE_YES);

    return;
  }

  writeColorArr(cd, pd, i, colorTheme.celestrakDefaultUnknown ?? [1, 1, 1, 0.85], PICKABLE_YES);
}

/** Colors objects using the CelesTrak default color scheme with active/inactive payload distinction. */
function celestrakScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (objectTypePrologue_(cd, pd, i, flags, type,
    { flagKey: 'celestrakDefaultSensor', themeKey: 'celestrakDefaultSensor', fallback: [0, 0, 1, 0.85] })) {
    return;
  }

  const inView = inViewData ? inViewData[i] === 1 : false;
  const vmag = catalogData.vmag[i];
  const isObserver = settings.isSensorManagerLoaded && settings.sensorType === SOT_OBSERVER;
  const noVmag = isNaN(vmag);
  const status = catalogData.status[i];
  const isActive = status !== PS_NONOPERATIONAL && status !== PS_UNKNOWN;
  const shouldHide = !inView || settings.cameraType === CAM_PLANETARIUM || (isObserver && noVmag);

  if (celestrakLayerHidden_(type, isActive, shouldHide)) {
    writeDeselected(cd, pd, i);

    return;
  }

  // FOV flag check
  if (inView && objectTypeFlags.celestrakDefaultFov === false && settings.cameraType !== CAM_PLANETARIUM) {
    writeDeselected(cd, pd, i);

    return;
  }

  // FOV coloring
  if (inView && settings.cameraType !== CAM_PLANETARIUM && !(isObserver && noVmag)) {
    writeColorArr(cd, pd, i, colorTheme.inFOVAlt ?? colorTheme.celestrakDefaultFov ?? [0, 0, 1, 0.85], PICKABLE_YES);

    return;
  }

  celestrakFinalColor_(cd, pd, i, type, isActive);
}

/** Colors objects by their country of origin. */
function countryScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (settings.cameraType === CAM_PLANETARIUM) {
    writeDeselected(cd, pd, i);

    return;
  }

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & (ObjFlags.IS_MARKER | ObjFlags.IS_SENSOR | ObjFlags.IS_MISSILE)) {
    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else if (flags & ObjFlags.IS_SENSOR) {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      missileColor(cd, pd, i);
    }

    return;
  }

  const country = catalogData.country[i];
  let c: number[];

  switch (country) {
    case CountryCode.US:
      if (objectTypeFlags.countryUS === false) {
        writeDeselected(cd, pd, i);

        return;
      }
      c = colorTheme.countryUS ?? [0.2, 0.4, 1, 1];
      break;
    case CountryCode.RU:
    case CountryCode.SU:
      if (objectTypeFlags.countryCIS === false) {
        writeDeselected(cd, pd, i);

        return;
      }
      c = colorTheme.countryCIS ?? [1, 0, 0, 1];
      break;
    case CountryCode.CN:
      if (objectTypeFlags.countryPRC === false) {
        writeDeselected(cd, pd, i);

        return;
      }
      c = colorTheme.countryPRC ?? [1, 0.5, 0, 1];
      break;
    default:
      if (objectTypeFlags.countryOther === false) {
        writeDeselected(cd, pd, i);

        return;
      }
      c = colorTheme.countryOther ?? [0.5, 0.5, 0.5, 1];
      break;
  }

  writeColorArr(cd, pd, i, c, PICKABLE_YES);
}

/** Colors objects by country, hiding those not in the active group. */
function countryGroupScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  if (groupIdSet && groupIdSet.has(i)) {
    // Apply country coloring
    countryScheme(cd, pd, i);
  } else {
    const flags = catalogData.objFlags[i];

    if (flags & ObjFlags.IS_STAR) {
      starColor(cd, pd, i);
    } else if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else {
      writeTransparent(cd, pd, i);
    }
  }
}

/** Colors objects on a gradient based on their orbital velocity. */
function velocityScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & ObjFlags.IS_SENSOR) {
    writeColorArr(cd, pd, i, colorTheme.sensor ?? [1, 1, 1, 1], PICKABLE_YES);

    return;
  }

  const inView = inViewData ? inViewData[i] === 1 : false;

  if (inView) {
    if (objectTypeFlags.inViewAlt === false) {
      writeDeselected(cd, pd, i);
    } else {
      writeColorArr(cd, pd, i, colorTheme.inFOVAlt ?? [1, 1, 1, 1], PICKABLE_YES);
    }

    return;
  }

  // Compute velocity from satVel
  let totalVelocity = 0;

  if (satVel) {
    const vx = satVel[i * 3];
    const vy = satVel[i * 3 + 1];
    const vz = satVel[i * 3 + 2];

    totalVelocity = Math.sqrt(vx * vx + vy * vy + vz * vz);
  }

  if (totalVelocity > 5.5 && objectTypeFlags.velocityFast === false) {
    writeDeselected(cd, pd, i);

    return;
  }
  if (totalVelocity >= 2.5 && totalVelocity <= 5.5 && objectTypeFlags.velocityMed === false) {
    writeDeselected(cd, pd, i);

    return;
  }
  if (totalVelocity < 2.5 && objectTypeFlags.velocitySlow === false) {
    writeDeselected(cd, pd, i);

    return;
  }

  const t = Math.min(totalVelocity / 15, 1.0);

  writeColor(cd, pd, i, 1.0 - t, t, 0.0, 1.0, PICKABLE_YES);
}

/** Colors objects based on their sunlight illumination status (sunlit, penumbral, umbral). */
function sunlightScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (!inSunData || inSunData.length <= i) {
    writeDeselected(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }
  if (flags & ObjFlags.IS_MARKER) {
    writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);

    return;
  }

  if (flags & ObjFlags.IS_SENSOR) {
    if (settings.isDisableSensors || objectTypeFlags.sensor === false) {
      writeDeselected(cd, pd, i);
    } else {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    }

    return;
  }

  if (flags & ObjFlags.IS_MISSILE) {
    missileColor(cd, pd, i);

    return;
  }

  const inView = inViewData ? inViewData[i] === 1 : false;
  const sunStatus = inSunData[i];

  // In FOV
  if (inView) {
    if (objectTypeFlags.sunlightFov === false) {
      writeDeselected(cd, pd, i);

      return;
    }

    if (sunStatus > 0) {
      writeColorArr(cd, pd, i, colorTheme.sunlightInview ?? [1, 1, 0, 1], PICKABLE_YES);

      return;
    }

    // In FOV but in umbral
    if (objectTypeFlags.satLow) {
      writeColorArr(cd, pd, i, colorTheme.umbral ?? [0.2, 0.2, 0, 1], PICKABLE_NO);

      return;
    }

    writeDeselected(cd, pd, i);

    return;
  }

  // Not in FOV
  if (!inView) {
    const vmag = catalogData.vmag[i];
    const hasVmag = !isNaN(vmag);

    if (sunStatus === SUN_STATUS_SUN && objectTypeFlags.satHi) {
      if (hasVmag) {
        if (vmag < 3) {
          writeColorArr(cd, pd, i, colorTheme.sunlight100 ?? [1, 1, 0, 1], PICKABLE_YES);
        } else if (vmag <= 4.5) {
          writeColorArr(cd, pd, i, colorTheme.sunlight80 ?? [0.8, 0.8, 0, 1], PICKABLE_YES);
        } else {
          writeColorArr(cd, pd, i, colorTheme.sunlight60 ?? [0.6, 0.6, 0, 1], PICKABLE_YES);
        }
      } else if (type === SOT_ROCKET_BODY) {
        // Type-based fallback
        writeColorArr(cd, pd, i, colorTheme.sunlight100 ?? [1, 1, 0, 1], PICKABLE_YES);
      } else if (type === SOT_PAYLOAD) {
        writeColorArr(cd, pd, i, colorTheme.sunlight80 ?? [0.8, 0.8, 0, 1], PICKABLE_YES);
      } else {
        writeColorArr(cd, pd, i, colorTheme.sunlight60 ?? [0.6, 0.6, 0, 1], PICKABLE_YES);
      }

      return;
    }

    if (sunStatus === SUN_PENUMBRAL && objectTypeFlags.satMed) {
      writeColorArr(cd, pd, i, colorTheme.penumbral ?? [0.5, 0.5, 0, 1], PICKABLE_YES);

      return;
    }

    if (sunStatus === SUN_UMBRAL && objectTypeFlags.satLow) {
      writeColorArr(cd, pd, i, colorTheme.umbral ?? [0.2, 0.2, 0, 1], PICKABLE_NO);

      return;
    }
  }

  writeDeselected(cd, pd, i);
}

/** Colors objects by their radar cross-section size category. */
function rcsScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & (ObjFlags.IS_MARKER | ObjFlags.IS_SENSOR | ObjFlags.IS_MISSILE)) {
    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else if (flags & ObjFlags.IS_SENSOR) {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      missileColor(cd, pd, i);
    }

    return;
  }

  const rcs = catalogData.rcs[i];

  if (isNaN(rcs)) {
    if (objectTypeFlags.rcsUnknown === false) {
      writeDeselected(cd, pd, i);
    } else {
      writeColorArr(cd, pd, i, colorTheme.rcsUnknown ?? [1, 1, 1, 1], PICKABLE_YES);
    }

    return;
  }

  // Boundary conditions must match main thread: <= at upper bounds
  if (rcs < 0.01) {
    if (objectTypeFlags.rcsXXSmall === false) {
      writeDeselected(cd, pd, i);
    } else {
      writeColorArr(cd, pd, i, colorTheme.rcsXXSmall ?? [0, 0, 0, 1], PICKABLE_YES);
    }
  } else if (rcs <= 0.05) {
    if (objectTypeFlags.rcsXSmall === false) {
      writeDeselected(cd, pd, i);
    } else {
      writeColorArr(cd, pd, i, colorTheme.rcsXSmall ?? [0, 0, 0, 1], PICKABLE_YES);
    }
  } else if (rcs <= 0.1) {
    if (objectTypeFlags.rcsSmall === false) {
      writeDeselected(cd, pd, i);
    } else {
      writeColorArr(cd, pd, i, colorTheme.rcsSmall ?? [0, 0, 1, 1], PICKABLE_YES);
    }
  } else if (rcs <= 1.0) {
    if (objectTypeFlags.rcsMed === false) {
      writeDeselected(cd, pd, i);
    } else {
      writeColorArr(cd, pd, i, colorTheme.rcsMed ?? [0, 0, 1, 1], PICKABLE_YES);
    }
  } else if (objectTypeFlags.rcsLarge === false) {
    writeDeselected(cd, pd, i);
  } else {
    writeColorArr(cd, pd, i, colorTheme.rcsLarge ?? [0, 0, 1, 1], PICKABLE_YES);
  }
}

/** Colors objects by their TLE confidence level (high, medium, low). */
function confidenceScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & (ObjFlags.IS_MARKER | ObjFlags.IS_SENSOR | ObjFlags.IS_MISSILE)) {
    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else if (flags & ObjFlags.IS_SENSOR) {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      missileColor(cd, pd, i);
    }

    return;
  }

  const conf = catalogData.tle1Confidence[i];

  if (conf >= 7) {
    if (objectTypeFlags.confidenceHi === false) {
      writeDeselected(cd, pd, i);
    } else {
      writeColorArr(cd, pd, i, colorTheme.confidenceHi ?? [0, 1, 0, 1], PICKABLE_YES);
    }
  } else if (conf >= 4) {
    if (objectTypeFlags.confidenceMed === false) {
      writeDeselected(cd, pd, i);
    } else {
      writeColorArr(cd, pd, i, colorTheme.confidenceMed ?? [1, 1, 0, 1], PICKABLE_YES);
    }
  } else if (objectTypeFlags.confidenceLow === false) {
    writeDeselected(cd, pd, i);
  } else {
    writeColorArr(cd, pd, i, colorTheme.confidenceLow ?? [1, 0, 0, 1], PICKABLE_YES);
  }
}

/** Colors objects by the age of their general perturbations (GP) data. */
function gpAgeScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & (ObjFlags.IS_MARKER | ObjFlags.IS_SENSOR | ObjFlags.IS_MISSILE)) {
    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else if (flags & ObjFlags.IS_SENSOR) {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      missileColor(cd, pd, i);
    }

    return;
  }

  const epochYear2d = catalogData.tle1EpochYear[i];
  const epochDay = catalogData.tle1EpochDay[i];

  if (epochDay === 0) {
    writeDeselected(cd, pd, i);

    return;
  }

  // Convert 2-digit year to 4-digit — must match main-thread logic exactly
  const currentYear2d = schemeParams.year;
  const epochYear4d = epochYear2d <= currentYear2d ? 2000 + epochYear2d : 1900 + epochYear2d;
  const currentYear4d = 2000 + currentYear2d;

  // Match main-thread: epochJday = epochDay + epochYear4d*365, currentJday = jday + currentYear4d*365
  const daysOld = (currentYear4d - epochYear4d) * 365 + (schemeParams.jday - epochDay);

  if (daysOld < 0.5 && objectTypeFlags.age1 !== false) {
    writeColorArr(cd, pd, i, colorTheme.age1 ?? [0, 1, 0, 0.9], PICKABLE_YES);
  } else if (daysOld >= 0.5 && daysOld < 1.0 && objectTypeFlags.age2 !== false) {
    writeColorArr(cd, pd, i, colorTheme.age2 ?? [0.6, 0.996, 0, 0.9], PICKABLE_YES);
  } else if (daysOld >= 1.0 && daysOld < 1.5 && objectTypeFlags.age3 !== false) {
    writeColorArr(cd, pd, i, colorTheme.age3 ?? [0.8, 1, 0, 0.9], PICKABLE_YES);
  } else if (daysOld >= 1.5 && daysOld < 2.0 && objectTypeFlags.age4 !== false) {
    writeColorArr(cd, pd, i, colorTheme.age4 ?? [1, 1, 0, 0.9], PICKABLE_YES);
  } else if (daysOld >= 2.0 && daysOld < 2.5 && objectTypeFlags.age5 !== false) {
    writeColorArr(cd, pd, i, colorTheme.age5 ?? [1, 0.8, 0, 0.9], PICKABLE_YES);
  } else if (daysOld >= 2.5 && daysOld < 3.0 && objectTypeFlags.age6 !== false) {
    writeColorArr(cd, pd, i, colorTheme.age6 ?? [1, 0.6, 0, 0.9], PICKABLE_YES);
  } else if (daysOld >= 3.0 && objectTypeFlags.age7 !== false) {
    writeColorArr(cd, pd, i, colorTheme.age7 ?? [1, 0, 0, 0.9], PICKABLE_YES);
  } else {
    writeDeselected(cd, pd, i);
  }
}

/** Colors objects by their mission category (military, communication, science, etc.). */
function missionScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & (ObjFlags.IS_MARKER | ObjFlags.IS_SENSOR | ObjFlags.IS_MISSILE)) {
    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else if (flags & ObjFlags.IS_SENSOR) {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      missileColor(cd, pd, i);
    }

    return;
  }

  const mission = catalogData.mission[i];
  let c: number[] | null = null;
  let flagKey: string | null = null;

  switch (mission) {
    case MissionCategory.MILITARY:
      flagKey = 'missionMilitary';
      c = colorTheme.missionMilitary;
      break;
    case MissionCategory.COMMUNICATION:
      flagKey = 'missionCommunications';
      c = colorTheme.missionCommunications;
      break;
    case MissionCategory.TECHNOLOGY:
      flagKey = 'missionTechnology';
      c = colorTheme.missionTechnology;
      break;
    case MissionCategory.EARTH_OBSERVATION:
      flagKey = 'missionEarthObservation';
      c = colorTheme.missionEarthObservation;
      break;
    case MissionCategory.SCIENCE:
      flagKey = 'missionScience';
      c = colorTheme.missionScience;
      break;
    case MissionCategory.ASTRONOMY:
      flagKey = 'missionAstronomy';
      c = colorTheme.missionAstronomy;
      break;
    case MissionCategory.NAVIGATION:
      flagKey = 'missionNavigation';
      c = colorTheme.missionNavigation;
      break;
    default:
      flagKey = 'missionOther';
      c = colorTheme.missionOther;
      break;
  }

  if (flagKey && objectTypeFlags[flagKey] !== false && c) {
    writeColorArr(cd, pd, i, c, PICKABLE_YES);
  } else {
    writeDeselected(cd, pd, i);
  }
}

/** Colors objects by their reentry risk level based on perigee altitude. */
function reentryRiskScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & (ObjFlags.IS_MARKER | ObjFlags.IS_SENSOR | ObjFlags.IS_MISSILE)) {
    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else if (flags & ObjFlags.IS_SENSOR) {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      missileColor(cd, pd, i);
    }

    return;
  }

  const perigee = catalogData.perigee[i];

  if (perigee < 180 && objectTypeFlags.reentryRiskVeryHigh !== false) {
    writeColorArr(cd, pd, i, colorTheme.reentryRiskVeryHigh ?? [1, 0, 0, 0.8], PICKABLE_YES);
  } else if (perigee >= 180 && perigee < 220 && objectTypeFlags.reentryRiskHigh !== false) {
    writeColorArr(cd, pd, i, colorTheme.reentryRiskHigh ?? [1, 0.5, 0, 0.8], PICKABLE_YES);
  } else if (perigee >= 220 && perigee < 300 && objectTypeFlags.reentryRiskMedium !== false) {
    writeColorArr(cd, pd, i, colorTheme.reentryRiskMedium ?? [1, 1, 0, 0.8], PICKABLE_YES);
  } else if (perigee >= 300 && perigee < 400 && objectTypeFlags.reentryRiskLow !== false) {
    writeColorArr(cd, pd, i, colorTheme.reentryRiskLow ?? [0.5, 1, 0, 0.8], PICKABLE_YES);
  } else if (perigee >= 400 && objectTypeFlags.reentryRiskVeryLow !== false) {
    writeColorArr(cd, pd, i, colorTheme.reentryRiskVeryLow ?? [0, 0.8, 0, 0.8], PICKABLE_YES);
  } else {
    // Flag turned off or no match
    writeColorArr(cd, pd, i, colorTheme.deselected ?? [0, 0, 0, 0], PICKABLE_NO);
  }
}

/** Colors objects by the spatial density of their orbital altitude bin. */
function spatialDensityScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & (ObjFlags.IS_MARKER | ObjFlags.IS_SENSOR | ObjFlags.IS_MISSILE)) {
    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else if (flags & ObjFlags.IS_SENSOR) {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      missileColor(cd, pd, i);
    }

    return;
  }

  const meanAlt = (catalogData.apogee[i] + catalogData.perigee[i]) / 2;
  const bin = Math.floor((meanAlt - 75) / 25);
  let orbitDensity = 0;

  if (bin >= 0 && bin <= 76 && schemeParams.orbitDensity?.[bin]) {
    orbitDensity = schemeParams.orbitDensity[bin].density ?? 0;

    if (objectTypeFlags.spatialDensityHi !== false && orbitDensity > 1.5e-7) {
      writeColorArr(cd, pd, i, colorTheme.spatialDensityHi ?? [1, 0, 0, 1], PICKABLE_YES);

      return;
    }
    if (objectTypeFlags.spatialDensityMed !== false && orbitDensity > 1.0e-7 && orbitDensity <= 1.5e-7) {
      writeColorArr(cd, pd, i, colorTheme.spatialDensityMed ?? [1, 0.4, 0, 1], PICKABLE_YES);

      return;
    }
    if (objectTypeFlags.spatialDensityLow !== false && orbitDensity > 1.0e-8 && orbitDensity <= 1.0e-7) {
      writeColorArr(cd, pd, i, colorTheme.spatialDensityLow ?? [1, 1, 0, 0.9], PICKABLE_YES);

      return;
    }
  }

  if (objectTypeFlags.spatialDensityOther !== false && orbitDensity <= 1.0e-8) {
    writeColorArr(cd, pd, i, colorTheme.spatialDensityOther ?? [0.8, 0.8, 0.8, 0.3], PICKABLE_YES);
  } else {
    writeDeselected(cd, pd, i);
  }
}

/** Colors objects by the density of their orbital plane (inclination and altitude). */
function orbitalPlaneDensityScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & (ObjFlags.IS_MARKER | ObjFlags.IS_SENSOR | ObjFlags.IS_MISSILE)) {
    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else if (flags & ObjFlags.IS_SENSOR) {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      missileColor(cd, pd, i);
    }

    return;
  }

  // Must match main-thread: floor(inc/2)*2 gives even-numbered keys, floor(alt/25)*25 gives 25km-boundary keys
  const inc = Math.floor(catalogData.inclination[i] / 2) * 2;
  const meanAlt = (catalogData.apogee[i] + catalogData.perigee[i]) / 2;
  const alt = Math.floor(meanAlt / 25) * 25;

  const densityRow = schemeParams.orbitalPlaneDensity?.[inc];
  const density = densityRow ? (densityRow[alt] ?? 0) : 0;
  const maxDensity = schemeParams.orbitalPlaneDensityMax || 1;
  const normalized = density / maxDensity;

  if (normalized > 0.75) {
    if (objectTypeFlags.orbitalPlaneDensityHi !== false) {
      writeColorArr(cd, pd, i, colorTheme.orbitalPlaneDensityHi ?? [1, 0, 0, 1], PICKABLE_YES);
    } else {
      writeDeselected(cd, pd, i);
    }
  } else if (normalized > 0.25) {
    if (objectTypeFlags.orbitalPlaneDensityMed !== false) {
      writeColorArr(cd, pd, i, colorTheme.orbitalPlaneDensityMed ?? [1, 0.5, 0, 1], PICKABLE_YES);
    } else {
      writeDeselected(cd, pd, i);
    }
  } else if (normalized > 0.10) {
    if (objectTypeFlags.orbitalPlaneDensityLow !== false) {
      writeColorArr(cd, pd, i, colorTheme.orbitalPlaneDensityLow ?? [1, 1, 0, 1], PICKABLE_YES);
    } else {
      writeDeselected(cd, pd, i);
    }
  } else if (objectTypeFlags.orbitalPlaneDensityOther !== false) {
    writeColorArr(cd, pd, i, colorTheme.orbitalPlaneDensityOther ?? [0.5, 0.5, 0.5, 1], PICKABLE_YES);
  } else {
    writeDeselected(cd, pd, i);
  }
}

/** Colors objects by their catalog data source (USSF, CelesTrak, Vimpel, etc.). */
function sourceScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (settings.cameraType === CAM_PLANETARIUM) {
    writeDeselected(cd, pd, i);

    return;
  }

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & (ObjFlags.IS_MARKER | ObjFlags.IS_SENSOR | ObjFlags.IS_MISSILE)) {
    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else if (flags & ObjFlags.IS_SENSOR) {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      missileColor(cd, pd, i);
    }

    return;
  }

  const source = catalogData.source[i];

  switch (source) {
    case SourceCode.USSF:
      if (objectTypeFlags.sourceUssf === false) {
        writeDeselected(cd, pd, i);
      } else {
        writeColorArr(cd, pd, i, colorTheme.sourceUssf ?? [0.2, 1, 1, 0.7], PICKABLE_YES);
      }
      break;
    case SourceCode.CELESTRAK:
      if (objectTypeFlags.sourceCelestrak === false) {
        writeDeselected(cd, pd, i);
      } else {
        writeColorArr(cd, pd, i, colorTheme.sourceCelestrak ?? [0, 0.2, 1, 0.85], PICKABLE_YES);
      }
      break;
    case SourceCode.CELESTRAK_SUP:
      if (objectTypeFlags.sourceCelestrakSup === false) {
        writeDeselected(cd, pd, i);
      } else {
        writeColorArr(cd, pd, i, colorTheme.sourceCelestrakSup ?? [0.4, 0.6, 1, 0.85], PICKABLE_YES);
      }
      break;
    case SourceCode.SATNOGS:
      if (objectTypeFlags.sourceSatnogs === false) {
        writeDeselected(cd, pd, i);
      } else {
        writeColorArr(cd, pd, i, colorTheme.sourceSatnogs ?? [0, 1, 0.4, 0.8], PICKABLE_YES);
      }
      break;
    case SourceCode.OEM_IMPORT:
    case SourceCode.KEEPTRACK:
      if (objectTypeFlags.sourceOemImport === false) {
        writeDeselected(cd, pd, i);
      } else {
        writeColorArr(cd, pd, i, colorTheme.sourceOemImport ?? [1, 1, 0.2, 1], PICKABLE_YES);
      }
      break;
    case SourceCode.VIMPEL:
      if (objectTypeFlags.sourceVimpel === false) {
        writeDeselected(cd, pd, i);
      } else {
        writeColorArr(cd, pd, i, colorTheme.sourceVimpel ?? [1, 0, 0, 0.6], PICKABLE_YES);
      }
      break;
    default:
      if (objectTypeFlags.countryOther === false) {
        writeDeselected(cd, pd, i);
      } else {
        writeColorArr(cd, pd, i, colorTheme.countryOther ?? [0.5, 0.5, 0.5, 1], PICKABLE_YES);
      }
      break;
  }
}

/** Colors objects to highlight Starlink satellites vs non-Starlink objects. */
function starlinkScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & (ObjFlags.IS_MARKER | ObjFlags.IS_SENSOR | ObjFlags.IS_MISSILE)) {
    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else if (flags & ObjFlags.IS_SENSOR) {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      missileColor(cd, pd, i);
    }

    return;
  }

  if (settings.cameraType === CAM_PLANETARIUM) {
    writeDeselected(cd, pd, i);

    return;
  }

  // Show/hide by type
  if (type === SOT_PAYLOAD && !settings.isShowPayloads) {
    writeDeselected(cd, pd, i);

    return;
  }
  if (type === SOT_ROCKET_BODY && !settings.isShowRocketBodies) {
    writeDeselected(cd, pd, i);

    return;
  }
  if (type === SOT_DEBRIS && !settings.isShowDebris) {
    writeDeselected(cd, pd, i);

    return;
  }

  // Starlink check
  if ((flags & ObjFlags.IS_STARLINK) && type === SOT_PAYLOAD) {
    const status = catalogData.status[i];

    if (status === PS_OPERATIONAL) {
      if (objectTypeFlags.starlinkOperational === false) {
        writeDeselected(cd, pd, i);
      } else {
        writeColorArr(cd, pd, i, colorTheme.starlinkOperational ?? [0, 0.8, 0, 0.8], PICKABLE_YES);
      }
    } else if (objectTypeFlags.starlinkOther === false) {
      writeDeselected(cd, pd, i);
    } else {
      writeColorArr(cd, pd, i, colorTheme.starlinkOther ?? [0.8, 0.8, 0, 0.8], PICKABLE_YES);
    }

    return;
  }

  // Non-Starlink
  if (objectTypeFlags.starlinkNot === false) {
    writeDeselected(cd, pd, i);
  } else {
    writeColorArr(cd, pd, i, colorTheme.starlinkNot ?? [0.8, 0, 0, 1], PICKABLE_YES);
  }
}

/** Colors small satellite payloads (RCS < 0.5) and hides all other objects. */
function smallSatScheme(cd: Float32Array, pd: Int8Array, i: number): void {
  if (!catalogData) {
    return;
  }

  const flags = catalogData.objFlags[i];
  const type = catalogData.type[i];

  if (flags & ObjFlags.IS_STAR) {
    starColor(cd, pd, i);

    return;
  }

  if (checkFacility(cd, pd, i, type)) {
    return;
  }

  if (flags & (ObjFlags.IS_MARKER | ObjFlags.IS_SENSOR | ObjFlags.IS_MISSILE)) {
    if (flags & ObjFlags.IS_MARKER) {
      writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
    } else if (flags & ObjFlags.IS_SENSOR) {
      writeColorArr(cd, pd, i, colorTheme.sensor ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      missileColor(cd, pd, i);
    }

    return;
  }

  const rcs = catalogData.rcs[i];

  if (type === SOT_PAYLOAD && !isNaN(rcs) && rcs < 0.5) {
    if (objectTypeFlags.satSmall !== false) {
      writeColorArr(cd, pd, i, colorTheme.satSmall ?? [0, 0, 1, 1], PICKABLE_YES);
    } else {
      writeDeselected(cd, pd, i);
    }
  } else {
    writeTransparent(cd, pd, i);
  }
}

// ─── Scheme Dispatch ─────────────────────────────────────────────────────────

const SCHEME_MAP: Record<string, { update: SchemeUpdateFn; updateGroup?: SchemeUpdateFn }> = {
  ObjectTypeColorScheme: { update: objectTypeScheme, updateGroup: objectTypeGroupScheme },
  CelestrakColorScheme: { update: celestrakScheme },
  CountryColorScheme: { update: countryScheme, updateGroup: countryGroupScheme },
  VelocityColorScheme: { update: velocityScheme },
  SunlightColorScheme: { update: sunlightScheme },
  RcsColorScheme: { update: rcsScheme },
  ConfidenceColorScheme: { update: confidenceScheme },
  GpAgeColorScheme: { update: gpAgeScheme },
  MissionColorScheme: { update: missionScheme },
  ReentryRiskColorScheme: { update: reentryRiskScheme },
  SpatialDensityColorScheme: { update: spatialDensityScheme },
  OrbitalPlaneDensityColorScheme: { update: orbitalPlaneDensityScheme },
  SourceColorScheme: { update: sourceScheme },
  StarlinkColorScheme: { update: starlinkScheme },
  SmallSatColorScheme: { update: smallSatScheme },
};

/** Returns the appropriate color update function for the current scheme and group state. */
function getUpdateFn(): SchemeUpdateFn {
  const entry = SCHEME_MAP[currentSchemeId];

  if (!entry) {
    return objectTypeScheme;
  }

  if (isGroupScheme && entry.updateGroup) {
    return entry.updateGroup;
  }

  // For group schemes without a custom updateGroup, use the base class pattern
  if (isGroupScheme) {
    return (cd, pd, i) => {
      if (groupIdSet && !groupIdSet.has(i)) {
        if (!catalogData) {
          writeTransparent(cd, pd, i);

          return;
        }

        const flags = catalogData.objFlags[i];

        if (flags & ObjFlags.IS_STAR) {
          starColor(cd, pd, i);
        } else if (flags & ObjFlags.IS_MARKER) {
          writeColor(cd, pd, i, 1, 0, 0, 1, PICKABLE_NO);
        } else {
          writeTransparent(cd, pd, i);
        }

        return;
      }
      entry.update(cd, pd, i);
    };
  }

  return entry.update;
}

// ─── Main Calculation ────────────────────────────────────────────────────────

/** Computes colors and pickability for all objects and transfers the buffers to the main thread. */
function calculateAllColors(): void {
  if (!catalogData || catalogData.numObjects === 0) {
    return;
  }

  const n = Math.min(dotsOnScreen || catalogData.numObjects, catalogData.numObjects);
  const colorData = new Float32Array(catalogData.numObjects * 4);
  const pickableData = new Int8Array(catalogData.numObjects);

  const updateFn = getUpdateFn();

  for (let i = 0; i < n; i++) {
    // Apply filter first
    if (isFilteredOut(i)) {
      writeTransparent(colorData, pickableData, i);
      continue;
    }
    updateFn(colorData, pickableData, i);
  }

  // Transfer buffers to main thread (zero-copy)
  const msg = {
    colorData,
    pickableData,
    seqNum: catalogSeqNum,
  };

  postMessage(msg, { transfer: [colorData.buffer as ArrayBuffer, pickableData.buffer as ArrayBuffer] });
}

/** Debounces color recalculation to avoid redundant recomputation within a single frame. */
function scheduleRecalc(): void {
  if (recalcTimer !== null) {
    clearTimeout(recalcTimer);
  }
  recalcTimer = setTimeout(() => {
    recalcTimer = null;
    calculateAllColors();
  }, DEBOUNCE_MS);
}

// ─── Message Handler ─────────────────────────────────────────────────────────

onmessage = function onmessage(event: MessageEvent<ColorWorkerInMsg>) {
  const msg = event.data;

  switch (msg.typ) {
    case ColorWorkerMsgType.INIT_CATALOG:
      if (msg.catalogData) {
        catalogData = msg.catalogData;
        catalogSeqNum = msg.seqNum ?? 0;
        dotsOnScreen = catalogData.numObjects;
      }
      scheduleRecalc();
      break;

    case ColorWorkerMsgType.UPDATE_SCHEME:
      if (msg.schemeId) {
        currentSchemeId = msg.schemeId;
      }
      isGroupScheme = msg.isGroupScheme ?? false;
      scheduleRecalc();
      break;

    case ColorWorkerMsgType.UPDATE_FILTERS:
      if (msg.filterSettings) {
        filterState = msg.filterSettings;
      }
      scheduleRecalc();
      break;

    case ColorWorkerMsgType.UPDATE_DYNAMIC:
      if (msg.inViewData) {
        inViewData = msg.inViewData;
      }
      if (msg.inSunData) {
        inSunData = msg.inSunData;
      }
      if (msg.satVel) {
        satVel = msg.satVel;
      }
      if (typeof msg.dotsOnScreen === 'number') {
        dotsOnScreen = msg.dotsOnScreen;
      }
      scheduleRecalc();
      break;

    case ColorWorkerMsgType.UPDATE_GROUP:
      if (msg.groupIds === null || msg.groupIds === undefined) {
        groupIdSet = null;
      } else {
        groupIdSet = new Set(msg.groupIds);
      }
      scheduleRecalc();
      break;

    case ColorWorkerMsgType.UPDATE_SETTINGS:
      if (msg.settingsFlags) {
        settings = msg.settingsFlags;
      }
      scheduleRecalc();
      break;

    case ColorWorkerMsgType.UPDATE_PARAMS:
      if (msg.params) {
        schemeParams = msg.params;
      }
      scheduleRecalc();
      break;

    case ColorWorkerMsgType.FORCE_RECOLOR:
      if (recalcTimer !== null) {
        clearTimeout(recalcTimer);
        recalcTimer = null;
      }
      calculateAllColors();
      break;

    case ColorWorkerMsgType.UPDATE_OBJ_TYPE_FLAGS:
      if (msg.objectTypeFlags) {
        objectTypeFlags = msg.objectTypeFlags;
      }
      scheduleRecalc();
      break;

    case ColorWorkerMsgType.UPDATE_COLOR_THEME:
      if (msg.colorTheme) {
        colorTheme = msg.colorTheme;
      }
      scheduleRecalc();
      break;
    default:
      break;
  }
};

// Signal ready
postMessage('ready');
