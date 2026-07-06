import { ChinaICBM, FraSLBM, NorthKoreanBM, RussianICBM, UsaICBM, globalBMTargets, ukSLBM } from './missile-data';
import { CHINA_LARGEST_CITIES, CHINA_MILITARY_BASES } from './china-targets';
import { RUSSIA_LARGEST_CITIES, RUSSIA_MILITARY_BASES } from './russia-targets';
import type { GeoTarget } from './us-targets';
import { US_LARGEST_CITIES, US_MILITARY_BASES } from './us-targets';

/**
 * A single selectable launch site in the Missile Simulator menu.
 *
 * Each entry points at a 4-element record inside one of the arrays in
 * `missile-data.ts` (`[latitude, longitude, description, rangeKm]`). The `index`
 * is the *record* index within that array - i.e. element `index * 4`.
 *
 * Historically the `<select>` was hand-written and the plugin recovered the data
 * record with `value - groupOffset`, which silently assumed the dropdown order
 * matched the data order. It did not for Russia (the data array carries
 * `Kozel'sk` plus several SS-N-23A silos that the dropdown skipped), so every
 * Russian option from `206` onward resolved to the wrong site's coordinates,
 * range, and description. Pinning `index` explicitly here is the structural fix:
 * the label and the coordinates can no longer drift apart.
 */
export interface AttackerSite {
  /** Stable option value used in the `ms-attacker` select (kept identical to the legacy values). */
  id: number;
  /** Locale sub-key under `attackers.*`. */
  labelKey: string;
  /** Locale sub-key under `groups.*` for the `<optgroup>`. */
  groupKey: string;
  /** Country string stamped on the created missile object. */
  country: string;
  /** When true the launch latitude/longitude come from the user (a mobile launcher / submarine). */
  isSub: boolean;
  /** Minimum apogee altitude (km) handed to the trajectory solver. */
  minAltKm: number;
  /** The backing data array from `missile-data.ts`. */
  data: readonly (number | string)[];
  /** Record index within `data` (element offset is `index * 4`). */
  index: number;
}

/** A selectable impact point in the `ms-target` select. `id === CUSTOM_TARGET_ID` means "type your own". */
export interface TargetOption {
  /** Stable option value: index into `globalBMTargets`, a value in the extended
   *  ranges below (US bases / cities), or `CUSTOM_TARGET_ID`. */
  id: number;
  /** Locale sub-key under `targets.*`. Ignored when `label` is set. */
  labelKey?: string;
  /** Literal display name (proper place name); used verbatim instead of `labelKey`. */
  label?: string;
  /** Locale sub-key under `groups.*`, or `undefined` for a standalone (ungrouped) option. */
  groupKey?: string;
}

/** Sentinel target id meaning the user enters custom impact coordinates. */
export const CUSTOM_TARGET_ID = -1;

/**
 * Id ranges for the expanded impact catalogs (kept clear of the legacy
 * `globalBMTargets` indices 0-24 and the attacker-site ids). A target id at or above
 * a base maps to `(id - base)` into that range's list. Ranges are spaced by 10,000,
 * far above any list length, and {@link EXTENDED_TARGET_RANGES} is scanned high-to-low.
 */
export const MILITARY_TARGET_ID_BASE = 10_000;
export const CITY_TARGET_ID_BASE = 20_000;
export const RUSSIA_MILITARY_TARGET_ID_BASE = 30_000;
export const RUSSIA_CITY_TARGET_ID_BASE = 40_000;
export const CHINA_MILITARY_TARGET_ID_BASE = 50_000;
export const CHINA_CITY_TARGET_ID_BASE = 60_000;

/** Lowest id claimed by the extended catalogs; below this, ids index `globalBMTargets`. */
const EXTENDED_TARGET_ID_MIN = MILITARY_TARGET_ID_BASE;

/** One extended-catalog range: ids `[base, base + list.length)` resolve into `list`. */
interface ExtendedTargetRange {
  base: number;
  groupKey: string;
  list: readonly GeoTarget[];
}

/**
 * Every extended target range, in dropdown order. `targetLat`/`targetLon` scan these
 * (highest base first) and the option generator emits one `<option>` group per range.
 */
