import { PersistenceManager } from '@app/engine/persistence/persistence-manager';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { SettingsManager, settingsManager } from '@app/settings/settings';
import { vi } from 'vitest';

describe('SettingsManager persistence', () => {
  // preserveSettings() reads the module-level settingsManager singleton, so mutate
  // that object directly rather than globalThis (other suites swap the global).
  const sm = () => settingsManager;
  let originalOffline: boolean;

  beforeEach(() => {
    originalOffline = sm().offlineMode;
    // preserveSettings drops writes until the app signals boot completion
    SettingsManager.armPersistence();
  });

  afterEach(() => {
    sm().offlineMode = originalOffline;
    vi.restoreAllMocks();
  });

  describe('disableAllPlugins', () => {
    it('sets every plugin flag to false', () => {
      const settings = new SettingsManager();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (settings as any).plugins = { foo: true, bar: true, baz: false };

      settings.disableAllPlugins();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plugins = (settings as any).plugins;

      expect(Object.values(plugins).every((v) => v === false)).toBe(true);
    });
  });

  describe('preserveSettings (static)', () => {
    it('persists draw settings regardless of offline mode', () => {
      sm().offlineMode = false;
      sm().isDrawOrbits = true;
      const saveSpy = vi.spyOn(PersistenceManager.getInstance(), 'saveItem');

      SettingsManager.preserveSettings();

      expect(saveSpy).toHaveBeenCalledWith(StorageKey.SETTINGS_DRAW_ORBITS, 'true');
    });

    it('never writes keys the URL explicitly overrode this session', () => {
      sm().urlOverriddenSettingKeys.add(StorageKey.SETTINGS_DRAW_ORBITS);
      const saveSpy = vi.spyOn(PersistenceManager.getInstance(), 'saveItem');

      try {
        SettingsManager.preserveSettings();

        expect(saveSpy).not.toHaveBeenCalledWith(StorageKey.SETTINGS_DRAW_ORBITS, expect.anything());
        expect(saveSpy).toHaveBeenCalledWith(StorageKey.SETTINGS_DRAW_SUN, expect.anything());
      } finally {
        sm().urlOverriddenSettingKeys.delete(StorageKey.SETTINGS_DRAW_ORBITS);
      }
    });

    it('removes the confidence-levels key when the setting is off', () => {
      sm().isShowConfidenceLevels = false;
      const removeSpy = vi.spyOn(PersistenceManager.getInstance(), 'removeItem');

      SettingsManager.preserveSettings();

      expect(removeSpy).toHaveBeenCalledWith(StorageKey.SETTINGS_CONFIDENCE_LEVELS);
    });
  });

  describe('loadPersistedSettings', () => {
    it('loads boolean draw settings from storage regardless of offline mode', () => {
      const settings = new SettingsManager();

      settings.offlineMode = false;
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_ORBITS, 'true');
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_SUN, 'false');

      settings.loadPersistedSettings();

      expect(settings.isDrawOrbits).toBe(true);
      expect(settings.isDrawSun).toBe(false);
    });

    it('skips keys the URL explicitly overrode this session', () => {
      const settings = new SettingsManager();

      settings.isDrawOrbits = false;
      settings.urlOverriddenSettingKeys.add(StorageKey.SETTINGS_DRAW_ORBITS);
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_ORBITS, 'true');

      settings.loadPersistedSettings();

      expect(settings.isDrawOrbits).toBe(false);
    });

    // Search-setting persistence (searchLimit, decayed/Vimpel toggles, searchable fields)
    // is owned by SearchSettingsPlugin and covered by its own tests.

    it('migrates the legacy boolean sat-label key when the v2 key is absent', () => {
      const settings = new SettingsManager();

      PersistenceManager.getInstance().removeItem(StorageKey.SETTINGS_SAT_LABEL_MODE_V2);
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_SAT_LABEL_MODE, 'true');

      expect(() => settings.loadPersistedSettings()).not.toThrow();
    });
  });

  describe('URL override precedence', () => {
    it('marks settings changed during override parsing as explicitly set', () => {
      const settings = new SettingsManager();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const snapshot = (settings as any).snapshotPersistedSettings_();

      // Simulate a URL param flipping a draw setting during override parsing
      settings.isDrawOrbits = !settings.isDrawOrbits;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (settings as any).recordUrlOverriddenSettings_(snapshot);

      expect(settings.urlOverriddenSettingKeys.has(StorageKey.SETTINGS_DRAW_ORBITS)).toBe(true);
      expect(settings.urlOverriddenSettingKeys.has(StorageKey.SETTINGS_DRAW_SUN)).toBe(false);
    });
  });

  describe('exportSettingsToJSON', () => {
    it('builds a settings blob and triggers an anchor download', () => {
      const click = vi.fn();
      const anchor = { href: '', download: '', click } as unknown as HTMLAnchorElement;

      vi.spyOn(document, 'createElement').mockReturnValue(anchor);
      const urlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:settings');

      new SettingsManager().exportSettingsToJSON();

      expect(urlSpy).toHaveBeenCalled();
      expect(anchor.download).toBe('settings.json');
      expect(click).toHaveBeenCalled();
    });
  });
});
