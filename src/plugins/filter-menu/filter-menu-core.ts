import { StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';

/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

/**
 * Pure, DOM-free logic for the Filter Menu plugin: the filter catalog, the
 * persistence map, the named filter groups, and the state operations that drive
 * the command-palette presets. Keeping this here lets the plugin treat
 * `settingsManager.filter` (not the DOM) as the source of truth and lets the
 * logic be unit-tested without booting the UI.
 */

export interface FilterPluginSettings {
  xGEOSatellites?: boolean;
  vLEOSatellites?: boolean;
  operationalPayloads?: boolean;
  nonOperationalPayloads?: boolean;
  rocketBodies?: boolean;
  debris?: boolean;
  unknownType?: boolean;
  groundSensors?: boolean;
  launchFacilities?: boolean;
  starlinkSatellites?: boolean;
  hEOSatellites?: boolean;
  mEOSatellites?: boolean;
  gEOSatellites?: boolean;
  lEOSatellites?: boolean;
  unitedStates?: boolean;
  unitedKingdom?: boolean;
  france?: boolean;
  germany?: boolean;
  japan?: boolean;
  china?: boolean;
  india?: boolean;
  russia?: boolean;
  uSSR?: boolean;
  southKorea?: boolean;
  australia?: boolean;
  otherCountries?: boolean;
  vimpelSatellites?: boolean;
  celestrakSatellites?: boolean;
  celestrakSupSatellites?: boolean;
  satnogsSatellites?: boolean;
  notionalSatellites?: boolean;
}

export interface Filters {
  name: string;
  category: string;
  id?: string;
  tooltip?: string;
  checked?: boolean;
  disabled?: boolean;
}

/** Maps each filter id to the persistence key used to save/restore it. */
export const FILTER_STORAGE_MAP: Record<string, StorageKey> = {
  operationalPayloads: StorageKey.FILTER_SETTINGS_OPERATIONAL_PAYLOADS,
  nonOperationalPayloads: StorageKey.FILTER_SETTINGS_NON_OPERATIONAL_PAYLOADS,
  rocketBodies: StorageKey.FILTER_SETTINGS_ROCKET_BODIES,
  debris: StorageKey.FILTER_SETTINGS_DEBRIS,
  unknownType: StorageKey.FILTER_SETTINGS_UNKNOWN_TYPE,
  vLEOSatellites: StorageKey.FILTER_SETTINGS_VLEO,
  lEOSatellites: StorageKey.FILTER_SETTINGS_LEO,
  hEOSatellites: StorageKey.FILTER_SETTINGS_HEO,
  mEOSatellites: StorageKey.FILTER_SETTINGS_MEO,
  gEOSatellites: StorageKey.FILTER_SETTINGS_GEO,
  xGEOSatellites: StorageKey.FILTER_SETTINGS_X_GEO,
  vimpelSatellites: StorageKey.FILTER_SETTINGS_VIMPEL,
  celestrakSatellites: StorageKey.FILTER_SETTINGS_CELESTRAK,
  celestrakSupSatellites: StorageKey.FILTER_SETTINGS_CELESTRAK_SUP,
  satnogsSatellites: StorageKey.FILTER_SETTINGS_SATNOGS,
  notionalSatellites: StorageKey.FILTER_SETTINGS_NOTIONAL,
  groundSensors: StorageKey.FILTER_SETTINGS_GROUND_SENSORS,
  launchFacilities: StorageKey.FILTER_SETTINGS_LAUNCH_FACILITIES,
  unitedStates: StorageKey.FILTER_SETTINGS_UNITED_STATES,
  unitedKingdom: StorageKey.FILTER_SETTINGS_UNITED_KINGDOM,
  france: StorageKey.FILTER_SETTINGS_FRANCE,
  germany: StorageKey.FILTER_SETTINGS_GERMANY,
  japan: StorageKey.FILTER_SETTINGS_JAPAN,
  china: StorageKey.FILTER_SETTINGS_CHINA,
  india: StorageKey.FILTER_SETTINGS_INDIA,
  russia: StorageKey.FILTER_SETTINGS_RUSSIA,
  uSSR: StorageKey.FILTER_SETTINGS_USSR,
  southKorea: StorageKey.FILTER_SETTINGS_SOUTH_KOREA,
  australia: StorageKey.FILTER_SETTINGS_AUSTRALIA,
  otherCountries: StorageKey.FILTER_SETTINGS_OTHER_COUNTRIES,
  starlinkSatellites: StorageKey.FILTER_SETTINGS_STARLINK,
};

/** Object-type filters (payloads, debris, ground sites, ...). */
export const OBJECT_TYPE_FILTERS = [
  'operationalPayloads',
  'nonOperationalPayloads',
  'rocketBodies',
  'debris',
  'unknownType',
  'notionalSatellites',
  'groundSensors',
  'launchFacilities',
];
/** Orbital-regime filters (vLEO through xGEO). */
export const ORBITAL_REGIME_FILTERS = ['vLEOSatellites', 'lEOSatellites', 'mEOSatellites', 'gEOSatellites', 'hEOSatellites', 'xGEOSatellites'];
/** Country / nation-of-origin filters. */
export const COUNTRY_FILTERS = ['unitedStates', 'unitedKingdom', 'france', 'germany', 'japan', 'china', 'india', 'russia', 'uSSR', 'southKorea', 'australia', 'otherCountries'];
/** Data-source filters (Vimpel is only present when the JSC catalog is enabled). */
export const SOURCE_FILTERS = ['vimpelSatellites', 'celestrakSatellites', 'celestrakSupSatellites', 'satnogsSatellites'];

/**
 * Derives a stable filter id from a display name (camelCase, whitespace
 * stripped). Only used as a fallback for filters without an explicit id.
 */
export const generateFilterId = (name: string): string => `${name.charAt(0).toLowerCase()}${name.slice(1).replace(/\s+/gu, '')}`;

/** The default checked state for a filter: respect an explicit `checked`, otherwise on unless disabled. */
export const defaultFilterValue = (filter: Filters): boolean => filter.checked ?? !filter.disabled;

/**
 * The full filter catalog, grouped by `category`. A getter (not a static field)
 * so `t7e()` is evaluated lazily once localization has loaded, and so the Vimpel
 * row is included/excluded based on the current `isEnableJscCatalog` setting.
 */
export const getFilters = (): Filters[] => [
  {
    id: 'operationalPayloads',
    name: t7e('filterMenu.operationalPayloads.name'),
    category: t7e('filterMenu.operationalPayloads.category'),
    tooltip: t7e('filterMenu.operationalPayloads.tooltip'),
  },
  {
    id: 'nonOperationalPayloads',
    name: t7e('filterMenu.nonOperationalPayloads.name'),
    category: t7e('filterMenu.nonOperationalPayloads.category'),
    tooltip: t7e('filterMenu.nonOperationalPayloads.tooltip'),
  },
  {
    id: 'rocketBodies',
    name: t7e('filterMenu.rocketBodies.name'),
    category: t7e('filterMenu.rocketBodies.category'),
    tooltip: t7e('filterMenu.rocketBodies.tooltip'),
  },
  {
    id: 'debris',
    name: t7e('filterMenu.debris.name'),
    category: t7e('filterMenu.debris.category'),
    tooltip: t7e('filterMenu.debris.tooltip'),
  },
  {
    id: 'unknownType',
    name: t7e('filterMenu.unknownType.name'),
    category: t7e('filterMenu.unknownType.category'),
    tooltip: t7e('filterMenu.unknownType.tooltip'),
  },
  {
    id: 'notionalSatellites',
    name: t7e('filterMenu.notionalSatellites.name'),
    category: t7e('filterMenu.notionalSatellites.category'),
    tooltip: t7e('filterMenu.notionalSatellites.tooltip'),
  },
  {
    id: 'groundSensors',
    name: t7e('filterMenu.groundSensors.name'),
    category: t7e('filterMenu.groundSensors.category'),
    tooltip: t7e('filterMenu.groundSensors.tooltip'),
  },
  {
    id: 'launchFacilities',
    name: t7e('filterMenu.launchFacilities.name'),
    category: t7e('filterMenu.launchFacilities.category'),
    tooltip: t7e('filterMenu.launchFacilities.tooltip'),
  },
  {
    id: 'vLEOSatellites',
    name: t7e('filterMenu.vleoSatellites.name'),
    category: t7e('filterMenu.vleoSatellites.category'),
    tooltip: t7e('filterMenu.vleoSatellites.tooltip'),
  },
  {
    id: 'lEOSatellites',
    name: t7e('filterMenu.leoSatellites.name'),
    category: t7e('filterMenu.leoSatellites.category'),
    tooltip: t7e('filterMenu.leoSatellites.tooltip'),
  },
  {
    id: 'hEOSatellites',
    name: t7e('filterMenu.heoSatellites.name'),
    category: t7e('filterMenu.heoSatellites.category'),
    tooltip: t7e('filterMenu.heoSatellites.tooltip'),
  },
  {
    id: 'mEOSatellites',
    name: t7e('filterMenu.meoSatellites.name'),
    category: t7e('filterMenu.meoSatellites.category'),
    tooltip: t7e('filterMenu.meoSatellites.tooltip'),
  },
  {
    id: 'gEOSatellites',
    name: t7e('filterMenu.geoSatellites.name'),
    category: t7e('filterMenu.geoSatellites.category'),
    tooltip: t7e('filterMenu.geoSatellites.tooltip'),
  },
  {
    id: 'xGEOSatellites',
    name: t7e('filterMenu.xgeoSatellites.name'),
    category: t7e('filterMenu.xgeoSatellites.category'),
    tooltip: t7e('filterMenu.xgeoSatellites.tooltip'),
  },
  ...(settingsManager.isEnableJscCatalog
    ? [
        {
          id: 'vimpelSatellites',
          name: t7e('filterMenu.vimpelSatellites.name'),
          category: t7e('filterMenu.source.category'),
          tooltip: t7e('filterMenu.vimpelSatellites.tooltip'),
        },
      ]
    : []),
  {
    id: 'celestrakSatellites',
    name: t7e('filterMenu.celestrakSatellites.name'),
    category: t7e('filterMenu.source.category'),
    tooltip: t7e('filterMenu.celestrakSatellites.tooltip'),
  },
  {
    id: 'celestrakSupSatellites',
    name: t7e('filterMenu.celestrakSupSatellites.name'),
    category: t7e('filterMenu.source.category'),
    tooltip: t7e('filterMenu.celestrakSupSatellites.tooltip'),
  },
  {
    id: 'satnogsSatellites',
    name: t7e('filterMenu.satnogsSatellites.name'),
    category: t7e('filterMenu.source.category'),
    tooltip: t7e('filterMenu.satnogsSatellites.tooltip'),
  },
  {
    id: 'unitedStates',
    name: t7e('filterMenu.countries.unitedStates.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.unitedStates.tooltip'),
  },
  {
    id: 'unitedKingdom',
    name: t7e('filterMenu.countries.unitedKingdom.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.unitedKingdom.tooltip'),
  },
  {
    id: 'france',
    name: t7e('filterMenu.countries.france.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.france.tooltip'),
  },
  {
    id: 'germany',
    name: t7e('filterMenu.countries.germany.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.germany.tooltip'),
  },
  {
    id: 'japan',
    name: t7e('filterMenu.countries.japan.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.japan.tooltip'),
  },
  {
    id: 'china',
    name: t7e('filterMenu.countries.china.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.china.tooltip'),
  },
  {
    id: 'india',
    name: t7e('filterMenu.countries.india.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.india.tooltip'),
  },
  {
    id: 'russia',
    name: t7e('filterMenu.countries.russia.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.russia.tooltip'),
  },
  {
    id: 'uSSR',
    name: t7e('filterMenu.countries.ussr.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.ussr.tooltip'),
  },
  {
    id: 'southKorea',
    name: t7e('filterMenu.countries.southKorea.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.southKorea.tooltip'),
  },
  {
    id: 'australia',
    name: t7e('filterMenu.countries.australia.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.australia.tooltip'),
  },
  {
    id: 'otherCountries',
    name: t7e('filterMenu.countries.otherCountries.name'),
    category: t7e('filterMenu.countries.category'),
    tooltip: t7e('filterMenu.countries.otherCountries.tooltip'),
  },
  {
    id: 'starlinkSatellites',
    name: t7e('filterMenu.miscellaneous.starlinkSatellites.name'),
    category: t7e('filterMenu.miscellaneous.category'),
    tooltip: t7e('filterMenu.miscellaneous.starlinkSatellites.tooltip'),
  },
];

/**
 * Whether every filter currently matches its default value. `getValue` reads the
 * current state (e.g. from `settingsManager.filter`); a missing value is treated
 * as the default so an untouched filter never counts as changed.
 */
export const isDefaultState = (getValue: (id: string) => boolean | undefined): boolean =>
  getFilters().every((filter) => {
    const id = filter.id ?? generateFilterId(filter.name);
    const current = getValue(id);
    const fallback = defaultFilterValue(filter);

    return (typeof current === 'boolean' ? current : fallback) === fallback;
  });

/** Build a state patch enabling only `targetId` within `groupIds` (all others off). */
export const showOnlyInGroup = (targetId: string, groupIds: string[]): Record<string, boolean> => Object.fromEntries(groupIds.map((id) => [id, id === targetId]));

/** Build a state patch setting every filter in `groupIds` to `enabled`. */
export const enableGroup = (groupIds: string[], enabled: boolean): Record<string, boolean> => Object.fromEntries(groupIds.map((id) => [id, enabled]));

/** Build a state patch that, among object-type filters, shows only payloads. */
export const showOnlyPayloads = (): Record<string, boolean> =>
  Object.fromEntries(OBJECT_TYPE_FILTERS.map((id) => [id, id === 'operationalPayloads' || id === 'nonOperationalPayloads']));
