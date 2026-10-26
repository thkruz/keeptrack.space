import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { IBottomIconConfig, ICommandPaletteCommand, IconPlacement, UtilityGroup } from '@app/engine/plugins/core/plugin-capabilities';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { t7e } from '@app/locales/keys';
import { SettingsManager } from '@app/settings/settings';
import disabledVisiblePng from '@public/img/icons/disabled-visible.png';

/**
 * Hide Others: switches the color of every object outside the selected group (a selection or a search)
 * between a dim white (off, the default) and fully hidden (on). The color worker reads the value from
 * `settingsManager.colors.transparent`; the toggle state persists under its own storage key.
 *
 * No keyboard shortcut: Shift+H belongs to Satellite Photos.
 */
export class HideOtherSatellitesPlugin extends KeepTrackPlugin {
  readonly id = 'HideOtherSatellitesPlugin';
  dependencies_ = [];

  /** Out-of-group color with Hide Others on. */
  static readonly HIDDEN_COLOR: [number, number, number, number] = [1.0, 1.0, 1.0, 0];
  /** Out-of-group color with Hide Others off. */
  static readonly DIM_COLOR: [number, number, number, number] = [1.0, 1.0, 1.0, 0.1];

  bottomIconCallback = (): void => {
    this.onBottomIconClick();
  };

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'hide-other-sats-bottom-icon',
      label: 'Hide Others',
      image: disabledVisiblePng,
      menuMode: [MenuMode.CATALOG, MenuMode.ALL],
      placement: IconPlacement.UTILITY_ONLY,
      utilityGroup: UtilityGroup.LAYER_TOGGLE,
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'HideOtherSatellitesPlugin.toggle',
        label: t7e('plugins.HideOtherSatellitesPlugin.commandPalette.toggle'),
        category: 'Display',
        callback: () => this.bottomMenuClicked(),
      },
    ];
  }

  addJs(): void {
    super.addJs();

    const eventBus = EventBus.getInstance();

    eventBus.on(EventBusEvent.uiManagerFinal, () => {
      this.restoreState_();
    });

    // An account sync brought a newer toggle state from another device
    eventBus.on(EventBusEvent.remoteSettingsApplied, (changedKeys) => {
      if (changedKeys.includes(StorageKey.SETTINGS_HIDE_OTHER_SATS)) {
        this.restoreState_();
        this.recolor_();
      }
    });
  }

  onBottomIconClick(): void {
    if (this.isMenuButtonActive) {
      this.hideOtherSats();
    } else {
      this.showOtherSats();
    }
  }

  hideOtherSats(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
    settingsManager.colors.transparent = [...HideOtherSatellitesPlugin.HIDDEN_COLOR];
    this.saveState_(true);
    this.applyColorChange_();
    this.setBottomIconToSelected();
  }

  showOtherSats(): void {
    ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
    settingsManager.colors.transparent = [...HideOtherSatellitesPlugin.DIM_COLOR];
    this.saveState_(false);
    this.applyColorChange_();
    this.setBottomIconToUnselected();
  }

  /**
   * Applies the saved toggle state, then syncs the icon with the color in force. With no saved state the
   * color is left alone, so a preset that sets its own out-of-group color keeps it.
   */
  private restoreState_(): void {
    const saved = PersistenceManager.getInstance().getItem(StorageKey.SETTINGS_HIDE_OTHER_SATS);
    const colors = settingsManager.colors;

    if (!colors) {
      return;
    }

    if (saved === 'true') {
      colors.transparent = [...HideOtherSatellitesPlugin.HIDDEN_COLOR];
    } else if (saved === 'false' && colors.transparent?.[3] === 0) {
      colors.transparent = [...HideOtherSatellitesPlugin.DIM_COLOR];
    }

    if (colors.transparent?.[3] === 0) {
      this.setBottomIconToSelected();
    } else if (this.isMenuButtonActive) {
      this.setBottomIconToUnselected();
    }
  }

  private saveState_(isHidden: boolean): void {
    PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_HIDE_OTHER_SATS, String(isHidden));
  }

  private applyColorChange_(): void {
    this.recolor_();
    SettingsManager.preserveSettings();
  }

  private recolor_(): void {
    const colorSchemeManager = ServiceLocator.getColorSchemeManager();

    if (!colorSchemeManager) {
      return;
    }

    colorSchemeManager.calculateColorBuffers(true);
    colorSchemeManager.reloadColors();
  }
}
