import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { applyPersistedSetting, PERSISTED_SETTINGS_TABLE, SETTINGS_MENU_OWNED_KEYS } from '@app/settings/persisted-settings-table';
import { SettingsManager } from '@app/settings/settings';
import { vi } from 'vitest';

/*
 * The persisted-settings table is the shared source for preserveSettings (write
 * side) and loadPersistedSettings (read side). These tests guard against a new
 * settings-menu StorageKey being added without a table entry, and prove each
 * entry round-trips.
 */
describe('persisted-settings-table', () => {
  beforeEach(() => {
    localStorage.clear();
    PersistenceManager.resetInstance();
  });

  it('covers every settings-menu/graphics StorageKey that is not owned elsewhere', () => {
    /*
     * Keys under the settings/graphics prefixes with a different owner:
     * dot colors belong to the color pipeline (setColorSettings_), the legacy
     * sat-label boolean is a migration source only, and search settings are
     * owned by SearchSettingsPlugin.
     */
    const ownedElsewhere = new Set<StorageKey>([
      StorageKey.SETTINGS_DOT_COLORS,
      StorageKey.SETTINGS_SAT_LABEL_MODE,
      StorageKey.SETTINGS_SEARCH_LIMIT,
      StorageKey.SETTINGS_SHOW_DECAYED_IN_SEARCH,
      StorageKey.SETTINGS_MINIMUM_SEARCH_CHARACTERS,
      StorageKey.SETTINGS_SHOW_VIMPEL_IN_SEARCH,
      StorageKey.SETTINGS_SEARCHABLE_FIELDS,
      StorageKey.SETTINGS_SEARCHABLE_TYPES,
    ]);

    const expected = Object.values(StorageKey)
      .filter((key) => key.startsWith('v2-keepTrack-settings-') || key.startsWith('v2-keepTrack-graphicsSettings-'))
      .filter((key) => !ownedElsewhere.has(key))
      .sort();

    expect([...SETTINGS_MENU_OWNED_KEYS].sort()).toEqual(expected);
  });

  it('has no duplicate keys', () => {
    expect(new Set(SETTINGS_MENU_OWNED_KEYS).size).toBe(SETTINGS_MENU_OWNED_KEYS.length);
  });

  it('round-trips every entry through serialize/deserialize without throwing', () => {
    const settings = new SettingsManager();

    for (const entry of PERSISTED_SETTINGS_TABLE) {
      const raw = entry.serialize(settings);

      expect(() => applyPersistedSetting(settings, entry.key, raw)).not.toThrow();

      // A second serialize after applying must be stable (idempotent apply)
      expect(entry.serialize(settings)).toBe(raw);
    }
  });

  it('round-trips boolean values faithfully', () => {
    const settings = new SettingsManager();

    settings.isDrawOrbits = true;
    const raw = PERSISTED_SETTINGS_TABLE.find((entry) => entry.key === StorageKey.SETTINGS_DRAW_ORBITS)!.serialize(settings);

    settings.isDrawOrbits = false;
    applyPersistedSetting(settings, StorageKey.SETTINGS_DRAW_ORBITS, raw);

    expect(settings.isDrawOrbits).toBe(true);
  });

  it('returns false for keys outside the table', () => {
    const settings = new SettingsManager();

    expect(applyPersistedSetting(settings, StorageKey.WATCHLIST_LIST, '[]')).toBe(false);
  });

  // Resilience: a corrupt/incompatible saved value whose deserialize throws must
  // NOT propagate - one bad key would otherwise abort loadPersistedSettings and
  // wedge boot. It should be swallowed so the rest of the settings still apply.
  it('swallows a throwing deserialize instead of breaking the settings load', () => {
    const settings = new SettingsManager();
    const entry = PERSISTED_SETTINGS_TABLE.find((e) => e.key === StorageKey.SETTINGS_DRAW_ORBITS)!;
    const spy = vi.spyOn(entry, 'deserialize').mockImplementation(() => {
      throw new Error('corrupt persisted value');
    });

    expect(() => applyPersistedSetting(settings, StorageKey.SETTINGS_DRAW_ORBITS, 'garbage')).not.toThrow();
    expect(applyPersistedSetting(settings, StorageKey.SETTINGS_DRAW_ORBITS, 'garbage')).toBe(true);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('still applies later settings after an earlier one throws', () => {
    const settings = new SettingsManager();
    const sunEntry = PERSISTED_SETTINGS_TABLE.find((e) => e.key === StorageKey.SETTINGS_DRAW_SUN)!;
    const spy = vi.spyOn(sunEntry, 'deserialize').mockImplementation(() => {
      throw new Error('boom');
    });

    // The bad key is isolated...
    applyPersistedSetting(settings, StorageKey.SETTINGS_DRAW_SUN, 'true');
    // ...and a subsequent good key still applies normally.
    settings.isDrawOrbits = false;
    applyPersistedSetting(settings, StorageKey.SETTINGS_DRAW_ORBITS, 'true');

    expect(settings.isDrawOrbits).toBe(true);

    spy.mockRestore();
  });
});
