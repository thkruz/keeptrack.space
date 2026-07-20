import { ServiceLocator } from '@app/engine/core/service-locator';
import { SearchableFields } from '@app/settings/core-settings';
import { settingsManager } from '@app/settings/settings';
import { BaseObject, Satellite, SpaceObjectType } from '@ootk/src/main';
import { MissileObject } from '../data/catalog-manager/MissileObject';
import { SearchResult, SearchResultType } from './search-manager';

/**
 * The zero-padded canonical NORAD key used for numeric matching. sccNum6 is
 * null for extended (7+ digit) IDs, so fall back to the canonical sccNum, then
 * pad to the 6-digit width. Padding makes a leading-zero query width-specific:
 * "070000" matches only 70000, while a shorter "70000" still substring-matches
 * both 70000 and 270000.
 */
function paddedSccKey(sat: Satellite): string {
  return (sat.sccNum6 ?? sat.sccNum ?? '').padStart(6, '0');
}

/**
 * Highlight offsets for a numeric NORAD match, computed against the display
 * sccNum (which carries no leading zeros). The query is aligned by its
 * zero-stripped form so a leading zero the user typed for disambiguation is
 * not counted into the highlighted span.
 */
function noradHighlight(sat: Satellite, term: string): { strIndex: number; patlen: number } {
  const display = sat.sccNum ?? '';
  const stripped = term.replace(/^0+/u, '') || term;
  const idx = display.indexOf(stripped);

  return idx < 0 ? { strIndex: 0, patlen: 0 } : { strIndex: idx, patlen: stripped.length };
}

/**
 * Run a regular (text) search over the catalog, returning at most
 * {@link settingsManager.searchLimit} results plus the total number found.
 */
export function runRegularSearch(searchString: string): { results: SearchResult[]; totalFound: number } {
  const results: SearchResult[] = [];
  let totalFound = 0;
  const limit = settingsManager.searchLimit;
  const { searchableFields } = settingsManager;

  const addResult_ = (result: SearchResult) => {
    totalFound++;
    if (results.length < limit) {
      results.push(result);
    }
  };

  // Split string into array using comma
  const searchList = searchString.split(/,/u);

  // Update last search with the most recent search results
  settingsManager.lastSearch = searchList;

  // Initialize search results
  const satData = getSearchableObjects();

  searchList.forEach((searchStringIn) => {
    const len = searchStringIn.length;

    if (len === 0) {
      return;
    } // Skip empty strings

    for (const obj of satData) {
      // Vimpel (analyst) objects can slow searches considerably, so they are opt-in.
      if (!settingsManager.isShowVimpelInSearch && obj.name.includes('Vimpel')) {
        continue;
      }

      if (obj.isSatellite() || obj.isMissile()) {
        matchSatelliteOrMissile(obj as Satellite & MissileObject, searchStringIn, len, searchableFields, addResult_);
      } else {
        matchOtherObject(obj, searchStringIn, len, addResult_);
      }
    }
  });

  return { results, totalFound };
}

/**
 * Match a satellite or missile against a single search token, emitting at most
 * one result (the first field that matches, in priority order).
 */
