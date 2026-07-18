/**
 * Builds struct-of-arrays ColorDataArrays from the main-thread objectCache.
 * Runs once on catalog load and again on catalog swap.
 */

import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { Planet } from '@app/app/objects/planet';
import { CatalogSource, Satellite, SpaceObjectType, Star } from '@ootk/src/main';
import { BaseObject } from '../../ootk/src/objects';
import { MissionColorScheme } from '../color-schemes/mission-color-scheme';
import { ColorDataArrays, CountryCode, MissionCategory, ObjFlags, SourceCode } from './color-data-arrays';

const COUNTRY_MAP: Record<string, CountryCode> = {
  US: CountryCode.US,
  UK: CountryCode.UK,
  F: CountryCode.F,
  D: CountryCode.D,
  J: CountryCode.J,
  CN: CountryCode.CN,
  IN: CountryCode.IN,
  RU: CountryCode.RU,
  SU: CountryCode.SU,
  KR: CountryCode.KR,
  AU: CountryCode.AU,
  ANALSAT: CountryCode.ANALSAT,
};

const TRACKED_COUNTRIES = new Set(['US', 'UK', 'F', 'D', 'J', 'CN', 'IN', 'RU', 'SU', 'KR', 'AU']);

/** Encodes a country string to its compact enum representation. */
function encodeCountry(country: string | undefined): CountryCode {
  if (!country) {
    return CountryCode.OTHER;
  }

  return COUNTRY_MAP[country] ?? CountryCode.OTHER;
}

/** Encodes a catalog source string to its compact enum representation. */
function encodeSource(source: string | undefined): SourceCode {
  switch (source) {
    case CatalogSource.USSF:
    case 'USSF':
      return SourceCode.USSF;
    case CatalogSource.CELESTRAK:
    case 'Celestrak':
      return SourceCode.CELESTRAK;
    case CatalogSource.VIMPEL:
    case 'JSC Vimpel':
      return SourceCode.VIMPEL;
    case CatalogSource.CELESTRAK_SUP:
      return SourceCode.CELESTRAK_SUP;
    case CatalogSource.SATNOGS:
      return SourceCode.SATNOGS;
    case 'OEM Import':
      return SourceCode.OEM_IMPORT;
    case 'KeepTrack':
      return SourceCode.KEEPTRACK;
    default:
      return SourceCode.OTHER;
  }
}

const MISSION_NAME_MAP: Record<string, MissionCategory> = {
  Military: MissionCategory.MILITARY,
  Communication: MissionCategory.COMMUNICATION,
  Technology: MissionCategory.TECHNOLOGY,
  'Earth Observation': MissionCategory.EARTH_OBSERVATION,
  Science: MissionCategory.SCIENCE,
  Astronomy: MissionCategory.ASTRONOMY,
  Navigation: MissionCategory.NAVIGATION,
};

/**
 * Pre-categorize mission using the existing MissionColorScheme logic.
 * We reuse the scheme's regex-based categorizer so behavior is identical.
 */
function encodeMission(mission: string | undefined, categorizer: MissionColorScheme): MissionCategory {
  if (!mission || mission.trim() === '') {
    return MissionCategory.UNKNOWN;
  }

  const category = categorizer.categorizeSatelliteMission_(mission);

  if (!category) {
    return MissionCategory.UNKNOWN;
  }

  return MISSION_NAME_MAP[category] ?? MissionCategory.OTHER;
}

/** Builds a bitmask of object type flags for the given space object. */
function buildObjFlags(obj: BaseObject): number {
  let flags = ObjFlags.NONE;

  if (obj instanceof Planet) {
    flags |= ObjFlags.IS_PLANET;
  }
  if (obj instanceof OemSatellite) {
    const oemSource = (obj as OemSatellite).source ?? '';

    if (oemSource === 'OEM Import' || oemSource === 'KeepTrack') {
      flags |= ObjFlags.IS_OEM;
    }
  }
  if (obj.name?.includes('STARLINK')) {
    flags |= ObjFlags.IS_STARLINK;
  }
  if (obj.isStar()) {
    flags |= ObjFlags.IS_STAR;
  }
  if (obj.isSensor()) {
    flags |= ObjFlags.IS_SENSOR;
  }
  if (obj.isMissile()) {
    flags |= ObjFlags.IS_MISSILE;
  }
  if (obj.isMarker()) {
    flags |= ObjFlags.IS_MARKER;
  }
  if (obj.isStatic()) {
    flags |= ObjFlags.IS_STATIC;
  }

  return flags;
}

