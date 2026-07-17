import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IKeyboardShortcut, IconPlacement, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { t7e } from '@app/locales/keys';
import satellitePng from '@public/img/icons/satellite.png';
import { WatchlistPlugin } from '../watchlist/watchlist';

export class WatchlistFilterPlugin extends KeepTrackPlugin {
  readonly id = 'WatchlistFilterPlugin';
  dependencies_ = [WatchlistPlugin.name];

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'watchlist-filter-icon',
      label: t7e('plugins.WatchlistFilter.bottomIconLabel' as Parameters<typeof t7e>[0]),
      image: satellitePng,
      menuMode: [MenuMode.CATALOG, MenuMode.ALL],
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.LAYER_TOGGLE,
      isDisabledOnLoad: true,
    };
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'w',
        callback: () => {
          this.bottomMenuClicked();
        },
      },
    ];
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'WatchlistFilter.toggle',
        label: t7e('plugins.WatchlistFilter.bottomIconLabel' as Parameters<typeof t7e>[0]),
        category: 'Display',
        shortcutHint: 'w',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  addJs(): void {
    super.addJs();

    const eventBus = EventBus.getInstance();

    // Enable/disable icon based on watchlist contents.
    // OSS WatchlistPlugin emits onWatchlistAdd/onWatchlistRemove;
    // Pro WatchlistProPlugin only emits onWatchlistUpdated.
    const updateIconState_ = (list: { id: number; inView: boolean }[]) => {
      if (list.length > 0) {
        this.setBottomIconToEnabled();
      } else {
        const watchlistPlugin = PluginRegistry.getPlugin(WatchlistPlugin);

        watchlistPlugin?.setFilterActive(false);
        this.setBottomIconToDisabled();
      }
    };

    eventBus.on(EventBusEvent.onWatchlistAdd, updateIconState_);
    eventBus.on(EventBusEvent.onWatchlistRemove, updateIconState_);
    eventBus.on(EventBusEvent.onWatchlistUpdated, updateIconState_);
  }

  onBottomIconClick(): void {
    const watchlistPlugin = PluginRegistry.getPlugin(WatchlistPlugin);

    if (!watchlistPlugin || watchlistPlugin.watchlistList.length === 0) {
      this.setBottomIconToDisabled();
      ServiceLocator.getUiManager().toast(t7e('plugins.WatchlistFilter.errorMsgs.noSatellitesInList' as Parameters<typeof t7e>[0]), ToastMsgType.caution);

      return;
    }

    if (this.isMenuButtonActive) {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    } else {
      ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    }

    // Delegate to centralized filter management (syncs checkbox + applies/clears filter)
    watchlistPlugin.setFilterActive(this.isMenuButtonActive);
  }
}
