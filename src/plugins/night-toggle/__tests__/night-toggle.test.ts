import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
import { SettingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('NightToggle', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(NightToggle, 'NightToggle');
  standardPluginMenuButtonTests(NightToggle, 'Night_Toggle');
});

describe('NightToggle methods', () => {
  let plugin: NightToggle;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new NightToggle();
    plugin.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes config, "N" shortcut and command', () => {
    expect(plugin.getBottomIconConfig().elementName).toBe('night-toggle-bottom-icon');
    expect(plugin.getKeyboardShortcuts()[0].key).toBe('N');
    expect(() => plugin.getKeyboardShortcuts()[0].callback()).not.toThrow();
    expect(plugin.getCommandPaletteCommands()[0].id).toBe('NightToggle.toggle');
    expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
  });

  it('turns night mode on via toggleNightMode/onBottomIconClick when active', () => {
    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();
    expect(settingsManager.isDrawNightAsDay).toBe(true);
  });

  it('turns night mode off when inactive', () => {
    plugin.isMenuButtonActive = false;
    plugin.onBottomIconClick();
    expect(settingsManager.isDrawNightAsDay).toBe(false);
  });

  it('on() and off() set the setting directly', () => {
    plugin.on();
    expect(settingsManager.isDrawNightAsDay).toBe(true);
    plugin.off();
    expect(settingsManager.isDrawNightAsDay).toBe(false);
  });

  it('lights the icon at launch when the persisted setting is on', () => {
    settingsManager.isDrawNightAsDay = true;
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    expect(plugin.isMenuButtonActive).toBe(true);

    settingsManager.isDrawNightAsDay = false;
    plugin.syncIconToSetting();
    expect(plugin.isMenuButtonActive).toBe(false);
  });

  it('persists on every change and never closes the open side menu when switching off', () => {
    const preserveSpy = vi.spyOn(SettingsManager, 'preserveSettings');
    const emitSpy = vi.spyOn(EventBus.getInstance(), 'emit');

    plugin.on();
    plugin.off();

    expect(preserveSpy).toHaveBeenCalledTimes(2);
    expect(plugin.isMenuButtonActive).toBe(false);
    expect(emitSpy.mock.calls.some(([event]) => event === EventBusEvent.hideSideMenus)).toBe(false);
  });

  it('bridges bottomIconCallback to onBottomIconClick', () => {
    const spy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();
    expect(spy).toHaveBeenCalled();
  });
});
