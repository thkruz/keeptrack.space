import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A disabled icon in the legacy (non-drawer) utility panel explains itself like the drawer
 * footer does: the plugin's verify method shows the "Select a ... first!" toast, and the
 * action (bottomMenuClick) never runs.
 */
const makePlugin = (over: Partial<KeepTrackPlugin> = {}): KeepTrackPlugin => {
  const plugin = Object.create(KeepTrackPlugin.prototype) as KeepTrackPlugin;

  plugin.id = 'NeedsSelection';
  plugin.bottomIconElementName = 'needs-selection-icon';
  plugin.bottomIconLabel = 'Needs Selection';
  plugin.isRequireSatelliteSelected = true;
  plugin.isRequireSensorSelected = false;
  Object.assign(plugin, over);

  return plugin;
};

const clickDisabledIcon = (plugin: KeepTrackPlugin): HTMLElement => {
  plugin.addUtilityIcon('icon.png' as never, true);
  EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
  const item = document.getElementById('NeedsSelection-utility-icon') as HTMLElement;

  item.click();

  return item;
};

describe('KeepTrackPlugin legacy utility icon, disabled click', () => {
  beforeEach(() => {
    document.body.className = '';
    document.body.innerHTML = '<div id="bottom-icons-utility"><div id="utility-layer-icons"></div></div>';
  });

  afterEach(() => {
    EventBus.getInstance().unregisterAllEvents();
    vi.restoreAllMocks();
  });

  it('shows the satellite message and never emits bottomMenuClick', () => {
    const plugin = makePlugin();
    const verifySat = vi.spyOn(plugin, 'verifySatelliteSelected').mockReturnValue(false);
    const clickSpy = vi.fn();

    EventBus.getInstance().on(EventBusEvent.bottomMenuClick, clickSpy);
    const item = clickDisabledIcon(plugin);

    expect(verifySat).toHaveBeenCalledTimes(1);
    expect(clickSpy).not.toHaveBeenCalled();
    expect(item.classList.contains('shake')).toBe(true);
  });

  it('checks the sensor first and stops there when it is missing', () => {
    const plugin = makePlugin({ isRequireSensorSelected: true });
    const verifySensor = vi.spyOn(plugin, 'verifySensorSelected').mockReturnValue(false);
    const verifySat = vi.spyOn(plugin, 'verifySatelliteSelected').mockReturnValue(false);

    clickDisabledIcon(plugin);

    expect(verifySensor).toHaveBeenCalledTimes(1);
    expect(verifySat).not.toHaveBeenCalled();
  });

  it('only shakes when the plugin needs no selection', () => {
    const plugin = makePlugin({ isRequireSatelliteSelected: false });
    const verifySat = vi.spyOn(plugin, 'verifySatelliteSelected');

    clickDisabledIcon(plugin);

    expect(verifySat).not.toHaveBeenCalled();
  });
});