function matchSatelliteOrMissile(
  sat: Satellite & MissileObject,
  searchStringIn: string,
  len: number,
  searchableFields: SearchableFields,
  addResult_: (result: SearchResult) => void
): void {
  if (searchableFields.name && sat.name.toUpperCase().includes(searchStringIn)) {
    addResult_({ strIndex: sat.name.toUpperCase().indexOf(searchStringIn), searchType: SearchResultType.OBJECT_NAME, patlen: len, id: sat.id });

    return;
  }

  if (searchableFields.altName && sat.altName?.toUpperCase().includes(searchStringIn)) {
    addResult_({ strIndex: sat.altName.toUpperCase().indexOf(searchStringIn), searchType: SearchResultType.ALT_NAME, patlen: len, id: sat.id });

    return;
  }

  if (searchableFields.bus && sat.bus?.toUpperCase().includes(searchStringIn)) {
    addResult_({ strIndex: sat.bus.toUpperCase().indexOf(searchStringIn), searchType: SearchResultType.BUS, patlen: len, id: sat.id });

    return;
  }

  // Missiles only carry a name and a description; the satellite-only fields below never apply.
  if (sat.isMissile()) {
    if (sat.desc?.toUpperCase().includes(searchStringIn)) {
      addResult_({ strIndex: sat.desc.toUpperCase().indexOf(searchStringIn), searchType: SearchResultType.MISSILE, patlen: len, id: sat.id });
    }

    return;
  }

  if (searchableFields.noradId) {
    const rawKey = sat.sccNum6 ?? sat.sccNum;

    if (rawKey && paddedSccKey(sat).includes(searchStringIn)) {
      // Ignore Notional Satellites unless all 6 characters are entered
      if (sat.name.includes(' Notional)') && searchStringIn.length < 6) {
        return;
      }

      const { strIndex, patlen } = noradHighlight(sat, searchStringIn);

      addResult_({ strIndex, searchType: SearchResultType.NORAD_ID, patlen, id: sat.id });

      return;
    }
  }

  /*
   * Alpha-5 designation ("A0000" = 100000, "T0001" = 270001). sccNum is always
   * the numeric form, so a letter-bearing NORAD query can only match here. No
   * Notional guard is needed: notional IDs (400000+) exceed alpha-5 capacity,
   * leaving sccNum5 null.
   */
  if (searchableFields.noradId && sat.sccNum5?.includes(searchStringIn)) {
    addResult_({ strIndex: sat.sccNum5.indexOf(searchStringIn), searchType: SearchResultType.NORAD_ID_A5, patlen: len, id: sat.id });

    return;
  }

  if (searchableFields.intlDes && sat.intlDes?.includes(searchStringIn)) {
    // Ignore Notional Satellites
    if (sat.name.includes(' Notional)')) {
      return;
    }

    addResult_({ strIndex: sat.intlDes.indexOf(searchStringIn), searchType: SearchResultType.INTLDES, patlen: len, id: sat.id });

    return;
  }

  if (searchableFields.launchVehicle && sat.launchVehicle?.toUpperCase().includes(searchStringIn)) {
    addResult_({ strIndex: sat.launchVehicle.toUpperCase().indexOf(searchStringIn), searchType: SearchResultType.LAUNCH_VEHICLE, patlen: len, id: sat.id });
  }
}

/**
 * Match a non-satellite/missile object (star, sensor, launch site, planet) by
 * name. These types are gated by {@link settingsManager.searchableTypes} and
 * already filtered upstream, so a match here just needs the right result type.
 */
function matchOtherObject(obj: BaseObject, searchStringIn: string, len: number, addResult_: (result: SearchResult) => void): void {
  const searchType = otherObjectSearchType(obj);

  if (searchType === null) {
    return;
  }

  const upperName = obj.name.toUpperCase();

  if (upperName.includes(searchStringIn)) {
    addResult_({ strIndex: upperName.indexOf(searchStringIn), searchType, patlen: len, id: obj.id });
  }
}

/** Map a non-satellite/missile object to its search-result type, or null if not searchable. */
function otherObjectSearchType(obj: BaseObject): SearchResultType | null {
  if (obj.isStar()) {
    return SearchResultType.STAR;
  }
  if (obj.isSensor()) {
    return SearchResultType.SENSOR;
  }
  if (obj.type === SpaceObjectType.LAUNCH_SITE) {
    return SearchResultType.LAUNCH_SITE;
  }
  if (isCelestialBody(obj)) {
    return SearchResultType.PLANET;
  }

  return null;
}

/** True for actual celestial bodies (planets/moons), excluding placeholder Planet slots (UNKNOWN type). */
function isCelestialBody(obj: BaseObject): boolean {
  return (
    obj.type === SpaceObjectType.TERRESTRIAL_PLANET ||
    obj.type === SpaceObjectType.GAS_GIANT ||
    obj.type === SpaceObjectType.ICE_GIANT ||
    obj.type === SpaceObjectType.DWARF_PLANET ||
    obj.type === SpaceObjectType.MOON
  );
}

/** True when the object's kind is enabled in the searchable-type toggles. */
function isSearchableType(obj: BaseObject): boolean {
  const { searchableTypes } = settingsManager;

  if (obj.isSatellite()) {
    return searchableTypes.satellite;
  }
  if (obj.isMissile()) {
    return searchableTypes.missile;
  }
  if (obj.isStar()) {
    return searchableTypes.star;
  }
  if (obj.isSensor()) {
    return searchableTypes.sensor;
  }
  if (obj.type === SpaceObjectType.LAUNCH_SITE) {
    return searchableTypes.launchSite;
  }
  if (isCelestialBody(obj)) {
    return searchableTypes.planet;
  }

  return false;
}

