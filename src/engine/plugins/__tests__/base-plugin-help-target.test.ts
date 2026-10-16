import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Builds a bare plugin-shaped object on the real prototype so isHelpTarget_ runs without the
 * constructor (which needs the full UI environment).
 */
const makePlugin = (id: string, opts: { sideMenu?: boolean; active?: boolean } = {}): KeepTrackPlugin => {
  const plugin = Object.create(KeepTrackPlugin.prototype) as KeepTrackPlugin;

  plugin.id = id;
  plugin.isMenuButtonActive = opts.active ?? false;
  plugin.sideMenuElementName = opts.sideMenu ? `${id}-menu` : '';

  return plugin;
};

const isHelpTarget = (plugin: KeepTrackPlugin): boolean => (plugin as unknown as { isHelpTarget_: () => boolean }).isHelpTarget_();

describe('KeepTrackPlugin.isHelpTarget_', () => {
  afterEach(() => {
    PluginRegistry.unregisterAllPlugins();
  });

  it('is false while the plugin is not active', () => {
    expect(isHelpTarget(makePlugin('a', { sideMenu: true }))).toBe(false);
  });

  it('is true for an active side-menu plugin', () => {
    expect(isHelpTarget(makePlugin('a', { sideMenu: true, active: true }))).toBe(true);
  });

  it('is true for an active toggle-only plugin when no side menu is open', () => {
    const toggle = makePlugin('covariance', { active: true });

    PluginRegistry.addPlugin(toggle);
    PluginRegistry.addPlugin(makePlugin('toca', { sideMenu: true, active: false }));

    expect(isHelpTarget(toggle)).toBe(true);
  });

  it('defers to an open side menu so a layer toggle does not steal Shift+F1', () => {
    const toggle = makePlugin('covariance', { active: true });
    const sideMenu = makePlugin('toca', { sideMenu: true, active: true });

    PluginRegistry.addPlugin(sideMenu);
    PluginRegistry.addPlugin(toggle);

    expect(isHelpTarget(toggle)).toBe(false);
    expect(isHelpTarget(sideMenu)).toBe(true);
  });
});
