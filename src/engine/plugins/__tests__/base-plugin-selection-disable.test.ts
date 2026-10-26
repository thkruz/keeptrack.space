import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A bare plugin on the real prototype (the constructor needs the full UI) that needs a selected
 * satellite, like Satellite ECI View (camera-mode icon, no side menu) or a selection-only menu.
 */
const makePlugin = (sideMenuElementName: string | undefined): KeepTrackPlugin => {
  const plugin = Object.create(KeepTrackPlugin.prototype) as KeepTrackPlugin;

  plugin.id = 'NeedsSelection';
  plugin.bottomIconElementName = 'needs-selection-icon';
  plugin.sideMenuElementName = sideMenuElementName as string;
  plugin.isRequireSatelliteSelected = true;
  plugin.isRequireSensorSelected = false;
  plugin.isMenuButtonActive = true;
  plugin.isIconDisabled = false;
  plugin.isRenderPausedOnOpen = false;
  plugin.isForceHideSideMenus = false;

  return plugin;
};

describe('KeepTrackPlugin disable on lost selection', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="needs-selection-icon"></div>';
  });

  afterEach(() => {
    EventBus.getInstance().unregisterAllEvents();
    vi.restoreAllMocks();
  });

  it('a camera-mode icon without a side menu does not close other menus when the satellite is deselected', () => {
    const plugin = makePlugin(undefined);
    const hideSpy = vi.fn();

    plugin.registerBottomMenuClicked();
    EventBus.getInstance().on(EventBusEvent.hideSideMenus, hideSpy);
    EventBus.getInstance().emit(EventBusEvent.selectSatData, null as never, -1);

    expect(plugin.isIconDisabled).toBe(true);
    expect(plugin.isMenuButtonActive).toBe(false);
    expect(hideSpy).not.toHaveBeenCalled();
  });

  it('a plugin with its own side menu still closes it when the satellite is deselected', () => {
    const plugin = makePlugin('needs-selection-menu');
    const hideSpy = vi.fn();

    plugin.registerBottomMenuClicked();
    EventBus.getInstance().on(EventBusEvent.hideSideMenus, hideSpy);
    EventBus.getInstance().emit(EventBusEvent.selectSatData, null as never, -1);

    expect(plugin.isIconDisabled).toBe(true);
    expect(hideSpy).toHaveBeenCalledTimes(1);
  });
});
