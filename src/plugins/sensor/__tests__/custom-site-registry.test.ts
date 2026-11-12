import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { SpaceObjectType } from '@ootk/src/main';
import { vi } from 'vitest';
import type { CustomSensorSource } from '../custom-sensor-persistence';
import {
  getSavedSite,
  getSavedSites,
  notifySavedSitesReloaded,
  onSavedSitesChanged,
  parseSavedSites,
  removeSavedSite,
  renameSavedSite,
  saveSite,
  saveSites,
  snapshotSavedSites,
} from '../custom-site-registry';

const site = (objName: string, name: string, lat = 10): CustomSensorSource => ({
  objName,
  name,
  uiName: name,
  type: SpaceObjectType.MECHANICAL,
  lat,
  lon: 20,
  alt: 0.1,
  minAz: 0,
  maxAz: 360,
  minEl: 5,
  maxEl: 90,
  minRng: 100,
  maxRng: 50000,
  isCustomSensor: true,
});

describe('custom-site-registry', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    const persistence = PersistenceManager.getInstance();

    vi.spyOn(persistence, 'saveItem').mockImplementation((key: string, value: string) => {
      store.set(key, value);
    });
    vi.spyOn(persistence, 'getItem').mockImplementation((key: string) => store.get(key) ?? null);
    vi.spyOn(persistence, 'removeItem').mockImplementation((key: string) => {
      store.delete(key);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves a site with a stable id equal to its objName and revision 1', () => {
    const saved = saveSite(site('Custom Sensor-aaa', 'RIDGE'));

    expect(saved).toMatchObject({ id: 'Custom Sensor-aaa', objName: 'Custom Sensor-aaa', name: 'RIDGE', revision: 1 });
    expect(store.has(StorageKey.CUSTOM_SITE_REGISTRY)).toBe(true);
  });

  it('keeps two sites with the same display name apart by id', () => {
    saveSites([site('Custom Sensor-aaa', 'RIDGE'), site('Custom Sensor-bbb', 'RIDGE', 11)]);

    expect(getSavedSites().map((s) => s.id)).toEqual(['Custom Sensor-aaa', 'Custom Sensor-bbb']);
  });

  it('keeps both sites after the first is saved again and the second is added (no replacement)', () => {
    saveSite(site('Custom Sensor-aaa', 'RIDGE'));
    saveSite(site('Custom Sensor-bbb', 'COAST'));

    expect(getSavedSites()).toHaveLength(2);
  });

  it('does not bump the revision when the definition is unchanged, and bumps it when it changes', () => {
    saveSite(site('Custom Sensor-aaa', 'RIDGE'));
    saveSite(site('Custom Sensor-aaa', 'RIDGE'));
    expect(getSavedSite('Custom Sensor-aaa')?.revision).toBe(1);

    saveSite(site('Custom Sensor-aaa', 'RIDGE', 12));
    expect(getSavedSite('Custom Sensor-aaa')).toMatchObject({ revision: 2, lat: 12 });
  });

  it('rename keeps the id and bumps the revision; unknown ids and empty names are rejected', () => {
    saveSites([site('Custom Sensor-aaa', 'RIDGE'), site('Custom Sensor-bbb', 'RIDGE')]);

    const renamed = renameSavedSite('Custom Sensor-aaa', '  PEAK ');

    expect(renamed).toMatchObject({ id: 'Custom Sensor-aaa', name: 'PEAK', revision: 2 });
    expect(getSavedSite('Custom Sensor-bbb')?.name).toBe('RIDGE');
    expect(renameSavedSite('nope', 'X')).toBeNull();
    expect(renameSavedSite('Custom Sensor-aaa', '   ')).toBeNull();
  });

  it('survives a reload: a fresh read parses the stored document', () => {
    saveSites([site('Custom Sensor-aaa', 'RIDGE'), site('Custom Sensor-bbb', 'COAST')]);

    const reloaded = parseSavedSites(store.get(StorageKey.CUSTOM_SITE_REGISTRY));

    expect(reloaded?.map((s) => s.name)).toEqual(['RIDGE', 'COAST']);
  });

  it('removes a site, and removes the key when the last one goes', () => {
    saveSites([site('Custom Sensor-aaa', 'RIDGE'), site('Custom Sensor-bbb', 'COAST')]);

    expect(removeSavedSite('Custom Sensor-aaa')).toBe(true);
    expect(getSavedSites().map((s) => s.id)).toEqual(['Custom Sensor-bbb']);
    expect(removeSavedSite('Custom Sensor-aaa')).toBe(false);
    removeSavedSite('Custom Sensor-bbb');
    expect(store.has(StorageKey.CUSTOM_SITE_REGISTRY)).toBe(false);
  });

  it('snapshot deduplicates by id, skips unknown ids and is unaffected by later edits', () => {
    saveSites([site('Custom Sensor-aaa', 'RIDGE'), site('Custom Sensor-bbb', 'RIDGE', 11)]);

    const snap = snapshotSavedSites(['Custom Sensor-aaa', 'Custom Sensor-bbb', 'Custom Sensor-aaa', 'gone']);

    expect(snap.map((s) => s.id)).toEqual(['Custom Sensor-aaa', 'Custom Sensor-bbb']);

    renameSavedSite('Custom Sensor-aaa', 'RENAMED');
    expect(snap[0].name).toBe('RIDGE');
    expect(snap[0].revision).toBe(1);
  });

  it('returns copies so callers cannot edit the stored mask', () => {
    const withMask = { ...site('Custom Sensor-aaa', 'RIDGE'), elevationMasks: [{ startAz: 0, stopAz: 90, minEl: 10 }] };

    saveSite(withMask as CustomSensorSource);
    const first = getSavedSite('Custom Sensor-aaa');

    first?.elevationMasks?.push({ startAz: 90, stopAz: 180, minEl: 20 } as never);
    expect(getSavedSite('Custom Sensor-aaa')?.elevationMasks).toHaveLength(1);
  });

  it('ignores corrupt, wrong-version and invalid records', () => {
    expect(parseSavedSites('not json')).toBeNull();
    expect(parseSavedSites(JSON.stringify({ version: 99, sites: [] }))).toBeNull();
    expect(parseSavedSites(null)).toBeNull();

    saveSite(site('Custom Sensor-aaa', 'RIDGE'));
    const doc = JSON.parse(store.get(StorageKey.CUSTOM_SITE_REGISTRY) as string);

    doc.sites.push({ id: 'x', objName: 'x', revision: 1 }, { ...doc.sites[0] });
    expect(parseSavedSites(JSON.stringify(doc))).toHaveLength(1);
  });

  it('notifies subscribers on change and on reload, and unsubscribes', () => {
    const listener = vi.fn();
    const off = onSavedSitesChanged(listener);

    saveSite(site('Custom Sensor-aaa', 'RIDGE'));
    saveSite(site('Custom Sensor-aaa', 'RIDGE'));
    expect(listener).toHaveBeenCalledTimes(1);
    notifySavedSitesReloaded();
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    removeSavedSite('Custom Sensor-aaa');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
