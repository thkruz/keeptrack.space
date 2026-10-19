import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { afterEach, describe, expect, it } from 'vitest';

interface PluginOpts {
  sideMenu?: boolean;
  active?: boolean;
  utilityGroup?: UtilityGroup | null;
  hasHelp?: boolean;
  helpRole?: KeepTrackPlugin['helpRole'];
}

/**
 * Builds a bare plugin-shaped object on the real prototype so the help resolution runs without the
 * constructor (which needs the full UI environment). Field defaults mirror what init() leaves on a
 * real plugin.
 */
const makePlugin = (id: string, opts: PluginOpts = {}): KeepTrackPlugin => {
  const plugin = Object.create(KeepTrackPlugin.prototype) as KeepTrackPlugin;

  plugin.id = id;
  plugin.isMenuButtonActive = opts.active ?? false;
  plugin.sideMenuElementName = opts.sideMenu ? `${id}-menu` : '';
  plugin.utilityGroup = opts.utilityGroup ?? null;
  plugin.helpRole = opts.helpRole ?? 'auto';
  (plugin as unknown as { hasHelp_: boolean }).hasHelp_ = opts.hasHelp ?? true;

  return plugin;
};

/** Same shape as CovariancePlugin: a utility-panel layer toggle with help and no side menu. */
const makeCovariance = (active: boolean): KeepTrackPlugin => makePlugin('CovariancePlugin', { active, utilityGroup: UtilityGroup.LAYER_TOGGLE });

const isHelpTarget = (plugin: KeepTrackPlugin): boolean => (plugin as unknown as { isHelpTarget_: () => boolean }).isHelpTarget_();

describe('KeepTrackPlugin help resolution (Shift+F1)', () => {
  afterEach(() => {
    PluginRegistry.unregisterAllPlugins();
  });

  describe('side menu open', () => {
    it('is false while the plugin is not active', () => {
      const plugin = makePlugin('a', { sideMenu: true });

      PluginRegistry.addPlugin(plugin);

      expect(isHelpTarget(plugin)).toBe(false);
    });

    it('answers for an active side-menu plugin', () => {
      const plugin = makePlugin('a', { sideMenu: true, active: true });

      PluginRegistry.addPlugin(plugin);

      expect(isHelpTarget(plugin)).toBe(true);
      expect(KeepTrackPlugin.resolveHelpTarget()).toBe(plugin);
    });

    it('defers a layer toggle to an open side menu', () => {
      const toggle = makeCovariance(true);
      const sideMenu = makePlugin('toca', { sideMenu: true, active: true });

      PluginRegistry.addPlugin(toggle);
      PluginRegistry.addPlugin(sideMenu);

      expect(isHelpTarget(toggle)).toBe(false);
      expect(isHelpTarget(sideMenu)).toBe(true);
    });

    it('prefers an open side menu over an active full-screen view', () => {
      const view = makePlugin('FlatMapView', { active: true, utilityGroup: UtilityGroup.CAMERA_MODE });
      const sideMenu = makePlugin('OpticalSimulation', { sideMenu: true, active: true });

      PluginRegistry.addPlugin(view);
      PluginRegistry.addPlugin(sideMenu);

      expect(KeepTrackPlugin.resolveHelpTarget()).toBe(sideMenu);
    });
  });

  describe('full-screen view active', () => {
    it.each(['FlatMapView', 'PolarView', 'Astronomy', 'Planetarium'])('answers for an active %s with no side menu open', (id) => {
      const view = makePlugin(id, { active: true, utilityGroup: UtilityGroup.CAMERA_MODE });

      // Covariance registered first so iteration order would favour it.
      PluginRegistry.addPlugin(makeCovariance(true));
      PluginRegistry.addPlugin(view);

      expect(KeepTrackPlugin.resolveHelpTarget()).toBe(view);
      expect(isHelpTarget(view)).toBe(true);
    });

    it('skips an active camera mode that has no help (Earth Centered default view)', () => {
      PluginRegistry.addPlugin(makePlugin('EarthCenteredView', { active: true, utilityGroup: UtilityGroup.CAMERA_MODE, hasHelp: false }));

      expect(KeepTrackPlugin.resolveHelpTarget()).toBeNull();
    });

    it('prefers an overlay that opted in with helpRole "view" over the camera mode under it', () => {
      const view = makePlugin('FlatMapView', { active: true, utilityGroup: UtilityGroup.CAMERA_MODE });
      const overlay = makePlugin('KeyboardShortcutsPlugin', { active: true, utilityGroup: UtilityGroup.LAYER_TOGGLE, helpRole: 'view' });

      PluginRegistry.addPlugin(view);
      PluginRegistry.addPlugin(overlay);

      expect(KeepTrackPlugin.resolveHelpTarget()).toBe(overlay);
    });

    it('never picks a plugin with helpRole "none"', () => {
      PluginRegistry.addPlugin(makePlugin('a', { sideMenu: true, active: true, helpRole: 'none' }));

      expect(KeepTrackPlugin.resolveHelpTarget()).toBeNull();
    });
  });

  describe('nothing open', () => {
    it('resolves to null so the general help is shown', () => {
      PluginRegistry.addPlugin(makePlugin('a', { sideMenu: true }));
      PluginRegistry.addPlugin(makePlugin('FlatMapView', { utilityGroup: UtilityGroup.CAMERA_MODE }));
      PluginRegistry.addPlugin(makeCovariance(false));

      expect(KeepTrackPlugin.resolveHelpTarget()).toBeNull();
    });

    it('ignores active settings toggles', () => {
      PluginRegistry.addPlugin(makePlugin('settingsToggle', { active: true, utilityGroup: UtilityGroup.SETTINGS_TOGGLE }));

      expect(KeepTrackPlugin.resolveHelpTarget()).toBeNull();
    });
  });

  describe('Covariance is never a default', () => {
    it('does not answer when its layer is on and nothing else is open', () => {
      const covariance = makeCovariance(true);

      PluginRegistry.addPlugin(covariance);

      expect(isHelpTarget(covariance)).toBe(false);
      expect(KeepTrackPlugin.resolveHelpTarget()).toBeNull();
    });

    it('does not answer when it is first in iteration order and a view is active', () => {
      const covariance = makeCovariance(true);
      const view = makePlugin('Astronomy', { active: true, utilityGroup: UtilityGroup.CAMERA_MODE });

      PluginRegistry.addPlugin(covariance);
      PluginRegistry.addPlugin(view);

      expect(isHelpTarget(covariance)).toBe(false);
      expect(isHelpTarget(view)).toBe(true);
    });
  });
});
