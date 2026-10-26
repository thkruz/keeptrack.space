import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The legacy secondary panel opened by the settings gear must call the plugin's
 * onSecondaryMenuOpen / onSecondaryMenuClose hooks. The SecondaryMenuComponent built from
 * getSecondaryMenuConfig is never initialised, so the legacy panel is the only caller.
 */
type HookedPlugin = KeepTrackPlugin & { onSecondaryMenuOpen: () => void; onSecondaryMenuClose: () => void };

const makePlugin = (): HookedPlugin => {
  const plugin = Object.create(KeepTrackPlugin.prototype) as HookedPlugin;

  plugin.id = 'LegacySecondary';
  plugin.sideMenuElementName = 'legacy-menu';
  plugin.sideMenuSecondaryOptions = { width: 300, leftOffset: null, zIndex: 3 };
  (plugin as unknown as { secondaryMenuComponent_: unknown }).secondaryMenuComponent_ = null;
  plugin.onSecondaryMenuOpen = vi.fn();
  plugin.onSecondaryMenuClose = vi.fn();

  return plugin;
};

describe('KeepTrackPlugin legacy secondary panel hooks', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="legacy-menu"></div><div id="legacy-menu-secondary"></div><button id="legacy-menu-secondary-btn"></button>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onSecondaryMenuOpen and onSecondaryMenuClose for the legacy panel', () => {
    const plugin = makePlugin();

    plugin.openSecondaryMenu();
    expect(plugin.onSecondaryMenuOpen).toHaveBeenCalledTimes(1);
    expect(plugin.isSideMenuSettingsOpen).toBe(true);

    plugin.closeSecondaryMenu();
    expect(plugin.onSecondaryMenuClose).toHaveBeenCalledTimes(1);
    expect(plugin.isSideMenuSettingsOpen).toBe(false);
  });

  it('still calls the hooks once when a (never initialised) SecondaryMenuComponent exists', () => {
    const plugin = makePlugin();

    (plugin as unknown as { secondaryMenuComponent_: unknown }).secondaryMenuComponent_ = {};
    plugin.openSecondaryMenu();
    plugin.closeSecondaryMenu();

    expect(plugin.onSecondaryMenuOpen).toHaveBeenCalledTimes(1);
    expect(plugin.onSecondaryMenuClose).toHaveBeenCalledTimes(1);
  });
});