/** Run the fast numeric (NORAD-only) search path. */
export function runNumOnlySearch(searchString: string): { results: SearchResult[]; totalFound: number } {
  const results: SearchResult[] = [];
  let totalFound = 0;
  const limit = settingsManager.searchLimit;

  // Split string into array using comma
  let searchList = searchString.split(/,/u).filter((str) => str.length > 0);
  // Sort the numbers so that the lowest numbers are searched first

  searchList = searchList.sort((a, b) => Number.parseInt(a) - Number.parseInt(b));

  // Update last search with the most recent search results
  settingsManager.lastSearch = searchList;

  // Initialize search results
  const satData = (getSearchableObjects(true) as Satellite[]).sort((a, b) => (a.sccNum6 ?? a.sccNum ?? '').localeCompare(b.sccNum6 ?? b.sccNum ?? '', 'en', { numeric: true }));

  let i = 0;
  let lastFoundI = 0;
  const seenIds = new Set<number>();

  searchList.forEach((searchStringIn) => {
    // Don't search for things until at least the minimum characters
    if (searchStringIn.length <= settingsManager.minimumSearchCharacters) {
      return;
    }
    // Last one never got found
    if (i >= satData.length) {
      i = lastFoundI;
    }

    for (; i < satData.length; i++) {
      const sat = satData[i];

      // Ignore Notional Satellites unless all 6 characters are entered
      if (sat.type === SpaceObjectType.NOTIONAL && searchStringIn.length < 6) {
        continue;
      }

      // Skip sats with no catalog number (briefly possible after a reload).
      if (!(sat.sccNum6 ?? sat.sccNum)) {
        continue;
      }

      // Match against the zero-padded 6-digit key so a leading-zero query is
      // width-specific ("070000" -> only 70000, not 270000).
      const matchKey = paddedSccKey(sat);

      if (matchKey.includes(searchStringIn)) {
        if (!seenIds.has(sat.id)) {
          seenIds.add(sat.id);
          totalFound++;
          if (results.length < limit) {
            const { strIndex, patlen } = noradHighlight(sat, searchStringIn);

            results.push({
              strIndex,
              patlen,
              id: sat.id,
              searchType: SearchResultType.NORAD_ID,
            });
          }
        }
        lastFoundI = i;

        // A full-width query (matches the whole padded key) is unique; stop
        // scanning. A shorter query keeps scanning for further substring hits.
        if (searchStringIn.length === matchKey.length) {
          break;
        }
      }
    }
  });

  return { results, totalFound };
}

/**
 * Collect the catalog objects eligible for the current search. The kind
 * allow-list is driven by {@link settingsManager.searchableTypes}; pass
 * `onlySatellites` for the numeric (NORAD-only) path, where statics and
 * missiles never apply.
 */
function getSearchableObjects(onlySatellites = false): BaseObject[] {
  const catalogManagerInstance = ServiceLocator.getCatalogManager();
  const dotsManagerInstance = ServiceLocator.getDotsManager();

  return catalogManagerInstance.objectCache
    .filter((obj) => {
      // Type allow-list. The numeric path is satellites-only; everything else
      // respects the per-type toggles (satellites, missiles, stars, sensors,
      // launch sites, and planets). Markers and unused OEM placeholder slots
      // (UNKNOWN-type Planet instances) are never matched.
      if (onlySatellites) {
        if (!obj.isSatellite() || !settingsManager.searchableTypes.satellite) {
          return false;
        }
      } else if (!isSearchableType(obj)) {
        return false;
      }

      if (!obj.active) {
        return false;
      } // Skip inactive objects (decayed missiles, fake analyst sats, etc.)

      // MIRV children ride on top of the bus during ascent and are hidden until the
      // reentry vehicles separate at apogee; keep them out of results until then. The
      // missile plugin re-runs this search at separation, so they appear in the menu
      // in step with their dots (and rewinding past separation removes them again).
      if (obj instanceof MissileObject && !obj.isVisibleNow()) {
        return false;
      }

      if (!obj.name) {
        return false;
      } // Everything has a name. If it doesn't then assume it isn't what we are searching for.

      // Skip decayed satellites (position 0,0,0) if setting is disabled. Static
      // objects (stars, sensors, launch sites, planets) hold fixed positions that
      // are not in the dots position buffer, so never treat them as decayed.
      if (!obj.isStatic() && !settingsManager.isShowDecayedInSearch && dotsManagerInstance.positionData) {
        const pos = dotsManagerInstance.getCurrentPosition(Number(obj.id));

        if (pos?.x === 0 && pos?.y === 0 && pos?.z === 0) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by sccNum
      if ((a as Satellite).sccNum && (b as Satellite).sccNum) {
        return Number.parseInt((a as Satellite).sccNum) - Number.parseInt((b as Satellite).sccNum);
      }

      return 0;
    });
}
