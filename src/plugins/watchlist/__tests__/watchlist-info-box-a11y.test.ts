import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { EL as SAT_INFO_EL } from '@app/plugins/sat-info-box/sat-info-box-html';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('WatchlistPlugin info-box toggle accessibility', () => {
  let plugin: WatchlistPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  const toggle = () => getEl('sat-watchlist-toggle') as HTMLImageElement;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new WatchlistPlugin();
    websiteInit(plugin);
    const catalog = ServiceLocator.getCatalogManager();

    catalog.getSat = vi.fn(() => defaultSat) as never;
    catalog.getObject = vi.fn(() => defaultSat) as never;
    getEl('sat-watchlist-toggle', true)?.remove();
    if (!getEl(SAT_INFO_EL.NAME, true)) {
      document.body.insertAdjacentHTML('beforeend', `<div id="${SAT_INFO_EL.NAME}"></div>`);
    }
    p().satInfoBoxFinal_();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the toggle as a focusable button with a localized name and tooltip', () => {
    const el = toggle();

    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('aria-label')).toBe('Add to Watchlist');
    expect(el.getAttribute('kt-tooltip')).toBe('Add to Watchlist');
    expect(el.alt).toBe('Add to Watchlist');
    expect(el.hasAttribute('title')).toBe(false);
  });

  it('switches the accessible name and tooltip with the watchlist state', () => {
    const el = toggle();

    p().applyToggleState_(el, true);
    expect(el.classList.contains('on-watchlist')).toBe(true);
    expect(el.getAttribute('aria-label')).toBe('Remove from Watchlist');
    expect(el.getAttribute('kt-tooltip')).toBe('Remove from Watchlist');

    p().applyToggleState_(el, false);
    expect(el.classList.contains('off-watchlist')).toBe(true);
    expect(el.getAttribute('aria-label')).toBe('Add to Watchlist');
  });

  it('Enter and Space activate the toggle; other keys do not', () => {
    const el = toggle();
    const click = vi.spyOn(el, 'click').mockImplementation(() => undefined);

    el.addEventListener('keydown', WatchlistPlugin.activateOnEnterOrSpace);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', cancelable: true }));

    expect(click).toHaveBeenCalledTimes(2);
  });

  it('adding and removing from the info box updates the accessible name', () => {
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = 0;
    p().watchlistList = [];

    p().addRemoveWatchlist_();
    expect(plugin.isOnWatchlist(0)).toBe(true);
    expect(toggle().getAttribute('aria-label')).toBe('Remove from Watchlist');

    p().addRemoveWatchlist_();
    expect(plugin.isOnWatchlist(0)).toBe(false);
    expect(toggle().getAttribute('aria-label')).toBe('Add to Watchlist');
  });
});
