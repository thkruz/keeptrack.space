import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { GraticuleToggle } from '@app/plugins/graticule-toggle/graticule-toggle';
import { SettingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('GraticuleToggle', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(GraticuleToggle, 'GraticuleToggle');
});

describe('GraticuleToggle methods', () => {
  let plugin: GraticuleToggle;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new GraticuleToggle();
    plugin.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes its bottom-icon config and "G" shortcut and command', () => {
    expect(plugin.getBottomIconConfig().elementName).toBe('graticule-toggle-bottom-icon');
    expect(plugin.getKeyboardShortcuts()[0].key).toBe('G');
    expect(() => plugin.getKeyboardShortcuts()[0].callback()).not.toThrow();
    expect(plugin.getCommandPaletteCommands()[0].id).toBe('GraticuleToggle.toggle');
    expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
  });

  it('toggles the graticule setting on and off', () => {
    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();
    expect(settingsManager.isDrawGraticule).toBe(true);

    plugin.isMenuButtonActive = false;
    plugin.onBottomIconClick();
    expect(settingsManager.isDrawGraticule).toBe(false);
  });

  it('lights the icon at launch when the persisted setting is on (Graphics Menu tick, then reload)', () => {
    settingsManager.isDrawGraticule = true;
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    expect(plugin.isMenuButtonActive).toBe(true);
  });

  it('setGraticule writes the setting, syncs the icon and persists', () => {
    const preserveSpy = vi.spyOn(SettingsManager, 'preserveSettings');

    plugin.setGraticule(true);
    expect(settingsManager.isDrawGraticule).toBe(true);
    expect(plugin.isMenuButtonActive).toBe(true);

    plugin.setGraticule(false);
    expect(settingsManager.isDrawGraticule).toBe(false);
    expect(plugin.isMenuButtonActive).toBe(false);
    expect(preserveSpy).toHaveBeenCalledTimes(2);
  });

  it('bridges bottomIconCallback to onBottomIconClick', () => {
    const spy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();
    expect(spy).toHaveBeenCalled();
  });
});
