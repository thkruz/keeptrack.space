import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { HideOtherSatellitesPlugin } from '@app/plugins/hide-other-sats/hide-other-sats';
import { SettingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('HideOtherSatellitesPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(HideOtherSatellitesPlugin, 'HideOtherSatellitesPlugin');

  describe('Configuration', () => {
    it('should have correct id', () => {
      const plugin = new HideOtherSatellitesPlugin();

      expect(plugin.id).toBe('HideOtherSatellitesPlugin');
    });

    it('should have no dependencies', () => {
      const plugin = new HideOtherSatellitesPlugin();

      expect(plugin.dependencies_).toHaveLength(0);
    });

    it('should return command palette commands', () => {
      const plugin = new HideOtherSatellitesPlugin();
      const commands = plugin.getCommandPaletteCommands();

      expect(commands).toHaveLength(1);
      expect(commands[0].id).toBe('HideOtherSatellitesPlugin.toggle');
    });
  });

  describe('toggle behavior', () => {
    it('should set transparent alpha to 0 when hiding', () => {
      const plugin = new HideOtherSatellitesPlugin();

      websiteInit(plugin);

      vi.spyOn(plugin, 'setBottomIconToSelected').mockImplementation(() => {
        /* Intentional no-op */
      });
      plugin.hideOtherSats();

      expect(settingsManager.colors.transparent[3]).toBe(0);
    });

    it('should set transparent alpha to 0.1 when showing', () => {
      const plugin = new HideOtherSatellitesPlugin();

      websiteInit(plugin);
      settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0];

      vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => {
        /* Intentional no-op */
      });
      plugin.showOtherSats();

      expect(settingsManager.colors.transparent[3]).toBe(0.1);
    });
  });

  describe('bottomIconCallback', () => {
    it('should call onBottomIconClick', () => {
      const plugin = new HideOtherSatellitesPlugin();

      websiteInit(plugin);

      const spy = vi.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('config and onBottomIconClick branches', () => {
    let plugin: HideOtherSatellitesPlugin;

    beforeEach(() => {
      plugin = new HideOtherSatellitesPlugin();
      websiteInit(plugin);
      vi.spyOn(SettingsManager, 'preserveSettings').mockImplementation(() => undefined);
      const csm = ServiceLocator.getColorSchemeManager();

      vi.spyOn(csm, 'calculateColorBuffers').mockResolvedValue(undefined as never);
      vi.spyOn(csm, 'reloadColors').mockImplementation(() => undefined);
    });

    it('exposes the bottom-icon config and an invocable command', () => {
      expect(plugin.getBottomIconConfig().elementName).toBe('hide-other-sats-bottom-icon');
      vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);
      expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
    });

    it('hides others when active', () => {
      vi.spyOn(plugin, 'setBottomIconToSelected').mockImplementation(() => undefined);
      plugin.isMenuButtonActive = true;
      plugin.onBottomIconClick();

      expect(settingsManager.colors.transparent[3]).toBe(0);
    });

    it('shows others when inactive', () => {
      vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => undefined);
      plugin.isMenuButtonActive = false;
      plugin.onBottomIconClick();

      expect(settingsManager.colors.transparent[3]).toBe(0.1);
    });

    it('selects the icon on uiManagerFinal when others are already hidden', () => {
      PersistenceManager.getInstance().removeItem(StorageKey.SETTINGS_HIDE_OTHER_SATS);
      settingsManager.colors.transparent = [1, 1, 1, 0];
      const spy = vi.spyOn(plugin, 'setBottomIconToSelected');

      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('persistence', () => {
    let plugin: HideOtherSatellitesPlugin;
    const persistence = () => PersistenceManager.getInstance();

    beforeEach(() => {
      persistence().removeItem(StorageKey.SETTINGS_HIDE_OTHER_SATS);
      settingsManager.colors.transparent = [1, 1, 1, 0.1];
      plugin = new HideOtherSatellitesPlugin();
      websiteInit(plugin);
      vi.spyOn(SettingsManager, 'preserveSettings').mockImplementation(() => undefined);
    });

    it('saves the toggle state under its own key', () => {
      plugin.hideOtherSats();
      expect(persistence().getItem(StorageKey.SETTINGS_HIDE_OTHER_SATS)).toBe('true');

      plugin.showOtherSats();
      expect(persistence().getItem(StorageKey.SETTINGS_HIDE_OTHER_SATS)).toBe('false');
    });

    it('restores a saved "on" state on boot: others hidden and the icon selected', () => {
      persistence().saveItem(StorageKey.SETTINGS_HIDE_OTHER_SATS, 'true');
      const spy = vi.spyOn(plugin, 'setBottomIconToSelected');

      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      expect(settingsManager.colors.transparent).toEqual([1, 1, 1, 0]);
      expect(spy).toHaveBeenCalled();
    });

    it('restores a saved "off" state as the dim color', () => {
      persistence().saveItem(StorageKey.SETTINGS_HIDE_OTHER_SATS, 'false');
      settingsManager.colors.transparent = [1, 1, 1, 0];
      const spy = vi.spyOn(plugin, 'setBottomIconToSelected');

      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      expect(settingsManager.colors.transparent).toEqual([1, 1, 1, 0.1]);
      expect(spy).not.toHaveBeenCalled();
    });

    it('leaves the color alone when nothing was saved (default: others dimmed)', () => {
      settingsManager.colors.transparent = [1, 1, 1, 0.4];
      const spy = vi.spyOn(plugin, 'setBottomIconToSelected');

      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      expect(settingsManager.colors.transparent).toEqual([1, 1, 1, 0.4]);
      expect(spy).not.toHaveBeenCalled();
    });

    it('re-applies the state when an account sync changes the key', () => {
      const csm = ServiceLocator.getColorSchemeManager();
      const recolor = vi.spyOn(csm, 'calculateColorBuffers').mockImplementation(() => undefined);

      vi.spyOn(csm, 'reloadColors').mockImplementation(() => undefined);
      vi.spyOn(plugin, 'setBottomIconToSelected').mockImplementation(() => undefined);
      persistence().saveItem(StorageKey.SETTINGS_HIDE_OTHER_SATS, 'true');

      EventBus.getInstance().emit(EventBusEvent.remoteSettingsApplied, [StorageKey.SETTINGS_HIDE_OTHER_SATS]);

      expect(settingsManager.colors.transparent[3]).toBe(0);
      expect(recolor).toHaveBeenCalledWith(true);
    });

    it('does not share the array it assigns, so Time Machine can save and restore it', () => {
      plugin.hideOtherSats();
      const first = settingsManager.colors.transparent;

      plugin.hideOtherSats();
      expect(settingsManager.colors.transparent).not.toBe(first);
      expect(HideOtherSatellitesPlugin.HIDDEN_COLOR).toEqual([1, 1, 1, 0]);
    });
  });

  it('defines no keyboard shortcut (Shift+H belongs to Satellite Photos)', () => {
    const plugin = new HideOtherSatellitesPlugin();

    expect(plugin.getKeyboardShortcuts?.() ?? []).toHaveLength(0);
  });
});