const EXTENDED_TARGET_RANGES: readonly ExtendedTargetRange[] = [
  { base: MILITARY_TARGET_ID_BASE, groupKey: 'usMilitaryBases', list: US_MILITARY_BASES },
  { base: CITY_TARGET_ID_BASE, groupKey: 'usLargestCities', list: US_LARGEST_CITIES },
  { base: RUSSIA_MILITARY_TARGET_ID_BASE, groupKey: 'russiaMilitaryBases', list: RUSSIA_MILITARY_BASES },
  { base: RUSSIA_CITY_TARGET_ID_BASE, groupKey: 'russiaLargestCities', list: RUSSIA_LARGEST_CITIES },
  { base: CHINA_MILITARY_TARGET_ID_BASE, groupKey: 'chinaMilitaryBases', list: CHINA_MILITARY_BASES },
  { base: CHINA_CITY_TARGET_ID_BASE, groupKey: 'chinaLargestCities', list: CHINA_LARGEST_CITIES },
];

/** Resolve an extended-catalog id to its place, or `undefined` if it's not one. */
const extendedTargetFor = (id: number): GeoTarget | undefined => {
  for (let i = EXTENDED_TARGET_RANGES.length - 1; i >= 0; i--) {
    const range = EXTENDED_TARGET_RANGES[i];

    if (id >= range.base) {
      return range.list[id - range.base];
    }
  }

  return undefined;
};

/** Generated `<option>` entries for every extended catalog (literal place-name labels). */
const extendedTargetOptions: readonly TargetOption[] = EXTENDED_TARGET_RANGES.flatMap((range) =>
  range.list.map((place, i) => ({ id: range.base + i, label: place.name, groupKey: range.groupKey })),
);

/** Per-nation min apogee (km). USA silos differ from the Ohio sub, so USA is set per-entry below. */
const MIN_ALT_RUSSIA = 1120;
const MIN_ALT_CHINA = 1120;
const MIN_ALT_NORTH_KOREA = 1120;
const MIN_ALT_FRANCE = 1000;
const MIN_ALT_UK = 1200;

/**
 * Every launch site the menu can offer, in dropdown order, grouped by `groupKey`.
 *
 * `index` values are pinned to the matching record in `missile-data.ts`. Note the
 * Russian list deliberately skips `Kozel'sk` (data index 6) and the SS-N-23A
 * silos (indices 14-19) - those records exist in the data but are not currently
 * exposed; the indices below jump past them on purpose.
 */
