import { explainDisabledUtilityIcon } from '@app/app/ui/plugin-drawer-helpers';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBus } from '@app/engine/events/event-bus';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/**
 * A disabled utility icon (Satellite Fixed View / Satellite View with nothing
 * selected) must explain itself on click instead of swallowing it, and must
 * never run the action.
 */
describe('explainDisabledUtilityIcon', () => {
  const makePlugin = (over: Record<string, unknown> = {}) => ({
    id: 'SatelliteFixedView',
    bottomIconElementName: 'satellite-fixed-bottom-icon',
    isRequireSatelliteSelected: true,
    isRequireSensorSelected: false,
    verifySatelliteSelected: vi.fn(() => false),
    verifySensorSelected: vi.fn(() => true),
    ...over,
  });

  const makeIcon = (bottomIconId?: string): HTMLElement => {
    const el = document.createElement('div');

    el.className = 'drawer-utility-icon bmenu-item-disabled';
    if (bottomIconId) {
      el.dataset.pluginId = bottomIconId;
    }
    document.body.appendChild(el);

    return el;
  };

  beforeEach(() => {
    setupStandardEnvironment();
    PluginRegistry.unregisterAllPlugins();
  });

  afterEach(() => {
    PluginRegistry.unregisterAllPlugins();
    vi.restoreAllMocks();
  });

  it('shows the plugin "Select a satellite first" message without emitting bottomMenuClick', () => {
    const plugin = makePlugin();

    PluginRegistry.addPlugin(plugin as never);
    const emit = vi.spyOn(EventBus.getInstance(), 'emit');
    const icon = makeIcon('satellite-fixed-bottom-icon');

    expect(explainDisabledUtilityIcon(icon)).toBe(true);
    expect(plugin.verifySatelliteSelected).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalled();
    expect(icon.classList.contains('shake')).toBe(true);
  });

  it('checks the sensor requirement first, like the base click handler', () => {
    const plugin = makePlugin({ isRequireSensorSelected: true, verifySensorSelected: vi.fn(() => false) });

    PluginRegistry.addPlugin(plugin as never);

    expect(explainDisabledUtilityIcon(makeIcon('satellite-fixed-bottom-icon'))).toBe(true);
    expect(plugin.verifySensorSelected).toHaveBeenCalledTimes(1);
    expect(plugin.verifySatelliteSelected).not.toHaveBeenCalled();
  });

  it('only shakes when the plugin needs no selection or the selection is already present', () => {
    const noNeed = makePlugin({ isRequireSatelliteSelected: false });

    PluginRegistry.addPlugin(noNeed as never);
    const icon = makeIcon('satellite-fixed-bottom-icon');

    expect(explainDisabledUtilityIcon(icon)).toBe(false);
    expect(noNeed.verifySatelliteSelected).not.toHaveBeenCalled();
    expect(icon.classList.contains('shake')).toBe(true);

    PluginRegistry.unregisterAllPlugins();
    const satisfied = makePlugin({ verifySatelliteSelected: vi.fn(() => true) });

    PluginRegistry.addPlugin(satisfied as never);
    expect(explainDisabledUtilityIcon(makeIcon('satellite-fixed-bottom-icon'))).toBe(false);
  });

  it('ignores icons with no plugin id or an unknown plugin', () => {
    expect(explainDisabledUtilityIcon(makeIcon())).toBe(false);
    expect(explainDisabledUtilityIcon(makeIcon('missing-bottom-icon'))).toBe(false);
  });
});
