import { CameraType } from '@app/engine/camera/camera-type';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { WatchlistFilterPlugin } from '@app/plugins/watchlist-filter/watchlist-filter';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('WatchlistFilterPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment([WatchlistPlugin]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(WatchlistFilterPlugin, 'WatchlistFilterPlugin');
});

describe('WatchlistFilterPlugin methods', () => {
  let plugin: WatchlistFilterPlugin;
  let watchlist: WatchlistPlugin;

  beforeEach(() => {
    setupStandardEnvironment([WatchlistPlugin]);
    plugin = new WatchlistFilterPlugin();
    plugin.init();
    watchlist = PluginRegistry.getPlugin(WatchlistPlugin) as WatchlistPlugin;
    vi.spyOn(plugin, 'setBottomIconToEnabled').mockImplementation(() => undefined);
    vi.spyOn(plugin, 'setBottomIconToDisabled').mockImplementation(() => undefined);
    vi.spyOn(watchlist, 'setFilterActive').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes config, "w" shortcut and command', () => {
    expect(plugin.getBottomIconConfig().elementName).toBe('watchlist-filter-icon');
    expect(plugin.getKeyboardShortcuts()[0].key).toBe('w');
    expect(plugin.getCommandPaletteCommands()[0].id).toBe('WatchlistFilter.toggle');
    expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
  });

  it('the "w" shortcut is a no-op in FPS mode and toggles otherwise', () => {
    const clicked = vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);

    ServiceLocator.getMainCamera().cameraType = CameraType.FPS;
    plugin.getKeyboardShortcuts()[0].callback();
    expect(clicked).not.toHaveBeenCalled();

    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
    plugin.getKeyboardShortcuts()[0].callback();
    expect(clicked).toHaveBeenCalled();
  });

  it('onBottomIconClick toasts and disables when the watchlist is empty', () => {
    watchlist.watchlistList = [];
    const toast = vi.spyOn(ServiceLocator.getUiManager(), 'toast');

    plugin.onBottomIconClick();

    expect(toast).toHaveBeenCalled();
    expect(plugin.setBottomIconToDisabled).toHaveBeenCalled();
  });

  it('onBottomIconClick applies the filter when the watchlist has entries', () => {
    watchlist.watchlistList = [{ id: 1, inView: true }] as never;

    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();
    expect(watchlist.setFilterActive).toHaveBeenCalledWith(true);

    plugin.isMenuButtonActive = false;
    plugin.onBottomIconClick();
    expect(watchlist.setFilterActive).toHaveBeenCalledWith(false);
  });

  it('updateIconState_ enables on a non-empty list and disables on an empty one', () => {
    EventBus.getInstance().emit(EventBusEvent.onWatchlistAdd, [{ id: 1, inView: true }]);
    expect(plugin.setBottomIconToEnabled).toHaveBeenCalled();

    EventBus.getInstance().emit(EventBusEvent.onWatchlistRemove, []);
    expect(plugin.setBottomIconToDisabled).toHaveBeenCalled();
  });

  it('bridges bottomIconCallback to onBottomIconClick', () => {
    const spy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();
    expect(spy).toHaveBeenCalled();
  });
});
