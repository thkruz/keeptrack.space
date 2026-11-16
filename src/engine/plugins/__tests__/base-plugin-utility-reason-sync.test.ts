import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Pro issue #193: a utility-only plugin (Watchlist Filter, Polar View) has no bottom icon for the drawer's observer
 * to follow, so setBottomIconToDisabled/Enabled must update the drawer footer copy's reason text itself.
 */
const makePlugin = (): KeepTrackPlugin => {
  const plugin = Object.create(KeepTrackPlugin.prototype) as KeepTrackPlugin;

  plugin.id = 'WatchlistFilter';
  plugin.bottomIconElementName = 'watchlist-filter-bottom-icon';
  plugin.isRequireSatelliteSelected = false;
  plugin.isRequireSensorSelected = false;
  vi.spyOn(plugin, 'getDisabledReason').mockReturnValue('Add satellites to the watchlist first');
  vi.spyOn(plugin, 'setBottomIconToUnselected').mockImplementation(() => undefined);

  return plugin;
};

describe('KeepTrackPlugin footer utility icon reason sync', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="drawer-utility-footer">
      <div class="drawer-utility-icon" id="WatchlistFilter-utility-icon" data-plugin-id="watchlist-filter-bottom-icon"
        data-drawer-label="Show Satellite List Only" kt-tooltip="Show Satellite List Only"></div></div>`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the reason on disable and restores the plain label on enable', () => {
    const plugin = makePlugin();
    const icon = document.getElementById('WatchlistFilter-utility-icon') as HTMLElement;

    plugin.setBottomIconToDisabled();
    expect(icon.getAttribute('aria-disabled')).toBe('true');
    expect(icon.getAttribute('kt-tooltip')).toBe('Show Satellite List Only: Add satellites to the watchlist first');
    expect(icon.getAttribute('aria-label')).toBe('Show Satellite List Only: Add satellites to the watchlist first');

    plugin.setBottomIconToEnabled();
    expect(icon.classList.contains('bmenu-item-disabled')).toBe(false);
    expect(icon.getAttribute('aria-disabled')).toBe('false');
    expect(icon.getAttribute('kt-tooltip')).toBe('Show Satellite List Only');
    expect(icon.getAttribute('aria-label')).toBe('Show Satellite List Only');
  });
});
