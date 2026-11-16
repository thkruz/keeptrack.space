import { GroupType } from '@app/app/data/object-group';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
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

  describe('plain selection (no group)', () => {
    const setup = (selectedGroup: unknown, selectedSat: number, secondarySat = -1) => {
      const plugin = new HideOtherSatellitesPlugin();

      websiteInit(plugin);
      vi.spyOn(plugin, 'setBottomIconToSelected').mockImplementation(() => {
        /* Intentional no-op */
      });
      const groupsManager = ServiceLocator.getGroupsManager();

      groupsManager.selectedGroup = selectedGroup as never;
      vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ selectedSat, secondarySat } as never);
      const createSpy = vi.spyOn(groupsManager, 'createGroup').mockImplementation(() => ({ ids: [], isOverlayHidden: false }) as never);
      const selectSpy = vi.spyOn(groupsManager, 'selectGroup').mockImplementation(() => {
        /* Intentional no-op */
      });

      return { plugin, createSpy, selectSpy };
    };

    it('groups the selected objects so every other dot is hidden', () => {
      const { plugin, createSpy, selectSpy } = setup(null, 5, 9);

      plugin.hideOtherSats();

      expect(createSpy).toHaveBeenCalledWith(GroupType.ID_LIST, [5, 9]);
      expect(selectSpy).toHaveBeenCalledTimes(1);
    });

    it('hides orbit lines only for the group it creates, never via the global flag', () => {
      const { plugin, createSpy } = setup(null, 5);

      settingsManager.isGroupOverlayDisabled = false;
      plugin.hideOtherSats();

      expect((createSpy.mock.results[0].value as { isOverlayHidden: boolean }).isOverlayHidden).toBe(true);
      expect(settingsManager.isGroupOverlayDisabled).toBe(false);
    });

    it('a search that replaces the temporary group is not suppressed, and turning off leaves it selected', () => {
      const { plugin } = setup(null, 5);
      const groupsManager = ServiceLocator.getGroupsManager();
      const search = { ids: [1, 2], isOverlayHidden: false };

      vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => undefined);
      vi.spyOn(SettingsManager, 'preserveSettings').mockImplementation(() => undefined);
      settingsManager.isGroupOverlayDisabled = false;
      plugin.hideOtherSats();
      groupsManager.selectedGroup = search as never;
      plugin.showOtherSats();

      expect(search.isOverlayHidden).toBe(false);
      expect(settingsManager.isGroupOverlayDisabled).toBe(false);
      expect(groupsManager.selectedGroup).toBe(search);
    });

    it('leaves the orbit overlay setting alone for a user group', () => {
      const { plugin } = setup({ ids: [1] }, 5);

      settingsManager.isGroupOverlayDisabled = false;
      plugin.hideOtherSats();

      expect(settingsManager.isGroupOverlayDisabled).toBe(false);
    });

    it('turning off clears the group it created and restores the scheme and overlay', () => {
      const { plugin } = setup(null, 5);
      const groupsManager = ServiceLocator.getGroupsManager();
      const csm = ServiceLocator.getColorSchemeManager();
      const group = { ids: [5], isOverlayHidden: false };
      const prev = csm.currentColorScheme;

      vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => undefined);
      vi.spyOn(SettingsManager, 'preserveSettings').mockImplementation(() => undefined);
      vi.spyOn(csm, 'calculateColorBuffers').mockImplementation(() => undefined);
      vi.spyOn(csm, 'reloadColors').mockImplementation(() => undefined);
      vi.spyOn(groupsManager, 'createGroup').mockReturnValue(group as never);
      vi.spyOn(groupsManager, 'selectGroup').mockImplementation((g) => {
        groupsManager.selectedGroup = g;
        csm.isUseGroupColorScheme = true;
      });
      const clearSpy = vi.spyOn(groupsManager, 'clearSelect');

      csm.isUseGroupColorScheme = false;
      settingsManager.isGroupOverlayDisabled = null;
      plugin.hideOtherSats();
      expect(groupsManager.selectedGroup).toBe(group);
      plugin.showOtherSats();

      expect(clearSpy).toHaveBeenCalledTimes(1);
      expect(groupsManager.selectedGroup).toBeNull();
      expect(csm.isUseGroupColorScheme).toBe(false);
      expect(csm.currentColorScheme).toBe(prev);
      expect(settingsManager.isGroupOverlayDisabled).toBe(false);
    });

    it('turning off leaves a user group alone', () => {
      const { plugin } = setup({ ids: [1] }, 5);
      const groupsManager = ServiceLocator.getGroupsManager();
      const clearSpy = vi.spyOn(groupsManager, 'clearSelect');

      vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => undefined);
      vi.spyOn(SettingsManager, 'preserveSettings').mockImplementation(() => undefined);
      plugin.hideOtherSats();
      plugin.showOtherSats();

      expect(clearSpy).not.toHaveBeenCalled();
      expect(groupsManager.selectedGroup).not.toBeNull();
    });

    it('leaves an existing group alone', () => {
      const { plugin, selectSpy } = setup({ ids: [1] }, 5);

      plugin.hideOtherSats();

      expect(selectSpy).not.toHaveBeenCalled();
    });

    it('changes nothing with no selection', () => {
      const { plugin, selectSpy } = setup(null, -1);

      plugin.hideOtherSats();

      expect(selectSpy).not.toHaveBeenCalled();
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
