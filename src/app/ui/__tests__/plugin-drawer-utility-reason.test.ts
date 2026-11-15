import { syncUtilityFooterState } from '@app/app/ui/plugin-drawer-helpers';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('utility footer icon disabled reason (pro issue #193)', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    PluginRegistry.unregisterAllPlugins();
    PluginRegistry.addPlugin({
      id: 'WatchlistFilter',
      bottomIconElementName: 'watchlist-filter-bottom-icon',
      isRequireSensorSelected: false,
      isRequireSatelliteSelected: false,
      getDisabledReason: () => 'Add satellites to the watchlist first',
      verifySatelliteSelected: () => true,
    } as never);
    document.body.innerHTML = `<div id="watchlist-filter-bottom-icon" class="bmenu-item-disabled"></div>
      <div id="drawer-utility-footer"><div class="drawer-utility-icon" data-plugin-id="watchlist-filter-bottom-icon" kt-tooltip="Watchlist Filter"></div></div>`;
  });

  afterEach(() => {
    PluginRegistry.unregisterAllPlugins();
    vi.restoreAllMocks();
  });

  it('puts the reason in the tooltip and aria-label when disabled', () => {
    syncUtilityFooterState();
    const icon = document.querySelector('.drawer-utility-icon') as HTMLElement;

    expect(icon.classList.contains('bmenu-item-disabled')).toBe(true);
    expect(icon.getAttribute('aria-disabled')).toBe('true');
    expect(icon.getAttribute('kt-tooltip')).toBe('Watchlist Filter: Add satellites to the watchlist first');
    expect(icon.getAttribute('aria-label')).toBe('Watchlist Filter: Add satellites to the watchlist first');
  });

  it('restores the plain label when enabled', () => {
    syncUtilityFooterState();
    document.getElementById('watchlist-filter-bottom-icon')!.classList.remove('bmenu-item-disabled');
    syncUtilityFooterState();
    const icon = document.querySelector('.drawer-utility-icon') as HTMLElement;

    expect(icon.classList.contains('bmenu-item-disabled')).toBe(false);
    expect(icon.getAttribute('aria-disabled')).toBe('false');
    expect(icon.getAttribute('kt-tooltip')).toBe('Watchlist Filter');
    expect(icon.getAttribute('aria-label')).toBe('Watchlist Filter');
  });
});