export const ATTACKER_SITES: readonly AttackerSite[] = [
  // Russia (RussianICBM)
  { id: 200, labelKey: 'aleysk', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 0 },
  { id: 201, labelKey: 'dombarovskiy', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 1 },
  { id: 202, labelKey: 'uzhur', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 2 },
  { id: 203, labelKey: 'kartaly', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 3 },
  { id: 204, labelKey: 'irkutsk', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 4 },
  { id: 205, labelKey: 'kansk', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 5 },
  { id: 206, labelKey: 'krasnoyarsk', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 7 },
  { id: 207, labelKey: 'nizhniyTagil', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 8 },
  { id: 208, labelKey: 'novosibirsk', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 9 },
  { id: 209, labelKey: 'tatischevoSs19', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 10 },
  { id: 210, labelKey: 'tatischevoSs27', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 11 },
  { id: 211, labelKey: 'teykovo', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 12 },
  { id: 212, labelKey: 'yoshkarOla', groupKey: 'russia', country: 'Russia', isSub: false, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 13 },
  { id: 213, labelKey: 'boreiSub', groupKey: 'russia', country: 'Russia', isSub: true, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 20 },
  { id: 214, labelKey: 'deltaIvSubSineva', groupKey: 'russia', country: 'Russia', isSub: true, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 21 },
  { id: 215, labelKey: 'deltaIvSubLayner', groupKey: 'russia', country: 'Russia', isSub: true, minAltKm: MIN_ALT_RUSSIA, data: RussianICBM, index: 22 },

  // China (ChinaICBM)
  { id: 300, labelKey: 'nanyang', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 0 },
  { id: 301, labelKey: 'xining', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 1 },
  { id: 302, labelKey: 'delingha', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 2 },
  { id: 303, labelKey: 'haiyan', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 3 },
  { id: 304, labelKey: 'datong', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 4 },
  { id: 305, labelKey: 'tainshui', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 5 },
  { id: 306, labelKey: 'xixia', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 6 },
  { id: 307, labelKey: 'shaoyang', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 7 },
  { id: 308, labelKey: 'yuxi', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 8 },
  { id: 309, labelKey: 'luoyang', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 9 },
  { id: 310, labelKey: 'wuzhai', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 10 },
  { id: 311, labelKey: 'xuanhua', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 11 },
  { id: 312, labelKey: 'tongdao', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 12 },
  { id: 313, labelKey: 'lushi', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 13 },
  { id: 314, labelKey: 'jingxianA', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 14 },
  { id: 315, labelKey: 'jingxianB', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 15 },
  { id: 316, labelKey: 'hunan', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 16 },
  { id: 317, labelKey: 'daqingCity', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 17 },
  { id: 318, labelKey: 'xinyangCity', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 18 },
  { id: 319, labelKey: 'xinjiangProvince', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 19 },
  { id: 320, labelKey: 'tibetProvince', groupKey: 'china', country: 'China', isSub: false, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 20 },
  { id: 321, labelKey: 'type092Sub', groupKey: 'china', country: 'China', isSub: true, minAltKm: MIN_ALT_CHINA, data: ChinaICBM, index: 21 },

  // United States (UsaICBM). Silos use a slightly lower min apogee than the Ohio sub (preserved from the legacy code).
  { id: 101, labelKey: 'minot', groupKey: 'unitedStates', country: 'United States', isSub: false, minAltKm: 1100, data: UsaICBM, index: 1 },
  { id: 102, labelKey: 'malmstrom', groupKey: 'unitedStates', country: 'United States', isSub: false, minAltKm: 1100, data: UsaICBM, index: 2 },
  { id: 103, labelKey: 'feWarren', groupKey: 'unitedStates', country: 'United States', isSub: false, minAltKm: 1100, data: UsaICBM, index: 3 },
  { id: 100, labelKey: 'ohioSub', groupKey: 'unitedStates', country: 'United States', isSub: true, minAltKm: 1200, data: UsaICBM, index: 0 },

  // United Kingdom (ukSLBM)
  { id: 600, labelKey: 'vanguardSub', groupKey: 'unitedKingdom', country: 'United Kingdom', isSub: true, minAltKm: MIN_ALT_UK, data: ukSLBM, index: 0 },
  { id: 601, labelKey: 'hmnbClyde', groupKey: 'unitedKingdom', country: 'United Kingdom', isSub: false, minAltKm: MIN_ALT_UK, data: ukSLBM, index: 1 },

  // France (FraSLBM)
  { id: 500, labelKey: 'triomphantSub', groupKey: 'france', country: 'France', isSub: true, minAltKm: MIN_ALT_FRANCE, data: FraSLBM, index: 0 },
  { id: 501, labelKey: 'bayOfBiscay', groupKey: 'france', country: 'France', isSub: false, minAltKm: MIN_ALT_FRANCE, data: FraSLBM, index: 1 },

  // North Korea (NorthKoreanBM)
  { id: 400, labelKey: 'sinpoSub', groupKey: 'northKorea', country: 'North Korea', isSub: true, minAltKm: MIN_ALT_NORTH_KOREA, data: NorthKoreanBM, index: 0 },
  { id: 401, labelKey: 'sinpo', groupKey: 'northKorea', country: 'North Korea', isSub: false, minAltKm: MIN_ALT_NORTH_KOREA, data: NorthKoreanBM, index: 1 },
  { id: 402, labelKey: 'pyongan', groupKey: 'northKorea', country: 'North Korea', isSub: false, minAltKm: MIN_ALT_NORTH_KOREA, data: NorthKoreanBM, index: 2 },
  { id: 403, labelKey: 'pyongyang', groupKey: 'northKorea', country: 'North Korea', isSub: false, minAltKm: MIN_ALT_NORTH_KOREA, data: NorthKoreanBM, index: 3 },
];

