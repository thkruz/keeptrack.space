import { NightToggle } from '@app/plugins/night-toggle/night-toggle';
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

  it('bridges bottomIconCallback to onBottomIconClick', () => {
    const spy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();
    expect(spy).toHaveBeenCalled();
  });
});
