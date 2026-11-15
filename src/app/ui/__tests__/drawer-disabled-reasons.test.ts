import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { t7e } from '@app/locales/keys';
import { Breakup } from '@app/plugins/breakup/breakup';
import { EditSat } from '@app/plugins/edit-sat/edit-sat';
import { NewLaunch } from '@app/plugins/new-launch/new-launch';
import { PlanetsMenuPlugin } from '@app/plugins/planets-menu/planets-menu';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { WatchlistFilterPlugin } from '@app/plugins/watchlist-filter/watchlist-filter';
import { settingsManager } from '@app/settings/settings';
import { SpaceObjectType } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nonTleObject = { isSatellite: () => true, type: SpaceObjectType.PAYLOAD };

describe('drawer disabled reasons (#193 F2)', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, WatchlistPlugin]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['Breakup', () => new Breakup()],
    ['EditSat', () => new EditSat()],
  ])('%s explains a selection without a TLE', (_name, make) => {
    const plugin = make() as Breakup | EditSat;

    vi.spyOn((plugin as unknown as { selectSatManager_: SelectSatManager }).selectSatManager_, 'getSelectedSat').mockReturnValue(nonTleObject as never);
    expect(plugin.getDisabledReason()).toBe(t7e('pluginDrawer.reasonSelectTleSatellite'));
  });

  it.each([
    ['Breakup', () => new Breakup()],
    ['EditSat', () => new EditSat()],
  ])('%s has no own reason when nothing is selected (base text covers it)', (_name, make) => {
    const plugin = make() as Breakup | EditSat;

    vi.spyOn((plugin as unknown as { selectSatManager_: SelectSatManager }).selectSatManager_, 'getSelectedSat').mockReturnValue(null as never);
    expect(plugin.getDisabledReason()).toBeNull();
  });

  it('NewLaunch explains a selection that is neither satellite nor launch site', () => {
    const plugin = new NewLaunch();

    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue({ isSatellite: () => false, type: SpaceObjectType.STAR } as never);
    expect(plugin.getDisabledReason()).toBe(t7e('pluginDrawer.reasonSelectSatelliteOrLaunchSite'));
  });

  it('NewLaunch has no reason for a launch site', () => {
    const plugin = new NewLaunch();

    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue({ isSatellite: () => false, type: SpaceObjectType.LAUNCH_SITE } as never);
    expect(plugin.getDisabledReason()).toBeNull();
  });

  it('PlanetsMenu explains disabled planets and clears when enabled', () => {
    const plugin = new PlanetsMenuPlugin();

    settingsManager.isDisablePlanets = true;
    expect(plugin.getDisabledReason()).toBe(t7e('pluginDrawer.reasonEnablePlanets'));
    settingsManager.isDisablePlanets = false;
    expect(plugin.getDisabledReason()).toBeNull();
  });

  it('WatchlistFilter explains an empty watchlist and clears when it has entries', () => {
    const plugin = new WatchlistFilterPlugin();
    const watchlist = PluginRegistry.getPlugin(WatchlistPlugin) as WatchlistPlugin;

    watchlist.watchlistList = [];
    expect(plugin.getDisabledReason()).toBe(t7e('pluginDrawer.reasonAddToWatchlist'));
    watchlist.watchlistList = [{ id: 1, inView: false }];
    expect(plugin.getDisabledReason()).toBeNull();
  });
});
