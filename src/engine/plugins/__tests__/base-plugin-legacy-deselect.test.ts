import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type DeselectPlugin = KeepTrackPlugin & { onBottomIconDeselect: () => void };

/**
 * A bare plugin on the real prototype (the constructor needs the full UI), shaped like a legacy
 * `bottomIcon*` plugin such as Seismic Activity: no BottomIconComponent, an onBottomIconDeselect hook.
 */
const makeLegacyPlugin = (active: boolean): DeselectPlugin => {
  const plugin = Object.create(KeepTrackPlugin.prototype) as DeselectPlugin;

  plugin.id = 'LegacyPlugin';
  plugin.bottomIconElementName = 'menu-legacy';
  plugin.sideMenuElementName = 'legacy-menu';
  plugin.isMenuButtonActive = active;
  plugin.isRenderPausedOnOpen = false;
  plugin.onBottomIconDeselect = vi.fn();

  return plugin;
};

describe('KeepTrackPlugin onBottomIconDeselect for legacy bottom-icon plugins', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="menu-legacy"></div>';
  });

  afterEach(() => {
    EventBus.getInstance().unregisterAllEvents();
  });

  it('fires once when the active icon is unselected, and not again while inactive', () => {
    const plugin = makeLegacyPlugin(true);

    plugin.setBottomIconToUnselected(false);
    plugin.setBottomIconToUnselected(false);

    expect(plugin.isMenuButtonActive).toBe(false);
    expect(plugin.onBottomIconDeselect).toHaveBeenCalledTimes(1);
  });

  it('fires when the side menus are hidden (menu closed by another plugin or the close button)', () => {
    const plugin = makeLegacyPlugin(true);

    plugin.registerHideSideMenu('menu-legacy', () => undefined);
    EventBus.getInstance().emit(EventBusEvent.hideSideMenus);
    EventBus.getInstance().emit(EventBusEvent.hideSideMenus);

    expect(plugin.onBottomIconDeselect).toHaveBeenCalledTimes(1);
  });

  it('does not fire for a plugin whose menu was never open', () => {
    const plugin = makeLegacyPlugin(false);

    plugin.registerHideSideMenu('menu-legacy', () => undefined);
    EventBus.getInstance().emit(EventBusEvent.hideSideMenus);

    expect(plugin.onBottomIconDeselect).not.toHaveBeenCalled();
  });

  it('fires once for a composition plugin too (BottomIconComponent.deselect does not call it again)', () => {
    const plugin = makeLegacyPlugin(true);
    const deselect = vi.fn();

    (plugin as unknown as { bottomIconComponent_: { deselect: () => void } }).bottomIconComponent_ = { deselect };
    plugin.setBottomIconToUnselected(false);

    expect(deselect).toHaveBeenCalledWith(false);
    expect(plugin.onBottomIconDeselect).toHaveBeenCalledTimes(1);
  });
});
