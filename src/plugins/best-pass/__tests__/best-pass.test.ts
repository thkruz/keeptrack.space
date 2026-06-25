import { MenuMode } from '@app/engine/core/interfaces';
import {
  hasBottomIcon,
  hasHelp,
  hasKeyboardShortcuts,
  hasSecondaryMenu,
  hasSideMenu,
} from '@app/engine/plugins/core/plugin-capabilities';
import { BestPassPlugin } from '@app/plugins/best-pass/best-pass';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('BestPassPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  standardPluginSuite(BestPassPlugin, 'BestPassPlugin');
  standardPluginMenuButtonTests(BestPassPlugin, 'BestPassPlugin');
});

describe('BestPassPlugin_capabilities', () => {
  let plugin: BestPassPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new BestPassPlugin();
  });

  it('should have bottom icon capability', () => {
    expect(hasBottomIcon(plugin)).toBe(true);
    const config = plugin.getBottomIconConfig();

    expect(config.elementName).toBe('best-pass-icon');
    expect(config.menuMode).toContain(MenuMode.EVENTS);
    expect(config.menuMode).toContain(MenuMode.ALL);
  });

  it('should have side menu capability', () => {
    expect(hasSideMenu(plugin)).toBe(true);
    const config = plugin.getSideMenuConfig();

    expect(config.elementName).toBe('best-pass-menu');
  });

  it('should not have secondary menu capability (OSS version)', () => {
    expect(hasSecondaryMenu(plugin)).toBe(false);
  });

  it('should have help capability', () => {
    expect(hasHelp(plugin)).toBe(true);
    const helpConfig = plugin.getHelpConfig();

    expect(helpConfig.title).toBeDefined();
    expect(helpConfig.sections!.length).toBeGreaterThan(0);
    expect(helpConfig.shortcuts!.length).toBeGreaterThan(0);
  });

  it('should have keyboard shortcut capability', () => {
    expect(hasKeyboardShortcuts(plugin)).toBe(true);
    const shortcuts = plugin.getKeyboardShortcuts();

    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].key).toBe('b');
    expect(shortcuts[0].callback).toBeDefined();
  });

  it('should include wrapper divs in side menu HTML (no secondary menu)', () => {
    const config = plugin.getSideMenuConfig();

    expect(config.html).toContain('best-pass-menu');
    expect(config.html).toContain('side-menu-parent');
    expect(config.html).toContain('best-pass-menu-form');
    expect(config.html).toContain('bp-sats');
    expect(config.html).toContain('bp-submit');
  });
});

describe('BestPassPlugin_bridge', () => {
  it('should call onBottomIconClick via bottomIconCallback bridge', () => {
    setupStandardEnvironment();
    const plugin = new BestPassPlugin();

    websiteInit(plugin);

    const spy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();

    expect(spy).toHaveBeenCalled();
  });
});
