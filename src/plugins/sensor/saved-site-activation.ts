/**
 * Using saved custom sites from the sensor pickers (Sensor List menu, command palette).
 *
 * Keeps the three states apart: a site is `saved` (in the registry), `active` (a sensor for it is
 * in the sensor manager, as primary or secondary) or `current` (the primary sensor). Making a
 * saved site current builds its sensor from the registry when it is not active yet, and demotes a
 * custom primary to a secondary instead of discarding it, so the watch list of sites is kept.
 *
 * @license AGPL-3.0-or-later
 */

import { formatCustomSensorLocation, isCustomSensor } from '@app/app/sensors/custom-sensor-identity';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { customSensorParamsFromRecord } from './custom-sensor-persistence';
import { CustomSensorPlugin } from './custom-sensor-plugin';
import { getSavedSite, getSavedSites, SavedSite } from './custom-site-registry';

export type SavedSiteState = 'current' | 'active' | 'saved';

/** One saved site as the pickers show it. */
export interface SavedSiteRow {
  id: string;
  name: string;
  /** Coordinates line, e.g. `39.739°N, 104.990°W`. */
  location: string;
  state: SavedSiteState;
}

/** The active sensor (primary or secondary) built from saved site `id`, or null. */
export function findActiveSiteSensor(id: string): DetailedSensor | null {
  const sm = ServiceLocator.getSensorManager();

  return [...sm.currentSensors, ...sm.secondarySensors].find((s) => s.objName === id && isCustomSensor(s)) ?? null;
}

/** State of saved site `id` right now. */
export function getSavedSiteState(id: string): SavedSiteState {
  const sm = ServiceLocator.getSensorManager();

  if (sm.currentSensors[0]?.objName === id) {
    return 'current';
  }

  return findActiveSiteSensor(id) ? 'active' : 'saved';
}

/** Rows for every saved site, in saved order. */
export function getSavedSiteRows(): SavedSiteRow[] {
  return getSavedSites().map((site) => ({
    id: site.id,
    name: site.name,
    location: formatCustomSensorLocation(site.lat, site.lon),
    state: getSavedSiteState(site.id),
  }));
}

function buildSensor(site: SavedSite): DetailedSensor {
  return new DetailedSensor(customSensorParamsFromRecord(site));
}

/**
 * Make saved site `id` the current (primary) sensor. Returns the sensor, or null when the id is not
 * in the registry. A custom primary that is being replaced stays active as a secondary; other
 * secondaries are kept; a catalog primary is replaced (it is not a custom site).
 */
export function makeSavedSiteCurrent(id: string): DetailedSensor | null {
  const site = getSavedSite(id);

  if (!site) {
    return null;
  }
  const sm = ServiceLocator.getSensorManager();

  if (sm.currentSensors[0]?.objName === id) {
    return sm.currentSensors[0];
  }

  const sensor = findActiveSiteSensor(id) ?? buildSensor(site);
  const oldPrimary = sm.currentSensors[0];
  const keptSecondaries = sm.secondarySensors.filter((s) => s !== sensor && s.objName !== id);

  if (oldPrimary && isCustomSensor(oldPrimary) && !keptSecondaries.includes(oldPrimary)) {
    keptSecondaries.unshift(oldPrimary);
  }
  // Set before setSensor so its cruncher update and the persisted store already include them
  sm.secondarySensors = keptSecondaries;
  sm.addSecondarySensor(sensor, true);

  return sensor;
}

/**
 * Add saved site `id` to the active sensors without changing the current one: it becomes a secondary
 * sensor (so look angles, field of view and Multi-Sensor Look Angles include it). With no primary
 * sensor yet it becomes the primary. Returns the active sensor, or null for an unknown id.
 */
export function activateSavedSite(id: string): DetailedSensor | null {
  const site = getSavedSite(id);

  if (!site) {
    return null;
  }
  const existing = findActiveSiteSensor(id);

  if (existing) {
    return existing;
  }
  const sensor = buildSensor(site);

  ServiceLocator.getSensorManager().addSecondarySensor(sensor);
  persistActiveSites();

  return sensor;
}

/** Take saved site `id` out of the active sensors. The saved definition stays. Returns true when it was active. */
export function deactivateSavedSite(id: string): boolean {
  const sensor = findActiveSiteSensor(id);

  if (!sensor) {
    return false;
  }
  ServiceLocator.getSensorManager().removeSensor(sensor);
  persistActiveSites();

  return true;
}

/** Active-set changes that bypass the setSensor event still need the persisted store and the Custom Sensor list refreshed. */
function persistActiveSites(): void {
  CustomSensorPlugin.saveCustomSensors();
  CustomSensorPlugin.updateCustomSensorListDom();
}