/** Builds struct-of-arrays color data from the object cache for the color worker. */
export function buildColorDataArrays(objectCache: BaseObject[]): ColorDataArrays {
  const n = objectCache.length;
  const missionCategorizer = new MissionColorScheme();

  const data: ColorDataArrays = {
    type: new Int8Array(n),
    objFlags: new Uint8Array(n),
    country: new Uint8Array(n),
    source: new Uint8Array(n),
    apogee: new Float32Array(n),
    perigee: new Float32Array(n),
    inclination: new Float32Array(n),
    eccentricity: new Float32Array(n),
    rcs: new Float32Array(n),
    status: new Uint8Array(n),
    vmag: new Float32Array(n),
    mission: new Uint8Array(n),
    tle1EpochYear: new Uint8Array(n),
    tle1EpochDay: new Float32Array(n),
    tle1Confidence: new Uint8Array(n),
    starColorTemp: new Float32Array(n),
    specialColor: new Float32Array(n * 4),
    active: new Uint8Array(n),
    numObjects: n,
  };

  // Initialize NaN defaults for optional float fields
  data.rcs.fill(NaN);
  data.vmag.fill(NaN);

  for (let i = 0; i < n; i++) {
    const obj = objectCache[i];

    if (!obj) {
      continue;
    }

    data.type[i] = obj.type ?? SpaceObjectType.UNKNOWN;
    data.objFlags[i] = buildObjFlags(obj);

    // Satellite-specific properties
    const sat = obj as Satellite;

    data.country[i] = encodeCountry(sat.country);
    data.source[i] = encodeSource(sat.source);
    data.apogee[i] = sat.apogee ?? 0;
    data.perigee[i] = sat.perigee ?? 0;
    data.inclination[i] = sat.inclination ?? 0;
    data.eccentricity[i] = sat.eccentricity ?? 0;

    if (typeof sat.rcs === 'number') {
      data.rcs[i] = sat.rcs;
    }

    // Status as char code for compact storage
    if (sat.status) {
      data.status[i] = (sat.status as string).charCodeAt(0);
    }

    if (typeof sat.vmag === 'number') {
      data.vmag[i] = sat.vmag;
    }

    // Pre-categorize mission
    data.mission[i] = encodeMission(sat.mission, missionCategorizer);

    // TLE-derived data
    if (sat.tle1 && sat.tle1.length > 32) {
      const epochYearStr = sat.tle1.substring(18, 20);
      const epochDayStr = sat.tle1.substring(20, 32);

      data.tle1EpochYear[i] = parseInt(epochYearStr, 10) || 0;
      data.tle1EpochDay[i] = parseFloat(epochDayStr) || 0;

      if (sat.tle1.length > 65) {
        data.tle1Confidence[i] = parseInt(sat.tle1.substring(64, 65), 10) || 0;
      }
    }

    // Star data
    if (obj.isStar()) {
      const star = obj as Star;

      data.starColorTemp[i] = star.colorTemp ?? 0;
    }

    // Planet colors
    if (obj instanceof Planet) {
      const color = obj.color;

      data.specialColor[i * 4] = color[0];
      data.specialColor[i * 4 + 1] = color[1];
      data.specialColor[i * 4 + 2] = color[2];
      data.specialColor[i * 4 + 3] = color[3];
    }

    // OEM satellite colors
    if (obj instanceof OemSatellite) {
      const oemSource = (obj as OemSatellite).source ?? '';

      if (oemSource === 'OEM Import' || oemSource === 'KeepTrack') {
        const color = (obj as OemSatellite).dotColor;

        data.specialColor[i * 4] = color[0];
        data.specialColor[i * 4 + 1] = color[1];
        data.specialColor[i * 4 + 2] = color[2];
        data.specialColor[i * 4 + 3] = color[3];
      }
    }

    // Missile active flag
    if (obj.isMissile()) {
      data.active[i] = (obj as MissileObject).active ? 1 : 0;
    }
  }

  return data;
}

/**
 * Check if a country is in the "tracked" set (US, UK, F, D, J, CN, IN, RU, SU, KR, AU).
 * Exported for use in the worker's "other countries" filter check.
 */
export { TRACKED_COUNTRIES };