/** Impact points in dropdown order. `groupKey: undefined` renders as a standalone (ungrouped) option. */
export const TARGET_OPTIONS: readonly TargetOption[] = [
  { id: 0, labelKey: 'washingtonDc', groupKey: 'unitedStates' },
  { id: 1, labelKey: 'newYorkCity', groupKey: 'unitedStates' },
  { id: 2, labelKey: 'losAngeles', groupKey: 'unitedStates' },
  { id: 3, labelKey: 'chicago', groupKey: 'unitedStates' },
  { id: 4, labelKey: 'boston', groupKey: 'unitedStates' },
  { id: 5, labelKey: 'seattle', groupKey: 'unitedStates' },
  { id: 6, labelKey: 'miami', groupKey: 'unitedStates' },
  { id: 7, labelKey: 'dallas', groupKey: 'unitedStates' },
  { id: 8, labelKey: 'coloradoSprings', groupKey: 'unitedStates' },
  { id: 9, labelKey: 'omaha', groupKey: 'unitedStates' },
  { id: 10, labelKey: 'hawaii', groupKey: 'unitedStates' },
  { id: 11, labelKey: 'guam', groupKey: 'unitedStates' },
  { id: CUSTOM_TARGET_ID, labelKey: 'customImpact' },
  { id: 12, labelKey: 'london', groupKey: 'natoCountries' },
  { id: 13, labelKey: 'paris', groupKey: 'natoCountries' },
  { id: 14, labelKey: 'frenchCaribbean', groupKey: 'natoCountries' },
  { id: 15, labelKey: 'madrid', groupKey: 'natoCountries' },
  { id: 16, labelKey: 'rome', groupKey: 'natoCountries' },
  { id: 17, labelKey: 'berlin', groupKey: 'natoCountries' },
  { id: 18, labelKey: 'toronto', groupKey: 'natoCountries' },
  { id: 19, labelKey: 'moscow', groupKey: 'nonNatoCountries' },
  { id: 20, labelKey: 'stPetersburg', groupKey: 'nonNatoCountries' },
  { id: 21, labelKey: 'novosibirsk', groupKey: 'nonNatoCountries' },
  { id: 22, labelKey: 'beijing', groupKey: 'nonNatoCountries' },
  { id: 23, labelKey: 'pyongyang', groupKey: 'nonNatoCountries' },
  ...extendedTargetOptions,
];

/** Look up a launch site by its `ms-attacker` option value. */
export const getAttackerSite = (id: number): AttackerSite | undefined => ATTACKER_SITES.find((site) => site.id === id);

/** Latitude (deg) of a launch site's fixed coordinates. Meaningless for `isSub` sites (user supplies the position). */
export const attackerLat = (site: AttackerSite): number => site.data[site.index * 4] as number;

/** Longitude (deg) of a launch site's fixed coordinates. Meaningless for `isSub` sites. */
export const attackerLon = (site: AttackerSite): number => site.data[site.index * 4 + 1] as number;

/** Human-readable missile/site description (e.g. "Aleysk (SS-18)"). */
export const attackerDesc = (site: AttackerSite): string => site.data[site.index * 4 + 2] as string;

/** Maximum range (km) for the missile at this site. */
export const attackerRangeKm = (site: AttackerSite): number => site.data[site.index * 4 + 3] as number;

/** Latitude (deg) of a preset target, or `undefined` for the custom-impact sentinel. */
export const targetLat = (id: number): number | undefined => {
  if (id === CUSTOM_TARGET_ID) {
    return undefined;
  }
  if (id >= EXTENDED_TARGET_ID_MIN) {
    return extendedTargetFor(id)?.lat;
  }

  return globalBMTargets[id * 3] as number;
};

/** Longitude (deg) of a preset target, or `undefined` for the custom-impact sentinel. */
export const targetLon = (id: number): number | undefined => {
  if (id === CUSTOM_TARGET_ID) {
    return undefined;
  }
  if (id >= EXTENDED_TARGET_ID_MIN) {
    return extendedTargetFor(id)?.lon;
  }

  return globalBMTargets[id * 3 + 1] as number;
};
