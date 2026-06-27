/**
 * Struct-of-arrays representation of catalog object properties needed by the color worker.
 * Built once on the main thread from objectCache, then transferred to the worker.
 *
 * All arrays are indexed by object id (0..numObjects-1).
 */

// Country encoding — maps country strings to integer indices for typed array storage
export const enum CountryCode {
  US = 0,
  UK = 1,
  F = 2,
  D = 3,
  J = 4,
  CN = 5,
  IN = 6,
  RU = 7,
  SU = 8,
  KR = 9,
  AU = 10,
  ANALSAT = 11,
  OTHER = 255,
}

// Source encoding
export const enum SourceCode {
  USSF = 0,
  CELESTRAK = 1,
  VIMPEL = 2,
  OEM_IMPORT = 3,
  KEEPTRACK = 4,
  CELESTRAK_SUP = 5,
  SATNOGS = 6,
  OTHER = 255,
}

// Pre-categorized mission index (avoids regex in worker hot loop)
export const enum MissionCategory {
  MILITARY = 0,
  COMMUNICATION = 1,
  TECHNOLOGY = 2,
  EARTH_OBSERVATION = 3,
  SCIENCE = 4,
  ASTRONOMY = 5,
  NAVIGATION = 6,
  OTHER = 7,
  UNKNOWN = 255,
}

// Bit flags for special object properties (packed into nameFlags)
export const enum ObjFlags {
  NONE = 0,
  IS_PLANET = 1, // bit 0 — written as a literal (not `1 << 0`) to satisfy SonarQube's no-`<< 0` rule
  IS_OEM = 1 << 1,
  IS_STARLINK = 1 << 2,
  IS_STAR = 1 << 3,
  IS_SENSOR = 1 << 4,
  IS_MISSILE = 1 << 5,
  IS_MARKER = 1 << 6,
  IS_STATIC = 1 << 7,
}

/**
 * All typed arrays transferred to the color worker.
 * Each array is indexed by object id.
 */
export interface ColorDataArrays {
  // Object classification
  type: Int8Array; // SpaceObjectType enum value
  objFlags: Uint8Array; // ObjFlags bit field
  country: Uint8Array; // CountryCode enum
  source: Uint8Array; // SourceCode enum

  // Orbital parameters
  apogee: Float32Array; // km
  perigee: Float32Array; // km
  inclination: Float32Array; // degrees
  eccentricity: Float32Array;

  // Satellite metadata
  rcs: Float32Array; // radar cross section (NaN for unknown)
  status: Uint8Array; // PayloadStatus char code
  vmag: Float32Array; // visual magnitude (NaN for null/undefined)
  mission: Uint8Array; // MissionCategory enum

  // TLE-derived data
  tle1EpochYear: Uint8Array; // 2-digit epoch year from tle1[18:20]
  tle1EpochDay: Float32Array; // epoch day from tle1[20:32]
  tle1Confidence: Uint8Array; // classification digit from tle1[64:65]

  // Star data
  starColorTemp: Float32Array; // color temperature (0 if not star)

  // Special object colors (packed RGBA, 4 floats per object — only non-zero for planets/OEM)
  specialColor: Float32Array;

  // Active flag for missiles
  active: Uint8Array; // 1 = active, 0 = inactive

  numObjects: number;
}

/**
 * Transfer list for posting ColorDataArrays to a worker.
 * Returns all ArrayBuffer references for zero-copy transfer.
 */
export function getTransferList(data: ColorDataArrays): ArrayBuffer[] {
  return [
    data.type.buffer as ArrayBuffer,
    data.objFlags.buffer as ArrayBuffer,
    data.country.buffer as ArrayBuffer,
    data.source.buffer as ArrayBuffer,
    data.apogee.buffer as ArrayBuffer,
    data.perigee.buffer as ArrayBuffer,
    data.inclination.buffer as ArrayBuffer,
    data.eccentricity.buffer as ArrayBuffer,
    data.rcs.buffer as ArrayBuffer,
    data.status.buffer as ArrayBuffer,
    data.vmag.buffer as ArrayBuffer,
    data.mission.buffer as ArrayBuffer,
    data.tle1EpochYear.buffer as ArrayBuffer,
    data.tle1EpochDay.buffer as ArrayBuffer,
    data.tle1Confidence.buffer as ArrayBuffer,
    data.starColorTemp.buffer as ArrayBuffer,
    data.specialColor.buffer as ArrayBuffer,
    data.active.buffer as ArrayBuffer,
  ];
}
