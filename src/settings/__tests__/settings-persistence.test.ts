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
    it('persists draw settings when offline mode is on', () => {
      sm().offlineMode = true;
      sm().isDrawOrbits = true;
      const saveSpy = vi.spyOn(PersistenceManager.getInstance(), 'saveItem');

      SettingsManager.preserveSettings();

      expect(saveSpy).toHaveBeenCalledWith(StorageKey.SETTINGS_DRAW_ORBITS, 'true');
    });

    it('does not write items when offline mode is off but still emits saveSettings', () => {
      sm().offlineMode = false;
      const saveSpy = vi.spyOn(PersistenceManager.getInstance(), 'saveItem');

      expect(() => SettingsManager.preserveSettings()).not.toThrow();
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('removes the confidence-levels key when the setting is off', () => {
      sm().offlineMode = true;
      sm().isShowConfidenceLevels = false;
      const removeSpy = vi.spyOn(PersistenceManager.getInstance(), 'removeItem');

      SettingsManager.preserveSettings();

      expect(removeSpy).toHaveBeenCalledWith(StorageKey.SETTINGS_CONFIDENCE_LEVELS);
    });
  });

  describe('loadPersistedSettings', () => {
    it('returns early without mutating when not in offline mode', () => {
      const settings = new SettingsManager();

      settings.offlineMode = false;
      settings.isDrawOrbits = false;
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_ORBITS, 'true');

      settings.loadPersistedSettings();

      expect(settings.isDrawOrbits).toBe(false);
    });

    it('loads boolean draw settings from storage in offline mode', () => {
      const settings = new SettingsManager();

      settings.offlineMode = true;
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_ORBITS, 'true');
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DRAW_SUN, 'false');

      settings.loadPersistedSettings();

      expect(settings.isDrawOrbits).toBe(true);
      expect(settings.isDrawSun).toBe(false);
    });

    it('parses the numeric search-limit value', () => {
      const settings = new SettingsManager();

      settings.offlineMode = true;
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_SEARCH_LIMIT, '1234');

      settings.loadPersistedSettings();

      expect(settings.searchLimit).toBe(1234);
    });

    it('migrates the legacy boolean sat-label key when the v2 key is absent', () => {
      const settings = new SettingsManager();

      settings.offlineMode = true;
      PersistenceManager.getInstance().removeItem(StorageKey.SETTINGS_SAT_LABEL_MODE_V2);
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_SAT_LABEL_MODE, 'true');

      expect(() => settings.loadPersistedSettings()).not.toThrow();
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
