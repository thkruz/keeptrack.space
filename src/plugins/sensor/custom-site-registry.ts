/**
 * Saved custom-site registry.
 *
 * Keeps every custom site the user has created, whether or not it is active in the
 * sensor manager. Three separate states, never conflated:
 *  - saved: the site is in this registry (survives Clear / Reset Sensor and reloads);
 *  - active: a DetailedSensor for it is in the sensor manager (primary or secondary);
 *  - current: it is the primary sensor.
 *
 * A site's `id` is its sensor objName (`Custom Sensor-<random>`), assigned once at creation and
 * never derived from the display name, so two sites may share a name and a rename keeps the id.
 * `revision` rises whenever the saved definition changes. Consumers that run an analysis take a
 * {@link snapshotSavedSites} copy at run start so a later edit cannot alter a finished result.
 *
 * DOM-free apart from PersistenceManager I/O, so it is unit-testable without jsdom.
 *
 * @license AGPL-3.0-or-later
 */

import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { CustomSensorRecord, CustomSensorSource, parseCustomSensorStore, toCustomSensorRecord } from './custom-sensor-persistence';

/** Bump when the registry document shape changes incompatibly; older documents are ignored. */
export const CUSTOM_SITE_REGISTRY_VERSION = 1;

/** One saved site: the definition plus its stable id and a change counter. */
export interface SavedSite extends CustomSensorRecord {
  /** Stable identity; equal to `objName`. */
  id: string;
  /** Starts at 1; incremented when the saved definition changes. */
  revision: number;
}

interface RegistryDocument {
  version: number;
  sites: SavedSite[];
}

type RegistryListener = () => void;

const listeners = new Set<RegistryListener>();

/** Subscribe to registry changes (add, edit, remove). Returns an unsubscribe function. */
export function onSavedSitesChanged(listener: RegistryListener): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function isSavedSite(value: unknown): value is SavedSite {
  const parsed = parseCustomSensorStore(JSON.stringify({ version: 1, primaryObjName: null, sensors: [value] }));

  if (!parsed || parsed.sensors.length !== 1) {
    return false;
  }
  const rec = value as Record<string, unknown>;

  return typeof rec.id === 'string' && rec.id === rec.objName && typeof rec.revision === 'number' && Number.isInteger(rec.revision) && rec.revision >= 1;
}

/** Parse a stored registry document; null for missing, corrupt or wrong-version data. Bad records are skipped. */
export function parseSavedSites(json: string | null | undefined): SavedSite[] | null {
  if (!json) {
    return null;
  }
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const doc = parsed as Partial<RegistryDocument> | null;

  if (!doc || typeof doc !== 'object' || doc.version !== CUSTOM_SITE_REGISTRY_VERSION || !Array.isArray(doc.sites)) {
    return null;
  }

  const seen = new Set<string>();

  return doc.sites.filter(isSavedSite).filter((site) => {
    if (seen.has(site.id)) {
      return false;
    }
    seen.add(site.id);

    return true;
  });
}

function read(): SavedSite[] {
  return parseSavedSites(PersistenceManager.getInstance().getItem(StorageKey.CUSTOM_SITE_REGISTRY)) ?? [];
}

function write(sites: SavedSite[]): void {
  const persistence = PersistenceManager.getInstance();

  if (sites.length === 0) {
    persistence.removeItem(StorageKey.CUSTOM_SITE_REGISTRY);
  } else {
    persistence.saveItem(StorageKey.CUSTOM_SITE_REGISTRY, JSON.stringify({ version: CUSTOM_SITE_REGISTRY_VERSION, sites } satisfies RegistryDocument));
  }
}

function clone(site: SavedSite): SavedSite {
  const copy: SavedSite = { ...site };

  if (site.elevationMasks) {
    copy.elevationMasks = site.elevationMasks.map((m) => ({ ...m }));
  }

  return copy;
}

function toCanonical(rec: CustomSensorRecord): unknown[] {
  return [
    rec.objName,
    rec.name,
    rec.type,
    rec.lat,
    rec.lon,
    rec.alt,
    rec.minAz,
    rec.maxAz,
    rec.minEl,
    rec.maxEl,
    rec.minRng,
    rec.maxRng,
    rec.zoom ?? null,
    rec.timeZone ?? null,
    rec.interpolateMask === true,
    (rec.elevationMasks ?? []).map((m) => [m.startAz, m.stopAz, m.minEl]),
  ];
}

/** Definition equality ignoring id and revision. */
function sameDefinition(a: CustomSensorRecord, b: CustomSensorRecord): boolean {
  return JSON.stringify(toCanonical(a)) === JSON.stringify(toCanonical(b));
}

/** All saved sites in the order they were first saved. Returns copies. */
export function getSavedSites(): SavedSite[] {
  return read().map(clone);
}

/** One saved site by stable id, or null. */
export function getSavedSite(id: string | null | undefined): SavedSite | null {
  const site = id ? read().find((s) => s.id === id) : undefined;

  return site ? clone(site) : null;
}

/**
 * Save sites in one write: new ids are added with revision 1; a known id is updated in place and its
 * revision rises only when the definition changed. Returns true when the registry changed.
 */
export function saveSites(sources: CustomSensorSource[]): boolean {
  const sites = read();
  let isChanged = false;

  for (const source of sources) {
    const record = toCustomSensorRecord(source);

    if (!record.objName) {
      continue;
    }
    const index = sites.findIndex((s) => s.id === record.objName);

    if (index === -1) {
      sites.push({ ...record, id: record.objName, revision: 1 });
      isChanged = true;
    } else if (!sameDefinition(sites[index], record)) {
      sites[index] = { ...record, id: record.objName, revision: sites[index].revision + 1 };
      isChanged = true;
    }
  }
  if (isChanged) {
    write(sites);
    notify();
  }

  return isChanged;
}

/** Save one site; returns the stored copy, or null when it has no objName. */
export function saveSite(source: CustomSensorSource): SavedSite | null {
  saveSites([source]);

  return getSavedSite(source.objName);
}

/** Rename a saved site. The id and every other field stay. Returns the new site or null if unknown. */
export function renameSavedSite(id: string, name: string): SavedSite | null {
  const trimmed = name.trim();
  const sites = read();
  const index = sites.findIndex((s) => s.id === id);

  if (index === -1 || trimmed.length === 0) {
    return null;
  }
  if (sites[index].name !== trimmed) {
    sites[index] = { ...sites[index], name: trimmed, revision: sites[index].revision + 1 };
    write(sites);
    notify();
  }

  return clone(sites[index]);
}

/** Delete a saved site. Returns true when it existed. Does not touch an active sensor of that id. */
export function removeSavedSite(id: string): boolean {
  const sites = read();
  const next = sites.filter((s) => s.id !== id);

  if (next.length === sites.length) {
    return false;
  }
  write(next);
  notify();

  return true;
}

/**
 * Deep copies of the named sites at this moment. Take this at analysis start: later edits and
 * renames do not change the returned objects. Unknown ids are skipped; duplicate ids are
 * returned once (deduplication is by id, never by display name).
 */
export function snapshotSavedSites(ids: readonly string[]): SavedSite[] {
  const all = read();
  const out: SavedSite[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    const site = all.find((s) => s.id === id);

    if (site && !seen.has(id)) {
      seen.add(id);
      out.push(clone(site));
    }
  }

  return out;
}

/** Tell subscribers the stored registry changed underneath us (account sync). */
export function notifySavedSitesReloaded(): void {
  notify();
}
